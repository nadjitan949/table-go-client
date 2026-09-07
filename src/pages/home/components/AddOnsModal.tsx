import { useState } from "react";
import {
    FiCheck,
    FiChevronLeft,
    FiCoffee,
    FiMinus,
    FiPlus,
    FiX,
} from "react-icons/fi";
import type { AddOnMenu, AddOnSelection } from "../../../interfaces/addon.types";
import {
    addonsSubtotal,
    formatPrice,
    getAddonQuantity,
    setAddonQuantity,
} from "../../../utils/addons";

/* ------------------------------------------------------------------ */
/* Stepper  (+ / - / quantite)                                       */
/* ------------------------------------------------------------------ */
function Stepper({
    value,
    onChange,
    size = "md",
}: {
    value: number;
    onChange: (next: number) => void;
    size?: "sm" | "md";
}) {
    const isSmall = size === "sm";
    const btnSize = isSmall ? "w-7 h-7" : "w-10 h-10";
    const btnIcon = isSmall ? "w-3.5 h-3.5" : "w-4 h-4";
    const qtyClass = isSmall ? "w-6 text-sm" : "w-9 text-lg";

    return (
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-orange-50 border border-orange-200 shadow-sm select-none">
            <button
                type="button"
                aria-label="Diminuer"
                disabled={value === 0}
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(Math.max(0, value - 1));
                }}
                className={`${btnSize} flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm transition-all duration-150 hover:border-orange-300 hover:text-orange-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
            >
                <FiMinus className={btnIcon} strokeWidth={2.5} />
            </button>

            <span className={`${qtyClass} text-center font-bold text-gray-900 tabular-nums leading-none`}>
                {value}
            </span>

            <button
                type="button"
                aria-label="Augmenter"
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(value + 1);
                }}
                className={`${btnSize} flex items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-all duration-150 hover:bg-orange-600 active:scale-90`}
            >
                <FiPlus className={btnIcon} strokeWidth={2.5} />
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Vue liste des suppléments                                         */
/* ------------------------------------------------------------------ */
function ListView(props: {
    addOns: AddOnMenu[];
    selection: AddOnSelection[];
    onSetQty: (addon: AddOnMenu, qty: number) => void;
    onClear: () => void;
    onOpenDetail: (addon: AddOnMenu) => void;
    onClose: () => void;
    onValidate: () => void;
}) {
    const { addOns, selection, onSetQty, onClear, onOpenDetail, onClose, onValidate } = props;
    const totalCount = selection.reduce((sum, s) => sum + s.quantity, 0);
    const totalAmount = addonsSubtotal(selection);

    return (
        <>
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
                <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                        Suppléments disponibles
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                        Personnalisez votre plat selon vos envies
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Fermer"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors duration-150 active:scale-90 shrink-0 ml-3"
                >
                    <FiX className="w-5 h-5" strokeWidth={2.5} />
                </button>
            </div>

            {addOns.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 mb-4">
                        <FiCoffee className="w-8 h-8" />
                    </div>
                    <p className="text-base font-semibold text-gray-900">Aucun supplément disponible</p>
                    <p className="text-sm text-gray-500 mt-1.5">
                        Ce plat ne propose pas de supplément pour le moment.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-6 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-full transition-all duration-200 active:scale-95"
                    >
                        <FiX className="w-4 h-4" strokeWidth={2.5} />
                        Fermer
                    </button>
                </div>
            ) : (
                <>
                    {/* Liste des suppléments */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-5 pb-4 space-y-2.5">
                        {addOns.map((addon, index) => {
                            const qty = getAddonQuantity(selection, addon.id);
                            const selected = qty > 0;
                            return (
                                <div
                                    key={addon.id}
                                    className={`animate-card-pop-in relative flex items-center gap-3 rounded-2xl border p-2.5 pr-3 text-left cursor-pointer transition-colors duration-200 group ${selected
                                        ? "border-orange-300 bg-orange-50/70"
                                        : "border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm"
                                        }`}
                                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                                    onClick={() => onOpenDetail(addon)}
                                >
{/* Image */}
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 shrink-0">
                                        {addon.image ? (
                                            <img
                                                src={addon.image}
                                                alt={addon.name}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-orange-300">
                                                <FiCoffee className="w-7 h-7" />
                                            </div>
                                        )}
                                        {selected && (
                                            <div className="animate-check-pop absolute top-1 left-1 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                                                <FiCheck className="w-3 h-3" strokeWidth={3.5} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Infos */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-gray-900 truncate">
                                            {addon.name}
                                        </p>
                                        <p className="text-sm font-bold text-orange-600 mt-0.5 tabular-nums">
                                            {formatPrice(addon.price)}
                                        </p>
                                        {addon.description && (
                                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                                {addon.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Quantité */}
                                    <div className="shrink-0">
                                        {qty === 0 ? (
                                            <button
                                                type="button"
                                                aria-label={`Ajouter ${addon.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSetQty(addon, 1);
                                                }}
                                                className="w-10 h-10 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-200/70 flex items-center justify-center hover:bg-orange-600 transition-colors duration-150 active:scale-90"
                                            >
                                                <FiPlus className="w-5 h-5" strokeWidth={2.5} />
                                            </button>
                                        ) : (
                                            <Stepper
                                                value={qty}
                                                onChange={(next) => onSetQty(addon, next)}
                                                size="sm"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
{/* Pied (total + valider) */}
                    <div className="border-t border-gray-100 px-5 pt-3 pb-6 bg-white shrink-0">
                        <div className="flex items-end justify-between mb-3">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Total
                                    {totalCount > 0 && (
                                        <span> · {totalCount} {totalCount > 1 ? "articles" : "article"}</span>
                                    )}
                                </p>
                                <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                                    {formatPrice(totalAmount)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClear}
                                disabled={totalCount === 0}
                                className={`text-sm font-medium transition-colors duration-150 active:scale-95 ${totalCount > 0
                                    ? "text-gray-400 hover:text-red-500"
                                    : "text-gray-300 cursor-not-allowed"
                                    }`}
                            >
                                Tout retirer
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onValidate}
                            className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-200/60 transition-all duration-200 active:scale-[0.98]"
                        >
                            <FiCheck className="w-5 h-5" strokeWidth={2.5} />
                            Valider les suppléments
                            {totalCount > 0 && (
                                <span className="min-w-7 h-6 px-1.5 flex items-center justify-center rounded-full bg-white/25 text-sm font-bold">
                                    {totalCount}
                                </span>
                            )}
                        </button>
                    </div>
                </>
            )}
        </>
    );
}
/* ------------------------------------------------------------------ */
/* Vue détail d'un supplément                                        */
/* ------------------------------------------------------------------ */
function DetailView(props: {
    addon: AddOnMenu;
    initialQty: number;
    onBack: () => void;
    onApply: (qty: number) => void;
}) {
    const { addon, initialQty, onBack, onApply } = props;
    const [qty, setQty] = useState<number>(initialQty);

    return (
        <>
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 pt-2 pb-2 shrink-0">
                <button
                    type="button"
                    aria-label="Retour à la liste"
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150 active:scale-90"
                >
                    <FiChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <p className="text-sm font-semibold text-gray-500">Détail du supplément</p>
                <button
                    type="button"
                    aria-label="Fermer"
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors duration-150 active:scale-90"
                >
                    <FiX className="w-5 h-5" strokeWidth={2.5} />
                </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar">
                <div className="px-5 pt-4">
                    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50">
                        {addon.image ? (
                            <img src={addon.image} alt={addon.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <FiCoffee className="w-20 h-20 text-orange-300" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-5 pt-4 pb-6">
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        {addon.name}
                    </h3>
                    <p className="text-lg font-bold text-orange-600 mt-1.5 tabular-nums">
                        {formatPrice(addon.price)}
                    </p>
                    <p className="text-[0.95rem] text-gray-600 leading-relaxed mt-3 whitespace-pre-line">
                        {addon.description || "Aucune description pour ce supplément."}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Quantité</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                                {(Number(addon.price) * Math.max(qty, 0)).toLocaleString("fr-FR")} FCFA
                            </p>
                        </div>
                        <Stepper value={qty} onChange={setQty} size="md" />
                    </div>
                </div>
            </div>

            {/* Pied */}
            <div className="border-t border-gray-100 px-5 pt-3 pb-6 bg-white shrink-0">
                <button
                    type="button"
                    onClick={() => onApply(qty)}
                    className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-200/60 transition-all duration-200 active:scale-[0.98]"
                >
                    <FiCheck className="w-5 h-5" strokeWidth={2.5} />
                    Valider
                    {qty > 0 && (
                        <span className="min-w-7 h-6 px-1.5 flex items-center justify-center rounded-full bg-white/25 text-sm font-bold">
                            {qty}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
/* ------------------------------------------------------------------ */
/* Modal principal (feuille mobile / fenêtre desktop)                */
/* ------------------------------------------------------------------ */
interface AddOnsModalProps {
    addOns: AddOnMenu[];
    initialSelection: AddOnSelection[];
    onClose: () => void;
    onValidate: (selection: AddOnSelection[]) => void;
}

/**
 * Rendu 100% conditionnel : le parent monte ce composant uniquement
 * quand il est ouvert (`{showAddOns && <AddOnsModal ... />}`).
 * Pas de portal, pas de bibliothèque d'animation → aucune manipulation DOM
 * risquée à la fermeture (fini le NotFoundError de removeChild).
 */
export default function AddOnsModal({
    addOns,
    initialSelection,
    onClose,
    onValidate,
}: AddOnsModalProps) {
    const [selection, setSelection] = useState<AddOnSelection[]>(initialSelection);
    const [detailAddon, setDetailAddon] = useState<AddOnMenu | null>(null);
    const [isClosing, setIsClosing] = useState<boolean>(false);

    const handleValidate = () => {
        onValidate(selection);
        animateClose();
    };

    const animateClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 250);
    };

    return (
        <>
            {/* Fond assombri */}
            <div
                className={`fixed inset-0 z-120 bg-black/60 animate-modal-fade-in ${isClosing ? "animate-modal-fade-out" : ""}`}
                onClick={animateClose}
            />
            {/* Panneau */}
            <div className="fixed inset-0 z-121 flex items-end justify-center sm:items-center sm:p-4 pointer-events-none">
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`pointer-events-auto relative w-full sm:max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] ${isClosing ? "animate-modal-pop-out" : "animate-modal-slide-up sm:animate-modal-pop-in"}`}
                    style={{ maxHeight: "min(88vh, 760px)" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Poignée mobile */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                        <div className="w-10 h-1.5 rounded-full bg-gray-200" />
                    </div>

                    {detailAddon ? (
                        <div
                            key={`detail-${detailAddon.id}`}
                            className="flex flex-col min-h-0 flex-1 animate-slide-in-right"
                        >
                            <DetailView
                                addon={detailAddon}
                                initialQty={getAddonQuantity(selection, detailAddon.id)}
                                onBack={() => setDetailAddon(null)}
                                onApply={(qty) => {
                                    setSelection((prev) => setAddonQuantity(prev, detailAddon, qty));
                                    setDetailAddon(null);
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            key="list"
                            className="flex flex-col min-h-0 flex-1 animate-slide-in-left"
                        >
                            <ListView
                                addOns={addOns}
                                selection={selection}
                                onSetQty={(addon, qty) =>
                                    setSelection((prev) => setAddonQuantity(prev, addon, qty))
                                }
                                onClear={() => setSelection([])}
                                onOpenDetail={(addon) => setDetailAddon(addon)}
                                onClose={animateClose}
                                onValidate={handleValidate}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}