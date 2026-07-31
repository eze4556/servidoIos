import { auth } from "@/lib/firebase"

export async function deleteStoragePathAsAdmin(path: string): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("not_authenticated")
  }

  const token = await user.getIdToken()
  const response = await fetch("/api/admin/storage/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || "storage_delete_failed")
  }
}
