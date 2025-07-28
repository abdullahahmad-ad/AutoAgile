import { NextRequest, NextResponse } from 'next/server'
import { getAIService } from '../../../lib/ai-service'

export async function POST(request: NextRequest) {
  console.log(`[AI-DEBUG] ${new Date().toISOString()} - /api/generate-content POST request received`)
  
  try {
    const body = await request.json()
    const { prompt, contentType, workItem, useDevsAI, apiToken, context } = body

    console.log(`[AI-DEBUG] ${new Date().toISOString()} - Request parsed`, {
      contentType,
      useDevsAI,
      hasApiToken: !!apiToken,
      promptLength: prompt?.length || 0,
      preferredModel: context?.preferredModel,
      template: context?.template
    })

    console.log('🚀 Generate content API called with:')
    console.log('📋 Content Type:', contentType)
    console.log('📊 Work Item:', workItem)
    console.log('🔧 Use DevS.ai:', useDevsAI)
    console.log('🔑 Has API Token:', !!apiToken)
    console.log('📝 Context:', context)

    // Validate required fields
    if (!prompt || !contentType) {
      console.error(`[AI-DEBUG] ${new Date().toISOString()} - Missing required fields`, {
        hasPrompt: !!prompt,
        contentType
      })
      return NextResponse.json({
        success: false,
        error: 'Prompt and content type are required'
      }, { status: 400 })
    }

    // For engineering highlights, enhance workItem with linked stories if it's an epic
    // Do this BEFORE any AI generation (DevS.ai or mock) so all paths have access to linked stories
    let enhancedWorkItem = workItem
    let enhancedPrompt = prompt
    if (contentType === 'engineering-highlights' && workItem && typeof workItem === 'object') {
      const workItemObj = workItem as any
      console.log('🔍 Checking if work item is an epic for linked stories fetch')
      console.log('📊 Work item type:', workItemObj.issueType)

      if (workItemObj.issueType?.toLowerCase() === 'epic' && workItemObj.key) {
        console.log('🎯 Epic detected, fetching linked stories...')
        try {
          const linkedStoriesResponse = await fetch(`${request.nextUrl.origin}/api/jira/get-linked-stories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jiraConnection: context?.jiraConnection,
              epicKey: workItemObj.key
            }),
          })

          if (linkedStoriesResponse.ok) {
            const linkedStoriesResult = await linkedStoriesResponse.json()
            console.log('✅ Successfully fetched linked stories:', linkedStoriesResult.totalCount)
            console.log('📋 Linked stories details:', linkedStoriesResult.linkedStories)

            // Enhance the work item with linked stories
            enhancedWorkItem = {
              ...workItemObj,
              linkedStories: linkedStoriesResult.linkedStories
            }

            // Update the prompt to include linked stories information for DevS.ai
            const storyDetails = linkedStoriesResult.linkedStories.map((story: any) =>
                `- ${story.summary} (Assignee: ${story.assignee || 'Unassigned'}, Status: ${story.status}, Type: ${story.issueType})`
            ).join('\n')

            enhancedPrompt = `${prompt}

IMPORTANT: This is an EPIC with the following linked stories/tasks that should be referenced in the engineering highlights:

**Linked Stories/Tasks:**
${storyDetails}

Please ensure the generated engineering highlights specifically mention and reference these actual stories/tasks with their real summaries and assignees, not generic placeholder content.`

            console.log('📝 Enhanced prompt with linked stories for AI generation')
            console.log('🔗 Story details added to prompt:', storyDetails)
          } else {
            console.log('⚠️ Failed to fetch linked stories, proceeding without them')
          }
        } catch (error) {
          console.log('⚠️ Error fetching linked stories:', error)
        }
      }
    }


    // Handle DevS.ai requests
    if (useDevsAI && apiToken) {
      console.log(`[AI-DEBUG] ${new Date().toISOString()} - Processing DevS.ai request`)
      
      try {
        // Forward to DevS.ai proxy
        const devsAIResponse = await fetch(`${request.nextUrl.origin}/api/devs-ai-proxy`, {
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
                  content: 'You are an expert product manager and technical writer who creates professional, detailed content. Generate comprehensive, well-structured content that follows industry best practices.'
                },
                {
                  role: 'user',
                  content: enhancedPrompt
                }
              ],
              model: 'gpt-4',
              stream: false
            }
          }),
        })

        console.log('🤖 DevS.ai prompt being sent:')
        console.log('📤 Prompt content:', enhancedPrompt)

        if (devsAIResponse.ok) {
          const devsAIData = await devsAIResponse.json()
          const content = devsAIData.choices?.[0]?.message?.content || 'No content generated'
          
          console.log(`[AI-DEBUG] ${new Date().toISOString()} - DevS.ai response successful`, {
            contentLength: content.length,
            model: 'gpt-4'
          })
          
          return NextResponse.json({
            success: true,
            content,
            metadata: {
              model: 'devs-ai-gpt-4',
              tokensUsed: 0,
              generatedAt: new Date().toISOString()
            }
          })
        } else {
          console.error(`[AI-DEBUG] ${new Date().toISOString()} - DevS.ai API failed`, {
            status: devsAIResponse.status,
            statusText: devsAIResponse.statusText
          })
          throw new Error(`DevS.ai API failed: ${devsAIResponse.status}`)
        }
      } catch (error) {
        console.error(`[AI-DEBUG] ${new Date().toISOString()} - DevS.ai request failed:`, error)
        // Fall back to other providers
      }
    }

    // Try real AI services if available
    try {
      const aiService = getAIService()
      if (aiService.isConfigured()) {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Using real AI service`, {
          availableProviders: aiService.getAvailableProviders(),
          preferredModel: context?.preferredModel
        })
        
        // Determine which provider to use
        const availableProviders = aiService.getAvailableProviders()
        const preferredModel = context?.preferredModel || 'auto'
        
        let aiProvider: 'openai' | 'anthropic' | 'devs-ai' = 'openai'
        if (preferredModel === 'anthropic' && availableProviders.includes('anthropic')) {
          aiProvider = 'anthropic'
        } else if (preferredModel === 'openai' && availableProviders.includes('openai')) {
          aiProvider = 'openai'
        } else {
          // Use the first available provider
          aiProvider = availableProviders[0] as 'openai' | 'anthropic'
        }
        
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Selected AI provider: ${aiProvider}`)
        
        const result = await aiService.generateContent(
          contentType as any, // Cast to WorkItemType
            enhancedPrompt,
          { model: aiProvider }
        )
        
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - AI service completed`, {
          provider: result.provider,
          model: result.model,
          contentLength: result.content.length
        })
        
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
      console.error(`[AI-DEBUG] ${new Date().toISOString()} - Real AI service error:`, error)
      // Fall back to mock content
    }
    
    // Simulate API delay for mock content
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log(`[AI-DEBUG] ${new Date().toISOString()} - Falling back to mock content`, {
      contentType,
      workItemType: workItem?.issueType
    })

    // Mock content generation based on content type and actual user prompt
    const mockContent = generateMockContent(contentType, enhancedWorkItem, enhancedPrompt)

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
    console.error(`[AI-DEBUG] ${new Date().toISOString()} - Content generation error:`, error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
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
  
  // Generate a title from the work item summary in the required format
  const generateTitle = (summary: string): string => {
    // Clean up the summary by removing project prefixes and quarter info
    const cleanSummary = summary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim()
    // Take first 8-10 words for a concise title
    const words = cleanSummary.split(' ').slice(0, 8).join(' ') || 'Feature Update'
    
    // Generate current quarter in the required format
    const currentYear = new Date().getFullYear()
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
    const quarterStr = `${currentYear}Q${currentQuarter}`
    
    return `${quarterStr} - [AC] - ${words}`
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

### Problem description
${problemDescription}

### Solution description
${solutionDescription}

### Scope
This epic encompasses the following capabilities:
- Core functionality implementation and user interface
- Data processing and management systems
- Integration with existing platform components
- User authentication and authorization features
- Quality assurance and testing frameworks

### Out of scope
- Advanced analytics and reporting features (future epic)
- Mobile application development (separate initiative)
- Third-party integrations beyond core requirements
- Legacy system migration (handled by infrastructure team)

### Expected launch timeline
- **Planning and Design**: 2 weeks
- **Core Development**: 8-10 weeks  
- **Integration and Testing**: 3 weeks
- **Deployment and Rollout**: 1 week
- **Total Duration**: 14-16 weeks

### Business case
This epic addresses critical user needs and business requirements that will drive significant value through improved user experience and operational efficiency. Expected outcomes include:
- User adoption rate: Target 70% within 60 days
- Performance improvement: 25% faster task completion  
- Error reduction: 40% fewer support tickets
- User satisfaction: +20 points on satisfaction surveys
- Estimated ROI: $500K annually through efficiency gains

### Dependencies
- API infrastructure updates and database schema modifications
- User interface component library updates
- Third-party service integrations and authentication systems
- Quality assurance framework and testing infrastructure
- Documentation and training material development

### Definition of done/Acceptance criteria
- [ ] All constituent user stories are completed and tested
- [ ] End-to-end testing validates the complete workflow
- [ ] Performance requirements are met (sub-2 second response times)
- [ ] Security standards are implemented and validated
- [ ] Documentation is comprehensive and up-to-date
- [ ] User acceptance testing completed successfully
- [ ] Production deployment executed without issues

### Test plan
- **Unit Testing**: Comprehensive coverage for all new components
- **Integration Testing**: Validate system interactions and data flow
- **Performance Testing**: Load testing under expected usage patterns
- **Security Testing**: Penetration testing and vulnerability assessment
- **User Acceptance Testing**: Real-world scenario validation with stakeholders
- **Regression Testing**: Ensure existing functionality remains intact

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

    case 'engineering-highlights':
      console.log('🔍 Engineering highlights case triggered on server');
      console.log('📊 Work item data:', { key: workItemKey, summary: workItemSummary, type: workItemType });

      const engineeringTitle = workItemSummary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim();
      console.log('📝 Extracted title:', engineeringTitle);

      // Use the linked stories that were fetched and added to workItem
      const linkedStories = (workItem as any)?.linkedStories || [];
      console.log('🔗 Linked stories found:', linkedStories);
      console.log('📈 Number of linked stories:', linkedStories.length);

      const storyDetails = linkedStories.length > 0
          ? linkedStories.map((story: any) => `- **${story.summary}** (Assignee: ${story.assignee || 'Unassigned'})`).join('\n')
          : '- No linked stories found for this epic';

      console.log('✅ Generated story details:', storyDetails);

      return `${engineeringTitle}

The project embarked on a challenging journey to address complex technical hurdles and redefine our engineering capabilities. Initially scoped to tackle [specific technical challenge], the project faced significant obstacles including [key obstacles]. Under the leadership of [team leads], and with contributions from [key contributors], the team navigated through technical debt and made pivotal architectural decisions. The collaborative efforts of the engineering team were instrumental in overcoming these challenges, ensuring a robust and scalable solution.

**Linked Stories/Tasks:**
${storyDetails}

Our engineering team has developed an innovative solution that leverages cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for our customers. This advancement positions us as the industry leader in providing comprehensive, user-centric solutions that drive measurable business outcomes.`

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
