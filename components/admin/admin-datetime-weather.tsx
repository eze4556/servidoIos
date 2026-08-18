"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Cloud, CloudFog, CloudRain, CloudSnow, CloudSun, MapPin, Sun, Wind, Zap } from "lucide-react"

type WeatherState = {
  temp: number
  code: number
  humidity: number | null
  wind: number | null
  city: string
}

const FALLBACK = { lat: -34.6037, lon: -58.3816, city: "Buenos Aires" }

function weatherKind(code: number) {
  if (code === 0) return "clear" as const
  if (code <= 2) return "partly" as const
  if (code === 3) return "cloudy" as const
  if (code <= 48) return "fog" as const
  if (code <= 57) return "drizzle" as const
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain" as const
  if (code <= 77 || (code >= 85 && code <= 86)) return "snow" as const
  return "storm" as const
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const kind = weatherKind(code)
  if (kind === "clear") return <Sun className={className} />
  if (kind === "partly") return <CloudSun className={className} />
  if (kind === "cloudy") return <Cloud className={className} />
  if (kind === "fog") return <CloudFog className={className} />
  if (kind === "snow") return <CloudSnow className={className} />
  if (kind === "storm") return <Zap className={className} />
  return <CloudRain className={className} />
}

async function reverseCity(lat: number, lon: number, locale: string): Promise<string | null> {
  const lang = locale.startsWith("pt") ? "pt" : "es"
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
  )
  if (!res.ok) return null
  const data = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string }
  return data.city || data.locality || data.principalSubdivision || null
}

async function fetchWeather(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error("weather")
  const data = await res.json()
  return {
    temp: Number(data?.current?.temperature_2m),
    code: Number(data?.current?.weather_code),
    humidity: Number.isFinite(Number(data?.current?.relative_humidity_2m))
      ? Number(data?.current?.relative_humidity_2m)
      : null,
    wind: Number.isFinite(Number(data?.current?.wind_speed_10m)) ? Number(data?.current?.wind_speed_10m) : null,
  }
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function useLocalWeather(locale: string) {
  const [weather, setWeather] = useState<WeatherState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async (lat: number, lon: number, fallbackCity: string) => {
      try {
        const [w, city] = await Promise.all([fetchWeather(lat, lon), reverseCity(lat, lon, locale)])
        if (cancelled) return
        setWeather({
          temp: w.temp,
          code: w.code,
          humidity: w.humidity,
          wind: w.wind,
          city: city || fallbackCity,
        })
      } catch {
        if (!cancelled) setWeather(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!navigator.geolocation) {
      void load(FALLBACK.lat, FALLBACK.lon, FALLBACK.city)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void load(pos.coords.latitude, pos.coords.longitude, FALLBACK.city)
      },
      () => {
        void load(FALLBACK.lat, FALLBACK.lon, FALLBACK.city)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    )

    return () => {
      cancelled = true
    }
  }, [locale])

  return { weather, loading }
}

export function AdminDatetimeWeather({
  variant = "card",
}: {
  variant?: "card" | "compact"
}) {
  const t = useTranslations("adminDashboard.weather")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const now = useLiveClock()
  const { weather, loading } = useLocalWeather(locale)

  const weekday = now.toLocaleDateString(dateLocale, { weekday: "long" })
  const dateLabel = now.toLocaleDateString(dateLocale, { day: "numeric", month: "long" })
  const timeLabel = now.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const condition = weather ? t(`codes.${weatherKind(weather.code)}`) : null

  const tempLabel = useMemo(() => {
    if (!weather || !Number.isFinite(weather.temp)) return "—"
    return `${Math.round(weather.temp)}°`
  }, [weather])

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
        <div className="min-w-[92px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {weekday}
          </p>
          <p className="font-mono text-sm tabular-nums text-slate-800">{timeLabel.slice(0, 5)}</p>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-700">
          {loading ? (
            <CloudSun className="h-4 w-4 animate-pulse text-teal-600" />
          ) : weather ? (
            <WeatherIcon code={weather.code} className="h-4 w-4 text-teal-600" />
          ) : (
            <Cloud className="h-4 w-4 text-slate-400" />
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold tabular-nums">{loading ? "…" : tempLabel}</p>
            <p className="max-w-[110px] truncate text-[10px] text-slate-500">
              {weather?.city || t("unavailable")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="admin-weather-card relative isolate w-full overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-slate-900/20 lg:max-w-[320px]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">{weekday}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{dateLabel}</p>
          <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight">{timeLabel}</p>
        </div>
        <div className="flex flex-col items-end">
          {loading ? (
            <CloudSun className="h-10 w-10 animate-pulse text-white/80" />
          ) : weather ? (
            <WeatherIcon code={weather.code} className="h-10 w-10 text-sky-200" />
          ) : (
            <Cloud className="h-10 w-10 text-white/50" />
          )}
          <p className="mt-1 text-3xl font-semibold tabular-nums">{loading ? "…" : tempLabel}</p>
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-2 text-sm text-white/80">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{weather?.city || (loading ? t("loading") : t("unavailable"))}</span>
      </div>
      <p className="relative mt-1 text-sm text-white/70">{condition || " "}</p>
      {weather && (
        <div className="relative mt-4 flex items-center gap-4 text-[11px] uppercase tracking-[0.12em] text-white/55">
          {weather.humidity != null && (
            <span>
              {t("humidity")} {Math.round(weather.humidity)}%
            </span>
          )}
          {weather.wind != null && (
            <span className="inline-flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {Math.round(weather.wind)} km/h
            </span>
          )}
        </div>
      )}
    </aside>
  )
}
