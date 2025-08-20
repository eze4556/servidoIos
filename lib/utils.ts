import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-fallback-encryption-key-min-32-chars!!"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceReduced(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceNumberReduced(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function cleanAndFormatPrice(price: string | number): string {
  const priceStr = typeof price === 'number' ? price.toString() : price
  const cleaned = priceStr.replace(/[^\d.,]/g, '')
  const numPrice = parseFloat(cleaned.replace(',', '.'))
  if (isNaN(numPrice)) {
    return formatPriceNumber(0)
  }
  return formatPriceNumber(Math.round(numPrice))
}


export function formatLargeNumber(num: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)


  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512")

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)


  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ])

 
  const tag = cipher.getAuthTag()


  const result = Buffer.concat([salt, iv, tag, encrypted])
  return result.toString("base64")
}

export function decrypt(encryptedText: string): string {
 
  const buffer = Buffer.from(encryptedText, "base64")

 
  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const content = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // Recrear clave
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512")

  // Crear decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // Desencriptar
  const decrypted = Buffer.concat([
    decipher.update(content),
    decipher.final()
  ])

  return decrypted.toString("utf8")
}
