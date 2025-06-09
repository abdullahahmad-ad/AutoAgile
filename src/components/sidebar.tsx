'use client'

import React, { useState } from 'react'
import { Icons } from './ui/icons'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  jiraConnection: any
  devsAIConnection: any
}

export function Sidebar({ currentView, onViewChange, jiraConnection, devsAIConnection }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Grouped navigation structure
  const navigationGroups = [
    {
      id: 'workspace',
      label: 'WORKSPACE',
      items: [
        {
          id: 'create',
          label: 'Create & Push',
          icon: Icons.Plus,
          description: 'Create and push work items to Jira'
        },
        {
          id: 'content-studio',
          label: 'Content Studio',
          icon: Icons.FileText,
          description: 'Generate content for existing work items'
        },
        {
          id: 'work-items',
          label: 'Work Items',
          icon: Icons.List,
          description: 'View and manage created work items'
        }
      ]
    },
    {
      id: 'configuration',
      label: 'CONFIGURATION',
      items: [
        {
          id: 'config',
          label: 'Configure Templates',
          icon: Icons.Settings,
          description: 'Manage work item templates'
        }
      ]
    },
    {
      id: 'connections',
      label: 'CONNECTIONS',
      items: [
        {
          id: 'jira',
          label: 'Jira Connection',
          icon: Icons.Link,
          description: 'Configure Jira instance connection',
          status: jiraConnection ? 'connected' : 'disconnected'
        },
        {
          id: 'devs-ai',
          label: 'Devs.ai Connection',
          icon: Icons.Zap,
          description: 'Configure AI content generation',
          status: devsAIConnection ? 'connected' : 'disconnected'
        }
      ]
    },
    {
      id: 'resources',
      label: 'RESOURCES',
      items: [
        {
          id: 'pm-resources',
          label: 'Resources Hub',
          icon: Icons.Target,
          description: 'Curated tools and resources'
        }
      ]
    }
  ] as const

  return (
    <div className={cn(
      "bg-white border-r border-cloud-300 shadow-sm transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-cloud-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 mb-1">
                <Icons.Target size="md" variant="accent" />
                <span className="font-bold text-lg text-navy-950">AutoAgile</span>
              </div>
              <span className="text-xs text-cloud-600 ml-8">AI-Powered Agile</span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center flex-1">
              <Icons.Target size="md" variant="accent" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icons.Menu size="sm" variant="secondary" />
          </Button>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-6">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* Section Header - only show when expanded */}
              {!isCollapsed && (
                <div className="px-3 mb-3">
                  <h3 className="text-xs font-semibold text-cloud-500 uppercase tracking-wider">
                    {group.label}
                  </h3>
                </div>
              )}
              
              {/* Section Divider for collapsed state */}
              {isCollapsed && groupIndex > 0 && (
                <div className="mx-2 mb-3">
                  <div className="h-px bg-cloud-200"></div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const IconComponent = item.icon
                  const isActive = currentView === item.id
                  const hasStatus = 'status' in item && item.status
                  const isConnected = hasStatus && item.status === 'connected'
                  
                  return (
                    <div key={item.id} className="relative group">
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start h-auto p-3 relative",
                          isCollapsed ? "px-3" : "px-3"
                        )}
                        onClick={() => onViewChange(item.id)}
                      >
                        {!isCollapsed ? (
                          <div className="flex items-start w-full min-w-0">
                            <div className="flex-shrink-0 mr-3 mt-0.5">
                              <IconComponent size="md" variant={isActive ? "secondary" : "default"} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm leading-tight break-words">
                                  {item.label}
                                </span>
                                {hasStatus && (
                                  <div className="flex-shrink-0 ml-2">
                                    <div 
                                      className={cn(
                                        "w-2 h-2 rounded-full",
                                        isConnected ? "bg-mint-500" : "bg-coral-500"
                                      )}
                                      title={isConnected ? "Connected" : "Disconnected"}
                                    />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-cloud-600 leading-relaxed break-words whitespace-normal">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-full relative">
                            <IconComponent size="md" variant={isActive ? "secondary" : "default"} />
                            {hasStatus && (
                              <div 
                                className={cn(
                                  "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                                  isConnected ? "bg-mint-500" : "bg-coral-500"
                                )}
                                title={`${item.label}: ${isConnected ? "Connected" : "Disconnected"}`}
                              />
                            )}
                          </div>
                        )}
                      </Button>

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-navy-950 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-cloud-300 mt-1">{item.description}</div>
                          {hasStatus && (
                            <div className="text-xs mt-1">
                              Status: {isConnected ? "Connected" : "Disconnected"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-cloud-200">
          <div className="text-xs text-cloud-600 text-center">
            AutoAgile v1.0
          </div>
        </div>
      )}
    </div>
  )
} 