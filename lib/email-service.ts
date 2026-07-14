export interface WelcomeEmailData {
  user_name: string
  user_email: string
  account_type: string
}

export interface CadeteStatusEmailData {
  user_name: string
  user_email: string
  decision: "approved" | "rejected"
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
