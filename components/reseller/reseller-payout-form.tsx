"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"
import type { ResellerPayoutInfo } from "@/types/reseller"

type ResellerPayoutFormProps = {
  onSaved?: () => void
  compact?: boolean
}

export function ResellerPayoutForm({ onSaved, compact }: ResellerPayoutFormProps) {
  const t = useTranslations("resellerProgram")
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser?.uid
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [titular, setTitular] = useState("")
  const [cbu, setCbu] = useState("")
  const [alias, setAlias] = useState("")
  const [banco, setBanco] = useState("")
  const [dni, setDni] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      try {
        const snap = await getDoc(doc(db, "users", uid))
        const info = snap.data()?.resellerPayoutInfo as ResellerPayoutInfo | undefined
        if (info) {
          setTitular(info.titular || "")
          setCbu(info.cbu || "")
          setAlias(info.alias || "")
          setBanco(info.banco || "")
          setDni(info.dni || "")
        }
      } catch (err) {
        console.error("load reseller payout info", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [uid])

  const handleSave = async () => {
    if (!uid) {
      toast({ title: t("loginRequired"), variant: "destructive" })
      return
    }
    const titularTrim = titular.trim()
    const cbuTrim = cbu.replace(/\s/g, "")
    const aliasTrim = alias.trim()
    if (!titularTrim) {
      toast({ title: t("error"), description: t("titularRequired"), variant: "destructive" })
      return
    }
    if (!cbuTrim && !aliasTrim) {
      toast({ title: t("error"), description: t("cbuOrAliasRequired"), variant: "destructive" })
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    try {
      const payoutInfo: ResellerPayoutInfo = {
        titular: titularTrim,
        cbu: cbuTrim || null,
        alias: aliasTrim || null,
        banco: banco.trim() || null,
        dni: dni.trim() || null,
        updatedAt: new Date().toISOString(),
      }
      await setDoc(
        doc(db, "users", uid),
        {
          resellerPayoutInfo: payoutInfo,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      setSaveSuccess(true)
      toast({
        title: t("payoutSaved"),
        description: t("payoutSavedDesc"),
      })
      onSaved?.()
    } catch (err) {
      console.error("save reseller payout info", err)
      toast({ title: t("error"), description: t("payoutSaveError"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {saveSuccess && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertTitle>{t("payoutSaved")}</AlertTitle>
          <AlertDescription>{t("payoutSavedDesc")}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">{t("payoutFormHint")}</p>
      <div className="space-y-2">
        <Label htmlFor="reseller-titular">{t("titular")}</Label>
        <Input
          id="reseller-titular"
          value={titular}
          onChange={(e) => {
            setSaveSuccess(false)
            setTitular(e.target.value)
          }}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reseller-cbu">{t("cbu")}</Label>
          <Input id="reseller-cbu" value={cbu} onChange={(e) => setCbu(e.target.value)} placeholder="22 dígitos" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reseller-alias">{t("alias")}</Label>
          <Input id="reseller-alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reseller-banco">{t("bank")}</Label>
          <Input id="reseller-banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reseller-dni">{t("dni")}</Label>
          <Input id="reseller-dni" value={dni} onChange={(e) => setDni(e.target.value)} />
        </div>
      </div>
      <Button type="button" onClick={() => void handleSave()} disabled={saving} className="rounded-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("savePayout")}
      </Button>
    </div>
  )
}
