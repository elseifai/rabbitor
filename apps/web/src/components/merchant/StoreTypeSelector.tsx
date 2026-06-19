'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CUSTOM_STORE_CATEGORY_ID,
  findCategoryById,
  formatStoreCategoryLabel,
  STORE_CATEGORY_GROUPS,
  type StoreCategoryOption,
} from '@/lib/store-category-options'
import { validateCustomStoreCategory } from '@/lib/store-category-validation'
import type { StoreType } from '@rabbit/database'
import { cn } from '@/lib/utils'

export type StoreTypeSelection = {
  categoryId: string
  categoryLabel: string
  platformStoreType: StoreType
}

type Props = {
  categoryId: string
  customCategory: string
  shopName: string
  onCategoryIdChange: (id: string) => void
  onCustomCategoryChange: (value: string) => void
  onResolvedChange: (selection: StoreTypeSelection | null) => void
}

export function StoreTypeSelector({
  categoryId,
  customCategory,
  shopName,
  onCategoryIdChange,
  onCustomCategoryChange,
  onResolvedChange,
}: Props) {
  const [customTouched, setCustomTouched] = useState(false)
  const isCustom = categoryId === CUSTOM_STORE_CATEGORY_ID

  const customValidation = useMemo(
    () => (isCustom ? validateCustomStoreCategory(customCategory, shopName) : null),
    [isCustom, customCategory, shopName],
  )

  const resolved = useMemo((): StoreTypeSelection | null => {
    if (isCustom) {
      if (!customValidation?.ok) return null
      const matched = customValidation.matched
      return {
        categoryId: CUSTOM_STORE_CATEGORY_ID,
        categoryLabel: customValidation.label,
        platformStoreType: matched?.platformType ?? 'GENERAL',
      }
    }
    const opt = findCategoryById(categoryId)
    if (!opt) return null
    return {
      categoryId: opt.id,
      categoryLabel: opt.label,
      platformStoreType: opt.platformType,
    }
  }, [isCustom, customValidation, categoryId])

  useEffect(() => {
    onResolvedChange(resolved)
  }, [resolved, onResolvedChange])

  const handleCustomBlur = () => {
    setCustomTouched(true)
    const formatted = formatStoreCategoryLabel(customCategory)
    if (formatted !== customCategory) onCustomCategoryChange(formatted)
  }

  const applySuggestion = (label: string) => {
    onCustomCategoryChange(label)
    setCustomTouched(true)
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-gray-700">Store type</span>
        <select
          value={categoryId}
          onChange={(e) => {
            onCategoryIdChange(e.target.value)
            setCustomTouched(false)
          }}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-rabbit-500 focus:outline-none"
        >
          {STORE_CATEGORY_GROUPS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt: StoreCategoryOption) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="Other">
            <option value={CUSTOM_STORE_CATEGORY_ID}>Custom (specify type)</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-400">
          Pick the category that best describes what you sell — not your shop name.
        </p>
      </label>

      {isCustom && (
        <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Custom store type</span>
            <input
              value={customCategory}
              onChange={(e) => onCustomCategoryChange(e.target.value)}
              onBlur={handleCustomBlur}
              placeholder="e.g. Footwear, Restaurant, Gardening"
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none',
                customTouched && customValidation && !customValidation.ok
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-rabbit-500',
              )}
            />
          </label>

          {customTouched && customValidation && !customValidation.ok && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-red-600">{customValidation.error}</p>
              {customValidation.suggestion && (
                <button
                  type="button"
                  onClick={() => applySuggestion(customValidation.suggestion!)}
                  className="text-xs font-semibold text-rabbit-600 underline"
                >
                  Did you mean &quot;{customValidation.suggestion}&quot;?
                </button>
              )}
            </div>
          )}

          {customValidation?.ok && customValidation.corrected && (
            <p className="mt-2 text-xs text-emerald-600">
              Corrected to &quot;{customValidation.label}&quot;
            </p>
          )}
        </div>
      )}

      {resolved && (
        <p className="text-xs text-gray-500">
          Selected: <span className="font-semibold text-gray-800">{resolved.categoryLabel}</span>
        </p>
      )}
    </div>
  )
}
