import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  getDocs, 
  query
} from 'firebase/firestore'
import type { SubscriptionPricingHistory } from '@/types/subscription'

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

// GET - Obtener historial de cambios de precio
export async function GET() {
  try {
    const historyRef = collection(db, 'subscriptionPricingHistory')
    const q = query(historyRef)
    const snapshot = await getDocs(q)
    
    const history: SubscriptionPricingHistory[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as SubscriptionPricingHistory & { createdAt?: any }
        return {
          id: doc.id,
          ...data,
          changedAt: normalizeTimestamp(data.changedAt || data.createdAt),
        } as SubscriptionPricingHistory
      })
      .sort((left, right) => {
        const leftDate = left.changedAt ? new Date(left.changedAt).getTime() : 0
        const rightDate = right.changedAt ? new Date(right.changedAt).getTime() : 0
        return rightDate - leftDate
      })
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error al obtener historial de precios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
