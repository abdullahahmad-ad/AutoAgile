'use client'

import React, { useState, useEffect } from 'react'
import { ContentType, AIInstructionTemplate } from '../types'
import { contentInstructionService } from '../lib/content-instruction-service'

interface InstructionEditorProps {
  onClose: () => void
  initialContentType?: ContentType
}

export function InstructionEditor({ onClose, initialContentType }: InstructionEditorProps) {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(initialContentType || 'quarterly-presentation')
  const [template, setTemplate] = useState<AIInstructionTemplate | null>(null)
  const [customInstructions, setCustomInstructions] = useState('')
  const [isModified, setIsModified] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplate(selectedContentType)
  }, [selectedContentType])

  const loadTemplate = (contentType: ContentType) => {
    const templateData = contentInstructionService.getTemplate(contentType)
    setTemplate(templateData)
    setCustomInstructions(templateData.userInstructions || '')
    setIsModified(false)
  }

  const handleInstructionsChange = (value: string) => {
    setCustomInstructions(value)
    setIsModified(true)
  }

  const handleSave = async () => {
    if (!template) return

    setSaving(true)
    try {
      const updatedTemplate: AIInstructionTemplate = {
        ...template,
        userInstructions: customInstructions.trim() || undefined,
        isCustomized: Boolean(customInstructions.trim())
      }

      contentInstructionService.saveTemplate(updatedTemplate)
      setTemplate(updatedTemplate)
      setIsModified(false)
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!template) return

    const resetTemplate = contentInstructionService.resetToDefault(selectedContentType)
    setTemplate(resetTemplate)
    setCustomInstructions('')
    setIsModified(false)
  }

  const getContentTypeInfo = (type: ContentType) => {
    switch (type) {
      case 'quarterly-presentation':
        return { title: 'Quarterly Presentation', icon: '📊' }
      case 'customer-webinar':
        return { title: 'Customer Webinar', icon: '🎯' }
      case 'feature-newsletter':
        return { title: 'Feature Newsletter', icon: '📰' }
    }
  }

  if (!template) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">AI Instruction Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Types</h3>
            <div className="space-y-2">
              {(['quarterly-presentation', 'customer-webinar', 'feature-newsletter'] as ContentType[]).map((type) => {
                const info = getContentTypeInfo(type)
                const typeTemplate = contentInstructionService.getTemplate(type)
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedContentType(type)}
                    className={`w-full p-4 rounded-lg text-left transition-colors ${
                      selectedContentType === type
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-xl mr-3">{info.icon}</span>
                      <span className="font-medium text-gray-900">{info.title}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      {typeTemplate.isCustomized ? (
                        <span className="text-blue-600 font-medium">Customized</span>
                      ) : (
                        <span className="text-gray-500">Default</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Content Type Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getContentTypeInfo(selectedContentType).icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getContentTypeInfo(selectedContentType).title}
                  </h3>
                </div>
                {template.isCustomized && (
                  <button
                    onClick={handleReset}
                    className="text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                  >
                    Reset to Default
                  </button>
                )}
              </div>

              {/* Default Instructions */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Default Instructions</h4>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {template.defaultInstructions}
                  </pre>
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Custom Instructions
                  {template.isCustomized && (
                    <span className="ml-2 text-sm text-blue-600 font-normal">(Active)</span>
                  )}
                </h4>
                <textarea
                  value={customInstructions}
                  onChange={(e) => handleInstructionsChange(e.target.value)}
                  placeholder="Enter your custom instructions here. Leave empty to use default instructions."
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Custom instructions will override the default instructions when generating content.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {isModified && 'You have unsaved changes'}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isModified || saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 