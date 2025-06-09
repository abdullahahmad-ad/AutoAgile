'use client'

import React, { useState, useMemo } from 'react'
import { Icons } from './ui/icons'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import { 
  PM_TOOL_CATEGORIES, 
  PM_TOOLS, 
  POPULAR_TOOLS, 
  COMMON_USE_CASES,
  getToolsByCategory,
  getCategoryInfo,
  searchTools,
  getToolRecommendations,
  getToolsByUseCase
} from '../lib/pm-resources-data'

import { 
  PMTool, 
  PMToolCategory, 
  PMResourcesFilters, 
  PMToolType, 
  PMToolComplexity 
} from '../types'

// Helper functions for badge colors
const getToolTypeColor = (type: PMToolType): "success" | "info" | "warning" | "default" => {
  switch (type) {
    case 'free': return 'success'
    case 'freemium': return 'info'
    case 'paid': return 'warning'
    default: return 'default'
  }
}

const getComplexityColor = (complexity: PMToolComplexity): "success" | "warning" | "destructive" | "default" => {
  switch (complexity) {
    case 'beginner': return 'success'
    case 'intermediate': return 'warning'
    case 'advanced': return 'destructive'
    default: return 'default'
  }
}

interface PMResourcesProps {
  contextualMode?: boolean
  suggestedCategory?: PMToolCategory
  onToolSelect?: (tool: PMTool) => void
}

export function PMResources({ 
  contextualMode = false, 
  suggestedCategory,
  onToolSelect 
}: PMResourcesProps) {
  const [filters, setFilters] = useState<PMResourcesFilters>({
    category: suggestedCategory
  })
  const [view, setView] = useState<'overview' | 'category' | 'search'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<PMToolCategory | null>(
    suggestedCategory || null
  )

  // Automatically set view based on active filters
  const currentView = useMemo(() => {
    if (filters.searchTerm || filters.useCase || filters.type || filters.complexity) {
      return 'search'
    }
    if (filters.category) {
      return 'category'
    }
    return view
  }, [filters.searchTerm, filters.useCase, filters.type, filters.complexity, filters.category, view])

  // Filter and search tools
  const filteredTools = useMemo(() => {
    let tools = PM_TOOLS

    // Apply category filter
    if (filters.category) {
      tools = tools.filter(tool => tool.category === filters.category)
    }

    // Apply type filter
    if (filters.type) {
      tools = tools.filter(tool => tool.type === filters.type)
    }

    // Apply complexity filter
    if (filters.complexity) {
      tools = tools.filter(tool => tool.complexity === filters.complexity)
    }

    // Apply use case filter with smart matching
    if (filters.useCase) {
      const useCaseResults = getToolsByUseCase(filters.useCase)
      const relevantTools = [...useCaseResults.primary, ...useCaseResults.supporting]
      tools = tools.filter(tool => relevantTools.some(relevantTool => relevantTool.id === tool.id))
    }

    // Apply search filter
    if (filters.searchTerm || filters.search) {
      const searchQuery = filters.searchTerm || filters.search || ''
      tools = tools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tool.useCases.some(useCase => useCase.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply popular filter
    if (filters.showOnlyPopular) {
      tools = tools.filter(tool => tool.isPopular)
    }

    return tools
  }, [filters])

  const handleCategorySelect = (categoryId: PMToolCategory) => {
    setSelectedCategory(categoryId)
    setFilters({ ...filters, category: categoryId })
    setView('category')
  }

  const handleToolClick = (tool: PMTool) => {
    if (onToolSelect) {
      onToolSelect(tool)
    } else {
      window.open(tool.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleUseCaseClick = (useCase: string) => {
    setFilters({ ...filters, useCase, searchTerm: undefined })
  }

  const clearFilters = () => {
    setFilters({})
    setSelectedCategory(null)
    setView('overview')
  }

  if (contextualMode) {
    return (
      <div className="bg-white rounded-lg border border-cloud-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-navy-950">Suggested Tools</h3>
          <Button variant="ghost" size="sm" onClick={() => setView('overview')}>
            <Icons.ExternalLink size="sm" className="mr-1" />
            View All
          </Button>
        </div>
        
        <div className="space-y-2">
          {filteredTools.slice(0, 3).map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-cloud-50 cursor-pointer"
              onClick={() => handleToolClick(tool)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-navy-950">{tool.name}</span>
                  <Badge variant={getToolTypeColor(tool.type)} className="text-xs">
                    {tool.type}
                  </Badge>
                </div>
                <p className="text-xs text-cloud-600 truncate">{tool.shortDescription || tool.description}</p>
              </div>
              <Icons.ExternalLink size="sm" variant="secondary" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      {currentView !== 'overview' && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            <Icons.ArrowLeft size="sm" className="mr-2" />
            Back to Overview
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-cloud-200 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-1">
            <div className="relative">
              <Icons.Search size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cloud-500" />
              <input
                type="text"
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-950 focus:border-royal-950"
                value={filters.searchTerm || ''}
                onChange={(e) => {
                  setFilters({ ...filters, searchTerm: e.target.value })
                }}
              />
            </div>
          </div>

          {/* Use Case Filter */}
          <div className="lg:col-span-1">
            <select
              className="w-full px-3 py-2 text-sm border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-950"
              value={filters.useCase || ''}
              onChange={(e) => setFilters({ ...filters, useCase: e.target.value || undefined })}
            >
              <option value="">I need to...</option>
              {COMMON_USE_CASES.map((useCase) => (
                <option key={useCase} value={useCase}>{useCase}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-1">
            <select
              className="w-full px-3 py-2 text-sm border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-950"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as PMToolType || undefined })}
            >
              <option value="">All Types</option>
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Complexity Filter */}
          <div className="lg:col-span-1">
            <select
              className="w-full px-3 py-2 text-sm border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-950"
              value={filters.complexity || ''}
              onChange={(e) => setFilters({ ...filters, complexity: e.target.value as PMToolComplexity || undefined })}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.searchTerm || filters.useCase || filters.type || filters.complexity) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cloud-200">
            <span className="text-sm text-cloud-600">Active filters:</span>
            {filters.searchTerm && (
              <Badge variant="outline" className="text-xs">
                Search: {filters.searchTerm}
                <button
                  onClick={() => setFilters({ ...filters, searchTerm: undefined })}
                  className="ml-1 hover:text-coral-500"
                >
                  <Icons.X size="xs" />
                </button>
              </Badge>
            )}
            {filters.useCase && (
              <Badge variant="outline" className="text-xs">
                Use case: {filters.useCase}
                <button
                  onClick={() => setFilters({ ...filters, useCase: undefined })}
                  className="ml-1 hover:text-coral-500"
                >
                  <Icons.X size="xs" />
                </button>
              </Badge>
            )}
            {filters.type && (
              <Badge variant="outline" className="text-xs">
                Type: {filters.type}
                <button
                  onClick={() => setFilters({ ...filters, type: undefined })}
                  className="ml-1 hover:text-coral-500"
                >
                  <Icons.X size="xs" />
                </button>
              </Badge>
            )}
            {filters.complexity && (
              <Badge variant="outline" className="text-xs">
                Level: {filters.complexity}
                <button
                  onClick={() => setFilters({ ...filters, complexity: undefined })}
                  className="ml-1 hover:text-coral-500"
                >
                  <Icons.X size="xs" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* Categories Grid */}
          <div>
            <h2 className="text-xl font-semibold text-navy-950 mb-4">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PM_TOOL_CATEGORIES.map((category) => {
                const toolCount = getToolsByCategory(category.id).length
                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-lg border border-cloud-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl">{category.icon}</div>
                      <Badge variant="secondary">{toolCount} items</Badge>
                    </div>
                    <h3 className="font-semibold text-navy-950 mb-2 group-hover:text-royal-950">
                      {category.name}
                    </h3>
                    <p className="text-sm text-cloud-600 leading-relaxed">
                      {category.description}
                    </p>
                    <div className="mt-3 flex items-center text-royal-950 text-sm font-medium">
                      Explore resources
                      <Icons.ArrowRight size="sm" className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Featured Resources */}
          <div>
            <h2 className="text-xl font-semibold text-navy-950 mb-4">Featured Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_TOOLS.slice(0, 6).map((tool) => (
                <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category View */}
      {currentView === 'category' && selectedCategory && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-cloud-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{getCategoryInfo(selectedCategory)?.icon}</div>
              <div>
                <h2 className="text-xl font-semibold text-navy-950">
                  {getCategoryInfo(selectedCategory)?.name}
                </h2>
                <p className="text-cloud-600">{getCategoryInfo(selectedCategory)?.description}</p>
              </div>
            </div>
            <Badge variant="info">{filteredTools.length} items available</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {currentView === 'search' && (
        <div className="space-y-6">

          {/* Results Display - Unified Logic */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-navy-950">
                Search Results
              </h2>
              <Badge variant="info">{filteredTools.length} items found</Badge>
            </div>

            {filteredTools.length === 0 ? (
              <div className="bg-white rounded-lg border border-cloud-200 p-8 text-center">
                <Icons.Search size="xl" variant="secondary" className="mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cloud-700 mb-2">No items found</h3>
                <p className="text-cloud-600 mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Use Case Specific Organization */}
                {filters.useCase && (() => {
                  const useCaseResults = getToolsByUseCase(filters.useCase)
                  const filteredPrimaryTools = useCaseResults.primary.filter(tool => filteredTools.some(ft => ft.id === tool.id))
                  const filteredSupportingTools = useCaseResults.supporting.filter(tool => filteredTools.some(ft => ft.id === tool.id))
                  
                  return (
                    <div className="space-y-6">
                      {/* Primary Tools */}
                      {filteredPrimaryTools.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-navy-950 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-royal-500 rounded-full"></span>
                            Best Tools for This Use Case
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPrimaryTools.map((tool) => (
                              <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} isPrimary={true} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supporting Tools */}
                      {filteredSupportingTools.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-navy-950 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cloud-400 rounded-full"></span>
                            Supporting Tools
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSupportingTools.map((tool) => (
                              <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show any remaining tools that don't fit in primary/supporting */}
                      {(() => {
                        const organizedToolIds = new Set([...filteredPrimaryTools.map(t => t.id), ...filteredSupportingTools.map(t => t.id)])
                        const remainingTools = filteredTools.filter(tool => !organizedToolIds.has(tool.id))
                        
                        return remainingTools.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-navy-950 mb-4">Other Relevant Tools</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {remainingTools.map((tool) => (
                                <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} />
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}

                {/* General Search Results (no use case) */}
                {!filters.useCase && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} onUseCaseClick={handleUseCaseClick} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  )
}

// Tool Card Component
interface ToolCardProps {
  tool: PMTool
  onClick: () => void
  onUseCaseClick?: (useCase: string) => void
  isPrimary?: boolean
}

function ToolCard({ tool, onClick, onUseCaseClick, isPrimary = false }: ToolCardProps) {
  const categoryInfo = getCategoryInfo(tool.category)
  
  return (
    <div
      className={cn(
        "bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer group",
        isPrimary 
          ? "border-royal-300 bg-gradient-to-br from-white to-royal-25 ring-1 ring-royal-200" 
          : "border-cloud-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-lg">{categoryInfo?.icon}</div>
          {isPrimary && (
            <div className="w-2 h-2 bg-royal-500 rounded-full" title="Recommended for this use case"></div>
          )}
        </div>
        <Icons.ExternalLink size="sm" variant="secondary" className="group-hover:text-royal-950" />
      </div>

      <h3 className="font-semibold text-navy-950 mb-2 group-hover:text-royal-950">
        {tool.name}
      </h3>
      
      <p className="text-sm text-cloud-600 leading-relaxed mb-3 line-clamp-2">
        {tool.shortDescription || tool.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Badge variant={getToolTypeColor(tool.type)} className="text-xs">
            {tool.type}
          </Badge>
          <Badge variant={getComplexityColor(tool.complexity)} className="text-xs">
            {tool.complexity}
          </Badge>
        </div>
      </div>

      {/* Use Cases */}
      {tool.useCases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-cloud-100 space-y-2">
          <div>
            <div className="text-xs font-medium text-cloud-700 mb-1">Best for:</div>
            <div className="flex flex-wrap gap-1 items-center">
              {tool.useCases.slice(0, 3).map((useCase) => (
                <button
                  key={useCase}
                  onClick={(e) => {
                    e.stopPropagation()
                    onUseCaseClick?.(useCase)
                  }}
                  className="text-xs text-royal-700 bg-royal-50 hover:bg-royal-100 px-2 py-1 rounded transition-colors border border-royal-200 hover:border-royal-300"
                >
                  {useCase}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 