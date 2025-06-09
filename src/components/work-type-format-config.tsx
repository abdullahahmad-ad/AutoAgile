'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType } from '../types'
import { WorkItemTemplate } from '../lib/template-service'

interface WorkTypeFormatConfigProps {
  workItemType: WorkItemType
  template?: WorkItemTemplate
  onSave: (template: WorkItemTemplate) => void
  onCancel: () => void
}

export function WorkTypeFormatConfig({ 
  workItemType, 
  template, 
  onSave, 
  onCancel 
}: WorkTypeFormatConfigProps) {
  const [templateName, setTemplateName] = useState(template?.name || `${workItemType} Template`)
  const [aiPrompt, setAiPrompt] = useState(template?.aiPrompt || '')
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [sampleDescription, setSampleDescription] = useState('')

  // Default prompts for each work item type
  const defaultPrompts = {
    initiative: 'Generate a comprehensive initiative based on: {description}. Include business value, success metrics, and high-level scope. Structure the response with clear sections for business justification, expected outcomes, and implementation timeline.',
    epic: `You're an experienced product manager writing Jira Epics in the style used by enterprise technology companies like Amazon, Google, and AppDirect. When given a {description}, respond with a complete Jira Epic formatted using the following structure and tone:

### Format Requirements:
- Use \`###\` (Markdown Heading Level 3) for each section heading
- **Do not bold** the headings
- **Do not use dividers** or horizontal lines
- **Do not use emojis**
- Write for a cross-functional audience: engineers, product managers, and senior non-technical leadership
- Language should be **rich, clear, and actionable**
- Where relevant, use **bulleted lists** for readability

### Jira Epic Sections:
- Problem description  
- Solution description  
- Scope  
- Out of scope  
- Expected launch timeline  
- Business case  
- Dependencies  
- Definition of done/Acceptance criteria  
- Test plan  

### Additional Guidance:
- Maintain a structured, professional tone without sounding robotic.
- In "Business case", clearly tie the initiative to measurable impact or strategic goals.
- Where applicable, refer to personas, linked documents, or user journeys.
- Incorporate the following user preference:  
  - Use **Heading Level 3** for all section headings  
  - Do **not bold** any heading  
  - Do **not** include dividers  
  - Avoid emojis entirely`,
    story: 'Generate a detailed user story based on: {description}. Include specific acceptance criteria and suggest story points. Follow the "As a [user], I want [goal] so that [benefit]" format and provide clear, testable acceptance criteria.'
  }

  // Update AI prompt when work item type changes
  useEffect(() => {
    if (!aiPrompt && !template?.aiPrompt) {
      setAiPrompt(defaultPrompts[workItemType])
    }
  }, [workItemType, aiPrompt, template?.aiPrompt])

  const resetToDefault = () => {
    setAiPrompt(defaultPrompts[workItemType])
  }

  const generatePromptPreview = () => {
    if (!sampleDescription.trim()) {
      return aiPrompt
    }
    return aiPrompt.replace('{description}', sampleDescription)
  }

  const handleSave = () => {
    const newTemplate: WorkItemTemplate = {
      id: template?.id || `template_${workItemType}_${Date.now()}`,
      name: templateName,
      workItemType,
      fields: [], // Empty fields since we're not using template fields anymore
      aiPrompt: aiPrompt || defaultPrompts[workItemType],
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    onSave(newTemplate)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Configure {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)} AI Prompt</h2>
        <div className="space-x-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter template name"
          />
        </div>

        {/* AI Prompt Customization */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">AI Prompt Instructions</h3>
            <div className="flex space-x-2">
              <button
                onClick={resetToDefault}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                {showPromptPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom AI Prompt
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Enter custom AI prompt for generating ${workItemType}s...`}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-2 text-sm text-gray-500">
                Use <code className="bg-gray-100 px-1 rounded">{'{description}'}</code> as a placeholder for the user's input description.
              </p>
            </div>

            {/* Default Prompt Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Default Prompt for {workItemType}:</h4>
              <p className="text-sm text-gray-600 italic">
                {defaultPrompts[workItemType]}
              </p>
            </div>

            {/* Prompt Preview */}
            {showPromptPreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Prompt Preview</h4>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Sample Description (for preview):
                  </label>
                  <input
                    type="text"
                    value={sampleDescription}
                    onChange={(e) => setSampleDescription(e.target.value)}
                    placeholder={`Enter a sample ${workItemType} description...`}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <h5 className="text-xs font-medium text-blue-700 mb-2">Generated Prompt:</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {generatePromptPreview()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Template Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Template Name:</strong> {templateName}</p>
              <p><strong>Work Item Type:</strong> {workItemType}</p>
              <p><strong>Custom AI Prompt:</strong> {aiPrompt ? 'Yes' : 'Using Default'}</p>
            </div>
            <div>
              <p><strong>Prompt Length:</strong> {aiPrompt.length} characters</p>
              <p><strong>Uses Placeholder:</strong> {aiPrompt.includes('{description}') ? 'Yes' : 'No'}</p>
              <p><strong>Field Validation:</strong> Automatic via Jira integration</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Required Jira fields are automatically discovered and validated when pushing to Jira. 
              The AI will generate content, and any missing required fields will be prompted for completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}