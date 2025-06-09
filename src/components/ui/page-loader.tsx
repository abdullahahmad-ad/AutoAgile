import React from 'react'
import { createPortal } from 'react-dom'
import { LoadingSpinner } from './loading-spinner'
import { Icons } from './icons'
import { cn } from '../../lib/utils'

interface PageLoaderProps {
  isVisible: boolean
  title?: string
  subtitle?: string
  progress?: number
  steps?: string[]
  currentStep?: number
  variant?: 'default' | 'jira' | 'ai'
  className?: string
}

export function PageLoader({
  isVisible,
  title = 'Loading...',
  subtitle,
  progress,
  steps,
  currentStep,
  variant = 'default',
  className
}: PageLoaderProps) {
  if (!isVisible) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'jira':
        return {
          background: 'bg-gradient-to-br from-royal-50 to-sky-50',
          accent: 'text-royal-950',
          icon: <Icons.Upload size="lg" className="text-royal-950 mb-4" />
        }
      case 'ai':
        return {
          background: 'bg-gradient-to-br from-mint-50 to-forest-50',
          accent: 'text-forest-900',
          icon: <Icons.Sparkles size="lg" className="text-forest-900 mb-4" />
        }
      default:
        return {
          background: 'bg-gradient-to-br from-cloud-50 to-white',
          accent: 'text-navy-950',
          icon: <LoadingSpinner size="xl" className="mb-4" />
        }
    }
  }

  const variantStyles = getVariantStyles()

  // Only render on client-side and use portal to render at document body level
  if (typeof window === 'undefined') return null

  const loaderContent = (
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-center justify-center",
      "backdrop-blur-sm bg-black/20",
      className
    )}>
      <div className={cn(
        "relative max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl border border-white/20",
        "transform transition-all duration-300 ease-out",
        variantStyles.background
      )}>
        {/* Main Content */}
        <div className="text-center">
          {/* Icon/Spinner */}
          <div className="flex justify-center">
            {variantStyles.icon}
          </div>

          {/* Title */}
          <h2 className={cn(
            "text-xl font-semibold mb-2",
            variantStyles.accent
          )}>
            {title}
          </h2>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-cloud-600 text-sm mb-6">
              {subtitle}
            </p>
          )}

          {/* Progress Bar */}
          {progress !== undefined && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-cloud-600 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-cloud-200 rounded-full h-2">
                <div 
                  className="bg-royal-950 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          {steps && steps.length > 0 && (
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isCompleted = currentStep !== undefined && index < currentStep
                const isCurrent = currentStep === index
                const isPending = currentStep !== undefined && index > currentStep

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center text-sm transition-all duration-300",
                      isCompleted && "text-forest-900",
                      isCurrent && "text-navy-950 font-medium",
                      isPending && "text-cloud-500"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center mr-3 transition-all duration-300",
                      isCompleted && "bg-forest-900 text-white",
                      isCurrent && "bg-royal-950 text-white",
                      isPending && "bg-cloud-200 text-cloud-500"
                    )}>
                      {isCompleted ? (
                        <Icons.Check size="sm" />
                      ) : isCurrent ? (
                        <LoadingSpinner size="sm" variant="white" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span>{step}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Animated dots for simple loading */}
          {!steps && !progress && (
            <div className="flex justify-center space-x-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full bg-royal-950 animate-pulse",
                    `animation-delay-${i * 200}`
                  )}
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1.4s'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-2xl transform rotate-12 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-2xl transform -rotate-12 translate-y-6 -translate-x-6" />
      </div>
    </div>
  )

  return createPortal(loaderContent, document.body)
} 