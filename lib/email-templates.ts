import emailsEs from "@/messages/emails.es.json"
import emailsPt from "@/messages/emails.pt-BR.json"
import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/config"

type EmailMessages = typeof emailsEs

function getEmailMessages(locale: AppLocale): EmailMessages {
  return locale === "pt-BR" ? emailsPt : emailsEs
}

export function resolveEmailLocale(value: string | undefined | null): AppLocale {
  return isAppLocale(value) ? value : defaultLocale
}

export function parseLocaleFromCookie(cookieHeader: string | null): AppLocale {
  if (!cookieHeader) return defaultLocale
  const match = cookieHeader.match(/(?:^|;\s*)SERVIDO_LOCALE=([^;]+)/)
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null
  return resolveEmailLocale(raw)
}

function fill(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    template
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildWelcomeHtml(params: {
  locale: AppLocale
  userName: string
  userEmail: string
  accountTypeRaw: string
  appUrl: string
}) {
  const m = getEmailMessages(params.locale)
  const w = m.welcome
  const accountType =
    m.accountTypes[params.accountTypeRaw as keyof typeof m.accountTypes] ||
    m.accountTypes.buyer
  const displayUrl = params.appUrl.replace(/^https?:\/\//, "")
  const userName = escapeHtml(params.userName)
  const userEmail = escapeHtml(params.userEmail)
  const accountTypeLabel = escapeHtml(accountType)

  return `<!DOCTYPE html>
<html lang="${w.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(w.pageTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#1f1235;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(76,29,149,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4c1d95,#6d28d9);padding:28px 24px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Servido</div>
              <div style="margin-top:6px;font-size:13px;color:#fde68a;">${escapeHtml(w.tagline)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1f1235;">${escapeHtml(fill(w.greeting, { userName: params.userName }))}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(w.intro)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf5ff;border-radius:14px;margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#7c3aed;font-weight:700;margin-bottom:8px;">${escapeHtml(w.detailsHeading)}</div>
                    <div style="font-size:14px;color:#374151;margin-bottom:6px;"><strong>${escapeHtml(w.userLabel)}</strong> ${userEmail}</div>
                    <div style="font-size:14px;color:#374151;"><strong>${escapeHtml(w.accountTypeLabel)}</strong> ${accountTypeLabel}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(w.ctaIntro)}</p>
              <a href="${escapeHtml(params.appUrl)}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
                ${escapeHtml(w.ctaButton)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
              ${escapeHtml(w.footerIgnore)}<br/>
              ${escapeHtml(fill(w.footerRights, { displayUrl }))}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getWelcomeEmailSubject(locale: AppLocale) {
  return getEmailMessages(locale).welcome.subject
}

export function buildCadeteStatusHtml(params: {
  locale: AppLocale
  userName: string
  decision: "approved" | "rejected"
  appUrl: string
}) {
  const m = getEmailMessages(params.locale)
  const c = m.cadeteStatus
  const approved = params.decision === "approved"
  const title = approved ? c.approvedTitle : c.rejectedTitle
  const body = approved ? c.approvedBody : c.rejectedBody
  const cta = approved ? c.approvedCta : c.rejectedCta
  const ctaUrl = approved ? `${params.appUrl}/dashboard/cadete` : params.appUrl
  const accent = approved ? "#059669" : "#b45309"
  const badge = approved ? c.approvedBadge : c.rejectedBadge
  const userName = escapeHtml(params.userName)

  return `<!DOCTYPE html>
<html lang="${c.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#1f1235;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(76,29,149,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0c4a6e,#0284c7);padding:28px 24px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;">Servido</div>
              <div style="margin-top:6px;font-size:13px;color:#bae6fd;">${escapeHtml(c.sectionTag)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1f1235;">${escapeHtml(fill(c.greeting, { userName: params.userName }))}</h1>
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1f1235;">${escapeHtml(title)}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(body)}</p>
              <div style="display:inline-block;background:${accent};color:#fff;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;margin-bottom:20px;">
                ${escapeHtml(badge)}
              </div>
              <div style="margin-top:8px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0c4a6e;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
                  ${escapeHtml(cta)}
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
              ${escapeHtml(c.footer)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getCadeteStatusEmailSubject(locale: AppLocale, decision: "approved" | "rejected") {
  const c = getEmailMessages(locale).cadeteStatus
  return decision === "approved" ? c.approvedSubject : c.rejectedSubject
}

export type EmailApiErrorKey = keyof EmailMessages["api"]

export function getEmailApiError(locale: AppLocale, key: EmailApiErrorKey): string {
  return getEmailMessages(locale).api[key]
}

function resolveRequestLocale(request: Request, bodyLocale: unknown): AppLocale {
  return resolveEmailLocale(
    typeof bodyLocale === "string" ? bodyLocale : parseLocaleFromCookie(request.headers.get("cookie"))
  )
}

export { resolveRequestLocale as resolveEmailLocaleFromRequest }
