import { useEffect, useMemo, useState } from "react"
import api from "../api/axios"
import type { MenuItem, MenuCategory } from "../interfaces/menu.types"
import type { ApiResponse } from "../interfaces/api.types"
import type { Table } from "../interfaces/table.types"
import { useParams } from "react-router-dom"
import { FiClock, FiSearch, FiMapPin, FiCoffee, FiPlus, FiSliders } from "react-icons/fi"
import { motion } from "framer-motion"

const CATEGORY_LABELS: Record<MenuCategory, string> = {
    starter: "Entrées",
    main: "Plats",
    dessert: "Desserts",
    drink: "Boissons",
}

const CATEGORY_ORDER: MenuCategory[] = ["starter", "main", "dessert", "drink"]

function formatPrice(price: string): string {
    return `${Math.round(Number(price)).toLocaleString("fr-FR")} FCFA`
}

function MenuPage() {
    const { token } = useParams()
    const [menuItems, setMenuItems] = useState<MenuItem[] | []>([])
    const [table, setTable] = useState<Table | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<string>("all")
    const [isLoaded, setIsLoaded] = useState(false)
    const [showHeader, setShowHeader] = useState(true)
    const [showFilters, setShowFilters] = useState(false)

    const [searchTerm, setSearchTerm] = useState("")
    const [maxPrice, setMaxPrice] = useState<number>(0)

    useEffect(() => {
        let lastScrollY = window.scrollY

        const handleScroll = () => {
            const currentScrollY = window.scrollY
            if (currentScrollY > lastScrollY + 10) {
                setShowHeader(false)
                setShowFilters(false)
            } else if (currentScrollY < lastScrollY - 10) {
                setShowHeader(true)
                setShowFilters(false)
            }
            lastScrollY = currentScrollY
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await api.get<ApiResponse<MenuItem[]>>("/menu/all")
                const items = res.data.data
                setMenuItems(items)
                const max = Math.max(...items.map(item => Number(item.price)), 0)
                setMaxPrice(max)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
                setTimeout(() => setIsLoaded(true), 100)
            }
        }
        fetchMenu()
    }, [])

    useEffect(() => {
        async function fetchTables() {
            try {
                const res = await api.get<ApiResponse<Table>>(`/table/get-table/${token}`)
                setTable(res.data.data)
            } catch (error) {
                console.log(error)
            }
        }
        fetchTables()
    }, [token])

    const availableItems = useMemo(() => {
        return menuItems.filter(item => item.isAvailable)
    }, [menuItems])

    const filteredItems = useMemo(() => {
        return availableItems.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
            const matchesPrice = Number(item.price) <= maxPrice
            return matchesSearch && matchesPrice
        })
    }, [availableItems, searchTerm, maxPrice])

    const groups = useMemo(() => {
        return CATEGORY_ORDER.map(category => ({
            category,
            items: filteredItems.filter(item => item.category === category),
        })).filter(group => group.items.length > 0)
    }, [filteredItems])

    const filteredGroups = activeCategory === "all"
        ? groups
        : groups.filter(g => g.category === activeCategory)

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-yellow-100">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                    <p className="text-sm font-medium tracking-wide text-gray-600 animate-pulse">
                        Préparation de votre menu...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen text-gray-800 font-sans selection:bg-orange-200 selection:text-gray-900 pb-20">
            <header
                className={`sticky top-0 z-40 bg-white/70 backdrop-blur-lg transition-transform duration-500 ease-in-out ${showHeader ? "translate-y-0" : "-translate-y-full"
                    }`}
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Épices & Nectar
                            </h1>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-orange-700">
                            <FiMapPin className="w-3.5 h-3.5" />
                            Table n° {table?.number || '...'}
                        </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Rechercher un plat, une boisson..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3.5 pl-10 rounded-full bg-white/80 border border-orange-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all duration-300"
                            />
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-4 rounded-full text-sm font-medium transition-all duration-500 ease-in-out ${showFilters
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105"
                                : "bg-white/80 border border-orange-200 text-gray-700 hover:bg-white hover:scale-105"
                                }`}
                        >
                            <FiSliders className="w-4 h-4" />
                            <span className="hidden sm:inline">Filtres</span>
                        </button>
                    </div>

                    {/* Filtres animés avec Framer Motion */}
                    <motion.div
                        initial={false}
                        animate={{ height: showFilters ? "auto" : 0, opacity: showFilters ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4 mt-4">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveCategory("all")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${activeCategory === "all"
                                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                        : "bg-white/60 text-gray-600 hover:bg-white/80 border border-orange-200"
                                        }`}
                                >
                                    Tout voir
                                </button>
                                {CATEGORY_ORDER.map(cat => {
                                    const hasItems = groups.some(g => g.category === cat)
                                    if (!hasItems) return null
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${activeCategory === cat
                                                ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                                : "bg-white/60 text-gray-600 hover:bg-white/80 border border-orange-200"
                                                }`}
                                        >
                                            {CATEGORY_LABELS[cat]}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex items-center gap-3 bg-white/50 rounded-2xl px-4 py-2 border border-orange-100">
                                <FiSliders className="w-4 h-4 text-gray-500 shrink-0" />
                                <div className="flex-1">
                                    <input
                                        type="range"
                                        min={0}
                                        max={Math.max(...availableItems.map(item => Number(item.price)), 0)}
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                                        className="w-full accent-orange-500"
                                    />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 shrink-0">
                                    ≤ {formatPrice(String(maxPrice))}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </header>

            <main className={`mx-auto max-w-4xl px-4 sm:px-6 py-6 transition-all duration-700 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                {filteredGroups.map(group => (
                    <section key={group.category} className="mb-10 last:mb-0">
                        <div className="mb-4 flex items-center gap-3">
                            <h2 className=" text-xl sm:text-2xl font-semibold text-gray-900">
                                {CATEGORY_LABELS[group.category]}
                            </h2>
                            <div className="h-px flex-1 bg-orange-300/60" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {group.items.map(item => (
                                <motion.article
                                    onClick={() => alert(item.name)}
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ amount: 0.1 }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="group relative aspect-square overflow-hidden rounded-3xl border border-orange-100 bg-orange-50 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-orange-100/50 hover:-translate-y-0.5"
                                >
                                    {/* Image de fond couvrant tout le carré */}
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-orange-400">
                                            <FiCoffee className="w-10 h-10" />
                                        </div>
                                    )}

                                    {/* Dégradé noir transparent du bas vers le haut */}
                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                                    {/* Contenu superposé en bas */}
                                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex items-end justify-between gap-2">
                                        {/* Nom + temps de préparation (bas gauche) */}
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2 drop-shadow-md">
                                                {item.name}
                                            </h3>
                                            <h3 className="text-[10px] sm:text-base font-bold text-white line-clamp-2 drop-shadow-md">
                                                {item.price} FCFA
                                            </h3>
                                            {item.estimatedPrepTime && (
                                                <span className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-white/90 font-medium">
                                                    <FiClock className="w-3.5 h-3.5" />
                                                    {item.estimatedPrepTime} min
                                                </span>
                                            )}
                                        </div>

                                        {/* Bouton rond "+" (bas droite) */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Ajouter", item.id);
                                                alert(`Menus ajouté: ${item.name}`)
                                            }}
                                            className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-orange-500 text-white shadow-lg shadow-black/20 hover:bg-orange-700 active:scale-95 transition-all duration-300"
                                            aria-label={`Ajouter ${item.name}`}
                                        >
                                            <FiPlus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    </section>
                ))}

                {filteredGroups.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/70 border border-orange-100 flex items-center justify-center text-orange-400">
                            <FiSearch className="w-8 h-8" />
                        </div>
                        <p className="text-sm text-gray-600">
                            Aucun plat ne correspond à vos critères.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default MenuPage