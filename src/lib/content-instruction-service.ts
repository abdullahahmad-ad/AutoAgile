import { AIInstructionTemplate, ContentType } from '../types'

const DEFAULT_INSTRUCTIONS = {
  'quarterly-presentation': `You are creating compelling slide deck content for a quarterly business presentation to senior leadership. You must extract and utilize the provided work item data to create content with an answer-first approach that is digestible for executives.

CRITICAL: You must extract and use the following from the work item data:
1. Problem Description - The business problem or limitation being addressed
2. Solution Description - How the feature/epic solves the problem  
3. Business Case - The value proposition and impact (extract from context or infer from problem/solution)

REQUIRED OUTPUT FORMAT:
Create structured content with clear headings and bullet points suitable for slides. Use an answer-first approach - lead with the value and impact, then explain the why and how.

CONTENT STRUCTURE:
# [Clean Feature Title]

## Executive Summary (Answer First)
- Lead with the key business value and impact this delivers
- State the strategic importance and competitive advantage
- Quantify benefits where possible (use realistic estimates if specific metrics aren't provided)

## Strategic Context (The Why)
- Clearly articulate the business problem from the Problem Description
- Explain market pressures, customer needs, or operational challenges
- Connect to broader company objectives and competitive positioning

## Solution Approach (The How)  
- Summarize the Solution Description in business terms
- Focus on capabilities delivered, not technical implementation
- Highlight key differentiators and innovation aspects

## Business Impact & Success Metrics
- Revenue implications and cost savings potential
- Operational efficiency gains and process improvements
- Customer satisfaction and retention benefits
- Risk mitigation and compliance advantages

## Timeline & Resource Allocation
- Key milestones aligned to business priorities
- Resource requirements and dependencies
- Risk mitigation strategies

## Next Quarter Outlook
- Future enhancements and roadmap alignment
- Scaling opportunities and market expansion potential

TONE: Professional, confident, and results-focused. Suitable for C-level executives who need clear, actionable insights.`,

  'customer-webinar': `Generate engaging webinar content for customer-facing presentation. Include:
- Feature overview and benefits
- Customer pain points addressed
- Live demo talking points
- Use case scenarios
- Customer success stories (placeholder)
- Q&A preparation points
- Call-to-action items

Create content that is customer-friendly, avoids technical jargon, and focuses on value proposition.`,

  'feature-newsletter': `You are writing newsletter content for a feature announcement. You must follow this EXACT format with NO headings, NO markdown formatting, and NO numbered lists:

REQUIRED OUTPUT FORMAT:
[Feature Title - max 12 words]

[The Why paragraph - up to 150 words (80 recommended) describing the problem/limitation being addressed. Use professional, user-friendly tone appropriate for enterprise SaaS audience. Focus on business pain or user friction this solves.]

[The How paragraph - up to 150 words (80 recommended) explaining how the feature solves the problem. Emphasize value/control it gives customers, how it fits into the platform, and outcomes it enables. Stay solution-focused.]

IMPORTANT: 
- Do NOT use any headings like "# Title" or "## The Why" 
- Do NOT use numbered lists like "1. Title:"
- Do NOT use markdown formatting
- Just provide the title followed by two paragraphs
- Keep tone informative yet exciting, suitable for both technical and non-technical audiences
- Use AppDirect-style professional phrasing`,

  'technical-documentation': `Create comprehensive technical documentation that extracts and utilizes work item data. Focus on:
- Technical specifications and architecture
- Implementation details and requirements
- Integration points and dependencies
- Testing strategies and acceptance criteria
- Performance considerations and constraints
- Security and compliance requirements

Extract problem and solution descriptions from the work item to provide context for technical decisions.`,

  'stakeholder-update': `Generate stakeholder update content that leverages work item data. Include:
- Project status and progress summary
- Key accomplishments and milestones
- Current focus areas and next steps
- Risk assessment and mitigation strategies
- Resource allocation and timeline updates
- Success metrics and performance indicators

Use the problem and solution descriptions to provide context for project decisions and priorities.`
}

class ContentInstructionService {
  private readonly STORAGE_KEY = 'content-instruction-templates'

  getDefaultInstructions(contentType: ContentType): string {
    return DEFAULT_INSTRUCTIONS[contentType]
  }

  getTemplate(contentType: ContentType): AIInstructionTemplate {
    const templates = this.getAllTemplates()
    const existing = templates.find(t => t.contentType === contentType)
    
    if (existing) {
      return existing
    }

    // Return default template
    return {
      id: `default-${contentType}`,
      contentType,
      name: this.getContentTypeName(contentType),
      defaultInstructions: DEFAULT_INSTRUCTIONS[contentType],
      userInstructions: undefined,
      isCustomized: false,
      updatedAt: new Date()
    }
  }

  saveTemplate(template: AIInstructionTemplate): void {
    const templates = this.getAllTemplates()
    const existingIndex = templates.findIndex(t => t.contentType === template.contentType)
    
    const updatedTemplate = {
      ...template,
      updatedAt: new Date(),
      isCustomized: Boolean(template.userInstructions)
    }

    if (existingIndex >= 0) {
      templates[existingIndex] = updatedTemplate
    } else {
      templates.push(updatedTemplate)
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates))
  }

  resetToDefault(contentType: ContentType): AIInstructionTemplate {
    const templates = this.getAllTemplates()
    const filteredTemplates = templates.filter(t => t.contentType !== contentType)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTemplates))
    
    return this.getTemplate(contentType)
  }

  getAllTemplates(): AIInstructionTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const templates = JSON.parse(stored)
      return templates.map((t: AIInstructionTemplate) => ({
        ...t,
        updatedAt: new Date(t.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to load instruction templates:', error)
      return []
    }
  }

  getActiveInstructions(contentType: ContentType): string {
    const template = this.getTemplate(contentType)
    return template.userInstructions || template.defaultInstructions
  }

  private getContentTypeName(contentType: ContentType): string {
    switch (contentType) {
      case 'quarterly-presentation':
        return 'Quarterly Presentation'
      case 'customer-webinar':
        return 'Customer Webinar'
      case 'feature-newsletter':
        return 'Feature Newsletter'
      default:
        return contentType
    }
  }
}

export const contentInstructionService = new ContentInstructionService() 