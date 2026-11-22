"use client"

import { useState } from "react"
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"
import { describeApiError } from "@/lib/i18n/translate-client-error"
import { unregisterPushToken } from "@/lib/push/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const CONFIRM_WORD = "ELIMINAR"

export function DeleteAccountSection({ className }: { className?: string }) {
  const t = useTranslations("deleteAccount")
  const tApi = useTranslations("apiErrors")
  const router = useRouter()
  const { currentUser } = useAuth()
  const [password, setPassword] = useState("")
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!currentUser) return null

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD

  const handleDelete = async () => {
    if (!canConfirm || loading) return
    setLoading(true)
    setError(null)
    try {
      const user = auth.currentUser
      if (!user?.email || !password) throw new Error(t("passwordRequired"))
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      const token = await user.getIdToken(true)
      if (!token) throw new Error("Sin sesión")

      const response = await fetch(apiUrl("/api/account/delete"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar la cuenta. Intentá de nuevo.")
      }

      try {
        await unregisterPushToken()
      } catch {
        /* ignore */
      }

      try {
        const { signOut } = await import("firebase/auth")
        await signOut(auth)
      } catch {
        /* Auth user may already be deleted */
      }

      setOpen(false)
      router.replace("/login?accountDeleted=1")
    } catch (err) {
      setError(describeApiError(err, tApi, t("errorFallback")))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-red-100 bg-red-50/40 p-5",
        className
      )}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-red-900">{t("title")}</h3>
        <p className="text-sm text-red-800/80">{t("description")}</p>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (loading) return
          setOpen(next)
          if (!next) {
            setPassword("")
            setConfirmText("")
            setError(null)
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("button")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">{t("dialogDescription")}</span>
              <span className="block font-medium text-red-700">{t("dialogWarning")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-account-password">{t("password")}</Label>
            <Input id="delete-account-password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            <Label htmlFor="delete-account-confirm">{t("confirmLabel", { word: CONFIRM_WORD })}</Label>
            <Input
              id="delete-account-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              disabled={loading}
              className="rounded-xl"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="rounded-full">
              {t("cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={!canConfirm || !password || loading}
              onClick={() => void handleDelete()}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? t("deleting") : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
