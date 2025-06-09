'use client'

import React, { useState, useEffect } from 'react'
import { JiraInstance } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { LoadingSpinner } from './ui/loading-spinner'
import { Icons } from './ui/icons'

interface JiraConnectionProps {
  onConnectionSaved: (connection: JiraInstance) => void
  onConnectionRemoved?: () => void
}

// Helper function to mask API tokens for display
const maskToken = (token: string): string => {
  if (!token || token.length < 8) return token
  const start = token.substring(0, 4)
  const end = token.substring(token.length - 4)
  const middle = '•'.repeat(Math.max(20, token.length - 8))
  return `${start}${middle}${end}`
}

export function JiraConnection({ onConnectionSaved, onConnectionRemoved }: JiraConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connection, setConnection] = useState<Partial<JiraInstance>>({
    url: '',
    email: '',
    apiToken: '',
    projectKey: ''
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isDiscoveringProjects, setIsDiscoveringProjects] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<any[]>([])
  const [showProjectList, setShowProjectList] = useState(false)

  useEffect(() => {
    // Load saved connection from localStorage
    const savedConnection = localStorage.getItem('jira-connection')
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection)
      setConnection(parsed)
      setIsConnected(true)
    }
  }, [])

  const handleInputChange = (field: keyof JiraInstance, value: string) => {
    setConnection(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const testConnection = async () => {
    if (!connection.url || !connection.email || !connection.apiToken) {
      setTestResult({ success: false, message: 'Please fill in all required fields' })
      return
    }

    setIsConnecting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/jira/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection),
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
        setIsConnected(true)
        
        // Save connection to localStorage
        localStorage.setItem('jira-connection', JSON.stringify(connection))
        
        onConnectionSaved(connection as JiraInstance)
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' })
        setIsConnected(false)
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' })
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const discoverProjects = async () => {
    if (!connection.url || !connection.email || !connection.apiToken) {
      setTestResult({ success: false, message: 'Please fill in URL, email, and API token first' })
      return
    }

    setIsDiscoveringProjects(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/jira/get-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraConnection: connection }),
      })

      const result = await response.json()

      if (response.ok) {
        setAvailableProjects(result.projects)
        setShowProjectList(true)
        setTestResult({ success: true, message: `Found ${result.count} projects` })
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to discover projects' })
        setAvailableProjects([])
        setShowProjectList(false)
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' })
      setAvailableProjects([])
      setShowProjectList(false)
    } finally {
      setIsDiscoveringProjects(false)
    }
  }

  const selectProject = (projectKey: string) => {
    setConnection(prev => ({ ...prev, projectKey }))
    setShowProjectList(false)
    setTestResult({ success: true, message: `Selected project: ${projectKey}` })
  }

  const disconnect = () => {
    setConnection({
      url: '',
      email: '',
      apiToken: '',
      projectKey: ''
    })
    setIsConnected(false)
    setTestResult(null)
    setAvailableProjects([])
    setShowProjectList(false)
    localStorage.removeItem('jira-connection')
    onConnectionRemoved?.()
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Icons.Link size="md" autoContrast className="mr-2" />
              Jira Connection
            </CardTitle>
            <CardDescription>
              Configure your Jira instance connection to create and manage work items
            </CardDescription>
          </div>
        {isConnected && (
          <div className="flex items-center space-x-2">
              <Badge variant="success">Connected</Badge>
          </div>
        )}
      </div>
      </CardHeader>

      <CardContent className="space-y-6">
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-navy-950 mb-2">
            Jira Instance URL *
          </label>
            <Input
            type="url"
            value={connection.url || ''}
            onChange={(e) => handleInputChange('url', e.target.value)}
            placeholder="https://your-domain.atlassian.net"
            disabled={isConnected}
          />
            <p className="mt-1 text-sm text-cloud-600">
            Your Jira Cloud instance URL
          </p>
        </div>

        <div>
            <label className="block text-sm font-medium text-navy-950 mb-2">
            Email Address *
          </label>
            <Input
            type="email"
            value={connection.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your-email@company.com"
            disabled={isConnected}
          />
            <p className="mt-1 text-sm text-cloud-600">
            Your Jira account email address
          </p>
        </div>

        <div>
            <label className="block text-sm font-medium text-navy-950 mb-2">
            API Token *
          </label>
            <Input
            type={isConnected ? "text" : "password"}
            value={isConnected ? maskToken(connection.apiToken || '') : (connection.apiToken || '')}
            onChange={(e) => handleInputChange('apiToken', e.target.value)}
            placeholder="Your Jira API token"
            disabled={isConnected}
            readOnly={isConnected}
          />
            <p className="mt-1 text-sm text-cloud-600">
            <a 
              href="https://id.atlassian.com/manage-profile/security/api-tokens" 
              target="_blank" 
              rel="noopener noreferrer"
                className="text-royal-950 hover:text-royal-900 underline"
            >
              Create an API token here
            </a>
          </p>
        </div>

        <div>
            <label className="block text-sm font-medium text-navy-950 mb-2">
            Default Project Key
          </label>
          <div className="flex space-x-2">
              <Input
              type="text"
              value={connection.projectKey || ''}
              onChange={(e) => handleInputChange('projectKey', e.target.value)}
                placeholder="e.g., PROJ"
              disabled={isConnected}
                className="flex-1"
            />
              <Button
                variant="outline"
                onClick={discoverProjects}
                disabled={isConnecting || isDiscoveringProjects || isConnected || !connection.url || !connection.email || !connection.apiToken}
              >
                {isDiscoveringProjects ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Icons.Search size="sm" autoContrast className="mr-2" />
                    Discover
                  </>
                )}
              </Button>
            </div>
            <p className="mt-1 text-sm text-cloud-600">
              Optional: Default project for creating work items
            </p>
          </div>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'destructive'}>
            {testResult.success ? (
              <Icons.CheckCircle size="sm" />
            ) : (
              <Icons.AlertCircle size="sm" />
            )}
            <AlertTitle>
              {testResult.success ? 'Success' : 'Error'}
            </AlertTitle>
            <AlertDescription>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
          
          {showProjectList && availableProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Projects</CardTitle>
              <CardDescription>
                Click on a project to select it as your default
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {availableProjects.map((project) => (
                  <Button
                    key={project.key}
                    variant="outline"
                    className="justify-start h-auto p-3"
                    onClick={() => selectProject(project.key)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{project.key}</div>
                      <div className="text-xs text-cloud-600 truncate">{project.name}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex space-x-3">
          {!isConnected ? (
            <Button 
              onClick={testConnection}
              disabled={isConnecting || !connection.url || !connection.email || !connection.apiToken}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Icons.CheckCircle size="sm" autoContrast className="mr-2" />
                  Test & Save Connection
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={disconnect}
              className="flex-1"
            >
              <Icons.X size="sm" className="mr-2" />
              Disconnect
            </Button>
          )}
      </div>

      {!isConnected && (
          <Alert variant="info">
            <Icons.Info size="sm" />
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Enter your Jira Cloud instance URL (e.g., https://company.atlassian.net)</li>
                <li>Enter your Jira account email address</li>
                <li>Create an API token from your Atlassian account security settings</li>
                <li>Optionally discover and select a default project</li>
                <li>Test the connection to verify everything works</li>
          </ol>
            </AlertDescription>
          </Alert>
      )}
      </CardContent>
    </Card>
  )
} 