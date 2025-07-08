'use client'

import { useEffect, useState } from 'react'

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'loading'
  isVisible: boolean
  onClose: () => void
  duration?: number
  persistent?: boolean
}

export default function Toast({ message, type, isVisible, onClose, duration = 3000, persistent = false }: ToastProps) {
  useEffect(() => {
    if (isVisible && !persistent) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose, duration, persistent])

  if (!isVisible) return null

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return { bgColor: 'bg-green-600', borderColor: 'border-green-500' }
      case 'error':
        return { bgColor: 'bg-red-600', borderColor: 'border-red-500' }
      case 'loading':
        return { bgColor: 'bg-blue-600', borderColor: 'border-blue-500' }
      default:
        return { bgColor: 'bg-gray-600', borderColor: 'border-gray-500' }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )
      default:
        return 'ℹ'
    }
  }

  const { bgColor, borderColor } = getToastColors()
  const icon = getIcon()

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${bgColor} ${borderColor} border rounded-lg p-4 max-w-sm shadow-xl transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="flex items-center gap-3">
          <div className="text-white text-lg font-bold flex items-center justify-center">
            {icon}
          </div>
          <div className="text-white text-sm font-medium flex-1">
            {message}
          </div>
          {!persistent && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-lg font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'loading'
    isVisible: boolean
    persistent: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false,
    persistent: false
  })

  const showToast = (message: string, type: 'success' | 'error' | 'loading' = 'success', persistent: boolean = false) => {
    setToast({
      message,
      type,
      isVisible: true,
      persistent
    })
  }

  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }))
  }

  const showLoadingToast = (message: string) => {
    showToast(message, 'loading', true)
  }

  return {
    toast,
    showToast,
    hideToast,
    showLoadingToast
  }
} 