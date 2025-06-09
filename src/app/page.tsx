'use client'

import React, { useState } from 'react'
import { JiraInstance } from '../types'
import { JiraConnection } from '../components/jira-connection'
import { DevsAIConnection, type DevsAIConnection as DevsAIConnectionType } from '../components/devs-ai-connection'
import { EnhancedWorkItemCreator } from '../components/enhanced-work-item-creator'
import { TemplateConfiguration } from '../components/template-configuration'
import { ContentStudio } from '../components/content-studio'
import { WorkItemsPage } from '../components/work-items-page'
import { PMResources } from '../components/pm-resources'

import { AppLayout } from '../components/app-layout'



export default function Home() {
  const [currentView, setCurrentView] = useState<'create' | 'jira' | 'devs-ai' | 'config' | 'content-studio' | 'work-items' | 'pm-resources'>('create')
  const [jiraConnection, setJiraConnection] = useState<JiraInstance | null>(null)
  const [devsAIConnection, setDevsAIConnection] = useState<DevsAIConnectionType | null>(null)

  // Load connections from localStorage on mount
  React.useEffect(() => {
    // Load Jira connection
    const savedJiraConnection = localStorage.getItem('jira-connection')
    if (savedJiraConnection) {
      try {
        const parsed = JSON.parse(savedJiraConnection)
        setJiraConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved Jira connection:', error)
        localStorage.removeItem('jira-connection')
      }
    }

    // Load Devs.ai connection
    const savedDevsAIConnection = localStorage.getItem('devs-ai-connection')
    if (savedDevsAIConnection) {
      try {
        const parsed = JSON.parse(savedDevsAIConnection)
        setDevsAIConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved Devs.ai connection:', error)
        localStorage.removeItem('devs-ai-connection')
      }
    }
  }, [])

  // Listen for navigation events from components
  React.useEffect(() => {
    const handleNavigateToJira = () => {
      setCurrentView('jira')
    }

    const handleNavigateToConfig = () => {
      setCurrentView('config')
    }

    const handleNavigateToCreate = () => {
      setCurrentView('create')
    }

    window.addEventListener('navigate-to-jira', handleNavigateToJira)
    window.addEventListener('navigate-to-config', handleNavigateToConfig)
    window.addEventListener('navigate-to-create', handleNavigateToCreate)
    
    return () => {
      window.removeEventListener('navigate-to-jira', handleNavigateToJira)
      window.removeEventListener('navigate-to-config', handleNavigateToConfig)
      window.removeEventListener('navigate-to-create', handleNavigateToCreate)
    }
  }, [])

  const handleJiraConnectionSaved = (connection: JiraInstance) => {
    setJiraConnection(connection)
    setCurrentView('create')
  }

  const handleJiraConnectionRemoved = () => {
    setJiraConnection(null)
  }

  const handleDevsAIConnectionSaved = (connection: DevsAIConnectionType) => {
    setDevsAIConnection(connection)
    setCurrentView('create')
  }

  const handleDevsAIConnectionRemoved = () => {
    setDevsAIConnection(null)
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view as 'create' | 'jira' | 'devs-ai' | 'config' | 'content-studio' | 'work-items' | 'pm-resources')
  }

  // Get current view title and description
  const getViewInfo = () => {
    switch (currentView) {
      case 'create':
        return {
          title: 'Create & Push',
          description: 'Create and push work items to Jira with AI-generated content'
        }
      case 'content-studio':
        return {
          title: 'Content Studio',
          description: 'Generate content for existing work items'
        }
      case 'jira':
        return {
          title: 'Jira Connection',
          description: 'Configure your Jira instance connection'
        }
      case 'devs-ai':
        return {
          title: 'Devs.ai Connection',
          description: 'Configure AI content generation settings'
        }
      case 'config':
        return {
          title: 'Configure Templates',
          description: 'Manage work item templates and AI prompts'
        }
      case 'work-items':
        return {
          title: 'Work Items',
          description: 'Manage and view work items'
        }
      case 'pm-resources':
        return {
          title: 'Resources Hub',
          description: 'Curated tools, newsletters, blogs, and AI resources for product managers'
        }
      default:
        return {
          title: 'AutoAgile',
          description: 'Generate and push professional Jira and presentation materials using AI'
        }
    }
  }

  const viewInfo = getViewInfo()

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={handleViewChange}
      jiraConnection={jiraConnection}
      devsAIConnection={devsAIConnection}
    >
      {/* Header */}
      <header className="bg-white border-b border-cloud-200 shadow-sm">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-950 mb-1">
              {viewInfo.title}
            </h1>
            <p className="text-sm text-cloud-600">
              {viewInfo.description}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {currentView === 'create' && (
            <EnhancedWorkItemCreator
              jiraConnection={jiraConnection}
              devsAIConnection={devsAIConnection}
            />
          )}

          {currentView === 'content-studio' && (
            <ContentStudio
              jiraConnection={jiraConnection}
              devsAIConnection={devsAIConnection}
            />
          )}

          {currentView === 'jira' && (
            <JiraConnection 
              onConnectionSaved={handleJiraConnectionSaved}
              onConnectionRemoved={handleJiraConnectionRemoved}
            />
          )}

          {currentView === 'devs-ai' && (
            <DevsAIConnection 
              onConnectionSaved={handleDevsAIConnectionSaved}
              onConnectionRemoved={handleDevsAIConnectionRemoved}
            />
          )}

          {currentView === 'config' && (
            <TemplateConfiguration
              onClose={() => setCurrentView('create')}
            />
          )}

          {currentView === 'work-items' && (
            <WorkItemsPage
              jiraConnection={jiraConnection}
            />
          )}

          {currentView === 'pm-resources' && (
            <PMResources />
          )}
        </div>
      </div>
    </AppLayout>
  )
} 