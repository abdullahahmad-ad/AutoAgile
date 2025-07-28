'use client'

import React, { useState, useEffect } from 'react'
import { ContentType, WorkItemType, FieldExtractionConfig, ExtractionPreferences, EnhancedWorkItemTemplate } from '../types'
import { JiraField, jiraFieldService } from '../lib/jira-field-service'
import { templateService } from '../lib/template-service'
import { contentInstructionService } from '../lib/content-instruction-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Icons } from './ui/icons'
import { FieldExtractionConfigEditor } from './field-extraction-config-editor'

interface TemplateConfigurationProps {
  onClose: () => void
}

type ConfigSection = 'work-items' | 'content-generation' | 'field-extraction'
type ContentTemplateType = 'quarterly-presentation' | 'customer-webinar' | 'feature-newsletter' | 'technical-documentation' | 'stakeholder-update' | 'engineering-highlights'
type WorkItemConfigType = 'epic' | 'story' | 'initiative'

export function TemplateConfiguration({ onClose }: TemplateConfigurationProps) {
  const [activeSection, setActiveSection] = useState<ConfigSection>('work-items')
  const [selectedContentType, setSelectedContentType] = useState<ContentTemplateType>('quarterly-presentation')
  const [selectedWorkItemType, setSelectedWorkItemType] = useState<WorkItemConfigType>('epic')
  
  // Content instructions state
  const [instructions, setInstructions] = useState('')
  const [hasInstructionChanges, setHasInstructionChanges] = useState(false)
  
  // Field extraction state
  const [jiraFields, setJiraFields] = useState<JiraField[]>([])
  const [loadingJiraFields, setLoadingJiraFields] = useState(false)
  const [showFieldExtractionEditor, setShowFieldExtractionEditor] = useState(false)
  const [isDiscoveringFields, setIsDiscoveringFields] = useState(false)

  // Work item instructions state
  const [workItemInstructions, setWorkItemInstructions] = useState('')
  const [hasWorkItemChanges, setHasWorkItemChanges] = useState(false)

  useEffect(() => {
    if (activeSection === 'content-generation') {
      loadContentInstructions()
    } else if (activeSection === 'field-extraction') {
      loadJiraFields()
    }
  }, [activeSection, selectedContentType, selectedWorkItemType])

  useEffect(() => {
    loadContentInstructions()
  }, [selectedContentType])

  // Load work item instructions when work item type changes
  useEffect(() => {
    const loadWorkItemInstructions = () => {
      const template = templateService.getDefaultTemplate(selectedWorkItemType as WorkItemType)
      setWorkItemInstructions(template.aiPrompt)
      setHasWorkItemChanges(false)
    }
    loadWorkItemInstructions()
  }, [selectedWorkItemType])

  const loadContentInstructions = () => {
    const template = contentInstructionService.getTemplate(selectedContentType)
    setInstructions(template.userInstructions || template.defaultInstructions)
    setHasInstructionChanges(false)
  }

  const loadJiraFields = async () => {
    setLoadingJiraFields(true)
    try {
      // Try to get cached field mapping first
      const fieldMapping = jiraFieldService.getFieldMapping(selectedWorkItemType)
      if (fieldMapping) {
        setJiraFields(fieldMapping.fields)
      } else {
        setJiraFields([])
      }
    } catch (error) {
      console.error('Failed to load Jira fields:', error)
      setJiraFields([])
    } finally {
      setLoadingJiraFields(false)
    }
  }

  const handleSaveContentInstructions = () => {
    const template = contentInstructionService.getTemplate(selectedContentType)
    const updatedTemplate = {
      ...template,
      userInstructions: instructions,
      isCustomized: true,
      updatedAt: new Date()
    }
    contentInstructionService.saveTemplate(updatedTemplate)
    setHasInstructionChanges(false)
  }

  const handleResetContentInstructions = () => {
    const template = contentInstructionService.resetToDefault(selectedContentType)
    setInstructions(template.defaultInstructions)
    setHasInstructionChanges(false)
  }

  const handleFieldExtractionSave = (config: FieldExtractionConfig[], preferences: ExtractionPreferences) => {
    templateService.updateFieldExtractionConfig(selectedWorkItemType, config, preferences)
    setShowFieldExtractionEditor(false)
  }

  const handleFieldsUpdated = (fields: JiraField[]) => {
    setJiraFields(fields)
  }

  const handleOpenFieldExtractionEditor = () => {
    if (jiraFields.length === 0) {
      alert('No Jira fields available. Please ensure you have a Jira connection configured and field discovery has been run.')
      return
    }
    setShowFieldExtractionEditor(true)
  }

  const handleDiscoverFields = async () => {
    setIsDiscoveringFields(true)
    try {
      // Get Jira connection from localStorage
      const jiraConnection = JSON.parse(localStorage.getItem('jira-connection') || '{}')
      
      if (!jiraConnection.url) {
        alert('No Jira connection found. Please configure your Jira connection first.')
        return
      }

      // Call the same API endpoint that Create & Push uses
      const response = await fetch('/api/jira/discover-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jiraConnection,
          workItemType: selectedWorkItemType
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Transform the API response to match JiraField interface
        const jiraFieldsData: JiraField[] = data.fields.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type as JiraField['type'], 
          required: field.required,
          allowedValues: field.allowedValues?.map((v: any) => 
            typeof v === 'object' ? (v.name || v.value || v.id) : v
          ),
          description: field.description,
          schema: field.schema,
          isMultiSelect: field.isMultiSelect
        }))
        
        // Save to localStorage cache manually (since saveFieldMapping is private)
        const fieldMapping = {
          workItemType: selectedWorkItemType,
          issueType: data.issueTypeName || 'Epic',
          fields: jiraFieldsData,
          discoveredAt: new Date().toISOString()
        }
        
        try {
          const stored = localStorage.getItem('jira-field-mappings')
          const mappings = stored ? JSON.parse(stored) : []
          
          // Remove existing mapping for this work item type
          const filtered = mappings.filter((m: any) => m.workItemType !== selectedWorkItemType)
          filtered.push(fieldMapping)
          
          localStorage.setItem('jira-field-mappings', JSON.stringify(filtered))
        } catch (error) {
          console.error('Failed to save field mapping:', error)
        }
        
        // Update local state
        setJiraFields(jiraFieldsData)
        
        alert(`Successfully discovered ${jiraFieldsData.length} fields for ${selectedWorkItemType}!`)
      } else {
        const errorData = await response.json()
        alert(`Failed to discover fields: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error discovering fields:', error)
      alert('Failed to discover fields. Please check your connection and try again.')
    } finally {
      setIsDiscoveringFields(false)
    }
  }

  const getSectionIcon = (section: ConfigSection) => {
    switch (section) {
      case 'work-items': return Icons.FileText
      case 'content-generation': return Icons.Sparkles
      case 'field-extraction': return Icons.Settings
      default: return Icons.FileText
    }
  }

  const getSectionTitle = (section: ConfigSection) => {
    switch (section) {
      case 'work-items': return 'Work Item Templates'
      case 'content-generation': return 'AI Content Generation'
      case 'field-extraction': return 'Smart Field Extraction'
      default: return section
    }
  }

  const getSectionDescription = (section: ConfigSection) => {
    switch (section) {
      case 'work-items': return 'Configure templates and formats for different work item types'
      case 'content-generation': return 'Customize AI instructions for generating different content types'
      case 'field-extraction': return 'Configure how fields are extracted and validated when pushing to Jira'
      default: return ''
    }
  }

  if (showFieldExtractionEditor) {
    const template = templateService.getEnhancedTemplate(selectedWorkItemType)
    return (
      <FieldExtractionConfigEditor
        workItemType={selectedWorkItemType}
        template={template}
        jiraFields={jiraFields}
        onSave={handleFieldExtractionSave}
        onCancel={() => setShowFieldExtractionEditor(false)}
        onFieldsUpdated={handleFieldsUpdated}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Configuration</h1>
            <p className="text-sm text-gray-600 mt-1">
              Customize templates, AI instructions, and field extraction settings
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <Icons.X size="sm" className="mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200">
          <nav className="mt-4">
            {(['work-items', 'content-generation', 'field-extraction'] as ConfigSection[]).map((section) => {
              const IconComponent = getSectionIcon(section)
              const isActive = activeSection === section
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium border-r-2 transition-colors ${
                    isActive 
                      ? 'text-blue-700 bg-blue-50 border-blue-700' 
                      : 'text-gray-700 bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  <IconComponent size="sm" className="mr-3" />
                  {getSectionTitle(section)}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Section Header */}
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {getSectionTitle(activeSection)}
            </h2>
            <p className="text-sm text-gray-600 mt-1 mb-6">
              {getSectionDescription(activeSection)}
            </p>
          </div>

          {/* Work Items Section */}
          {activeSection === 'work-items' && (
            <div className="space-y-6">
              {/* Work Item Type Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Item Type</CardTitle>
                  <CardDescription>
                    Select the work item type to configure template and format settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'epic', title: 'Epic', description: 'Configure template for Epic work items' },
                      { type: 'story', title: 'Story', description: 'Configure template for Story work items' },
                      { type: 'initiative', title: 'Initiative', description: 'Configure template for Initiative work items' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => setSelectedWorkItemType(item.type as WorkItemConfigType)}
                        className={`p-4 text-left border rounded-lg transition-colors ${
                          selectedWorkItemType === item.type
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <div className="mb-2">
                          <h3 className="font-medium">{item.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Template Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedWorkItemType.charAt(0).toUpperCase() + selectedWorkItemType.slice(1)} Template Configuration</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaultTemplate = templateService.getDefaultTemplate(selectedWorkItemType as WorkItemType)
                          setWorkItemInstructions(defaultTemplate.aiPrompt)
                          setHasWorkItemChanges(true)
                        }}
                      >
                        Reset to Default
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Save work item template
                          const currentTemplate = templateService.getDefaultTemplate(selectedWorkItemType as WorkItemType)
                          const updatedTemplate = {
                            ...currentTemplate,
                            aiPrompt: workItemInstructions,
                            updatedAt: new Date()
                          }
                          templateService.saveTemplate(updatedTemplate)
                          setHasWorkItemChanges(false)
                          
                          // Show success feedback
                          if (window.dispatchEvent) {
                            window.dispatchEvent(new CustomEvent('show-toast', {
                              detail: {
                                type: 'success',
                                title: 'Template Saved',
                                message: `${selectedWorkItemType.charAt(0).toUpperCase() + selectedWorkItemType.slice(1)} template has been updated successfully.`
                              }
                            }))
                          }
                        }}
                        disabled={!hasWorkItemChanges}
                        className="jira-btn-primary"
                      >
                        Save Template
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure the AI prompt template and field mappings for {selectedWorkItemType} work items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* AI Prompt Template */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        AI Prompt Template
                      </label>
                      <textarea
                        value={workItemInstructions}
                        onChange={(e) => {
                          setWorkItemInstructions(e.target.value)
                          setHasWorkItemChanges(true)
                        }}
                        className="jira-textarea w-full h-48 font-mono text-sm"
                        placeholder={`Enter AI prompt template for ${selectedWorkItemType}...`}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Use {'{description}'} as a placeholder for the user's input description. This template controls how AI generates content for {selectedWorkItemType} work items.
                      </p>
                    </div>

                    {/* Template Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Current Template Fields</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {templateService.getDefaultTemplate(selectedWorkItemType as WorkItemType).fields.map((field) => (
                          <div key={field.id} className="flex items-center text-gray-600">
                            <Icons.CheckCircle size="xs" className="mr-1 text-green-600" />
                            {field.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Icons.Info size="sm" className="text-blue-600 mr-2 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Template Usage</h4>
                          <p className="text-sm text-blue-800 mt-1">
                            This template is used when generating {selectedWorkItemType} content in the Create & Push section. 
                            The AI will use these instructions along with the user's description to create structured work item content.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Content Generation Section */}
          {activeSection === 'content-generation' && (
            <div className="space-y-6">
              {/* Content Type Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Type</CardTitle>
                  <CardDescription>
                    Select the content type to configure AI generation instructions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'quarterly-presentation', title: 'Quarterly Presentation', description: 'Executive presentations for quarterly reviews' },
                      { type: 'customer-webinar', title: 'Customer Webinar', description: 'Customer-facing webinar content' },
                      { type: 'feature-newsletter', title: 'Feature Newsletter', description: 'Internal feature announcements' },
                      { type: 'technical-documentation', title: 'Technical Documentation', description: 'Technical documentation and specifications' },
                      { type: 'stakeholder-update', title: 'Stakeholder Update', description: 'Progress update for stakeholders' },
                      { type: 'engineering-highlights', title: 'Engineering Highlights', description: 'Key engineering achievements and updates' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => setSelectedContentType(item.type as ContentTemplateType)}
                        className={`p-4 text-left border rounded-lg transition-colors ${
                          selectedContentType === item.type
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Instructions</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetContentInstructions}
                        disabled={!hasInstructionChanges}
                      >
                        Reset to Default
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveContentInstructions}
                        disabled={!hasInstructionChanges}
                        className="jira-btn-primary"
                      >
                        Save Instructions
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Customize the AI instructions for generating {selectedContentType.replace('-', ' ')} content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={instructions}
                    onChange={(e) => {
                      setInstructions(e.target.value)
                      setHasInstructionChanges(true)
                    }}
                    className="jira-textarea w-full h-64 font-mono text-sm"
                    placeholder="Enter AI instructions..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use {'{description}'} as a placeholder for the user's input description
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Field Extraction Section */}
          {activeSection === 'field-extraction' && (
            <div className="space-y-6">
              {/* Work Item Type Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Item Type</CardTitle>
                  <CardDescription>
                    Select the work item type to configure field extraction settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'epic', title: 'Epic', description: 'Configure field extraction for Epics' },
                      { type: 'story', title: 'Story', description: 'Configure field extraction for Stories' },
                      { type: 'initiative', title: 'Initiative', description: 'Configure field extraction for Initiatives' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => setSelectedWorkItemType(item.type as WorkItemConfigType)}
                        className={`p-4 text-left border rounded-lg transition-colors ${
                          selectedWorkItemType === item.type
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Field Extraction Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Field Extraction Configuration</span>
                    <div className="flex gap-2">
                      {jiraFields.length === 0 && (
                        <Button
                          size="sm"
                          onClick={handleDiscoverFields}
                          className="jira-btn-primary"
                          disabled={loadingJiraFields || isDiscoveringFields}
                        >
                          {isDiscoveringFields ? (
                            <>
                              <Icons.Loader size="sm" className="animate-spin mr-2" />
                              Discovering...
                            </>
                          ) : (
                            <>
                              <Icons.Search size="sm" autoContrast className="mr-2" />
                              Discover Fields
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleOpenFieldExtractionEditor}
                        className="jira-btn-primary"
                        disabled={loadingJiraFields || jiraFields.length === 0}
                      >
                        {loadingJiraFields ? (
                          <>
                            <Icons.Loader size="sm" className="animate-spin mr-2" />
                            Loading Fields...
                          </>
                        ) : (
                          <>
                            <Icons.Settings size="sm" autoContrast className="mr-2" />
                            Configure Extraction
                          </>
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure how fields are extracted when pushing {selectedWorkItemType} content to Jira
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Icons.Info size="sm" className="text-blue-600 mr-2 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Smart Field Extraction</h4>
                          <p className="text-sm text-blue-800 mt-1">
                            Configure extraction methods (AI, Pattern Matching, Manual) for each Jira field. 
                            Set confidence thresholds and choose which fields should auto-apply vs require confirmation.
                          </p>
                        </div>
                      </div>
                    </div>

                    {jiraFields.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Discovered Jira Fields ({jiraFields.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {jiraFields.slice(0, 12).map((field) => (
                            <div key={field.id} className="flex items-center text-gray-600">
                              <Icons.CheckCircle size="xs" className="mr-1 text-green-600" />
                              {field.name}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </div>
                          ))}
                          {jiraFields.length > 12 && (
                            <div className="text-gray-500">+{jiraFields.length - 12} more fields</div>
                          )}
                        </div>
                      </div>
                    )}

                    {jiraFields.length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <Icons.AlertTriangle size="sm" className="text-yellow-600 mr-2" />
                          <p className="text-sm text-yellow-800">
                            No Jira fields discovered yet. Configure field extraction after connecting to Jira 
                            and selecting a project in the Create & Push section.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 