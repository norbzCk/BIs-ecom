import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'
import { apiRequest, ApiError } from '../../lib/api-client'

interface Category {
  id: string
  name: string
}

interface ImageRow {
  url: string
  isPrimary: boolean
}

interface SpecRow {
  name: string
  value: string
}

const STATUS_OPTIONS = ['ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'] as const

export function AdminProductEditorPage() {
  const { token } = useAdminAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('ACTIVE')
  const [quantity, setQuantity] = useState('0')
  const [images, setImages] = useState<ImageRow[]>([{ url: '', isPrimary: true }])
  const [specs, setSpecs] = useState<SpecRow[]>([{ name: '', value: '' }])

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiRequest<Category[]>('/categories')
      .then((cats) => {
        setCategories(cats)
        setCategoriesLoaded(true)
        if (cats[0]) setCategoryId(cats[0].id)
        // A product can't be saved without a category, so on a fresh catalog
        // open the creator straight away instead of leaving an empty dropdown.
        else setShowNewCategory(true)
      })
      .catch(() => setError('Could not load categories'))
  }, [])

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      setCategoryError('Enter a category name')
      return
    }

    setCreatingCategory(true)
    setCategoryError(null)
    try {
      const created = await apiRequest<Category>('/admin/categories', {
        method: 'POST',
        token,
        body: { name },
      })
      setCategories((cats) => [...cats, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(created.id)
      setNewCategoryName('')
      setShowNewCategory(false)
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : 'Could not create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const updateImage = (index: number, patch: Partial<ImageRow>) => {
    setImages((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const updateSpec = (index: number, patch: Partial<SpecRow>) => {
    setSpecs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanImages = images
      .filter((row) => row.url.trim())
      .map((row) => ({ url: row.url.trim(), isPrimary: row.isPrimary }))
    const cleanSpecs = specs
      .filter((row) => row.name.trim() && row.value.trim())
      .map((row) => ({ name: row.name.trim(), value: row.value.trim() }))

    if (cleanImages.length === 0) {
      setError('At least one product image URL is required')
      return
    }
    if (!categoryId) {
      setError('Select a category')
      return
    }

    setSubmitting(true)
    try {
      await apiRequest('/admin/products', {
        method: 'POST',
        token,
        body: {
          name,
          sku,
          slug: slug.trim() || undefined,
          categoryId,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          price: Number(price),
          description: description.trim() || undefined,
          status,
          images: cleanImages,
          specifications: cleanSpecs,
          inventory: { quantity: Number(quantity) },
        },
      })
      navigate('/admin/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-ink">Add New Product</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Every field marked required must be filled in before this product can be saved.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 rounded-xl border border-line-faint bg-surface p-5 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-subtle sm:col-span-2">
            Product Name *
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="Billionare Apex-15 Pro"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            SKU *
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="NB-APEX15-PRO"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Slug (optional — auto-generated from name if left blank)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="billionare-apex-15-pro"
            />
          </label>

          <div className="text-xs font-medium text-ink-subtle">
            <label className="block">
              Category *
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {!categoriesLoaded && <option value="">Loading categories…</option>}
                {categoriesLoaded && categories.length === 0 && (
                  <option value="">No categories yet — create one below</option>
                )}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            {showNewCategory ? (
              <div className="mt-2 rounded-lg border border-line-faint bg-canvas p-2">
                <div className="flex gap-2">
                  <input
                    aria-label="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      // This sits inside the product <form>; Enter must add the
                      // category, not submit the whole product.
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleCreateCategory()
                      }
                    }}
                    placeholder="e.g. Mechanical Keyboards"
                    className="w-full rounded-lg border border-line-faint bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateCategory()}
                    disabled={creatingCategory}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {creatingCategory ? 'Adding…' : 'Add'}
                  </button>
                  {categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false)
                        setCategoryError(null)
                      }}
                      className="shrink-0 text-xs font-semibold text-ink-subtle hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {categoryError && <p className="mt-1.5 text-xs text-red-400">{categoryError}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="mt-1.5 text-xs font-semibold text-brand-600 hover:underline"
              >
                + New category
              </button>
            )}
          </div>

          <label className="block text-xs font-medium text-ink-subtle">
            Price (TSh) *
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="1699.00"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Brand
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="Billionare"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              placeholder="Apex-15 Pro"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Starting Stock Quantity *
            <input
              required
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle sm:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
        </div>

        {/* Images */}
        <div className="rounded-xl border border-line-faint bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Product Images *</h2>
            <button
              type="button"
              onClick={() => setImages((rows) => [...rows, { url: '', isPrimary: false }])}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              + Add image
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-subtle">
            At least one image URL is required. Mark one as primary — it's used as the catalog thumbnail.
          </p>
          <div className="mt-3 space-y-2">
            {images.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row.url}
                  onChange={(e) => updateImage(i, { url: e.target.value })}
                  placeholder="https://example.com/product.jpg"
                  className="flex-1 rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={row.isPrimary}
                    onChange={() =>
                      setImages((rows) => rows.map((r, j) => ({ ...r, isPrimary: j === i })))
                    }
                    className="accent-brand-600"
                  />
                  Primary
                </label>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setImages((rows) => {
                        const remaining = rows.filter((_, j) => j !== i)
                        // If the primary image was removed, promote the first remaining one
                        // so the form never ends up with no primary selected.
                        return remaining.some((r) => r.isPrimary)
                          ? remaining
                          : remaining.map((r, j) => ({ ...r, isPrimary: j === 0 }))
                      })
                    }
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Specifications */}
        <div className="rounded-xl border border-line-faint bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Technical Specifications</h2>
            <button
              type="button"
              onClick={() => setSpecs((rows) => [...rows, { name: '', value: '' }])}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              + Add spec
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {specs.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row.name}
                  onChange={(e) => updateSpec(i, { name: e.target.value })}
                  placeholder="e.g. Processor & Architecture"
                  className="w-56 rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <input
                  value={row.value}
                  onChange={(e) => updateSpec(i, { value: e.target.value })}
                  placeholder="e.g. Intel Core i9-13900H"
                  className="flex-1 rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                {specs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSpecs((rows) => rows.filter((_, j) => j !== i))}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="rounded-lg border border-line-faint px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
