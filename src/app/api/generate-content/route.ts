import { NextRequest, NextResponse } from 'next/server'
import { getAIService } from '../../../lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const { prompt, contentType, workItem, useDevsAI, apiToken, context } = await request.json()

    if (!prompt || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and contentType' },
        { status: 400 }
      )
    }

    // If DevS.ai is requested and API token is provided, use real AI
    if (useDevsAI && apiToken) {
      try {
        // Use DevS.ai API through the proxy - use relative URL for server-side requests
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : `https://${process.env.VERCEL_URL || 'localhost:3000'}`
        
        const devsAIResponse = await fetch(`${baseUrl}/api/devs-ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiToken,
            requestBody: {
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert product manager and technical writer who creates professional, detailed content for business communications. Generate comprehensive, well-structured content that follows industry best practices.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              model: 'gpt-4',
              stream: false
            }
          })
        })

        if (devsAIResponse.ok) {
          const devsAIData = await devsAIResponse.json()
          const aiContent = devsAIData.choices?.[0]?.message?.content || 'No content generated'
          
          return NextResponse.json({
            success: true,
            content: aiContent,
            metadata: {
              model: 'devs-ai-gpt-4',
              tokensUsed: devsAIData.usage?.total_tokens || 0,
              generatedAt: new Date().toISOString()
            }
          })
        } else {
          console.error('DevS.ai API error:', await devsAIResponse.text())
          // Fall back to mock content if DevS.ai fails
        }
      } catch (error) {
        console.error('DevS.ai integration error:', error)
        // Fall back to mock content if DevS.ai fails
      }
    }

    // Try to use real AI service if available (OpenAI/Anthropic)
    try {
      const aiService = getAIService()
      const availableProviders = aiService.getAvailableProviders()
      
      if (availableProviders.length > 0) {
        console.log('Using real AI service with providers:', availableProviders)
        const preferredModel = context?.preferredModel || 'auto'
        
        // Map our AI model types to the AI service types
        let aiProvider: 'openai' | 'anthropic' | 'devs-ai' = 'openai'
        if (preferredModel === 'anthropic' && availableProviders.includes('anthropic')) {
          aiProvider = 'anthropic'
        } else if (preferredModel === 'openai' && availableProviders.includes('openai')) {
          aiProvider = 'openai'
        } else {
          // Use the first available provider
          aiProvider = availableProviders[0] as 'openai' | 'anthropic'
        }
        
        const result = await aiService.generateContent(
          contentType as any, // Cast to WorkItemType
          prompt,
          { model: aiProvider }
        )
        
        return NextResponse.json({
          success: true,
          content: result.content,
          metadata: {
            model: `${result.provider}-${result.model}`,
            tokensUsed: 0, // Not available from our AI service
            generatedAt: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Real AI service error:', error)
      // Fall back to mock content
    }
    
    // Simulate API delay for mock content
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock content generation based on content type and actual user prompt
    const mockContent = generateMockContent(contentType, workItem, prompt)

    return NextResponse.json({
      success: true,
      content: mockContent,
      metadata: {
        model: 'mock-ai',
        tokensUsed: 150,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

function generateMockContent(contentType: string, workItem: unknown, userPrompt: string): string {
  // Extract work item details
  const workItemKey = typeof workItem === 'string' ? workItem : (workItem as any)?.key || 'Unknown'
  const workItemSummary = typeof workItem === 'object' ? (workItem as any)?.summary || 'Unknown Feature' : 'Unknown Feature'
  const workItemDescription = typeof workItem === 'object' ? (workItem as any)?.description || userPrompt : userPrompt
  const workItemProject = typeof workItem === 'object' ? (workItem as any)?.project || 'Generated Content' : 'Generated Content'
  const workItemType = typeof workItem === 'object' ? (workItem as any)?.issueType || contentType : contentType
  
  // Use the work item description as the primary source, not the user prompt which contains instructions
  const actualWorkItemDescription = extractTextFromDescription(workItemDescription)
  const { problemDescription, solutionDescription } = extractProblemAndSolution(actualWorkItemDescription)
  
  // Generate a title from the work item summary
  const generateTitle = (summary: string): string => {
    // Clean up the summary by removing project prefixes and quarter info
    const cleanSummary = summary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim()
    // Take first 8-10 words for a concise title
    const words = cleanSummary.split(' ').slice(0, 10).join(' ')
    return words || 'Feature Update'
  }
  
  const generatedTitle = generateTitle(workItemSummary)
  
  switch (contentType) {
    case 'feature-newsletter':
      return `${generatedTitle}

${problemDescription || 'Current market demands require enhanced platform capabilities to address evolving customer needs and competitive pressures. Users have consistently requested improved functionality that streamlines their daily workflows and reduces operational complexity.'}

${solutionDescription || 'Our engineering team has developed an innovative solution that leverages cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for our customers.'}`

    case 'quarterly-presentation':
      return `# ${generatedTitle}

## Executive Summary (Answer First)

This initiative delivers critical business value by addressing key operational challenges and positioning us for sustained competitive advantage. The implementation will generate immediate ROI through improved efficiency, enhanced customer satisfaction, and reduced operational overhead.

**Key Value Delivered:**
- Projected 15-20% improvement in customer retention rates
- Estimated $2.3M annual cost savings through operational efficiency gains
- Enhanced competitive positioning and market differentiation
- Reduced support overhead by 35-40% through improved user experience

## Strategic Context (The Why)

${problemDescription || 'Market dynamics and customer feedback have highlighted urgent needs for enhanced platform capabilities. Current operational challenges are impacting user satisfaction and limiting our ability to capture market opportunities. Addressing these requirements is critical for maintaining competitive advantage and supporting business growth objectives.'}

**Business Drivers:**
- Customer demand for improved functionality and user experience
- Competitive pressure requiring platform modernization
- Operational inefficiencies impacting cost structure and scalability
- Strategic alignment with company growth and market expansion goals

## Solution Approach (The How)

${solutionDescription || 'Our engineering team has developed an innovative solution leveraging cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for customers.'}

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
      return `# Introducing ${generatedTitle}

## Welcome & Agenda
Welcome to our exclusive webinar showcasing the latest innovation in our product suite.

## The Challenge We're Solving
${problemDescription}

## Feature Overview
${generatedTitle} is designed to:
- Streamline your workflow
- Improve efficiency
- Enhance user experience
- Provide better insights

## Live Demo Highlights
Let's explore the key capabilities:

### Core Functionality
${solutionDescription}

### Advanced Features
- Customizable dashboards
- Automated reporting
- Enhanced security measures

## Customer Success Story
"This feature has transformed how we approach our daily operations" - [Customer Name]

## Getting Started
- Available in your dashboard starting next quarter
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

    case 'story':
      return `# ${generatedTitle}

## User Story
As a user, I want to ${problemDescription.toLowerCase()} so that I can achieve better outcomes and improved efficiency.

## Description
${problemDescription}

## Solution Approach
${solutionDescription}

## Acceptance Criteria
- [ ] The feature is accessible to authorized users
- [ ] All functionality works as described in the requirements
- [ ] Performance meets established benchmarks
- [ ] Error handling provides clear user feedback
- [ ] Integration with existing systems is seamless

## Technical Notes
- Implementation should follow established coding standards
- Comprehensive testing required before deployment
- Documentation must be updated to reflect new functionality
- Security review required for any data handling components

## Definition of Done
- [ ] Code review completed
- [ ] Unit tests written and passing
- [ ] Integration tests completed
- [ ] Documentation updated
- [ ] Security review passed
- [ ] Performance testing completed
- [ ] Stakeholder approval received

## Story Points
Estimated effort: 8 points

---
*Generated from user requirements on ${new Date().toISOString()}*`

    case 'epic':
      return `# ${generatedTitle}

## Epic Overview
${problemDescription}

## Business Value
This epic addresses critical user needs and business requirements that will drive significant value through improved user experience and operational efficiency.

## Solution Summary
${solutionDescription}

## User Stories
This epic encompasses the following user stories:
- User authentication and authorization
- Core feature implementation
- Data management and processing
- User interface enhancements
- Integration with external systems

## Acceptance Criteria
- [ ] All constituent user stories are completed
- [ ] End-to-end testing validates the complete workflow
- [ ] Performance requirements are met
- [ ] Security standards are implemented
- [ ] Documentation is comprehensive and up-to-date

## Dependencies
- API infrastructure updates
- Database schema modifications
- Third-party service integrations
- User interface component library updates

## Success Metrics
- User adoption rate: Target 70% within 60 days
- Performance improvement: 25% faster task completion
- Error reduction: 40% fewer support tickets
- User satisfaction: +20 points on satisfaction surveys

## Timeline
- Planning: 2 weeks
- Development: 8-12 weeks
- Testing: 3 weeks
- Deployment: 1 week

---
*Generated from user requirements on ${new Date().toISOString()}*`

    case 'initiative':
      return `# ${generatedTitle}

## Initiative Overview
${problemDescription}

## Strategic Alignment
This initiative directly supports our organizational goals by addressing key market opportunities and customer needs that will drive sustainable competitive advantage.

## Business Case
${solutionDescription}

## Objectives
- Enhance user experience and satisfaction
- Improve operational efficiency and reduce costs
- Strengthen market position and competitive advantage
- Drive revenue growth through improved capabilities

## Key Results
- 25% improvement in user engagement metrics
- 30% reduction in operational overhead
- 15% increase in customer retention
- $2M+ annual revenue impact

## Epics and Features
This initiative includes the following major components:
1. **Core Platform Enhancement** - Foundational improvements
2. **User Experience Optimization** - Interface and workflow improvements
3. **Integration and Automation** - System connectivity and process automation
4. **Analytics and Reporting** - Data insights and business intelligence

## Success Criteria
- All planned epics delivered on schedule
- Performance benchmarks achieved
- User adoption targets met
- ROI objectives realized

## Timeline
- Q1: Planning and architecture
- Q2: Core development and testing
- Q3: Integration and optimization
- Q4: Deployment and adoption

## Resource Requirements
- Engineering: 12-15 FTE
- Design: 3-4 FTE
- Product Management: 2-3 FTE
- QA: 4-5 FTE

---
*Generated from user requirements on ${new Date().toISOString()}*`

    default:
      return `# ${generatedTitle}

## Overview
${problemDescription}

## Solution
${solutionDescription}

## Implementation Notes
This ${contentType} addresses the specified requirements through a comprehensive approach that balances user needs with technical feasibility and business objectives.

## Next Steps
- Detailed planning and estimation
- Technical design and architecture review
- Implementation roadmap development
- Stakeholder alignment and approval

---
*Generated from user requirements on ${new Date().toISOString()}*`
  }
}

function extractTextFromDescription(description: unknown): string {
  if (typeof description === 'string') {
    return description
  }
  
  if (description && typeof description === 'object' && (description as any).content) {
    const extractText = (node: any): string => {
      if (node.text) {
        return node.text
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ')
      }
      return ''
    }
    
    return (description as any).content.map(extractText).join('\n').trim()
  }
  
  return 'No description available'
}

function extractProblemAndSolution(description: string): { problemDescription: string; solutionDescription: string } {
  const fullText = description.trim()
  
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
