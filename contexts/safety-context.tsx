"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db, auth } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"

export async function safetyRequest(path: string, body?: unknown, method = "POST") {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("NO_SESSION")
  const response = await fetch(apiUrl(path), { method, headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || "SAFETY_FAILED")
  return data
}
const SafetyContext = createContext<{ blockedIds: string[]; isBlocked: (id?: string | null) => boolean; isBlockedContent: (value: unknown) => boolean }>({ blockedIds: [], isBlocked: () => false, isBlockedContent: () => false })
export function SafetyProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser.uid
  const [state, setState] = useState<{ uid?: string; ids: string[] }>({ ids: [] })
  useEffect(() => {
    if (!uid) { setState({ ids: [] }); return }
    return onSnapshot(collection(db, "users", uid, "blockedUsers"), snapshot => {
      setState({ uid, ids: snapshot.docs.map(row => row.id) })
    }, () => { console.error("[safety] No se pudo cargar la lista de bloqueos") })
  }, [uid])
  const blockedIds = state.uid === uid ? state.ids : []
  return <SafetyContext.Provider value={{ blockedIds, isBlocked: id => Boolean(id && blockedIds.includes(id)), isBlockedContent: value => {
    const item = value as { sellerId?: string; authorId?: string; ownerId?: string; userId?: string } | null
    const author = item?.sellerId || item?.authorId || item?.ownerId || item?.userId
    return Boolean(author && blockedIds.includes(author))
  } }}>{children}</SafetyContext.Provider>
}
export const useSafety = () => useContext(SafetyContext)
