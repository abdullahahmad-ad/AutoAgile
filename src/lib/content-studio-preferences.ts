import { WorkItemType } from '../types'

interface ContentStudioPreferences {
  selectedProject: string
  workItemType: WorkItemType
  selectedQuarter: string
  lastUpdated: number
}

const STORAGE_KEY = 'content-studio-preferences'
const EXPIRY_DAYS = 30 // Preferences expire after 30 days

class ContentStudioPreferencesService {
  /**
   * Save the current dropdown selections to localStorage
   */
  savePreferences(preferences: Omit<ContentStudioPreferences, 'lastUpdated'>): void {
    try {
      const preferencesWithTimestamp: ContentStudioPreferences = {
        ...preferences,
        lastUpdated: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencesWithTimestamp))
    } catch (error) {
      console.warn('Failed to save Content Studio preferences:', error)
    }
  }

  /**
   * Load saved preferences from localStorage
   * Returns null if no valid preferences are found or if they've expired
   */
  loadPreferences(): Omit<ContentStudioPreferences, 'lastUpdated'> | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const preferences: ContentStudioPreferences = JSON.parse(stored)
      
      // Check if preferences have expired
      const now = Date.now()
      const expiryTime = preferences.lastUpdated + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      
      if (now > expiryTime) {
        // Preferences have expired, remove them
        this.clearPreferences()
        return null
      }

      // Return preferences without the timestamp
      const { lastUpdated: _, ...preferencesWithoutTimestamp } = preferences
      return preferencesWithoutTimestamp
    } catch (error) {
      console.warn('Failed to load Content Studio preferences:', error)
      return null
    }
  }

  /**
   * Clear saved preferences from localStorage
   */
  clearPreferences(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear Content Studio preferences:', error)
    }
  }

  /**
   * Check if there are any saved preferences
   */
  hasPreferences(): boolean {
    return this.loadPreferences() !== null
  }
}

export const contentStudioPreferences = new ContentStudioPreferencesService() 