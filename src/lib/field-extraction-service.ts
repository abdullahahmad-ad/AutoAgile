import { JiraField } from './jira-field-service';
import { FieldExtractionConfig, ExtractionPreferences, EnhancedExtractionResult, ExtractionCandidate, WorkItemType } from '../types';
import { templateService } from './template-service';

export interface ExtractedFieldValue {
  fieldId: string;
  value: any;
  confidence: number; // 0-1 scale
  extractionMethod: 'ai' | 'pattern' | 'default';
}

export interface FieldExtractionResult {
  extractedFields: ExtractedFieldValue[];
  missingFields: string[];
  suggestions: { [fieldId: string]: any[] };
}

export class FieldExtractionService {
  private static instance: FieldExtractionService;

  static getInstance(): FieldExtractionService {
    if (!FieldExtractionService.instance) {
      FieldExtractionService.instance = new FieldExtractionService();
    }
    return FieldExtractionService.instance;
  }

  /**
   * Enhanced field extraction using user configuration
   */
  async extractFieldValuesWithConfig(
    description: string,
    jiraFields: JiraField[],
    workItemType: WorkItemType,
    aiProvider?: string,
    apiKey?: string
  ): Promise<EnhancedExtractionResult> {
    const { fieldConfigs, preferences } = templateService.getFieldExtractionConfig(workItemType);
    
    console.log(`Starting enhanced extraction for ${workItemType} with ${fieldConfigs.length} configured fields`);
    
    // Initialize result categories
    const autoApplied = new Map<string, any>();
    const requiresConfirmation = new Map<string, ExtractionCandidate>();
    const manualFields: string[] = [];
    const skippedFields: string[] = [];
    
    // Track extraction progress
    let totalFields = 0;
    let autoAppliedCount = 0;
    let confirmationCount = 0;
    let manualCount = 0;
    let skippedCount = 0;

    // Process each field based on configuration
    for (const jiraField of jiraFields) {
      if (!jiraField.required) continue; // Only process required fields for now
      
      totalFields++;
      const fieldConfig = fieldConfigs.find(config => config.jiraFieldId === jiraField.id);
      
      if (!fieldConfig) {
        // No configuration found - use default behavior
        await this.processFieldWithDefaults(
          description, jiraField, preferences, autoApplied, requiresConfirmation, manualFields, skippedFields, aiProvider, apiKey
        );
        continue;
      }

      // Process field based on user configuration
      if (!fieldConfig.extractionEnabled) {
        skippedFields.push(jiraField.id);
        skippedCount++;
        continue;
      }

      if (fieldConfig.extractionMethod === 'manual') {
        manualFields.push(jiraField.id);
        manualCount++;
        continue;
      }

      // Extract field value using configured method
      const extractedValue = await this.extractSingleFieldValue(
        description, jiraField, fieldConfig, aiProvider, apiKey
      );

      if (extractedValue) {
        const candidate: ExtractionCandidate = {
          fieldId: jiraField.id,
          value: extractedValue.value,
          confidence: extractedValue.confidence,
          extractionMethod: extractedValue.extractionMethod,
          suggestion: this.generateFieldSuggestion(jiraField, description)
        };

        // Determine if field should be auto-applied or require confirmation
        const shouldAutoApply = this.shouldAutoApplyField(fieldConfig, candidate, preferences);
        
        if (shouldAutoApply) {
          autoApplied.set(jiraField.id, extractedValue.value);
          autoAppliedCount++;
        } else {
          requiresConfirmation.set(jiraField.id, candidate);
          confirmationCount++;
        }
      } else {
        // No value extracted - requires manual input
        manualFields.push(jiraField.id);
        manualCount++;
      }
    }

    console.log(`Enhanced extraction completed: ${autoAppliedCount} auto-applied, ${confirmationCount} require confirmation, ${manualCount} manual`);

    return {
      autoApplied,
      requiresConfirmation,
      manualFields,
      skippedFields,
      extractionSummary: {
        totalFields,
        autoAppliedCount,
        confirmationCount,
        manualCount,
        skippedCount
      }
    };
  }

  /**
   * Extract a single field value using the specified configuration
   */
  private async extractSingleFieldValue(
    description: string,
    jiraField: JiraField,
    fieldConfig: FieldExtractionConfig,
    aiProvider?: string,
    apiKey?: string
  ): Promise<ExtractedFieldValue | null> {
    try {
      if (fieldConfig.extractionMethod === 'ai' && aiProvider && apiKey) {
        const aiExtracted = await this.extractWithAI(description, [jiraField], aiProvider, apiKey);
        if (aiExtracted.length > 0 && aiExtracted[0].confidence >= fieldConfig.confidenceThreshold) {
          return aiExtracted[0];
        }
      }
      
      // Fall back to pattern extraction
      if (fieldConfig.extractionMethod === 'ai' || fieldConfig.extractionMethod === 'pattern') {
        const patternExtracted = this.extractWithPatterns(description, [jiraField]);
        if (patternExtracted.length > 0 && patternExtracted[0].confidence >= fieldConfig.confidenceThreshold) {
          return patternExtracted[0];
        }
      }
    } catch (error) {
      console.warn(`Field extraction failed for ${jiraField.id}:`, error);
    }
    
    return null;
  }

  /**
   * Determine if a field should be auto-applied based on configuration
   */
  private shouldAutoApplyField(
    fieldConfig: FieldExtractionConfig,
    candidate: ExtractionCandidate,
    preferences: ExtractionPreferences
  ): boolean {
    // Global setting overrides individual field settings
    if (preferences.requireConfirmationForAll) {
      return false;
    }
    
    // Field-specific confirmation requirement
    if (fieldConfig.confirmationRequired) {
      return false;
    }
    
    // Auto-apply setting and confidence check
    return fieldConfig.autoApply && candidate.confidence >= fieldConfig.confidenceThreshold;
  }

  /**
   * Process a field without specific configuration using default behavior
   */
  private async processFieldWithDefaults(
    description: string,
    jiraField: JiraField,
    preferences: ExtractionPreferences,
    autoApplied: Map<string, any>,
    requiresConfirmation: Map<string, ExtractionCandidate>,
    manualFields: string[],
    skippedFields: string[],
    aiProvider?: string,
    apiKey?: string
  ): Promise<void> {
    // Use default extraction method
    const extractedValue = await this.extractSingleFieldWithDefaults(
      description, jiraField, preferences, aiProvider, apiKey
    );

    if (extractedValue && extractedValue.confidence >= preferences.globalConfidenceThreshold) {
      const candidate: ExtractionCandidate = {
        fieldId: jiraField.id,
        value: extractedValue.value,
        confidence: extractedValue.confidence,
        extractionMethod: extractedValue.extractionMethod,
        suggestion: this.generateFieldSuggestion(jiraField, description)
      };

      // Use global preferences for decision
      if (preferences.requireConfirmationForAll || extractedValue.confidence < 0.8) {
        requiresConfirmation.set(jiraField.id, candidate);
      } else {
        autoApplied.set(jiraField.id, extractedValue.value);
      }
    } else {
      manualFields.push(jiraField.id);
    }
  }

  /**
   * Extract field value using default behavior
   */
  private async extractSingleFieldWithDefaults(
    description: string,
    jiraField: JiraField,
    preferences: ExtractionPreferences,
    aiProvider?: string,
    apiKey?: string
  ): Promise<ExtractedFieldValue | null> {
    try {
      if (preferences.defaultMethod === 'ai' && aiProvider && apiKey) {
        const aiExtracted = await this.extractWithAI(description, [jiraField], aiProvider, apiKey);
        if (aiExtracted.length > 0) {
          return aiExtracted[0];
        }
      }
      
      // Fall back to pattern extraction
      const patternExtracted = this.extractWithPatterns(description, [jiraField]);
      if (patternExtracted.length > 0) {
        return patternExtracted[0];
      }
    } catch (error) {
      console.warn(`Default field extraction failed for ${jiraField.id}:`, error);
    }
    
    return null;
  }

  /**
   * Generate a suggestion for a field based on description
   */
  private generateFieldSuggestion(jiraField: JiraField, description: string): string {
    const suggestions = this.generateSuggestions(jiraField, description);
    return suggestions.length > 0 ? `Consider: ${suggestions.slice(0, 3).join(', ')}` : '';
  }

  // Keep the existing extractFieldValues method for backward compatibility
  async extractFieldValues(
    description: string,
    jiraFields: JiraField[],
    aiProvider?: string,
    apiKey?: string
  ): Promise<FieldExtractionResult> {
    const extractedFields: ExtractedFieldValue[] = [];
    const missingFields: string[] = [];
    const suggestions: { [fieldId: string]: any[] } = {};

    // First try AI extraction if provider is available
    if (aiProvider && apiKey) {
      try {
        const aiExtracted = await this.extractWithAI(description, jiraFields, aiProvider, apiKey);
        extractedFields.push(...aiExtracted);
        console.log(`AI extraction successful: ${aiExtracted.length} fields extracted`);
      } catch (error) {
        console.warn('AI extraction failed, falling back to pattern matching:', error);
        // Continue with pattern matching fallback
      }
    } else {
      console.log('No AI provider configured, using pattern matching only');
    }

    // Pattern matching fallback for fields not extracted by AI
    const extractedFieldIds = new Set(extractedFields.map(f => f.fieldId));
    const remainingFields = jiraFields.filter(field => !extractedFieldIds.has(field.id));
    
    const patternExtracted = this.extractWithPatterns(description, remainingFields);
    extractedFields.push(...patternExtracted);

    // Generate suggestions for fields with multiple possible values
    for (const field of jiraFields) {
      if (field.allowedValues && field.allowedValues.length > 0) {
        suggestions[field.id] = this.generateSuggestions(field, description);
      }
    }

    // Identify missing required fields
    const allExtractedIds = new Set(extractedFields.map(f => f.fieldId));
    for (const field of jiraFields) {
      if (field.required && !allExtractedIds.has(field.id)) {
        missingFields.push(field.id);
      }
    }

    return {
      extractedFields,
      missingFields,
      suggestions
    };
  }

  private async extractWithAI(
    description: string,
    jiraFields: JiraField[],
    aiProvider: string,
    apiKey: string
  ): Promise<ExtractedFieldValue[]> {
    const extractedFields: ExtractedFieldValue[] = [];

    // Create extraction prompt
    const fieldsInfo = jiraFields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type || 'string',
      required: field.required,
      allowedValues: field.allowedValues?.slice(0, 10) // Limit for prompt size
    }));

    const prompt = `
Extract field values from the following description for Jira issue creation.

Description:
${description}

Fields to extract:
${JSON.stringify(fieldsInfo, null, 2)}

Instructions:
1. Extract values that match the field types and requirements
2. For select fields, only use values from allowedValues if provided
3. For date fields, use ISO format (YYYY-MM-DD)
4. For number fields, extract numeric values only
5. Return null if no suitable value can be extracted
6. Be conservative - only extract values you're confident about

Return a JSON object with this structure:
{
  "extractions": [
    {
      "fieldId": "field_id",
      "value": "extracted_value",
      "confidence": 0.8
    }
  ]
}
`;

    try {
      const response = await this.callAIProvider(prompt, aiProvider, apiKey);
      
      if (!response || response.trim() === '') {
        throw new Error('Empty response from AI provider');
      }

      let result;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, falling back to pattern matching. Response was:', response.substring(0, 200));
        // Don't throw error, just return empty array to fall back to pattern matching
        return [];
      }

      if (result.extractions && Array.isArray(result.extractions)) {
        for (const extraction of result.extractions) {
          if (extraction.fieldId && extraction.value !== null && extraction.confidence > 0.5) {
            extractedFields.push({
              fieldId: extraction.fieldId,
              value: extraction.value,
              confidence: extraction.confidence,
              extractionMethod: 'ai'
            });
          }
        }
        console.log(`AI extracted ${extractedFields.length} fields with confidence > 0.5`);
      } else {
        console.warn('AI response does not contain valid extractions array:', result);
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      throw error;
    }

    return extractedFields;
  }

  private extractWithPatterns(description: string, jiraFields: JiraField[]): ExtractedFieldValue[] {
    const extractedFields: ExtractedFieldValue[] = [];
    const lowerDescription = description.toLowerCase();

    for (const field of jiraFields) {
      const fieldName = field.name.toLowerCase();
      let extractedValue = null;
      let confidence = 0;

      // Priority extraction
      if (fieldName.includes('priority')) {
        const priorityMatch = lowerDescription.match(/\b(highest|high|medium|low|lowest|critical|major|minor|trivial)\b/);
        if (priorityMatch) {
          extractedValue = this.mapPriorityValue(priorityMatch[1], field.allowedValues);
          confidence = 0.8;
        }
      }

      // Quarter extraction - enhanced for specific fields
      else if (fieldName.includes('quarter') || field.id === 'customfield_26362') {
        // Look for various quarter patterns
        const quarterPatterns = [
          /\b(q[1-4])\s*(\d{4})\b/i,
          /\bquarter\s*([1-4])\s*(\d{4})\b/i,
          /\b([1-4])(?:st|nd|rd|th)\s*quarter\s*(\d{4})\b/i,
          /\b(first|second|third|fourth)\s*quarter\s*(\d{4})\b/i,
          /\b(q[1-4])\b/i,
          /\bquarter\s*([1-4])\b/i
        ];
        
        for (const pattern of quarterPatterns) {
          const match = description.match(pattern);
          if (match) {
            let quarter = match[1];
            let year = match[2] || new Date().getFullYear().toString();
            
            // Convert word to number
            if (quarter === 'first') quarter = '1';
            else if (quarter === 'second') quarter = '2';
            else if (quarter === 'third') quarter = '3';
            else if (quarter === 'fourth') quarter = '4';
            
            // Extract just the number from Q1, Q2, etc.
            if (quarter.toLowerCase().startsWith('q')) {
              quarter = quarter.substring(1);
            }
            
            const quarterValue = `Q${quarter} ${year}`;
            
            // Check if this value exists in allowed values
            if (field.allowedValues?.includes(quarterValue)) {
              extractedValue = quarterValue;
              confidence = 0.8;
              break;
            }
          }
        }
        
        // If no specific quarter found, try to extract year and use current quarter
        if (!extractedValue) {
          const yearMatch = description.match(/\b(\d{4})\b/);
          if (yearMatch) {
            const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
            const quarterValue = `Q${currentQuarter} ${yearMatch[1]}`;
            if (field.allowedValues?.includes(quarterValue)) {
              extractedValue = quarterValue;
              confidence = 0.6;
            }
          }
        }
        
        // Fallback to current quarter if nothing found
        if (!extractedValue) {
          const currentYear = new Date().getFullYear();
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
          const quarterValue = `Q${currentQuarter} ${currentYear}`;
          if (field.allowedValues?.includes(quarterValue)) {
            extractedValue = quarterValue;
            confidence = 0.4;
          }
        }
      }

      // Boolean fields (Yes/No) - enhanced for roadmap field
      else if (fieldName.includes('roadmap') || fieldName.includes('include') || field.id === 'customfield_26360') {
        // Internal/External multiselect field
        if (field.id === 'customfield_26360') {
          return this.extractInternalExternalValue(description)
        }
        // Legacy roadmap field handling
        return this.extractRoadmapValue(description)
      }

      // Story points extraction
      else if (fieldName.includes('story') && fieldName.includes('point')) {
        const pointsMatch = lowerDescription.match(/\b(\d+)\s*(?:story\s*)?points?\b/i);
        if (pointsMatch) {
          extractedValue = parseInt(pointsMatch[1]);
          confidence = 0.9;
        }
      }

      // Component extraction
      else if (fieldName.includes('component')) {
        if (field.allowedValues) {
          for (const allowedValue of field.allowedValues) {
            const componentName = typeof allowedValue === 'string' ? allowedValue.toLowerCase() : allowedValue.value?.toLowerCase() || '';
            if (componentName && lowerDescription.includes(componentName)) {
              extractedValue = allowedValue;
              confidence = 0.7;
              break;
            }
          }
        }
      }

      // Epic link extraction
      else if (fieldName.includes('epic')) {
        const epicMatch = lowerDescription.match(/\b([A-Z]+-\d+)\b/);
        if (epicMatch) {
          extractedValue = epicMatch[1];
          confidence = 0.8;
        }
      }

      if (extractedValue !== null) {
        extractedFields.push({
          fieldId: field.id,
          value: extractedValue,
          confidence,
          extractionMethod: 'pattern'
        });
      }
    }

    return extractedFields;
  }

  private generateSuggestions(field: JiraField, description: string): any[] {
    if (!field.allowedValues) return [];

    const suggestions = [];
    const lowerDescription = description.toLowerCase();

    // Score each allowed value based on relevance to description
    for (const allowedValue of field.allowedValues) {
      const value = typeof allowedValue === 'string' ? allowedValue.toLowerCase() : (allowedValue.value?.toLowerCase() || allowedValue.name?.toLowerCase() || '');
      let score = 0;

      // Exact match
      if (lowerDescription.includes(value)) {
        score += 10;
      }

      // Partial word match
      const words = value.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && lowerDescription.includes(word)) {
          score += 3;
        }
      }

      // Common patterns
      if (field.name.toLowerCase().includes('priority')) {
        if (lowerDescription.includes('urgent') && value.includes('high')) score += 5;
        if (lowerDescription.includes('important') && value.includes('high')) score += 3;
        if (lowerDescription.includes('later') && value.includes('low')) score += 3;
      }

      if (score > 0) {
        suggestions.push({
          value: allowedValue,
          score
        });
      }
    }

    // Sort by score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.value);
  }

  private mapPriorityValue(priority: string, allowedValues?: any[]): any {
    if (!allowedValues) return priority;

    const priorityMap: { [key: string]: string[] } = {
      'highest': ['highest', 'critical', '1'],
      'high': ['high', 'major', '2'],
      'medium': ['medium', 'normal', '3'],
      'low': ['low', 'minor', '4'],
      'lowest': ['lowest', 'trivial', '5']
    };

    const mappings = priorityMap[priority.toLowerCase()] || [priority];
    
    for (const mapping of mappings) {
      const match = allowedValues.find(v => 
        v.toLowerCase().includes(mapping.toLowerCase())
      );
      if (match) return match;
    }

    return priority;
  }

  private mapQuarterValue(quarter: string, allowedValues?: any[]): any {
    if (!allowedValues) return quarter;

    const currentYear = new Date().getFullYear();
    const quarterNum = quarter.match(/[1-4]/)?.[0];
    
    if (quarterNum) {
      const patterns = [
        `Q${quarterNum}`,
        `q${quarterNum}`,
        `Quarter ${quarterNum}`,
        `${currentYear} Q${quarterNum}`,
        `${currentYear}-Q${quarterNum}`
      ];

      for (const pattern of patterns) {
        const match = allowedValues.find(v => 
          v.includes(pattern)
        );
        if (match) return match;
      }
    }

    return quarter;
  }

  private mapBooleanValue(value: boolean, allowedValues?: any[]): any {
    if (!allowedValues) return value;

    const trueValues = ['yes', 'true', 'include', 'add'];
    const falseValues = ['no', 'false', 'exclude', 'skip'];

    const searchValues = value ? trueValues : falseValues;

    for (const searchValue of searchValues) {
      const match = allowedValues.find(v => 
        v.toLowerCase().includes(searchValue)
      );
      if (match) return match;
    }

    return value;
  }

  private getCurrentQuarter(): string {
    const month = new Date().getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `Q${quarter}`;
  }

  private async callAIProvider(prompt: string, provider: string, apiKey: string): Promise<string> {
    if (provider === 'devs-ai') {
      // DevS.ai specific format
      const response = await fetch('/api/devs-ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiToken: apiKey,
          requestBody: {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            model: 'gpt-4', // Default model for field extraction
            stream: false
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`DevS.ai API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } else {
      // Generic format for other providers
      const endpoint = `/api/${provider.toLowerCase()}-proxy`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          apiKey,
          maxTokens: 1000,
          temperature: 0.1 // Low temperature for consistent extraction
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`AI provider request failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.response || '';
    }
  }

  private extractInternalExternalValue(description: string): ExtractedFieldValue[] {
    const extractedFields: ExtractedFieldValue[] = [];
    const lowerDescription = typeof description === 'string' ? description.toLowerCase() : '';

    // Include on Roadmap - look for Internal/External indicators
    const values = [];
    
    // Check for Internal indicators
    if (lowerDescription.match(/\b(internal|private|confidential|company|team|staff)\b/)) {
      values.push('Internal');
    }
    
    // Check for External indicators  
    if (lowerDescription.match(/\b(external|public|customer|client|visible|roadmap|showcase)\b/)) {
      values.push('External');
    }
    
    // If we found values, add them to extracted fields
    if (values.length > 0) {
      extractedFields.push({
        fieldId: 'customfield_26360',
        value: values, // Array for multiselect
        confidence: 0.8,
        extractionMethod: 'pattern'
      });
    }

    return extractedFields;
  }

  private extractRoadmapValue(description: string): ExtractedFieldValue[] {
    const extractedFields: ExtractedFieldValue[] = [];
    const lowerDescription = typeof description === 'string' ? description.toLowerCase() : '';

    // Legacy roadmap field handling
    const roadmapMatch = lowerDescription.match(/\b(roadmap|public|external|visible|show)\b/);
    if (roadmapMatch) {
      extractedFields.push({
        fieldId: 'customfield_26360',
        value: roadmapMatch[0],
        confidence: 0.8,
        extractionMethod: 'pattern'
      });
    }

    return extractedFields;
  }
}

export const fieldExtractionService = FieldExtractionService.getInstance(); 