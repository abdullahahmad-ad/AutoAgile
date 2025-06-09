'use client'

import React, { useState, useEffect } from 'react'
import { ContentType, JiraWorkItem } from '../types'
import { Button } from './ui/button'
import { LoadingSpinner } from './ui/loading-spinner'
import { Icons } from './ui/icons'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ContentStudioChatRefinerProps {
  content: string
  contentType: ContentType
  workItem: JiraWorkItem
  originalPrompt: string
  onContentSelect: (content: string) => void
  onClose: () => void
  initialTab?: 'generated' | 'refine'
  showTabs?: boolean
  chatHistory?: ChatMessage[]
  onChatHistoryUpdate?: (messages: ChatMessage[]) => void
}

export function ContentStudioChatRefiner({
  content,
  contentType,
  workItem,
  originalPrompt,
  onContentSelect,
  onClose,
  initialTab = 'refine',
  showTabs = true,
  chatHistory = [],
  onChatHistoryUpdate
}: ContentStudioChatRefinerProps) {
  const [activeTab, setActiveTab] = useState<'generated' | 'refine'>(initialTab)
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [isDevsAIAvailable, setIsDevsAIAvailable] = useState(false)

  // Check if DevS.ai is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devs-ai-connection')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setIsDevsAIAvailable(!!parsed.apiToken)
        } catch (error) {
          console.error('Failed to parse saved DevS.ai connection:', error)
          setIsDevsAIAvailable(false)
        }
      }
    }
  }, [])

  // Initialize chat with original context if no history exists
  useEffect(() => {
    if (chatHistory.length === 0) {
      const initialMessages: ChatMessage[] = [
        {
          id: 'original-prompt',
          role: 'user',
          content: originalPrompt,
          timestamp: new Date()
        },
        {
          id: 'original-response',
          role: 'assistant',
          content: content,
          timestamp: new Date()
        }
      ]
      setMessages(initialMessages)
      setSelectedMessageId('original-response') // Default to original response
      // Update parent with initial history
      if (onChatHistoryUpdate) {
        onChatHistoryUpdate(initialMessages)
      }
    } else {
      // Use existing chat history
      setMessages(chatHistory)
      // Set selected message to the last assistant message if none selected
      const lastAssistantMessage = chatHistory.filter(msg => msg.role === 'assistant').pop()
      if (lastAssistantMessage && !selectedMessageId) {
        setSelectedMessageId(lastAssistantMessage.id)
      }
    }
  }, [originalPrompt, chatHistory.length])

  // Update parent when messages change (but only if messages actually changed)
  useEffect(() => {
    if (onChatHistoryUpdate && messages.length > 0 && messages !== chatHistory) {
      onChatHistoryUpdate(messages)
    }
  }, [messages])

  const getContentTypeDisplayName = (type: ContentType): string => {
    switch (type) {
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
      default:
        return type
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: newMessage.trim(),
      timestamp: new Date()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setNewMessage('')
    setIsLoading(true)

    try {
      if (!isDevsAIAvailable) {
        throw new Error('DevS.ai connection is required for chat refinement. Please connect to DevS.ai in the "DevS.ai Connection" tab first.')
      }

      // Get the API token from localStorage (saved by devs-ai service)
      let apiToken = ''
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('devs-ai-connection')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            apiToken = parsed.apiToken || ''
          } catch (error) {
            console.error('Failed to parse saved DevS.ai connection:', error)
          }
        }
      }

      if (!apiToken) {
        throw new Error('DevS.ai API token not found. Please connect to DevS.ai first.')
      }

      // Prepare messages for the API call with content-specific system prompt
      const systemPrompt = `You are an expert content writer helping to refine ${getContentTypeDisplayName(contentType)} content. The user is working on content for a ${workItem.issueType} titled "${workItem.summary}" and wants to improve their ${contentType.replace('-', ' ')}. Provide helpful, specific suggestions and refined versions of the content. Keep responses focused, actionable, and appropriate for the content type.`

      const apiMessages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        ...updatedMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: newMessage.trim()
        }
      ]

      const response = await fetch('/api/devs-ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiToken,
          requestBody: {
            messages: apiMessages,
            model: 'gpt-4',
            stream: false
          }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API error: ${response.status} ${response.statusText}`
        
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // If error response is not JSON, use the status text
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from AI')
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Please try again."}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleApplySelected = () => {
    console.log('Apply Selected clicked (Content Studio)')
    console.log('Selected message ID:', selectedMessageId)
    console.log('Available messages:', messages)
    
    const selectedMessage = messages.find(msg => msg.id === selectedMessageId)
    console.log('Found selected message:', selectedMessage)
    
    if (selectedMessage && selectedMessage.role === 'assistant') {
      console.log('Calling onContentSelect with:', selectedMessage.content)
      onContentSelect(selectedMessage.content)
      
      // Switch to generated tab to show the updated content (if tabs are shown)
      if (showTabs) {
        setActiveTab('generated')
      }
      
      // Provide visual feedback
      console.log('Content applied successfully')
    } else {
      console.log('No valid message selected or message is not from assistant')
    }
  }

  const assistantMessages = messages.filter(msg => msg.role === 'assistant')

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      {showTabs && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('generated')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'generated'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generated Content
            </button>
            <button
              onClick={() => setActiveTab('refine')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'refine'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Refine with AI
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {showTabs && activeTab === 'generated' ? (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 mb-2">Current {getContentTypeDisplayName(contentType)}</h4>
          <div className="text-gray-700 whitespace-pre-wrap">{content}</div>
        </div>
      ) : (
        // Show refine content (either in refine tab or when tabs are hidden)
        <div className="space-y-4">
          {/* DevS.ai Status Warning */}
          {!isDevsAIAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div>
                  <p className="text-sm text-yellow-800 font-medium">DevS.ai Connection Required</p>
                  <p className="text-sm text-yellow-700">Chat refinement requires DevS.ai. Please connect in the &quot;DevS.ai Connection&quot; tab first.</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="bg-gray-50 rounded-lg p-4 border max-h-96 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 ml-2">
                          <input
                            type="radio"
                            name="selectedMessage"
                            value={message.id}
                            checked={selectedMessageId === message.id}
                            onChange={(e) => setSelectedMessageId(e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <div className="text-xs text-gray-500 text-center">
                    Original prompt and response
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isDevsAIAvailable ? `Ask the AI to refine the ${contentType.replace('-', ' ')}...` : "DevS.ai connection required for chat refinement"}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isLoading || !isDevsAIAvailable}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading || !isDevsAIAvailable}
                className="self-end"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <Icons.ArrowRight size="sm" autoContrast />
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {assistantMessages.length > 0 && (
                  <>Select a response above and click &ldquo;Apply Selected&rdquo; to use it as your {contentType.replace('-', ' ')}.</>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApplySelected}
                  disabled={!selectedMessageId}
                >
                  Apply Selected
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 