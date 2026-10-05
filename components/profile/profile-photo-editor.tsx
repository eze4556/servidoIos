"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import Image from "next/image"
import { Camera, Loader2, Trash2, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { doc, updateDoc } from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { updateProfile } from "firebase/auth"
import { auth, db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_BYTES = 5 * 1024 * 1024

type ProfilePhotoEditorProps = {
  className?: string
  size?: "md" | "lg"
}

export function ProfilePhotoEditor({ className, size = "lg" }: ProfilePhotoEditorProps) {
  const t = useTranslations("profilePhotoEditor")
  const { currentUser, refreshUserProfile } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUser?.photoURL || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setPreviewUrl(currentUser?.photoURL || null)
  }, [currentUser?.photoURL])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const avatarSize = size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-24 w-24"
  const hasPhoto = Boolean(previewUrl)

  const openPicker = () => {
    if (busy) return
    setError(null)
    setSuccess(null)
    inputRef.current?.click()
  }

  const uploadFile = async (file: File) => {
    const user = auth.currentUser
    if (!user || !currentUser) {
      setError(t("notLoggedIn"))
      return
    }

    setBusy(true)
    setError(null)
    setSuccess(null)

    const localPreview = URL.createObjectURL(file)
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(localPreview)

    const safeName = file.name.replace(/\s+/g, "-")
    const filePath = `users/${user.uid}/profile/${Date.now()}-${safeName}`
    const storageRef = ref(storage, filePath)

    try {
      if (currentUser.photoPath) {
        await deleteObject(ref(storage, currentUser.photoPath)).catch(() => undefined)
      }

      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL,
        photoPath: filePath,
      })
      await updateProfile(user, { photoURL: downloadURL })
      await refreshUserProfile()

      if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview)
      setPreviewUrl(downloadURL)
      setSuccess(t("uploadSuccess"))
    } catch (err) {
      console.error("Profile photo upload error:", err)
      setPreviewUrl(currentUser.photoURL || null)
      setError(t("uploadError"))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(t("invalidType"))
      e.target.value = ""
      return
    }
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"))
      e.target.value = ""
      return
    }

    void uploadFile(file)
  }

  const handleRemove = async () => {
    const user = auth.currentUser
    if (!user || !currentUser) {
      setError(t("notLoggedIn"))
      return
    }
    if (!currentUser.photoURL && !currentUser.photoPath) {
      setError(t("nothingToRemove"))
      return
    }
    if (!window.confirm(t("removeConfirm"))) return

    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      if (currentUser.photoPath) {
        await deleteObject(ref(storage, currentUser.photoPath)).catch(() => undefined)
      }
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: null,
        photoPath: null,
      })
      await updateProfile(user, { photoURL: null })
      await refreshUserProfile()
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setSuccess(t("removeSuccess"))
    } catch (err) {
      console.error("Profile photo remove error:", err)
      setError(t("removeError"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{t("title")}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          className={cn(
            "group relative shrink-0 overflow-hidden rounded-full bg-servido-50 ring-4 ring-servido-100 transition focus-visible:outline-none focus-visible:ring-servido-400",
            avatarSize,
            busy ? "cursor-wait opacity-80" : "hover:ring-servido-300"
          )}
          aria-label={hasPhoto ? t("changeAria") : t("addAria")}
        >
          {previewUrl ? (
            <Image src={previewUrl} alt={t("photoAlt")} fill className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <User className="h-12 w-12 text-servido-300" />
            </span>
          )}

          <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {busy ? (
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            ) : (
              <>
                <Camera className="h-6 w-6 text-white" />
                <span className="mt-1 text-[11px] font-semibold text-white">
                  {hasPhoto ? t("changeShort") : t("addShort")}
                </span>
              </>
            )}
          </span>

          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 sm:hidden">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </span>
          )}
        </button>

        <div className="flex w-full max-w-sm flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="h-11 rounded-full bg-servido-800 font-semibold hover:bg-servido-900"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {hasPhoto ? t("changeButton") : t("addButton")}
              </>
            )}
          </Button>

          {hasPhoto && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRemove()}
              disabled={busy}
              className="h-11 rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("removeButton")}
            </Button>
          )}

          <p className="text-xs text-gray-500">{t("hint")}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      )}
      {success && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {success}
        </p>
      )}
    </div>
  )
}
