'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, FieldExtractionConfig, ExtractionPreferences, EnhancedWorkItemTemplate } from '../types'
import { JiraField } from '../lib/jira-field-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Icons } from './ui/icons'

interface FieldExtractionConfigEditorProps {
  workItemType: WorkItemType
  template: EnhancedWorkItemTemplate
  jiraFields: JiraField[]
  onSave: (config: FieldExtractionConfig[], preferences: ExtractionPreferences) => void
  onCancel: () => void
}

interface DiscoveredField extends JiraField {
  usage_stats: {
    usage_percentage: number
    is_popular: boolean
  }
  is_configured: boolean
}

interface CategorizedFields {
  commonly_used: DiscoveredField[]
  project_specific: DiscoveredField[]
  optional_standard: DiscoveredField[]
  system_fields: DiscoveredField[]
}

export function FieldExtractionConfigEditor({
  workItemType,
  template,
  jiraFields,
  onSave,
  onCancel
}: FieldExtractionConfigEditorProps) {
  const [fieldConfigs, setFieldConfigs] = useState<FieldExtractionConfig[]>([])
  const [preferences, setPreferences] = useState<ExtractionPreferences>({
    defaultMethod: 'ai',
    globalConfidenceThreshold: 0.7,
    requireConfirmationForAll: false,
    enableSmartDefaults: true
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Field discovery state
  const [showFieldDiscovery, setShowFieldDiscovery] = useState(false)
  const [discoveredFields, setDiscoveredFields] = useState<CategorizedFields | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    initializeConfigs()
  }, [template, jiraFields])

  const initializeConfigs = () => {
    // Load existing config or create defaults
    const existingConfigs = template.fieldExtractionConfig || []
    const existingPrefs = template.extractionPreferences || preferences

    const configs: FieldExtractionConfig[] = []

    // Create configs for all required Jira fields
    jiraFields.forEach(jiraField => {
      if (jiraField.required) {
        const existingConfig = existingConfigs.find(c => c.jiraFieldId === jiraField.id)
        
        configs.push({
          fieldId: existingConfig?.fieldId || jiraField.id,
          jiraFieldId: jiraField.id,
          extractionEnabled: existingConfig?.extractionEnabled ?? true,
          extractionMethod: existingConfig?.extractionMethod || getDefaultExtractionMethod(jiraField),
          confirmationRequired: existingConfig?.confirmationRequired ?? false,
          confidenceThreshold: existingConfig?.confidenceThreshold || existingPrefs.globalConfidenceThreshold,
          autoApply: existingConfig?.autoApply ?? true,
          displayName: existingConfig?.displayName || jiraField.name
        })
      }
    })

    setFieldConfigs(configs)
    setPreferences(existingPrefs)
    setHasChanges(false)
  }

  const getDefaultExtractionMethod = (jiraField: JiraField): 'ai' | 'pattern' | 'manual' => {
    const fieldName = jiraField.name.toLowerCase()
    const fieldId = jiraField.id.toLowerCase()

    // Pattern matching works well for these fields
    if (fieldName.includes('priority') || 
        fieldName.includes('quarter') || 
        fieldId.includes('customfield_26362') ||
        fieldId.includes('customfield_26360')) {
      return 'pattern'
    }

    // AI works better for complex fields
    if (fieldName.includes('description') || 
        fieldName.includes('summary') ||
        fieldName.includes('title')) {
      return 'ai'
    }

    // Default to AI for most fields
    return 'ai'
  }

  const updateFieldConfig = (index: number, updates: Partial<FieldExtractionConfig>) => {
    const newConfigs = [...fieldConfigs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    setFieldConfigs(newConfigs)
    setHasChanges(true)
  }

  const updatePreferences = (updates: Partial<ExtractionPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const applyGlobalSettings = (setting: 'enable' | 'disable' | 'ai' | 'pattern' | 'manual') => {
    const newConfigs = fieldConfigs.map(config => {
      switch (setting) {
        case 'enable':
          return { ...config, extractionEnabled: true }
        case 'disable':
          return { ...config, extractionEnabled: false }
        case 'ai':
        case 'pattern':
        case 'manual':
          return { ...config, extractionMethod: setting }
        default:
          return config
      }
    })
    setFieldConfigs(newConfigs)
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(fieldConfigs, preferences)
  }

  // Field discovery methods
  const handleDiscoverAllFields = async () => {
    setIsScanning(true)
    setDiscoveryError(null)
    
    try {
      // Get Jira connection from localStorage
      const jiraConnection = JSON.parse(localStorage.getItem('jira-connection') || '{}')
      
      if (!jiraConnection.url) {
        throw new Error('No Jira connection found')
      }

      const response = await fetch('/api/jira/discover-all-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraInstance: jiraConnection,
          workItemType,
          searchTerm: searchTerm || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to discover fields')
      }

      const data = await response.json()
      setDiscoveredFields(data.fields)
      setShowFieldDiscovery(true)
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : 'Failed to discover fields')
    } finally {
      setIsScanning(false)
    }
  }

  const handleSearchFields = async () => {
    if (!searchTerm.trim()) {
      setDiscoveredFields(null)
      return
    }
    
    await handleDiscoverAllFields()
  }

  const handleAddSelectedFields = () => {
    if (!discoveredFields || selectedFields.size === 0) return

    const allDiscoveredFields = [
      ...discoveredFields.commonly_used,
      ...discoveredFields.project_specific,
      ...discoveredFields.optional_standard,
      ...discoveredFields.system_fields
    ]

    const fieldsToAdd = allDiscoveredFields.filter(field => selectedFields.has(field.id))
    
    const newConfigs: FieldExtractionConfig[] = fieldsToAdd.map(field => ({
      fieldId: field.id,
      jiraFieldId: field.id,
      extractionEnabled: true,
      extractionMethod: getDefaultExtractionMethod(field),
      confirmationRequired: !field.usage_stats.is_popular,
      confidenceThreshold: field.usage_stats.is_popular ? 0.8 : 0.7,
      autoApply: field.usage_stats.is_popular && field.usage_stats.usage_percentage > 80,
      displayName: field.name
    }))

    setFieldConfigs(prev => [...prev, ...newConfigs])
    setSelectedFields(new Set())
    setShowFieldDiscovery(false)
    setHasChanges(true)
  }

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }

  const selectAllInCategory = (fields: DiscoveredField[]) => {
    const unconfiguredFields = fields.filter(f => !f.is_configured)
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      unconfiguredFields.forEach(field => newSet.add(field.id))
      return newSet
    })
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'ai': return '🤖'
      case 'pattern': return '🔍'
      case 'manual': return '✋'
      default: return '❓'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'ai': return 'bg-blue-100 text-blue-700'
      case 'pattern': return 'bg-green-100 text-green-700'
      case 'manual': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Settings size="md" autoContrast className="mr-2" />
            Field Extraction Configuration - {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)}
          </CardTitle>
          <CardDescription>
            Configure how fields are extracted from your content when pushing to Jira. 
            Choose extraction methods, confidence thresholds, and confirmation requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Icons.Info size="sm" className="text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Extraction Methods</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div className="flex items-center">
                <span className="mr-2">🤖</span>
                <div>
                  <strong>AI:</strong> Uses AI to understand context and extract complex values
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-2">🔍</span>
                <div>
                  <strong>Pattern:</strong> Uses regex patterns for structured fields like priorities, quarters
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-2">✋</span>
                <div>
                  <strong>Manual:</strong> Always requires manual input from user
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Main Field Configuration - Left Column (60%) */}
        <div className="xl:col-span-3 space-y-6">
          {/* Field Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.FileText size="sm" autoContrast className="mr-2" />
                Field Configuration ({fieldConfigs.length} required fields)
              </CardTitle>
              <CardDescription>
                Configure extraction settings for each required Jira field
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldConfigs.map((config, index) => {
                  const jiraField = jiraFields.find(f => f.id === config.jiraFieldId)
                  return (
                    <div key={config.jiraFieldId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex items-center mr-4">
                            <input
                              type="checkbox"
                              checked={config.extractionEnabled}
                              onChange={(e) => updateFieldConfig(index, { extractionEnabled: e.target.checked })}
                              className="mr-2"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{config.displayName}</h4>
                              <p className="text-sm text-gray-500">
                                {jiraField?.id} • {jiraField?.type}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Required</Badge>
                        </div>
                        <Badge className={getMethodColor(config.extractionMethod)}>
                          {getMethodIcon(config.extractionMethod)} {config.extractionMethod.toUpperCase()}
                        </Badge>
                      </div>

                      {config.extractionEnabled && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Extraction Method
                            </label>
                            <select
                              value={config.extractionMethod}
                              onChange={(e) => updateFieldConfig(index, { extractionMethod: e.target.value as any })}
                              className="jira-select w-full text-sm"
                            >
                              <option value="ai">🤖 AI Extraction</option>
                              <option value="pattern">🔍 Pattern Matching</option>
                              <option value="manual">✋ Manual Only</option>
                            </select>
                          </div>

                          {config.extractionMethod !== 'manual' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confidence Threshold
                              </label>
                              <select
                                value={config.confidenceThreshold}
                                onChange={(e) => updateFieldConfig(index, { confidenceThreshold: parseFloat(e.target.value) })}
                                className="jira-select w-full text-sm"
                              >
                                <option value="0.5">50%</option>
                                <option value="0.7">70%</option>
                                <option value="0.8">80%</option>
                                <option value="0.9">90%</option>
                              </select>
                            </div>
                          )}

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={config.confirmationRequired}
                                onChange={(e) => updateFieldConfig(index, { confirmationRequired: e.target.checked })}
                                className="mr-2"
                              />
                              Require confirmation
                            </label>
                            {config.extractionMethod !== 'manual' && (
                              <label className="flex items-center text-sm mt-1">
                                <input
                                  type="checkbox"
                                  checked={config.autoApply}
                                  onChange={(e) => updateFieldConfig(index, { autoApply: e.target.checked })}
                                  className="mr-2"
                                />
                                Auto-apply when confident
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions - Moved to main column for easy access */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="jira-btn-primary"
            >
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Secondary Panel - Right Column (40%) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Global Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Icons.Settings size="sm" autoContrast className="mr-2" />
                Global Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Extraction Method
                  </label>
                  <select
                    value={preferences.defaultMethod}
                    onChange={(e) => updatePreferences({ defaultMethod: e.target.value as any })}
                    className="jira-select w-full"
                  >
                    <option value="ai">🤖 AI Extraction</option>
                    <option value="pattern">🔍 Pattern Matching</option>
                    <option value="manual">✋ Manual Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Global Confidence Threshold
                  </label>
                  <select
                    value={preferences.globalConfidenceThreshold}
                    onChange={(e) => updatePreferences({ globalConfidenceThreshold: parseFloat(e.target.value) })}
                    className="jira-select w-full"
                  >
                    <option value="0.5">50% - Relaxed</option>
                    <option value="0.7">70% - Balanced</option>
                    <option value="0.8">80% - Strict</option>
                    <option value="0.9">90% - Very Strict</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.requireConfirmationForAll}
                    onChange={(e) => updatePreferences({ requireConfirmationForAll: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Require confirmation for all extractions</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.enableSmartDefaults}
                    onChange={(e) => updatePreferences({ enableSmartDefaults: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable smart defaults</span>
                </label>
              </div>

              {/* Compact Bulk Actions */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyGlobalSettings('ai')}
                    className="text-xs"
                  >
                    🤖 All AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyGlobalSettings('pattern')}
                    className="text-xs"
                  >
                    🔍 All Pattern
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyGlobalSettings('enable')}
                    className="text-xs"
                  >
                    Enable All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyGlobalSettings('disable')}
                    className="text-xs"
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discover More Fields Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center">
                  <Icons.Search size="sm" autoContrast className="mr-2" />
                  Discover More Fields
                </div>
                <div className="text-xs text-gray-600">
                  {fieldConfigs.length} configured
                </div>
              </CardTitle>
              <CardDescription className="text-sm">
                Find and add additional Jira fields that can be extracted from your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discovery Actions */}
              <div className="space-y-2">
                <Button
                  onClick={handleDiscoverAllFields}
                  disabled={isScanning}
                  className="jira-btn-primary w-full text-sm"
                  size="sm"
                >
                  {isScanning ? (
                    <>
                      <Icons.Loader size="sm" className="animate-spin mr-2" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Icons.Search size="sm" className="mr-2" />
                      Scan All Available Fields
                    </>
                  )}
                </Button>

                {/* Search */}
                <div className="relative">
                  <Icons.Search size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for specific fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="jira-input w-full pl-10 text-sm"
                  />
                  {searchTerm && (
                    <Button
                      onClick={handleSearchFields}
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2"
                    >
                      Search
                    </Button>
                  )}
                </div>
              </div>

              {/* Discovery Error */}
              {discoveryError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <Icons.AlertCircle size="sm" className="text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{discoveryError}</p>
                  </div>
                </div>
              )}

              {/* Selected Fields Summary */}
              {selectedFields.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedFields.size} field(s) selected
                    </span>
                    <Button
                      onClick={handleAddSelectedFields}
                      size="sm"
                      className="jira-btn-primary text-xs"
                    >
                      Add Selected
                    </Button>
                  </div>
                </div>
              )}

              {/* Discovered Fields - Compact Display */}
              {discoveredFields && Object.keys(discoveredFields).some(key => discoveredFields[key as keyof CategorizedFields].length > 0) && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Commonly Used Fields */}
                  {discoveredFields.commonly_used.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <Icons.Star size="sm" className="text-yellow-500 mr-2" />
                            <span className="font-medium">Commonly Used ({discoveredFields.commonly_used.length})</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllInCategory(discoveredFields.commonly_used)}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {discoveredFields.commonly_used.slice(0, 3).map(field => (
                          <FieldDiscoveryCard
                            key={field.id}
                            field={field}
                            isSelected={selectedFields.has(field.id)}
                            onToggle={() => toggleFieldSelection(field.id)}
                          />
                        ))}
                        {discoveredFields.commonly_used.length > 3 && (
                          <p className="text-xs text-gray-500 text-center pt-2">
                            +{discoveredFields.commonly_used.length - 3} more fields
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Project Specific Fields */}
                  {discoveredFields.project_specific.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <Icons.Settings size="sm" className="text-blue-500 mr-2" />
                            <span className="font-medium">Project Specific ({discoveredFields.project_specific.length})</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllInCategory(discoveredFields.project_specific)}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {discoveredFields.project_specific.slice(0, 2).map(field => (
                          <FieldDiscoveryCard
                            key={field.id}
                            field={field}
                            isSelected={selectedFields.has(field.id)}
                            onToggle={() => toggleFieldSelection(field.id)}
                          />
                        ))}
                        {discoveredFields.project_specific.length > 2 && (
                          <p className="text-xs text-gray-500 text-center pt-2">
                            +{discoveredFields.project_specific.length - 2} more fields
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Field Discovery Card Component
interface FieldDiscoveryCardProps {
  field: DiscoveredField
  isSelected: boolean
  onToggle: () => void
}

function FieldDiscoveryCard({ field, isSelected, onToggle }: FieldDiscoveryCardProps) {
  const getFieldTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'select': return '📋'
      case 'multiselect': return '📋'
      case 'user': return '👤'
      case 'date': return '📅'
      case 'number': return '🔢'
      case 'textarea': return '📝'
      default: return '📄'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div 
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        field.is_configured 
          ? 'border-gray-300 bg-gray-50 opacity-60' 
          : isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={field.is_configured ? undefined : onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="mr-2">{getFieldTypeIcon(field.type)}</span>
            <h4 className="font-medium text-sm text-gray-900">{field.name}</h4>
            {field.required && <span className="text-red-500 text-xs ml-1">*</span>}
          </div>
          
          <div className="text-xs text-gray-600 mb-2">
            {field.id} • {field.type}
            {field.allowedValues && field.allowedValues.length > 0 && (
              <span> • {field.allowedValues.length} options</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`text-xs ${getUsageColor(field.usage_stats.usage_percentage)}`}>
              {field.usage_stats.usage_percentage}% usage
            </div>
            
            {field.usage_stats.is_popular && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Popular
              </Badge>
            )}
            
            {field.required && (
              <Badge variant="outline" className="text-xs px-1 py-0 border-red-300 text-red-700">
                Required
              </Badge>
            )}
          </div>
        </div>

        <div className="ml-2">
          {field.is_configured ? (
            <div className="flex items-center text-xs text-gray-500">
              <Icons.CheckCircle size="sm" className="text-green-600 mr-1" />
              Configured
            </div>
          ) : (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="w-4 h-4"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
    </div>
  )
} 