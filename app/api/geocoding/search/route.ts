import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({
        error: "Ingresá al menos 2 caracteres",
        results: [],
      })
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=ar`,
      {
        headers: {
          "User-Agent": "Servido-App/1.0",
        },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      throw new Error("Error al buscar ubicaciones")
    }

    const data = (await response.json()) as Array<{
      display_name: string
      lat: string
      lon: string
      address?: Record<string, string>
    }>

    const results = data.map((item) => {
      const address = item.address || {}
      const suburb = address.suburb || address.neighbourhood || address.quarter || ""
      const city =
        address.city || address.town || address.village || address.municipality || address.county || ""
      const state = address.state || address.province || ""
      const street = address.road || address.street || ""
      const houseNumber = address.house_number || ""

      let label = ""
      if (street && houseNumber) {
        label = `${street} ${houseNumber}`
        if (suburb && suburb !== city) label += `, ${suburb}`
        if (city) label += `, ${city}`
      } else if (suburb && city && suburb !== city) {
        label = `${suburb}, ${city}`
      } else if (city) {
        label = state && state !== city ? `${city}, ${state}` : city
      } else {
        label = item.display_name.split(",").slice(0, 3).join(",").trim()
      }

      return {
        label,
        fullAddress: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city: city || null,
        state: state || null,
        suburb: suburb || null,
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Error en búsqueda de ubicación:", error)
    return NextResponse.json({
      error: "Error al buscar ubicaciones",
      results: [],
    })
  }
}
