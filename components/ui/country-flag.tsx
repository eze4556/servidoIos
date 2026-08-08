import Image from "next/image"
import { cn } from "@/lib/utils"

export type CountryFlagCode = "ar" | "br" | "uy" | "cl" | "mx"

type CountryFlagProps = {
  code: CountryFlagCode
  /** Ancho en px (alto = 2/3 del ancho en variante plana; círculo en glass) */
  size?: number
  className?: string
  rounded?: "sm" | "full" | "none"
  /** Plana (rectangular) o burbuja de vidrio con bandera ondulada (SVG propio) */
  variant?: "flat" | "glass"
  /** Ajusta el brillo del borde según el fondo */
  tone?: "onDark" | "onLight"
}

export function CountryFlag({
  code,
  size = 20,
  className,
  rounded = "sm",
  variant = "flat",
  tone = "onLight",
}: CountryFlagProps) {
  if (variant === "glass") {
    const onDark = tone === "onDark"
    const flagWidth = Math.round(size * 0.78)
    const flagHeight = Math.round(flagWidth * (2 / 3))

    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full",
          onDark
            ? "bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_2px_10px_rgba(0,0,0,0.2)] ring-[1.5px] ring-white/30"
            : "bg-purple-50/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(76,29,149,0.12)] ring-[1.5px] ring-purple-200/70",
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Image
          src={`/flags/wave/${code}.svg`}
          alt=""
          width={flagWidth}
          height={flagHeight}
          className="relative z-[1] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          unoptimized
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 z-[2] rounded-full",
            onDark
              ? "bg-gradient-to-br from-white/30 via-white/5 to-transparent"
              : "bg-gradient-to-br from-white/70 via-white/15 to-transparent"
          )}
        />
      </span>
    )
  }

  const height = Math.round(size * (2 / 3))
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden bg-gray-100",
        rounded === "full" && "rounded-full",
        rounded === "sm" && "rounded-md shadow-sm ring-1 ring-black/5",
        className
      )}
      style={{ width: size, height: rounded === "full" ? size : height }}
      aria-hidden
    >
      <Image
        src={`/flags/${code}.svg`}
        alt=""
        width={size}
        height={height}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  )
}

export function localeToFlagCode(locale: string): CountryFlagCode {
  return locale === "pt-BR" ? "br" : "ar"
}
