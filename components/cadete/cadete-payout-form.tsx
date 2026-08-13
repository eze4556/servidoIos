"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { BankPayoutInfo } from "@/types/delivery-settlements"

export function CadetePayoutForm() {
  const t = useTranslations("cadeteDashboard")
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser?.uid
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titular, setTitular] = useState("")
  const [cbu, setCbu] = useState("")
  const [alias, setAlias] = useState("")
  const [banco, setBanco] = useState("")
  const [dni, setDni] = useState("")

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, "users", uid))
        const info = snap.data()?.cadetePayoutInfo as BankPayoutInfo | undefined
        if (info) {
          setTitular(info.titular || "")
          setCbu(info.cbu || "")
          setAlias(info.alias || "")
          setBanco(info.banco || "")
          setDni(info.dni || "")
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [uid])

  const handleSave = async () => {
    if (!uid) return
    const titularTrim = titular.trim()
    const cbuTrim = cbu.replace(/\s/g, "")
    const aliasTrim = alias.trim()
    if (!titularTrim) {
      setError(t("payoutTitularRequired"))
      return
    }
    if (!cbuTrim && !aliasTrim) {
      setError(t("payoutCbuOrAliasRequired"))
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payoutInfo: BankPayoutInfo = {
        titular: titularTrim,
        cbu: cbuTrim || null,
        alias: aliasTrim || null,
        banco: banco.trim() || null,
        dni: dni.trim() || null,
        updatedAt: new Date().toISOString(),
      }
      await setDoc(
        doc(db, "users", uid),
        { cadetePayoutInfo: payoutInfo, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setSaved(true)
    } catch {
      setError(t("payoutSaveError"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{t("payoutFormHint")}</p>
      <div className="space-y-1.5">
        <Label className="text-slate-300" htmlFor="cadete-titular">
          {t("payoutTitular")}
        </Label>
        <Input
          id="cadete-titular"
          value={titular}
          onChange={(e) => setTitular(e.target.value)}
          className="border-slate-700 bg-slate-900 text-white"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-slate-300" htmlFor="cadete-cbu">
            {t("payoutCbu")}
          </Label>
          <Input
            id="cadete-cbu"
            value={cbu}
            onChange={(e) => setCbu(e.target.value)}
            className="border-slate-700 bg-slate-900 text-white"
            placeholder="22 dígitos"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300" htmlFor="cadete-alias">
            {t("payoutAlias")}
          </Label>
          <Input
            id="cadete-alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="border-slate-700 bg-slate-900 text-white"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-slate-300" htmlFor="cadete-banco">
            {t("payoutBank")}
          </Label>
          <Input
            id="cadete-banco"
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            className="border-slate-700 bg-slate-900 text-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300" htmlFor="cadete-dni">
            {t("payoutDni")}
          </Label>
          <Input
            id="cadete-dni"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            className="border-slate-700 bg-slate-900 text-white"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">{t("payoutSaved")}</p>}
      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full rounded-full bg-sky-500 text-slate-950 hover:bg-sky-400"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("payoutSave")}
      </Button>
    </div>
  )
}
