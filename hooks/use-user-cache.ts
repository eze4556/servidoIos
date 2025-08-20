import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useCache } from '@/contexts/cache-context'

export interface User {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  role?: 'user' | 'seller' | 'admin'
  isActive?: boolean
  createdAt?: any
  updatedAt?: any
 
  sellerInfo?: {
    businessName?: string
    description?: string
    address?: string
    phone?: string
    website?: string
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
    }
    verified?: boolean
    rating?: number
    totalSales?: number
  }
  
  buyerInfo?: {
    defaultAddress?: string
    preferences?: {
      categories?: string[]
      brands?: string[]
      priceRange?: {
        min?: number
        max?: number
      }
    }
    totalPurchases?: number
    memberSince?: any
  }
}

export function useUserCache() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getCache, setCache, preloadData } = useCache()


  const CACHE_KEYS = {
    byId: (id: string) => `user:${id}`,
    byEmail: (email: string) => `user:email:${email}`,
    sellers: 'users:sellers',
    activeSellers: 'users:active-sellers',
    topSellers: 'users:top-sellers',
  }

 
  const getUserById = useCallback(async (userId: string): Promise<User | null> => {
    const cached = getCache<User>(CACHE_KEYS.byId(userId))
    if (cached) return cached

    setLoading(true)
    setError(null)

    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      
      if (!userDoc.exists()) {
        return null
      }

      const userData = { id: userDoc.id, ...userDoc.data() } as User
      
      
      setCache(CACHE_KEYS.byId(userId), userData, 15 * 60 * 1000)
      
    
      if (userData.email) {
        setCache(CACHE_KEYS.byEmail(userData.email), userData, 15 * 60 * 1000)
      }

      return userData
    } catch (err) {
      console.error("Error fetching user:", err)
      const errorMsg = "Error al cargar la información del usuario."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [getCache, setCache])

  // Obtener usuario por email
  const getUserByEmail = useCallback(async (email: string): Promise<User | null> => {
    const cached = getCache<User>(CACHE_KEYS.byEmail(email))
    if (cached) return cached

    setLoading(true)
    setError(null)

    try {
      const usersQuery = query(
        collection(db, 'users'), 
        where('email', '==', email), 
        limit(1)
      )
      const userSnapshot = await getDocs(usersQuery)
      
      if (userSnapshot.empty) {
        return null
      }

      const userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as User
      
      
      setCache(CACHE_KEYS.byEmail(email), userData, 15 * 60 * 1000)
      setCache(CACHE_KEYS.byId(userData.id), userData, 15 * 60 * 1000)

      return userData
    } catch (err) {
      console.error("Error fetching user by email:", err)
      const errorMsg = "Error al buscar usuario por email."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [getCache, setCache])


  const getSellers = useCallback(async (): Promise<User[]> => {
    const cached = getCache<User[]>(CACHE_KEYS.sellers)
    if (cached) return cached

    setLoading(true)
    setError(null)

    try {
      const sellersQuery = query(
        collection(db, 'users'), 
        where('role', '==', 'seller'),
        where('isActive', '==', true)
      )
      const sellersSnapshot = await getDocs(sellersQuery)
      
      const sellers = sellersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as User)

    
      setCache(CACHE_KEYS.sellers, sellers, 10 * 60 * 1000)
      
      return sellers
    } catch (err) {
      console.error("Error fetching sellers:", err)
      const errorMsg = "Error al cargar los vendedores."
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [getCache, setCache])

 
  const getActiveSellers = useCallback(async (): Promise<User[]> => {
    const cached = getCache<User[]>(CACHE_KEYS.activeSellers)
    if (cached) return cached

    const allSellers = await getSellers()
    const activeSellers = allSellers.filter(seller => 
      seller.isActive && seller.sellerInfo?.verified
    )
    
    setCache(CACHE_KEYS.activeSellers, activeSellers, 10 * 60 * 1000)
    return activeSellers
  }, [getCache, setCache, getSellers])


  const getTopSellers = useCallback(async (limit: number = 10): Promise<User[]> => {
    const cached = getCache<User[]>(CACHE_KEYS.topSellers)
    if (cached) return cached.slice(0, limit)

    const allSellers = await getSellers()
    const topSellers = allSellers
      .filter(seller => seller.sellerInfo?.rating && seller.sellerInfo?.totalSales)
      .sort((a, b) => {
        const aScore = (a.sellerInfo?.rating || 0) * (a.sellerInfo?.totalSales || 0)
        const bScore = (b.sellerInfo?.rating || 0) * (b.sellerInfo?.totalSales || 0)
        return bScore - aScore
      })
      .slice(0, limit)

    setCache(CACHE_KEYS.topSellers, topSellers, 10 * 60 * 1000)
    return topSellers
  }, [getCache, setCache, getSellers])

 
  const searchUsers = useCallback(async (searchTerm: string, role?: string): Promise<User[]> => {
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    if (role === 'seller') {
      const sellers = await getSellers()
      return sellers.filter(seller => 
        seller.displayName?.toLowerCase().includes(lowerSearchTerm) ||
        seller.sellerInfo?.businessName?.toLowerCase().includes(lowerSearchTerm) ||
        seller.email.toLowerCase().includes(lowerSearchTerm)
      )
    }

   
    return searchUsers(searchTerm, 'seller')
  }, [getSellers])

  
  const preloadUser = useCallback((userId: string) => {
    preloadData(CACHE_KEYS.byId(userId), () => getUserById(userId), 15 * 60 * 1000)
  }, [preloadData, getUserById])

 
  const preloadSellers = useCallback(() => {
    preloadData(CACHE_KEYS.sellers, getSellers, 10 * 60 * 1000)
  }, [preloadData, getSellers])

 
  const setCurrentUserData = useCallback((user: User | null) => {
    setCurrentUser(user)
    if (user) {
     
      setCache(CACHE_KEYS.byId(user.id), user, 30 * 60 * 1000) 
      if (user.email) {
        setCache(CACHE_KEYS.byEmail(user.email), user, 30 * 60 * 1000)
      }
    }
  }, [setCache])

  return {
    currentUser,
    loading,
    error,
    getUserById,
    getUserByEmail,
    getSellers,
    getActiveSellers,
    getTopSellers,
    searchUsers,
    preloadUser,
    preloadSellers,
    setCurrentUser: setCurrentUserData,
    refresh: () => {
      // Limpiar cache y recargar
      if (currentUser) {
        getUserById(currentUser.id)
      }
    }
  }
}
