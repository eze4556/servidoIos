"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { SimpleImage } from '@/components/ui/simple-image'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, Tag, Layers, Heart, Share2, Star, User, AlertCircle, Loader2 } from "lucide-react"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { usePriceFormat } from "@/hooks/use-price-format"
import { ServiceBookingCard } from "@/components/services/service-booking-card"
import type { ServiceSchedule } from "@/types/service-appointments"

// Props extendidos para lógica de favoritos, compartir, reseñas y preguntas
interface ServiceDetailProps {
  service: {
    id: string
    name: string
    description: string
    price: number
    imageUrl?: string
    media?: { url: string; type: string; path: string }[]
    sellerId: string
    sellerName?: string
    category?: string
    categoryName?: string
    brand?: string
    isFavorite?: boolean
    averageRating?: number
    reviewsCount?: number
    serviceSchedule?: ServiceSchedule | null
    // ...otros campos necesarios
  }
  breadcrumbs?: { name: string; href?: string }[]
  isFavorite: boolean
  onToggleFavorite: () => void
  onShare: () => void
  onContactSeller?: () => void
  reviews: any[]
  onSubmitReview: (rating: number, comment: string) => void
  questions: any[]
  onSubmitQuestion: (question: string) => void
  currentUser?: any
  loading?: boolean
  // Estados adicionales para manejo de reseñas y preguntas
  reviewError?: string | null
  reviewSuccess?: string | null
  submittingReview?: boolean
  questionError?: string | null
  questionSuccess?: string | null
  submittingQuestion?: boolean
  answeringQuestionId?: string | null
  answerText?: string
  setAnsweringQuestionId?: (id: string | null) => void
  setAnswerText?: (text: string) => void
  handleSubmitAnswer?: (questionId: string) => void
  submittingAnswer?: boolean
  hasUserReviewed?: boolean
}

const ServiceDetail: React.FC<ServiceDetailProps> = ({
  service,
  breadcrumbs = [],
  isFavorite,
  onToggleFavorite,
  onShare,
  onContactSeller,
  reviews = [],
  onSubmitReview,
  questions = [],
  onSubmitQuestion,
  currentUser,
  loading = false,
  reviewError,
  reviewSuccess,
  submittingReview,
  questionError,
  questionSuccess,
  submittingQuestion,
  answeringQuestionId,
  answerText,
  setAnsweringQuestionId,
  setAnswerText,
  handleSubmitAnswer,
  submittingAnswer,
  hasUserReviewed = false,
}) => {
  const { formatPrice } = usePriceFormat()
  const tProduct = useTranslations("product")
  const tr = useTranslations("reviews")
  const ts = useTranslations("serviceDetail")
  const mainImage = service.media && service.media.length > 0 ? service.media[0].url : (service.imageUrl || "/placeholder.svg")
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [shareCopied, setShareCopied] = useState(false)

  // Compartir
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
    }
    onShare()
  }

  // Enviar reseña
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (reviewRating > 0 && reviewComment.trim()) {
      onSubmitReview(reviewRating, reviewComment)
      setReviewRating(0)
      setReviewComment("")
    }
  }

  // Enviar pregunta
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (questionText.trim()) {
      onSubmitQuestion(questionText)
      setQuestionText("")
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 flex flex-col gap-4">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild href="/">
              <Link href="/">{tProduct("home")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {service.categoryName && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild href={`/category/${service.category}`}>
                  <Link href={`/category/${service.category}`}>{service.categoryName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{service.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Imagen principal con overlay de botones */}
      <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <SimpleImage src={mainImage} alt={service.name} className="w-full h-full object-cover" className="object-cover"
        />
        {/* Overlay botones */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            variant={isFavorite ? "default" : "secondary"}
            size="icon"
            className={isFavorite ? "bg-red-100 hover:bg-red-200 text-red-600" : "bg-white/80 hover:bg-white"}
            onClick={onToggleFavorite}
            aria-label={ts("favoriteAria")}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button variant="secondary" size="icon" className="bg-white/80 hover:bg-white" onClick={handleShare} aria-label={ts("shareAria")}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
        {shareCopied && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow">{ts("linkCopied")}</span>
        )}
      </div>

      {/* Info principal */}
      <h1 className="text-2xl font-bold truncate mt-2">{service.name}</h1>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {service.categoryName && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Layers className="h-4 w-4" />{service.categoryName}</span>
        )}
        {service.brand && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Tag className="h-4 w-4" />{ts("brandLabel", { brand: service.brand })}</span>
        )}
      </div>
      <p className="text-gray-700 text-base whitespace-pre-line border-l-2 border-blue-200 pl-3">{service.description}</p>
      <div className="text-lg font-semibold text-blue-700">
        {service.price ? formatPrice(service.price) : ts("priceOnRequest")}
      </div>

      <ServiceBookingCard
        serviceId={service.id}
        serviceName={service.name}
        sellerId={service.sellerId}
        schedule={service.serviceSchedule}
      />

      <div className="flex flex-col gap-2 mt-2">
        <Button onClick={onContactSeller} className="w-full flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> {ts("contactSeller")}
        </Button>
      </div>

      {/* User Reviews */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{tr("userReviewsTitle", { count: reviews.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {reviewError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tr("errorTitle")}</AlertTitle>
              <AlertDescription>{reviewError}</AlertDescription>
            </Alert>
          )}
          {reviewSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>{tr("successTitle")}</AlertTitle>
              <AlertDescription>{reviewSuccess}</AlertDescription>
            </Alert>
          )}

          {currentUser && !hasUserReviewed && (
            <form onSubmit={handleSubmitReview} className="mb-8 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">{tr("writeReview")}</h3>
              <div className="mb-4">
                <Label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                  {tr("rating")}
                </Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setReviewRating(star)}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                  {tr("comment")}
                </Label>
                <Textarea
                  id="comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={tr("commentPlaceholderService")}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tr("sending")}
                  </>
                ) : (
                  tr("submitReview")
                )}
              </Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-gray-600">{tr("firstReview")}</p>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-sm font-medium ml-2">{review.userName}</span>
                    <span className="text-xs text-gray-500">
                      {review.createdAt?.toDate
                        ? review.createdAt.toDate().toLocaleDateString()
                        : tr("unknownDate")}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions and Answers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{tr("qaTitle", { count: questions.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {questionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tr("errorTitle")}</AlertTitle>
              <AlertDescription>{questionError}</AlertDescription>
            </Alert>
          )}
          {questionSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>{tr("successTitle")}</AlertTitle>
              <AlertDescription>{questionSuccess}</AlertDescription>
            </Alert>
          )}

          {currentUser && currentUser.firebaseUser.uid !== service.sellerId && (
            <form onSubmit={handleSubmitQuestion} className="mb-8 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">{tr("askQuestion")}</h3>
              <div className="mb-4">
                <Label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                  {tr("yourQuestion")}
                </Label>
                <Textarea
                  id="question"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={tr("questionPlaceholder")}
                  rows={3}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingQuestion}>
                {submittingQuestion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tr("sending")}
                  </>
                ) : (
                  tr("submitQuestion")
                )}
              </Button>
            </form>
          )}

          {questions.length === 0 ? (
            <p className="text-gray-600">{tr("firstQuestion")}</p>
          ) : (
            <div className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blue-600">{tr("questionLabel")}</span>
                      <span className="text-sm text-gray-500">{question.userName}</span>
                      <span className="text-xs text-gray-400">
                        {question.createdAt?.toDate
                          ? question.createdAt.toDate().toLocaleDateString()
                          : tr("unknownDate")}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{question.question}</p>
                  </div>

                  {question.answer ? (
                    <div className="ml-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-green-600">{tr("answerLabel")}</span>
                        <span className="text-sm text-gray-500">{question.answeredBy}</span>
                        <span className="text-xs text-gray-400">
                          {question.answeredAt?.toDate
                            ? question.answeredAt.toDate().toLocaleDateString()
                            : tr("unknownDate")}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{question.answer}</p>
                    </div>
                  ) : currentUser && currentUser.firebaseUser.uid === service.sellerId ? (
                    <div className="ml-4">
                      {answeringQuestionId === question.id ? (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Textarea
                            value={answerText}
                            onChange={(e) => setAnswerText && setAnswerText(e.target.value)}
                            placeholder={tr("answerPlaceholder")}
                            rows={2}
                            className="mb-2"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitAnswer && handleSubmitAnswer(question.id)}
                              disabled={submittingAnswer}
                            >
                              {submittingAnswer ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {tr("sending")}
                                </>
                              ) : (
                                tr("respond")
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAnsweringQuestionId && setAnsweringQuestionId(null)
                                setAnswerText && setAnswerText("")
                              }}
                            >
                              {tr("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAnsweringQuestionId && setAnsweringQuestionId(question.id)}>
                          {tr("respond")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="ml-4 text-sm text-gray-500 italic">{tr("waitingSeller")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ServiceDetail 