'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import type { InventoryProductInput, InventoryVariantInput } from '@/actions/inventory'
import { saveInventoryProductAction } from '@/actions/inventory'

export type ProductEditorState = InventoryProductInput & {
  matchedVariantId?: string
}

const EMPTY_VARIANT = (): InventoryVariantInput => ({
  name: '',
  sku: '',
  barcode: '',
  price: 0,
  mrp: undefined,
  stock: 0,
  isAvailable: true,
})

type Props = {
  open: boolean
  initial: ProductEditorState | null
  onClose: () => void
  onSaved: () => void
}

export function ProductEditorDrawer({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ProductEditorState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useVariants, setUseVariants] = useState(false)

  useEffect(() => {
    if (!open || !initial) return
    setForm({
      ...initial,
      variants: initial.variants?.length ? initial.variants : [],
    })
    setUseVariants((initial.variants?.length ?? 0) > 0)
    setError(null)
  }, [open, initial])

  if (!open || !form) return null

  const update = (patch: Partial<ProductEditorState>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))

  const updateVariant = (index: number, patch: Partial<InventoryVariantInput>) => {
    setForm((prev) => {
      if (!prev) return prev
      const variants = [...(prev.variants ?? [])]
      variants[index] = { ...variants[index], ...patch }
      return { ...prev, variants }
    })
  }

  const addVariant = () => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        variants: [...(prev.variants ?? []), { ...EMPTY_VARIANT(), price: prev.price }],
      }
    })
    setUseVariants(true)
  }

  const removeVariant = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev
      const variants = (prev.variants ?? []).filter((_, i) => i !== index)
      return { ...prev, variants }
    })
  }

  const save = async () => {
    if (!form.name.trim()) {
      setError('Product name is required')
      return
    }
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid selling price')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload: InventoryProductInput = {
        ...form,
        price,
        mrp: form.mrp ? Number(form.mrp) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        taxRate: form.taxRate ? Number(form.taxRate) : undefined,
        stock: form.stock !== undefined ? Number(form.stock) : undefined,
        lowStockThreshold: form.lowStockThreshold
          ? Number(form.lowStockThreshold)
          : undefined,
        variants: useVariants
          ? (form.variants ?? []).map((v) => ({
              ...v,
              price: Number(v.price) || price,
              mrp: v.mrp ? Number(v.mrp) : undefined,
              stock: Number(v.stock) || 0,
            }))
          : [],
      }

      const res = await saveInventoryProductAction(payload)
      if (!res.ok) {
        setError(res.error ?? 'Could not save')
        return
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {form.id ? 'Edit product' : 'Add product'}
            </h3>
            <p className="text-sm text-gray-500">SKU, barcode, stock, variants & pricing</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Basic info
            </h4>
            <input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Product name *"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
            <textarea
              value={form.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.brand ?? ''}
                onChange={(e) => update({ brand: e.target.value })}
                placeholder="Brand"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
              <input
                value={form.productCategory ?? ''}
                onChange={(e) => update({ productCategory: e.target.value })}
                placeholder="Category"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Identification
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.sku ?? ''}
                onChange={(e) => update({ sku: e.target.value })}
                placeholder="SKU"
                className="rounded-xl border px-3 py-2.5 text-sm font-mono"
              />
              <input
                value={form.barcode ?? ''}
                onChange={(e) => update({ barcode: e.target.value })}
                placeholder="Barcode / EAN"
                className="rounded-xl border px-3 py-2.5 text-sm font-mono"
              />
            </div>
            <input
              value={form.hsnCode ?? ''}
              onChange={(e) => update({ hsnCode: e.target.value })}
              placeholder="HSN code (GST)"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Pricing</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.price || ''}
                onChange={(e) => update({ price: Number(e.target.value) })}
                placeholder="Selling price ₹ *"
                inputMode="decimal"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
              <input
                value={form.mrp ?? ''}
                onChange={(e) => update({ mrp: Number(e.target.value) || undefined })}
                placeholder="MRP ₹"
                inputMode="decimal"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
              <input
                value={form.costPrice ?? ''}
                onChange={(e) => update({ costPrice: Number(e.target.value) || undefined })}
                placeholder="Cost price ₹"
                inputMode="decimal"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
              <input
                value={form.taxRate ?? ''}
                onChange={(e) => update({ taxRate: Number(e.target.value) || undefined })}
                placeholder="Tax %"
                inputMode="decimal"
                className="rounded-xl border px-3 py-2.5 text-sm"
              />
            </div>
            <input
              value={form.unit ?? ''}
              onChange={(e) => update({ unit: e.target.value })}
              placeholder="Unit (piece, 1 kg, 500 ml…)"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Variants
              </h4>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={useVariants}
                  onChange={(e) => {
                    setUseVariants(e.target.checked)
                    if (e.target.checked && !(form.variants?.length ?? 0)) addVariant()
                  }}
                />
                Has variants
              </label>
            </div>

            {!useVariants ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.stock ?? 0}
                  onChange={(e) => update({ stock: Number(e.target.value) || 0 })}
                  placeholder="Stock qty"
                  inputMode="numeric"
                  className="rounded-xl border px-3 py-2.5 text-sm"
                />
                <input
                  value={form.lowStockThreshold ?? 5}
                  onChange={(e) =>
                    update({ lowStockThreshold: Number(e.target.value) || 5 })
                  }
                  placeholder="Low stock alert at"
                  inputMode="numeric"
                  className="rounded-xl border px-3 py-2.5 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {(form.variants ?? []).map((v, i) => (
                  <div key={v.id ?? i} className="rounded-xl border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Variant {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={v.name}
                        onChange={(e) => updateVariant(i, { name: e.target.value })}
                        placeholder="Variant name (500g, Red…)"
                        className="col-span-2 rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        value={v.sku ?? ''}
                        onChange={(e) => updateVariant(i, { sku: e.target.value })}
                        placeholder="SKU"
                        className="rounded-lg border px-3 py-2 text-sm font-mono"
                      />
                      <input
                        value={v.barcode ?? ''}
                        onChange={(e) => updateVariant(i, { barcode: e.target.value })}
                        placeholder="Barcode"
                        className="rounded-lg border px-3 py-2 text-sm font-mono"
                      />
                      <input
                        value={v.price || ''}
                        onChange={(e) =>
                          updateVariant(i, { price: Number(e.target.value) || 0 })
                        }
                        placeholder="Price ₹"
                        inputMode="decimal"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        value={v.stock ?? 0}
                        onChange={(e) =>
                          updateVariant(i, { stock: Number(e.target.value) || 0 })
                        }
                        placeholder="Stock"
                        inputMode="numeric"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium text-rabbit-700"
                >
                  <Plus className="h-4 w-4" />
                  Add variant
                </button>
              </div>
            )}
          </section>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="border-t px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rabbit-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {form.id ? 'Save changes' : 'Add to inventory'}
          </button>
        </div>
      </div>
    </div>
  )
}
