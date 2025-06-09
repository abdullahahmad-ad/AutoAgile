import { JiraInstance, JiraProject, JiraWorkItem, WorkItemType } from '../types'

class JiraContentService {
  async getProjects(jiraInstance: JiraInstance): Promise<JiraProject[]> {
    try {
      const response = await fetch('/api/jira/get-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraInstance })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.projects || []
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      throw new Error('Failed to fetch projects from Jira')
    }
  }

  async getProjectVersions(jiraInstance: JiraInstance, projectKey: string): Promise<string[]> {
    try {
      const response = await fetch('/api/jira/get-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraInstance, projectKey })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.quarters || []
    } catch (error) {
      console.error('Failed to fetch project versions:', error)
      // Return default quarters if versions are not available
      const currentYear = new Date().getFullYear()
      return [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${currentYear + 1}`
      ]
    }
  }

  async getDeliveryQuarters(jiraInstance: JiraInstance, projectKey: string): Promise<{ quarters: string[], defaultQuarter: string }> {
    try {
      const response = await fetch('/api/jira/get-delivery-quarters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraInstance, projectKey })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        quarters: data.quarters || [],
        defaultQuarter: data.defaultQuarter || ''
      }
    } catch (error) {
      console.error('Failed to fetch delivery quarters:', error)
      // Return default quarters if API fails
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      let currentQuarter = 1
      if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2
      else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3
      else if (currentMonth >= 10 && currentMonth <= 12) currentQuarter = 4

      const quarters = []
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${currentYear}`)
      }
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${currentYear + 1}`)
      }

      return {
        quarters,
        defaultQuarter: `Q${currentQuarter} ${currentYear}`
      }
    }
  }

  async getWorkItems(
    jiraInstance: JiraInstance,
    projectKey: string,
    workItemType: WorkItemType = 'epic',
    deliveryQuarter?: string
  ): Promise<JiraWorkItem[]> {
    try {
      const response = await fetch('/api/jira/get-work-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraInstance, 
          projectKey, 
          workItemType, 
          deliveryQuarter 
        })
      })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (textError) {
          errorText = `HTTP ${response.status} ${response.statusText}`
        }
        
        console.error('Work items API error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText || 'No error details available',
          params: { projectKey, workItemType, deliveryQuarter }
        })
        
        // Return empty array for these common error cases instead of throwing
        if (response.status === 400 || response.status === 404 || response.status === 403) {
          console.warn(`Returning empty work items list due to API error: ${response.status}`)
          return []
        }
        
        return [] // Return empty array instead of throwing for any other errors
      }

      const data = await response.json()
      if (!data.workItems || !Array.isArray(data.workItems)) {
        console.error('Invalid response format:', data)
        return []
      }

      // Ensure each work item has the required fields
      const workItems = data.workItems.map((item: any): JiraWorkItem => ({
        id: item.id || '',
        key: item.key || '',
        summary: item.summary || '',
        description: item.description || '',
        issueType: item.issueType || '',
        status: item.status || '',
        project: item.project || '',
        fixVersions: Array.isArray(item.fixVersions) ? item.fixVersions : [],
        labels: Array.isArray(item.labels) ? item.labels : []
      }))

      return workItems
    } catch (error) {
      console.error('Failed to fetch work items:', error)
      return [] // Return empty array instead of throwing
    }
  }

  async getWorkItem(
    jiraInstance: JiraInstance,
    issueKey: string
  ): Promise<JiraWorkItem> {
    try {
      const response = await fetch('/api/jira/get-work-item-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraInstance, 
          issueKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || `HTTP ${response.status}`
        
        console.error('Work item details API error:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          issueKey
        })
        
        // Provide specific error messages based on status code
        if (response.status === 404) {
          throw new Error(`Work item ${issueKey} not found or you don't have permission to access it`)
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please check your Jira credentials.')
        } else if (response.status === 403) {
          throw new Error(`Access denied to work item ${issueKey}. Please check your permissions.`)
        } else if (response.status === 400) {
          throw new Error(errorMessage)
        }
        
        throw new Error(`Failed to fetch work item details: ${errorMessage}`)
      }

      const data = await response.json()
      if (!data.workItem) {
        throw new Error('Work item not found in response')
      }

      return data.workItem
    } catch (error) {
      console.error('Failed to fetch work item details:', error)
      
      // Re-throw the error with the original message if it's already a user-friendly message
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('Authentication failed') ||
        error.message.includes('Access denied') ||
        error.message.includes('Missing')
      )) {
        throw error
      }
      
      // Generic fallback error
      throw new Error(`Unable to fetch work item details for ${issueKey}. Please check your connection and try again.`)
    }
  }

  // Legacy method - keeping for backward compatibility but updating implementation
  async getWorkItemLegacy(
    jiraInstance: JiraInstance,
    issueKey: string
  ): Promise<JiraWorkItem> {
    try {
      const response = await fetch('/api/jira/get-work-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraInstance, 
          projectKey: issueKey.split('-')[0], // Extract project key from issue key
          workItemType: 'epic' // Default, could be improved
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const workItem = data.workItems?.find((item: JiraWorkItem) => item.key === issueKey)
      
      if (!workItem) {
        throw new Error('Work item not found')
      }

      return workItem
    } catch (error) {
      console.error('Failed to fetch work item:', error)
      throw new Error('Failed to fetch work item from Jira')
    }
  }
}

export const jiraContentService = new JiraContentService() 