import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from '../../lib/admin-auth-context'
import { apiRequest, apiUpload, ApiError } from '../../lib/api-client'

interface Category {
  id: string
  name: string
}

interface ImageRow {
  url: string
  isPrimary: boolean
  /** True while the file is being sent to Supabase Storage. */
  uploading?: boolean
}

interface SpecRow {
  name: string
  value: string
}

interface ReviewRow {
  author: string
  role: string
  rating: string
  quote: string
}

interface AdminProduct {
  id: string
  name: string
  sku: string
  slug: string
  brand: string | null
  model: string | null
  description: string | null
  price: number
  compareAtPrice: number | null
  rating: number | null
  reviewCount: number
  badge: string | null
  featured: boolean
  releasedAt: string | null
  highlights: string[]
  status: string
  category: { id: string; name: string }
  images: { url: string; isPrimary: boolean }[]
  specifications: { name: string; value: string }[]
  reviews: { id: string; author: string; role: string | null; rating: number; quote: string }[]
  inventory: { quantity: number }
}

const STATUS_OPTIONS = ['ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'] as const

/** Mirrors the API limit so the browser rejects an oversized file immediately. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

/** "2026-04-18" for a date input, or '' when unset/invalid. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const field =
  'mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500'

export function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { token } = useAdminAuth()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [loading, setLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('ACTIVE')
  const [quantity, setQuantity] = useState('0')
  const [badge, setBadge] = useState('')
  const [rating, setRating] = useState('')
  const [featured, setFeatured] = useState(false)
  const [releasedAt, setReleasedAt] = useState('')
  const [highlights, setHighlights] = useState<string[]>([''])
  const [images, setImages] = useState<ImageRow[]>([])
  const [specs, setSpecs] = useState<SpecRow[]>([{ name: '', value: '' }])
  const [reviews, setReviews] = useState<ReviewRow[]>([])

  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // URLs stored by this session that no product has claimed yet. Dropping one
  // of these rows has to delete the object, otherwise abandoning the editor
  // leaves orphans in the bucket.
  const pendingUploads = useRef(new Set<string>())

  useEffect(() => {
    apiRequest<Category[]>('/categories')
      .then((cats) => {
        setCategories(cats)
        setCategoriesLoaded(true)
        if (cats[0]) setCategoryId((current) => current || cats[0].id)
        // A product can't be saved without a category, so on a fresh catalog
        // open the creator straight away instead of leaving an empty dropdown.
        else if (!isEdit) setShowNewCategory(true)
      })
      .catch(() => setError('Could not load categories'))
  }, [isEdit])

  useEffect(() => {
    if (!id) {
      setImages([{ url: '', isPrimary: true }])
      return
    }

    // Guard against a stale response: switching ids quickly, or a StrictMode
    // double-mount in development, can leave two loads in flight and the
    // slower one would otherwise overwrite edits made after the first landed.
    let cancelled = false
    setLoading(true)
    apiRequest<AdminProduct>(`/admin/products/${id}`, { token })
      .then((product) => {
        if (cancelled) return
        setName(product.name)
        setSku(product.sku)
        setSlug(product.slug)
        setCategoryId(product.category.id)
        setBrand(product.brand ?? '')
        setModel(product.model ?? '')
        setPrice(String(product.price))
        setCompareAtPrice(product.compareAtPrice === null ? '' : String(product.compareAtPrice))
        setDescription(product.description ?? '')
        setStatus(product.status as (typeof STATUS_OPTIONS)[number])
        setQuantity(String(product.inventory.quantity))
        setBadge(product.badge ?? '')
        setRating(product.rating === null ? '' : String(product.rating))
        setFeatured(product.featured)
        setReleasedAt(toDateInput(product.releasedAt))
        setHighlights(product.highlights.length ? product.highlights : [''])
        setImages(
          product.images.length
            ? product.images.map((img) => ({ url: img.url, isPrimary: img.isPrimary }))
            : [{ url: '', isPrimary: true }],
        )
        setSpecs(
          product.specifications.length
            ? product.specifications.map((s) => ({ name: s.name, value: s.value }))
            : [{ name: '', value: '' }],
        )
        setReviews(
          product.reviews.map((r) => ({
            author: r.author,
            role: r.role ?? '',
            rating: String(r.rating),
            quote: r.quote,
          })),
        )
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load product')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, token])

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

  /**
   * Uploads the files an admin picked from their own machine, then appends the
   * returned URLs. The first image becomes primary automatically so a fresh
   * product is always valid.
   */
  /**
   * Best-effort reclaim of stored objects. A failure here only means an
   * orphaned file, so it must never block the admin or surface as a form error.
   */
  const deleteImages = async (urls: string[]) => {
    if (urls.length === 0) return
    try {
      await apiRequest('/admin/uploads/images', { method: 'DELETE', token, body: { urls } })
    } catch {
      // Leave the object behind; the bucket is the admin's to prune.
    }
  }

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return

    setImageError(null)

    const tooBig = picked.find((f) => f.size > MAX_IMAGE_BYTES)
    if (tooBig) {
      setImageError(`${tooBig.name} is larger than 5 MB`)
      return
    }
    const badType = picked.find((f) => !ACCEPTED_TYPES.includes(f.type))
    if (badType) {
      setImageError(`${badType.name} is not a supported image (JPEG, PNG, WebP, AVIF or GIF)`)
      return
    }
    if (picked.length > 10) {
      setImageError('Upload at most 10 images at a time')
      return
    }

    const placeholders: ImageRow[] = picked.map(() => ({ url: '', isPrimary: false, uploading: true }))

    setUploading(true)
    setImages((rows) => {
      const existing = rows.filter((row) => row.url)
      const base = existing.length ? existing : [{ url: '', isPrimary: true }]
      return [...base, ...placeholders]
    })

    try {
      const result = await apiUpload<{ images: { url: string }[] }>(
        '/admin/uploads/images',
        picked,
        token,
      )
      setImages((rows) => {
        // Placeholders are consumed, not kept as blank rows: they only existed
        // to reserve space while the request was in flight.
        const settled = rows.filter((row) => !row.uploading)
        const filled: ImageRow[] = result.images.map((img) => ({
          url: img.url,
          isPrimary: false,
        }))
        for (const img of result.images) pendingUploads.current.add(img.url)
        return [...settled, ...filled]
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Upload failed'
      setImageError(message)
      // Drop the placeholders so the form doesn't keep phantom rows.
      setImages((rows) => rows.filter((row) => !row.uploading))
      // A batch that failed halfway can still have stored some files; reclaim
      // them so a retry doesn't leak objects into the bucket.
      const orphans = [...pendingUploads.current]
      pendingUploads.current.clear()
      if (orphans.length) void deleteImages(orphans)
    } finally {
      setUploading(false)
    }
  }

  const updateImage = (index: number, patch: Partial<ImageRow>) => {
    setImages((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeImage = (index: number) => {
    setImages((rows) => {
      const target = rows[index]
      // Images already attached to a saved product are cleaned up by the
      // backend when the replacement array is sent, so only reclaim uploads
      // that nothing has ever referenced.
      if (target?.url && pendingUploads.current.delete(target.url)) {
        void deleteImages([target.url])
      }
      const remaining = rows.filter((_, i) => i !== index)
      const real = remaining.filter((r) => r.url)
      if (real.length === 0) return [{ url: '', isPrimary: true }]
      return real.some((r) => r.isPrimary)
        ? real
        : real.map((r, i) => ({ ...r, isPrimary: i === 0 }))
    })
  }

  const updateSpec = (index: number, patch: Partial<SpecRow>) => {
    setSpecs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const updateReview = (index: number, patch: Partial<ReviewRow>) => {
    setReviews((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const updateHighlight = (index: number, value: string) => {
    setHighlights((rows) => rows.map((row, i) => (i === index ? value : row)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanImages = images
      .filter((row) => row.url.trim())
      .map((row, i) => ({ url: row.url.trim(), isPrimary: row.isPrimary || i === 0 }))
    const cleanSpecs = specs
      .filter((row) => row.name.trim() && row.value.trim())
      .map((row) => ({ name: row.name.trim(), value: row.value.trim() }))
    const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean)
    const cleanReviews = reviews
      .filter((row) => row.author.trim() && row.quote.trim() && Number(row.rating) > 0)
      .map((row) => ({
        author: row.author.trim(),
        role: row.role.trim() || undefined,
        rating: Number(row.rating),
        quote: row.quote.trim(),
      }))

    if (cleanImages.length === 0) {
      setError('Upload at least one product image')
      return
    }
    if (!categoryId) {
      setError('Select a category')
      return
    }
    if (compareAtPrice && Number(compareAtPrice) <= Number(price)) {
      setError('Compare-at price must be higher than the selling price')
      return
    }

    const body = {
      name,
      sku,
      slug: slug.trim() || undefined,
      categoryId,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      price: Number(price),
      // Sent as null so an admin can clear a stale compare-at price.
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      description: description.trim() || undefined,
      status,
      badge: badge.trim() || null,
      rating: rating ? Number(rating) : null,
      featured,
      releasedAt: releasedAt ? new Date(`${releasedAt}T00:00:00Z`).toISOString() : null,
      highlights: cleanHighlights,
      images: cleanImages,
      specifications: cleanSpecs,
      reviews: cleanReviews,
      reviewCount: cleanReviews.length,
      inventory: { quantity: Number(quantity) },
    }

    setSubmitting(true)
    try {
      if (id) {
        await apiRequest(`/admin/products/${id}`, { method: 'PATCH', token, body })
      } else {
        await apiRequest('/admin/products', { method: 'POST', token, body })
      }
      // Everything stored from here on belongs to the product, so a later
      // removal is the backend's to clean up.
      pendingUploads.current.clear()
      navigate('/admin/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-ink-subtle">Loading product…</p>
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-ink">
        {isEdit ? 'Edit Product' : 'Add New Product'}
      </h1>
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
              className={field}
              placeholder="Billionare Apex-15 Pro"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            SKU *
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={field}
              placeholder="NB-APEX15-PRO"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Slug (optional — auto-generated from name if left blank)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={field}
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
                className={field}
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
              className={field}
              placeholder="1699.00"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Compare-at price (TSh — optional)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              className={field}
              placeholder="2099.00"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Brand
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={field}
              placeholder="Billionare"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={field}
              placeholder="Apex-15 Pro"
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={field}
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
              className={field}
            />
          </label>

          <label className="block text-xs font-medium text-ink-subtle sm:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={field}
            />
          </label>
        </div>

        {/* Merchandising */}
        <div className="rounded-xl border border-line-faint bg-surface p-5">
          <h2 className="text-sm font-bold text-ink">Merchandising</h2>
          <p className="mt-1 text-xs text-ink-subtle">
            Controls how the product appears in the storefront, its ranking and the discount badge.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-ink-subtle">
              Badge
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className={field}
                placeholder="New arrival, Staff pick…"
              />
            </label>

            <label className="block text-xs font-medium text-ink-subtle">
              Rating (0–5)
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className={field}
                placeholder="4.8"
              />
            </label>

            <label className="block text-xs font-medium text-ink-subtle">
              Released on
              <input
                type="date"
                value={releasedAt}
                onChange={(e) => setReleasedAt(e.target.value)}
                className={field}
              />
            </label>

            <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-ink-subtle">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-brand-600"
              />
              Feature on the home page
            </label>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-ink">Highlights</h3>
              <button
                type="button"
                onClick={() => setHighlights((rows) => [...rows, ''])}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                + Add highlight
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {highlights.map((highlight, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={highlight}
                    onChange={(e) => updateHighlight(i, e.target.value)}
                    placeholder="What makes this worth buying"
                    className={`${field} flex-1`}
                  />
                  {highlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setHighlights((rows) => rows.filter((_, j) => j !== i))
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
        </div>

        {/* Images */}
        <div className="rounded-xl border border-line-faint bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Product Images *</h2>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Choose files'}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            onChange={(e) => void handleFiles(e)}
            className="hidden"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Pick images from your computer. JPEG, PNG, WebP, AVIF or GIF, up to 5 MB each. The
            primary image is the catalog thumbnail.
          </p>

          {imageError && <p className="mt-2 text-xs text-red-400">{imageError}</p>}

          <div className="mt-3 space-y-2">
            {images.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                {row.uploading ? (
                  <span className="flex-1 rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm text-ink-subtle">
                    Uploading…
                  </span>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    {row.url && (
                      <img
                        src={row.url}
                        alt=""
                        className="size-10 shrink-0 rounded-md border border-line-faint object-cover"
                      />
                    )}
                    <input
                      value={row.url}
                      onChange={(e) => updateImage(i, { url: e.target.value })}
                      placeholder="Upload a file or paste an image URL"
                      className="flex-1 rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                )}
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
                {images.filter((r) => r.url || r.uploading).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
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

        {/* Reviews */}
        <div className="rounded-xl border border-line-faint bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Reviews</h2>
            <button
              type="button"
              onClick={() =>
                setReviews((rows) => [...rows, { author: '', role: '', rating: '5', quote: '' }])
              }
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              + Add review
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-subtle">
            Reviews are replaced wholesale on save, so edit the wording here rather than expecting
            it to merge.
          </p>

          {reviews.length === 0 ? (
            <p className="mt-3 text-xs text-ink-subtle">No reviews yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.map((row, i) => (
                <div key={i} className="rounded-lg border border-line-faint bg-canvas p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.author}
                      onChange={(e) => updateReview(i, { author: e.target.value })}
                      placeholder="Reviewer name"
                      className="w-48 rounded-lg border border-line-faint bg-canvas-raised px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                    />
                    <input
                      value={row.role}
                      onChange={(e) => updateReview(i, { role: e.target.value })}
                      placeholder="Role (optional)"
                      className="w-40 rounded-lg border border-line-faint bg-canvas-raised px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
                      Rating
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        value={row.rating}
                        onChange={(e) => updateReview(i, { rating: e.target.value })}
                        className="w-16 rounded-lg border border-line-faint bg-canvas-raised px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setReviews((rows) => rows.filter((_, j) => j !== i))}
                      className="ml-auto text-xs font-semibold text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={row.quote}
                    onChange={(e) => updateReview(i, { quote: e.target.value })}
                    rows={2}
                    placeholder="What they said"
                    className="mt-2 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>
          )}
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
            disabled={submitting || uploading}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
