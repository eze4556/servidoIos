"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Loader2, MapPin, Navigation, Search, X } from "lucide-react"
import { useLocation } from "@/contexts/location-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface SearchResult {
  label: string
  fullAddress: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
}

const QUICK_CITIES = [
  { label: "CABA", value: "CABA, Buenos Aires" },
  { label: "Córdoba", value: "Córdoba, Córdoba" },
  { label: "Rosario", value: "Rosario, Santa Fe" },
  { label: "La Plata", value: "La Plata, Buenos Aires" },
  { label: "Mendoza", value: "Mendoza, Mendoza" },
  { label: "Mar del Plata", value: "Mar del Plata, Buenos Aires" },
]

export function LocationPickerSheet() {
  const {
    pickerOpen,
    closeLocationPicker,
    userLocation,
    shortLocation,
    loadingLocation,
    refreshLocation,
    setManualLocation,
  } = useLocation()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pickerOpen) {
      setQuery("")
      setResults([])
      setError(null)
      setSearching(false)
      setDetecting(false)
      setSaving(false)
    }
  }, [pickerOpen])

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
        const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(term)}`)
        const data = await response.json()
        setResults(Array.isArray(data.results) ? data.results : [])
      } catch {
        setError("No pudimos buscar ubicaciones. Probá de nuevo.")
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query])

  const handleSelect = async (label: string, latitude = 0, longitude = 0) => {
    setSaving(true)
    setError(null)
    try {
      await setManualLocation({ location: label, latitude, longitude })
    } catch {
      setError("No se pudo guardar la ubicación.")
    } finally {
      setSaving(false)
    }
  }

  const handleDetectGps = async () => {
    setDetecting(true)
    setError(null)
    try {
      await refreshLocation()
      closeLocationPicker()
    } catch {
      setError("No pudimos detectar tu ubicación. Escribí ciudad o barrio.")
    } finally {
      setDetecting(false)
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (!term) return
    if (results[0]) {
      await handleSelect(results[0].label, results[0].latitude, results[0].longitude)
      return
    }
    await handleSelect(term)
  }

  return (
    <Dialog open={pickerOpen} onOpenChange={(open) => !open && closeLocationPicker()}>
      <DialogContent
        className={cn(
          "z-[70] flex max-h-[min(90dvh,640px)] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-2xl shadow-servido-950/25",
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "sm:w-full",
          "[&>button]:hidden"
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-gray-100 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700 px-5 pb-5 pt-5 text-left">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                ¿Dónde enviamos?
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-purple-100/90">
                Elegí ciudad o barrio, o usá tu ubicación actual.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={closeLocationPicker}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {(userLocation || loadingLocation) && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-white/10 px-3.5 py-3 text-sm text-white ring-1 ring-white/15 backdrop-blur-sm">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-servido-gold/20 text-servido-gold">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200">
                  Ubicación actual
                </p>
                <p className="mt-0.5 truncate font-semibold">
                  {loadingLocation ? "Detectando..." : shortLocation || userLocation}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={() => void handleDetectGps()}
            disabled={detecting || loadingLocation}
            className="h-12 w-full rounded-2xl bg-servido-800 text-sm font-semibold shadow-md shadow-purple-200 hover:bg-servido-900"
          >
            {detecting || loadingLocation ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="mr-2 h-4 w-4" />
            )}
            Usar mi ubicación actual
          </Button>

          <div className="relative flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              o buscá
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={(e) => void handleCustomSubmit(e)} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ciudad, barrio o CP..."
              className="h-12 rounded-2xl border-0 bg-gray-50 pl-10 pr-10 text-base ring-1 ring-gray-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-purple-300 sm:text-sm"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Limpiar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {error && (
            <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}

          {searching && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-servido-700" />
              Buscando...
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length > 0 && (
            <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
              {results.map((result) => (
                <li key={`${result.label}-${result.latitude}-${result.longitude}`}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSelect(result.label, result.latitude, result.longitude)}
                    className="flex w-full items-center gap-3 border-b border-gray-50 px-3.5 py-3.5 text-left transition-colors last:border-0 hover:bg-purple-50 disabled:opacity-60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-servido-800">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {result.label}
                      </span>
                      {(result.city || result.state) && (
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {[result.city, result.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSelect(query.trim())}
              className="flex w-full items-center gap-3 rounded-2xl bg-purple-50 px-3.5 py-3.5 text-left ring-1 ring-purple-100 transition-colors hover:bg-purple-100/70"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-servido-800 shadow-sm">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="text-sm text-gray-700">
                Usar <strong className="text-servido-900">&quot;{query.trim()}&quot;</strong>
              </span>
            </button>
          )}

          {query.trim().length < 2 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Ciudades frecuentes
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CITIES.map((city) => {
                  const isActive =
                    shortLocation === city.value ||
                    shortLocation === city.label ||
                    userLocation.startsWith(city.label)
                  return (
                    <button
                      key={city.value}
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSelect(city.value)}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-left text-sm font-medium ring-1 transition-all",
                        isActive
                          ? "bg-servido-800 text-white ring-servido-800 shadow-md shadow-purple-200"
                          : "bg-gray-50 text-gray-800 ring-gray-100 hover:bg-purple-50 hover:text-servido-900 hover:ring-purple-200"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className={cn("h-3.5 w-3.5", isActive ? "text-servido-gold" : "text-servido-700")} />
                        {city.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
