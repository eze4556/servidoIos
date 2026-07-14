import { Resend } from "resend"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildCadeteStatusHtml(params: {
  userName: string
  decision: "approved" | "rejected"
  appUrl: string
}) {
  const { userName, decision, appUrl } = params
  const approved = decision === "approved"
  const title = approved ? "¡Fuiste aprobado como cadete!" : "Actualización de tu postulación"
  const body = approved
    ? "Ya podés entrar al panel y tomar pedidos disponibles en tu zona."
    : "Tu postulación como cadete no fue aprobada por ahora. Si creés que es un error, contactá a soporte."
  const cta = approved ? "Ir al panel de cadete" : "Ir a Servido"
  const ctaUrl = approved ? `${appUrl}/dashboard/cadete` : appUrl
  const accent = approved ? "#059669" : "#b45309"

  return `<!DOCTYPE html>
<html lang="es">
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
              <div style="margin-top:6px;font-size:13px;color:#bae6fd;">Cadetes</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1f1235;">Hola, ${escapeHtml(userName)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(body)}</p>
              <div style="display:inline-block;background:${accent};color:#fff;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;margin-bottom:20px;">
                ${approved ? "APROBADO" : "NO APROBADO"}
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
              © Servido
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
    const decisionRaw = String(body.decision || "").trim()
    const decision = decisionRaw === "approved" || decisionRaw === "rejected" ? decisionRaw : null

    if (!userName || !userEmail || !userEmail.includes("@") || !decision) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const from = process.env.EMAIL_FROM || "Servido <hola@servido.com.ar>"
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.servido.com.ar"
    const appUrl = rawAppUrl.replace(/^NEXT_PUBLIC_APP_URL=/, "").replace(/\/$/, "")

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: [userEmail],
      subject:
        decision === "approved"
          ? "Fuiste aprobado como cadete en Servido"
          : "Actualización de tu postulación de cadete",
      html: buildCadeteStatusHtml({ userName, decision, appUrl }),
    })

    if (error) {
      console.error("Resend cadete status email error:", error)
      return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 502 })
    }

    return NextResponse.json({ success: true, id: data?.id || null })
  } catch (error) {
    console.error("Cadete status email route error:", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
