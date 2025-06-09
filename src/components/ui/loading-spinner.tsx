import React from 'react'
import { cn } from '../../lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'accent' | 'white'
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4'
  }

  const variantClasses = {
    primary: 'border-cloud-300 border-t-navy-950',
    secondary: 'border-cloud-200 border-t-cloud-600',
    accent: 'border-royal-200 border-t-royal-950',
    white: 'border-white/30 border-t-white'
  }

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
} 