"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Megaphone } from "lucide-react"

type Audience = "all" | "buyers" | "sellers" | "resellers" | "cadetes" | "city" | "country"

export function ServidoBroadcastPanel() {
  const t = useTranslations("adminDashboard.servidoBroadcast")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState("")
  const [audience, setAudience] = useState<Audience>("all")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [msgType, setMsgType] = useState("promo")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const user = auth.currentUser
      if (!user) throw new Error(t("notLoggedIn"))
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || null,
          audience,
          city: audience === "city" ? city.trim() : null,
          country: audience === "country" ? country.trim() : null,
          type: msgType,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("sendFailed"))
      setResult(t("sendSuccess", { count: data.sent ?? 0 }))
      setTitle("")
      setBody("")
      setLink("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendFailed"))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="broadcast-type">{t("typeLabel")}</Label>
            <Select value={msgType} onValueChange={setMsgType}>
              <SelectTrigger id="broadcast-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promo">{t("types.promo")}</SelectItem>
                <SelectItem value="system">{t("types.news")}</SelectItem>
                <SelectItem value="payment">{t("types.important")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-audience">{t("audienceLabel")}</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger id="broadcast-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("audiences.all")}</SelectItem>
                <SelectItem value="buyers">{t("audiences.buyers")}</SelectItem>
                <SelectItem value="sellers">{t("audiences.sellers")}</SelectItem>
                <SelectItem value="resellers">{t("audiences.resellers")}</SelectItem>
                <SelectItem value="cadetes">{t("audiences.cadetes")}</SelectItem>
                <SelectItem value="city">{t("audiences.city")}</SelectItem>
                <SelectItem value="country">{t("audiences.country")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {audience === "country" && (
          <div className="space-y-2">
            <Label htmlFor="broadcast-country">{t("countryLabel")}</Label>
            <Input
              id="broadcast-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("countryPlaceholder")}
            />
          </div>
        )}

        {audience === "city" && (
          <div className="space-y-2">
            <Label htmlFor="broadcast-city">{t("cityLabel")}</Label>
            <Input
              id="broadcast-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("cityPlaceholder")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="broadcast-title">{t("titleLabel")}</Label>
          <Input id="broadcast-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="broadcast-body">{t("bodyLabel")}</Label>
          <Textarea
            id="broadcast-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("bodyPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="broadcast-link">{t("linkLabel")}</Label>
          <Input
            id="broadcast-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/products"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700">{result}</p>}

        <Button
          className="rounded-full"
          disabled={sending || !title.trim() || !body.trim()}
          onClick={() => void handleSend()}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            t("sendButton")
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
