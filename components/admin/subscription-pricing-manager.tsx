"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  Edit, 
  Plus, 
  Save, 
  X, 
  History, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useLocale, useTranslations } from 'next-intl'
import type { SubscriptionPricing, SubscriptionPricingHistory } from '@/types/subscription'

interface SubscriptionPricingManagerProps {
  currentUserId: string
}

export default function SubscriptionPricingManager({ currentUserId }: SubscriptionPricingManagerProps) {
  const t = useTranslations('adminDashboard.subscriptionPricing')
  const tAlerts = useTranslations('adminDashboard.alerts')
  const tCommon = useTranslations('adminDashboard.common')
  const locale = useLocale()
  const dateLocale = locale === 'pt-BR' ? 'pt-BR' : 'es-AR'
  const [currentPricing, setCurrentPricing] = useState<SubscriptionPricing | null>(null)
  const [pricingHistory, setPricingHistory] = useState<SubscriptionPricingHistory[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  
  const { toast } = useToast()

  // Cargar datos iniciales
  useEffect(() => {
    fetchCurrentPricing()
    fetchPricingHistory()
  }, [currentUserId])

  const fetchCurrentPricing = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subscription-pricing')
      if (response.ok) {
        const data = await response.json()
        setCurrentPricing(data)
      } else if (response.status === 404) {
        setCurrentPricing(null)
      }
    } catch (error) {
      console.error('Error al cargar precio actual:', error)
      toast({
        title: tAlerts('errorTitle'),
        description: t('loadError'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPricingHistory = async () => {
    try {
      const response = await fetch('/api/admin/subscription-pricing/history')
      if (response.ok) {
        const data = await response.json()
        setPricingHistory(data)
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setIsEditing(false)
    setPrice('')
    setNotes('')
  }

  const handleEdit = () => {
    if (!currentPricing) return
    
    setIsEditing(true)
    setIsCreating(false)
    setPrice(currentPricing.price.toString())
    setNotes(currentPricing.notes || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setPrice('')
    setNotes('')
  }

  const handleSave = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: tAlerts('errorTitle'),
        description: t('invalidPrice'),
        variant: 'destructive'
      })
      return
    }

    if (!currentUserId || currentUserId.trim() === '') {
      toast({
        title: tAlerts('errorTitle'),
        description: t('invalidUserId'),
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      
      if (isCreating) {
        // Crear nuevo precio
        const response = await fetch('/api/admin/subscription-pricing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price: parseFloat(price),
            notes,
            createdBy: currentUserId
          })
        })

        if (response.ok) {
          toast({
            title: tAlerts('successTitle'),
            description: t('createSuccess')
          })
          await fetchCurrentPricing()
          await fetchPricingHistory()
          handleCancel()
        } else {
          const error = await response.json()
          throw new Error(error.error || t('createError'))
        }
      } else if (isEditing && currentPricing) {
        // Actualizar precio existente
        const response = await fetch('/api/admin/subscription-pricing', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: currentPricing.id,
            price: parseFloat(price),
            notes,
            updatedBy: currentUserId
          })
        })

        if (response.ok) {
          toast({
            title: tAlerts('successTitle'),
            description: t('updateSuccess')
          })
          await fetchCurrentPricing()
          await fetchPricingHistory()
          handleCancel()
        } else {
          const error = await response.json()
          throw new Error(error.error || t('updateError'))
        }
      }
    } catch (error) {
      console.error('Error al guardar:', error)
      toast({
        title: tAlerts('errorTitle'),
        description: error instanceof Error ? error.message : t('saveError'),
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return tCommon('na')

    let date: Date | null = null

    if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp?.toDate === 'function') {
      date = timestamp.toDate()
    } else if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp)
      date = Number.isNaN(parsed.getTime()) ? null : parsed
    } else if (typeof timestamp === 'number') {
      const parsed = new Date(timestamp)
      date = Number.isNaN(parsed.getTime()) ? null : parsed
    } else if (typeof timestamp?.seconds === 'number') {
      const parsed = new Date(timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1_000_000))
      date = Number.isNaN(parsed.getTime()) ? null : parsed
    } else if (typeof timestamp?._seconds === 'number') {
      const parsed = new Date(timestamp._seconds * 1000 + Math.floor((timestamp._nanoseconds || 0) / 1_000_000))
      date = Number.isNaN(parsed.getTime()) ? null : parsed
    }

    if (!date || Number.isNaN(date.getTime())) return tCommon('na')

    return date.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('managerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2">{t('loading')}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Precio Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('currentTitle')}
          </CardTitle>
          <CardDescription>
            {t('currentDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPricing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                                                    <p className="text-2xl font-bold text-green-700">
                                  ARS {currentPricing.price.toFixed(2)}
                                </p>
                    <p className="text-sm text-green-600">
                      {t('activeSince', { date: formatDate(currentPricing.createdAt) })}
                    </p>
                    {currentPricing.notes && (
                      <p className="text-sm text-green-600 mt-1">
                        {t('notesLabel')}: {currentPricing.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    {tCommon('edit')}
                  </Button>
                  <Button onClick={handleCreateNew} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('newPrice')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('noPriceTitle')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('noPriceDescription')}
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('configureFirst')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Creación/Edición */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? t('formCreateTitle') : t('formEditTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="price">{t('priceLabel')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ARS
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-8"
                    placeholder="29.99"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">{t('notesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isCreating ? t('create') : t('update')}
                    </>
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Cambios */}
      {pricingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('historyTitle')}
            </CardTitle>
            <CardDescription>
              {t('historyDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pricingHistory.map((change) => (
                <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">ARS {change.oldPrice.toFixed(2)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-green-600">ARS {change.newPrice.toFixed(2)}</span>
                    </div>
                    {change.reason && (
                      <span className="text-sm text-gray-600">• {change.reason}</span>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{formatDate(change.changedAt)}</div>
                    <div>{t('changedBy', { user: change.changedBy })}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle>{t('systemInfoTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>{t('systemInfoUnique')}</strong> {t('systemInfoUniqueDesc')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>{t('systemInfoHistory')}</strong> {t('systemInfoHistoryDesc')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>{t('systemInfoImpact')}</strong> {t('systemInfoImpactDesc')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <strong>{t('systemInfoMarketplace')}</strong> {t('systemInfoMarketplaceDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
