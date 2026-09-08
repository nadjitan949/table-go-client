import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../../api/axios"
import type { ApiResponse } from "../../interfaces/api.types"
import type { MenuItem } from "../../interfaces/menu.types"
import type { Table } from "../../interfaces/table.types"
import type { Order } from "../../interfaces/order.types"
import Button from "../../ui/Button"
import {
    FiTrash2,
    FiPlus,
    FiMinus,
    FiArrowLeft,
    FiShoppingBag,
    FiCheckCircle,
    FiCoffee,
    FiMapPin,
    FiCheck,
    FiX,
    FiClock,
} from "react-icons/fi"
import { MdRestaurant } from "react-icons/md"
import type { OrderAddon, OrderItems } from "../../interfaces/orderItems.types"

interface AddOnInfo {
    id: number
    name: string
    price: number
    image?: string | null
}

// Extension locale de Order : "locked" distingue le panier en cours de
// composition (tout éditable) de la commande envoyée en cuisine (chaque
// item a alors un vrai statut de suivi, et ne peut être annulé que si
// status === "pending")
type StoredOrder = Order & { locked?: boolean }

interface OrderGroup {
    key: string
    menuId: number
    note: string
    addons: OrderAddon[]
    quantity: number
    status: OrderItems["status"]
}

const ORDER_KEY = "Order"

const STATUS_STEPS: { value: OrderItems["status"]; label: string; note: string }[] = [
    { value: "pending", label: "En attente", note: "Votre commande a été transmise en cuisine." },
    { value: "is_cooking", label: "En préparation", note: "Un cuisinier prépare votre commande." },
    { value: "ready", label: "Prête", note: "Votre commande est prête, en attente qu'un serveur vienne la récupérer." },
    { value: "taked", label: "Récupérée", note: "Un serveur a récupéré votre commande, elle arrive à votre table !" },
    { value: "livred", label: "Livrée", note: "Votre commande a été livrée. Bon appétit !" },
]

function statusIndex(status: OrderItems["status"]): number {
    return STATUS_STEPS.findIndex((s) => s.value === status)
}

function readOrder(): StoredOrder | null {
    try {
        const raw = localStorage.getItem(ORDER_KEY)
        if (!raw) return null
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function writeOrder(order: StoredOrder) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order))
    window.dispatchEvent(new Event("orderUpdated"))
}

function addonSignature(addons: OrderAddon[] = []): string {
    return [...addons]
        .sort((a, b) => a.addonId - b.addonId)
        .map((a) => `${a.addonId}x${a.quantity}`)
        .join(",")
}

// Regroupe par plat + suppléments + statut : deux items identiques mais à
// des statuts différents (ex: un nouveau plat ajouté pendant qu'un autre
// est déjà en préparation) restent bien deux cartes distinctes
function groupItems(items: OrderItems[]): OrderGroup[] {
    const map = new Map<string, OrderGroup>()

    items.forEach((item) => {
        const addons = item.addon ?? []
        const key = `${item.menuId}::${item.status}::${addonSignature(addons)}`

        const existing = map.get(key)
        if (existing) {
            existing.quantity += 1
        } else {
            map.set(key, {
                key,
                menuId: item.menuId,
                note: item.note || "",
                addons,
                quantity: 1,
                status: item.status,
            })
        }
    })

    return Array.from(map.values())
}

function ungroupItems(groups: OrderGroup[]): OrderItems[] {
    const items: OrderItems[] = []
    groups.forEach((group) => {
        for (let i = 0; i < group.quantity; i++) {
            items.push({
                menuId: group.menuId,
                note: group.note,
                addon: group.addons,
                status: group.status,
            })
        }
    })
    return items
}

function formatPrice(value: number): string {
    return `${Math.round(value).toLocaleString("fr-FR")} FCFA`
}

function OrderPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()

    const [locked, setLocked] = useState(false)
    const [groups, setGroups] = useState<OrderGroup[]>([])
    const [menuLookup, setMenuLookup] = useState<Record<number, MenuItem>>({})
    const [table, setTable] = useState<Table | null>(null)
    const [loading, setLoading] = useState(true)
    const [removingKey, setRemovingKey] = useState<string | null>(null)
    const [validating, setValidating] = useState(false)
    const [cancelingKey, setCancelingKey] = useState<string | null>(null)
    const [showTracking, setShowTracking] = useState(false)
    const [trackingClosing, setTrackingClosing] = useState(false)

    useEffect(() => {
        async function fetchTable() {
            try {
                const res = await api.get<ApiResponse<Table>>(`/table/get-table/${token}`)
                setTable(res.data.data)
            } catch (error) {
                console.log(error)
            }
        }
        if (token) fetchTable()
    }, [token])

    useEffect(() => {
        async function load() {
            setLoading(true)
            const stored = readOrder()

            if (!stored || stored.order.length === 0) {
                setGroups([])
                setLoading(false)
                return
            }

            setLocked(Boolean(stored.locked))
            const builtGroups = groupItems(stored.order)
            setGroups(builtGroups)

            const uniqueMenuIds = Array.from(new Set(builtGroups.map((g) => g.menuId)))

            try {
                const results = await Promise.all(
                    uniqueMenuIds.map((id) =>
                        api.get<ApiResponse<MenuItem>>(`/menu/details/${id}`)
                    )
                )
                const lookup: Record<number, MenuItem> = {}
                results.forEach((res) => {
                    lookup[Number(res.data.data.id)] = res.data.data
                })
                setMenuLookup(lookup)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    function persistGroups(nextGroups: OrderGroup[], nextLocked: boolean = locked) {
        setGroups(nextGroups)
        writeOrder({
            tableToken: token ?? "",
            order: ungroupItems(nextGroups),
            locked: nextLocked,
        })
    }

    const resolveAddons = useCallback(
        (group: OrderGroup): AddOnInfo[] => {
            const menu = menuLookup[group.menuId]
            if (!menu?.AddOns) return []

            return group.addons
                .map((a) => {
                    const found = menu.AddOns?.find((ad) => Number(ad.id) === a.addonId)
                    if (!found) return null
                    return {
                        id: found.id,
                        name: found.name,
                        price: Number(found.price) * a.quantity,
                        image: found.image,
                    } as AddOnInfo
                })
                .filter((a): a is AddOnInfo => a !== null)
        },
        [menuLookup]
    )

    const groupUnitPrice = useCallback(
        (group: OrderGroup): number => {
            const menu = menuLookup[group.menuId]
            const basePrice = menu ? Number(menu.price) : 0
            const addonsCost = resolveAddons(group).reduce((sum, a) => sum + a.price, 0)
            return basePrice + addonsCost
        },
        [menuLookup, resolveAddons]
    )

    const total = useMemo(
        () => groups.reduce((sum, g) => sum + groupUnitPrice(g) * g.quantity, 0),
        [groups, groupUnitPrice]
    )

    function handleIncrease(key: string) {
        persistGroups(groups.map((g) => (g.key === key ? { ...g, quantity: g.quantity + 1 } : g)))
    }

    function handleDecrease(key: string) {
        const group = groups.find((g) => g.key === key)
        if (!group) return
        if (group.quantity <= 1) {
            handleRemove(key)
            return
        }
        persistGroups(groups.map((g) => (g.key === key ? { ...g, quantity: g.quantity - 1 } : g)))
    }

    function handleNoteChange(key: string, note: string) {
        setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, note } : g)))
    }

    function handleNoteBlur() {
        persistGroups(groups)
    }

    function handleRemove(key: string) {
        setRemovingKey(key)
        setTimeout(() => {
            persistGroups(groups.filter((g) => g.key !== key))
            setRemovingKey(null)
        }, 260)
    }

    function handleValidate() {
        setValidating(true)
        setTimeout(() => {
            persistGroups(groups, true)
            setLocked(true)
            setValidating(false)
        }, 400)
    }

    // Annulation d'une commande précise — seulement possible si elle est
    // encore "pending" (pas encore prise en cuisine)
    function handleCancelOrder(key: string) {
        setCancelingKey(key)
        setTimeout(() => {
            const next = groups.filter((g) => g.key !== key)
            persistGroups(next)
            setCancelingKey(null)
        }, 260)
    }

    function openTracking() {
        setShowTracking(true)
    }

    function closeTracking() {
        setTrackingClosing(true)
        setTimeout(() => {
            setShowTracking(false)
            setTrackingClosing(false)
        }, 260)
    }

    const isEmpty = !loading && groups.length === 0
    const trackedGroups = locked ? groups : []

    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans pb-32">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-90 transition-all"
                            aria-label="Retour"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                                Ma commande
                            </h1>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                                <FiMapPin className="w-3 h-3" />
                                Table n° {table?.number ?? "..."}
                            </span>
                        </div>
                    </div>

                    {locked && !isEmpty && (
                        <button
                            onClick={openTracking}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 active:scale-95 transition-all"
                        >
                            <FiClock className="w-3.5 h-3.5" />
                            Suivi
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-3">
                {loading && (
                    <>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-3xl border border-orange-100">
                                <div className="skeleton-block w-20 h-20 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="skeleton-block h-4 w-2/3" />
                                    <div className="skeleton-block h-3 w-1/3" />
                                    <div className="skeleton-block h-8 w-full rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {isEmpty && (
                    <div className="text-center py-24 animate-fade-up">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-400">
                            <FiShoppingBag className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Votre commande est vide pour le moment.
                        </p>
                        <Button
                            onClick={() => navigate(`/menu/${token}`)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all"
                        >
                            Voir le menu
                        </Button>
                    </div>
                )}

                {!loading &&
                    groups.map((group, index) => {
                        const menu = menuLookup[group.menuId]
                        const addons = resolveAddons(group)
                        const unitPrice = groupUnitPrice(group)
                        const isRemoving = removingKey === group.key || cancelingKey === group.key
                        const canCancel = locked && group.status === "pending"

                        return (
                            <article
                                key={group.key}
                                className={`flex gap-3 p-3 rounded-3xl border transition-all duration-300 ease-in-out ${locked ? "border-gray-100 bg-gray-50/60" : "border-orange-100 bg-white"
                                    } ${isRemoving
                                        ? "opacity-0 -translate-x-3 scale-[0.98]"
                                        : "opacity-100 translate-x-0 animate-fade-up"
                                    }`}
                                style={{ animationDelay: `${index * 0.06}s` }}
                            >
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-orange-50 shrink-0">
                                    {menu?.imageUrl ? (
                                        <img src={menu.imageUrl} alt={menu.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-orange-300">
                                            <MdRestaurant className="w-7 h-7" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                {menu?.name ?? "Plat"}
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {formatPrice(unitPrice)} / unité
                                            </span>
                                        </div>

                                        {!locked && (
                                            <button
                                                onClick={() => handleRemove(group.key)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all shrink-0"
                                                aria-label="Supprimer"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {addons.length > 0 && (
                                        <p className="text-[11px] text-orange-500/90 truncate">
                                            + {addons.map((a) => a.name).join(", ")}
                                        </p>
                                    )}

                                    {!locked ? (
                                        <textarea
                                            value={group.note}
                                            onChange={(e) => handleNoteChange(group.key, e.target.value)}
                                            onBlur={handleNoteBlur}
                                            placeholder="Ajouter une note..."
                                            rows={1}
                                            className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 resize-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition"
                                        />
                                    ) : (
                                        group.note && (
                                            <p className="text-xs text-gray-400 italic truncate">"{group.note}"</p>
                                        )
                                    )}

                                    <div className="flex items-center justify-between pt-0.5">
                                        {!locked ? (
                                            <div className="flex items-center gap-1.5 bg-gray-50 rounded-full p-1 border border-gray-100">
                                                <button
                                                    onClick={() => handleDecrease(group.key)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 active:scale-90 transition-all"
                                                    aria-label="Diminuer"
                                                >
                                                    <FiMinus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                                    {group.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleIncrease(group.key)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 active:scale-90 transition-all"
                                                    aria-label="Augmenter"
                                                >
                                                    <FiPlus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-500">× {group.quantity}</span>
                                        )}

                                        <span key={group.quantity} className="text-sm font-bold text-orange-600 tabular-nums animate-price-rise">
                                            {formatPrice(unitPrice * group.quantity)}
                                        </span>
                                    </div>

                                    {locked && (
                                        <div className="flex items-center justify-between pt-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                                                {STATUS_STEPS[statusIndex(group.status)]?.label}
                                            </span>

                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancelOrder(group.key)}
                                                    className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 active:scale-95 transition-all"
                                                >
                                                    <FiX className="w-3.5 h-3.5" />
                                                    Annuler
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </article>
                        )
                    })}
            </main>

            {!isEmpty && !loading && !locked && (
                <div className="fixed bottom-0 left-0 right-0 z-30 animate-fade-up">
                    <div className="bg-white border-t border-orange-100 px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Total
                                </span>
                                <div key={total} className="flex items-baseline gap-1 animate-price-rise">
                                    <span className="text-xl font-extrabold text-gray-900 tabular-nums">
                                        {total.toLocaleString("fr-FR")}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400">FCFA</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleValidate}
                                disabled={validating}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-full transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {validating ? (
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <FiCheckCircle className="w-4.5 h-4.5" />
                                )}
                                Valider
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de suivi des commandes */}
            {(showTracking || trackingClosing) && (
                <div
                    className={`fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-modal-fade-in ${trackingClosing ? "animate-modal-fade-out" : ""
                        }`}
                >
                    <div
                        className={`w-full sm:max-w-md bg-white scrollbar-hidden rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto animate-modal-pop-in ${trackingClosing ? "animate-modal-pop-out" : ""
                            }`}
                    >
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Suivi de vos commandes</h2>
                            <button
                                onClick={closeTracking}
                                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:scale-90 transition-all"
                                aria-label="Fermer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {trackedGroups.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-6">
                                    Aucune commande à suivre pour le moment.
                                </p>
                            )}

                            {trackedGroups.map((group) => {
                                const menu = menuLookup[group.menuId]
                                const currentIndex = statusIndex(group.status)

                                return (
                                    <div key={group.key}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 shrink-0">
                                                {menu?.imageUrl ? (
                                                    <img src={menu.imageUrl} alt={menu.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-orange-300">
                                                        <FiCoffee className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {menu?.name ?? "Plat"}
                                                </p>
                                                <p className="text-xs text-gray-400">× {group.quantity}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-0">
                                            {STATUS_STEPS.map((step, i) => {
                                                const isDone = i < currentIndex
                                                const isCurrent = i === currentIndex
                                                const isLast = i === STATUS_STEPS.length - 1

                                                return (
                                                    <div key={step.value} className="flex gap-3">
                                                        <div className="flex flex-col items-center">
                                                            <div
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isDone
                                                                    ? "bg-orange-500 text-white"
                                                                    : isCurrent
                                                                        ? "bg-orange-500 text-white ring-4 ring-orange-100"
                                                                        : "bg-gray-100 text-gray-300"
                                                                    }`}
                                                            >
                                                                {isDone ? (
                                                                    <FiCheck className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                                )}
                                                            </div>
                                                            {!isLast && (
                                                                <div
                                                                    className={`w-0.5 flex-1 min-h-6 transition-colors duration-300 ${isDone ? "bg-orange-400" : "bg-gray-100"
                                                                        }`}
                                                                />
                                                            )}
                                                        </div>

                                                        <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                                                            <p
                                                                className={`text-sm font-semibold ${isDone || isCurrent ? "text-gray-900" : "text-gray-300"
                                                                    }`}
                                                            >
                                                                {step.label}
                                                            </p>
                                                            {isCurrent && (
                                                                <p className="text-xs text-orange-600 mt-1 animate-fade-up max-w-60">
                                                                    {step.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OrderPage