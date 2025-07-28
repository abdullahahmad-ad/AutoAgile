'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { JiraInstance, JiraWorkItem, ContentType } from '../types'
import { contentInstructionService } from '../lib/content-instruction-service'
import { ContentStudioChatRefiner } from './content-studio-chat-refiner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ContentGeneratorProps {
  jiraConnection: JiraInstance
  devsAIConnection: unknown
  workItem: JiraWorkItem
  contentType: ContentType
  deliveryQuarter: string
  onBack: () => void
}

export function ContentGenerator({
  jiraConnection,
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
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
      case 'engineering-highlights':
        return {
          title: 'Engineering Highlights',
          description: 'Project highlights and engineering achievements',
          icon: '🔧'
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
    
    console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio generateContent called`, {
      workItemKey: workItem.key,
      workItemType: workItem.issueType,
      contentType,
      hasDevsAIConnection: !!devsAIConnection,
      deliveryQuarter
    })
    
    setIsGenerating(true)
    setGeneratedContent('')
    setError(null)
    setActiveTab('generated') // Reset to generated tab when generating new content
    
    try {
      const instructions = contentInstructionService.getActiveInstructions(contentType)
      
      console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content instructions loaded`, {
        contentType,
        instructionsLength: instructions.length
      })
      
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

      console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio prompt prepared`, {
        promptLength: prompt.length,
        contentType,
        hasDevsAIConnection: !!devsAIConnection
      })

      // Use Devs.ai API if available, otherwise use a mock response
      if (devsAIConnection) {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio using DevS.ai connection`)
        
        // Get the API token from the DevS.ai connection
        const apiToken = (devsAIConnection as any)?.apiToken || 
                        (typeof window !== 'undefined' ? 
                          JSON.parse(localStorage.getItem('devs-ai-connection') || '{}')?.apiToken : 
                          null)

        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio DevS.ai API token available:`, !!apiToken)

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
            apiToken: apiToken,
            context: {
              jiraConnection
            }
          })
        })

        if (!response.ok) {
          console.error(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio API request failed`, {
            status: response.status,
            statusText: response.statusText
          })
          throw new Error('Failed to generate content')
        }

        const data = await response.json()
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio API response received`, {
          success: data.success,
          contentLength: data.content?.length || 0,
          model: data.metadata?.model
        })
        
        setGeneratedContent(data.content)
      } else {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio falling back to mock content (no DevsAI connection)`)
        
        // Mock content generation for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000))
        const mockContent = generateMockContent(contentType, workItem)
        
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio mock content generated`, {
          contentLength: mockContent.length,
          model: 'mock-ai'
        })
        
        setGeneratedContent(mockContent)
      }
    } catch (err) {
      console.error(`[AI-DEBUG] ${new Date().toISOString()} - Content Studio generation error:`, err)
      setError('Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [devsAIConnection, contentType, workItem.key, workItem.summary, workItem.issueType, workItem.status, workItem.project, deliveryQuarter, workItem.description, jiraConnection])

  const generateMockContent = (type: ContentType, item: JiraWorkItem): string => {
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
        const quarterlyTitle = item.summary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()
        
        return `# ${quarterlyTitle}

## Executive Summary (Answer First)

This initiative delivers critical business value by addressing key operational challenges and positioning us for sustained competitive advantage. The implementation will generate immediate ROI through improved efficiency, enhanced customer satisfaction, and reduced operational overhead.

**Key Value Delivered:**
- Projected 15-20% improvement in customer retention rates
- Estimated $2.3M annual cost savings through operational efficiency gains
- Enhanced competitive positioning and market differentiation
- Reduced support overhead by 35-40% through improved user experience

## Strategic Context (The Why)

${problemDescription.length > 0 ? 
  problemDescription.replace(/\\n/g, ' ').trim() :
  `Market dynamics and customer feedback have highlighted urgent needs for enhanced platform capabilities. Current operational challenges are impacting user satisfaction and limiting our ability to capture market opportunities. Addressing these requirements is critical for maintaining competitive advantage and supporting business growth objectives.`
}

**Business Drivers:**
- Customer demand for improved functionality and user experience
- Competitive pressure requiring platform modernization
- Operational inefficiencies impacting cost structure and scalability
- Strategic alignment with company growth and market expansion goals

## Solution Approach (The How)

${solutionDescription.length > 0 ? 
  solutionDescription.replace(/\\n/g, ' ').trim() :
  `Our engineering team has developed an innovative solution leveraging cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for customers.`
}

**Key Capabilities:**
- Advanced automation reducing manual intervention by 60%
- Enhanced system reliability and performance optimization
- Improved data visibility and actionable insights for stakeholders
- Seamless integration with existing workflows and minimal disruption

## Business Impact & Success Metrics

**Revenue & Cost Impact:**
- Customer retention improvement: +15-20%
- Annual cost savings: $2.3M through operational efficiency
- Upselling opportunities through enhanced feature adoption
- Reduced support costs: 40% decrease in related inquiries

**Operational Benefits:**
- User adoption target: 75% within 30 days of release
- Customer satisfaction improvement: +25 points on NPS scale
- System performance: <200ms response time for core operations
- Process efficiency gains: 60% reduction in manual tasks

## Timeline & Resource Allocation

**Key Milestones:**
- Development progressing according to schedule with all major milestones on track
- Core implementation phase: Current focus on critical user-facing features
- Integration testing and performance validation: Next 2-3 weeks
- Production deployment: Aligned with business priorities and market timing

**Risk Mitigation:**
- Comprehensive testing protocols and phased rollout strategies
- Rollback procedures and monitoring systems in place
- Regular stakeholder updates ensuring continued alignment

## Next Quarter Outlook

**Future Enhancements:**
- Additional platform capabilities planned for next quarter
- Scaling opportunities and market expansion potential
- Enhanced analytics and reporting features
- Integration with emerging technologies and industry standards

**Strategic Positioning:**
- Foundation for future innovation and competitive differentiation
- Platform scalability supporting business growth objectives
- Market leadership in user experience and operational efficiency`

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

      case 'engineering-highlights':
        const engineeringTitle = item.summary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim();
        return `${engineeringTitle}

The project embarked on a challenging journey to address complex technical hurdles and redefine our engineering capabilities. Initially scoped to tackle [specific technical challenge], the project faced significant obstacles including [key obstacles]. Under the leadership of [team leads], and with contributions from [key contributors], the team navigated through technical debt and made pivotal architectural decisions. The collaborative efforts of the engineering team were instrumental in overcoming these challenges, ensuring a robust and scalable solution.

Our engineering team has developed an innovative solution that leverages cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for our customers. This advancement positions us as the industry leader in providing comprehensive, user-centric solutions that drive measurable business outcomes.`

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
    console.log('ContentGenerator: handleChatRefinerContentSelect called with:', newContent)
    console.log('ContentGenerator: Current generatedContent:', generatedContent)
    setGeneratedContent(newContent)
    console.log('ContentGenerator: Updated generatedContent to:', newContent)
    
    // Switch back to generated tab to show the updated content
    setActiveTab('generated')
    
    // Don't close chat refiner - let user continue refining if they want
    // setShowChatRefiner(false)
  }

  const handleChatRefinerClose = () => {
    setShowChatRefiner(false)
    setActiveTab('generated')
  }

  const handleChatHistoryUpdate = useCallback((messages: ChatMessage[]) => {
    setChatHistory(messages)
  }, [])

  // Clear chat history when generating new content
  const generateContentWithHistoryReset = useCallback(async () => {
    setChatHistory([]) // Clear chat history on new generation
    await generateContent()
  }, [generateContent])

  const contentTypeInfo = getContentTypeInfo(contentType)

  useEffect(() => {
    generateContentWithHistoryReset()
  }, [generateContentWithHistoryReset])

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
            chatHistory={chatHistory}
            onChatHistoryUpdate={handleChatHistoryUpdate}
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
            onClick={generateContentWithHistoryReset}
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
                    onClick={generateContentWithHistoryReset}
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
                  chatHistory={chatHistory}
                  onChatHistoryUpdate={handleChatHistoryUpdate}
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