import { Resend } from "resend"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const ACCOUNT_LABELS: Record<string, string> = {
  seller: "Vendedor",
  buyer: "Comprador",
  user: "Comprador",
  restaurant: "Restaurante",
  cadete: "Cadete",
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildWelcomeHtml(params: {
  userName: string
  userEmail: string
  accountType: string
  appUrl: string
}) {
  const { userName, userEmail, accountType, appUrl } = params
  const displayUrl = appUrl.replace(/^https?:\/\//, "")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bienvenido a Servido</title>
</head>
<body style="margin:0;padding:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#1f1235;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(76,29,149,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4c1d95,#6d28d9);padding:28px 24px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Servido</div>
              <div style="margin-top:6px;font-size:13px;color:#fde68a;">Marketplace local</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1f1235;">¡Hola, ${escapeHtml(userName)}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
                Tu cuenta en Servido ya está lista. Nos alegra tenerte con nosotros.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf5ff;border-radius:14px;margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#7c3aed;font-weight:700;margin-bottom:8px;">Tus datos</div>
                    <div style="font-size:14px;color:#374151;margin-bottom:6px;"><strong>Usuario:</strong> ${escapeHtml(userEmail)}</div>
                    <div style="font-size:14px;color:#374151;"><strong>Tipo de cuenta:</strong> ${escapeHtml(accountType)}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
                Ya podés entrar y empezar a usar Servido.
              </p>
              <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">
                Ir a Servido
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
              Si no creaste esta cuenta, podés ignorar este mensaje.<br/>
              © Servido · ${escapeHtml(displayUrl)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const body = await request.json()
    const userName = String(body.user_name || "").trim()
    const userEmail = String(body.user_email || "").trim().toLowerCase()
    const accountTypeRaw = String(body.account_type || "buyer").trim()
    const accountType = ACCOUNT_LABELS[accountTypeRaw] || "Comprador"

    if (!userName || !userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const from = process.env.EMAIL_FROM || "Servido <hola@servido.com.ar>"
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.servido.com.ar"
    // Soporta valores mal pegados tipo NEXT_PUBLIC_APP_URL=https://...
    const appUrl = rawAppUrl.replace(/^NEXT_PUBLIC_APP_URL=/, "").replace(/\/$/, "")

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: [userEmail],
      subject: "¡Bienvenido a Servido!",
      html: buildWelcomeHtml({
        userName,
        userEmail,
        accountType,
        appUrl,
      }),
    })

    if (error) {
      console.error("Resend welcome email error:", error)
      return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 502 })
    }

    return NextResponse.json({ success: true, id: data?.id || null })
  } catch (error) {
    console.error("Welcome email route error:", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
