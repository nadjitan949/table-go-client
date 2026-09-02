import { useEffect, useState } from "react"
import api from "../api/axios"
import type { MenuItem, MenuCategory } from "../interfaces/menu.types"
import type { ApiResponse } from "../interfaces/api.types"
import type { Table } from "../interfaces/table.types"
import { useParams } from "react-router-dom"

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

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await api.get<ApiResponse<MenuItem[]>>("/menu/all")
                setMenuItems(res.data.data)
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

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                    <p className="text-sm font-medium tracking-wide text-zinc-400 animate-pulse">
                        Préparation de votre menu...
                    </p>
                </div>
            </div>
        )
    }

    const groups = CATEGORY_ORDER.map((category) => ({
        category,
        items: menuItems.filter((item) => item.category === category && item.isAvailable),
    })).filter((group) => group.items.length > 0)

    const filteredGroups = activeCategory === "all" 
        ? groups 
        : groups.filter(g => g.category === activeCategory)

    return (
        <div className="min-h-screen bg-zinc-955 bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-white pb-20">
            {/* Header Ambiant & Élégant */}
            <header className="relative overflow-hidden border-b border-white/10 bg-zinc-900/40 backdrop-blur-xl px-6 pt-12 pb-8 text-center">
                <div className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80')` }} />
                <div className="absolute inset-0 bg-linear-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <span>Table n° {table?.number || '...'}</span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white mb-2">
                        Épices & Nectar
                    </h1>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                        Explorez notre carte raffinée et commandez directement depuis votre table en toute sérénité.
                    </p>
                </div>

                {/* Filtres de Catégories Mobile-First (Sticky Horizontal Scroll) */}
                <div className="relative z-10 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar max-w-xl mx-auto mt-8 px-2 py-1">
                    <button
                        onClick={() => setActiveCategory("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 shrink-0 ${
                            activeCategory === "all"
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
                        }`}
                    >
                        Tout voir
                    </button>
                    {CATEGORY_ORDER.map((cat) => {
                        const hasItems = groups.some(g => g.category === cat)
                        if (!hasItems) return null
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 shrink-0 ${
                                    activeCategory === cat
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
                                }`}
                            >
                                {CATEGORY_LABELS[cat]}
                            </button>
                        )
                    })}
                </div>
            </header>

            {/* Contenu de la Carte */}
            <main className={`mx-auto max-w-4xl px-4 sm:px-6 py-8 transition-all duration-700 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {filteredGroups.map((group) => (
                    <section key={group.category} className="mb-12 last:mb-0">
                        {/* Titre de Section Stylé */}
                        <div className="mb-6 flex items-center gap-4">
                            <h2 className="font-serif text-2xl font-semibold text-white tracking-wide">
                                {CATEGORY_LABELS[group.category]}
                            </h2>
                            <div className="h-px flex-1 bg-linear-to-r from-amber-500/40 via-white/10 to-transparent" />
                        </div>

                        {/* Grille des Plats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {group.items.map((item) => (
                                <article 
                                    key={item.id} 
                                    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
                                >
                                    {/* Image du Plat */}
                                    {item.imageUrl ? (
                                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    ) : (
                                        <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-600 text-xs">
                                            🍽️
                                        </div>
                                    )}

                                    {/* Informations */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-0.5">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors duration-200 line-clamp-1">
                                                    {item.name}
                                                </h3>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                                            <span className="text-sm sm:text-base font-bold text-amber-400 tracking-tight">
                                                {formatPrice(item.price)}
                                            </span>
                                            {item.estimatedPrepTime && (
                                                <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                    ⏱️ {item.estimatedPrepTime} min
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}

                {filteredGroups.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-2xl">
                            🔍
                        </div>
                        <p className="text-sm text-zinc-400">
                            Aucun plat disponible dans cette catégorie pour le moment.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default MenuPage