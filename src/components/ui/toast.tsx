'use client'

import React, { useState, useEffect } from 'react'
import { Icons } from './icons'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string | React.ReactNode
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

export function Toast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRemove()
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.duration])

  const handleRemove = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onRemove(toast.id)
    }, 300)
  }

  const getIcon = () => {
    switch (toast.type) {
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
    switch (toast.type) {
      case 'success': return 'bg-mint-50 border-forest-900'
      case 'error': return 'bg-coral-50 border-coral-500'
      case 'warning': return 'bg-marigold-50 border-marigold-500'
      case 'info': return 'bg-sky-50 border-sky-300'
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${getBackgroundColor()}
        border-l-4 rounded-lg p-4 shadow-lg max-w-sm w-full
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-navy-950">{toast.title}</h3>
          {toast.message && (
            <div className="mt-1 text-sm text-cloud-700">
              {typeof toast.message === 'string' ? (
                <p>{toast.message}</p>
              ) : (
                toast.message
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="ml-4 flex-shrink-0 text-cloud-500 hover:text-cloud-700 transition-colors"
        >
          <Icons.X size="sm" />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
} 