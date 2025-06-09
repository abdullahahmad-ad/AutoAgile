'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { GeneratedContent, WorkItemType } from '../types'
import { ContentChatRefiner } from './content-chat-refiner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ContentEditorProps {
  content: GeneratedContent
  workItemType: WorkItemType
  onSave: (content: GeneratedContent) => void
  onCancel: () => void
  isEditing: boolean
  originalPrompt?: string
}

export function ContentEditor({ 
  content, 
  workItemType, 
  onSave, 
  onCancel, 
  isEditing,
  originalPrompt = ''
}: ContentEditorProps) {
  const [editedContent, setEditedContent] = useState<GeneratedContent>(content)
  const [hasChanges, setHasChanges] = useState(false)
  const [showChatRefiner, setShowChatRefiner] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  useEffect(() => {
    setEditedContent(content)
    setHasChanges(false)
  }, [content])

  const handleFieldChange = (field: keyof GeneratedContent, value: any) => {
    setEditedContent(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleCustomFieldChange = (field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleAcceptanceCriteriaChange = (index: number, value: string) => {
    const newCriteria = [...(editedContent.acceptanceCriteria || [])]
    newCriteria[index] = value
    handleFieldChange('acceptanceCriteria', newCriteria)
  }

  const addAcceptanceCriteria = () => {
    const newCriteria = [...(editedContent.acceptanceCriteria || []), '']
    handleFieldChange('acceptanceCriteria', newCriteria)
  }

  const removeAcceptanceCriteria = (index: number) => {
    const newCriteria = editedContent.acceptanceCriteria?.filter((_, i) => i !== index) || []
    handleFieldChange('acceptanceCriteria', newCriteria)
  }

  const handleLabelsChange = (value: string) => {
    const labels = value.split(',').map(label => label.trim()).filter(Boolean)
    handleFieldChange('labels', labels)
  }

  const handleSave = () => {
    onSave(editedContent)
    setHasChanges(false)
  }

  const handleChatRefinerContentSelect = (newDescription: string) => {
    console.log('ContentEditor: handleChatRefinerContentSelect called with:', newDescription)
    console.log('ContentEditor: Current editedContent:', editedContent)
    const updatedContent = { ...editedContent, description: newDescription }
    setEditedContent(updatedContent)
    setHasChanges(true)
    console.log('ContentEditor: Updated editedContent to:', updatedContent)
  }

  const handleChatRefinerClose = () => {
    setShowChatRefiner(false)
  }

  const handleChatHistoryUpdate = useCallback((messages: ChatMessage[]) => {
    setChatHistory(messages)
  }, [])

  if (showChatRefiner) {
    return (
      <ContentChatRefiner
        content={editedContent}
        workItemType={workItemType}
        originalPrompt={originalPrompt}
        onContentSelect={handleChatRefinerContentSelect}
        onClose={handleChatRefinerClose}
        chatHistory={chatHistory}
        onChatHistoryUpdate={handleChatHistoryUpdate}
      />
    )
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 mb-2">Title</h4>
          <p className="text-gray-700">{content.title}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">Description</h4>
            <button
              onClick={() => setShowChatRefiner(true)}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              Refine Description
            </button>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{content.description}</p>
        </div>

        {content.acceptanceCriteria && content.acceptanceCriteria.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-medium text-gray-900 mb-2">Acceptance Criteria</h4>
            <ul className="space-y-1">
              {content.acceptanceCriteria.map((criteria, index) => (
                <li key={index} className="text-gray-700 text-sm">• {criteria}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-medium text-gray-900 mb-2">Priority</h4>
            <p className="text-gray-700">{content.priority}</p>
          </div>
          {content.storyPoints && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-medium text-gray-900 mb-2">Story Points</h4>
              <p className="text-gray-700">{content.storyPoints}</p>
            </div>
          )}
        </div>

        {content.labels && content.labels.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-medium text-gray-900 mb-2">Labels</h4>
            <div className="flex flex-wrap gap-2">
              {content.labels.map((label, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Edit Content</h3>
        <div className="space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={editedContent.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={editedContent.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter description"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Acceptance Criteria
            </label>
            <button
              onClick={addAcceptanceCriteria}
              className="px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              Add Criteria
            </button>
          </div>
          <div className="space-y-2">
            {editedContent.acceptanceCriteria?.map((criteria, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={criteria}
                  onChange={(e) => handleAcceptanceCriteriaChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter acceptance criteria"
                />
                <button
                  onClick={() => removeAcceptanceCriteria(index)}
                  className="px-3 py-1 border border-red-300 rounded-md text-xs font-medium text-red-600 bg-white hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={editedContent.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Highest">Highest</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Lowest">Lowest</option>
            </select>
          </div>

          {(workItemType === 'story' || workItemType === 'epic') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Story Points
              </label>
              <input
                type="number"
                value={editedContent.storyPoints || ''}
                onChange={(e) => handleFieldChange('storyPoints', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter story points"
                min="1"
                max="100"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Labels (comma-separated)
          </label>
          <input
            type="text"
            value={editedContent.labels?.join(', ') || ''}
            onChange={(e) => handleLabelsChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter labels separated by commas"
          />
        </div>

        {/* Custom Fields */}
        {editedContent.customFields && Object.keys(editedContent.customFields).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Fields</h4>
            <div className="space-y-3">
              {Object.entries(editedContent.customFields).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <p className="text-sm text-yellow-800">You have unsaved changes</p>
          </div>
        </div>
      )}
    </div>
  )
} 