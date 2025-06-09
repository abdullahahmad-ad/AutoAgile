import { JiraInstance, WorkItemType } from '../types'

export interface JiraFieldOption {
  id?: string
  name?: string
  value?: string
}

export interface JiraField {
  id: string
  name: string
  type: string
  required: boolean
  allowedValues?: (string | JiraFieldOption)[]
  description?: string
  schema?: any
  isMultiSelect?: boolean
}

export interface JiraFieldMapping {
  workItemType: WorkItemType
  issueType: string
  fields: JiraField[]
  discoveredAt: string
}

class JiraFieldService {
  private readonly STORAGE_KEY = 'jira-field-mappings'

  // Get Jira issue types for the connected instance
  async getIssueTypes(jiraConnection: JiraInstance): Promise<any[]> {
    try {
      const response = await fetch('/api/jira/get-issue-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraConnection }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get issue types: ${response.status}`)
      }

      const data = await response.json()
      return data.issueTypes || []
    } catch (error) {
      console.error('Error getting issue types:', error)
      return []
    }
  }

  // Get field metadata for a specific issue type
  async getFieldsForIssueType(jiraConnection: JiraInstance, issueTypeId: string): Promise<JiraField[]> {
    try {
      const response = await fetch('/api/jira/get-create-meta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraConnection,
          issueTypeId 
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get field metadata: ${response.status}`)
      }

      const data = await response.json()
      return this.parseFieldMetadata(data.fields || {})
    } catch (error) {
      console.error('Error getting field metadata:', error)
      return []
    }
  }

  // Get comprehensive field metadata from Jira
  async getFieldMetadata(jiraConnection: JiraInstance, fieldId: string): Promise<any> {
    try {
      const response = await fetch('/api/jira/get-field-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraConnection,
          fieldId
        }),
      })

      if (!response.ok) {
        console.warn(`Failed to get metadata for field ${fieldId}`)
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error getting field metadata for ${fieldId}:`, error)
      return null
    }
  }

  // Get actual field options from Jira
  async getFieldOptions(jiraConnection: JiraInstance, fieldId: string): Promise<string[]> {
    try {
      const metadata = await this.getFieldMetadata(jiraConnection, fieldId)
      if (!metadata) return []

      const options = metadata.options || []
      
      // Extract option values/names
      return options.map((option: any) => {
        if (typeof option === 'string') return option
        return option.value || option.name || option.id || String(option)
      }).filter(Boolean)
    } catch (error) {
      console.error(`Error getting field options for ${fieldId}:`, error)
      return []
    }
  }

  // Parse Jira field metadata into our format
  private parseFieldMetadata(fieldsData: any): JiraField[] {
    const fields: JiraField[] = []

    for (const [fieldId, fieldInfo] of Object.entries(fieldsData as any)) {
      const field = fieldInfo as any
      
      // Extract allowed values more comprehensively
      let allowedValues: string[] | undefined
      
      if (field.allowedValues && Array.isArray(field.allowedValues)) {
        allowedValues = field.allowedValues.map((v: any) => {
          if (typeof v === 'string') return v
          return v.name || v.value || v.id || String(v)
        }).filter(Boolean)
      }
      
      fields.push({
        id: fieldId,
        name: field.name || fieldId,
        type: this.mapJiraFieldType(field.schema?.type || 'string'),
        required: field.required || false,
        allowedValues,
        description: field.description || undefined
      })
    }

    return fields.sort((a, b) => {
      // Sort required fields first, then by name
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return a.name.localeCompare(b.name)
    })
  }

  // Map Jira field types to our simplified types
  private mapJiraFieldType(jiraType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'number': 'number',
      'date': 'date',
      'datetime': 'date',
      'option': 'select',
      'array': 'multiselect',
      'user': 'text',
      'project': 'text',
      'issuetype': 'select',
      'priority': 'select',
      'resolution': 'select',
      'status': 'select'
    }

    return typeMap[jiraType] || 'text'
  }

  // Discover fields by attempting to create a test issue
  async discoverFieldsByTestCreation(jiraConnection: JiraInstance, issueTypeId: string): Promise<JiraField[]> {
    try {
      const response = await fetch('/api/jira/test-create-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraConnection,
          issueTypeId,
          testData: {
            summary: 'TEST - Field Discovery (will be deleted)',
            description: 'This is a test issue for field discovery'
          }
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        // Test creation succeeded, we have minimal required fields
        return [
          { id: 'summary', name: 'Summary', type: 'text', required: true },
          { id: 'description', name: 'Description', type: 'textarea', required: false }
        ]
      } else {
        // Parse error response for required fields
        console.log('Test creation failed, parsing error for required fields:', data)
        return this.parseErrorForRequiredFields(data)
      }
    } catch (error) {
      console.error('Error in test creation:', error)
      return []
    }
  }

  // Parse Jira error messages to extract required fields
  private parseErrorForRequiredFields(errorData: any): JiraField[] {
    const fields: JiraField[] = []
    
    console.log('Parsing error data for required fields:', JSON.stringify(errorData, null, 2))
    
    // Handle the actual Jira error format: { errors: { fieldId: "error message" } }
    if (errorData && typeof errorData === 'object') {
      // Check for errors object (most common format)
      if (errorData.errors && typeof errorData.errors === 'object') {
        console.log('Found errors object with', Object.keys(errorData.errors).length, 'fields')
        for (const [fieldId, errorMessage] of Object.entries(errorData.errors)) {
          console.log(`Processing field ${fieldId}: ${errorMessage}`)
          if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('required')) {
            // Extract field name from error message or use field ID
            let fieldName = this.formatFieldName(fieldId)
            
            // Try to extract a more readable name from the error message
            const nameMatch = errorMessage.match(/^([^.]+) is required/i)
            if (nameMatch) {
              fieldName = nameMatch[1]
            }
            
            const field = {
              id: fieldId,
              name: fieldName,
              type: this.guessFieldTypeFromId(fieldId),
              required: true,
              allowedValues: this.getCommonAllowedValues(fieldId, fieldName),
              description: `Required field discovered from error: ${errorMessage}`
            }
            console.log(`Adding required field:`, field)
            fields.push(field)
          }
        }
      }
      
      // Check for errorMessages array
      if (errorData.errorMessages && Array.isArray(errorData.errorMessages)) {
        for (const message of errorData.errorMessages) {
          if (typeof message === 'string') {
            // Parse patterns like "Field 'customfield_12345' is required"
            const patterns = [
              /Field '([^']+)' is required/gi,
              /([a-zA-Z_][a-zA-Z0-9_]*) is required/gi,
              /"([^"]+)" is required/gi
            ]

            for (const pattern of patterns) {
              let match
              while ((match = pattern.exec(message)) !== null) {
                const fieldId = match[1]
                if (fieldId && !fields.some(f => f.id === fieldId)) {
                  fields.push({
                    id: fieldId,
                    name: fieldId,
                    type: this.guessFieldTypeFromId(fieldId),
                    required: true,
                    allowedValues: this.getCommonAllowedValues(fieldId, fieldId),
                    description: `Required field discovered from error: ${message}`
                  })
                }
              }
            }
          }
        }
      }
    }

    // If it's a string, try to parse it
    if (typeof errorData === 'string') {
      const patterns = [
        /Field '([^']+)' is required/gi,
        /([a-zA-Z_][a-zA-Z0-9_]*) is required/gi,
        /"([^"]+)" is required/gi
      ]

      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(errorData)) !== null) {
          const fieldId = match[1]
          if (fieldId && !fields.some(f => f.id === fieldId)) {
            fields.push({
              id: fieldId,
              name: fieldId,
              type: this.guessFieldTypeFromId(fieldId),
              required: true,
              allowedValues: this.getCommonAllowedValues(fieldId, fieldId),
              description: `Required field discovered from error: ${errorData}`
            })
          }
        }
      }
    }

    // Add common required fields if none found
    if (fields.length === 0) {
      fields.push(
        { id: 'summary', name: 'Summary', type: 'text', required: true },
        { id: 'description', name: 'Description', type: 'textarea', required: false },
        { id: 'issuetype', name: 'Issue Type', type: 'select', required: true, allowedValues: ['Epic', 'Story', 'Task', 'Bug', 'Initiative'] },
        { id: 'project', name: 'Project', type: 'select', required: true }
      )
    }

    console.log(`Final parsed fields (${fields.length}):`, fields.map(f => ({ id: f.id, name: f.name })))
    return fields
  }

  // Guess field type based on field ID patterns
  private guessFieldTypeFromId(fieldId: string): string {
    // Handle specific known fields
    if (fieldId === 'customfield_26362') return 'select' // Delivery Quarter
    if (fieldId === 'customfield_26360') return 'multiselect' // Include on Roadmap - multiselect checkbox with Internal/External values
    
    if (fieldId.includes('date') || fieldId.includes('time')) return 'date'
    if (fieldId.includes('number') || fieldId.includes('point')) return 'number'
    if (fieldId.includes('priority') || fieldId.includes('status') || fieldId.includes('type')) return 'select'
    if (fieldId.includes('description') || fieldId.includes('comment')) return 'textarea'
    if (fieldId.includes('roadmap') || fieldId.includes('include')) return 'select'
    if (fieldId.includes('quarter')) return 'select'
    return 'text'
  }

  // Get common allowed values for known fields
  private getCommonAllowedValues(fieldId: string, fieldName: string): string[] | undefined {
    const lowerFieldName = fieldName.toLowerCase()
    
    // Handle specific custom fields based on error messages
    if (fieldId === 'customfield_26362' || lowerFieldName.includes('delivery quarter')) {
      // Based on error: "Specify a valid 'id' or 'name' for Delivery Quarter"
      // This suggests it needs specific IDs/names, not just text
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      return [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`, 
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${nextYear}`,
        `Q2 ${nextYear}`,
        `Q3 ${nextYear}`,
        `Q4 ${nextYear}`
      ]
    }
    
    if (fieldId === 'customfield_26360' || lowerFieldName.includes('roadmap') || lowerFieldName.includes('include on roadmap')) {
      // Include on Roadmap - multiselect checkbox with Internal and External values
      return ['Internal', 'External']
    }
    
    // Handle standard fields
    if (fieldId === 'issuetype' || lowerFieldName.includes('issue type')) {
      return ['Epic', 'Story', 'Task', 'Bug', 'Initiative']
    }
    
    if (fieldId === 'priority' || lowerFieldName.includes('priority')) {
      return ['Highest', 'High', 'Medium', 'Low', 'Lowest']
    }
    
    // Handle generic patterns
    if (lowerFieldName.includes('quarter')) {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      return [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${nextYear}`,
        `Q2 ${nextYear}`
      ]
    }
    
    if (lowerFieldName.includes('yes') || lowerFieldName.includes('no') || lowerFieldName.includes('include')) {
      return ['Yes', 'No']
    }
    
    return undefined
  }

  // Format field name for display
  private formatFieldName(fieldId: string): string {
    // Standard field names mapping
    const standardNames: Record<string, string> = {
      summary: 'Title',
      description: 'Description', 
      assignee: 'Assignee',
      reporter: 'Reporter',
      priority: 'Priority',
      issuetype: 'Issue Type',
      project: 'Project',
      fixVersions: 'Fix Version/s',
      versions: 'Affects Version/s',
      components: 'Component/s',
      labels: 'Labels',
      duedate: 'Due Date',
      resolution: 'Resolution',
      status: 'Status',
      created: 'Created',
      updated: 'Updated',
      resolutiondate: 'Resolved',
      worklog: 'Work Log',
      attachment: 'Attachment',
      comment: 'Comments',
      issuelinks: 'Linked Issues',
      subtasks: 'Sub-tasks',
      parent: 'Parent',
      customfield_10000: 'Story Points',
      customfield_10001: 'Epic Name',
      customfield_10002: 'Epic Link'
    }

    return standardNames[fieldId] || fieldId.charAt(0).toUpperCase() + fieldId.slice(1)
  }

  // Get ALL available fields for comprehensive discovery
  async getAllAvailableFields(jiraConnection: JiraInstance, issueTypeId?: string): Promise<JiraField[]> {
    try {
      console.log('Discovering all available fields...')

      // Method 1: Get all fields from the global fields endpoint
      const allFields = await this.fetchAllSystemFields(jiraConnection)
      
      // Method 2: If we have a specific issue type, get its create metadata
      let issueTypeFields: JiraField[] = []
      if (issueTypeId) {
        issueTypeFields = await this.getFieldsForIssueType(jiraConnection, issueTypeId)
      }

      // Combine and deduplicate fields
      const fieldMap = new Map<string, JiraField>()
      
      // Add all system fields
      allFields.forEach(field => fieldMap.set(field.id, field))
      
      // Overlay issue-type specific fields (they have more context)
      issueTypeFields.forEach(field => fieldMap.set(field.id, field))

      const discoveredFields = Array.from(fieldMap.values())
      
      console.log(`Discovered ${discoveredFields.length} total available fields`)
      return discoveredFields
    } catch (error) {
      console.error('Error getting all available fields:', error)
      return []
    }
  }

  // Fetch all system fields from Jira
  private async fetchAllSystemFields(jiraConnection: JiraInstance): Promise<JiraField[]> {
    const auth = btoa(`${jiraConnection.email}:${jiraConnection.apiToken}`)
    
    try {
      const response = await fetch(`${jiraConnection.url}/rest/api/3/field`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch fields: ${response.status}`)
      }

      const fieldsData = await response.json()
      return this.parseFieldMetadata(fieldsData)
    } catch (error) {
      console.error('Error fetching all system fields:', error)
      return []
    }
  }

  // Search for fields by name or description
  searchFields(fields: JiraField[], searchTerm: string): JiraField[] {
    if (!searchTerm.trim()) return fields

    const term = searchTerm.toLowerCase()
    return fields.filter(field => 
      field.name.toLowerCase().includes(term) ||
      field.id.toLowerCase().includes(term) ||
      field.description?.toLowerCase().includes(term)
    )
  }

  // Categorize fields for better UX
  categorizeFields(fields: JiraField[]): {
    commonly_used: JiraField[]
    project_specific: JiraField[]
    optional_standard: JiraField[]
    system_fields: JiraField[]
  } {
    const commonly_used = fields.filter(field => this.isCommonlyUsedField(field))
    const project_specific = fields.filter(field => this.isProjectSpecificField(field))
    const system_fields = fields.filter(field => this.isSystemField(field))
    const optional_standard = fields.filter(field => 
      !commonly_used.includes(field) && 
      !project_specific.includes(field) && 
      !system_fields.includes(field)
    )

    return {
      commonly_used,
      project_specific,
      optional_standard,
      system_fields
    }
  }

  // Check if field is commonly used
  private isCommonlyUsedField(field: JiraField): boolean {
    const commonFieldIds = [
      'assignee', 'priority', 'fixVersions', 'components', 'labels',
      'duedate', 'customfield_10000', // Story Points
      'customfield_10001', // Epic Name
      'customfield_10002', // Epic Link
    ]
    
    const commonFieldNames = [
      'story points', 'assignee', 'priority', 'labels', 'component',
      'fix version', 'due date', 'epic', 'sprint'
    ]

    return commonFieldIds.includes(field.id) ||
           commonFieldNames.some(name => field.name.toLowerCase().includes(name))
  }

  // Check if field is project specific (custom fields)
  private isProjectSpecificField(field: JiraField): boolean {
    return field.id.startsWith('customfield_') && !this.isCommonlyUsedField(field)
  }

  // Check if field is a system field
  private isSystemField(field: JiraField): boolean {
    const systemFields = [
      'created', 'updated', 'creator', 'reporter', 'status', 'resolution',
      'resolutiondate', 'worklog', 'attachment', 'comment', 'issuelinks',
      'subtasks', 'parent', 'project', 'issuetype'
    ]
    
    return systemFields.includes(field.id) || field.id.includes('time') || field.id.includes('log')
  }

  // Get field usage statistics (mock implementation for now)
  getFieldUsageStats(field: JiraField): { usage_percentage: number; is_popular: boolean } {
    // In a real implementation, this could call Jira analytics APIs
    // For now, we'll use heuristics based on field type and name
    
    let usage_percentage = 50 // Default
    
    if (this.isCommonlyUsedField(field)) {
      usage_percentage = 85
    } else if (field.required) {
      usage_percentage = 95
    } else if (this.isSystemField(field)) {
      usage_percentage = 30
    } else if (this.isProjectSpecificField(field)) {
      usage_percentage = 40
    }

    return {
      usage_percentage,
      is_popular: usage_percentage > 70
    }
  }

  // Main method to discover fields for a work item type
  async discoverFields(jiraConnection: JiraInstance, workItemType: WorkItemType): Promise<JiraFieldMapping | null> {
    try {
      // First, get issue types
      const issueTypes = await this.getIssueTypes(jiraConnection)
      
      // Map work item type to Jira issue type
      const issueType = this.mapWorkItemTypeToJiraIssueType(workItemType, issueTypes)
      if (!issueType) {
        console.warn(`No matching issue type found for ${workItemType}`)
        return null
      }

      console.log(`Discovering fields for ${workItemType} using issue type: ${issueType.name}`)

      // Try metadata API first
      let fields = await this.getFieldsForIssueType(jiraConnection, issueType.id)
      
      // If metadata API fails or returns insufficient data, try test creation
      if (fields.length === 0) {
        console.log('Metadata API returned no fields, trying test creation...')
        fields = await this.discoverFieldsByTestCreation(jiraConnection, issueType.id)
      }

      const mapping: JiraFieldMapping = {
        workItemType,
        issueType: issueType.name,
        fields,
        discoveredAt: new Date().toISOString()
      }

      // Save the mapping
      this.saveFieldMapping(mapping)

      return mapping
    } catch (error) {
      console.error('Error discovering fields:', error)
      return null
    }
  }

  // Map our work item types to Jira issue types
  private mapWorkItemTypeToJiraIssueType(workItemType: WorkItemType, issueTypes: any[]): any | null {
    const mappings: Record<WorkItemType, string[]> = {
      all: ['Story', 'Epic', 'Task', 'Bug', 'Initiative'], // For 'all', try common types
      story: ['Story', 'User Story', 'Task'],
      epic: ['Epic'],
      initiative: ['Initiative', 'Epic', 'Story'], // Fallback order
      task: ['Task', 'Story', 'Sub-task'],
      bug: ['Bug', 'Defect', 'Issue']
    }

    const candidates = mappings[workItemType] || []
    
    for (const candidate of candidates) {
      const found = issueTypes.find(type => 
        type.name.toLowerCase().includes(candidate.toLowerCase())
      )
      if (found) return found
    }

    // If no specific match, return the first available type
    return issueTypes[0] || null
  }

  // Save field mapping to localStorage
  private saveFieldMapping(mapping: JiraFieldMapping): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const mappings: JiraFieldMapping[] = stored ? JSON.parse(stored) : []
      
      // Remove existing mapping for this work item type
      const filtered = mappings.filter(m => m.workItemType !== mapping.workItemType)
      filtered.push(mapping)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to save field mapping:', error)
    }
  }

  // Get saved field mapping
  getFieldMapping(workItemType: WorkItemType): JiraFieldMapping | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const mappings: JiraFieldMapping[] = JSON.parse(stored)
      return mappings.find(m => m.workItemType === workItemType) || null
    } catch (error) {
      console.error('Failed to load field mapping:', error)
      return null
    }
  }

  // Clear all field mappings
  clearFieldMappings(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // Discover fields from a failed Jira creation attempt
  async discoverFieldsFromError(
    jiraConnection: JiraInstance, 
    workItemType: WorkItemType, 
    errorData: any
  ): Promise<JiraFieldMapping | null> {
    try {
      console.log('Discovering fields from Jira error:', errorData)
      
      // Parse the error to extract required fields
      const discoveredFields = this.parseErrorForRequiredFields(errorData)
      
      if (discoveredFields.length === 0) {
        console.warn('No required fields could be discovered from error')
        return null
      }

      // Fetch actual allowed values for custom fields
      for (const field of discoveredFields) {
        if (field.id.startsWith('customfield_')) {
          console.log(`Fetching actual options for custom field: ${field.id}`)
          try {
            const actualOptions = await this.getFieldOptions(jiraConnection, field.id)
            if (actualOptions.length > 0) {
              field.allowedValues = actualOptions
              console.log(`Found ${actualOptions.length} options for ${field.id}:`, actualOptions)
            }
          } catch (optionError) {
            console.warn(`Failed to get options for ${field.id}:`, optionError)
          }
        }
      }

      // Get issue types to determine the correct issue type name
      const issueTypes = await this.getIssueTypes(jiraConnection)
      const issueType = this.mapWorkItemTypeToJiraIssueType(workItemType, issueTypes)
      
      const mapping: JiraFieldMapping = {
        workItemType,
        issueType: issueType?.name || 'Unknown',
        fields: discoveredFields,
        discoveredAt: new Date().toISOString()
      }

      // Save the mapping
      this.saveFieldMapping(mapping)
      
      console.log(`Discovered ${discoveredFields.length} required fields from error:`, 
        discoveredFields.map(f => `${f.id} (${f.name}) - ${f.allowedValues?.length || 0} options`))

      return mapping
    } catch (error) {
      console.error('Error discovering fields from error:', error)
      return null
    }
  }
}

export const jiraFieldService = new JiraFieldService()

// Utility function to fetch all projects with pagination
export async function fetchAllJiraProjects(jiraConnection: { url: string; email: string; apiToken: string }) {
  const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
  
  let allProjects: any[] = []
  let startAt = 0
  const maxResults = 100
  let hasMoreResults = true

  while (hasMoreResults) {
    const url = `${jiraConnection.url}/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Add projects from this page
    if (data.values && Array.isArray(data.values)) {
      allProjects = allProjects.concat(data.values)
    }
    
    // Check if there are more results
    const totalResults = data.total || 0
    startAt += maxResults
    hasMoreResults = startAt < totalResults
  }
  
  return allProjects
} 