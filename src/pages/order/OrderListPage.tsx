import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../../api/axios"
import type { ApiResponse } from "../../interfaces/api.types"
import type { MenuItem } from "../../interfaces/menu.types"
import type { Table } from "../../interfaces/table.types"
import type { Order } from "../../interfaces/order.types"
import { readOrders } from "../../utils/ordersStorage"
import { FiArrowLeft, FiMapPin, FiShoppingBag, FiChevronRight, FiClock } from "react-icons/fi"
import { MdRestaurant } from "react-icons/md"
import Button from "../../ui/Button"

function formatDate(ts?: number): string {
    if (!ts) return ""
    return new Date(ts).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function formatPrice(value: number): string {
    return `${Math.round(value).toLocaleString("fr-FR")} FCFA`
}

function orderStatusLabel(order: Order): string {
    if (!order.locked) return "Brouillon"
    const statuses = new Set(order.order.map((i) => i.status))
    if (statuses.has("livred")) return "Livrée"
    if (statuses.has("taked")) return "Récupérée"
    if (statuses.has("ready")) return "Prête"
    if (statuses.has("is_cooking")) return "En préparation"
    return "En attente"
}

function statusBadgeStyle(order: Order): string {
    if (!order.locked) return "bg-gray-100 text-gray-500"
    const statuses = new Set(order.order.map((i) => i.status))
    if (statuses.has("livred")) return "bg-gray-100 text-gray-600"
    if (statuses.has("taked")) return "bg-teal-50 text-teal-700"
    if (statuses.has("ready")) return "bg-green-50 text-green-700"
    if (statuses.has("is_cooking")) return "bg-amber-50 text-amber-700"
    return "bg-orange-50 text-orange-600"
}

function OrderListPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()

    // 1. Initialisation paresseuse pour éviter le setState synchrone dans un useEffect
    const [orders, setOrders] = useState<Order[]>(() => readOrders())
    const [menuLookup, setMenuLookup] = useState<Record<number, MenuItem>>({})
    const [table, setTable] = useState<Table | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(() => {
        setOrders(readOrders())
    }, [])

    useEffect(() => {
        // Suppression de l'appel direct à refresh() ici
        const handleStorage = () => refresh()
        const handleFocus = () => refresh()
        window.addEventListener("orderUpdated", handleStorage)
        window.addEventListener("storage", handleStorage)
        window.addEventListener("focus", handleFocus)
        return () => {
            window.removeEventListener("orderUpdated", handleStorage)
            window.removeEventListener("storage", handleStorage)
            window.removeEventListener("focus", handleFocus)
        }
    }, [refresh])

    useEffect(() => {
        let active = true
        async function fetchTable() {
            try {
                const res = await api.get<ApiResponse<Table>>(`/table/get-table/${token}`)
                if (active) setTable(res.data.data)
            } catch (error) {
                console.log(error)
            }
        }
        if (token) fetchTable()
        return () => {
            active = false
        }
    }, [token])

    useEffect(() => {
        let active = true
        async function fetchMenus() {
            try {
                const res = await api.get<ApiResponse<MenuItem[]>>("/menu/all")
                if (!active) return
                const lookup: Record<number, MenuItem> = {}
                res.data.data.forEach((m) => {
                    lookup[Number(m.id)] = m
                })
                setMenuLookup(lookup)
            } catch (error) {
                console.log(error)
            } finally {
                if (active) setLoading(false)
            }
        }
        fetchMenus()
        return () => {
            active = false
        }
    }, [])

    const orderTotal = useCallback(
        (order: Order): number => {
            return order.order.reduce((sum, item) => {
                const menu = menuLookup[item.menuId]
                const base = menu ? Number(menu.price) : 0
                const addonsCost = (item.addon ?? []).reduce((s, a) => {
                    const found = menu?.AddOns?.find((ad) => Number(ad.id) === a.addonId)
                    return s + (found ? Number(found.price) * a.quantity : 0)
                }, 0)
                return sum + base + addonsCost
            }, 0)
        },
        [menuLookup]
    )

    const sortedOrders = useMemo(() => [...orders].reverse(), [orders])

    const isEmpty = !loading && sortedOrders.length === 0

    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans">
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/menu/${token}`)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-90 transition-all"
                        aria-label="Retour au menu"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Mes commandes</h1>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                            <FiMapPin className="w-3 h-3" />
                            Table n° {table?.number ?? "..."}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-3">
                {loading && (
                    <>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3 p-4 rounded-3xl border border-orange-100">
                                <div className="skeleton-block w-12 h-12 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="skeleton-block h-4 w-1/2" />
                                    <div className="skeleton-block h-3 w-2/3" />
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
                            Vous n'avez encore aucune commande.
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
                    sortedOrders.map((order, index) => {
                        const number = orders.indexOf(order) + 1
                        const label = orderStatusLabel(order)
                        const badge = statusBadgeStyle(order)
                        const total = orderTotal(order)

                        return (
                            <button
                                key={order.id}
                                onClick={() => navigate(`/orders/${token}/${order.id}`)}
                                className="w-full text-left flex items-center gap-3 p-4 rounded-3xl border border-orange-100 bg-white hover:border-orange-200 hover:shadow-sm active:scale-[0.99] transition-all animate-fade-up"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                                    <MdRestaurant className="w-6 h-6 text-orange-500" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-gray-900">
                                            Commande n° {number}
                                        </p>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                                            {label}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {order.order.length} article{order.order.length > 1 ? "s" : ""}
                                        <span className="mx-1">•</span>
                                        {formatPrice(total)}
                                    </p>

                                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                                        <FiClock className="w-3 h-3" />
                                        {formatDate(order.createdAt)}
                                    </p>
                                </div>

                                <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        )
                    })}
            </main>
        </div>
    )
}

export default OrderListPage