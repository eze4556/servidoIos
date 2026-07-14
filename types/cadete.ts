export type CadeteStatus = "pending_approval" | "approved" | "rejected"

export const CADETE_STATUS_LABELS: Record<CadeteStatus, string> = {
  pending_approval: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export function isCadeteApproved(status?: string | null, isActive?: boolean | null): boolean {
  return status === "approved" && isActive === true
}
