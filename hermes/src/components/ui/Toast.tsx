'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, RotateCcw, X } from 'lucide-react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  action?: ToastAction
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...toast, id }
    setToasts(prev => [...prev.slice(-2), newToast])

    const duration = toast.duration ?? 6500
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }
    return id
  }, [dismissToast])

  const toastContainer = (
    <>
      <style>{`
        @keyframes toastSlideUpAnim {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        id="toast-notification-root"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '420px',
          width: 'calc(100vw - 56px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: '16px',
              animation: 'toastSlideUpAnim 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              background: t.type === 'error' ? 'rgba(38, 14, 20, 0.98)' : 'rgba(16, 19, 32, 0.98)',
              border: t.type === 'error' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {t.type === 'error' ? (
                <AlertCircle style={{ width: 20, height: 20, color: '#f87171', flexShrink: 0 }} />
              ) : (
                <CheckCircle2 style={{ width: 20, height: 20, color: '#34d399', flexShrink: 0 }} />
              )}
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.message}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    dismissToast(t.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: 'rgba(139, 92, 246, 0.22)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(139, 92, 246, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCcw style={{ width: 14, height: 14 }} />
                  <span>{t.action.label}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Cerrar"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(toastContainer, document.body)}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
