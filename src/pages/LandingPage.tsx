import { useEffect, useState } from "react"
import type { Table } from "../interfaces/table.types"
import { useNavigate, useParams } from "react-router-dom"
import type { ApiResponse } from "../interfaces/api.types"
import api from "../api/axios"

function LandingPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [table, setTable] = useState<Table | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const goToMenu = () => navigate(`/menu/${token}`)

    useEffect(() => {
        async function fetchTables() {
            try {
                const res = await api.get<ApiResponse<Table>>(`/table/get-table/${token}`)
                const tables: Table = res.data.data
                setTable(tables)
            } catch (error) {
                console.log(error)
            } finally {
                setIsLoaded(true)
            }
        }
        fetchTables()
    }, [token])

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950 font-sans text-zinc-100">
            {/* Background Image avec un filtre assombri et chaleureux */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80')` }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40 backdrop-blur-[2px]" />

            {/* Carte Principale Glassmorphism (Mobile-First & Responsive) */}
            <div className={`relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 transition-all duration-700 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                
                {/* En-tête / Nom du Restaurant */}
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
                        Bienvenue chez vous
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 font-serif">
                        Épices & Nectar
                    </h1>
                    <p className="text-sm text-zinc-400">
                        L'art culinaire réinventé pour éveiller vos sens.
                    </p>
                </div>

                {/* Badge de la Table */}
                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between shadow-inner">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold border border-amber-500/30">
                            🍽️
                        </div>
                        <div>
                            <p className="text-xs text-zinc-400">Votre emplacement</p>
                            <p className="text-lg font-semibold text-white">
                                {table ? `Table n° ${table.number}` : 'Chargement...'}
                            </p>
                        </div>
                    </div>
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                </div>

                {/* Bouton d'action moderne et animé */}
                <button 
                    onClick={goToMenu}
                    className="w-full group relative inline-flex items-center justify-center px-8 py-4 font-medium tracking-wide text-white transition-all duration-300 ease-out bg-linear-to-r from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98]"
                >
                    <span className="absolute inset-0 w-full h-full rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative flex items-center space-x-2 text-base font-semibold">
                        <span>Accéder à nos menus</span>
                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                    </span>
                </button>

                {/* Note de bas de page */}
                <p className="text-center text-xs text-zinc-500 mt-6">
                    Scannez, commandez et savourez en toute sérénité.
                </p>
            </div>
        </div>
    )
}

export default LandingPage