"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ImagePlus, Loader2, Sparkles } from "lucide-react"
import { auth } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"
import { describeApiError } from "@/lib/i18n/translate-client-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ServidoStoriesPanel() {
  const t = useTranslations("adminDashboard.servidoStories")
  const tApi = useTranslations("apiErrors")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] || null
    setFile(next)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next ? URL.createObjectURL(next) : null
    })
  }

  const handlePublish = async () => {
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const user = auth.currentUser
      if (!user) throw new Error(t("notLoggedIn"))
      if (!file) throw new Error(t("imageRequired"))

      const token = await user.getIdToken()
      const form = new FormData()
      form.append("file", file)
      form.append("caption", caption.trim())
      form.append("linkUrl", linkUrl.trim())

      const res = await fetch(apiUrl("/api/admin/stories"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("publishFailed"))

      setResult(t("publishSuccess"))
      setCaption("")
      setLinkUrl("")
      setFile(null)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    } catch (err) {
      setError(describeApiError(err, tApi, t("publishFailed")))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="mb-2 block">{t("imageLabel")}</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-teal-400 hover:bg-teal-50/40">
            {preview ? (
              <div className="relative aspect-[9/16] w-full max-h-[360px] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-slate-800">{t("pickPhoto")}</p>
                <p className="text-xs text-slate-500">{t("pickPhotoHint")}</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="servido-story-caption">{t("captionLabel")}</Label>
          <Textarea
            id="servido-story-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={180}
            placeholder={t("captionPlaceholder")}
            className="min-h-[90px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="servido-story-link">{t("linkLabel")}</Label>
          <Input
            id="servido-story-link"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t("linkPlaceholder")}
          />
          <p className="text-xs text-slate-500">{t("linkHint")}</p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        )}
        {result && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
            {result}
          </p>
        )}

        <Button
          type="button"
          onClick={() => void handlePublish()}
          disabled={sending || !file}
          className="w-full sm:w-auto"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("publishing")}
            </>
          ) : (
            t("publishButton")
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
