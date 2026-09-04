import { useEffect, useState, useRef } from "react";
import type { MenuItem } from "../../../interfaces/menu.types";
import type { ApiResponse } from "../../../interfaces/api.types";
import api from "../../../api/axios";
import {
    FiPlus,
    FiMinus,
    FiClock,
    FiShoppingBag,
    FiChevronLeft,
    FiTag,
    FiX,
} from "react-icons/fi";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MdRestaurant } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../../ui/Button";
import type { OrderItems } from "../../../interfaces/orderItems.types";
import type { Order } from "../../../interfaces/order.types";

function DetailsMenu() {
    const { id, token } = useParams()
    const [menu, setMenu] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [quantity, setQuantity] = useState<number>(1);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState<boolean>(false)
    const [note, setNote] = useState<string | "">("")
    const scrollRef = useRef<HTMLDivElement>(null);

    const { scrollY } = useScroll({ container: scrollRef });
    const imageScale = useTransform(scrollY, [0, 300], [1, 1.15]);
    const imageY = useTransform(scrollY, [0, 300], [0, 60]);

    const navigate = useNavigate()
    const goBack = () => navigate(-1)

    useEffect(() => {
        async function fetchMenuDetails() {
            setIsLoading(true);
            setImageLoaded(false);
            setQuantity(1);
            try {
                const res = await api.get<ApiResponse<MenuItem>>(`/menu/details/${id}`);
                setMenu(res.data.data);
            } catch (error) {
                console.log(error);
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchMenuDetails();
    }, [id]);

    useEffect(() => {
        if (id) {
            const scrollY = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = "100%";
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.position = "";
                document.body.style.top = "";
                document.body.style.width = "";
                document.body.style.overflow = "";
                window.scrollTo(0, scrollY);
            };
        }
    }, [id]);

    const totalPrice = menu ? quantity * Number(menu.price) : 0;
    const unitPrice = menu ? Math.round(Number(menu.price)) : 0;

    function handleAddOrder() {
        try {
            if (!token) return;
            if (!menu?.id) return; // sécurité

            // Création d'un objet de base avec quantité = 1 pour chaque unité
            const baseOrderItem: OrderItems = {
                menuId: Number(menu?.id),
                note: note,
            };

            // Génération de N objets identiques (N = quantity)
            const orders = Array.from({ length: quantity }, () => ({ ...baseOrderItem }));

            // Construction de l'objet Order
            const order: Order = {
                tableToken: token,
                order: orders,
            };

            // Enregistrement dans localStorage (conversion en JSON)
            localStorage.setItem("Order", JSON.stringify(order));

            console.log("Commande enregistrée :", order);
            setShowSuggestion(false)
        } catch (error) {
            console.log(error);
        }
    }
    // --- Shared image loader ---
    const renderImage = (className: string) => (
        <div className={`relative overflow-hidden ${className}`}>
            <motion.div
                className="absolute inset-0 w-full h-full"
                style={{ scale: imageScale, y: imageY }}
            >
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-[3px] border-orange-100 rounded-full" />
                            <div className="absolute inset-0 border-[3px] border-transparent border-t-orange-500 rounded-full animate-spin" />
                        </div>
                        <span className="text-xs text-orange-400/80 font-medium tracking-wide">
                            Chargement...
                        </span>
                    </div>
                ) : menu?.imageUrl ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-[3px] border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                        )}
                        <img
                            src={menu.imageUrl}
                            alt={menu?.name}
                            className={`h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                            onLoad={() => setImageLoaded(true)}
                        />
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-orange-100/80 flex items-center justify-center text-5xl text-orange-300">
                            <MdRestaurant />
                        </div>
                    </div>
                )}
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-r from-black/10 via-transparent to-black/10 pointer-events-none" />
        </div>
    );

    // --- Shared quantity selector ---
    const renderQuantitySelector = () => (
        <motion.div
            className="pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2.5">
                Quantité
            </h2>
            <div className="flex items-center justify-between bg-gray-50/80 rounded-2xl p-1.5 border border-gray-100">
                <div className="flex items-center gap-2 pl-3.5">
                    <div className="relative inline-flex items-center">
                        <span
                            aria-hidden="true"
                            className="text-sm font-semibold text-gray-700 tabular-nums whitespace-pre invisible pointer-events-none px-0.5"
                        >
                            {quantity || "0"}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={quantity}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                    setQuantity(0);
                                    return;
                                }
                                const cleaned = raw.replace(/\D/g, "");
                                if (cleaned === "") {
                                    setQuantity(0);
                                    return;
                                }
                                const parsed = parseInt(cleaned, 10);
                                if (!isNaN(parsed)) {
                                    setQuantity(parsed);
                                }
                            }}
                            onBlur={() => {
                                if (!quantity || quantity < 1 || isNaN(quantity)) {
                                    setQuantity(1);
                                }
                            }}
                            onFocus={(e) => {
                                e.target.select();
                            }}
                            className="absolute inset-0 w-full text-sm font-semibold text-gray-700 tabular-nums bg-transparent border-none outline-none text-left"
                            style={{ caretColor: "#f97316" }}
                            aria-label="Quantité"
                        />
                    </div>
                    <span className="text-sm text-gray-400">
                        {quantity > 1 ? "articles" : "article"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <motion.button
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 active:scale-90 transition-all duration-150 shadow-sm"
                        aria-label="Diminuer"
                        whileTap={{ scale: 0.88 }}
                        disabled={quantity <= 1}
                    >
                        <FiMinus className="w-4 h-4" strokeWidth={2.5} />
                    </motion.button>
                    <motion.button
                        onClick={() => setQuantity((prev) => prev + 1)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-90 transition-all duration-150 shadow-sm"
                        aria-label="Augmenter"
                        whileTap={{ scale: 0.88 }}
                    >
                        <FiPlus className="w-4 h-4" strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );

    // --- Shared meta chips ---
    const renderMetaChips = () => (
        <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            {menu && (
                <div className="inline-flex items-center gap-2 bg-linear-to-r from-orange-50 to-amber-50 border border-orange-100/80 rounded-full px-4 py-2">
                    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                        <FiTag className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                            {unitPrice.toLocaleString("fr-FR")}
                        </span>
                        <span className="text-[11px] font-semibold text-orange-500">
                            FCFA
                        </span>
                    </div>
                </div>
            )}
            {menu?.estimatedPrepTime && (
                <div className="inline-flex items-center gap-2 bg-linear-to-r from-gray-50 to-slate-50 border border-gray-100/80 rounded-full px-4 py-2">
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                        <FiClock className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                            {menu.estimatedPrepTime}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">
                            min
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <AnimatePresence>
            {id && (
                <>
                    {/* ======================== */}
                    {/* MOBILE LAYOUT (< lg)     */}
                    {/* ======================== */}
                    <motion.div
                        className="fixed inset-0 z-100 bg-black lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Scrollable Content Area */}
                        <div
                            ref={scrollRef}
                            className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
                            style={{ WebkitOverflowScrolling: "touch" }}
                        >
                            {/* Hero Image */}
                            {renderImage("w-full h-[45vh] bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50")}

                            {/* Bottom fade */}
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none z-5" />

                            {/* Content */}
                            <div className="relative bg-white -mt-12 rounded-t-[28px] z-10">
                                <div className="flex justify-center pt-3 pb-2">
                                    <div className="w-10 h-1 rounded-full bg-gray-200" />
                                </div>

                                <div className="px-5 pb-40">
                                    <motion.div
                                        className="pt-2 pb-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    >
                                        <h1 className="text-[1.7rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight">
                                            {menu?.name}
                                        </h1>
                                        {renderMetaChips()}
                                    </motion.div>

                                    {menu?.description && (
                                        <motion.div
                                            className="py-5"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        >
                                            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2.5">
                                                À propos
                                            </h2>
                                            <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                                                <p className="text-[0.95rem] text-gray-600 leading-[1.7] whitespace-pre-line">
                                                    {menu.description}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {renderQuantitySelector()}
                                </div>
                            </div>
                        </div>

                        {/* Top Back Button */}
                        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                            <div className="flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] h-14">
                                <motion.button
                                    onClick={goBack}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-white/50 text-gray-700 hover:bg-white active:scale-90 transition-all shadow-lg shadow-black/10 pointer-events-auto"
                                    whileTap={{ scale: 0.88 }}
                                    aria-label="Retour"
                                >
                                    <FiChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                </motion.button>
                                <div className="w-10" />
                            </div>
                        </div>

                        {/* Fixed Bottom CTA */}
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
                            layout
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                        >
                            <div className="bg-white pt-10 pb-[calc(env(safe-area-inset-bottom)+16px)] px-5 pointer-events-auto">
                                <motion.div
                                    className="flex items-stretch justify-between"
                                    layout
                                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                >
                                    {/* Prix Total */}
                                    <motion.div
                                        className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-full px-4 min-w-25"
                                        layout
                                        transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            <motion.div
                                                key={totalPrice}
                                                className="flex flex-col items-center"
                                                initial={{ y: 6, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -6, opacity: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            >
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-lg font-extrabold text-gray-900 tabular-nums tracking-tight">
                                                        {totalPrice.toLocaleString("fr-FR")}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        FCFA
                                                    </span>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* Bouton Ajouter */}
                                    <motion.button
                                        onClick={() => setShowSuggestion(true)}
                                        className="flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 active:scale-[0.98] group"
                                        whileTap={{ scale: 0.98 }}
                                        layout
                                        transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                            <FiShoppingBag className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110" />
                                        </div>
                                        <span className="text-[15px] font-semibold tracking-wide whitespace-nowrap">
                                            Ajouter
                                        </span>
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ======================== */}
                    {/* DESKTOP LAYOUT (lg+)     */}
                    {/* ======================== */}
                    <motion.div
                        className="hidden lg:flex fixed bg-white inset-0 z-100 items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Backdrop */}
                        <motion.div
                            className="absolute inset-0"
                            onClick={goBack}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />

                        {/* Modal */}
                        <motion.div
                            className="relative w-full max-w-5xl max-h-[90vh] bg-white overflow-hidden flex"
                            initial={{ opacity: 0, y: 30, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.97 }}
                            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <motion.button
                                onClick={goBack}
                                className="absolute top-5 right-5 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-gray-500 hover:text-gray-900 hover:bg-white transition-all duration-200 shadow-lg shadow-black/10 hover:scale-110 active:scale-95"
                                aria-label="Fermer"
                                whileHover={{ rotate: 90 }}
                                whileTap={{ scale: 0.88 }}
                                transition={{ duration: 0.2 }}
                            >
                                <FiX className="w-5 h-5" strokeWidth={2.5} />
                            </motion.button>

                            {/* Left - Image */}
                            <div className="relative w-[45%] shrink-0 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50">
                                {isLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-3">
                                        <div className="relative w-12 h-12">
                                            <div className="absolute inset-0 border-[3px] border-orange-100 rounded-full" />
                                            <div className="absolute inset-0 border-[3px] border-transparent border-t-orange-500 rounded-full animate-spin" />
                                        </div>
                                        <span className="text-xs text-orange-400/80 font-medium tracking-wide">
                                            Chargement...
                                        </span>
                                    </div>
                                ) : menu?.imageUrl ? (
                                    <>
                                        {!imageLoaded && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 border-[3px] border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                                            </div>
                                        )}
                                        <img
                                            src={menu.imageUrl}
                                            alt={menu?.name}
                                            className={`h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                                            onLoad={() => setImageLoaded(true)}
                                        />
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-24 h-24 rounded-full bg-orange-100/80 flex items-center justify-center text-5xl text-orange-300">
                                            <MdRestaurant />
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-linear-to-r from-transparent to-black/5 pointer-events-none" />
                            </div>

                            {/* Right - Content */}
                            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                                <div className="p-10 pb-8">
                                    {/* Title */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    >
                                        <h1 className="text-[2rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight">
                                            {menu?.name}
                                        </h1>
                                        {renderMetaChips()}
                                    </motion.div>

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100 my-6" />

                                    {/* Description */}
                                    {menu?.description && (
                                        <motion.div
                                            className="mb-6"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        >
                                            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">
                                                À propos
                                            </h2>
                                            <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                                <p className="text-[0.95rem] text-gray-600 leading-[1.8] whitespace-pre-line">
                                                    {menu.description}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Quantity */}
                                    {renderQuantitySelector()}

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100 my-6" />

                                    {/* Desktop CTA */}
                                    <motion.div
                                        className="flex items-center justify-between gap-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    >
                                        {/* Prix */}
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                                Total
                                            </span>
                                            <AnimatePresence mode="popLayout">
                                                <motion.div
                                                    key={totalPrice}
                                                    className="flex items-baseline gap-1"
                                                    initial={{ y: 6, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -6, opacity: 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                                >
                                                    <span className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                                                        {totalPrice.toLocaleString("fr-FR")}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-400">
                                                        FCFA
                                                    </span>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        {/* Bouton Ajouter */}
                                        <motion.button
                                            onClick={() => setShowSuggestion(true)}
                                            className="flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-2xl transition-colors duration-200 active:scale-[0.98] shadow-lg shadow-orange-200/50 group"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                                <FiShoppingBag className="w-4.5 h-4.5 text-white transition-transform duration-200 group-hover:scale-110" />
                                            </div>
                                            <span className="text-[15px] font-semibold tracking-wide whitespace-nowrap">
                                                Ajouter à ma commande
                                            </span>
                                        </motion.button>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}

            {showSuggestion && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
                        {/* En-tête */}
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-bold text-gray-900">
                                Personnalisez votre commande
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Ajoutez une note et choisissez la quantité pour{" "}
                                <span className="font-semibold">{menu?.name}</span>.
                            </p>
                        </div>

                        {/* Prix total */}
                        <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                            <span className="text-sm font-medium text-orange-700">Total</span>
                            <span className="text-lg font-bold text-orange-600">
                                {Number(menu?.price) * quantity} FCFA
                            </span>
                        </div>

                        {/* Note */}
                        <div>
                            <label
                                htmlFor="note"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Note (optionnelle)
                            </label>
                            <textarea
                                id="note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ex: sans piment, cuisson à point, sans oignons..."
                                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition"
                                rows={3}
                            />
                        </div>

                        {/* Boutons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                onClick={() => setShowSuggestion(false)}
                                className="py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition flex-1"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleAddOrder}
                                className="py-3 px-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 active:scale-[0.98] transition flex-1"
                            >
                                Ajouter à ma commande
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence >
    );
}

export default DetailsMenu;
