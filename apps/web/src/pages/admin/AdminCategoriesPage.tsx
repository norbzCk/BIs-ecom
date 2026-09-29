import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/icons'
import { useAdminAuth } from '../../lib/admin-auth-context'
import { ApiError, apiRequest } from '../../lib/api-client'
import { Stagger, StaggerItem } from '../../lib/motion/reveal'
import { useToast } from '../../lib/motion/toast'

interface Category {
  id: string
  name: string
  description: string | null
  productCount: number
}

type Draft = { name: string; description: string }

/** Editing rows are kept in one map so several can be open at once. */
type EditState = Record<string, Draft>

export function AdminCategoriesPage() {
  const { token } = useAdminAuth()
  const { push } = useToast()

  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [newDraft, setNewDraft] = useState<Draft>({ name: '', description: '' })
  const [edits, setEdits] = useState<EditState>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Reading categories is public; the token is only needed for writes.
    apiRequest<Category[]>('/categories', { token })
      .then((res) => {
        if (cancelled) return
        setItems(res ?? [])
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError ? err.message : 'Could not reach the catalog API',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, reloadKey])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  const report = useCallback(
    (err: unknown, fallback: string) => {
      push({
        tone: 'error',
        title: fallback,
        description: err instanceof ApiError ? err.message : 'Unexpected error',
      })
    },
    [push],
  )

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newDraft.name.trim()
    if (!name) {
      push({ tone: 'error', title: 'A category needs a name' })
      return
    }

    setCreating(true)
    try {
      await apiRequest('/admin/categories', {
        method: 'POST',
        token,
        body: {
          name,
          description: newDraft.description.trim() || undefined,
        },
      })
      setNewDraft({ name: '', description: '' })
      refresh()
      push({ tone: 'success', title: `"${name}" created` })
    } catch (err) {
      report(err, 'Could not create the category')
    } finally {
      setCreating(false)
    }
  }

  const save = async (id: string) => {
    const draft = edits[id]
    if (!draft) return
    if (!draft.name.trim()) {
      push({ tone: 'error', title: 'A category needs a name' })
      return
    }

    setBusyId(id)
    try {
      await apiRequest(`/admin/categories/${id}`, {
        method: 'PATCH',
        token,
        body: {
          name: draft.name.trim(),
          description: draft.description.trim() || '',
        },
      })
      setEdits((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      refresh()
      push({ tone: 'success', title: 'Category updated' })
    } catch (err) {
      report(err, 'Could not save the category')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (category: Category) => {
    if (category.productCount > 0) {
      push({
        tone: 'error',
        title: 'Category is in use',
        description: `${category.productCount} product(s) still reference it. Move them first.`,
      })
      return
    }
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return

    setBusyId(category.id)
    try {
      await apiRequest(`/admin/categories/${category.id}`, { method: 'DELETE', token })
      refresh()
      push({ tone: 'success', title: `"${category.name}" deleted` })
    } catch (err) {
      report(err, 'Could not delete the category')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Categories</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Categories drive the storefront navigation and filters. Names must be unique.
          </p>
        </div>
        <Link
          to="/admin/products"
          className="rounded-lg border border-line-faint px-4 py-2 text-sm font-semibold text-body hover:bg-canvas"
        >
          Back to products
        </Link>
      </div>

      {/* New category ------------------------------------------------- */}
      <form
        onSubmit={create}
        className="mt-6 rounded-xl border border-line-faint bg-surface p-5"
      >
        <h2 className="text-sm font-semibold text-ink">Add a category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-start">
          <div>
            <label htmlFor="cat-name" className="text-xs font-semibold text-ink-faint">
              Name
            </label>
            <input
              id="cat-name"
              value={newDraft.name}
              onChange={(e) =>
                setNewDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Docks & cables"
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="cat-desc" className="text-xs font-semibold text-ink-faint">
              Description
            </label>
            <input
              id="cat-desc"
              value={newDraft.description}
              onChange={(e) =>
                setNewDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Shown under the category heading on the storefront"
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-onbrand hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : '+ Add category'}
          </button>
        </div>
      </form>

      {loadError && (
        <p className="mt-4 rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">{loadError}</p>
      )}

      {/* List --------------------------------------------------------- */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-line-faint bg-canvas"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line-faint px-4 py-10 text-center text-sm text-ink-muted">
          No categories yet. Create the first one above.
        </p>
      ) : (
        <Stagger className="mt-6 space-y-2" stagger={0.05}>
          {items.map((category) => {
            const editing = Boolean(edits[category.id])
            const draft = edits[category.id]

            return (
              <StaggerItem key={category.id}>
                <div className="rounded-xl border border-line-faint bg-surface">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{category.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-subtle">
                        {category.description || 'No description'}
                      </p>
                    </div>

                    <span className="rounded-full bg-surface-inset px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                      {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setEdits((prev) =>
                            prev[category.id]
                              ? (() => {
                                  const next = { ...prev }
                                  delete next[category.id]
                                  return next
                                })()
                              : {
                                  ...prev,
                                  [category.id]: {
                                    name: category.name,
                                    description: category.description ?? '',
                                  },
                                },
                          )
                        }
                        className="rounded-lg p-2 text-ink-subtle hover:bg-surface-inset hover:text-ink"
                        aria-label={`Edit ${category.name}`}
                      >
                        {editing ? <Icon.X className="size-4" /> : <Icon.Edit className="size-4" />}
                      </button>
                      <button
                        onClick={() => remove(category)}
                        disabled={busyId === category.id}
                        className="rounded-lg p-2 text-ink-muted hover:bg-red-500/12 hover:text-red-400 disabled:opacity-40"
                        aria-label={`Delete ${category.name}`}
                        title={
                          category.productCount > 0
                            ? 'Move its products to another category first'
                            : 'Delete'
                        }
                      >
                        <Icon.Trash className="size-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {editing && draft && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden border-t border-line-faint"
                      >
                        <div className="space-y-3 p-4">
                          <div>
                            <label
                              htmlFor={`edit-name-${category.id}`}
                              className="text-xs font-semibold text-ink-faint"
                            >
                              Name
                            </label>
                            <input
                              id={`edit-name-${category.id}`}
                              value={draft.name}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [category.id]: { ...draft, name: e.target.value },
                                }))
                              }
                              maxLength={100}
                              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`edit-desc-${category.id}`}
                              className="text-xs font-semibold text-ink-faint"
                            >
                              Description
                            </label>
                            <input
                              id={`edit-desc-${category.id}`}
                              value={draft.description}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [category.id]: { ...draft, description: e.target.value },
                                }))
                              }
                              maxLength={500}
                              className="mt-1 w-full rounded-lg border border-line-faint bg-canvas-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => save(category.id)}
                              disabled={busyId === category.id}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-ink-onbrand hover:bg-brand-700 disabled:opacity-50"
                            >
                              {busyId === category.id ? 'Saving…' : 'Save changes'}
                            </button>
                            <button
                              onClick={() =>
                                setEdits((prev) => {
                                  const next = { ...prev }
                                  delete next[category.id]
                                  return next
                                })
                              }
                              className="rounded-lg border border-line-faint px-3 py-1.5 text-xs font-semibold text-ink-faint hover:bg-canvas"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </div>
  )
}
