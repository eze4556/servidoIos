import { defaultLocale, isAppLocale, LOCALE_COOKIE, type AppLocale } from "@/i18n/config"

export interface WelcomeEmailData {
  user_name: string
  user_email: string
  account_type: string
  locale?: AppLocale
}

export interface CadeteStatusEmailData {
  user_name: string
  user_email: string
  decision: "approved" | "rejected"
  locale?: AppLocale
}

function readClientLocale(): AppLocale {
  if (typeof document === "undefined") return defaultLocale
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`))
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null
  return isAppLocale(raw) ? raw : defaultLocale
}

/**
 * Dispara el mail de bienvenida desde el front.
 * El envío real lo hace /api/email/welcome con Resend (API key solo en el server).
 * No lanza error al caller: el registro no debe fallar si el mail falla.
 */
export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  try {
    const response = await fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: data.user_name,
        user_email: data.user_email,
        account_type: data.account_type,
        locale: data.locale ?? readClientLocale(),
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      console.error("Welcome email API failed:", response.status, payload)
      return
    }

    console.log("Welcome email requested successfully")
  } catch (error) {
    console.error("Error requesting welcome email:", error)
  }
}

/** Aviso al cadete cuando admin aprueba o rechaza. No bloquea la acción admin. */
export const sendCadeteStatusEmail = async (data: CadeteStatusEmailData): Promise<void> => {
  try {
    const response = await fetch("/api/email/cadete-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: data.user_name,
        user_email: data.user_email,
        decision: data.decision,
        locale: data.locale ?? readClientLocale(),
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      console.error("Cadete status email API failed:", response.status, payload)
      return
    }

    console.log("Cadete status email requested successfully")
  } catch (error) {
    console.error("Error requesting cadete status email:", error)
  }
}
