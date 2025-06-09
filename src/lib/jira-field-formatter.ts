import { JiraInstance } from '../types'

export interface FieldFormatInfo {
  fieldId: string
  fieldType: string
  schema: any
  allowedValues: any[]
  isArray: boolean
  isRequired: boolean
}

class JiraFieldFormatter {
  
  // Format a field value based on its metadata
  formatFieldValue(fieldInfo: FieldFormatInfo, value: any): any {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const { fieldId, fieldType, schema, allowedValues, isArray } = fieldInfo

    // Handle specific custom fields based on known patterns
    if (fieldId === 'customfield_26360') {
      // Include on Roadmap - based on errors, needs to be an array
      return this.formatArrayField(value, allowedValues)
    }

    if (fieldId === 'customfield_26362') {
      // Delivery Quarter - based on errors, needs specific id/name format
      return this.formatSelectField(value, allowedValues)
    }

    // Handle by schema type
    if (schema) {
      switch (schema.type) {
        case 'array':
          return this.formatArrayField(value, allowedValues)
        case 'option':
          return this.formatSelectField(value, allowedValues)
        case 'user':
          return this.formatUserField(value)
        case 'project':
          return this.formatProjectField(value)
        case 'issuetype':
          return this.formatIssueTypeField(value)
        case 'priority':
          return this.formatPriorityField(value)
        case 'string':
          return String(value)
        case 'number':
          return Number(value)
        case 'date':
        case 'datetime':
          return this.formatDateField(value)
        default:
          break
      }
    }

    // Handle by field type patterns
    if (fieldType === 'select' || fieldType === 'option') {
      return this.formatSelectField(value, allowedValues)
    }

    if (fieldType === 'multiselect' || isArray) {
      return this.formatArrayField(value, allowedValues)
    }

    if (fieldType === 'checkbox') {
      return this.formatArrayField(value, allowedValues)
    }

    // Default formatting
    return value
  }

  private formatArrayField(value: any, allowedValues: any[]): any[] {
    const values = Array.isArray(value) ? value : [value]
    
    return values.map(v => {
      // If we have allowed values, try to match against them
      if (allowedValues && allowedValues.length > 0) {
        const match = this.findMatchingOption(v, allowedValues)
        if (match) {
          // For multiselect fields, prefer the ID if available, otherwise use value
          if (match.id) {
            return { id: match.id }
          } else {
            return { value: match.value || match.name }
          }
        }
      }
      
      // Default format for array items
      if (typeof v === 'object') return v
      // For multiselect fields, use value property
      return { value: String(v).trim() }
    })
  }

  private formatSelectField(value: any, allowedValues: any[]): any {
    // If we have allowed values, try to match against them
    if (allowedValues && allowedValues.length > 0) {
      const match = this.findMatchingOption(value, allowedValues)
      if (match) {
        return { id: match.id, value: match.value || match.name }
      }
    }
    
    // Default format for select fields
    if (typeof value === 'object') return value
    return { value: String(value) }
  }

  private formatUserField(value: any): any {
    if (typeof value === 'object') return value
    
    // Try different user field formats
    if (String(value).includes('@')) {
      return { emailAddress: String(value) }
    }
    
    return { accountId: String(value) }
  }

  private formatProjectField(value: any): any {
    if (typeof value === 'object') return value
    return { key: String(value) }
  }

  private formatIssueTypeField(value: any): any {
    if (typeof value === 'object') return value
    return { name: String(value) }
  }

  private formatPriorityField(value: any): any {
    if (typeof value === 'object') return value
    return { name: String(value) }
  }

  private formatDateField(value: any): string {
    if (typeof value === 'string') return value
    if (value instanceof Date) return value.toISOString().split('T')[0]
    return String(value)
  }

  private findMatchingOption(value: any, allowedValues: any[]): any | null {
    const searchValue = String(value).toLowerCase()
    
    // Try exact matches first
    for (const option of allowedValues) {
      if (option.value && String(option.value).toLowerCase() === searchValue) {
        return option
      }
      if (option.name && String(option.name).toLowerCase() === searchValue) {
        return option
      }
      if (option.id && String(option.id).toLowerCase() === searchValue) {
        return option
      }
    }
    
    // Try partial matches
    for (const option of allowedValues) {
      if (option.value && String(option.value).toLowerCase().includes(searchValue)) {
        return option
      }
      if (option.name && String(option.name).toLowerCase().includes(searchValue)) {
        return option
      }
    }
    
    return null
  }

  // Get field format info from metadata
  getFieldFormatInfo(fieldMetadata: any): FieldFormatInfo {
    const fieldData = fieldMetadata.fieldData || {}
    const options = fieldMetadata.options || []
    
    return {
      fieldId: fieldData.id || fieldMetadata.fieldId,
      fieldType: fieldData.schema?.type || 'string',
      schema: fieldData.schema,
      allowedValues: options,
      isArray: fieldData.schema?.type === 'array' || 
               fieldData.schema?.items?.type === 'option' ||
               (fieldData.schema?.custom && fieldData.schema.custom.includes('multiselect')),
      isRequired: false // This would need to come from create metadata
    }
  }
}

export const jiraFieldFormatter = new JiraFieldFormatter() 