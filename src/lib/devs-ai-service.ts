// DevS.ai API Service for handling REST API communication
export interface DevsAIConfig {
  apiToken: string
  baseUrl?: string
}

export interface DevsAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DevsAICompletionRequest {
  messages: DevsAIMessage[]
  model: string
  stream?: boolean
  flowOverride?: object
  tools?: object[]
}

export interface DevsAICompletionResponse {
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  chatId?: string
}

export class DevsAIService {
  private static instance: DevsAIService
  private config: DevsAIConfig | null = null
  private readonly baseUrl = 'https://devs.ai'

  private constructor() {}

  static getInstance(): DevsAIService {
    if (!DevsAIService.instance) {
      DevsAIService.instance = new DevsAIService()
    }
    return DevsAIService.instance
  }

  // Initialize the service with API token
  initialize(apiToken: string): void {
    this.config = {
      apiToken,
      baseUrl: this.baseUrl
    }
    
    // Save connection to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('devs-ai-connection', JSON.stringify({ apiToken }))
    }
  }

  // Load connection from localStorage
  loadSavedConnection(): DevsAIConfig | null {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devs-ai-connection')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.apiToken) {
            return {
              apiToken: parsed.apiToken,
              baseUrl: this.baseUrl
            }
          }
        } catch (error) {
          console.error('Failed to parse saved DevS.ai connection:', error)
        }
      }
    }
    return null
  }

  // Check if the service is configured with API token
  isConfigured(): boolean {
    return this.config !== null && this.config.apiToken.length > 0
  }

  // Remove connection and clear configuration
  clearConnection(): void {
    this.config = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('devs-ai-connection')
    }
  }

  // Generate content using DevS.ai chat completions API via server proxy
  async generateContent(prompt: string, model: string = 'gpt-4'): Promise<string> {
    if (!this.config) {
      throw new Error('DevS.ai service is not configured. Please provide API token.')
    }

    const messages: DevsAIMessage[] = [
      {
        role: 'system',
        content: 'You are an expert product manager and technical writer who creates professional, detailed Jira work items. Generate comprehensive, well-structured content that follows industry best practices.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const requestBody: DevsAICompletionRequest = {
      messages,
      model,
      stream: false
    }

    try {
      // Use our server-side proxy to avoid CORS issues
      const response = await fetch('/api/devs-ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiToken: this.config.apiToken,
          requestBody
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `DevS.ai API error: ${response.status} ${response.statusText}`
        
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error) {
            errorMessage = `DevS.ai API error: ${errorData.error}`
          }
        } catch {
          // If error response is not JSON, use the status text
        }
        
        throw new Error(errorMessage)
      }

      const data: DevsAICompletionResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from DevS.ai')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('DevS.ai API error:', error)
      throw error
    }
  }

  // Test the connection by making a simple request via server proxy
  async testConnection(apiToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/devs-ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiToken,
          requestBody: {
            messages: [
              {
                role: 'user',
                content: 'Hello, this is a test message.'
              }
            ],
            model: 'gpt-3.5-turbo'
          }
        })
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        let errorMessage = `API test failed: ${response.status} ${response.statusText}`
        
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // If error response is not JSON, use the status text
        }
        
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error occurred' 
      }
    }
  }

  // Get available models (based on DevS.ai documentation)
  getAvailableModels(): string[] {
    // These are common models available through DevS.ai
    // The actual model availability depends on the user's DevS.ai configuration
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
      'claude-3-5-sonnet',
      'gemini-pro',
      'gemini-1.5-pro'
    ]
  }
}

// Export a singleton instance
export const devsAIService = DevsAIService.getInstance() 