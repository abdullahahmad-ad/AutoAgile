'use client'

import React from 'react'
import { JiraWorkItem } from '../types'
import { Badge } from './ui/badge'
import { WorkItemIcons, StatusIcons } from './ui/icons'
import { Card } from './ui/card'

interface WorkItemCardProps {
  workItem: JiraWorkItem
  isSelected: boolean
  onClick: () => void
}

export function WorkItemCard({ workItem, isSelected, onClick }: WorkItemCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Function to extract plain text from ADF for truncation
  const extractTextFromADF = (description: any): string => {
    if (!description) return 'No description available'
    
    // If it's already a string, return it
    if (typeof description === 'string') {
      return description
    }
    
    // If it's ADF, extract text content
    if (description.content && Array.isArray(description.content)) {
      const extractText = (node: any): string => {
        if (!node) return ''
        
        if (node.type === 'text') {
          return node.text || ''
        }
        
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join('')
        }
        
        return ''
      }
      
      return description.content.map(extractText).join(' ').trim()
    }
    
    return 'No description available'
  }

  // Function to render formatted description for work item cards (truncated)
  const renderWorkItemDescription = (description: any, maxLength: number = 180): React.ReactElement => {
    if (!description) {
      return <span className="text-cloud-600 italic">No description available</span>
    }

    // If it's a string, format it with basic line breaks and truncate
    if (typeof description === 'string') {
      const truncated = truncateText(description, maxLength)
      return <span>{truncated}</span>
    }

    // If it's ADF, render a simplified version for the card
    if (description.content && Array.isArray(description.content)) {
      const renderSimpleADF = (node: any, key: string): React.ReactNode => {
        switch (node.type) {
          case 'paragraph':
            return (
              <span key={key} className="block mb-1 last:mb-0">
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'text':
            let textElement: React.ReactNode = node.text || ''
            
            // Apply basic formatting
            if (node.marks) {
              node.marks.forEach((mark: any) => {
                switch (mark.type) {
                  case 'strong':
                    textElement = <strong key={key} className="font-semibold">{textElement}</strong>
                    break
                  case 'em':
                    textElement = <em key={key} className="italic">{textElement}</em>
                    break
                  case 'code':
                    textElement = <code key={key} className="bg-cloud-100 px-1 py-0.5 rounded text-xs font-mono">{textElement}</code>
                    break
                }
              })
            }
            
            return textElement
          
          case 'bulletList':
          case 'orderedList':
            // For lists in cards, just show the first few items
            const listItems = node.content ? node.content.slice(0, 2) : []
            return (
              <div key={key} className="ml-2 my-1">
                {listItems.map((item: any, itemIndex: number) => (
                  <div key={`${key}-${itemIndex}`} className="flex items-start">
                    <span className="text-cloud-500 mr-1 text-xs">•</span>
                    <span className="text-sm">
                      {item.content ? item.content.map((child: any, childIndex: number) => 
                        renderSimpleADF(child, `${key}-${itemIndex}-${childIndex}`)
                      ).filter(Boolean) : ''}
                    </span>
                  </div>
                ))}
                {node.content && node.content.length > 2 && (
                  <div className="text-cloud-600 text-xs ml-3">...and {node.content.length - 2} more</div>
                )}
              </div>
            )
          
          case 'listItem':
            return (
              <span key={key}>
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'heading':
            return (
              <span key={key} className="font-semibold text-navy-950 block mb-1">
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'hardBreak':
            return <br key={key} />
          
          default:
            if (node.content) {
              return (
                <span key={key}>
                  {node.content.map((child: any, childIndex: number) => 
                    renderSimpleADF(child, `${key}-${childIndex}`)
                  ).filter(Boolean)}
                </span>
              )
            }
            return node.text ? <span key={key}>{node.text}</span> : null
        }
      }

      const renderedContent = description.content.map((node: any, index: number) => 
        renderSimpleADF(node, index.toString())
      ).filter(Boolean)

      // Convert to string to check length and truncate if needed
      const textContent = extractTextFromADF(description)
      const shouldTruncate = textContent.length > maxLength

      return (
        <div className="space-y-1">
          {renderedContent}
          {shouldTruncate && <span className="text-cloud-500">...</span>}
        </div>
      )
    }

    return <span className="text-cloud-600 italic">Description format not supported</span>
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'closed':
        return 'done';
      case 'in progress':
        return 'in-progress';
      case 'in review':
        return 'in-review';
      default:
        return 'todo';
    }
  };

  const getWorkItemIcon = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'epic':
        return <WorkItemIcons.Epic size="sm" autoContrast={isSelected} />
      case 'story':
        return <WorkItemIcons.Story size="sm" autoContrast={isSelected} />
      case 'task':
        return <WorkItemIcons.Task size="sm" autoContrast={isSelected} />
      case 'bug':
        return <WorkItemIcons.Bug size="sm" autoContrast={isSelected} />
      case 'subtask':
        return <WorkItemIcons.Subtask size="sm" autoContrast={isSelected} />
      default:
        return <WorkItemIcons.Task size="sm" autoContrast={isSelected} />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'closed':
        return <StatusIcons.Done size="xs" autoContrast={isSelected} />
      case 'in progress':
        return <StatusIcons.InProgress size="xs" autoContrast={isSelected} />
      case 'in review':
        return <StatusIcons.InReview size="xs" autoContrast={isSelected} />
      default:
        return <StatusIcons.Todo size="xs" autoContrast={isSelected} />
    }
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md jira-hover-lift ${
        isSelected
          ? 'border-royal-950 bg-royal-50 shadow-md ring-2 ring-royal-950/20'
          : 'hover:border-cloud-400'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
      <div className="flex flex-col space-y-3">
          {/* Header with key, status, and type */}
        <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              {getWorkItemIcon(workItem.issueType)}
              <Badge variant="outline" className="font-mono text-xs">
            {workItem.key}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              {getStatusIcon(workItem.status)}
              <Badge variant={getStatusVariant(workItem.status) as any} className="text-xs">
            {workItem.status}
              </Badge>
            </div>
            <Badge variant="secondary" className="text-xs">
            {workItem.issueType}
            </Badge>
        </div>

        {/* Title */}
          <h3 className="font-medium text-navy-950 text-base leading-snug">
          {workItem.summary}
        </h3>

        {/* Description - Now properly formatted */}
        {workItem.description && (
            <div className="text-cloud-700 text-sm leading-relaxed">
            {renderWorkItemDescription(workItem.description, 180)}
          </div>
        )}
      </div>

        <div className="flex items-center justify-between text-xs text-cloud-600 mt-4 pt-3 border-t border-cloud-200">
        <div className="flex items-center space-x-4">
          <span>Project: {workItem.project}</span>
          {workItem.fixVersions && workItem.fixVersions.length > 0 && (
            <span>Versions: {workItem.fixVersions.join(', ')}</span>
          )}
        </div>
        
        {workItem.labels && workItem.labels.length > 0 && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{workItem.labels.slice(0, 2).join(', ')}</span>
            {workItem.labels.length > 2 && <span>+{workItem.labels.length - 2}</span>}
          </div>
        )}
      </div>

      {isSelected && (
          <div className="mt-4 pt-4 border-t border-royal-200">
            <div className="flex items-center text-royal-950 text-sm">
              <StatusIcons.Done size="sm" className="mr-2" />
            Selected for content generation
          </div>
        </div>
      )}
      </div>
    </Card>
  )
} 