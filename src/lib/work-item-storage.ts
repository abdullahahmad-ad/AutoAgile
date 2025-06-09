import { WorkItemType, GeneratedContent, JiraIssue } from '../types'

export interface StoredWorkItem {
  id: string
  type: WorkItemType
  title: string
  description: string
  originalPrompt: string
  generatedContent: GeneratedContent
  jiraIssue?: JiraIssue
  jiraUrl?: string
  templateUsed: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'pushed' | 'failed'
}

export interface WorkItemFilters {
  type?: WorkItemType
  status?: StoredWorkItem['status']
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

class WorkItemStorageService {
  private readonly STORAGE_KEY = 'created-work-items'
  private readonly isBrowser = typeof window !== 'undefined'

  // Get all work items
  getWorkItems(): StoredWorkItem[] {
    if (!this.isBrowser) return []

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const items = JSON.parse(stored)
        // Sort by creation date, newest first
        return items.sort((a: StoredWorkItem, b: StoredWorkItem) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
    } catch (error) {
      console.error('Failed to load work items:', error)
    }
    
    return []
  }

  // Get filtered work items
  getFilteredWorkItems(filters: WorkItemFilters): StoredWorkItem[] {
    let items = this.getWorkItems()

    if (filters.type) {
      items = items.filter(item => item.type === filters.type)
    }

    if (filters.status) {
      items = items.filter(item => item.status === filters.status)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.originalPrompt.toLowerCase().includes(searchLower) ||
        (item.jiraIssue?.key && item.jiraIssue.key.toLowerCase().includes(searchLower))
      )
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      items = items.filter(item => {
        const itemDate = new Date(item.createdAt)
        return itemDate >= start && itemDate <= end
      })
    }

    return items
  }

  // Get a single work item by ID
  getWorkItem(id: string): StoredWorkItem | null {
    const items = this.getWorkItems()
    return items.find(item => item.id === id) || null
  }

  // Save a work item
  saveWorkItem(workItem: Omit<StoredWorkItem, 'id' | 'createdAt' | 'updatedAt'>): StoredWorkItem {
    if (!this.isBrowser) {
      throw new Error('Cannot save work item on server-side')
    }

    const newWorkItem: StoredWorkItem = {
      ...workItem,
      id: `work-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const items = this.getWorkItems()
      items.unshift(newWorkItem) // Add to beginning for newest first
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items))
      
      // Dispatch event for real-time updates
      this.dispatchWorkItemEvent('created', newWorkItem)
      
      return newWorkItem
    } catch (error) {
      console.error('Failed to save work item:', error)
      throw new Error('Failed to save work item')
    }
  }

  // Update an existing work item
  updateWorkItem(id: string, updates: Partial<StoredWorkItem>): StoredWorkItem | null {
    if (!this.isBrowser) {
      throw new Error('Cannot update work item on server-side')
    }

    try {
      const items = this.getWorkItems()
      const index = items.findIndex(item => item.id === id)
      
      if (index === -1) {
        return null
      }

      const updatedItem: StoredWorkItem = {
        ...items[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }

      items[index] = updatedItem
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items))
      
      // Dispatch event for real-time updates
      this.dispatchWorkItemEvent('updated', updatedItem)
      
      return updatedItem
    } catch (error) {
      console.error('Failed to update work item:', error)
      throw new Error('Failed to update work item')
    }
  }

  // Delete a work item
  deleteWorkItem(id: string): boolean {
    if (!this.isBrowser) {
      throw new Error('Cannot delete work item on server-side')
    }

    try {
      const items = this.getWorkItems()
      const index = items.findIndex(item => item.id === id)
      
      if (index === -1) {
        return false
      }

      const deletedItem = items[index]
      items.splice(index, 1)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items))
      
      // Dispatch event for real-time updates
      this.dispatchWorkItemEvent('deleted', deletedItem)
      
      return true
    } catch (error) {
      console.error('Failed to delete work item:', error)
      throw new Error('Failed to delete work item')
    }
  }

  // Get work item statistics
  getStatistics(): {
    total: number
    byType: Record<WorkItemType, number>
    byStatus: Record<StoredWorkItem['status'], number>
    recentCount: number // Last 7 days
  } {
    const items = this.getWorkItems()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const stats = {
      total: items.length,
      byType: {} as Record<WorkItemType, number>,
      byStatus: {} as Record<StoredWorkItem['status'], number>,
      recentCount: 0
    }

    // Initialize counters
    const types: WorkItemType[] = ['epic', 'story', 'task', 'bug', 'initiative']
    const statuses: StoredWorkItem['status'][] = ['draft', 'pushed', 'failed']
    
    types.forEach(type => stats.byType[type] = 0)
    statuses.forEach(status => stats.byStatus[status] = 0)

    // Count items
    items.forEach(item => {
      stats.byType[item.type]++
      stats.byStatus[item.status]++
      
      if (new Date(item.createdAt) >= sevenDaysAgo) {
        stats.recentCount++
      }
    })

    return stats
  }

  // Event system for real-time updates
  private dispatchWorkItemEvent(action: 'created' | 'updated' | 'deleted', workItem: StoredWorkItem) {
    if (!this.isBrowser) return

    const event = new CustomEvent('work-item-change', {
      detail: { action, workItem }
    })
    window.dispatchEvent(event)
  }

  // Listen for work item changes
  onWorkItemChange(callback: (action: 'created' | 'updated' | 'deleted', workItem: StoredWorkItem) => void) {
    if (!this.isBrowser) return () => {}

    const handler = (event: CustomEvent) => {
      callback(event.detail.action, event.detail.workItem)
    }

    window.addEventListener('work-item-change', handler as EventListener)
    
    return () => {
      window.removeEventListener('work-item-change', handler as EventListener)
    }
  }

  // Export work items as JSON
  exportWorkItems(): string {
    const items = this.getWorkItems()
    return JSON.stringify(items, null, 2)
  }

  // Import work items from JSON
  importWorkItems(jsonData: string): number {
    if (!this.isBrowser) {
      throw new Error('Cannot import work items on server-side')
    }

    try {
      const importedItems: StoredWorkItem[] = JSON.parse(jsonData)
      const existingItems = this.getWorkItems()
      
      // Filter out items that already exist (by ID)
      const existingIds = new Set(existingItems.map(item => item.id))
      const newItems = importedItems.filter(item => !existingIds.has(item.id))
      
      if (newItems.length === 0) {
        return 0
      }

      // Merge and save
      const allItems = [...existingItems, ...newItems]
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allItems))
      
      // Dispatch events for each new item
      newItems.forEach(item => {
        this.dispatchWorkItemEvent('created', item)
      })
      
      return newItems.length
    } catch (error) {
      console.error('Failed to import work items:', error)
      throw new Error('Failed to import work items: Invalid JSON format')
    }
  }
}

// Export singleton instance
export const workItemStorage = new WorkItemStorageService() 