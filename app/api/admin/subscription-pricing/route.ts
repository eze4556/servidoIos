import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore'
import type { SubscriptionPricing, SubscriptionPricingHistory } from '@/types/subscription'

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

function serializePricingDoc(docId: string, data: any) {
  const createdAt = data?.createdAt || data?.updatedAt || null
  const updatedAt = data?.updatedAt || data?.createdAt || null

  return {
    id: docId,
    ...data,
    createdAt: normalizeTimestamp(createdAt),
    updatedAt: normalizeTimestamp(updatedAt),
  }
}

// GET - Obtener el precio activo de suscripción
export async function GET() {
  try {
    const pricingRef = collection(db, 'subscriptionPricing')
    const q = query(pricingRef, where('isActive', '==', true))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'No hay precio de suscripción configurado' }, { status: 404 })
    }

    const activeDoc = snapshot.docs
      .map((pricingDoc) => ({
        id: pricingDoc.id,
        data: pricingDoc.data() as SubscriptionPricing,
      }))
      .sort((left, right) => {
        const leftDate = left.data.createdAt?.toDate?.() || left.data.updatedAt?.toDate?.() || 0
        const rightDate = right.data.createdAt?.toDate?.() || right.data.updatedAt?.toDate?.() || 0
        return rightDate - leftDate
      })[0]

    return NextResponse.json(serializePricingDoc(activeDoc.id, activeDoc.data))
  } catch (error) {
    console.error('Error al obtener precio de suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo precio de suscripción
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { price, notes, createdBy } = body
    
    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }
    
    if (!createdBy) {
      return NextResponse.json({ error: 'Usuario creador requerido' }, { status: 400 })
    }
    
    // Desactivar precio anterior si existe
    const existingPricingRef = collection(db, 'subscriptionPricing')
    const existingQuery = query(existingPricingRef, where('isActive', '==', true))
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0]
      const existingData = existingDoc.data() as SubscriptionPricing
      
      // Crear registro en el historial
      await addDoc(collection(db, 'subscriptionPricingHistory'), {
        oldPrice: existingData.price,
        newPrice: price,
        changedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        changedBy: createdBy,
        reason: notes || 'Cambio de precio por administrador'
      })
      
      // Desactivar precio anterior
      await updateDoc(doc(db, 'subscriptionPricing', existingDoc.id), {
        isActive: false,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
    
    // Crear nuevo precio
    const newPricing = {
      price,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy,
      notes: notes || ''
    }
    
    const docRef = await addDoc(collection(db, 'subscriptionPricing'), newPricing)
    
    return NextResponse.json(
      serializePricingDoc(docRef.id, newPricing),
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al crear precio de suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar precio existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, price, notes, updatedBy } = body
    
    if (!id || !price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    
    if (!updatedBy) {
      return NextResponse.json({ error: 'Usuario actualizador requerido' }, { status: 400 })
    }
    
    // Obtener precio actual
    const pricingRef = doc(db, 'subscriptionPricing', id)
    const pricingDoc = await getDoc(pricingRef)
    
    if (!pricingDoc.exists()) {
      return NextResponse.json({ error: 'Precio no encontrado' }, { status: 404 })
    }
    
    const currentData = pricingDoc.data() as SubscriptionPricing
    
    // Crear registro en el historial
    await addDoc(collection(db, 'subscriptionPricingHistory'), {
      oldPrice: currentData.price,
      newPrice: price,
      changedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      changedBy: updatedBy,
      reason: notes || 'Actualización de precio por administrador'
    })
    
    // Actualizar precio
    await updateDoc(pricingRef, {
      price,
      notes: notes || currentData.notes,
      createdAt: currentData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    return NextResponse.json({ message: 'Precio actualizado correctamente' })
  } catch (error) {
    console.error('Error al actualizar precio de suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
