"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import {
  Check,
  ImagePlus,
  Loader2,
  PackagePlus,
  Store,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { auth, db, storage } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"
import { describeApiError } from "@/lib/i18n/translate-client-error"
import { useAuth } from "@/contexts/auth-context"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
import { productHref } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type CategoryOption = { id: string; name: string }

type QuickPublishStep = "store" | "product" | "done"

export function QuickPublishProductPanel() {
  const t = useTranslations("buyerDashboard.quickPublish")
  const tApi = useTranslations("apiErrors")
  const { currentUser, refreshUserProfile } = useAuth()
  const router = useRouter()

  const needsStore =
    !currentUser ||
    (currentUser.role !== "seller" && currentUser.role !== "admin")

  const [step, setStep] = useState<QuickPublishStep>(needsStore ? "store" : "product")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Store step
  const [storeName, setStoreName] = useState(
    currentUser?.name || currentUser?.firebaseUser.displayName || ""
  )
  const [location, setLocation] = useState<BusinessLocation | null>(null)
  const [acceptStoreTerms, setAcceptStoreTerms] = useState(false)

  // Product step
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [available, setAvailable] = useState(true)
  const [stock, setStock] = useState("1")
  const [acceptProductTerms, setAcceptProductTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishedProductId, setPublishedProductId] = useState<string | null>(null)

  useEffect(() => {
    setStep(needsStore ? "store" : "product")
  }, [needsStore])

  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true)
      try {
        const snap = await getDocs(collection(db, "categories"))
        const list = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as { name?: string }
            return { id: docSnap.id, name: String(data.name || "").trim() }
          })
          .filter((c) => c.name)
          .sort((a, b) => a.name.localeCompare(b.name, "es"))
        setCategories(list)
      } catch (err) {
        console.error("Error loading categories", err)
        setCategories([])
      } finally {
        setLoadingCategories(false)
      }
    }
    void loadCategories()
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const canSubmitStore =
    storeName.trim().length >= 2 &&
    acceptStoreTerms &&
    hasValidCoordinates(location?.latitude, location?.longitude) &&
    Boolean(location?.label?.trim())

  const canSubmitProduct = useMemo(() => {
    const priceNum = Number(price)
    const stockNum = Number(stock)
    return (
      Boolean(photoFile) &&
      name.trim().length >= 2 &&
      description.trim().length >= 2 &&
      Number.isFinite(priceNum) &&
      priceNum > 0 &&
      Boolean(categoryId) &&
      (!available || (Number.isFinite(stockNum) && stockNum >= 0)) &&
      acceptProductTerms
    )
  }, [photoFile, name, description, price, categoryId, available, stock, acceptProductTerms])

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError(t("photoInvalid"))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t("photoTooLarge"))
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const ensureStore = async () => {
    if (!needsStore) return
    const user = auth.currentUser
    if (!user) throw new Error(t("notLoggedIn"))
    const token = await user.getIdToken()
    const res = await fetch(apiUrl("/api/seller/become"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storeName: storeName.trim(),
        acceptTerms: acceptStoreTerms,
        location,
        sellCategory: "products",
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || t("storeFailed"))
    await refreshUserProfile()
  }

  const handleStoreContinue = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitStore || loading) return
    setLoading(true)
    setError(null)
    try {
      await ensureStore()
      setStep("product")
    } catch (err) {
      setError(describeApiError(err, tApi, t("storeFailed")))
    } finally {
      setLoading(false)
    }
  }

  const publishProduct = async () => {
    const user = auth.currentUser
    if (!user || !photoFile) throw new Error(t("notLoggedIn"))

    const filePath = `products/${user.uid}/${Date.now()}-${photoFile.name.replace(/\s+/g, "-")}`
    const storageRef = ref(storage, filePath)
    await uploadBytes(storageRef, photoFile)
    const downloadURL = await getDownloadURL(storageRef)

    const stockValue = available ? Math.max(0, Math.floor(Number(stock) || 0)) : 0

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: categoryId,
      media: [
        {
          type: "image" as const,
          url: downloadURL,
          path: filePath,
        },
      ],
      imageUrl: downloadURL,
      isService: false,
      sellerId: user.uid,
      stock: stockValue,
      condition: "new",
      freeShipping: true,
      shippingCost: 0,
      allowResellerShare: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "products"), productData)
    return docRef.id
  }

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitProduct || loading) return
    setLoading(true)
    setError(null)
    try {
      if (needsStore && step === "product") {
        // Safety: if profile still not seller, open store first with previously filled data
        const role = currentUser?.role
        if (role !== "seller" && role !== "admin") {
          if (!canSubmitStore) {
            setStep("store")
            throw new Error(t("storeRequiredFirst"))
          }
          await ensureStore()
        }
      }
      const productId = await publishProduct()
      setPublishedProductId(productId)
      setStep("done")
      await refreshUserProfile()
    } catch (err) {
      setError(describeApiError(err, tApi, t("publishFailed")))
    } finally {
      setLoading(false)
    }
  }

  if (step === "done" && publishedProductId) {
    return (
      <div className="space-y-5 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t("doneTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("doneSubtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-full bg-servido-800 hover:bg-servido-900">
            <Link href={productHref(publishedProductId)}>{t("viewProduct")}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setPublishedProductId(null)
              setPhotoFile(null)
              if (photoPreview) URL.revokeObjectURL(photoPreview)
              setPhotoPreview(null)
              setName("")
              setDescription("")
              setPrice("")
              setCategoryId("")
              setAvailable(true)
              setStock("1")
              setAcceptProductTerms(false)
              setStep("product")
            }}
          >
            {t("publishAnother")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push("/dashboard/seller?tab=products")}
          >
            {t("goSellerPanel")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-servido-950 to-servido-800 p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <PackagePlus className="h-5 w-5 text-servido-gold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("heroTitle")}</h2>
            <p className="mt-1 text-sm text-white/75">{t("heroSubtitle")}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 text-xs font-medium">
          <span
            className={cn(
              "rounded-full px-3 py-1",
              step === "store" ? "bg-servido-gold text-servido-950" : "bg-white/15 text-white"
            )}
          >
            1. {t("stepStore")}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1",
              step === "product" ? "bg-servido-gold text-servido-950" : "bg-white/15 text-white"
            )}
          >
            2. {t("stepProduct")}
          </span>
        </div>
      </div>

      {step === "store" && (
        <form
          onSubmit={(e) => void handleStoreContinue(e)}
          className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-servido-50 text-servido-800">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t("storeTitle")}</h3>
              <p className="mt-0.5 text-sm text-gray-500">{t("storeSubtitle")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qp-store-name">{t("storeNameLabel")}</Label>
            <Input
              id="qp-store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={t("storeNamePlaceholder")}
              className="rounded-xl"
              maxLength={80}
            />
          </div>

          <BusinessLocationPicker
            value={location}
            onChange={setLocation}
            label={t("locationLabel")}
            helperText={t("locationHelper")}
          />

          <label className="flex items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <Checkbox
              checked={acceptStoreTerms}
              onCheckedChange={(v) => setAcceptStoreTerms(v === true)}
              className="mt-0.5"
            />
            <span>
              {t("storeTermsPrefix")}{" "}
              <Link href="/terminos-y-condiciones" className="font-semibold text-servido-800 underline">
                {t("termsLink")}
              </Link>
              {t("storeTermsSuffix")}
            </span>
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmitStore || loading}
            className="h-12 w-full rounded-full bg-servido-800 text-base font-semibold hover:bg-servido-900"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("storeSubmitting")}
              </>
            ) : (
              t("storeContinue")
            )}
          </Button>
        </form>
      )}

      {step === "product" && (
        <form
          onSubmit={(e) => void handlePublish(e)}
          className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div>
            <h3 className="font-semibold text-gray-900">{t("productTitle")}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{t("productSubtitle")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("photoLabel")}</Label>
            {photoPreview ? (
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-gray-200">
                <Image src={photoPreview} alt="" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
                  aria-label={t("photoRemove")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-servido-200 bg-servido-50/40 px-4 py-10 text-center transition hover:bg-servido-50">
                <ImagePlus className="h-8 w-8 text-servido-800" />
                <span className="text-sm font-medium text-servido-900">{t("photoCta")}</span>
                <span className="text-xs text-slate-500">{t("photoHint")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qp-name">{t("nameLabel")}</Label>
            <Input
              id="qp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="rounded-xl"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qp-description">{t("descriptionLabel")}</Label>
            <Textarea
              id="qp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="min-h-[96px] rounded-xl"
              maxLength={800}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qp-price">{t("priceLabel")}</Label>
              <Input
                id="qp-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("categoryLabel")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingCategories}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue
                    placeholder={loadingCategories ? t("categoryLoading") : t("categoryPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t("availabilityLabel")}</p>
                <p className="text-xs text-gray-500">{t("availabilityHint")}</p>
              </div>
              <Switch checked={available} onCheckedChange={setAvailable} />
            </div>
            {available && (
              <div className="space-y-2">
                <Label htmlFor="qp-stock">{t("stockLabel")}</Label>
                <Input
                  id="qp-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="rounded-xl bg-white"
                />
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <Checkbox
              checked={acceptProductTerms}
              onCheckedChange={(v) => setAcceptProductTerms(v === true)}
              className="mt-0.5"
            />
            <span>
              {t("productTermsPrefix")}{" "}
              <Link href="/terminos-y-condiciones" className="font-semibold text-servido-800 underline">
                {t("termsLink")}
              </Link>
              {t("productTermsSuffix")}
            </span>
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmitProduct || loading}
            className="h-12 w-full rounded-full bg-servido-800 text-base font-semibold hover:bg-servido-900"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("publishing")}
              </>
            ) : (
              <>
                <PackagePlus className="mr-2 h-4 w-4" />
                {t("publishButton")}
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
