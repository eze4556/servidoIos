"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CreditCard, Calendar, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"
import { SellerBankConfig, TAX_RATES } from "@/types/centralized-payments"
import {
  saveSellerBankConfig as saveBankConfig,
  getSellerBankConfig as getBankConfig,
  updateSellerBankConfig as updateBankConfig,
} from "@/lib/centralized-payments-api"

interface BankConfigFormProps {
  sellerId: string
  onConfigSaved?: () => void
}

const WITHDRAW_OPTIONS = [
  { value: "a_7_dias", labelKey: "days7" as const, descKey: "tax7Description" as const },
  { value: "a_15_dias", labelKey: "days15" as const, descKey: "tax15Description" as const },
  { value: "a_35_dias", labelKey: "days35" as const, descKey: "tax35Description" as const },
] as const

export function BankConfigForm({ sellerId, onConfigSaved }: BankConfigFormProps) {
  const t = useTranslations("sellerDashboard.bankConfig")
  const { toast } = useToast()

  const [config, setConfig] = useState<Partial<SellerBankConfig>>({
    vendedorId: sellerId,
    cbu: "",
    alias: "",
    tipoCuenta: "ahorro",
    banco: "",
    titular: "",
    cuit: "",
    preferenciaRetiro: "a_7_dias",
    impuesto7Dias: TAX_RATES.a_7_dias * 100,
    impuesto15Dias: TAX_RATES.a_15_dias * 100,
    impuesto35Dias: TAX_RATES.a_35_dias * 100,
    isActive: true,
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [existingConfig, setExistingConfig] = useState<SellerBankConfig | null>(null)

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setLoading(true)
        const existing = await getBankConfig(sellerId)
        if (existing) {
          setExistingConfig(existing)
          setConfig({
            ...existing,
            vendedorId: String(existing.vendedorId || sellerId),
            cbu: String(existing.cbu || ""),
            alias: existing.alias ? String(existing.alias) : "",
            banco: String(existing.banco || ""),
            titular: String(existing.titular || ""),
            cuit: existing.cuit ? String(existing.cuit) : "",
            tipoCuenta: existing.tipoCuenta || "ahorro",
            preferenciaRetiro: existing.preferenciaRetiro || "a_7_dias",
            impuesto7Dias: Number(existing.impuesto7Dias || TAX_RATES.a_7_dias * 100),
            impuesto15Dias: Number(existing.impuesto15Dias || TAX_RATES.a_15_dias * 100),
            impuesto35Dias: Number(existing.impuesto35Dias || TAX_RATES.a_35_dias * 100),
            isActive: Boolean(existing.isActive),
          })
        }
      } catch (error) {
        console.error("Error loading bank config:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadExistingConfig()
  }, [sellerId])

  const handleInputChange = (field: keyof SellerBankConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (errors.length > 0) {
      setErrors([])
    }
  }

  const getTaxRate = (preference: string) => {
    switch (preference) {
      case "a_7_dias":
        return Math.round(TAX_RATES.a_7_dias * 100 * 100) / 100
      case "a_15_dias":
        return Math.round(TAX_RATES.a_15_dias * 100 * 100) / 100
      case "a_35_dias":
        return Math.round(TAX_RATES.a_35_dias * 100 * 100) / 100
      default:
        return 0
    }
  }

  const handleSave = async () => {
    let sanitizedConfig: Record<string, unknown> | null = null

    try {
      setSaving(true)
      setErrors([])

      const mainErrors: string[] = []
      if (!config.cbu || String(config.cbu).trim() === "") mainErrors.push(t("validation.cbuRequired"))
      if (!config.banco || String(config.banco).trim() === "") mainErrors.push(t("validation.bankRequired"))
      if (!config.titular || String(config.titular).trim() === "") mainErrors.push(t("validation.holderRequired"))
      if (mainErrors.length > 0) {
        setErrors(mainErrors)
        setSaving(false)
        return
      }

      sanitizedConfig = {}
      Object.entries(config).forEach(([key, value]) => {
        if (typeof value === "boolean" || typeof value === "number" || value === null || value === undefined) {
          sanitizedConfig![key] = value
        } else {
          sanitizedConfig![key] = String(value)
        }
      })

      if (existingConfig) {
        await updateBankConfig(existingConfig.id, sanitizedConfig)
        toast({
          title: t("toastUpdatedTitle"),
          description: t("toastUpdatedDescription"),
        })
      } else {
        const configToSave = sanitizedConfig as Omit<SellerBankConfig, "id" | "createdAt" | "updatedAt">
        const newId = await saveBankConfig(configToSave)
        setExistingConfig({ ...sanitizedConfig, id: newId } as SellerBankConfig)
        toast({
          title: t("toastSavedTitle"),
          description: t("toastSavedDescription"),
        })
      }

      onConfigSaved?.()
    } catch (error) {
      console.error("Error saving bank config:", error)
      toast({
        title: t("toastErrorTitle"),
        description: t("toastErrorDescription", {
          message: error instanceof Error ? error.message : t("unknownError"),
        }),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg font-semibold text-gray-700">{t("loading")}</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            {existingConfig ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">{t("statusSaved")}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">{t("statusPending")}</span>
              </>
            )}
          </div>
          <Badge variant={existingConfig ? "default" : "secondary"}>
            {existingConfig ? t("badgeActive") : t("badgePending")}
          </Badge>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("validationErrorsTitle")}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cbu">{t("cbuLabel")}</Label>
            <Input
              id="cbu"
              value={config.cbu || ""}
              onChange={(e) => handleInputChange("cbu", e.target.value)}
              placeholder={t("cbuPlaceholder")}
              maxLength={22}
            />
            <p className="text-xs text-gray-500">{t("cbuHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias">{t("aliasLabel")}</Label>
            <Input
              id="alias"
              value={config.alias || ""}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder={t("aliasPlaceholder")}
            />
            <p className="text-xs text-gray-500">{t("aliasHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banco">{t("bankLabel")}</Label>
            <Input
              id="banco"
              value={config.banco || ""}
              onChange={(e) => handleInputChange("banco", e.target.value)}
              placeholder={t("bankPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoCuenta">{t("accountTypeLabel")}</Label>
            <Select
              value={config.tipoCuenta || "ahorro"}
              onValueChange={(value) => handleInputChange("tipoCuenta", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahorro">{t("accountTypeSavings")}</SelectItem>
                <SelectItem value="corriente">{t("accountTypeChecking")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titular">{t("holderLabel")}</Label>
            <Input
              id="titular"
              value={config.titular || ""}
              onChange={(e) => handleInputChange("titular", e.target.value)}
              placeholder={t("holderPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuit">{t("cuitLabel")}</Label>
            <Input
              id="cuit"
              value={config.cuit || ""}
              onChange={(e) => handleInputChange("cuit", e.target.value)}
              placeholder={t("cuitPlaceholder")}
            />
            <p className="text-xs text-gray-500">{t("cuitHint")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Label>{t("withdrawPreferenceLabel")}</Label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {WITHDRAW_OPTIONS.map((option) => {
              const rate = getTaxRate(option.value)
              const isSelected = config.preferenciaRetiro === option.value

              return (
                <div
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleInputChange("preferenciaRetiro", option.value)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{t(option.labelKey)}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{t(option.descKey)}</p>
                  <Badge variant={isSelected ? "default" : "secondary"}>{t("commissionBadge", { rate })}</Badge>
                </div>
              )
            })}
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("infoTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>{t("infoManualPayments")}</li>
              <li>{t("infoPlatformFee")}</li>
              <li>{t("infoWithdrawFees")}</li>
              <li>{t("infoCorrectData")}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button onClick={() => void handleSave()} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {existingConfig ? t("update") : t("save")}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
