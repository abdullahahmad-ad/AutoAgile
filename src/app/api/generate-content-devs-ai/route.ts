import { NextRequest, NextResponse } from 'next/server'
import { GenerateContentRequest, GenerateContentResponse } from '../../../types'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateContentRequest = await request.json()
    const { type, description } = body

    // Validate input
    if (!type || !description?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type and description are required' 
        } as GenerateContentResponse,
        { status: 400 }
      )
    }

    // For devs.ai, we return a special response that indicates client-side processing is needed
    return NextResponse.json({
      success: true,
      content: '', // Will be filled by client-side devs.ai integration
      metadata: {
        model: 'devs-ai',
        requiresClientSideProcessing: true,
        prompt: buildDevsAIPrompt(type, description)
      }
    } as GenerateContentResponse & { metadata: { requiresClientSideProcessing: boolean; prompt: string } })

  } catch (error) {
    console.error('Error preparing devs.ai request:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      } as GenerateContentResponse,
      { status: 500 }
    )
  }
}

function buildDevsAIPrompt(type: string, description: string): string {
  const baseContext = `Create a professional ${type} for a software development team based on this description: "${description}"`

  switch (type) {
    case 'initiative':
      return `${baseContext}

Generate a comprehensive initiative that includes:
- Clear title and overview
- Business objectives and value proposition
- Success metrics and KPIs
- Timeline with quarterly milestones
- Dependencies and requirements
- Risk assessment and mitigation strategies
- Resource requirements

Format the output in Markdown with clear sections and bullet points. Make it strategic, business-focused, and spanning multiple quarters.`

    case 'epic':
      return `${baseContext}

Generate a detailed epic that includes:
- Clear title and description
- User value and business impact
- Technical approach and architecture considerations
- Acceptance criteria (checkbox format)
- Story point estimate (use Fibonacci: 1,2,3,5,8,13,21,34)
- List of constituent user stories
- Definition of done
- Dependencies and assumptions

Format the output in Markdown with clear sections. Make it feature-focused and spanning multiple sprints.`

    case 'story':
      return `${baseContext}

Generate a comprehensive user story that includes:
- User story in "As a [user], I want [goal] so that [benefit]" format
- Detailed acceptance criteria in Given/When/Then format (at least 3 scenarios)
- Technical implementation notes
- Story point estimate (use Fibonacci: 1,2,3,5,8,13)
- Definition of done checklist
- Edge cases and error handling considerations

Format the output in Markdown with clear sections. Follow INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable).`

    default:
      return `${baseContext}

Generate a well-structured ${type} with appropriate sections and professional formatting.`
  }
} 