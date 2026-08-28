interface SafeAreaProps {
  children: React.ReactNode
  className?: string
}

/**
 * Contenedor raíz de la app. No aplica inset superior a propósito: cada
 * superficie fija (header mobile, tab bar, visor de historias, chat) resuelve
 * su propio env(safe-area-inset-*). Aplicarlo también acá duplicaba el espacio
 * contra el espaciador que el header mobile ya renderiza.
 */
export function SafeArea({ children, className = "" }: SafeAreaProps) {
  return (
    <div className={`safe-area flex min-h-full w-full flex-1 flex-col ${className}`}>
      {children}
    </div>
  )
}
