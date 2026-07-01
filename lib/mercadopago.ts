import { MercadoPagoConfig, Preference } from 'mercadopago'

type MercadoPagoClient = {
  preferences: {
    create: (preferenceData: Record<string, unknown>) => Promise<unknown>
  }
}

const configureMercadoPago = (): MercadoPagoClient => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado')
  }
  
  const client = new MercadoPagoConfig({ accessToken })
  const preferenceClient = new Preference(client)

  return {
    preferences: {
      create: (preferenceData: Record<string, unknown>) => {
        const backUrls = (preferenceData as any).back_urls || {}
        const successUrl = typeof backUrls.success === "string" ? backUrls.success : ""
        const derivedSiteUrl = successUrl ? (() => {
          try {
            return new URL(successUrl).origin
          } catch {
            return ""
          }
        })() : ""

        console.info("[MercadoPago] preference payload debug", {
          siteUrl: derivedSiteUrl,
          preferenceData,
          back_urls: backUrls,
          auto_return: (preferenceData as any).auto_return,
        })

        return preferenceClient.create({ body: preferenceData })
      },
    },
  }
}

const getMercadoPagoSiteUrl = (request: Request) => {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin
    } catch {
      return configuredAppUrl.replace(/\/+$/, "")
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}

export { configureMercadoPago, getMercadoPagoSiteUrl }

