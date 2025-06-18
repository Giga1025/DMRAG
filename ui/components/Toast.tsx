'use client'

import { useEffect, useState } from 'react'

export interface ToastProps {
  message: string
  type: 'success' | 'error'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose, duration])

  if (!isVisible) return null

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600'
  const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500'
  const icon = type === 'success' ? '✓' : '✕'

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${bgColor} ${borderColor} border rounded-lg p-4 max-w-sm shadow-xl transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="flex items-center gap-3">
          <div className="text-white text-lg font-bold">
            {icon}
          </div>
          <div className="text-white text-sm font-medium flex-1">
            {message}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-lg font-bold ml-2"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
    isVisible: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    })
  }

  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }))
  }

  return {
    toast,
    showToast,
    hideToast
  }
} 