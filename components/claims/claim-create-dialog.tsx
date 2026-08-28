"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClaim } from "@/lib/claims"
import { validateClaimFiles } from "@/lib/claim-storage"
import { claimHref } from "@/lib/routes"
import { CLAIM_REASONS, type ClaimReason } from "@/types/claims"

export type ClaimPurchaseContext = {
  purchaseId: string
  productId: string
  paymentId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  productName: string
  productImageUrl?: string | null
  amount: number
}

export function ClaimCreateDialog({
  open,
  onOpenChange,
  purchase,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: ClaimPurchaseContext | null
}) {
  const t = useTranslations("claims")
  const router = useRouter()
  const [reason, setReason] = useState<ClaimReason | "">("")
  const [description, setDescription] = useState("")
  const [proposedSolution, setProposedSolution] = useState("")
  const [receivedPartial, setReceivedPartial] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setReason("")
    setDescription("")
    setProposedSolution("")
    setReceivedPartial(false)
    setFiles([])
    setError(null)
  }

  const handleFiles = (list: FileList | null) => {
    const next = Array.from(list || [])
    const code = validateClaimFiles(next)
    if (code) {
      setError(t(`errors.${code}`))
      return
    }
    setError(null)
    setFiles(next)
  }

  const handleSubmit = async () => {
    if (!purchase) return
    if (!reason) {
      setError(t("errors.empty_reason"))
      return
    }
    if (!description.trim()) {
      setError(t("errors.empty_description"))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const claim = await createClaim({
        ...purchase,
        reason,
        description,
        receivedPartial,
        proposedSolution,
        files,
      })
      reset()
      onOpenChange(false)
      router.push(claimHref(claim.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.startsWith("claim_file:")) {
        setError(t(`errors.${message.replace("claim_file:", "")}`))
      } else if (message.startsWith("claim:")) {
        setError(t(`errors.${message.replace("claim:", "")}`))
      } else {
        setError(t("errors.generic"))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          if (!next) reset()
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>
            {purchase ? t("create.subtitle", { product: purchase.productName }) : t("create.fallbackSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("create.reason")}</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as ClaimReason)}>
              <SelectTrigger>
                <SelectValue placeholder={t("create.reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`reasons.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claim-description">{t("create.description")}</Label>
            <Textarea
              id="claim-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={t("create.descriptionPlaceholder")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="claim-partial"
              checked={receivedPartial}
              onCheckedChange={(checked) => setReceivedPartial(checked === true)}
            />
            <Label htmlFor="claim-partial" className="font-normal">
              {t("create.receivedPartial")}
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claim-solution">{t("create.proposedSolution")}</Label>
            <Textarea
              id="claim-solution"
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              rows={3}
              placeholder={t("create.proposedSolutionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="claim-files">{t("create.attachments")}</Label>
            <Input
              id="claim-files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">{t("create.attachmentsHint")}</p>
            {files.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-600">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !purchase}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("actions.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
