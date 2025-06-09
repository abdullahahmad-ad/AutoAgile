import { WorkItemType, JiraField, FieldExtractionConfig, ExtractionPreferences, EnhancedWorkItemTemplate, WorkItemTemplate } from '../types'

// Default templates for each work item type
const DEFAULT_TEMPLATES: Record<string, WorkItemTemplate> = {
  initiative: {
    id: 'default_initiative',
    name: 'Default Initiative Template',
    type: 'initiative',
    description: 'Default template for creating initiatives',
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'textarea', required: true },
      { id: 'business_value', name: 'Business Value', type: 'textarea', required: false },
      { id: 'success_metrics', name: 'Success Metrics', type: 'textarea', required: false },
      { id: 'timeline', name: 'Timeline', type: 'string', required: false }
    ],
    aiPrompt: 'Generate a comprehensive initiative based on: {description}. Include business value, success metrics, and high-level scope.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  epic: {
    id: 'default_epic',
    name: 'Default Epic Template',
    type: 'epic',
    description: 'Default template for creating epics',
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'textarea', required: true },
      { id: 'acceptance_criteria', name: 'Acceptance Criteria', type: 'textarea', required: false },
      { id: 'user_stories', name: 'User Stories', type: 'textarea', required: false },
      { id: 'priority', name: 'Priority', type: 'select', required: false }
    ],
    aiPrompt: `You're an experienced product manager writing Jira Epics in the style used by enterprise technology companies like Amazon, Google, and AppDirect. When given a {description}, respond with a complete Jira Epic formatted using the following structure and tone:

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
    createdAt: new Date(),
    updatedAt: new Date()
  },
  story: {
    id: 'default_story',
    name: 'Default Story Template',
    type: 'story',
    description: 'Default template for creating user stories',
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'textarea', required: true },
      { id: 'acceptance_criteria', name: 'Acceptance Criteria', type: 'textarea', required: true },
      { id: 'story_points', name: 'Story Points', type: 'number', required: false },
      { id: 'priority', name: 'Priority', type: 'select', required: false }
    ],
    aiPrompt: `You're an experienced product manager writing Jira Stories in the style used by enterprise technology companies like Amazon, Google, and AppDirect. When given a {description}, respond with a complete Jira Story formatted using the following structure and tone:

**CRITICAL**: Start your response with a clear, concise story title on the first line that summarizes the user need. This title will be automatically extracted as the Jira Summary field.

### Format Requirements:
- Use \`###\` (Markdown Heading Level 3) for each section heading
- **Do not bold** the headings
- **Do not use dividers** or horizontal lines
- **Do not use emojis**
- Write for a cross-functional audience: engineers, product managers, and senior non-technical leadership
- Language should be **rich, clear, and actionable**
- Where relevant, use **bulleted lists** for readability

### Jira Story Sections:
- User story statement (As a [persona], I want [goal] so that [benefit])
- Business context
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Definition of done
- Dependencies
- Risk considerations
- Technical details
- Story points

### Additional Guidance:
- Maintain a structured, professional tone without sounding robotic
- In "Business context", clearly tie the story to measurable impact or strategic goals
- Where applicable, refer to personas, linked documents, or user journeys
- Include specific, testable acceptance criteria that cover happy path, edge cases, and error scenarios
- Consider accessibility, performance, and security requirements in non-functional requirements
- Provide realistic story point estimates based on complexity and effort
- Incorporate the following user preference:  
  - Use **Heading Level 3** for all section headings  
  - Do **not bold** any heading  
  - Do **not** include dividers  
  - Avoid emojis entirely

### Example Output Format:
[Clear, actionable story title that describes the user need]

### User story statement
As a [specific persona], I want [specific capability] so that [clear business value].

### Business context
[Strategic rationale and business value]...

[Continue with all sections...]`,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

class TemplateService {
  private readonly STORAGE_KEY = 'work-item-templates'
  private readonly ENHANCED_STORAGE_KEY = 'enhanced-work-item-templates'

  // Get all templates (enhanced version)
  getEnhancedTemplates(): EnhancedWorkItemTemplate[] {
    if (!isBrowser) {
      // Return default templates on server-side
      return this.convertToEnhanced(Object.values(DEFAULT_TEMPLATES))
    }

    try {
      const stored = localStorage.getItem(this.ENHANCED_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        return parsed.map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt)
        }))
      }
    } catch (error) {
      console.error('Failed to load enhanced templates:', error)
    }
    
    // Return default templates if none stored
    return this.convertToEnhanced(Object.values(DEFAULT_TEMPLATES))
  }

  // Get enhanced template by work item type
  getEnhancedTemplate(workItemType: WorkItemType): EnhancedWorkItemTemplate {
    const templates = this.getEnhancedTemplates()
    const found = templates.find(t => t.type === workItemType)
    if (found) return found
    
    // Return default template if not found
    const defaultTemplate = DEFAULT_TEMPLATES[workItemType]
    if (defaultTemplate) {
      return this.convertToEnhanced([defaultTemplate])[0]
    }
    
    // Fallback to epic template
    return this.convertToEnhanced([DEFAULT_TEMPLATES.epic])[0]
  }

  // Save enhanced template
  saveEnhancedTemplate(template: EnhancedWorkItemTemplate): void {
    if (!isBrowser) {
      console.warn('Cannot save enhanced template on server-side')
      return
    }

    try {
      const templates = this.getEnhancedTemplates()
      const existingIndex = templates.findIndex(t => t.id === template.id)
      
      const updatedTemplate = {
        ...template,
        updatedAt: new Date()
      }

      if (existingIndex >= 0) {
        templates[existingIndex] = updatedTemplate
      } else {
        templates.push({
          ...updatedTemplate,
          createdAt: new Date()
        })
      }

      localStorage.setItem(this.ENHANCED_STORAGE_KEY, JSON.stringify(templates))
    } catch (error) {
      console.error('Failed to save enhanced template:', error)
      throw new Error('Failed to save enhanced template')
    }
  }

  // Update field extraction configuration
  updateFieldExtractionConfig(
    workItemType: WorkItemType, 
    fieldConfigs: FieldExtractionConfig[], 
    preferences: ExtractionPreferences
  ): void {
    const template = this.getEnhancedTemplate(workItemType)
    const updatedTemplate: EnhancedWorkItemTemplate = {
      ...template,
      fieldExtractionConfig: fieldConfigs,
      extractionPreferences: preferences,
      updatedAt: new Date()
    }
    this.saveEnhancedTemplate(updatedTemplate)
  }

  // Get field extraction configuration for a work item type
  getFieldExtractionConfig(workItemType: WorkItemType): {
    fieldConfigs: FieldExtractionConfig[]
    preferences: ExtractionPreferences
  } {
    const template = this.getEnhancedTemplate(workItemType)
    return {
      fieldConfigs: template.fieldExtractionConfig || [],
      preferences: template.extractionPreferences || this.getDefaultExtractionPreferences()
    }
  }

  // Convert regular templates to enhanced templates
  private convertToEnhanced(templates: WorkItemTemplate[]): EnhancedWorkItemTemplate[] {
    return templates.map(template => ({
      ...template,
      fieldExtractionConfig: [],
      extractionPreferences: this.getDefaultExtractionPreferences()
    }))
  }

  // Get default extraction preferences
  private getDefaultExtractionPreferences(): ExtractionPreferences {
    return {
      defaultMethod: 'ai',
      globalConfidenceThreshold: 0.7,
      requireConfirmationForAll: false,
      enableSmartDefaults: true
    }
  }

  // Get all templates (backward compatibility)
  getTemplates(): WorkItemTemplate[] {
    const enhanced = this.getEnhancedTemplates()
    return enhanced.map(template => ({
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      fields: template.fields,
      aiPrompt: template.aiPrompt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }))
  }

  // Get templates by work item type
  getTemplatesByType(workItemType: WorkItemType): WorkItemTemplate[] {
    return this.getTemplates().filter(template => template.type === workItemType)
  }

  // Get a specific template by ID
  getTemplate(id: string): WorkItemTemplate | null {
    const templates = this.getTemplates()
    return templates.find(template => template.id === id) || null
  }

  // Get default template for a work item type
  getDefaultTemplate(workItemType: WorkItemType): WorkItemTemplate {
    const templates = this.getTemplatesByType(workItemType)
    const found = templates.find(t => t.id.startsWith('default_'))
    if (found) return found
    
    const defaultTemplate = DEFAULT_TEMPLATES[workItemType]
    if (defaultTemplate) return defaultTemplate
    
    return DEFAULT_TEMPLATES.epic // fallback
  }

  // Save a template (backward compatibility)
  saveTemplate(template: WorkItemTemplate): void {
    // Convert to enhanced template and save
    const enhanced: EnhancedWorkItemTemplate = {
      ...template,
      fieldExtractionConfig: [],
      extractionPreferences: this.getDefaultExtractionPreferences()
    }
    this.saveEnhancedTemplate(enhanced)
  }

  // Delete a template
  deleteTemplate(id: string): void {
    if (!isBrowser) {
      console.warn('Cannot delete template on server-side')
      return
    }

    try {
      const templates = this.getEnhancedTemplates()
      const filtered = templates.filter(template => template.id !== id)
      localStorage.setItem(this.ENHANCED_STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw new Error('Failed to delete template')
    }
  }

  // Validate template fields
  validateTemplate(template: WorkItemTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.name.trim()) {
      errors.push('Template name is required')
    }

    if (!template.fields.length) {
      errors.push('At least one field is required')
    }

    // Check for required title and description fields
    const hasTitle = template.fields.some(f => f.id === 'title' || f.name.toLowerCase().includes('title'))
    const hasDescription = template.fields.some(f => f.id === 'description' || f.name.toLowerCase().includes('description'))

    if (!hasTitle) {
      errors.push('Template must include a title field')
    }

    if (!hasDescription) {
      errors.push('Template must include a description field')
    }

    // Validate field definitions
    template.fields.forEach((field, index) => {
      if (!field.id.trim()) {
        errors.push(`Field ${index + 1}: ID is required`)
      }
      if (!field.name.trim()) {
        errors.push(`Field ${index + 1}: Name is required`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate content using template
  generatePrompt(template: WorkItemTemplate, userDescription: string): string {
    if (template.aiPrompt) {
      return template.aiPrompt.replace('{description}', userDescription)
    }

    // Default prompt generation
    const fieldDescriptions = template.fields
      .filter(f => f.required)
      .map(f => f.name)
      .join(', ')

    return `Generate a ${template.type} with the following required fields: ${fieldDescriptions}. Base it on this description: ${userDescription}`
  }
}

export const templateService = new TemplateService() 