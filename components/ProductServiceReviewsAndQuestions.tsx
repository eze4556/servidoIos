"use client"

import React, { useState } from "react"
import { Star, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocale, useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: any
}

interface Question {
  id: string
  productId: string
  userId: string
  userName: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: any
  createdAt: any
}

interface Props {
  reviews: Review[]
  questions: Question[]
  currentUser: any
  sellerId: string
  onSubmitReview: (rating: number, comment: string) => Promise<void> | void
  onSubmitQuestion: (question: string) => Promise<void> | void
  hasUserReviewed: boolean
  loading?: boolean
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
}

const phonePatterns = [
  /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
  /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
  /(\d{7,15})/g,
  /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g,
]

function containsPhoneNumber(text: string): boolean {
  return phonePatterns.some((pattern) => {
    pattern.lastIndex = 0
    return pattern.test(text)
  })
}

const ProductServiceReviewsAndQuestions: React.FC<Props> = ({
  reviews,
  questions,
  currentUser,
  sellerId,
  onSubmitReview,
  onSubmitQuestion,
  hasUserReviewed,
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
}) => {
  const t = useTranslations("reviews")
  const locale = useLocale()
  const { toast } = useToast()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [questionText, setQuestionText] = useState("")

  const censorPhoneNumbers = (text: string): string => {
    const blocked = t("phoneBlocked")
    let censoredText = text
    phonePatterns.forEach((pattern) => {
      censoredText = censoredText.replace(pattern, blocked)
    })
    return censoredText
  }

  const formatTimestamp = (value: { toDate?: () => Date } | undefined) => {
    if (value?.toDate) {
      return value.toDate().toLocaleDateString(dateLocale)
    }
    return t("unknownDate")
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reviewRating === 0 || reviewComment.trim().length < 10) return

    if (containsPhoneNumber(reviewComment.trim())) {
      toast({
        title: t("errorTitle"),
        description: t("phoneAlertReview"),
        variant: "destructive",
      })
      return
    }

    await onSubmitReview(reviewRating, reviewComment)
    setReviewRating(0)
    setReviewComment("")
  }

  const handleQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (questionText.trim().length < 10) return

    if (containsPhoneNumber(questionText.trim())) {
      toast({
        title: t("errorTitle"),
        description: t("phoneAlertQuestion"),
        variant: "destructive",
      })
      return
    }

    await onSubmitQuestion(questionText)
    setQuestionText("")
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">{t("userReviewsTitle", { count: reviews.length })}</h2>
        {reviewError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{reviewError}</AlertDescription>
          </Alert>
        )}
        {reviewSuccess && (
          <Alert className="mb-4 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>{t("successTitle")}</AlertTitle>
            <AlertDescription>{reviewSuccess}</AlertDescription>
          </Alert>
        )}
        {currentUser && !hasUserReviewed && (
          <form onSubmit={handleReview} className="mb-8 rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-3 text-lg font-medium">{t("writeReviewProduct")}</h3>
            <div className="mb-4">
              <Label htmlFor="rating" className="mb-1 block text-sm font-medium text-gray-700">
                {t("rating")}
              </Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    onClick={() => setReviewRating(star)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="comment" className="mb-1 block text-sm font-medium text-gray-700">
                {t("comment")}
              </Label>
              <div className="relative">
                <Textarea
                  id="comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("commentPlaceholderGeneric")}
                  rows={4}
                  required
                  className={`${containsPhoneNumber(reviewComment) ? "border-red-500 focus:border-red-500" : ""}`}
                />
                {containsPhoneNumber(reviewComment) && (
                  <div className="absolute -top-8 left-0 rounded bg-red-50 px-2 py-1 text-xs text-red-500">
                    {t("phoneNotAllowedInline")}
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" disabled={submittingReview || containsPhoneNumber(reviewComment)}>
              {submittingReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("sending")}
                </>
              ) : (
                t("submitReview")
              )}
            </Button>
          </form>
        )}
        {reviews.length === 0 ? (
          <p className="text-gray-600">{t("firstReviewProduct")}</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="mb-2 flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium">{review.userName}</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(review.createdAt)}</span>
                </div>
                <p className="leading-relaxed text-gray-700">{censorPhoneNumbers(review.comment)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">{t("qaTitle", { count: questions.length })}</h2>
        {questionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{questionError}</AlertDescription>
          </Alert>
        )}
        {questionSuccess && (
          <Alert className="mb-4 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>{t("successTitle")}</AlertTitle>
            <AlertDescription>{questionSuccess}</AlertDescription>
          </Alert>
        )}
        {currentUser && currentUser.firebaseUser.uid !== sellerId && (
          <form onSubmit={handleQuestion} className="mb-8 rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-3 text-lg font-medium">{t("askQuestionProduct")}</h3>
            <div className="mb-4">
              <Label htmlFor="question" className="mb-1 block text-sm font-medium text-gray-700">
                {t("yourQuestion")}
              </Label>
              <div className="relative">
                <Textarea
                  id="question"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={t("questionPlaceholderProduct")}
                  rows={3}
                  required
                  className={`${containsPhoneNumber(questionText) ? "border-red-500 focus:border-red-500" : ""}`}
                />
                {containsPhoneNumber(questionText) && (
                  <div className="absolute -top-8 left-0 rounded bg-red-50 px-2 py-1 text-xs text-red-500">
                    {t("phoneNotAllowedInline")}
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" disabled={submittingQuestion || containsPhoneNumber(questionText)}>
              {submittingQuestion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("sending")}
                </>
              ) : (
                t("submitQuestion")
              )}
            </Button>
          </form>
        )}
        {questions.length === 0 ? (
          <p className="text-gray-600">{t("firstQuestionProduct")}</p>
        ) : (
          <div className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600">{t("questionLabel")}</span>
                    <span className="text-sm text-gray-500">{question.userName}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(question.createdAt)}</span>
                  </div>
                  <p className="leading-relaxed text-gray-700">{censorPhoneNumbers(question.question)}</p>
                </div>
                {question.answer ? (
                  <div className="ml-4 rounded-lg bg-blue-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-green-600">{t("answerLabel")}</span>
                      <span className="text-sm text-gray-500">{question.answeredBy}</span>
                      <span className="text-xs text-gray-400">{formatTimestamp(question.answeredAt)}</span>
                    </div>
                    <p className="leading-relaxed text-gray-700">{censorPhoneNumbers(question.answer)}</p>
                  </div>
                ) : currentUser && currentUser.firebaseUser.uid === sellerId && setAnsweringQuestionId && setAnswerText && handleSubmitAnswer ? (
                  <div className="ml-4">
                    {answeringQuestionId === question.id ? (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <div className="relative">
                          <Textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder={t("answerPlaceholder")}
                            rows={2}
                            className={`mb-2 ${containsPhoneNumber(answerText || "") ? "border-red-500 focus:border-red-500" : ""}`}
                          />
                          {containsPhoneNumber(answerText || "") && (
                            <div className="absolute -top-8 left-0 rounded bg-red-50 px-2 py-1 text-xs text-red-500">
                              {t("phoneNotAllowedInline")}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSubmitAnswer(question.id)}
                            disabled={submittingAnswer || containsPhoneNumber(answerText || "")}
                          >
                            {submittingAnswer ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {t("sending")}
                              </>
                            ) : (
                              t("respond")
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAnsweringQuestionId(null)
                              setAnswerText("")
                            }}
                          >
                            {t("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAnsweringQuestionId(question.id)}>
                        {t("respond")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="ml-4 text-sm italic text-gray-500">{t("waitingSeller")}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default ProductServiceReviewsAndQuestions
