'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { LoadingSpinner } from './ui/loading-spinner'
import { Icons } from './ui/icons'

export interface DevsAIConnection {
  apiToken: string
}

interface DevsAIConnectionProps {
  onConnectionSaved: (connection: DevsAIConnection) => void
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

export function DevsAIConnection({ onConnectionSaved, onConnectionRemoved }: DevsAIConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connection, setConnection] = useState<Partial<DevsAIConnection>>({
    apiToken: ''
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    // Load saved connection from localStorage
    const savedConnection = localStorage.getItem('devs-ai-connection')
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection)
      setConnection(parsed)
      setIsConnected(true)
    }
  }, [])

  const handleInputChange = (field: keyof DevsAIConnection, value: string) => {
    setConnection(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const testConnection = async () => {
    if (!connection.apiToken) {
      setTestResult({ success: false, message: 'Please provide your Devs.ai API token' })
      return
    }

    setIsConnecting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/devs-ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiToken: connection.apiToken }),
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
        setIsConnected(true)
        
        // Save connection to localStorage
        localStorage.setItem('devs-ai-connection', JSON.stringify(connection))
        
        onConnectionSaved(connection as DevsAIConnection)
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

  const disconnect = () => {
    setConnection({
      apiToken: ''
    })
    setIsConnected(false)
    setTestResult(null)
    localStorage.removeItem('devs-ai-connection')
    onConnectionRemoved?.()
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Icons.Zap size="md" autoContrast className="mr-2" />
              Devs.ai Connection
            </CardTitle>
            <CardDescription>
              Configure your Devs.ai API connection for AI-powered content generation
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
        <div>
          <label className="block text-sm font-medium text-navy-950 mb-2">
            API Token *
          </label>
          <Input
            type={isConnected ? "text" : "password"}
            value={isConnected ? maskToken(connection.apiToken || '') : (connection.apiToken || '')}
            onChange={(e) => handleInputChange('apiToken', e.target.value)}
            placeholder="Your Devs.ai secret key (starts with sk-)"
            disabled={isConnected}
            readOnly={isConnected}
          />
          <p className="mt-1 text-sm text-cloud-600">
            Your Devs.ai secret key from the API Keys page
          </p>
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

        <div className="flex space-x-3">
          {!isConnected ? (
            <Button 
              onClick={testConnection}
              disabled={isConnecting || !connection.apiToken}
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
              <Icons.X size="sm" autoContrast className="mr-2" />
              Disconnect
            </Button>
          )}
      </div>

      {!isConnected && (
          <div className="space-y-4">
            <Alert variant="info">
              <Icons.Info size="sm" />
              <AlertTitle>Setup Instructions</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Create an account at <a href="https://devs.ai" target="_blank" rel="noopener noreferrer" className="text-royal-950 hover:text-royal-900 underline">Devs.ai</a></li>
              <li><strong>Log into your Devs.ai dashboard and keep it open</strong></li>
                  <li>Navigate to <a href="https://devs.ai/api-keys" target="_blank" rel="noopener noreferrer" className="text-royal-950 hover:text-royal-900 underline">API Keys page</a></li>
              <li>Click "Create new secret key" and add appropriate scopes</li>
              <li>Copy the generated secret key (starts with "sk-")</li>
              <li>Paste the key above and test the connection</li>
            </ol>
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <Icons.AlertTriangle size="sm" />
              <AlertTitle>Important Authentication Notes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>You must be logged into Devs.ai in your browser</strong> for API calls to work</li>
              <li>Devs.ai uses both session authentication and API keys</li>
              <li>Required scopes: ai.read.self, ai.write.self, chats.read.self, chats.write.self</li>
              <li>Keep your secret key secure and never share it publicly</li>
              <li>If you get authentication errors, ensure you're logged into Devs.ai</li>
            </ul>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Icons.Star size="md" autoContrast className="mr-2" />
                  Available Models
                </CardTitle>
                <CardDescription>
                  Access to premium AI models through Devs.ai
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">GPT-4</Badge>
                      <span className="text-sm text-cloud-700">& GPT-4 Turbo</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="info">Claude 3</Badge>
                      <span className="text-sm text-cloud-700">Opus, Sonnet, Haiku</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="warning">Gemini</Badge>
                      <span className="text-sm text-cloud-700">Pro & 1.5 Pro</span>
          </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">GPT-3.5</Badge>
                      <span className="text-sm text-cloud-700">Turbo</span>
            </div>
          </div>
                </div>
              </CardContent>
            </Card>
        </div>
      )}
      </CardContent>
    </Card>
  )
} 