import { GeneratedContent, WorkItemType, JiraField, WorkItemTemplate } from '../types'
import { jiraFieldService } from './jira-field-service'
import { fieldExtractionService, FieldExtractionResult } from './field-extraction-service'
import { EnhancedExtractionResult, ExtractionCandidate } from '../types'

export interface MissingField {
  jiraFieldId: string
  jiraField: JiraField
  templateFieldId?: string
  currentValue?: any
}

export interface ValidationResult {
  isValid: boolean
  missingFields: MissingField[]
  errors: string[]
  extractedFields?: Record<string, any>
  suggestions?: Record<string, any[]>
  enhancedExtraction?: EnhancedExtractionResult
}

class FieldValidationService {
  /**
   * Validate content with enhanced smart field extraction using user configuration
   */
  async validateContentWithExtraction(
    content: GeneratedContent,
    workItemType: WorkItemType,
    template: WorkItemTemplate | null,
    jiraFields: JiraField[],
    aiProvider?: string,
    apiKey?: string
  ): Promise<ValidationResult> {
    let extractedFields: Record<string, any> = {}
    let suggestions: Record<string, any[]> = {}
    let enhancedExtraction: EnhancedExtractionResult | undefined

    // Try enhanced field extraction with user configuration
    if (content.description && jiraFields.length > 0) {
      try {
        console.log('Starting enhanced field extraction for', jiraFields.length, 'fields');
        enhancedExtraction = await fieldExtractionService.extractFieldValuesWithConfig(
          content.description,
          jiraFields,
          workItemType,
          aiProvider,
          apiKey
        )

        // Convert auto-applied fields to the expected format
        extractedFields = Object.fromEntries(enhancedExtraction.autoApplied);

        // Add confirmation-required fields to extracted fields for validation
        // but mark them as needing confirmation
        for (const [fieldId, candidate] of enhancedExtraction.requiresConfirmation) {
          extractedFields[fieldId] = candidate.value;
        }

        // Generate suggestions from both extraction candidates and traditional suggestions
        suggestions = this.generateEnhancedSuggestions(enhancedExtraction, jiraFields, content.description);

        console.log(`Enhanced extraction completed: ${enhancedExtraction.extractionSummary.autoAppliedCount} auto-applied, ${enhancedExtraction.extractionSummary.confirmationCount} require confirmation`);
      } catch (error) {
        console.warn('Enhanced field extraction failed, falling back to basic extraction:', error)
        
        // Fall back to basic extraction
        try {
          const basicExtractionResult = await fieldExtractionService.extractFieldValues(
            content.description,
            jiraFields,
            aiProvider,
            apiKey
          )

          // Convert basic extracted fields to a record
          for (const extracted of basicExtractionResult.extractedFields) {
            extractedFields[extracted.fieldId] = extracted.value
            console.log(`Extracted field ${extracted.fieldId}: ${extracted.value} (${extracted.extractionMethod})`);
          }

          suggestions = basicExtractionResult.suggestions
          console.log('Basic field extraction completed successfully');
        } catch (basicError) {
          console.warn('Basic field extraction also failed:', basicError)
          extractedFields = {}
          suggestions = {}
        }
      }
    } else {
      console.log('Skipping field extraction: no description or no Jira fields');
    }

    // Auto-populate system fields that should be hidden from user
    const systemFields = this.autoPopulateSystemFields(content, workItemType, jiraFields, extractedFields);
    extractedFields = { ...extractedFields, ...systemFields };

    // Create enhanced content with extracted fields
    const enhancedContent: GeneratedContent = {
      ...content,
      customFields: {
        ...content.customFields,
        ...extractedFields
      }
    }

    // Validate the enhanced content
    const validationResult = await this.validateContent(
      enhancedContent,
      workItemType,
      template,
      jiraFields
    )

    return {
      ...validationResult,
      extractedFields,
      suggestions,
      enhancedExtraction
    }
  }

  /**
   * Auto-populate system fields like project and issue type that should be handled automatically
   */
  private autoPopulateSystemFields(
    content: GeneratedContent,
    workItemType: WorkItemType,
    jiraFields: JiraField[],
    extractedFields: Record<string, any>
  ): Record<string, any> {
    const systemFields: Record<string, any> = {};

    // Auto-populate issue type based on work item type
    const issueTypeField = jiraFields.find(field => 
      field.id.toLowerCase() === 'issuetype' || 
      field.name.toLowerCase().includes('issue type')
    );

    if (issueTypeField && !extractedFields[issueTypeField.id]) {
      const issueTypeMap: Record<string, string> = {
        'epic': 'Epic',
        'story': 'Story', 
        'task': 'Task',
        'initiative': 'Initiative',
        'bug': 'Bug'
      };
      
      const mappedIssueType = issueTypeMap[workItemType.toLowerCase()] || 'Task';
      
      // Find the correct issue type from allowed values
      if (issueTypeField.allowedValues) {
        const matchingIssueType = issueTypeField.allowedValues.find((value: any) => {
          const name = typeof value === 'string' ? value : (value.name || value.value);
          return name && name.toLowerCase() === mappedIssueType.toLowerCase();
        });
        
        if (matchingIssueType) {
          systemFields[issueTypeField.id] = typeof matchingIssueType === 'string' 
            ? matchingIssueType 
            : matchingIssueType;
          console.log(`Auto-populated issue type: ${issueTypeField.id} = ${JSON.stringify(matchingIssueType)}`);
        }
      }
    }

    // Auto-populate project field from Jira connection
    const projectField = jiraFields.find(field => 
      field.id.toLowerCase() === 'project' || 
      field.name.toLowerCase().includes('project')
    );

    if (projectField && !extractedFields[projectField.id]) {
      // Try to get project key from localStorage (jira connection)
      if (typeof window !== 'undefined') {
        try {
          const jiraConnection = JSON.parse(localStorage.getItem('jira-connection') || '{}');
          if (jiraConnection.projectKey) {
            // Find matching project from allowed values
            if (projectField.allowedValues) {
              const matchingProject = projectField.allowedValues.find((value: any) => {
                const key = typeof value === 'string' ? value : (value.key || value.value);
                return key === jiraConnection.projectKey;
              });
              
              if (matchingProject) {
                systemFields[projectField.id] = typeof matchingProject === 'string' 
                  ? matchingProject 
                  : matchingProject;
                console.log(`Auto-populated project: ${projectField.id} = ${JSON.stringify(matchingProject)}`);
              }
            } else {
              // If no allowed values, use the project key directly
              systemFields[projectField.id] = { key: jiraConnection.projectKey };
              console.log(`Auto-populated project: ${projectField.id} = ${jiraConnection.projectKey}`);
            }
          }
        } catch (error) {
          console.warn('Failed to auto-populate project from jira connection:', error);
        }
      }
    }

    return systemFields;
  }

  /**
   * Generate enhanced suggestions combining extraction candidates and traditional suggestions
   */
  private generateEnhancedSuggestions(
    enhancedExtraction: EnhancedExtractionResult,
    jiraFields: JiraField[],
    description: string
  ): Record<string, any[]> {
    const suggestions: Record<string, any[]> = {};

    // Add suggestions from extraction candidates
    for (const [fieldId, candidate] of enhancedExtraction.requiresConfirmation) {
      const field = jiraFields.find(f => f.id === fieldId);
      if (field) {
        suggestions[fieldId] = this.generateFieldSuggestions(field, candidate, description);
      }
    }

    // Add suggestions for manual fields
    for (const fieldId of enhancedExtraction.manualFields) {
      const field = jiraFields.find(f => f.id === fieldId);
      if (field) {
        suggestions[fieldId] = this.getFieldSuggestions({} as GeneratedContent, field);
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestions for a specific field with extraction candidate context
   */
  private generateFieldSuggestions(
    jiraField: JiraField,
    candidate: ExtractionCandidate,
    description: string
  ): any[] {
    const suggestions: any[] = [];

    // Add the extracted value as the primary suggestion
    if (candidate.value) {
      suggestions.push({
        value: candidate.value,
        label: `${candidate.value} (${Math.round(candidate.confidence * 100)}% confidence)`,
        confidence: candidate.confidence,
        extractionMethod: candidate.extractionMethod
      });
    }

    // Add traditional field suggestions
    const traditionalSuggestions = this.getFieldSuggestions({} as GeneratedContent, jiraField);
    
    // Add unique traditional suggestions
    traditionalSuggestions.forEach(suggestion => {
      const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion;
      const exists = suggestions.some(s => s.value === suggestionValue);
      
      if (!exists) {
        suggestions.push({
          value: suggestionValue,
          label: typeof suggestion === 'string' ? suggestion : String(suggestion)
        });
      }
    });

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  /**
   * Validate content against required Jira fields
   */
  async validateContent(
    content: GeneratedContent,
    workItemType: WorkItemType,
    template: WorkItemTemplate | null,
    jiraFields: JiraField[]
  ): Promise<ValidationResult> {
    const missingFields: MissingField[] = []
    const errors: string[] = []

    // Get required Jira fields
    const requiredFields = jiraFields.filter(field => field.required)

    // Check each required field
    for (const jiraField of requiredFields) {
      const fieldValue = this.getFieldValue(content, jiraField, template)
      const isEmpty = this.isFieldEmpty(fieldValue);
      
      if (isEmpty) {
        missingFields.push({
          jiraFieldId: jiraField.id,
          jiraField,
          templateFieldId: this.getTemplateFieldId(jiraField, template),
          currentValue: fieldValue
        })
      }
    }

    // Add validation errors
    if (missingFields.length > 0) {
      errors.push(`${missingFields.length} required field(s) are missing`)
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      errors
    }
  }

  /**
   * Get field value from content based on field mapping
   */
  private getFieldValue(
    content: GeneratedContent,
    jiraField: JiraField,
    template: WorkItemTemplate | null
  ): any {
    // Check custom fields first
    if (content.customFields && content.customFields[jiraField.id]) {
      return content.customFields[jiraField.id]
    }

    // Check standard field mappings
    return this.getStandardFieldValue(content, jiraField)
  }

  /**
   * Get value from content based on standard Jira field mapping
   */
  private getStandardFieldValue(content: GeneratedContent, jiraField: JiraField): any {
    const fieldId = jiraField.id.toLowerCase()
    const fieldName = jiraField.name.toLowerCase()

    // Map common fields - Enhanced summary field matching
    if (fieldId === 'summary' || 
        fieldId.includes('summary') ||
        fieldName.includes('summary') || 
        fieldName.includes('title') ||
        fieldName === 'summary' ||
        fieldId === 'title') {
      return content.title
    }
    
    if (fieldId === 'description' || fieldName.includes('description')) {
      return content.description
    }
    
    if (fieldId === 'priority' || fieldName.includes('priority')) {
      return content.priority
    }
    
    if (fieldId === 'labels' || fieldName.includes('labels')) {
      return content.labels
    }

    // For project and issuetype, check customFields (where auto-populated values will be)
    if (fieldId === 'project' || fieldId === 'issuetype') {
      const value = content.customFields?.[jiraField.id];
      return value;
    }
    
    // For assignee, only use if explicitly set in customFields
    if (fieldId === 'assignee') {
      return content.customFields?.[jiraField.id]
    }
    
    // Reporter field is often auto-set by Jira or not settable via API
    if (fieldId === 'reporter') {
      return 'auto-set'
    }

    // Check custom fields for everything else
    const customValue = content.customFields?.[jiraField.id];
    return customValue;
  }

  /**
   * Get template field ID that maps to a Jira field
   */
  private getTemplateFieldId(jiraField: JiraField, template: WorkItemTemplate | null): string | undefined {
    // Since jiraFieldMappings doesn't exist on WorkItemTemplate, 
    // we'll use a simple mapping based on field name/id
    if (!template) return undefined
    
    // Map common template fields to Jira fields
    const fieldName = jiraField.name.toLowerCase()
    const fieldId = jiraField.id.toLowerCase()
    
    if (fieldId === 'summary' || fieldName.includes('summary') || fieldName.includes('title')) {
      return 'title'
    }
    if (fieldId === 'description' || fieldName.includes('description')) {
      return 'description'
    }
    if (fieldId === 'priority' || fieldName.includes('priority')) {
      return 'priority'
    }
    
    return undefined
  }

  /**
   * Check if a field value is empty
   */
  private isFieldEmpty(value: any): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
  }

  /**
   * Validate field value based on field type
   */
  validateFieldValue(field: JiraField, value: any): { isValid: boolean; error?: string } {
    if (field.required && this.isFieldEmpty(value)) {
      return {
        isValid: false,
        error: `${field.name} is required`
      }
    }

    if (!this.isFieldEmpty(value)) {
      switch (field.type) {
        case 'number':
          if (isNaN(Number(value))) {
            return {
              isValid: false,
              error: `${field.name} must be a valid number`
            }
          }
          break
        
        case 'select':
          if (field.allowedValues && !field.allowedValues.includes(value)) {
            return {
              isValid: false,
              error: `${field.name} must be one of: ${field.allowedValues.join(', ')}`
            }
          }
          break
        
        case 'date':
          if (value && isNaN(Date.parse(value))) {
            return {
              isValid: false,
              error: `${field.name} must be a valid date`
            }
          }
          break
      }
    }

    return { isValid: true }
  }

  /**
   * Get field suggestions based on content
   */
  getFieldSuggestions(content: GeneratedContent, jiraField: JiraField): string[] {
    const suggestions: string[] = []
    
    switch (jiraField.type) {
      case 'select':
        if (jiraField.allowedValues) {
          // For priority fields, suggest based on content
          if (jiraField.name.toLowerCase().includes('priority')) {
            if (content.description.toLowerCase().includes('urgent') || 
                content.description.toLowerCase().includes('critical')) {
              suggestions.push('High', 'Critical')
            } else if (content.description.toLowerCase().includes('minor') ||
                       content.description.toLowerCase().includes('nice to have')) {
              suggestions.push('Low', 'Minor')
            } else {
              suggestions.push('Medium', 'Normal')
            }
          }
          
          // Filter suggestions to only include allowed values
          return suggestions.filter(s => jiraField.allowedValues!.includes(s))
        }
        break
      
      case 'string':
      case 'textarea':
        // For quarter fields, suggest current quarter
        if (jiraField.name.toLowerCase().includes('quarter')) {
          const now = new Date()
          const quarter = Math.ceil((now.getMonth() + 1) / 3)
          const year = now.getFullYear()
          suggestions.push(`Q${quarter} ${year}`)
        }
        break
    }
    
    return suggestions
  }

  /**
   * Auto-fill fields based on content analysis
   */
  autoFillFields(content: GeneratedContent, missingFields: MissingField[]): Record<string, any> {
    const autoFilledValues: Record<string, any> = {}
    
    missingFields.forEach(field => {
      const suggestions = this.getFieldSuggestions(content, field.jiraField)
      if (suggestions.length > 0) {
        autoFilledValues[field.jiraFieldId] = suggestions[0]
      }
    })
    
    return autoFilledValues
  }
}

export const fieldValidationService = new FieldValidationService() 