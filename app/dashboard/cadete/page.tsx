"use client"

import Link from "next/link"
import { Bike, CheckCircle2, Clock, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CadeteDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="container mx-auto max-w-lg px-4 py-12 text-center">
        <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Bike className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Panel de cadete</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tu postulación está en revisión. Te avisaremos cuando puedas empezar a recibir pedidos.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl bg-white p-6 text-left ring-1 ring-gray-100">
          {[
            { icon: CheckCircle2, text: "Registro recibido correctamente" },
            { icon: Clock, text: "Validación de documentación en proceso" },
            { icon: Bike, text: "Panel de entregas disponible próximamente" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
              <Icon className="h-5 w-5 text-sky-600" />
              {text}
            </div>
          ))}
        </div>

        <Button asChild className="mt-8 rounded-full bg-servido-800">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}
