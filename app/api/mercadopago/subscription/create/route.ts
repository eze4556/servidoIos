import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import type { SubscriptionPricing } from '@/types/subscription'
import { configureMercadoPago, getMercadoPagoSiteUrl } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, planType, returnPath } = body
    const siteUrl = getMercadoPagoSiteUrl(request)

    console.log("request.url =", request.url)
    console.log("host =", request.headers.get("host"))
    console.log("x-forwarded-host =", request.headers.get("x-forwarded-host"))
    console.log("x-forwarded-proto =", request.headers.get("x-forwarded-proto"))
    console.log("siteUrl =", siteUrl)

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'userId y planType son requeridos' },
        { status: 400 }
      )
    }

    const dashboardPath =
      returnPath === "/dashboard/restaurant" || returnPath === "restaurant"
        ? "/dashboard/restaurant"
        : "/dashboard/seller"

    // Obtener el precio activo de suscripción
    const pricingRef = collection(db, 'subscriptionPricing')
    const q = query(pricingRef, where('isActive', '==', true), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    let subscriptionPrice = 29.99 // Precio por defecto
    if (!snapshot.empty) {
      const activePricing = snapshot.docs[0].data() as SubscriptionPricing
      subscriptionPrice = activePricing.price
    }

    // Crear la preferencia de suscripción
    const preferenceData: Record<string, any> = {
      items: [
        {
          title: `Suscripción ${planType.charAt(0).toUpperCase() + planType.slice(1)} - Servido`,
          description: 'Acceso completo para operar como vendedor o restaurante en la plataforma',
          quantity: 1,
          unit_price: subscriptionPrice,
          currency_id: 'ARS'
        }
      ],
      back_urls: {
        success: `${siteUrl}${dashboardPath}?subscription=success`,
        failure: `${siteUrl}${dashboardPath}?subscription=failure`,
        pending: `${siteUrl}${dashboardPath}?subscription=pending`
      },
      external_reference: `subscription_${userId}_${planType}`,
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      payer: {
        name: 'Usuario',
        email: 'usuario@example.com'
      }
    }

    if (preferenceData.back_urls.success) {
      preferenceData.auto_return = 'approved'
    }

    // Configurar MercadoPago
    const mp = configureMercadoPago()
    
    try {
      // Crear preferencia real en MercadoPago
      const preference = await mp.preferences.create(preferenceData)
      
      console.log('Preferencia creada en MercadoPago:', preference)
      
      return NextResponse.json({
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point
      })
      
    } catch (mpError) {
      console.error('[MercadoPago] SDK error object:', mpError)
      try {
        console.error(
          '[MercadoPago] SDK error json:',
          JSON.stringify(mpError, Object.getOwnPropertyNames(mpError as object), 2)
        )
      } catch {
        // Mantener el flujo original si el error no es serializable
      }
      
      // En caso de error con MercadoPago, devolver error específico
      return NextResponse.json(
        { error: 'Error al crear preferencia en MercadoPago', details: mpError },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error al crear preferencia de suscripción:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
