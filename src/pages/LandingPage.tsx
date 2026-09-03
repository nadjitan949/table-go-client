import { useEffect, useMemo, useState } from "react"
import type { Table } from "../interfaces/table.types"
import { useNavigate, useParams } from "react-router-dom"
import type { ApiResponse } from "../interfaces/api.types"
import api from "../api/axios"
import { FiArrowRight } from "react-icons/fi"
import { MdPlace, MdRestaurant } from "react-icons/md"

const RESTO_IMG =
    "https://image.qwenlm.ai/public_source/5d9eb5f0-3d29-43ae-88c2-4e3a1f799cff/121252d21-1eb8-445c-b8e1-e278845e48ca.png"

function QrFinder({ posX, posY }: { posX: number; posY: number }) {
    return (
        <g>
            <rect x={posX} y={posY} width="7" height="7" fill="#1a1a1a" />
            <rect x={posX + 1} y={posY + 1} width="5" height="5" fill="#ffffff" />
            <rect x={posX + 2} y={posY + 2} width="3" height="3" fill="#1a1a1a" />
        </g>
    )
}

function LandingPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [table, setTable] = useState<Table | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const goToMenu = () => navigate(`/menu/${token}`)

    useEffect(() => {
        // Tente de masquer la barre d'adresse sur mobile
        window.scrollTo(0, 1);
    }, []);

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

    function generateQRCells(): Array<{ cellX: number; cellY: number }> {
        const cells: Array<{ cellX: number; cellY: number }> = []
        let seed = 7
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280
            return seed / 233280
        }

        const size = 21
        const finderSize = 7

        const addFinderPattern = (startX: number, startY: number) => {
            for (let y = 0; y < finderSize; y++) {
                for (let x = 0; x < finderSize; x++) {
                    if (
                        x === 0 || y === 0 || x === finderSize - 1 || y === finderSize - 1 ||
                        (x >= 2 && x <= 4 && y >= 2 && y <= 4)
                    ) {
                        cells.push({ cellX: startX + x, cellY: startY + y })
                    }
                }
            }
        }

        addFinderPattern(0, 0)
        addFinderPattern(size - finderSize, 0)
        addFinderPattern(0, size - finderSize)

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const inLeftFinder = row < finderSize && col < finderSize
                const inRightFinder = row < finderSize && col >= size - finderSize
                const inBottomFinder = row >= size - finderSize && col < finderSize
                if (inLeftFinder || inRightFinder || inBottomFinder) continue

                if (rand() > 0.48) {
                    cells.push({ cellX: col, cellY: row })
                }
            }
        }

        return cells
    }

    const qrCells = useMemo(() => generateQRCells(), [])

    return (
        <div className="relative h-screen w-full overflow-hidden bg-white font-sans flex flex-col items-center px-4">
            <style>{`
                @keyframes floatY { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                .animate-float { animation: floatY 4s ease-in-out infinite; }
                .animate-float-slow { animation: floatY 5.5s ease-in-out 0.8s infinite; }
            `}</style>

            <div
                className={`relative z-10 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl flex flex-col items-center text-center transition-all duration-1000 transform ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                    }`}
                style={{ height: "100%" }}
            >
                {/* Badge marque - espace supérieur réduit */}
                <span className="inline-flex items-center gap-2 mt-[2vh] px-5 py-1.5 text-sm font-bold uppercase tracking-widest text-orange-500">
                    <MdRestaurant className="w-3.5 h-3.5" />
                    Épices &amp; Nectar
                </span>

                {/* Titre */}
                <h1 className="mt-[2vh] text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
                    Le menu de votre table, sans attendre le serveur !
                </h1>

                <p className="mt-[2vh] text-base sm:text-lg md:text-xl font-medium text-gray-600 max-w-xl">
                    Installez-vous confortablement et laissez-vous guider, nous nous occupons du reste !
                </p>

                {/* Composition visuelle - hauteur flexible basée sur vh */}
                <div
                    className="relative mt-[3vh] w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto"
                    style={{ height: "42vh" }} // hauteur proportionnelle à l'écran
                >
                    {/* Croix décoratives */}
                    <span className="absolute right-2 sm:right-4 top-2 text-lg text-gray-300 select-none">+</span>
                    <span className="absolute left-4 sm:left-6 bottom-8 text-sm text-gray-300 select-none">+</span>
                    <span className="absolute right-6 sm:right-10 bottom-24 text-xs text-gray-300 select-none">+</span>

                    {/* Carte flottante gauche */}
                    <div className="absolute left-0 sm:-left-2 md:-left-6 top-0 sm:-top-4 md:-top-8 z-20 animate-float">
                        <div className="w-36 sm:w-44 md:w-48 rounded-2xl border border-orange-100 bg-white p-2.5 text-left shadow-xl">
                            <img
                                src={RESTO_IMG}
                                alt="Salle du restaurant Épices & Nectar"
                                className="mb-1 sm:mb-2 h-14 sm:h-20 md:h-24 w-full rounded-xl object-cover"
                            />
                            <p className="text-[8px] sm:text-[10px] font-bold leading-snug text-gray-800">
                                Bonjour ! Votre table vous attend
                            </p>
                            <p className="mt-1 text-[7px] sm:text-[9px] leading-snug text-gray-500">
                                Scannez le QR code de votre table, parcourez la carte et commandez en quelques secondes.
                            </p>
                            <div className="mt-1 sm:mt-2 grid grid-cols-2 gap-1">
                                {["Voir le menu", "Commander", "Partager", "Payer"].map((label) => (
                                    <span
                                        key={label}
                                        className="rounded-md bg-green-100 px-1 py-0.5 sm:py-1 text-center text-[6px] sm:text-[8px] font-semibold text-green-700"
                                    >
                                        ✓ {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mockup téléphone central - hauteur en % du conteneur */}
                    <div className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 z-10 w-40 h-72 sm:w-52 sm:h-96 md:w-60 md:h-112 lg:w-64 lg:h-120 rounded-4xl border-4 sm:border-8 border-gray-900 bg-gray-900 shadow-2xl"
                        style={{ height: "90%", maxHeight: "90%" }} // proportionnel
                    >
                        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-white h-full p-2 sm:p-4">
                            <div className="absolute left-1/2 top-0 h-2 sm:h-3 w-10 sm:w-14 -translate-x-1/2 rounded-b-xl bg-gray-900" />
                            <div className="w-24 sm:w-36 md:w-40 lg:w-44 rounded-xl flex items-center justify-center bg-white p-1 sm:p-2">
                                <svg viewBox="0 0 21 21" className="h-full w-full" shapeRendering="crispEdges">
                                    <rect width="21" height="21" fill="#ffffff" />
                                    <QrFinder posX={0} posY={0} />
                                    <QrFinder posX={14} posY={0} />
                                    <QrFinder posX={0} posY={14} />
                                    {qrCells.map((cellItem, idx) => (
                                        <rect
                                            key={idx}
                                            x={cellItem.cellX}
                                            y={cellItem.cellY}
                                            width="1"
                                            height="1"
                                            fill="#1a1a1a"
                                        />
                                    ))}
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Carte flottante droite */}
                    <div className="absolute right-0 sm:-right-2 md:-right-6 -bottom-20 z-30 animate-float-slow">
                        <div className="w-32 sm:w-40 md:w-44 rounded-2xl border border-orange-100 bg-white p-2 sm:p-3 text-left shadow-xl">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-green-100">
                                    <MdPlace className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                </span>
                                <span className="text-[8px] sm:text-[10px] font-bold text-gray-800">Votre table</span>
                            </div>
                            <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 border-t border-dashed border-gray-200 pt-1 sm:pt-2 text-[7px] sm:text-[9px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Table</span>
                                    <span className="font-semibold text-gray-800">n° {table ? table.number : "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Couverts</span>
                                    <span className="font-semibold text-gray-800">2</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Statut</span>
                                    <span className="font-semibold text-green-600">Prête</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bouton d'action - marge inférieure proportionnelle */}
                <button
                    onClick={goToMenu}
                    className="group absolute bottom-10 mt-[3vh] mb-[3vh] inline-flex items-center gap-2 sm:gap-3 rounded-full bg-orange-500 px-15 sm:px-10 py-5 sm:py-4 text-base sm:text-lg font-bold text-white transition-all duration-300 hover:from-amber-600 hover:to-orange-700 hover:shadow-2xl hover:shadow-orange-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-300"
                >
                    <span>Accéder à nos menus</span>
                    <FiArrowRight className="h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-2" />
                </button>
            </div>
        </div>
    )
}

export default LandingPage