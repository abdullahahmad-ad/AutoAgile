'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { JiraInstance, JiraWorkItem, ContentType } from '../types'
import { contentInstructionService } from '../lib/content-instruction-service'
import { ContentStudioChatRefiner } from './content-studio-chat-refiner'

interface ContentGeneratorProps {
  jiraConnection: JiraInstance
  devsAIConnection: unknown
  workItem: JiraWorkItem
  contentType: ContentType
  deliveryQuarter: string
  onBack: () => void
}

export function ContentGenerator({
  devsAIConnection,
  workItem,
  contentType,
  deliveryQuarter,
  onBack
}: ContentGeneratorProps) {
  const [generatedContent, setGeneratedContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'generated' | 'refine'>('generated')
  const [showChatRefiner, setShowChatRefiner] = useState(false)
  const [originalPrompt, setOriginalPrompt] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)

  const getContentTypeInfo = (type: ContentType) => {
    switch (type) {
      case 'quarterly-presentation':
        return {
          title: 'Quarterly Presentation',
          description: 'Executive slide deck for quarterly business reviews',
          icon: '📊'
        }
      case 'customer-webinar':
        return {
          title: 'Customer Webinar',
          description: 'Customer-facing presentation content',
          icon: '🎯'
        }
      case 'feature-newsletter':
        return {
          title: 'Feature Newsletter',
          description: 'Newsletter content for feature announcement',
          icon: '📰'
        }
      case 'technical-documentation':
        return {
          title: 'Technical Documentation',
          description: 'Technical documentation and specifications',
          icon: '📋'
        }
      case 'stakeholder-update':
        return {
          title: 'Stakeholder Update',
          description: 'Progress update for stakeholders',
          icon: '📈'
        }
      default:
        return {
          title: 'Content Generation',
          description: 'Generate content for this work item',
          icon: '📄'
        }
    }
  }

  const generateContent = useCallback(async () => {
    if (!workItem) return
    
    setIsGenerating(true)
    setGeneratedContent('')
    setError(null)
    setActiveTab('generated') // Reset to generated tab when generating new content
    
    try {
      const instructions = contentInstructionService.getActiveInstructions(contentType)
      
      // Extract problem and solution descriptions
      const extractProblemAndSolution = (description: any): { problemDescription: string; solutionDescription: string } => {
        let fullText = ''
        
        // Extract text from description (handle both string and ADF formats)
        if (typeof description === 'string') {
          fullText = description
        } else if (description && typeof description === 'object' && description.content) {
          const extractText = (node: any): string => {
            if (node.text) {
              return node.text
            }
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(extractText).join(' ')
            }
            return ''
          }
          fullText = description.content.map(extractText).join('\n').trim()
        }
        
        // Initialize result
        let problemDescription = ''
        let solutionDescription = ''
        
        // Split text into lines for processing
        const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        let currentSection = ''
        let problemLines: string[] = []
        let solutionLines: string[] = []
        
        for (const line of lines) {
          // Check for section headings (case insensitive)
          const lowerLine = line.toLowerCase()
          
          if (lowerLine.includes('problem description') || 
              lowerLine.includes('problem statement') ||
              lowerLine.includes('the problem') ||
              (lowerLine.startsWith('problem') && lowerLine.includes(':'))) {
            currentSection = 'problem'
            continue
          }
          
          if (lowerLine.includes('solution description') || 
              lowerLine.includes('solution statement') ||
              lowerLine.includes('the solution') ||
              lowerLine.includes('proposed solution') ||
              (lowerLine.startsWith('solution') && lowerLine.includes(':'))) {
            currentSection = 'solution'
            continue
          }
          
          // Skip obvious headings (lines that are very short and might be section headers)
          if (line.length < 10 && (line.includes('#') || line.includes('###'))) {
            continue
          }
          
          // Add content to appropriate section
          if (currentSection === 'problem' && line.length > 10) {
            problemLines.push(line)
          } else if (currentSection === 'solution' && line.length > 10) {
            solutionLines.push(line)
          }
        }
        
        // Join the lines and clean up
        problemDescription = problemLines.join(' ').trim()
        solutionDescription = solutionLines.join(' ').trim()
        
        // If we didn't find specific sections, try to extract from the beginning of the description
        if (!problemDescription && !solutionDescription && fullText.length > 50) {
          // Take first half as problem, second half as solution (fallback)
          const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10)
          if (sentences.length >= 2) {
            const midPoint = Math.ceil(sentences.length / 2)
            problemDescription = sentences.slice(0, midPoint).join('. ').trim() + '.'
            solutionDescription = sentences.slice(midPoint).join('. ').trim() + '.'
          } else {
            // If very short, use the whole thing as problem description
            problemDescription = fullText
          }
        }
        
        return {
          problemDescription: problemDescription || 'No problem description available',
          solutionDescription: solutionDescription || 'No solution description available'
        }
      }
      
      const { problemDescription, solutionDescription } = extractProblemAndSolution(workItem.description)
      
      const prompt = `${instructions}

Work Item Details:
- Title: ${workItem.summary}
- Type: ${workItem.issueType}
- Status: ${workItem.status}
- Project: ${workItem.project}
- Delivery Quarter: ${deliveryQuarter}
- Problem Description: ${problemDescription}
- Solution Description: ${solutionDescription}
- Labels: ${workItem.labels?.join(', ') || 'None'}
- Fix Versions: ${workItem.fixVersions?.join(', ') || 'None'}

${contentType === 'feature-newsletter' ? 
`CRITICAL: You must output EXACTLY this format with NO headings, NO markdown, NO numbered lists:

[Clean feature title - max 12 words]

[The Why paragraph - up to 150 words (80 recommended) about the problem/limitation]

[The How paragraph - up to 150 words (80 recommended) about how the feature solves it]

Do NOT include any headings like "# Title" or "## The Why". Just provide the title followed by two paragraphs.` : 
''}`

      // Store the original prompt for chat refiner
      setOriginalPrompt(prompt)

      // Use Devs.ai API if available, otherwise use a mock response
      if (devsAIConnection) {
        // Get the API token from the DevS.ai connection
        const apiToken = (devsAIConnection as any)?.apiToken || 
                        (typeof window !== 'undefined' ? 
                          JSON.parse(localStorage.getItem('devs-ai-connection') || '{}')?.apiToken : 
                          null)

        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            contentType,
            workItem: workItem,
            useDevsAI: true,
            apiToken: apiToken
          })
        })

        if (!response.ok) {
          throw new Error('Failed to generate content')
        }

        const data = await response.json()
        setGeneratedContent(data.content)
      } else {
        // Mock content generation for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000))
        setGeneratedContent(generateMockContent(contentType, workItem))
      }
    } catch (err) {
      setError('Failed to generate content. Please try again.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }, [devsAIConnection, contentType, workItem.key, workItem.summary, workItem.issueType, workItem.status, workItem.project, deliveryQuarter, workItem.description])

  const generateMockContent = (type: ContentType, item: JiraWorkItem): string => {
    // Helper function to extract Problem Description and Solution Description sections
    const extractProblemAndSolution = (description: any): { problemDescription: string; solutionDescription: string } => {
      let fullText = ''
      
      // Extract text from description (handle both string and ADF formats)
      if (typeof description === 'string') {
        fullText = description
      } else if (description && typeof description === 'object' && description.content) {
        const extractText = (node: any): string => {
          if (node.text) {
            return node.text
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join(' ')
          }
          return ''
        }
        fullText = description.content.map(extractText).join('\n').trim()
      }
      
      // Initialize result
      let problemDescription = ''
      let solutionDescription = ''
      
      // Split text into lines for processing
      const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      let currentSection = ''
      let problemLines: string[] = []
      let solutionLines: string[] = []
      
      for (const line of lines) {
        // Check for section headings (case insensitive)
        const lowerLine = line.toLowerCase()
        
        if (lowerLine.includes('problem description') || 
            lowerLine.includes('problem statement') ||
            lowerLine.includes('the problem') ||
            (lowerLine.startsWith('problem') && lowerLine.includes(':'))) {
          currentSection = 'problem'
          continue
        }
        
        if (lowerLine.includes('solution description') || 
            lowerLine.includes('solution statement') ||
            lowerLine.includes('the solution') ||
            lowerLine.includes('proposed solution') ||
            (lowerLine.startsWith('solution') && lowerLine.includes(':'))) {
          currentSection = 'solution'
          continue
        }
        
        // Skip obvious headings (lines that are very short and might be section headers)
        if (line.length < 10 && (line.includes('#') || line.includes('###'))) {
          continue
        }
        
        // Add content to appropriate section
        if (currentSection === 'problem' && line.length > 10) {
          problemLines.push(line)
        } else if (currentSection === 'solution' && line.length > 10) {
          solutionLines.push(line)
        }
      }
      
      // Join the lines and clean up
      problemDescription = problemLines.join(' ').trim()
      solutionDescription = solutionLines.join(' ').trim()
      
      // If we didn't find specific sections, try to extract from the beginning of the description
      if (!problemDescription && !solutionDescription && fullText.length > 50) {
        // Take first half as problem, second half as solution (fallback)
        const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10)
        if (sentences.length >= 2) {
          const midPoint = Math.ceil(sentences.length / 2)
          problemDescription = sentences.slice(0, midPoint).join('. ').trim() + '.'
          solutionDescription = sentences.slice(midPoint).join('. ').trim() + '.'
        } else {
          // If very short, use the whole thing as problem description
          problemDescription = fullText
        }
      }
      
      return {
        problemDescription: problemDescription || 'Current operational challenges require strategic intervention to optimize business processes and enhance customer satisfaction.',
        solutionDescription: solutionDescription || 'Implementation of advanced capabilities will streamline workflows, reduce operational overhead, and deliver measurable improvements in user experience and business outcomes.'
      }
    }
    
    const { problemDescription, solutionDescription } = extractProblemAndSolution(item.description)

    switch (type) {
      case 'quarterly-presentation':
        return `# ${item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Executive Summary

This initiative represents a critical advancement in our platform capabilities, directly addressing key customer pain points while positioning us for sustained competitive advantage. The implementation will deliver immediate operational benefits and establish the foundation for future innovation.

## Strategic Context

Market dynamics and customer feedback have highlighted the urgent need for enhanced functionality in this domain. Our analysis indicates that addressing these requirements will significantly improve user satisfaction scores and reduce support overhead by an estimated 35-40%.

## Business Impact

**Revenue Implications**
- Projected 15-20% improvement in customer retention rates
- Estimated $2.3M annual cost savings through operational efficiency gains
- Enhanced upselling opportunities through improved feature adoption

**Operational Benefits**
- Streamlined workflows reducing manual intervention by 60%
- Improved system reliability and performance metrics
- Enhanced data visibility and actionable insights for stakeholders

## Technical Approach

${solutionDescription.replace(/\\n/g, ' ').trim()}

The solution architecture leverages industry best practices and proven technologies to ensure scalability, maintainability, and optimal performance. Integration points have been carefully designed to minimize disruption to existing workflows while maximizing the value delivered to end users.

## Success Metrics & KPIs

- User adoption rate: Target 75% within 30 days of release
- Customer satisfaction improvement: +25 points on NPS scale
- System performance: <200ms response time for core operations
- Support ticket reduction: 40% decrease in related inquiries

## Risk Mitigation

Comprehensive testing protocols and phased rollout strategies will ensure minimal business disruption. Rollback procedures and monitoring systems are in place to address any unforeseen issues promptly.

## Timeline & Next Steps

Development is progressing according to schedule with key milestones aligned to business priorities. Regular stakeholder updates and feedback loops ensure continuous alignment with strategic objectives.`

      case 'customer-webinar':
        return `# Introducing ${item.summary}

## Welcome & Agenda
Welcome to our exclusive webinar showcasing the latest innovation in our product suite.

## The Challenge We're Solving
Our customers have been asking for better ways to [describe the problem this feature solves].

## Feature Overview
${item.summary} is designed to:
- Streamline your workflow
- Improve efficiency
- Enhance user experience
- Provide better insights

## Live Demo Highlights
Let's explore the key capabilities:

### Core Functionality
- Intuitive interface design
- Seamless integration with existing tools
- Real-time data processing

### Advanced Features
- Customizable dashboards
- Automated reporting
- Enhanced security measures

## Customer Success Story
"This feature has transformed how we approach [relevant business process]" - [Customer Name]

## Getting Started
- Available in your dashboard starting [date]
- Step-by-step setup guide provided
- Support team ready to assist

## Q&A Session
We'll now address your questions about this exciting new feature.

## What's Next
- Additional enhancements planned for next quarter
- Beta program for advanced features
- Community feedback integration

## Thank You
Thank you for joining us today. We're excited to see how you'll use this new capability!`

      case 'feature-newsletter':
        // Extract a clean title from the work item summary
        const cleanTitle = item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()
        const shortTitle = cleanTitle.length > 60 ? cleanTitle.substring(0, 57) + '...' : cleanTitle
        
        return `${shortTitle}

${problemDescription.length > 0 ? 
  problemDescription.replace(/\\n/g, ' ').trim() :
  `Current market demands require enhanced platform capabilities to address evolving customer needs and competitive pressures. Users have consistently requested improved functionality that streamlines their daily workflows and reduces operational complexity. This gap in our offering has created friction points that impact user satisfaction and limit our ability to capture additional market share.`
}

${solutionDescription.length > 0 ? 
  solutionDescription.replace(/\\n/g, ' ').trim() :
  `Our engineering team has developed an innovative solution that leverages cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for our customers. This advancement positions us as the industry leader in providing comprehensive, user-centric solutions that drive measurable business outcomes.`
}`

      case 'technical-documentation':
        return `# ${item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()} - Technical Specification

## Overview

This document outlines the technical implementation details, architecture decisions, and integration requirements for the proposed solution. The design prioritizes scalability, maintainability, and optimal performance while adhering to established security and compliance standards.

## Problem Statement

${problemDescription.replace(/\\n/g, ' ').trim()}

## Solution Architecture

${solutionDescription.replace(/\\n/g, ' ').trim()}

### Core Components

**Data Layer**
- Optimized database schemas with appropriate indexing strategies
- Caching mechanisms for frequently accessed data
- Data validation and integrity constraints

**Business Logic Layer**
- Modular service architecture enabling independent scaling
- Comprehensive error handling and logging
- Asynchronous processing for resource-intensive operations

**Presentation Layer**
- Responsive user interface with accessibility compliance
- Real-time updates through WebSocket connections
- Progressive enhancement for optimal performance

### Integration Points

The solution integrates seamlessly with existing systems through well-defined APIs and standardized data formats. Authentication and authorization mechanisms ensure secure access while maintaining user experience quality.

### Performance Considerations

- Load balancing strategies for high availability
- Database optimization and query performance tuning
- CDN implementation for static asset delivery
- Monitoring and alerting for proactive issue resolution

## Implementation Timeline

Development follows agile methodologies with iterative delivery cycles. Each sprint delivers functional increments that can be independently tested and validated by stakeholders.

## Testing Strategy

Comprehensive testing protocols include unit tests, integration tests, and end-to-end validation scenarios. Performance testing ensures the solution meets specified SLA requirements under various load conditions.`

      case 'stakeholder-update':
        return `# Project Update: ${item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Current Status: On Track

Development is progressing according to plan with all major milestones achieved on schedule. The team has successfully completed the initial design phase and is now focused on core implementation activities.

## Key Accomplishments

**Technical Progress**
- Architecture design finalized and approved by technical review board
- Core infrastructure components deployed to development environment
- Initial integration testing completed with positive results

**Business Alignment**
- Stakeholder requirements validated through user research sessions
- Success metrics defined and measurement frameworks established
- Risk assessment completed with mitigation strategies in place

## Current Focus Areas

${solutionDescription.replace(/\\n/g, ' ').trim()}

The development team is prioritizing the most critical user-facing features to ensure early value delivery. Parallel workstreams are addressing infrastructure requirements and integration dependencies.

## Upcoming Milestones

- **Week 1-2**: Core feature implementation and unit testing
- **Week 3**: Integration testing and performance validation
- **Week 4**: User acceptance testing and feedback incorporation
- **Week 5**: Production deployment preparation and documentation

## Metrics & Performance

Early indicators suggest the solution will exceed initial performance targets. User feedback from prototype demonstrations has been overwhelmingly positive, with particular praise for the intuitive interface design and improved workflow efficiency.

## Resource Requirements

The project remains within approved budget parameters. No additional resources are required at this time, though we continue to monitor capacity requirements as development progresses.

## Risk Management

All identified risks remain within acceptable tolerance levels. Contingency plans are in place for potential integration challenges, and the team maintains regular communication with dependent system owners.

## Next Steps

Focus continues on delivering high-quality, user-centric functionality that addresses core business requirements. Regular stakeholder updates will ensure continued alignment with strategic objectives.`

      default:
        return `# ${item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Overview

This initiative addresses critical business requirements through innovative technology solutions that enhance user experience and operational efficiency. The implementation leverages industry best practices to deliver measurable value to stakeholders.

## Business Context

${problemDescription.replace(/\\n/g, ' ').trim()}

## Proposed Solution

${solutionDescription.replace(/\\n/g, ' ').trim()}

## Expected Outcomes

The successful implementation of this solution will result in improved operational metrics, enhanced user satisfaction, and strengthened competitive positioning. Key performance indicators will be monitored to ensure objectives are met and value is delivered as expected.

## Implementation Approach

Development follows proven methodologies with emphasis on quality, security, and maintainability. Regular stakeholder engagement ensures alignment with business priorities throughout the delivery lifecycle.`
    }
  }

  const copyToClipboard = async () => {
    if (!generatedContent) return

    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  const handleChatRefinerContentSelect = (newContent: string) => {
    setGeneratedContent(newContent)
    setShowChatRefiner(false)
    setActiveTab('generated')
  }

  const handleChatRefinerClose = () => {
    setShowChatRefiner(false)
    setActiveTab('generated')
  }

  const contentTypeInfo = getContentTypeInfo(contentType)

  useEffect(() => {
    generateContent()
  }, [generateContent])

  // If chat refiner is open, show it instead of the main interface
  if (showChatRefiner && generatedContent && originalPrompt) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Content Types
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-config'))}
            className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
          >
            Configure Templates
          </button>
        </div>

        {/* Content Type Info */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-4">{contentTypeInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{contentTypeInfo.title}</h2>
              <p className="text-gray-600">{contentTypeInfo.description}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Work Item: {workItem.key}</h3>
            <p className="text-gray-700">{workItem.summary}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Project: {workItem.project}</span>
              <span>Quarter: {deliveryQuarter}</span>
              <span>Type: {workItem.issueType}</span>
            </div>
          </div>
        </div>

        {/* Chat Refiner */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ContentStudioChatRefiner
            content={generatedContent}
            contentType={contentType}
            workItem={workItem}
            originalPrompt={originalPrompt}
            onContentSelect={handleChatRefinerContentSelect}
            onClose={handleChatRefinerClose}
            initialTab="refine"
            showTabs={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Content Types
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-config'))}
          className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
        >
          Configure Templates
        </button>
      </div>

      {!devsAIConnection && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Using Enhanced Mock Content
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  You're seeing high-quality mock content. To enable real AI generation with DevS.ai:
                </p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Set up your DevS.ai connection in the main dashboard</li>
                  <li><strong>Log into your DevS.ai account in your browser</strong></li>
                  <li>Test the connection to ensure it's working</li>
                  <li>Return here to generate AI-powered content</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Type Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-4">{contentTypeInfo.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contentTypeInfo.title}</h2>
            <p className="text-gray-600">{contentTypeInfo.description}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Work Item: {workItem.key}</h3>
          <p className="text-gray-700">{workItem.summary}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>Project: {workItem.project}</span>
            <span>Quarter: {deliveryQuarter}</span>
            <span>Type: {workItem.issueType}</span>
          </div>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Generate Content</h3>
        </div>

        {!generatedContent && (
          <button
            onClick={generateContent}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Generating Content...</span>
              </div>
            ) : (
              'Generate Content'
            )}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
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

          {/* Tab Content */}
          {activeTab === 'generated' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Generated Content</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={generateContent}
                    className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy Content'}
                  </button>
                </div>
              </div>
              
              <div 
                ref={contentRef}
                className="prose max-w-none bg-gray-50 rounded-lg p-6 border"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {generatedContent}
              </div>
            </div>
          ) : (
            <div>
              {originalPrompt ? (
                <ContentStudioChatRefiner
                  content={generatedContent}
                  contentType={contentType}
                  workItem={workItem}
                  originalPrompt={originalPrompt}
                  onContentSelect={handleChatRefinerContentSelect}
                  onClose={handleChatRefinerClose}
                  initialTab="refine"
                  showTabs={false}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">Original Prompt Not Available</p>
                      <p className="text-sm text-yellow-700">Please regenerate the content to enable chat refinement.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 