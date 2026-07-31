import { Resend } from "resend"
import { NextResponse } from "next/server"
import {
  buildCadeteStatusHtml,
  getCadeteStatusEmailSubject,
  getEmailApiError,
  resolveEmailLocaleFromRequest,
} from "@/lib/email-templates"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let locale = resolveEmailLocaleFromRequest(request, undefined)
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured")
      return NextResponse.json({ error: getEmailApiError(locale, "notConfigured") }, { status: 500 })
    }

    const body = await request.json()
    locale = resolveEmailLocaleFromRequest(request, body.locale)
    const userName = String(body.user_name || "").trim()
    const userEmail = String(body.user_email || "").trim().toLowerCase()
    const decisionRaw = String(body.decision || "").trim()
    const decision = decisionRaw === "approved" || decisionRaw === "rejected" ? decisionRaw : null

    if (!userName || !userEmail || !userEmail.includes("@") || !decision) {
      return NextResponse.json({ error: getEmailApiError(locale, "invalidData") }, { status: 400 })
    }

    const from = process.env.EMAIL_FROM || "Servido <hola@servido.com.ar>"
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.servido.com.ar"
    const appUrl = rawAppUrl.replace(/^NEXT_PUBLIC_APP_URL=/, "").replace(/\/$/, "")

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: [userEmail],
      subject: getCadeteStatusEmailSubject(locale, decision),
      html: buildCadeteStatusHtml({ locale, userName, decision, appUrl }),
    })

    if (error) {
      console.error("Resend cadete status email error:", error)
      return NextResponse.json(
        { error: error.message || getEmailApiError(locale, "sendFailed") },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id || null })
  } catch (error) {
    console.error("Cadete status email route error:", error)
    return NextResponse.json({ error: getEmailApiError(locale, "unexpectedError") }, { status: 500 })
  }
}
