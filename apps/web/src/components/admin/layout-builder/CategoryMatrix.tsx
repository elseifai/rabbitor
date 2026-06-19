'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Loader2, Package, Plus, Trash2, X } from 'lucide-react'
import { FileUploader } from '@/components/ui/file-uploader'
import { cn } from '@/lib/utils'
import { newId } from '@/lib/layout-config'
import type { HomeFeedMasterCategory, HomeFeedSubCategory } from '@/lib/home-feed-config'

type InsightsData = {
  slug: string
  masterCatalogCount: number
  shopProductCount: number
  items: {
    id: string
    name: string
    sku: string | null
    storeType: string
    category: string
    subcategory: string | null
    basePrice: number
    imageUrl: string | null
  }[]
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block text-xs">
      <span className="font-semibold text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition',
          checked ? 'bg-[#0C831F]' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}

type DrawerTab = 'metadata' | 'subcategories' | 'insights'

export function CategoryDrawerPanel({
  category,
  onChange,
  onClose,
  onDelete,
  onImageSaved,
}: {
  category: HomeFeedMasterCategory
  onChange: (next: HomeFeedMasterCategory) => void
  onClose: () => void
  onDelete: () => void
  onImageSaved?: (next: HomeFeedMasterCategory) => void
}) {
  const [tab, setTab] = useState<DrawerTab>('metadata')
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [tagsInput, setTagsInput] = useState(category.tags.join(', '))

  useEffect(() => {
    if (tab !== 'insights' || !category.slug) return
    setLoadingInsights(true)
    void fetch(`/api/admin/categories/insights?slug=${encodeURIComponent(category.slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInsights(json.data)
      })
      .finally(() => setLoadingInsights(false))
  }, [tab, category.slug])

  const addSubcategory = () => {
    const sub: HomeFeedSubCategory = {
      id: newId('sub'),
      label: 'New sub-category',
      slug: `sub-${category.subcategories.length + 1}`,
      sortOrder: category.subcategories.length,
    }
    onChange({ ...category, subcategories: [...category.subcategories, sub] })
  }

  const moveSub = (index: number, dir: -1 | 1) => {
    const next = [...category.subcategories]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({
      ...category,
      subcategories: next.map((s, i) => ({ ...s, sortOrder: i })),
    })
  }

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'metadata', label: 'Core Metadata' },
    { id: 'subcategories', label: 'Sub-Category Router' },
    { id: 'insights', label: 'Merchandising Insights' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#FF6B35]">
              Master Category
            </p>
            <h2 className="text-lg font-black text-gray-900">{category.label || 'Untitled'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider',
                tab === t.id ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'text-gray-400 hover:bg-gray-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'metadata' && (
            <div className="space-y-4">
              <Field
                label="Title"
                value={category.label}
                onChange={(v) => onChange({ ...category, label: v })}
              />
              <Field
                label="Slug / category link"
                value={category.slug}
                onChange={(v) => onChange({ ...category, slug: v.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="kirana, dairy, fish…"
              />
              <label className="block text-xs">
                <span className="font-semibold text-gray-600">Home section</span>
                <select
                  value={category.section}
                  onChange={(e) =>
                    onChange({
                      ...category,
                      section: e.target.value as HomeFeedMasterCategory['section'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm"
                >
                  <option value="groceryKitchen">Grocery & Kitchen</option>
                  <option value="snacksDrinks">Snacks & Drinks</option>
                </select>
              </label>
              <Field
                label="Classification tags (comma-separated)"
                value={tagsInput}
                onChange={(v) => {
                  setTagsInput(v)
                  onChange({
                    ...category,
                    tags: v
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }}
                placeholder="grocery, essentials, organic"
              />
              <Toggle
                label="Active on home feed"
                checked={category.active}
                onChange={(v) => onChange({ ...category, active: v })}
              />
              <Toggle
                label="Featured tile"
                checked={category.featured}
                onChange={(v) => onChange({ ...category, featured: v })}
              />
              <FileUploader
                value={category.image || null}
                onChange={(url) => {
                  const next = { ...category, image: url ?? '' }
                  onChange(next)
                  if (url) onImageSaved?.(next)
                }}
                label="Category thumbnail"
                aspect="square"
              />
            </div>
          )}

          {tab === 'subcategories' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Nest child categories for deeper routing to `/shops?category=…`
                </p>
                <button
                  type="button"
                  onClick={addSubcategory}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-[10px] font-bold text-white"
                >
                  <Plus className="h-3 w-3" />
                  Add sub-category
                </button>
              </div>
              {category.subcategories.length === 0 ? (
                <p className="rounded-xl border border-dashed py-8 text-center text-xs text-gray-400">
                  No sub-categories yet — add one to enable nested routing.
                </p>
              ) : (
                category.subcategories.map((sub, i) => (
                  <div
                    key={sub.id}
                    className="flex gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <GripVertical className="mt-2 h-4 w-4 shrink-0 text-gray-300" />
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Field
                        label="Label"
                        value={sub.label}
                        onChange={(v) => {
                          const next = [...category.subcategories]
                          next[i] = { ...sub, label: v }
                          onChange({ ...category, subcategories: next })
                        }}
                      />
                      <Field
                        label="Slug"
                        value={sub.slug}
                        onChange={(v) => {
                          const next = [...category.subcategories]
                          next[i] = { ...sub, slug: v }
                          onChange({ ...category, subcategories: next })
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveSub(i, -1)}
                        className="rounded p-1 hover:bg-white disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={i === category.subcategories.length - 1}
                        onClick={() => moveSub(i, 1)}
                        className="rounded p-1 hover:bg-white disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...category,
                            subcategories: category.subcategories.filter((s) => s.id !== sub.id),
                          })
                        }
                        className="rounded p-1 text-rose-500 hover:bg-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'insights' && (
            <div className="space-y-4">
              {loadingInsights ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#FF6B35]" />
                </div>
              ) : insights ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-[#FF6B35]/5 p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-400">Master catalog</p>
                      <p className="text-2xl font-black text-gray-900">
                        {insights.masterCatalogCount}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-[#0C831F]/5 p-4">
                      <p className="text-[10px] font-bold uppercase text-gray-400">Shop listings</p>
                      <p className="text-2xl font-black text-gray-900">{insights.shopProductCount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Products mapped to slug <span className="font-mono font-bold">{insights.slug}</span>
                  </p>
                  <div className="max-h-80 overflow-y-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {insights.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                                    <Package className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                <span className="font-semibold">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px]">{item.storeType}</td>
                            <td className="px-3 py-2 text-right font-bold">₹{item.basePrice}</td>
                          </tr>
                        ))}
                        {insights.items.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                              No master catalog items mapped to this category.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">Could not load insights.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete category
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#FF6B35] px-5 py-2 text-xs font-bold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export function CategoryMatrixGrid({
  categories,
  onChange,
  onPersistCategories,
}: {
  categories: HomeFeedMasterCategory[]
  onChange: (next: HomeFeedMasterCategory[]) => void
  onPersistCategories?: (next: HomeFeedMasterCategory[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = categories.find((c) => c.id === selectedId)

  const createCategory = () => {
    const next: HomeFeedMasterCategory = {
      id: newId('mc'),
      label: 'New Category',
      slug: `category-${categories.length + 1}`,
      image: '',
      tags: [],
      active: true,
      featured: false,
      section: 'groceryKitchen',
      subcategories: [],
      sortOrder: categories.length,
    }
    onChange([...categories, next])
    setSelectedId(next.id)
  }

  const updateCategory = (next: HomeFeedMasterCategory) => {
    onChange(categories.map((c) => (c.id === next.id ? next : c)))
  }

  const saveCategoryImage = async (next: HomeFeedMasterCategory) => {
    const updated = categories.map((c) => (c.id === next.id ? next : c))
    onChange(updated)
    await onPersistCategories?.(updated)
  }

  const deleteCategory = (id: string) => {
    onChange(
      categories
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, sortOrder: i })),
    )
    setSelectedId(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Click any tile to open the category drawer — metadata, nesting, and catalog insights.
        </p>
        <button
          type="button"
          onClick={createCategory}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C831F] px-4 py-2 text-xs font-black text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create New Master Category
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedId(cat.id)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border text-left transition hover:shadow-lg',
                cat.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50 opacity-60',
                cat.featured && 'ring-2 ring-[#FF6B35]/30',
              )}
            >
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {cat.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Package className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-gray-900">{cat.label}</p>
                  {!cat.active && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                      Off
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-gray-400">{cat.slug}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-[#FF6B35]">
                  {cat.section === 'groceryKitchen' ? 'Grocery' : 'Snacks'}
                  {cat.subcategories.length > 0 && ` · ${cat.subcategories.length} subs`}
                </p>
              </div>
            </button>
          ))}
      </div>

      {selected && (
        <CategoryDrawerPanel
          category={selected}
          onChange={updateCategory}
          onImageSaved={(next) => void saveCategoryImage(next)}
          onClose={() => setSelectedId(null)}
          onDelete={() => deleteCategory(selected.id)}
        />
      )}
    </>
  )
}

export { Field, Toggle }
