'use client'

import React, { useState, useEffect } from 'react'
import { GeneratedContent, WorkItemTemplate, JiraField, EnhancedExtractionResult, ExtractionCandidate } from '../types'
import { fieldValidationService } from '../lib/field-validation-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Icons } from './ui/icons'

export interface MissingField {
  jiraFieldId: string
  jiraField: JiraField
  templateFieldId?: string
  currentValue?: any
}

interface FieldValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (updatedContent: GeneratedContent, customFields: Record<string, any>) => void
  content: GeneratedContent
  template: WorkItemTemplate | null
  jiraFields: JiraField[]
  missingFields: MissingField[]
  extractedFields?: Record<string, any>
  suggestions?: Record<string, any[]>
  enhancedExtraction?: EnhancedExtractionResult
  jiraConnection?: any
  workItemType?: string
}

export function FieldValidationModal({
  isOpen,
  onClose,
  onSubmit,
  content,
  template,
  jiraFields,
  missingFields,
  extractedFields = {},
  suggestions = {},
  enhancedExtraction,
  jiraConnection,
  workItemType
}: FieldValidationModalProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})
  const [confirmedExtractions, setConfirmedExtractions] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && content) {
      // Initialize field values with extracted fields and existing content
      const initialValues: Record<string, any> = {
        ...extractedFields,
        ...(content.customFields || {})
      }

      // Include auto-applied fields from enhanced extraction
      if (enhancedExtraction) {
        for (const [fieldId, value] of enhancedExtraction.autoApplied) {
          initialValues[fieldId] = value
        }
      }

      // Auto-populate system fields (project and issue type) - these will be hidden from user
      const systemFields = autoPopulateSystemFields(initialValues);
      Object.assign(initialValues, systemFields);

      setFieldValues(initialValues)
      setConfirmedExtractions(new Set())
      setValidationErrors({})
    }
  }, [isOpen, extractedFields, content?.customFields, enhancedExtraction, content, jiraConnection, workItemType])

  /**
   * Auto-populate system fields like project and issue type that should be handled automatically
   */
  const autoPopulateSystemFields = (currentValues: Record<string, any>): Record<string, any> => {
    const systemFields: Record<string, any> = {};

    if (!jiraFields || !workItemType) return systemFields;

    // Auto-populate issue type based on work item type
    const issueTypeField = jiraFields.find(field => 
      field.id.toLowerCase() === 'issuetype' || 
      field.name.toLowerCase().includes('issue type')
    );

    if (issueTypeField && !currentValues[issueTypeField.id]) {
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
          console.log(`Auto-populated issue type in modal: ${issueTypeField.id} = ${JSON.stringify(matchingIssueType)}`);
        }
      }
    }

    // Auto-populate project field from Jira connection
    const projectField = jiraFields.find(field => 
      field.id.toLowerCase() === 'project' || 
      field.name.toLowerCase().includes('project')
    );

    if (projectField && !currentValues[projectField.id] && jiraConnection?.projectKey) {
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
          console.log(`Auto-populated project in modal: ${projectField.id} = ${JSON.stringify(matchingProject)}`);
        }
      } else {
        // If no allowed values, use the project key directly
        systemFields[projectField.id] = { key: jiraConnection.projectKey };
        console.log(`Auto-populated project in modal: ${projectField.id} = ${jiraConnection.projectKey}`);
      }
    }

    return systemFields;
  };

  /**
   * Check if a field should be hidden from the user (auto-populated system fields)
   */
  const isSystemField = (field: JiraField): boolean => {
    const fieldId = field.id.toLowerCase();
    const fieldName = field.name.toLowerCase();
    
    return (
      fieldId === 'issuetype' || 
      fieldName.includes('issue type') ||
      fieldId === 'project' ||
      fieldName.includes('project') ||
      fieldId === 'summary' ||
      fieldName.includes('summary') ||
      fieldName.includes('title')
    );
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const { [fieldId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleConfirmExtraction = (fieldId: string, confirmed: boolean) => {
    setConfirmedExtractions(prev => {
      const newSet = new Set(prev)
      if (confirmed) {
        newSet.add(fieldId)
      } else {
        newSet.delete(fieldId)
      }
      return newSet
    })
  }

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    // Validate all required fields
    jiraFields.filter(f => f.required).forEach(field => {
      const value = fieldValues[field.id]
      const validation = fieldValidationService.validateFieldValue(field, value)
      
      if (!validation.isValid && validation.error) {
        errors[field.id] = validation.error
        isValid = false
      }
    })

    setValidationErrors(errors)
    return isValid
  }

  const handleSubmit = async () => {
    // Validate only user-visible fields (system fields are auto-populated and don't need validation)
    const errors: Record<string, string> = {}
    let isValid = true

    // Validate user-visible required fields
    userVisibleFields.filter(f => f.required).forEach(field => {
      const value = fieldValues[field.id]
      const validation = fieldValidationService.validateFieldValue(field, value)
      
      if (!validation.isValid && validation.error) {
        errors[field.id] = validation.error
        isValid = false
      }
    })

    setValidationErrors(errors)
    if (!isValid) {
      return
    }

    if (!content) {
      console.error('Cannot submit: content is null')
      return
    }

    setIsSubmitting(true)
    try {
      const updatedContent: GeneratedContent = {
        ...content,
        customFields: {
          ...(content.customFields || {}),
          ...fieldValues // This includes both user fields and auto-populated system fields
        }
      }

      await onSubmit(updatedContent, fieldValues)
    } catch (error) {
      console.error('Field validation submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyAllExtractions = () => {
    if (enhancedExtraction) {
      const newConfirmed = new Set(confirmedExtractions)
      for (const fieldId of enhancedExtraction.requiresConfirmation.keys()) {
        newConfirmed.add(fieldId)
      }
      setConfirmedExtractions(newConfirmed)
    }
  }

  const handleRejectAllExtractions = () => {
    setConfirmedExtractions(new Set())
  }

  const getFieldSection = (field: JiraField): 'auto-applied' | 'confirmation' | 'manual' | 'missing' => {
    if (enhancedExtraction) {
      if (enhancedExtraction.autoApplied.has(field.id)) return 'auto-applied'
      if (enhancedExtraction.requiresConfirmation.has(field.id)) return 'confirmation'
      if (enhancedExtraction.manualFields.includes(field.id)) return 'manual'
    }
    return 'missing'
  }

  if (!isOpen) return null

  const requiredFields = jiraFields.filter(f => f.required)
  
  // Filter out system fields from the fields shown to the user
  const userVisibleFields = requiredFields.filter(f => !isSystemField(f))
  
  const autoAppliedFields = userVisibleFields.filter(f => getFieldSection(f) === 'auto-applied')
  const confirmationFields = userVisibleFields.filter(f => getFieldSection(f) === 'confirmation')
  const manualFields = userVisibleFields.filter(f => getFieldSection(f) === 'manual')
  const otherMissingFields = userVisibleFields.filter(f => 
    getFieldSection(f) === 'missing' && 
    !autoAppliedFields.includes(f) && 
    !confirmationFields.includes(f) && 
    !manualFields.includes(f)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review Field Extraction</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and confirm the extracted field values before creating the Jira issue
              </p>
            </div>
            <Button variant="outline" onClick={onClose} size="sm">
              <Icons.X size="sm" className="mr-2" />
              Cancel
            </Button>
          </div>
          
          {/* Extraction Summary */}
          {enhancedExtraction && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icons.Info size="sm" className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    Smart Extraction Summary
                  </span>
                </div>
                <div className="flex gap-2">
                  {confirmationFields.length > 0 && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleApplyAllExtractions}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        Accept All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRejectAllExtractions}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        Reject All
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>{enhancedExtraction.extractionSummary.autoAppliedCount} Auto-applied</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  <span>{enhancedExtraction.extractionSummary.confirmationCount} Need confirmation</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  <span>{enhancedExtraction.extractionSummary.manualCount} Manual input</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  <span>{enhancedExtraction.extractionSummary.skippedCount} Skipped</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Auto-Applied Fields */}
          {autoAppliedFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Icons.CheckCircle size="sm" className="mr-2" />
                  Auto-Applied Fields ({autoAppliedFields.length})
                </CardTitle>
                <CardDescription>
                  These fields were automatically extracted and applied with high confidence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {autoAppliedFields.map(field => {
                    const value = enhancedExtraction?.autoApplied.get(field.id)
                    return (
                      <div key={field.id} className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-green-900">{field.name}</label>
                          <Badge variant="outline" className="border-green-600 text-green-700 text-xs">
                            Auto-applied
                          </Badge>
                        </div>
                        <div className="text-sm text-green-800 bg-green-100 px-2 py-1 rounded">
                          {String(value)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Required Fields */}
          {confirmationFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <Icons.AlertCircle size="sm" className="mr-2" />
                  Confirmation Required ({confirmationFields.length})
                </CardTitle>
                <CardDescription>
                  Please review and confirm these extracted values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {confirmationFields.map(field => {
                    const candidate = enhancedExtraction?.requiresConfirmation.get(field.id)
                    const isConfirmed = confirmedExtractions.has(field.id)
                    const fieldSuggestions = suggestions[field.id] || []
                    
                    return (
                      <div key={field.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-gray-900">{field.name}</label>
                          <div className="flex items-center gap-2">
                            {candidate && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(candidate.confidence * 100)}% confidence
                              </Badge>
                            )}
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isConfirmed}
                                onChange={(e) => handleConfirmExtraction(field.id, e.target.checked)}
                                className="mr-1"
                              />
                              <span className="text-xs text-yellow-800">Confirm</span>
                            </label>
                          </div>
                        </div>
                        
                        {renderFieldInput(field, candidate?.value, fieldSuggestions)}
                        
                        {candidate?.suggestion && (
                          <p className="text-xs text-yellow-700 mt-2">{candidate.suggestion}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Fields */}
          {(manualFields.length > 0 || otherMissingFields.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-700">
                  <Icons.Edit size="sm" className="mr-2" />
                  Manual Input Required ({manualFields.length + otherMissingFields.length})
                </CardTitle>
                <CardDescription>
                  These fields require manual input or could not be extracted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...manualFields, ...otherMissingFields].map(field => {
                    const fieldSuggestions = suggestions[field.id] || []
                    return (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldInput(field, fieldValues[field.id], fieldSuggestions)}
                        {validationErrors[field.id] && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors[field.id]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {userVisibleFields.length} required fields • {autoAppliedFields.length} auto-applied • {confirmationFields.length + manualFields.length + otherMissingFields.length} need attention
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="jira-btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <Icons.Loader size="sm" className="animate-spin mr-2" />
                    Creating Issue...
                  </>
                ) : (
                  <>
                    <Icons.Check size="sm" className="mr-2" />
                    Create Jira Issue
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function renderFieldInput(field: JiraField, currentValue: any, fieldSuggestions: any[]): React.ReactElement {
    const value = fieldValues[field.id] !== undefined ? fieldValues[field.id] : currentValue

    switch (field.type) {
      case 'select':
        return (
          <div className="space-y-2">
            <select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="jira-select w-full"
            >
              <option value="">Select {field.name}</option>
              {field.allowedValues?.map((option: any) => (
                <option key={typeof option === 'string' ? option : option.value} 
                        value={typeof option === 'string' ? option : option.value}>
                  {typeof option === 'string' ? option : option.name || option.value}
                </option>
              ))}
            </select>
            {fieldSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {fieldSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFieldChange(field.id, typeof suggestion === 'string' ? suggestion : suggestion.value)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.value)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="jira-textarea w-full"
            rows={3}
            placeholder={`Enter ${field.name}`}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : '')}
            className="jira-input w-full"
            placeholder={`Enter ${field.name}`}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="jira-input w-full"
          />
        )

      default:
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="jira-input w-full"
              placeholder={`Enter ${field.name}`}
            />
            {fieldSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {fieldSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFieldChange(field.id, typeof suggestion === 'string' ? suggestion : suggestion.value)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.value)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
    }
  }
} 