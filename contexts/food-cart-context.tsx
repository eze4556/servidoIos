"use client"

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react"

export interface FoodCartItem {
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  price: number
  quantity: number
}

interface FoodCartState {
  restaurantId: string | null
  restaurantName: string | null
  items: FoodCartItem[]
}

type FoodCartAction =
  | { type: "ADD_ITEM"; payload: FoodCartItem }
  | { type: "REMOVE_ITEM"; payload: { menuItemId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { menuItemId: string; quantity: number } }
  | { type: "CLEAR" }

const initialState: FoodCartState = {
  restaurantId: null,
  restaurantName: null,
  items: [],
}

function foodCartReducer(state: FoodCartState, action: FoodCartAction): FoodCartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { payload } = action
      if (state.restaurantId && state.restaurantId !== payload.restaurantId) {
        return {
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          items: [payload],
        }
      }
      const existing = state.items.find((i) => i.menuItemId === payload.menuItemId)
      if (existing) {
        return {
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          items: state.items.map((i) =>
            i.menuItemId === payload.menuItemId ? { ...i, quantity: i.quantity + payload.quantity } : i
          ),
        }
      }
      return {
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
        items: [...state.items, payload],
      }
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.menuItemId !== action.payload.menuItemId),
      }
    case "UPDATE_QUANTITY": {
      const { menuItemId, quantity } = action.payload
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        }
      }
      return {
        ...state,
        items: state.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
      }
    }
    case "CLEAR":
      return initialState
    default:
      return state
  }
}

interface FoodCartContextType {
  items: FoodCartItem[]
  restaurantId: string | null
  restaurantName: string | null
  itemCount: number
  subtotal: number
  addItem: (item: Omit<FoodCartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
}

const FoodCartContext = createContext<FoodCartContextType | undefined>(undefined)

export function FoodCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(foodCartReducer, initialState)

  const addItem = useCallback(
    (item: Omit<FoodCartItem, "quantity"> & { quantity?: number }) => {
      dispatch({
        type: "ADD_ITEM",
        payload: { ...item, quantity: item.quantity ?? 1 },
      })
    },
    []
  )

  const removeItem = useCallback((menuItemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { menuItemId } })
  }, [])

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { menuItemId, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" })
  }, [])

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <FoodCartContext.Provider
      value={{
        items: state.items,
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </FoodCartContext.Provider>
  )
}

export function useFoodCart() {
  const context = useContext(FoodCartContext)
  if (!context) {
    throw new Error("useFoodCart must be used within FoodCartProvider")
  }
  return context
}
