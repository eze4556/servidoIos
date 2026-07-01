"use client"

import { useEffect, useState } from 'react'

interface SafeAreaProps {
  children: React.ReactNode
  className?: string
}

export function SafeArea({ children, className = '' }: SafeAreaProps) {
  const [safeAreaTop, setSafeAreaTop] = useState('0px')

  useEffect(() => {
    // Obtener el valor de env() para safe-area-inset-top
    const updateSafeArea = () => {
      // Para iOS y Android modernos
      if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        setSafeAreaTop('env(safe-area-inset-top)')
      } else {
        // Fallback para dispositivos que no soportan env()
        setSafeAreaTop('0px')
      }
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return (
    <div 
      className={`safe-area flex min-h-full w-full flex-1 flex-col ${className}`}
      style={{
        paddingTop: safeAreaTop,
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  )
}
