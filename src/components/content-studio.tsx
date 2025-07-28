'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { JiraInstance, JiraProject, JiraWorkItem, WorkItemType, ContentType } from '../types'
import { jiraContentService } from '../lib/jira-content-service'
import { ContentGenerator } from './content-generator'
import { contentInstructionService } from '../lib/content-instruction-service'
import { contentStudioPreferences } from '../lib/content-studio-preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { LoadingSpinner } from './ui/loading-spinner'
import { Icons } from './ui/icons'

interface ContentStudioProps {
  jiraConnection: JiraInstance | null
  devsAIConnection: unknown
}

export function ContentStudio({ jiraConnection, devsAIConnection }: ContentStudioProps) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [quarters, setQuarters] = useState<string[]>([])
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [workItemType, setWorkItemType] = useState<WorkItemType>('epic')
  const [workItems, setWorkItems] = useState<JiraWorkItem[]>([])
  const [selectedWorkItem, setSelectedWorkItem] = useState<JiraWorkItem | null>(null)
  const [detailedWorkItem, setDetailedWorkItem] = useState<JiraWorkItem | null>(null)
  const [loadingWorkItemDetails, setLoadingWorkItemDetails] = useState(false)
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingQuarters, setLoadingQuarters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<'main' | 'edit-instructions'>('main')
  const [editingContentType, setEditingContentType] = useState<ContentType | null>(null)
  const [instructionText, setInstructionText] = useState('')
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [preferencesRestored, setPreferencesRestored] = useState(false)
  
  // New consolidated loading states
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false)
  const [quarterInitialized, setQuarterInitialized] = useState(false)
  
  // Track if work items have been loaded for current state to prevent loops
  const lastLoadedStateRef = useRef<string>('')

  // Save preferences whenever dropdown values change
  const saveCurrentPreferences = useCallback(() => {
    if (preferencesLoaded && selectedProject && workItemType) {
      contentStudioPreferences.savePreferences({
        selectedProject,
        workItemType,
        selectedQuarter
      })
    }
  }, [selectedProject, workItemType, selectedQuarter, preferencesLoaded])

  // Save preferences when values change
  useEffect(() => {
    saveCurrentPreferences()
  }, [saveCurrentPreferences])

  const loadProjects = useCallback(async () => {
    if (!jiraConnection) return
    
    try {
      const projectList = await jiraContentService.getProjects(jiraConnection)
      setProjects(projectList)
    } catch (err) {
      setError('Failed to load projects. Please check your Jira connection.')
      console.error(err)
    }
  }, [jiraConnection])

  const loadQuarters = useCallback(async () => {
    if (!jiraConnection || !selectedProject) return
    
    setLoadingQuarters(true)
    
    try {
      const { quarters: quarterList, defaultQuarter } = await jiraContentService.getDeliveryQuarters(jiraConnection, selectedProject)
      setQuarters(quarterList)
      
      // Handle quarter selection based on preferences or default
      const savedPreferences = contentStudioPreferences.loadPreferences()
      if (savedPreferences && savedPreferences.selectedQuarter && quarterList.includes(savedPreferences.selectedQuarter)) {
        // Use saved preference if it exists and is valid
        setSelectedQuarter(savedPreferences.selectedQuarter)
      } else if (defaultQuarter && quarterList.includes(defaultQuarter)) {
        // Use default quarter if no saved preference
        setSelectedQuarter(defaultQuarter)
      } else {
        // No valid quarter found - this is OK, work items can still load
        setSelectedQuarter('')
      }
      
    } catch (err) {
      console.error('Failed to load delivery quarters:', err)
      // Set default quarters as fallback
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      let currentQuarter = 1
      if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2
      else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3
      else if (currentMonth >= 10 && currentMonth <= 12) currentQuarter = 4

      const fallbackQuarters = [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${currentYear + 1}`
      ]
      
      setQuarters(fallbackQuarters)
      
      // Handle quarter selection for fallback
      const savedPreferences = contentStudioPreferences.loadPreferences()
      if (savedPreferences && savedPreferences.selectedQuarter && fallbackQuarters.includes(savedPreferences.selectedQuarter)) {
        setSelectedQuarter(savedPreferences.selectedQuarter)
      } else {
        setSelectedQuarter(`Q${currentQuarter} ${currentYear}`)
      }
      
    } finally {
      setLoadingQuarters(false)
      setQuarterInitialized(true)
    }
  }, [jiraConnection, selectedProject])

  const loadWorkItems = useCallback(async () => {
    if (!jiraConnection || !selectedProject) {
      console.log('Cannot load work items - missing requirements:', { 
        jiraConnection: !!jiraConnection, 
        selectedProject: !!selectedProject
      })
      return
    }
    
    console.log('Loading work items with parameters:', {
      project: selectedProject,
      workItemType,
      selectedQuarter,
      quarterToPass: selectedQuarter || undefined
    })
    
    setIsLoadingWorkItems(true)
    setError(null)
    
    try {
      const items = await jiraContentService.getWorkItems(
        jiraConnection,
        selectedProject,
        workItemType,
        selectedQuarter || undefined // Pass undefined if no quarter selected
      )
      setWorkItems(items)
      setSelectedWorkItem(null)
      
      // Show a helpful message if no work items were found
      if (items.length === 0) {
        console.log(`No ${workItemType} work items found for project ${selectedProject}${selectedQuarter ? ` in ${selectedQuarter}` : ''}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Failed to load work items: ${err.message}` 
        : 'Failed to load work items. Please check your Jira connection and project permissions.'
      setError(errorMessage)
      console.error('loadWorkItems error:', err)
    } finally {
      setIsLoadingWorkItems(false)
    }
  }, [jiraConnection, selectedProject, workItemType, selectedQuarter])

  // New initialization function that handles the complete sequence
  const initializeContentStudio = useCallback(async () => {
    if (!jiraConnection) {
      setIsInitializing(false)
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      // Step 1: Load projects
      await loadProjects()

      // Step 2: Load saved preferences
      const savedPreferences = contentStudioPreferences.loadPreferences()
      if (savedPreferences) {
        setSelectedProject(savedPreferences.selectedProject)
        setWorkItemType(savedPreferences.workItemType)
        setPreferencesRestored(true)
        
        // Step 3: Load quarters for the saved project
        // Note: We don't await this to avoid blocking initialization
        loadQuarters()
      } else {
        // No saved preferences - set quarterInitialized to true so work items can load
        // when user manually selects a project
        setQuarterInitialized(true)
      }
      setPreferencesLoaded(true)

    } catch (err) {
      setError('Failed to initialize Content Studio. Please check your Jira connection.')
      console.error(err)
    } finally {
      setIsInitializing(false)
    }
  }, [jiraConnection, loadProjects, loadQuarters])

  // Load projects when Jira connection is available
  useEffect(() => {
    initializeContentStudio()
  }, [jiraConnection, initializeContentStudio])

  // Load quarters when project is selected (but not during initialization)
  useEffect(() => {
    if (!isInitializing && jiraConnection && selectedProject && preferencesLoaded) {
      loadQuarters()
    } else if (!selectedProject) {
      setQuarters([])
      setSelectedQuarter('')
      setQuarterInitialized(true) // Always set to true, even when no project selected
    }
  }, [jiraConnection, selectedProject, loadQuarters, isInitializing, preferencesLoaded])

  // Auto-load work items when all conditions are met
  useEffect(() => {
    if (
      !isInitializing && 
      !isLoadingWorkItems && 
      jiraConnection && 
      selectedProject && 
      workItemType &&
      preferencesLoaded // Ensure preferences have been loaded/initialized
    ) {
      // Create a state key to track if we've already loaded for this combination
      const stateKey = `${selectedProject}-${workItemType}-${selectedQuarter || 'all'}`
      
      // Only load if we haven't loaded for this exact state combination
      if (lastLoadedStateRef.current !== stateKey) {
        lastLoadedStateRef.current = stateKey
        
        // Small delay to ensure UI is stable
        const timer = setTimeout(() => {
          loadWorkItems()
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [
    isInitializing, 
    isLoadingWorkItems, 
    jiraConnection, 
    selectedProject, 
    workItemType, 
    selectedQuarter,
    preferencesLoaded,
    loadWorkItems
  ])

  const handleProjectSelect = (projectKey: string) => {
    setSelectedProject(projectKey)
    // Reset dependent selections
    setWorkItemType('epic')
    setSelectedQuarter('')
    setWorkItems([])
    setSelectedWorkItem(null)
    setSelectedContentType(null)
    // Reset loaded state to allow fresh loading
    lastLoadedStateRef.current = ''
    // Note: quarterInitialized will be set to true by loadQuarters() when it completes
  }

  const handleWorkTypeSelect = (type: WorkItemType) => {
    setWorkItemType(type)
    // Reset dependent selections but preserve quarter if it was saved in preferences
    const savedPreferences = contentStudioPreferences.loadPreferences()
    if (!savedPreferences || !savedPreferences.selectedQuarter) {
      setSelectedQuarter('')
    }
    setWorkItems([])
    setSelectedWorkItem(null)
    setSelectedContentType(null)
    // Reset loaded state to allow fresh loading
    lastLoadedStateRef.current = ''
  }

  const handleWorkItemSelect = async (workItem: JiraWorkItem) => {
    if (!jiraConnection) return
    
    setSelectedWorkItem(workItem)
    setLoadingWorkItemDetails(true)
    setDetailedWorkItem(null)
    setError(null)
    
    try {
      const detailedItem = await jiraContentService.getWorkItem(jiraConnection, workItem.key)
      setDetailedWorkItem(detailedItem)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Failed to load work item details:', err)
      
      // Show user-friendly error message
      setError(`Failed to load details for ${workItem.key}: ${errorMessage}`)
      
      // For certain errors, we can still show the basic work item info
      if (errorMessage.includes('not found') || errorMessage.includes('Access denied') || errorMessage.includes('Authentication failed')) {
        // Use the basic work item data as fallback
        setDetailedWorkItem({
          ...workItem,
          description: workItem.description || 'Description not available - insufficient permissions or work item not found.',
          assignee: null,
          reporter: null,
          created: null,
          updated: null
        })
      }
    } finally {
      setLoadingWorkItemDetails(false)
    }
  }

  const handleContentTypeSelect = (contentType: ContentType) => {
    setSelectedContentType(contentType)
  }

  const handleBackToSelection = () => {
    setSelectedContentType(null)
  }

  const handleBackToWorkItems = () => {
    setSelectedWorkItem(null)
    setDetailedWorkItem(null)
    setSelectedContentType(null)
  }

  const handleOpenInstructionSection = (contentType: ContentType) => {
    setEditingContentType(contentType)
    setCurrentView('edit-instructions')
    // Load current instruction for this content type
    const currentInstruction = contentInstructionService.getActiveInstructions(contentType)
    setInstructionText(currentInstruction)
  }

  const handleBackToMain = () => {
    setCurrentView('main')
    setEditingContentType(null)
    setInstructionText('')
  }

  const handleSaveInstruction = () => {
    if (editingContentType) {
      const template = contentInstructionService.getTemplate(editingContentType)
      const updatedTemplate = {
        ...template,
        userInstructions: instructionText,
        isCustomized: true
      }
      contentInstructionService.saveTemplate(updatedTemplate)
      handleBackToMain()
    }
  }

  const handleClearPreferences = () => {
    contentStudioPreferences.clearPreferences()
    setSelectedProject('')
    setWorkItemType('epic')
    setSelectedQuarter('')
    setWorkItems([])
    setSelectedWorkItem(null)
    setSelectedContentType(null)
    setPreferencesRestored(false)
  }

  const getContentTypeDisplayName = (contentType: ContentType): string => {
    switch (contentType) {
      case 'quarterly-presentation':
        return 'Quarterly Presentation'
      case 'customer-webinar':
        return 'Customer Webinar'
      case 'feature-newsletter':
        return 'Feature Newsletter'
      case 'technical-documentation':
        return 'Technical Documentation'
      case 'stakeholder-update':
        return 'Stakeholder Update'
      case 'engineering-highlights':
        return 'Engineering Highlights'
      default:
        return contentType
    }
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text || typeof text !== 'string') return 'No description available'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Function to format Jira description with proper HTML formatting
  const formatJiraDescription = (description: any): React.ReactElement => {
    if (!description) {
      return <p className="text-gray-500 italic">No description available</p>
    }

    // If it's a string, format it with basic line breaks
    if (typeof description === 'string') {
      return (
        <div className="prose prose-sm max-w-none">
          {description.split('\n').map((line, index) => (
            <p key={index} className="mb-2 last:mb-0">
              {line || '\u00A0'} {/* Non-breaking space for empty lines */}
            </p>
          ))}
        </div>
      )
    }

    // If it's ADF (Atlassian Document Format), parse it
    if (description.content && Array.isArray(description.content)) {
      return (
        <div className="prose prose-sm max-w-none">
          {description.content.map((node: any, index: number) => 
            renderADFNode(node, index.toString())
          )}
        </div>
      )
    }

    return <p className="text-gray-500 italic">Description format not supported</p>
  }

  // Function to render individual ADF nodes
  const renderADFNode = (node: any, key: string): React.ReactElement => {
    switch (node.type) {
      case 'paragraph':
        return (
          <p key={key} className="mb-3 last:mb-0">
            {node.content ? node.content.map((child: any, childIndex: number) => 
              renderADFNode(child, `${key}-${childIndex}`)
            ) : '\u00A0'}
          </p>
        )
      
      case 'heading':
        const level = Math.min(node.attrs?.level || 1, 6)
        const headingProps = {
          key,
          className: "font-bold text-gray-900 mt-4 mb-2 first:mt-0",
          children: node.content ? node.content.map((child: any, childIndex: number) => 
            renderADFNode(child, `${key}-${childIndex}`)
          ) : ''
        }
        
        switch (level) {
          case 1: return <h1 {...headingProps} />
          case 2: return <h2 {...headingProps} />
          case 3: return <h3 {...headingProps} />
          case 4: return <h4 {...headingProps} />
          case 5: return <h5 {...headingProps} />
          case 6: return <h6 {...headingProps} />
          default: return <h1 {...headingProps} />
        }
      
      case 'bulletList':
        return (
          <ul key={key} className="list-disc list-inside mb-3 space-y-1">
            {node.content ? node.content.map((child: any, childIndex: number) => 
              renderADFNode(child, `${key}-${childIndex}`)
            ) : null}
          </ul>
        )
      
      case 'orderedList':
        return (
          <ol key={key} className="list-decimal list-inside mb-3 space-y-1">
            {node.content ? node.content.map((child: any, childIndex: number) => 
              renderADFNode(child, `${key}-${childIndex}`)
            ) : null}
          </ol>
        )
      
      case 'listItem':
        return (
          <li key={key}>
            {node.content ? node.content.map((child: any, childIndex: number) => 
              renderADFNode(child, `${key}-${childIndex}`)
            ) : ''}
          </li>
        )
      
      case 'text':
        let textElement: React.ReactNode = node.text || ''
        
        // Apply text formatting
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'strong':
                textElement = <strong>{textElement}</strong>
                break
              case 'em':
                textElement = <em>{textElement}</em>
                break
              case 'code':
                textElement = <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{textElement}</code>
                break
              case 'link':
                textElement = (
                  <a href={mark.attrs?.href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    {textElement}
                  </a>
                )
                break
            }
          })
        }
        
        return <span key={key}>{textElement}</span>
      
      case 'codeBlock':
        return (
          <pre key={key} className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">
            <code>
              {node.content ? node.content.map((child: any) => child.text).join('') : ''}
            </code>
          </pre>
        )
      
      case 'hardBreak':
        return <br key={key} />
      
      default:
        // For unknown node types, try to render content if available
        if (node.content) {
          return (
            <div key={key}>
              {node.content.map((child: any, childIndex: number) => 
                renderADFNode(child, `${key}-${childIndex}`)
              )}
            </div>
          )
        }
        return <span key={key}>{node.text || ''}</span>
    }
  }

  const handleQuarterSelect = (quarter: string) => {
    setSelectedQuarter(quarter)
    // Reset loaded state to allow fresh loading
    lastLoadedStateRef.current = ''
  }

  const handleManualLoadWorkItems = () => {
    // Reset loaded state to allow manual reload
    lastLoadedStateRef.current = ''
    loadWorkItems()
  }

  if (!jiraConnection) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Icons.Link size="xl" variant="accent" />
          </div>
          <CardTitle>Jira Connection Required</CardTitle>
          <CardDescription>
            Connect to your Jira instance to access the Content Studio features.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-jira'))}
            size="lg"
          >
            <Icons.Link size="sm" autoContrast className="mr-2" />
            Setup Jira Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Instruction editing view
  if (currentView === 'edit-instructions' && editingContentType) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToMain}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Content Studio
          </button>
        </div>

        {/* Instruction editing section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Configure Instructions
            </h2>
            <p className="text-gray-600">
              Customize the AI instructions for generating {getContentTypeDisplayName(editingContentType).toLowerCase()} content
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              AI Instructions for {getContentTypeDisplayName(editingContentType)}
            </label>
            <textarea
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
              placeholder="Enter detailed instructions for AI content generation..."
            />
            <div className="mt-3 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for Writing Instructions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be specific about the desired format and structure</li>
                <li>• Include examples of the tone and style you want</li>
                <li>• Specify what information should be included or excluded</li>
                <li>• Use placeholders like {'{workItem.summary}'} to reference work item data</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const defaultTemplate = contentInstructionService.resetToDefault(editingContentType)
                setInstructionText(defaultTemplate.defaultInstructions)
              }}
              className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              Reset to Default
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={handleBackToMain}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInstruction}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Instructions
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedContentType && selectedWorkItem && (detailedWorkItem || selectedWorkItem)) {
    return (
      <ContentGenerator
        jiraConnection={jiraConnection}
        devsAIConnection={devsAIConnection}
        workItem={detailedWorkItem || selectedWorkItem}
        contentType={selectedContentType}
        deliveryQuarter={selectedQuarter}
        onBack={handleBackToSelection}
      />
    )
  }

  if (selectedWorkItem) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToWorkItems}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Work Items
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Work item details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              {/* Loading overlay for work item details */}
              {loadingWorkItemDetails && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex flex-col items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                  <p className="text-sm text-blue-600 font-medium">Loading work item details...</p>
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Work Item Details</h2>
              
              {/* Work item header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedWorkItem.key}</h3>
                    <p className="text-gray-700 mt-1">{selectedWorkItem.summary}</p>
                  </div>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                    selectedWorkItem.status === 'Done' || selectedWorkItem.status === 'Closed' ? 'bg-green-100 text-green-700' :
                    selectedWorkItem.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedWorkItem.status}
                  </span>
                </div>
              </div>

              {/* Work item metadata */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <p className="text-gray-900">{selectedWorkItem.issueType}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Project:</span>
                  <p className="text-gray-900">{selectedWorkItem.project}</p>
                </div>
                {selectedWorkItem.fixVersions && selectedWorkItem.fixVersions.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Fix Versions:</span>
                    <p className="text-gray-900">{selectedWorkItem.fixVersions.join(', ')}</p>
                  </div>
                )}
                {selectedWorkItem.labels && selectedWorkItem.labels.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Labels:</span>
                    <p className="text-gray-900">{selectedWorkItem.labels.join(', ')}</p>
                  </div>
                )}
                {detailedWorkItem?.assignee && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Assignee:</span>
                    <p className="text-gray-900">{detailedWorkItem.assignee}</p>
                  </div>
                )}
                {detailedWorkItem?.reporter && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Reporter:</span>
                    <p className="text-gray-900">{detailedWorkItem.reporter}</p>
                  </div>
                )}
              </div>

              {/* Full description */}
              <div>
                <span className="text-sm font-medium text-gray-500">Description:</span>
                {detailedWorkItem ? (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    {formatJiraDescription(detailedWorkItem.description)}
                  </div>
                ) : !loadingWorkItemDetails ? (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 italic">Click on a work item to load full description</p>
                  </div>
                ) : (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning message when using fallback data */}
              {!detailedWorkItem && !loadingWorkItemDetails && error && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Limited Information Available</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {error}
                      </p>
                      <p className="text-sm text-yellow-700 mt-2">
                        You can still generate content using the basic work item information, but the results may be less detailed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column - Content type selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Choose Content Type</h3>
              {detailedWorkItem ? (
                <div className="space-y-4">
                  <ContentTypeCard
                    type="quarterly-presentation"
                    title="Quarterly Presentation"
                    description="Executive slide deck for quarterly business reviews"
                    phase="Planning Phase"
                    icon="📊"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                  <ContentTypeCard
                    type="customer-webinar"
                    title="Customer Webinar"
                    description="Customer-facing presentation content"
                    phase="Planning Phase"
                    icon="🎯"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                  <ContentTypeCard
                    type="feature-newsletter"
                    title="Feature Newsletter"
                    description="Newsletter content for feature announcement"
                    phase="Post-Completion"
                    icon="📰"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                  <ContentTypeCard
                    type="technical-documentation"
                    title="Technical Documentation"
                    description="Technical documentation and specifications"
                    phase="Documentation Phase"
                    icon="📋"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                  <ContentTypeCard
                    type="stakeholder-update"
                    title="Stakeholder Update"
                    description="Progress update for stakeholders"
                    phase="Update Phase"
                    icon="📈"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                  <ContentTypeCard
                    type="engineering-highlights"
                    title="Engineering Highlights"
                    description="Key engineering achievements and updates"
                    phase="Engineering Phase"
                    icon="🔧"
                    workItem={detailedWorkItem}
                    onGenerate={(contentType) => handleContentTypeSelect(contentType)}
                    onConfigure={(contentType) => handleOpenInstructionSection(contentType)}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {loadingWorkItemDetails 
                      ? 'Loading work item details...' 
                      : 'Work item details will appear here'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection Form */}
      <Card className="relative">
        {/* Section-wide loader overlay */}
        {(isInitializing || isLoadingWorkItems) && (
          <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex flex-col items-center justify-center z-10">
            <LoadingSpinner size="lg" className="mb-4" />
            <div className="text-center">
              <p className="text-lg font-medium text-navy-950">
                {isInitializing ? 'Initializing Content Studio...' : 'Loading Work Items...'}
              </p>
              <p className="text-sm text-cloud-600 mt-1">
                {isInitializing 
                  ? 'Setting up projects and preferences' 
                  : 'Searching for work items in your project'
                }
              </p>
            </div>
          </div>
        )}

        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Search size="md" autoContrast className="mr-2" />
            Find Work Items
          </CardTitle>
          <CardDescription>
            Select your project, work type, and delivery quarter to find work items
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
                disabled={isInitializing || isLoadingWorkItems}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.key} value={project.key}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            </div>

            {/* Work Type Selection */}
            <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
                Work Type
              </label>
              <select
                value={workItemType}
                onChange={(e) => handleWorkTypeSelect(e.target.value as WorkItemType)}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
                disabled={isInitializing || isLoadingWorkItems || !selectedProject}
              >
                <option value="epic">Epic</option>
                <option value="story">Story</option>
                <option value="initiative">Initiative</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
              </select>
            </div>

            {/* Quarter Selection */}
            <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
                Delivery Quarter (Fix Version)
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => handleQuarterSelect(e.target.value)}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
                disabled={isInitializing || isLoadingWorkItems || !selectedProject}
              >
                <option value="">All Quarters (Optional)</option>
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
              {loadingQuarters && selectedProject && (
                <p className="text-xs text-blue-500 mt-1">Loading quarters...</p>
              )}
              {quarters.length === 0 && !loadingQuarters && selectedProject && !isInitializing && (
                <p className="text-xs text-cloud-500 mt-1">No fix versions found for this project</p>
              )}
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <div className="w-full space-y-2">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleManualLoadWorkItems}
                    disabled={isInitializing || isLoadingWorkItems || !selectedProject || !workItemType}
                    className="flex-1"
                  >
                    <Icons.Search size="sm" autoContrast className="mr-2" />
                    Find Work Items
                  </Button>
                  {contentStudioPreferences.hasPreferences() && !isInitializing && (
                    <Button
                      variant="outline"
                      onClick={handleClearPreferences}
                      disabled={isInitializing || isLoadingWorkItems}
                      title="Clear saved preferences"
                    >
                      <Icons.Trash2 size="sm" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <Icons.AlertCircle size="sm" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Work Items List */}
      {workItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.List size="md" autoContrast className="mr-2" />
              Work Items ({workItems.length} found)
            </CardTitle>
            <CardDescription>
              Click on a work item to generate content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {workItems.map((workItem) => (
                <div
                  key={workItem.id}
                  onClick={() => handleWorkItemSelect(workItem)}
                  className="border border-cloud-300 rounded-lg p-4 hover:border-royal-500 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-blue-600">{workItem.key}</span>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                          workItem.status === 'Done' || workItem.status === 'Closed' ? 'bg-green-100 text-green-700' :
                          workItem.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {workItem.status}
                        </span>
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          {workItem.issueType}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">{workItem.summary}</h4>
                      <p className="text-sm text-gray-500 italic">Click to view details and description</p>
                      {(workItem.labels && workItem.labels.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workItem.labels.slice(0, 3).map((label, index) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                              {label}
                            </span>
                          ))}
                          {workItem.labels.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded">
                              +{workItem.labels.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Work Items Found */}
      {!isInitializing && !isLoadingWorkItems && selectedProject && workItemType && workItems.length === 0 && quarterInitialized && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Work Items Found</h3>
          <p className="text-gray-600 mb-4">
            No {workItemType}s found for the selected criteria. Try:
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Selecting a different work type</li>
            <li>• Removing the quarter filter</li>
            <li>• Checking if the project has any {workItemType}s</li>
          </ul>
        </div>
      )}
    </div>
  )
}

interface ContentTypeCardProps {
  type: ContentType
  title: string
  description: string
  phase: string
  icon: string
  workItem: JiraWorkItem | null
  onGenerate: (contentType: ContentType) => void
  onConfigure: (contentType: ContentType) => void
}

function ContentTypeCard({ type, title, description, phase, icon, workItem: _, onGenerate, onConfigure }: ContentTypeCardProps) {
  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onGenerate(type)
  }

  const handleConfigureClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConfigure(type)
  }

  return (
    <div className="border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-xl mr-3">{icon}</span>
            <h4 className="font-semibold text-gray-900 text-sm">
              {title}
            </h4>
          </div>
          <div className="relative group">
            <button
              onClick={handleConfigureClick}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Configure instructions for this content type"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Configure instructions
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-xs mb-3">{description}</p>
        <div className="flex items-center justify-between">
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            phase === 'Post-Completion' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {phase}
          </span>
          <button
            onClick={handleGenerateClick}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
} 