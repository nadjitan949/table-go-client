import React, { useEffect, useState, useRef } from "react";
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
    FiEdit3,
    FiCoffee,
} from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../../ui/Button";
import type { OrderItems } from "../../../interfaces/orderItems.types";
import type { AddOnSelection } from "../../../interfaces/addon.types";
import { createOrderId, findActiveOrder, readOrders, writeOrders } from "../../../utils/ordersStorage";
import { addonsSubtotal, toOrderAddons } from "../../../utils/addons";
import AddOnsModal from "./AddOnsModal";
import ErrorBoundary from "../../../components/ErrorBoundary";

function DetailsMenu() {
    const { id, token } = useParams<{ id: string; token: string }>()
    const [menu, setMenu] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [quantity, setQuantity] = useState<number>(1);
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);
    const [showSuggestion, setShowSuggestion] = useState<boolean>(false)
    const [note, setNote] = useState<string | "">("")
    const [addOnSelection, setAddOnSelection] = useState<AddOnSelection[]>([])
    const [showAddOns, setShowAddOns] = useState<boolean>(false)
    const [suggestionClosing, setSuggestionClosing] = useState<boolean>(false)
    const scrollRef = useRef<HTMLDivElement>(null);

    const imageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const updateImage = () => {
            const progress = Math.min(el.scrollTop / 300, 1);
            const scale = 1 + progress * 0.15;
            const y = progress * 60;
            if (imageRef.current) {
                imageRef.current.style.transform = `scale(${scale}) translateY(${y}px)`;
            }
        };
        updateImage();
        el.addEventListener("scroll", updateImage, { passive: true });
        return () => el.removeEventListener("scroll", updateImage);
    }, []);

    const navigate = useNavigate()
    const goBack = () => navigate(-1)

    const openAddOnsModal = () => {
        setShowAddOns(true)
    }

    const closeSuggestion = () => {
        setSuggestionClosing(true)
        setTimeout(() => {
            setShowSuggestion(false)
            setSuggestionClosing(false)
        }, 260)
    }

    useEffect(() => {
        async function fetchMenuDetails() {
            setIsLoading(true);
            setImageLoaded(false);
            setQuantity(1);
            setAddOnSelection([]);
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

    const selectedAddOnCount = addOnSelection.reduce((sum, s) => sum + s.quantity, 0);
    const addOnsCost = addonsSubtotal(addOnSelection);
    const totalPrice = (menu ? quantity * Number(menu.price) : 0) + addOnsCost;
    const unitPrice = menu ? Math.round(Number(menu.price)) : 0;

    function handleAddOrder() {
        try {
            if (!token) return;
            if (!menu?.id) return;

            const baseOrderItem: OrderItems = {
                menuId: Number(menu.id),
                note: note,
                addon: toOrderAddons(addOnSelection),
                status: "pending"
            };

            const newItems = Array.from({ length: quantity }, () => ({ ...baseOrderItem }));

            // Lecture des commandes existantes
            const orders = readOrders();

            // S'il existe une commande en cours (brouillon) pour cette table, on ajoute dedans.
            // Sinon on crée une nouvelle commande.
            const activeOrder = findActiveOrder(orders, token);

            const updatedOrders = activeOrder
                ? orders.map((o) =>
                      o.id === activeOrder.id
                          ? { ...o, order: [...o.order, ...newItems] }
                          : o
                  )
                : [
                      ...orders,
                      {
                          id: createOrderId(),
                          tableToken: token,
                          order: [...newItems],
                          locked: false,
                          createdAt: Date.now(),
                      },
                  ];

            writeOrders(updatedOrders);

            console.log("Commande enregistrée :", updatedOrders);
            closeSuggestion();
        } catch (error) {
            console.log(error);
        }
    }
    // --- Shared image loader ---
    const renderImage = (className: string) => (
        <div className={`relative overflow-hidden ${className}`}>
            <div
                ref={imageRef}
                className="absolute inset-0 w-full h-full will-change-transform"
            >
                {isLoading ? (
                    <div className="h-full w-full skeleton-block" />
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
            </div>
            <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-r from-black/10 via-transparent to-black/10 pointer-events-none" />
        </div>
    );

    // --- Shared quantity selector ---
    const renderQuantitySelector = () => (
        <div
            className="pt-2 animate-fade-up"
            style={{ animationDelay: "0.35s" }}
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
                    <button
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 active:scale-90 transition-all duration-150 shadow-sm"
                        aria-label="Diminuer"
                        disabled={quantity <= 1}
                    >
                        <FiMinus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setQuantity((prev) => prev + 1)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-90 transition-all duration-150 shadow-sm"
                        aria-label="Augmenter"
                    >
                        <FiPlus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
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
        <>
            {id && (
                <>
                    {/* ======================== */}
                    {/* MOBILE LAYOUT (< lg)     */}
                    {/* ======================== */}
                    <div
                        className="fixed inset-0 z-100 bg-black lg:hidden animate-modal-fade-in"
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
                                    {isLoading ? (
                                        <div className="pt-2 pb-4 space-y-4">
                                            <div className="skeleton-block h-7 w-3/4" />
                                            <div className="flex items-center gap-2.5">
                                                <div className="skeleton-block h-9 w-28 rounded-full" />
                                                <div className="skeleton-block h-9 w-24 rounded-full" />
                                            </div>
                                            <div className="skeleton-block h-4 w-1/2" />
                                            <div className="skeleton-block h-16 w-full" />
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="pt-2 pb-4 animate-fade-up"
                                                style={{ animationDelay: "0.15s" }}
                                            >
                                                <h1 className="text-[1.7rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight">
                                                    {menu?.name}
                                                </h1>
                                                {renderMetaChips()}
                                            </div>

                                            {menu?.description && (
                                                <div
                                                    className="py-5 animate-fade-up"
                                                    style={{ animationDelay: "0.25s" }}
                                                >
                                                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2.5">
                                                        À propos
                                                    </h2>
                                                    <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                                                        <p className="text-[0.95rem] text-gray-600 leading-[1.7] whitespace-pre-line">
                                                            {menu.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {renderQuantitySelector()}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Back Button */}
                        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                            <div className="flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] h-14">
                                <button
                                    onClick={goBack}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-white/50 text-gray-700 hover:bg-white active:scale-90 transition-all shadow-lg shadow-black/10 pointer-events-auto"
                                    aria-label="Retour"
                                >
                                    <FiChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                                <div className="w-10" />
                            </div>
                        </div>

                        {/* Fixed Bottom CTA */}
                        <div
                            className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
                        >
                            <div className="bg-white pt-10 pb-[calc(env(safe-area-inset-bottom)+16px)] px-5 pointer-events-auto">
                                <div
                                    className="flex items-stretch justify-between"
                                >
                                    {/* Prix Total */}
                                    <div
                                        className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-full px-4 min-w-25"
                                    >
                                        <div
                                            key={totalPrice}
                                            className="flex flex-col items-center animate-price-rise"
                                        >
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-lg font-extrabold text-gray-900 tabular-nums tracking-tight">
                                                    {totalPrice.toLocaleString("fr-FR")}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    FCFA
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bouton Ajouter */}
                                    <button
                                        onClick={() => setShowSuggestion(true)}
                                        className="flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 active:scale-[0.98] group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                            <FiShoppingBag className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-110" />
                                        </div>
                                        <span className="text-[15px] font-semibold tracking-wide whitespace-nowrap">
                                            Ajouter
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ======================== */}
                    {/* DESKTOP LAYOUT (lg+)     */}
                    {/* ======================== */}
                    <div
                        className="hidden lg:flex fixed bg-white inset-0 z-100 items-center justify-center animate-modal-fade-in"
                    >
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0"
                            onClick={goBack}
                        />

                        {/* Modal */}
                        <div
                            className="relative w-full max-w-5xl max-h-[90vh] bg-white overflow-hidden flex animate-modal-pop-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={goBack}
                                className="absolute top-5 right-5 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-gray-500 hover:text-gray-900 hover:bg-white transition-all duration-200 shadow-lg shadow-black/10 hover:scale-110 hover:rotate-90 active:scale-95"
                                aria-label="Fermer"
                            >
                                <FiX className="w-5 h-5" strokeWidth={2.5} />
                            </button>

                            {/* Left - Image */}
                            <div className="relative w-[45%] shrink-0 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50">
                                {isLoading ? (
                                    <div className="h-full w-full skeleton-block" />
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
                                    {isLoading ? (
                                        <div className="space-y-4">
                                            <div className="skeleton-block h-8 w-2/3" />
                                            <div className="flex items-center gap-2.5">
                                                <div className="skeleton-block h-9 w-28 rounded-full" />
                                                <div className="skeleton-block h-9 w-24 rounded-full" />
                                            </div>
                                            <div className="skeleton-block h-4 w-full" />
                                            <div className="skeleton-block h-20 w-full" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Title */}
                                            <div
                                                className="animate-fade-up"
                                                style={{ animationDelay: "0.1s" }}
                                            >
                                                <h1 className="text-[2rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight">
                                                    {menu?.name}
                                                </h1>
                                                {renderMetaChips()}
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px bg-gray-100 my-6" />

                                            {/* Description */}
                                            {menu?.description && (
                                                <div
                                                    className="mb-6 animate-fade-up"
                                                    style={{ animationDelay: "0.2s" }}
                                                >
                                                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">
                                                        À propos
                                                    </h2>
                                                    <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                                        <p className="text-[0.95rem] text-gray-600 leading-[1.8] whitespace-pre-line">
                                                            {menu.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quantity */}
                                            {renderQuantitySelector()}
                                        </>
                                    )}

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100 my-6" />

                                    {/* Desktop CTA */}
                                    <div
                                        className="flex items-center justify-between gap-4 animate-fade-up"
                                        style={{ animationDelay: "0.4s" }}
                                    >
                                        {/* Prix */}
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                                Total
                                            </span>
                                            <div
                                                key={totalPrice}
                                                className="flex items-baseline gap-1 animate-price-rise"
                                            >
                                                <span className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                                                    {totalPrice.toLocaleString("fr-FR")}
                                                </span>
                                                <span className="text-sm font-bold text-gray-400">
                                                    FCFA
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bouton Ajouter */}
                                        <button
                                            onClick={() => setShowSuggestion(true)}
                                            className="flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-2xl transition-colors duration-200 active:scale-[0.98] shadow-lg shadow-orange-200/50 group"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                                <FiShoppingBag className="w-4.5 h-4.5 text-white transition-transform duration-200 group-hover:scale-110" />
                                            </div>
                                            <span className="text-[15px] font-semibold tracking-wide whitespace-nowrap">
                                                Ajouter
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {(showSuggestion || suggestionClosing) && (
                <ErrorBoundary>
                    <div key="suggestion-modal" className={`fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-fade-in ${suggestionClosing ? "animate-modal-fade-out" : ""}`}>
                        <div className={`w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-modal-pop-in ${suggestionClosing ? "animate-modal-pop-out" : ""}`}>
                            {/* En-tête */}
                            <div className="text-center sm:text-left">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Personnalisez votre commande
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Ajoutez une note et choisissez la quantité pour{" "} <br />
                                    <span className="font-semibold">{menu?.name}</span>.
                                </p>
                            </div>

                            {/* Prix total */}
                            <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-medium text-orange-700">Total</span>
                                    {addOnsCost > 0 && (
                                        <span className="block text-[11px] text-orange-500/80">
                                            dont {addOnsCost.toLocaleString("fr-FR")} FCFA de suppléments
                                        </span>
                                    )}
                                </div>
                                <span className="text-lg font-bold text-orange-600 tabular-nums">
                                    {totalPrice.toLocaleString("fr-FR")} FCFA
                                </span>
                            </div>

                            {/* Suppléments */}
                            {menu && menu.AddOns && menu.AddOns.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-800 shrink-0">Suppléments</h3>
                                            {selectedAddOnCount > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                                                    {selectedAddOnCount} choisi{selectedAddOnCount > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={openAddOnsModal}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 active:scale-95 transition-all duration-150 shrink-0"
                                        >
                                            {addOnSelection.length > 0 ? (
                                                <React.Fragment key="edit">
                                                    <FiEdit3 className="w-4 h-4" />
                                                    Modifier
                                                </React.Fragment>
                                            ) : (
                                                <React.Fragment key="see">
                                                    <FiPlus className="w-4 h-4" strokeWidth={2.5} />
                                                    Voir les suppléments
                                                </React.Fragment>
                                            )}
                                        </Button>
                                    </div>

                                    {addOnSelection.length > 0 ? (
                                        <div className="max-h-40 overflow-y-auto no-scrollbar -mr-2 pr-2 space-y-2">
                                            {addOnSelection.map(({ addon, quantity: qty }) => (
                                                <div
                                                    key={addon.id}
                                                    onClick={openAddOnsModal}
                                                    className="flex items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-xl px-3 py-2.5 cursor-pointer active:scale-[0.99] transition-all duration-150"
                                                >
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0">
                                                        {addon.image ? (
                                                            <img src={addon.image} alt={addon.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-orange-300">
                                                                <FiCoffee className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{addon.name}</p>
                                                        <p className="text-xs text-gray-500">× {qty}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-orange-700 tabular-nums shrink-0">
                                                        {(Number(addon.price) * qty).toLocaleString("fr-FR")} FCFA
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3">
                                            Aucun supplément sélectionné pour le moment.
                                        </p>
                                    )}
                                </div>
                            )}

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
                            <div className="flex sm:flex-row gap-3">
                                <Button
                                    type="button"
                                    onClick={closeSuggestion}
                                    className="py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition flex-1"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    onClick={handleAddOrder}
                                    className="py-3 px-4 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 active:scale-[0.98] transition flex-1"
                                >
                                    + Ajouter
                                </Button>
                            </div>
                        </div>
                    </div>
                </ErrorBoundary>
            )}
            {showAddOns && (
                <AddOnsModal
                    addOns={menu?.AddOns ?? []}
                    initialSelection={addOnSelection}
                    onValidate={(selection) => setAddOnSelection(selection)}
                    onClose={() => setShowAddOns(false)}
                />
            )}
        </>
    );
}

export default DetailsMenu;
