"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { Check, ImagePlus, Loader2, Store, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { useLocation } from "@/contexts/location-context"
import { db } from "@/lib/firebase"
import {
  getBusinessLocation,
  saveBusinessLocation,
} from "@/lib/business-location"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import {
  countStoriesCreatedToday,
  createStory,
  StoryDailyLimitError,
} from "@/lib/stories"
import {
  captureVideoThumbnail,
  clampVideoTrim,
  exportImageCover9x16,
  getVideoDurationMs,
} from "@/lib/story-editor"
import { productStoryLink, restaurantStoryLink } from "@/lib/story-link"
import {
  STORY_DAILY_LIMIT,
  STORY_MAX_IMAGE_BYTES,
  STORY_MAX_VIDEO_BYTES,
  STORY_MAX_VIDEO_MS,
  STORY_VIEW_MS,
  type StoryFilterId,
  type StoryMediaType,
  type StoryOverlay,
} from "@/types/story"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
import { StoryMediaEditor } from "@/components/stories/story-media-editor"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { urlToImageFile } from "@/lib/url-to-image-file"
import { fetchProductImageFile } from "@/lib/reseller/fetch-product-image-file"
import { getRestaurantLogoUrl } from "@/types/restaurant"

interface SellerProductOption {
  id: string
  name: string
  price?: number
  imageUrl?: string | null
}

function getProductThumb(data: Record<string, unknown>): string | null {
  if (typeof data.imageUrl === "string" && data.imageUrl) return data.imageUrl
  const media = data.media
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0] as { url?: string; type?: string }
    if (first?.url) return first.url
  }
  return null
}

interface StoryComposerProps {
  initialProductId?: string | null
  initialRefCode?: string | null
  initialAuto?: boolean
}

export function StoryComposer({
  initialProductId,
  initialRefCode,
  initialAuto = false,
}: StoryComposerProps) {
  const t = useTranslations("storyComposer")
  const tReseller = useTranslations("resellerProgram")
  const locale = useLocale()
  const priceLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const { currentUser, getDashboardLink } = useAuth()
  const { coordinates, userLocation } = useLocation()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<StoryMediaType>("image")
  const [filterId, setFilterId] = useState<StoryFilterId>("none")
  const [overlays, setOverlays] = useState<StoryOverlay[]>([])
  const [videoDurationMs, setVideoDurationMs] = useState(0)
  const [trimStartMs, setTrimStartMs] = useState(0)
  const [trimEndMs, setTrimEndMs] = useState(STORY_MAX_VIDEO_MS)
  const [caption, setCaption] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [productId, setProductId] = useState<string | null>(null)
  const [products, setProducts] = useState<SellerProductOption[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todayCount, setTodayCount] = useState(0)
  const [businessLocation, setBusinessLocation] = useState<BusinessLocation | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [resellerProductName, setResellerProductName] = useState<string | null>(null)
  const [loadingResellerProduct, setLoadingResellerProduct] = useState(false)
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState<string | null>(null)

  const isResellerRecommendMode = Boolean(initialProductId && initialRefCode)

  const isRestaurant = currentUser?.businessType === "restaurant"
  const restaurantId = currentUser?.restaurantId || currentUser?.firebaseUser.uid
  const restaurantLink = isRestaurant && restaurantId ? restaurantStoryLink(restaurantId) : null
  const profilePhotoURL =
    currentUser?.photoURL || currentUser?.firebaseUser.photoURL || restaurantLogoUrl || null
  const hasProfilePhoto = Boolean(profilePhotoURL)
  const remainingToday = Math.max(0, STORY_DAILY_LIMIT - todayCount)
  const atLimit = remainingToday <= 0
  const hasBusinessLocation = hasValidCoordinates(
    businessLocation?.latitude,
    businessLocation?.longitude
  )

  useEffect(() => {
    if (!currentUser?.firebaseUser.uid) {
      setLoadingProducts(false)
      setLoadingLocation(false)
      return
    }

    if (isResellerRecommendMode) {
      setLoadingProducts(false)
      setLoadingLocation(false)
      void countStoriesCreatedToday(currentUser.firebaseUser.uid).then(setTodayCount)
      return
    }

    let cancelled = false
    async function load() {
      setLoadingProducts(true)
      setLoadingLocation(true)
      try {
        const [count, loc] = await Promise.all([
          countStoriesCreatedToday(currentUser!.firebaseUser.uid),
          getBusinessLocation(currentUser!.firebaseUser.uid),
        ])
        if (!cancelled) {
          setTodayCount(count)
          setBusinessLocation(loc)
        }

        if (isRestaurant && restaurantId) {
          try {
            const restaurantSnap = await getDoc(doc(db, "restaurants", restaurantId))
            if (!cancelled && restaurantSnap.exists()) {
              const data = restaurantSnap.data() as { logoUrl?: string; imageUrl?: string }
              setRestaurantLogoUrl(getRestaurantLogoUrl(data))
            }
          } catch (logoErr) {
            console.warn("Could not load restaurant logo for story:", logoErr)
          }
        } else if (!cancelled) {
          setRestaurantLogoUrl(null)
        }

        try {
          const productsQuery = query(
            collection(db, "products"),
            where("sellerId", "==", currentUser!.firebaseUser.uid),
            orderBy("createdAt", "desc"),
            limit(40)
          )
          const snap = await getDocs(productsQuery)
          if (cancelled) return
          setProducts(
            snap.docs.map((d) => {
              const data = d.data() as Record<string, unknown>
              return {
                id: d.id,
                name: String(data.name || t("defaultProduct")),
                price: typeof data.price === "number" ? data.price : undefined,
                imageUrl: getProductThumb(data),
              }
            })
          )
        } catch (indexedError) {
          console.warn("Indexed products query failed, falling back:", indexedError)
          const fallbackQuery = query(
            collection(db, "products"),
            where("sellerId", "==", currentUser!.firebaseUser.uid),
            limit(40)
          )
          const snap = await getDocs(fallbackQuery)
          if (cancelled) return
          setProducts(
            snap.docs.map((d) => {
              const data = d.data() as Record<string, unknown>
              return {
                id: d.id,
                name: String(data.name || t("defaultProduct")),
                price: typeof data.price === "number" ? data.price : undefined,
                imageUrl: getProductThumb(data),
              }
            })
          )
        }
      } catch (err) {
        console.warn("Could not load seller products for story link:", err)
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) {
          setLoadingProducts(false)
          setLoadingLocation(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser, t, isResellerRecommendMode, isRestaurant, restaurantId])

  useEffect(() => {
    if (!isResellerRecommendMode || !initialProductId) return
    let cancelled = false

    void (async () => {
      setLoadingResellerProduct(true)
      setError(null)
      try {
        const snap = await getDoc(doc(db, "products", initialProductId))
        if (!snap.exists()) {
          if (!cancelled) setError(t("errors.productImageFailed"))
          return
        }
        const data = snap.data() as Record<string, unknown>
        const name = String(data.name || t("defaultProduct"))
        const imageUrl = getProductThumb(data)
        if (!cancelled) {
          setResellerProductName(name)
          setCaption((prev) => (prev.trim() ? prev : tReseller("shareText", { name })))
        }
        if (initialAuto) {
          try {
            const fileFromUrl = await fetchProductImageFile(initialProductId)
            if (!cancelled) {
              setFile(fileFromUrl)
              setPreview(URL.createObjectURL(fileFromUrl))
            }
          } catch {
            if (imageUrl) {
              try {
                const fileFromUrl = await urlToImageFile(imageUrl, `${initialProductId}.jpg`)
                if (!cancelled) {
                  setFile(fileFromUrl)
                  setPreview(URL.createObjectURL(fileFromUrl))
                }
              } catch (err) {
                console.warn("reseller story image fallback failed:", err)
                if (!cancelled) setError(t("errors.productImageFailed"))
              }
            } else if (!cancelled) {
              setError(t("errors.productImageFailed"))
            }
          }
        }
      } catch (err) {
        console.warn("reseller story preload failed:", err)
        if (!cancelled) setError(t("errors.productImageFailed"))
      } finally {
        if (!cancelled) setLoadingResellerProduct(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isResellerRecommendMode, initialProductId, initialAuto, t, tReseller])

  useEffect(() => {
    if (!initialProductId) return
    if (initialRefCode) {
      setLinkUrl(`/product/${initialProductId}?ref=${encodeURIComponent(initialRefCode)}`)
      setProductId(initialProductId)
      return
    }
    if (products.length === 0) return
    if (products.some((p) => p.id === initialProductId)) {
      setLinkUrl(productStoryLink(initialProductId))
      setProductId(initialProductId)
    }
  }, [initialProductId, initialRefCode, products])

  const resetMediaEditState = () => {
    setFilterId("none")
    setOverlays([])
    setTrimStartMs(0)
    setTrimEndMs(STORY_MAX_VIDEO_MS)
    setVideoDurationMs(0)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0]
    if (!next) return
    void (async () => {
      try {
        if (next.type.startsWith("video/")) {
          if (next.size > STORY_MAX_VIDEO_BYTES) {
            setError(t("errors.videoSize"))
            return
          }
          const duration = await getVideoDurationMs(next)
          if (!duration || duration < 500) {
            setError(t("errors.videoInvalid"))
            return
          }
          if (duration > STORY_MAX_VIDEO_MS * 4) {
            setError(t("errors.videoTooLong", { max: Math.round(STORY_MAX_VIDEO_MS / 1000) }))
            return
          }
          const trimmed = clampVideoTrim(duration, 0, Math.min(duration, STORY_MAX_VIDEO_MS))
          setError(null)
          resetMediaEditState()
          setMediaType("video")
          setVideoDurationMs(duration)
          setTrimStartMs(trimmed.trimStartMs)
          setTrimEndMs(trimmed.trimEndMs)
          setFile(next)
          setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(next)
          })
          return
        }

        if (!next.type.startsWith("image/")) {
          setError(t("errors.mediaOnly"))
          return
        }
        if (next.size > STORY_MAX_IMAGE_BYTES) {
          setError(t("errors.imageSize"))
          return
        }
        setError(null)
        resetMediaEditState()
        setMediaType("image")
        setFile(next)
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(next)
        })
      } catch {
        setError(t("errors.mediaLoadFailed"))
      }
    })()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setError(t("errors.resellersOnly"))
      return
    }
    if (!isResellerRecommendMode && currentUser.role !== "seller") {
      setError(t("errors.sellersOnly"))
      return
    }
    if (atLimit) {
      setError(t("errors.dailyLimit", { limit: STORY_DAILY_LIMIT }))
      return
    }
    if (!file) {
      setError(t("errors.pickImage"))
      return
    }
    if (!isResellerRecommendMode && (!hasBusinessLocation || !businessLocation)) {
      setError(t("errors.locationRequired"))
      return
    }

    const resellerLocation =
      coordinates && hasValidCoordinates(coordinates.latitude, coordinates.longitude)
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            label: userLocation || "Argentina",
            city: null as string | null,
          }
        : null

    setLoading(true)
    setError(null)
    try {
      if (!isResellerRecommendMode && businessLocation) {
        await saveBusinessLocation(currentUser.firebaseUser.uid, businessLocation, {
          restaurantId: isRestaurant ? restaurantId : null,
        })
      }

      let publishFile = file
      let thumbnailFile: File | null = null
      let durationMs = STORY_VIEW_MS
      let trimStart = 0
      let trimEnd: number | undefined

      if (mediaType === "video") {
        const clamped = clampVideoTrim(videoDurationMs || STORY_MAX_VIDEO_MS, trimStartMs, trimEndMs)
        trimStart = clamped.trimStartMs
        trimEnd = clamped.trimEndMs
        durationMs = clamped.durationMs
        thumbnailFile = await captureVideoThumbnail(file, Math.max(0.05, trimStart / 1000))
      } else {
        publishFile = await exportImageCover9x16(file)
        durationMs = STORY_VIEW_MS
      }

      const resolvedProductId =
        productId || linkUrl.match(/\/product\/([^/?]+)/)?.[1] || null

      await createStory({
        authorId: currentUser.firebaseUser.uid,
        authorName:
          currentUser.firebaseUser.displayName ||
          currentUser.firebaseUser.email?.split("@")[0] ||
          t("defaultSeller"),
        authorPhotoURL: profilePhotoURL,
        authorType: isResellerRecommendMode ? "reseller" : isRestaurant ? "restaurant" : "store",
        file: publishFile,
        mediaType,
        thumbnailFile,
        caption,
        linkUrl: linkUrl || undefined,
        productId: resolvedProductId,
        filterId,
        overlays,
        trimStartMs: mediaType === "video" ? trimStart : undefined,
        trimEndMs: mediaType === "video" ? trimEnd : undefined,
        durationMs,
        businessLocation: isResellerRecommendMode ? resellerLocation : businessLocation,
      })
      router.push("/historias")
      router.refresh()
    } catch (err) {
      console.error(err)
      if (err instanceof StoryDailyLimitError) {
        setError(t("errors.dailyLimit", { limit: STORY_DAILY_LIMIT }))
        setTodayCount(STORY_DAILY_LIMIT)
      } else {
        setError(t("errors.publishFailed"))
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedProductId = productId || linkUrl.match(/\/product\/([^/?]+)/)?.[1] || null
  const restaurantSelected = Boolean(restaurantLink && linkUrl === restaurantLink)

  const canPublish = isResellerRecommendMode
    ? Boolean(file) && !atLimit
    : Boolean(file) && !atLimit && hasBusinessLocation

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto max-w-lg space-y-5">
      {isResellerRecommendMode && (
        <div className="rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-900 ring-1 ring-purple-100">
          <p className="font-semibold">
            {t("resellerBanner", { name: resellerProductName || t("defaultProduct") })}
          </p>
          <p className="mt-1 text-xs text-purple-800/90">{t("resellerBannerHint")}</p>
          {loadingResellerProduct && (
            <p className="mt-2 flex items-center gap-2 text-xs text-purple-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("resellerLoadingProduct")}
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-500">
        {t("dailyCount", { count: todayCount, limit: STORY_DAILY_LIMIT })}
        {!atLimit && t("dailyRemaining", { remaining: remainingToday })}
      </p>

      {!hasProfilePhoto && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
          {t("profilePhotoWarning")}{" "}
          <Link href={getDashboardLink()} className="font-semibold underline">
            {t("goToPanel")}
          </Link>
        </div>
      )}

      {!isResellerRecommendMode && (
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        {loadingLocation ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingLocation")}
          </div>
        ) : (
          <BusinessLocationPicker
            value={businessLocation}
            onChange={setBusinessLocation}
            label={t("locationLabel")}
            helperText={t("locationHelper")}
          />
        )}
      </div>
      )}

      {atLimit && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {t("limitBanner", { limit: STORY_DAILY_LIMIT })}
        </div>
      )}

      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t("mediaLabel")}
        </Label>
        {!preview ? (
          <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-servido-200 bg-gradient-to-b from-servido-50/80 to-white transition-colors hover:border-servido-400 hover:from-servido-50">
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-servido-800 shadow-sm ring-1 ring-servido-100">
                <ImagePlus className="h-7 w-7" />
              </span>
              <p className="text-sm font-medium text-gray-800">{t("pickMedia")}</p>
              <p className="text-xs text-gray-500">{t("pickMediaHint")}</p>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={atLimit}
              onChange={onFileChange}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <StoryMediaEditor
              mediaType={mediaType}
              previewUrl={preview}
              filterId={filterId}
              overlays={overlays}
              trimStartMs={trimStartMs}
              trimEndMs={trimEndMs}
              videoDurationMs={videoDurationMs}
              onFilterChange={setFilterId}
              onOverlaysChange={setOverlays}
              onTrimChange={(start, end) => {
                const clamped = clampVideoTrim(videoDurationMs || STORY_MAX_VIDEO_MS, start, end)
                setTrimStartMs(clamped.trimStartMs)
                setTrimEndMs(clamped.trimEndMs)
              }}
            />
            <label className="inline-flex cursor-pointer text-xs font-semibold text-servido-800 underline">
              {t("changeMedia")}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                disabled={atLimit || loading}
                onChange={onFileChange}
              />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">{t("captionLabel")}</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("captionPlaceholder")}
          className="min-h-[90px] rounded-2xl"
          maxLength={180}
          disabled={atLimit}
        />
      </div>

      {isResellerRecommendMode && linkUrl && (
        <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-100 break-all">
          Link:{" "}
          <span className="font-medium text-purple-800">
            {typeof window !== "undefined" && linkUrl.startsWith("/")
              ? `${window.location.origin}${linkUrl}`
              : linkUrl}
          </span>
        </p>
      )}

      {!isResellerRecommendMode && (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>{t("linkLabel")}</Label>
          {linkUrl && (
            <button
              type="button"
              onClick={() => {
                setLinkUrl("")
                setProductId(null)
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-servido-800"
            >
              <X className="h-3.5 w-3.5" />
              {t("clearLink")}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">{t("linkHint")}</p>

        {isRestaurant && restaurantLink && (
          <button
            type="button"
            onClick={() => {
              setLinkUrl(restaurantLink)
              setProductId(null)
            }}
            disabled={atLimit}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2.5 text-left transition",
              restaurantSelected
                ? "border-servido-800 bg-purple-50/60"
                : "border-gray-100 hover:border-purple-200"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-servido-gold/20 text-servido-900">
              <Store className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{t("myRestaurant")}</span>
              <span className="block truncate text-xs text-gray-500">{t("myRestaurantHint")}</span>
            </span>
            {restaurantSelected && <Check className="h-5 w-5 shrink-0 text-servido-800" />}
          </button>
        )}

        {loadingProducts ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 py-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingProducts")}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
            {isRestaurant ? t("noProductsRestaurant") : t("noProductsStore")}
          </div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl bg-gray-50/80 p-2 ring-1 ring-gray-100">
            {products.map((product) => {
              const selected = selectedProductId === product.id
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={atLimit}
                  onClick={() => {
                    setLinkUrl(productStoryLink(product.id))
                    setProductId(product.id)
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 bg-white px-2.5 py-2 text-left transition",
                    selected
                      ? "border-servido-800 bg-purple-50/50"
                      : "border-transparent hover:border-purple-200"
                  )}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-purple-100">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-servido-800">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </span>
                    {typeof product.price === "number" && (
                      <span className="block text-xs text-gray-500">
                        ${product.price.toLocaleString(priceLocale)}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0 text-servido-800" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      )}

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !canPublish}
        className="h-12 w-full rounded-full bg-servido-800 text-base font-semibold hover:bg-servido-900"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("publishLoading")}
          </>
        ) : (
          t("publishButton")
        )}
      </Button>
    </form>
  )
}
