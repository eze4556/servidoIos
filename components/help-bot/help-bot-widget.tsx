"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  ArrowUpRight,
  BarChart3,
  Bike,
  ClipboardCopy,
  Lightbulb,
  Loader2,
  MessageSquareText,
  PackagePlus,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UtensilsCrossed,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServidoBotAvatar } from "@/components/help-bot/servido-bot-avatar"
import { cn } from "@/lib/utils"

const CAPABILITY_KEYS = [
  { key: "capIdeas", icon: Lightbulb, promptKey: "qIdeas" as const },
  { key: "capPublish", icon: PackagePlus, promptKey: "qPublish" as const },
  { key: "capStats", icon: BarChart3, promptKey: "qStats" as const },
  { key: "capStore", icon: Store, promptKey: "qStore" as const },
  { key: "capTrending", icon: TrendingUp, promptKey: "qTrending" as const },
  { key: "capChat", icon: MessageSquareText, promptKey: "qChat" as const },
  { key: "capFood", icon: UtensilsCrossed, promptKey: "qFoodMenu" as const },
  { key: "capCadete", icon: Bike, promptKey: "qCadete" as const },
] as const

type ChatPart = {
  type: string
  text?: string
  output?: unknown
  state?: string
}

function messageText(parts?: ChatPart[]): string {
  if (!parts?.length) return ""
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
}

function toolOutput(part: ChatPart): Record<string, unknown> | null {
  if (!part.type.startsWith("tool-")) return null
  if (part.output && typeof part.output === "object") return part.output as Record<string, unknown>
  return null
}

export function HelpBotWidget() {
  const t = useTranslations("helpBot")
  const locale = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/help-bot",
        body: { locale },
      }),
    [locale]
  )

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport,
  })

  const busy = status === "submitted" || status === "streaming"

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open, status])

  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/lives/") ||
    pathname?.startsWith("/dashboard/seller/live")
  ) {
    return null
  }

  const ask = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    setInput("")
    void sendMessage({ text: value })
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group fixed z-[56] flex items-center gap-2.5 rounded-full bg-servido-950 py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-[0_16px_40px_-16px_rgba(46,16,101,0.85)] ring-1 ring-servido-gold/35",
            "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 lg:bottom-6 lg:left-6",
            "hover:bg-servido-800 active:scale-[0.98]"
          )}
          aria-label={t("fabAria")}
        >
          <ServidoBotAvatar size={36} pulse />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-servido-gold">
              {t("brand")}
            </span>
            <span className="text-sm">{t("fabLabel")}</span>
          </span>
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed z-[70] flex flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-servido-950/10",
            // Mobile: sheet casi a pantalla completa
            "inset-x-0 bottom-0 top-[max(0.5rem,env(safe-area-inset-top))] rounded-t-[1.75rem]",
            "h-auto max-h-[100dvh]",
            // Desktop: card flotante
            "sm:inset-auto sm:bottom-6 sm:left-6 sm:top-auto sm:h-[min(80vh,38rem)] sm:w-[min(100vw-2rem,26rem)] sm:rounded-[1.75rem]"
          )}
        >
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-servido-950 via-servido-900 to-sky-800 px-4 py-3.5 text-white sm:py-4">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-servido-gold/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <ServidoBotAvatar size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-servido-gold">
                  {t("brand")}
                </p>
                <p className="truncate text-lg font-semibold leading-tight sm:text-base">{t("title")}</p>
                <p className="truncate text-sm text-white/75 sm:text-xs">{t("subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (busy) void stop()
                  setOpen(false)
                }}
                className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-3 sm:px-3"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    <ServidoBotAvatar size={40} />
                    <div>
                      <p className="text-sm font-semibold text-servido-950">{t("welcome")}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("welcomeHint")}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CAPABILITY_KEYS.map(({ key, icon: Icon, promptKey }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => ask(t(`suggestions.${promptKey}`))}
                      className="rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:ring-servido-300"
                    >
                      <Icon className="mb-2 h-4 w-4 text-servido-800" />
                      <p className="text-xs font-semibold text-servido-950">{t(key)}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["qPrice", "qTitle", "qPromo", "qSafety"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => ask(t(`suggestions.${key}`))}
                      className="shrink-0 rounded-full bg-servido-50 px-3 py-1.5 text-[11px] font-semibold text-servido-900 ring-1 ring-servido-100"
                    >
                      {t(`chip.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const parts = (message.parts || []) as ChatPart[]
              const text = messageText(parts)
              const isUser = message.role === "user"
              const toolParts = parts.filter((p) => p.type.startsWith("tool-"))

              return (
                <div key={message.id} className="space-y-2">
                  {(text || isUser) && (
                    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
                      {!isUser && <ServidoBotAvatar size={28} className="mt-0.5 shrink-0" />}
                      {text ? (
                        <div
                          className={cn(
                            "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed sm:max-w-[82%] sm:text-sm",
                            isUser
                              ? "bg-servido-950 text-white"
                              : "bg-white text-slate-700 ring-1 ring-slate-200"
                          )}
                        >
                          <MessageBody text={text} />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {toolParts.map((part, idx) => {
                    const output = toolOutput(part)
                    if (!output) {
                      return (
                        <div
                          key={`${message.id}-tool-${idx}`}
                          className="ml-9 flex items-center gap-2 text-[11px] text-slate-500"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-servido-gold" />
                          {t("working")}
                        </div>
                      )
                    }
                    return (
                      <ToolCard
                        key={`${message.id}-tool-${idx}`}
                        type={part.type}
                        output={output}
                        t={t}
                      />
                    )
                  })}
                </div>
              )
            })}

            {busy && (
              <div className="ml-1 flex items-center gap-2 text-xs text-slate-500">
                <ServidoBotAvatar size={24} pulse />
                {t("thinking")}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
                {t("error")}
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:pb-3"
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
          >
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder={t("placeholder")}
                enterKeyHint="send"
                className={cn(
                  "w-full flex-1 resize-none rounded-2xl border border-slate-200 bg-white",
                  "px-4 py-3 text-base leading-6 text-slate-900 shadow-sm",
                  "placeholder:text-base placeholder:leading-6 placeholder:text-slate-500",
                  "outline-none focus:border-servido-400 focus:ring-2 focus:ring-servido-200",
                  "max-h-36 min-h-[3.25rem]"
                )}
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    ask(input)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                className="h-12 w-12 shrink-0 rounded-full bg-servido-950 hover:bg-servido-800"
                aria-label={t("send")}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </Button>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                className="mt-2.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                onClick={() => setMessages([])}
              >
                {t("clear")}
              </button>
            )}
          </form>
        </div>
      )}
    </>
  )
}

function MessageBody({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  parts.forEach((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) {
      nodes.push(
        <strong key={i} className="font-semibold">
          {bold[1]}
        </strong>
      )
    } else {
      nodes.push(<span key={i}>{part}</span>)
    }
  })
  return <>{nodes}</>
}

function ToolCard({
  type,
  output,
  t,
}: {
  type: string
  output: Record<string, unknown>
  t: ReturnType<typeof useTranslations>
}) {
  if (type === "tool-get_platform_stats") {
    const stats = [
      { label: t("stats.products"), value: output.products },
      { label: t("stats.services"), value: output.services },
      { label: t("stats.users"), value: output.users },
      { label: t("stats.sellers"), value: output.sellers },
      { label: t("stats.cadetes"), value: output.cadetes },
      { label: t("stats.restaurants"), value: output.restaurants },
      { label: t("stats.categories"), value: output.categories },
    ]
    return (
      <div className="ml-9 rounded-2xl bg-gradient-to-br from-servido-950 to-sky-900 p-3 text-white shadow-md">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-servido-gold">
          <BarChart3 className="h-3.5 w-3.5" />
          {t("stats.title")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/60">{item.label}</p>
              <p className="text-lg font-semibold tabular-nums">
                {typeof item.value === "number" ? item.value.toLocaleString() : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "tool-draft_product_listing") {
    const draft = (output.draft || {}) as Record<string, unknown>
    const href = typeof output.publishHref === "string" ? output.publishHref : "/dashboard/buyer?tab=publishProduct"
    const copyText = `${String(draft.title || "")}\n\n${String(draft.description || "")}`
    return (
      <div className="ml-9 rounded-2xl bg-white p-3 ring-1 ring-violet-200">
        <p className="text-xs font-semibold text-violet-800">{t("draft.title")}</p>
        <p className="mt-1 text-sm font-semibold text-servido-950">{String(draft.title || "")}</p>
        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{String(draft.description || "")}</p>
        <p className="mt-2 text-xs font-medium text-slate-500">{String(draft.priceTip || "")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={copyText} label={t("copy")} />
          <ActionLink href={href} label={t("draft.cta")} />
        </div>
      </div>
    )
  }

  if (type === "tool-optimize_listing_title") {
    const options = Array.isArray(output.options) ? output.options.map(String) : []
    return (
      <div className="ml-9 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
        <p className="text-xs font-semibold text-violet-900">{t("titles.title")}</p>
        <ul className="mt-2 space-y-2">
          {options.map((opt) => (
            <li key={opt} className="flex items-start justify-between gap-2 rounded-xl bg-white px-2.5 py-2 text-xs text-slate-700 ring-1 ring-violet-100">
              <span>{opt}</span>
              <CopyButton text={opt} label={t("copy")} compact />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (type === "tool-suggest_pricing") {
    const tactics = Array.isArray(output.tactics) ? output.tactics.map(String) : []
    return (
      <div className="ml-9 rounded-2xl bg-fuchsia-50 p-3 ring-1 ring-fuchsia-200">
        <p className="text-xs font-semibold text-fuchsia-900">{t("pricing.title")}</p>
        {typeof output.suggestedPrice === "number" && (
          <p className="mt-1 text-lg font-semibold text-servido-950">
            ${output.suggestedPrice.toLocaleString()}
          </p>
        )}
        <ul className="mt-2 space-y-1.5 text-xs text-fuchsia-950/90">
          {tactics.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (type === "tool-draft_restaurant_menu") {
    const items = Array.isArray(output.items) ? output.items.map(String) : []
    const href = typeof output.href === "string" ? output.href : "/signup/restaurante"
    return (
      <div className="ml-9 rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-200">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-900">
          <UtensilsCrossed className="h-3.5 w-3.5" />
          {t("menu.title")}
        </p>
        <ul className="space-y-1.5 text-xs text-orange-950/90">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <ActionLink href={href} label={t("menu.cta")} />
      </div>
    )
  }

  if (type === "tool-write_chat_reply") {
    const reply = String(output.reply || "")
    return (
      <div className="ml-9 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
        <p className="text-xs font-semibold text-sky-900">{t("chatReply.title")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{reply}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={reply} label={t("copy")} />
          <ActionLink href="/mensajes" label={t("chatReply.cta")} />
        </div>
      </div>
    )
  }

  if (type === "tool-write_promo_copy") {
    const lines = Array.isArray(output.lines) ? output.lines.map(String) : []
    const tags = Array.isArray(output.hashtags) ? output.hashtags.map(String) : []
    const href = typeof output.href === "string" ? output.href : "/historias"
    const copyText = [...lines, "", tags.join(" ")].join("\n")
    return (
      <div className="ml-9 rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
        <p className="text-xs font-semibold text-rose-900">{t("promo.title")}</p>
        <ul className="mt-2 space-y-1 text-xs text-rose-950/90">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-rose-800/80">{tags.join(" ")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={copyText} label={t("copy")} />
          <ActionLink href={href} label={t("promo.cta")} />
        </div>
      </div>
    )
  }

  if (type === "tool-get_trending_niches") {
    const niches = Array.isArray(output.niches) ? (output.niches as Array<Record<string, unknown>>) : []
    return (
      <div className="ml-9 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
          <TrendingUp className="h-3.5 w-3.5" />
          {t("trending.title")}
        </p>
        <div className="flex flex-wrap gap-2">
          {niches.map((niche) => (
            <Link
              key={String(niche.name)}
              href={typeof niche.href === "string" ? niche.href : "/products"}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 ring-1 ring-indigo-100"
            >
              {String(niche.name)}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  if (type === "tool-get_faq_answer") {
    return (
      <div className="ml-9 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <p className="text-xs font-semibold text-servido-950">{t("faq.title")}</p>
        <p className="mt-1 text-sm text-slate-700">{String(output.answer || "")}</p>
        {typeof output.href === "string" && <ActionLink href={output.href} label={t("faq.cta")} />}
      </div>
    )
  }

  if (type === "tool-get_safety_tips") {
    const tips = Array.isArray(output.tips) ? output.tips.map(String) : []
    return (
      <div className="ml-9 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("safety.title")}
        </p>
        <ul className="space-y-1.5 text-xs text-emerald-950/90">
          {tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (type === "tool-suggest_business_ideas") {
    const ideas = Array.isArray(output.ideas) ? output.ideas.map(String) : []
    const href = typeof output.publishHref === "string" ? output.publishHref : "/dashboard/buyer?tab=publishProduct"
    return (
      <div className="ml-9 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <Lightbulb className="h-3.5 w-3.5" />
          {t("ideas.title")}
        </p>
        <ul className="space-y-1.5 text-xs text-amber-950/90">
          {ideas.map((idea) => (
            <li key={idea}>• {idea}</li>
          ))}
        </ul>
        {typeof output.tip === "string" && (
          <p className="mt-2 text-[11px] text-amber-800/80">{output.tip}</p>
        )}
        <ActionLink href={href} label={t("ideas.cta")} />
      </div>
    )
  }

  if (type === "tool-get_quick_actions") {
    const action = (output.action || {}) as Record<string, unknown>
    const steps = Array.isArray(action.steps) ? action.steps.map(String) : []
    const href = typeof action.href === "string" ? action.href : "/dashboard/buyer"
    return (
      <div className="ml-9 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
        <p className="text-xs font-semibold text-sky-900">{String(action.title || t("actions.title"))}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-sky-950/90">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <ActionLink href={href} label={t("actions.cta")} />
      </div>
    )
  }

  if (type === "tool-create_growth_plan") {
    const plan = (output.plan || {}) as Record<string, unknown>
    const week = Array.isArray(plan.week) ? plan.week.map(String) : []
    const href = typeof plan.href === "string" ? plan.href : "/dashboard/buyer"
    return (
      <div className="ml-9 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
        <p className="text-xs font-semibold text-emerald-900">{t("plan.title")}</p>
        <ul className="mt-2 space-y-1.5 text-xs text-emerald-950/90">
          {week.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <ActionLink href={href} label={t("plan.cta")} />
      </div>
    )
  }

  return null
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-servido-950 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-servido-800"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  )
}

function CopyButton({
  text,
  label,
  compact = false,
}: {
  text: string
  label: string
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-white text-[11px] font-semibold text-servido-900 ring-1 ring-slate-200 transition hover:bg-slate-50",
        compact ? "px-2 py-1" : "px-3 py-1.5"
      )}
    >
      <ClipboardCopy className="h-3.5 w-3.5" />
      {copied ? "OK" : label}
    </button>
  )
}
