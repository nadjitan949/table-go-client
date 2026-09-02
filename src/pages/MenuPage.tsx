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

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await api.get<ApiResponse<MenuItem[]>>("/menu/all")
                setMenuItems(res.data.data)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }

        fetchMenu()
    }, [])

    useEffect(() => {
        async function fetchTables() {

            try {

                const res = await api.get<ApiResponse<Table>>(`/table/get-table/${token}`)
                const tables: Table = res.data.data
                setTable(tables)
                
            } catch (error) {
                console.log(error)
            }
        }
        fetchTables()
    }, [token])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <p className="text-sm text-stone-400">Chargement du menu…</p>
            </div>
        )
    }

    const groups = CATEGORY_ORDER.map((category) => ({
        category,
        items: menuItems.filter((item) => item.category === category && item.isAvailable),
    })).filter((group) => group.items.length > 0)

    return (
        <div className="min-h-screen bg-stone-50">
            <header className="border-b border-stone-200 px-6 py-10 text-center sm:py-14">
                <p className="text-xs tracking-wide text-stone-400">TableGo</p>
                <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-4xl">
                    Notre carte Table: {table?.number}
                </h1>
            </header>

            <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
                {groups.map((group) => (
                    <section key={group.category} className="mb-12 last:mb-0">
                        <div className="mb-5 flex items-baseline gap-4">
                            <h2 className="font-serif text-xl text-stone-900 sm:text-2xl">
                                {CATEGORY_LABELS[group.category]}
                            </h2>
                            <span className="h-px flex-1 bg-stone-200" />
                        </div>

                        <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
                            {group.items.map((item) => (
                                <article key={item.id} className="flex gap-4">
                                    {item.imageUrl && (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="h-16 w-16 shrink-0 rounded-md object-cover sm:h-20 sm:w-20"
                                        />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-[15px] font-medium text-stone-900 sm:text-base">
                                                {item.name}
                                            </h3>
                                            <span className="h-px flex-1 border-b border-dotted border-stone-300 -translate-y-0.75" />
                                            <span className="text-[15px] font-medium text-stone-900 sm:text-base">
                                                {formatPrice(item.price)}
                                            </span>
                                        </div>

                                        {item.description && (
                                            <p className="mt-1 text-sm leading-snug text-stone-500">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}

                {groups.length === 0 && (
                    <p className="text-center text-sm text-stone-400">
                        Le menu n'est pas disponible pour le moment.
                    </p>
                )}
            </main>
        </div>
    )
}

export default MenuPage