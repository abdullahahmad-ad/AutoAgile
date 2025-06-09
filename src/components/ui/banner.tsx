import React, { useState, useEffect } from 'react'
import { Icons } from './icons'

interface BannerProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  autoHide?: boolean
  duration?: number
}

export function Banner({
  type,
  title,
  message,
  action,
  onDismiss,
  autoHide = false,
  duration = 5000
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoHide, duration])

  const handleDismiss = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle size="md" variant="success" />
      case 'error':
        return <Icons.AlertCircle size="md" variant="danger" />
      case 'warning':
        return <Icons.AlertTriangle size="md" variant="warning" />
      case 'info':
        return <Icons.Info size="md" variant="info" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-mint-50 border-forest-900'
      case 'error': return 'bg-coral-50 border-coral-500'
      case 'warning': return 'bg-marigold-50 border-marigold-500'
      case 'info': return 'bg-sky-50 border-sky-300'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success': return 'text-forest-900'
      case 'error': return 'text-coral-900'
      case 'warning': return 'text-marigold-900'
      case 'info': return 'text-navy-950'
    }
  }

  const getActionColor = () => {
    switch (type) {
      case 'success': return 'text-forest-900 hover:text-forest-800'
      case 'error': return 'text-coral-900 hover:text-coral-800'
      case 'warning': return 'text-marigold-900 hover:text-marigold-800'
      case 'info': return 'text-royal-950 hover:text-royal-900'
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-y-[-100%] opacity-0' : 'translate-y-0 opacity-100'}
        ${getBackgroundColor()}
        border-l-4 rounded-lg p-4 mb-4
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {title}
          </h3>
          {message && (
            <p className={`mt-1 text-sm ${getTextColor()} opacity-90`}>
              {message}
            </p>
          )}
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={`text-sm font-medium ${getActionColor()} underline hover:no-underline transition-all`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 flex-shrink-0 text-cloud-500 hover:text-cloud-700 transition-colors"
          >
            <Icons.X size="sm" />
          </button>
        )}
      </div>
    </div>
  )
} 