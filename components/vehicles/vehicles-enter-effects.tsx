"use client"

import { useEffect } from "react"
import { playAutosEnterSound } from "@/lib/vehicles/autos-enter-sound"

export function VehiclesEnterEffects() {
  useEffect(() => {
    const played = playAutosEnterSound()
    if (played) return

    const root = document.querySelector(".vehicles-vertical")
    if (!root) return

    const onInteract = () => {
      playAutosEnterSound()
      root.removeEventListener("pointerdown", onInteract)
      root.removeEventListener("keydown", onInteract)
    }

    root.addEventListener("pointerdown", onInteract, { once: true })
    root.addEventListener("keydown", onInteract, { once: true })

    return () => {
      root.removeEventListener("pointerdown", onInteract)
      root.removeEventListener("keydown", onInteract)
    }
  }, [])

  return null
}
