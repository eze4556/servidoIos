export interface WelcomeEmailData {
  user_name: string
  user_email: string
  account_type: string
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
