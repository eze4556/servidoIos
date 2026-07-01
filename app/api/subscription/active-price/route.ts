import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore'
import type { SubscriptionPricing } from '@/types/subscription'

function normalizeTimestamp(value: any) {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString()
  }
  if (typeof value === 'string') {
    return Number.isNaN(Date.parse(value)) ? null : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value?._seconds === 'number') {
    const date = new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1_000_000))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

// GET - Obtener el precio activo de suscripción
export async function GET() {
  try {
    const pricingRef = collection(db, 'subscriptionPricing')
    const q = query(pricingRef, where('isActive', '==', true))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      // Si no hay precio configurado, devolver un precio por defecto
      return NextResponse.json({
        price: 29.99,
        isActive: true,
        message: 'Precio por defecto'
      })
    }
    
    const activePricing = snapshot.docs
      .map((pricingDoc) => ({
        id: pricingDoc.id,
        data: pricingDoc.data() as SubscriptionPricing,
      }))
      .sort((left, right) => {
        const leftDate = left.data.createdAt?.toDate?.() || left.data.updatedAt?.toDate?.() || 0
        const rightDate = right.data.createdAt?.toDate?.() || right.data.updatedAt?.toDate?.() || 0
        return rightDate - leftDate
      })[0]

    return NextResponse.json({
      id: activePricing.id,
      price: activePricing.data.price,
      isActive: activePricing.data.isActive,
      createdAt: normalizeTimestamp(activePricing.data.createdAt),
      updatedAt: normalizeTimestamp(activePricing.data.updatedAt)
    })
  } catch (error) {
    console.error('Error al obtener precio de suscripción:', error)
    // En caso de error, devolver precio por defecto
    return NextResponse.json({
      price: 29.99,
      isActive: true,
      message: 'Precio por defecto (error en base de datos)'
    })
  }
}
