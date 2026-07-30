import type { CadeteStatus } from "@/types/cadete"

type CadeteStatusTranslator = (key: `cadetes.status.${CadeteStatus}`) => string

export function getCadeteStatusLabel(t: CadeteStatusTranslator, status: CadeteStatus | string): string {
  if (status === "pending_approval") return t("cadetes.status.pending_approval")
  if (status === "approved") return t("cadetes.status.approved")
  if (status === "rejected") return t("cadetes.status.rejected")
  return status
}
