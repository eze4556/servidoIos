import Image from "next/image"
import { cn } from "@/lib/utils"

export type CountryFlagCode = "ar" | "br" | "uy" | "cl" | "mx"

type CountryFlagProps = {
  code: CountryFlagCode
  /** Ancho en px (alto = 2/3 del ancho, proporción 3:2) */
  size?: number
  className?: string
  rounded?: "sm" | "full" | "none"
}

export function CountryFlag({ code, size = 20, className, rounded = "sm" }: CountryFlagProps) {
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
        className={cn("h-full w-full object-cover")}
        unoptimized
      />
    </span>
  )
}

export function localeToFlagCode(locale: string): CountryFlagCode {
  return locale === "pt-BR" ? "br" : "ar"
}
