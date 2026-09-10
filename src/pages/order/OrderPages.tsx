import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../../api/axios"
import type { ApiResponse } from "../../interfaces/api.types"
import type { MenuItem } from "../../interfaces/menu.types"
import type { Table } from "../../interfaces/table.types"
import type { OrderAddon, OrderItems } from "../../interfaces/orderItems.types"
import { readOrderById, readOrders, writeOrderById } from "../../utils/ordersStorage"
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

interface AddOnInfo {
    id: number
    name: string
    price: number
    image?: string | null
}

interface OrderGroup {
    key: string
    menuId: number
    note: string
    addons: OrderAddon[]
    quantity: number
    status: OrderItems["status"]
    itemNumber: number
    locked: boolean
}

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

function getOrdinalLabel(num: number): string {
    if (num === 1) return "1er"
    return `${num}ème`
}

// Mettre les plats validés en bas, les nouveaux en haut
function sortGroups(items: OrderGroup[]): OrderGroup[] {
    return [...items].sort((a, b) => {
        if (a.locked === b.locked) return 0
        return a.locked ? 1 : -1
    })
}

function groupItems(items: OrderItems[], locked: boolean): OrderGroup[] {
    const counts = new Map<number, number>()

    const formatted = items.map((item, idx) => {
        const addons = item.addon ?? []
        const currentCount = (counts.get(item.menuId) || 0) + 1
        counts.set(item.menuId, currentCount)

        return {
            key: `item-${item.menuId}-${idx}-${Date.now()}-${Math.random()}`,
            menuId: item.menuId,
            note: item.note || "",
            addons,
            quantity: 1,
            status: item.status,
            itemNumber: currentCount,
            locked,
        }
    })

    return sortGroups(formatted)
}

function refreshOrdinalNumbers(groups: OrderGroup[]): OrderGroup[] {
    const sorted = sortGroups(groups)
    const counts = new Map<number, number>()
    return sorted.map((g) => {
        const count = (counts.get(g.menuId) || 0) + 1
        counts.set(g.menuId, count)
        return { ...g, itemNumber: count }
    })
}

function ungroupItems(groups: OrderGroup[]): OrderItems[] {
    return groups.map((group) => ({
        menuId: group.menuId,
        note: group.note,
        addon: group.addons,
        status: group.status,
    }))
}

function formatPrice(value: number): string {
    return `${Math.round(value).toLocaleString("fr-FR")} FCFA`
}

function OrderPage() {
    const { token, orderId } = useParams<{ token: string; orderId: string }>()
    const navigate = useNavigate()

    const [groups, setGroups] = useState<OrderGroup[]>([])
    const [isLocked, setIsLocked] = useState(false)
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
            const stored = readOrderById(orderId)

            if (!stored || stored.order.length === 0) {
                setGroups([])
                setIsLocked(false)
                setLoading(false)
                return
            }

            const builtGroups = groupItems(stored.order, Boolean(stored.locked))
            setIsLocked(Boolean(stored.locked))
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
    }, [orderId])

    function persistGroups(nextGroups: OrderGroup[], lockedOverride?: boolean) {
        const updated = refreshOrdinalNumbers(nextGroups)
        setGroups(updated)
        const current = readOrderById(orderId)
        if (!current) return
        writeOrderById({
            ...current,
            tableToken: token ?? current.tableToken,
            locked: lockedOverride ?? isLocked,
            order: ungroupItems(updated),
        })
    }

    const orderNumber = useMemo(() => {
        if (!orderId) return 0
        const orders = readOrders()
        const idx = orders.findIndex((o) => o.id === orderId)
        return idx >= 0 ? idx + 1 : 0
    }, [orderId])

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
        () => groups.reduce((sum, g) => sum + groupUnitPrice(g), 0),
        [groups, groupUnitPrice]
    )

    const menuCounts = useMemo(() => {
        const map = new Map<number, number>()
        groups.forEach((g) => {
            map.set(g.menuId, (map.get(g.menuId) || 0) + 1)
        })
        return map
    }, [groups])

    const hasLockedItems = isLocked && groups.length > 0
    const hasUnlockedItems = !isLocked && groups.length > 0

    function handleIncrease(key: string) {
        const target = groups.find((g) => g.key === key)
        if (!target) return

        const newItem: OrderGroup = {
            ...target,
            key: `item-${target.menuId}-${Date.now()}-${Math.random()}`,
            status: "pending",
            locked: false,
        }

        persistGroups([newItem, ...groups])
    }

    function handleDecrease(key: string) {
        handleRemove(key)
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
            const validated = groups.map((g) => ({ ...g, locked: true }))
            setIsLocked(true)
            persistGroups(validated, true)
            setValidating(false)
        }, 400)
    }

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
    const trackedGroups = groups.filter((g) => g.locked)

    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans pb-32">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/orders/${token}`)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-90 transition-all"
                            aria-label="Retour à mes commandes"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                                {orderNumber > 0 ? `Commande n° ${orderNumber}` : "Ma commande"}
                            </h1>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                                <FiMapPin className="w-3 h-3" />
                                Table n° {table?.number ?? "..."}
                            </span>
                        </div>
                    </div>

                    {hasLockedItems && (
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
                            Cette commande est vide pour le moment.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Button
                                onClick={() => navigate(`/menu/${token}`)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all"
                            >
                                Voir le menu
                            </Button>
                            <Button
                                onClick={() => navigate(`/orders/${token}`)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-orange-100 text-orange-600 text-sm font-semibold hover:bg-orange-50 active:scale-95 transition-all"
                            >
                                Mes commandes
                            </Button>
                        </div>
                    </div>
                )}

                {!loading &&
                    groups.map((group, index) => {
                        const menu = menuLookup[group.menuId]
                        const addons = resolveAddons(group)
                        const unitPrice = groupUnitPrice(group)
                        const isRemoving = removingKey === group.key || cancelingKey === group.key
                        const canCancel = group.locked && group.status === "pending"
                        const isMultiple = (menuCounts.get(group.menuId) ?? 0) > 1

                        // Style spécifique pour distinguer les plats validés
                        let cardStyle = "border-orange-100 bg-white"
                        if (group.locked) {
                            cardStyle = "border-gray-100 bg-gray-50/60"
                        }

                        return (
                            <article
                                key={group.key}
                                className={`relative flex gap-3 p-3 rounded-3xl border transition-all duration-300 ease-in-out ${cardStyle} ${
                                    isRemoving
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
                                        <div className="min-w-0 flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                {menu?.name ?? "Plat"}
                                            </h3>
                                            {isMultiple && (
                                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                    {getOrdinalLabel(group.itemNumber)}
                                                </span>
                                            )}
                                        </div>

                                        {!group.locked && (
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

                                    {!group.locked ? (
                                        <textarea
                                            value={group.note}
                                            onChange={(e) => handleNoteChange(group.key, e.target.value)}
                                            onBlur={handleNoteBlur}
                                            placeholder="Ajouter une note..."
                                            className="w-full text-xs text-gray-600 bg-white/80 border border-orange-100 rounded-lg px-2.5 py-1.5 resize-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition"
                                        />
                                    ) : (
                                        group.note && (
                                            <p className="text-xs text-gray-400 italic truncate">"{group.note}"</p>
                                        )
                                    )}

                                    <div className="flex items-center justify-between pt-0.5">
                                        {!group.locked ? (
                                            <div className="flex items-center gap-1.5 bg-white rounded-full p-1 border border-orange-100">
                                                <button
                                                    onClick={() => handleDecrease(group.key)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 active:scale-90 transition-all"
                                                    aria-label="Supprimer cet exemplaire"
                                                >
                                                    <FiMinus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                                    1
                                                </span>
                                                <button
                                                    onClick={() => handleIncrease(group.key)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 active:scale-90 transition-all"
                                                    aria-label="Ajouter un autre exemplaire"
                                                >
                                                    <FiPlus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-500">× 1</span>
                                        )}

                                        <span className="text-sm font-bold text-orange-600 tabular-nums animate-price-rise">
                                            {formatPrice(unitPrice)}
                                        </span>
                                    </div>

                                    {group.locked && (
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

            {/* Barre de validation affichée si la commande n'est pas encore envoyée */}
            {!isEmpty && !loading && hasUnlockedItems && (
                <div className="fixed bottom-0 left-0 right-0 z-30 animate-fade-up">
                    <div className="bg-white border-t border-orange-100 px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Total commande
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
                                Valider la commande
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de suivi des commandes */}
            {(showTracking || trackingClosing) && (
                <div
                    className={`fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-modal-fade-in ${
                        trackingClosing ? "animate-modal-fade-out" : ""
                    }`}
                >
                    <div
                        className={`w-full sm:max-w-md bg-white scrollbar-hidden rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto animate-modal-pop-in ${
                            trackingClosing ? "animate-modal-pop-out" : ""
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
                                const isMultiple = (menuCounts.get(group.menuId) ?? 0) > 1

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
                                            <div className="min-w-0 flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {menu?.name ?? "Plat"}
                                                </p>
                                                {isMultiple && (
                                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                        {getOrdinalLabel(group.itemNumber)}
                                                    </span>
                                                )}
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
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                                                                    isDone
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
                                                                    className={`w-0.5 flex-1 min-h-6 transition-colors duration-300 ${
                                                                        isDone ? "bg-orange-400" : "bg-gray-100"
                                                                    }`}
                                                                />
                                                            )}
                                                        </div>

                                                        <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                                                            <p
                                                                className={`text-sm font-semibold ${
                                                                    isDone || isCurrent ? "text-gray-900" : "text-gray-300"
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