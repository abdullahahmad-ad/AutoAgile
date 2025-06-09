'use client'

import React, { useState, useEffect } from 'react'
import { workItemStorage, StoredWorkItem, WorkItemFilters } from '../lib/work-item-storage'
import { WorkItemType, JiraInstance } from '../types'
import { Icons } from './ui/icons'
import { Button } from './ui/button'
import { LoadingSpinner } from './ui/loading-spinner'
import { cn } from '../lib/utils'

interface WorkItemsPageProps {
  jiraConnection: JiraInstance | null
}

export function WorkItemsPage({ jiraConnection }: WorkItemsPageProps) {
  const [workItems, setWorkItems] = useState<StoredWorkItem[]>([])
  const [filteredItems, setFilteredItems] = useState<StoredWorkItem[]>([])
  const [filters, setFilters] = useState<WorkItemFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<StoredWorkItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)

  // Load work items and statistics
  const loadData = () => {
    setIsLoading(true)
    try {
      const items = workItemStorage.getWorkItems()
      const stats = workItemStorage.getStatistics()
      setWorkItems(items)
      setStatistics(stats)
      applyFilters(items, filters)
    } catch (error) {
      console.error('Failed to load work items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters to work items
  const applyFilters = (items: StoredWorkItem[], currentFilters: WorkItemFilters) => {
    const filtered = workItemStorage.getFilteredWorkItems(currentFilters)
    setFilteredItems(filtered)
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<WorkItemFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    applyFilters(workItems, updatedFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setFilteredItems(workItems)
  }

  // Delete work item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work item?')) {
      return
    }

    try {
      workItemStorage.deleteWorkItem(id)
      loadData() // Reload data
    } catch (error) {
      console.error('Failed to delete work item:', error)
      alert('Failed to delete work item')
    }
  }

  // Export work items
  const handleExport = () => {
    try {
      const jsonData = workItemStorage.exportWorkItems()
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `work-items-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export work items:', error)
      alert('Failed to export work items')
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge styling
  const getStatusBadge = (status: StoredWorkItem['status']) => {
    const styles = {
      draft: 'bg-cloud-100 text-cloud-700 border-cloud-300',
      pushed: 'bg-forest-100 text-forest-800 border-forest-300',
      failed: 'bg-coral-100 text-coral-800 border-coral-300'
    }
    return styles[status] || styles.draft
  }

  // Get work item type icon
  const getTypeIcon = (type: WorkItemType) => {
    const icons = {
      epic: Icons.Target,
      story: Icons.FileText,
      task: Icons.CheckCircle,
      bug: Icons.Bug,
      initiative: Icons.Flag,
      all: Icons.Circle
    }
    return icons[type] || Icons.Circle
  }

  // Load data on mount and listen for changes
  useEffect(() => {
    loadData()

    // Listen for real-time updates
    const unsubscribe = workItemStorage.onWorkItemChange(() => {
      loadData()
    })

    return unsubscribe
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-cloud-600">Loading work items...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-cloud-200 p-4">
            <div className="flex items-center">
              <Icons.List size="md" variant="accent" className="mr-3" />
              <div>
                <p className="text-sm text-cloud-600">Total Items</p>
                <p className="text-2xl font-bold text-navy-950">{statistics.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-cloud-200 p-4">
            <div className="flex items-center">
              <Icons.CheckCircle size="md" variant="success" className="mr-3" />
              <div>
                <p className="text-sm text-cloud-600">Pushed to Jira</p>
                <p className="text-2xl font-bold text-forest-900">{statistics.byStatus.pushed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-cloud-200 p-4">
            <div className="flex items-center">
              <Icons.Clock size="md" variant="warning" className="mr-3" />
              <div>
                <p className="text-sm text-cloud-600">Drafts</p>
                <p className="text-2xl font-bold text-marigold-600">{statistics.byStatus.draft}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-cloud-200 p-4">
            <div className="flex items-center">
              <Icons.Calendar size="md" variant="info" className="mr-3" />
              <div>
                <p className="text-sm text-cloud-600">Recent (7 days)</p>
                <p className="text-2xl font-bold text-sky-600">{statistics.recentCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-navy-950">
            Work Items ({filteredItems.length})
          </h2>
          <p className="text-sm text-cloud-600 mt-1">
            Manage work items created through the Create & Push flow
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <Icons.Filter size="sm" className="mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center"
          >
            <Icons.Upload size="sm" className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-cloud-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-cloud-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Icons.Search size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cloud-400" />
                <input
                  type="text"
                  placeholder="Search work items..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-cloud-300 rounded-md focus:ring-2 focus:ring-royal-950 focus:border-royal-950"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-cloud-700 mb-2">
                Type
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange({ type: e.target.value as WorkItemType || undefined })}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:ring-2 focus:ring-royal-950 focus:border-royal-950"
              >
                <option value="">All Types</option>
                <option value="epic">Epic</option>
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="initiative">Initiative</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-cloud-700 mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value as StoredWorkItem['status'] || undefined })}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:ring-2 focus:ring-royal-950 focus:border-royal-950"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pushed">Pushed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Work Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-cloud-200 p-8 text-center">
          <Icons.List size="xl" variant="secondary" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-cloud-700 mb-2">
            {workItems.length === 0 ? 'No work items yet' : 'No items match your filters'}
          </h3>
          <p className="text-cloud-600 mb-4">
            {workItems.length === 0 
              ? 'Create your first work item using the Create & Push flow'
              : 'Try adjusting your filters to see more results'
            }
          </p>
          {workItems.length === 0 && (
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-create'))}
              className="inline-flex items-center"
            >
              <Icons.Plus size="sm" className="mr-2" />
              Create Work Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-cloud-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cloud-50 border-b border-cloud-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Work Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Jira
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-cloud-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-cloud-100">
                {filteredItems.map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  return (
                    <tr key={item.id} className="hover:bg-cloud-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <TypeIcon size="sm" variant="secondary" className="mr-3 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy-950 truncate">
                              {item.title}
                            </p>
                            <p className="text-sm text-cloud-600 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-royal-100 text-royal-800">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          getStatusBadge(item.status)
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cloud-600">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.jiraIssue ? (
                          <a
                            href={item.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-royal-950 hover:text-royal-800 font-medium"
                          >
                            {item.jiraIssue.key}
                            <Icons.ExternalLink size="sm" className="ml-1" />
                          </a>
                        ) : (
                          <span className="text-sm text-cloud-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            className="text-royal-950 hover:text-royal-800 hover:bg-royal-50"
                            title="View details"
                          >
                            <Icons.Eye size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-coral-500 hover:text-coral-700 hover:bg-coral-50"
                            title="Delete work item"
                          >
                            <Icons.Trash2 size="sm" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Work Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-cloud-200">
              <div className="flex items-center">
                {React.createElement(getTypeIcon(selectedItem.type), {
                  size: "md",
                  variant: "accent",
                  className: "mr-3"
                })}
                <div>
                  <h3 className="text-lg font-semibold text-navy-950">
                    {selectedItem.title}
                  </h3>
                  <p className="text-sm text-cloud-600">
                    {selectedItem.type} • Created {formatDate(selectedItem.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
              >
                <Icons.X size="sm" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Status and Jira Info */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                    getStatusBadge(selectedItem.status)
                  )}>
                    {selectedItem.status}
                  </span>
                  
                  {selectedItem.jiraIssue && (
                    <a
                      href={selectedItem.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-royal-950 hover:text-royal-800 font-medium"
                    >
                      View in Jira: {selectedItem.jiraIssue.key}
                      <Icons.ExternalLink size="sm" className="ml-2" />
                    </a>
                  )}
                </div>

                {/* Original Prompt */}
                <div>
                  <h4 className="text-sm font-medium text-cloud-700 mb-2">Original Prompt</h4>
                  <div className="bg-cloud-50 rounded-lg p-4">
                    <p className="text-sm text-navy-950">{selectedItem.originalPrompt}</p>
                  </div>
                </div>

                {/* Generated Content */}
                <div>
                  <h4 className="text-sm font-medium text-cloud-700 mb-2">Generated Content</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-navy-950 mb-1">Title</h5>
                      <p className="text-sm text-cloud-800">{selectedItem.generatedContent.title}</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-navy-950 mb-1">Description</h5>
                      <div className="bg-cloud-50 rounded-lg p-4">
                        <p className="text-sm text-cloud-800 whitespace-pre-wrap">
                          {selectedItem.generatedContent.description}
                        </p>
                      </div>
                    </div>

                    {selectedItem.generatedContent.acceptanceCriteria && (
                      <div>
                        <h5 className="text-sm font-medium text-navy-950 mb-1">Acceptance Criteria</h5>
                        <div className="bg-cloud-50 rounded-lg p-4">
                          <div className="text-sm text-cloud-800">
                            {Array.isArray(selectedItem.generatedContent.acceptanceCriteria) 
                              ? selectedItem.generatedContent.acceptanceCriteria.map((criteria, index) => (
                                  <div key={index} className="mb-1">• {criteria}</div>
                                ))
                              : selectedItem.generatedContent.acceptanceCriteria
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedItem.generatedContent.storyPoints && (
                      <div>
                        <h5 className="text-sm font-medium text-navy-950 mb-1">Story Points</h5>
                        <p className="text-sm text-cloud-800">{selectedItem.generatedContent.storyPoints}</p>
                      </div>
                    )}

                    {selectedItem.generatedContent.priority && (
                      <div>
                        <h5 className="text-sm font-medium text-navy-950 mb-1">Priority</h5>
                        <p className="text-sm text-cloud-800">{selectedItem.generatedContent.priority}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Used */}
                <div>
                  <h4 className="text-sm font-medium text-cloud-700 mb-2">Template Used</h4>
                  <p className="text-sm text-cloud-800">{selectedItem.templateUsed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 