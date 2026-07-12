"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, MapPin, Search } from "lucide-react"
import { searchPlaces, type GeocodeSearchResult } from "@/lib/business-location"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const QUICK_CITIES = [
  { label: "CABA", query: "CABA, Buenos Aires" },
  { label: "Córdoba", query: "Córdoba, Córdoba" },
  { label: "Rosario", query: "Rosario, Santa Fe" },
  { label: "La Plata", query: "La Plata, Buenos Aires" },
  { label: "Mendoza", query: "Mendoza, Mendoza" },
  { label: "Mar del Plata", query: "Mar del Plata, Buenos Aires" },
]

interface BusinessLocationPickerProps {
  value: BusinessLocation | null
  onChange: (location: BusinessLocation | null) => void
  label?: string
  helperText?: string
  className?: string
}

export function BusinessLocationPicker({
  value,
  onChange,
  label = "Ubicación del local",
  helperText = "Buscá tu ciudad o barrio y elegí de la lista. Así tus historias se ven cerca.",
  className,
}: BusinessLocationPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeocodeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setSearching(true)
      setError(null)
      try {
        setResults(await searchPlaces(term))
      } catch {
        setError("No pudimos buscar. Probá de nuevo.")
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query])

  const selectResult = (result: GeocodeSearchResult) => {
    onChange({
      label: result.label,
      city: result.city || result.state || null,
      latitude: result.latitude,
      longitude: result.longitude,
      updatedAt: Date.now(),
    })
    setQuery("")
    setResults([])
  }

  const selectQuick = async (cityQuery: string) => {
    setSearching(true)
    setError(null)
    try {
      const found = await searchPlaces(cityQuery)
      if (found[0]) {
        selectResult(found[0])
      } else {
        setError("No encontramos esa ciudad. Probá buscando arriba.")
      }
    } catch {
      setError("No pudimos buscar. Probá de nuevo.")
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label className="text-sm font-medium text-gray-900">{label}</Label>
        {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
      </div>

      {value && hasValidCoordinates(value.latitude, value.longitude) && value.label ? (
        <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-900">{value.label}</p>
            {value.city && <p className="text-xs text-emerald-700/80">{value.city}</p>}
          </div>
          <button
            type="button"
            className="text-xs font-medium text-emerald-800 underline"
            onClick={() => onChange(null)}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Rosario, Santa Fe o tu calle"
              className="h-11 rounded-2xl pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_CITIES.map((city) => (
              <button
                key={city.label}
                type="button"
                onClick={() => void selectQuick(city.query)}
                className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-servido-800 ring-1 ring-purple-100 hover:bg-purple-100"
              >
                {city.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-2xl bg-white ring-1 ring-gray-100">
              {results.map((result) => (
                <li key={`${result.label}-${result.latitude}-${result.longitude}`}>
                  <button
                    type="button"
                    onClick={() => selectResult(result)}
                    className="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-3 text-left last:border-0 hover:bg-purple-50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-servido-700" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{result.label}</span>
                      <span className="block truncate text-xs text-gray-500">{result.fullAddress}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
