"use client"

import { useTranslations } from "next-intl"
import { MapPin, Radio, ShieldCheck } from "lucide-react"

/**
 * Aviso destacado que exige Google Play antes de recolectar ubicación: explica
 * qué se comparte, con quién y cuándo se corta, y requiere que el cadete toque
 * el botón para activarlo. Mientras no acepte, el seguimiento no arranca.
 */
export function CadeteLocationConsent({
  granted,
  onGrant,
  onRevoke,
}: {
  granted: boolean
  onGrant: () => void
  onRevoke: () => void
}) {
  const t = useTranslations("cadeteDashboard")

  if (granted) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sky-500/10 px-4 py-3 ring-1 ring-sky-500/30">
        <p className="flex items-center gap-2 text-xs font-medium text-sky-200">
          <Radio className="h-4 w-4 shrink-0 animate-pulse" />
          {t("locationSharingActive")}
        </p>
        <button
          type="button"
          onClick={onRevoke}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-sky-300 underline underline-offset-2 active:text-sky-100"
        >
          {t("locationStopSharing")}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-sky-500/40">
      <p className="flex items-center gap-2 text-sm font-bold text-sky-300">
        <MapPin className="h-5 w-5 shrink-0" />
        {t("locationConsentTitle")}
      </p>
      <p className="mt-2 text-sm leading-snug text-slate-300">{t("locationConsentBody")}</p>
      <ul className="mt-3 space-y-1.5 text-xs leading-snug text-slate-400">
        <li>· {t("locationConsentPointWho")}</li>
        <li>· {t("locationConsentPointWhen")}</li>
        <li>· {t("locationConsentPointStop")}</li>
      </ul>
      <button
        type="button"
        onClick={onGrant}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-base font-bold text-white active:bg-sky-500"
      >
        <ShieldCheck className="h-5 w-5" />
        {t("locationConsentAccept")}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">{t("locationConsentDeclineHint")}</p>
    </div>
  )
}
