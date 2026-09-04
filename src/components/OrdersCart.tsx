import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import { MdRestaurant } from "react-icons/md";
import type { Order } from "../interfaces/order.types";

type OnboardingStep = 0 | 1 | 2;

const ONBOARDING_STORAGE_KEY = "ordersCart_onboardingSeen";
const ORDER_STORAGE_KEY = "Order";
const TIMEOUT_DURATION_MS = 1 * 60 * 1000;

function OrdersCart() {
    // ---- Lecture du nombre de commandes ----
    const readOrderCount = useCallback((): number => {
        try {
            const orderData = localStorage.getItem(ORDER_STORAGE_KEY);
            if (!orderData) return 0;
            const parsed: Order = JSON.parse(orderData);
            return parsed.order.length;
        } catch (error) {
            console.log(error);
            return 0;
        }
    }, []);

    // ---- États et refs ----
    const [count, setCount] = useState<number>(readOrderCount);
    const [bounce, setBounce] = useState(false);
    const prevCountRef = useRef<number>(readOrderCount());

    // Timer pour effacer le panier après inactivité
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fonction pour effacer la commande et notifier
    const clearOrderAfterTimeout = useCallback(() => {
        localStorage.removeItem(ORDER_STORAGE_KEY);
        window.dispatchEvent(new Event("orderUpdated"));
    }, []);

    // Réinitialise le minuteur si le panier n'est pas vide
    const resetOrderTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            clearOrderAfterTimeout();
            timerRef.current = null;
        }, TIMEOUT_DURATION_MS);
    }, [clearOrderAfterTimeout]);

    // ---- Onboarding (inchangé) ----
    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(0);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const wasVisibleRef = useRef(false);

    // ---- Mise à jour du compteur ----
    const updateCount = useCallback(() => {
        const newCount = readOrderCount();
        setCount((prev) => {
            if (newCount !== prev) {
                if (newCount > prev) {
                    setBounce(true);
                    setTimeout(() => setBounce(false), 500);
                    // Si un nouvel article est ajouté, on réinitialise le timer
                    if (newCount > 0) {
                        resetOrderTimer();
                    }
                }
            }
            return newCount;
        });
    }, [readOrderCount, resetOrderTimer]);

    // ---- Effets : abonnements + minuteur initial ----
    useEffect(() => {
        window.addEventListener("orderUpdated", updateCount);

        const handleStorage = (e: StorageEvent) => {
            if (e.key === ORDER_STORAGE_KEY) {
                updateCount();
            }
        };
        window.addEventListener("storage", handleStorage);

        const interval = setInterval(() => {
            const current = readOrderCount();
            if (current !== prevCountRef.current) {
                prevCountRef.current = current;
                updateCount();
            }
        }, 300);

        const handleFocus = () => updateCount();
        window.addEventListener("focus", handleFocus);

        // Démarre le minuteur si une commande existe déjà au montage
        if (readOrderCount() > 0) {
            resetOrderTimer();
        }

        return () => {
            window.removeEventListener("orderUpdated", updateCount);
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", handleFocus);
            clearInterval(interval);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [updateCount, readOrderCount, resetOrderTimer]);

    // Séquence onboarding (inchangée)
    useEffect(() => {
        const isVisible = count > 0;
        const justBecameVisible = isVisible && !wasVisibleRef.current;
        const justBecameHidden = !isVisible && wasVisibleRef.current;
        wasVisibleRef.current = isVisible;

        if (justBecameHidden) {
            localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }

        if (!justBecameVisible) return;
        if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;

        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => setOnboardingStep(1), 100));
        timers.push(setTimeout(() => setOnboardingStep(0), 5000));
        timers.push(setTimeout(() => setOnboardingStep(2), 6000));
        timers.push(setTimeout(() => {
            setOnboardingStep(0);
            localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
        }, 11000));

        return () => timers.forEach(clearTimeout);
    }, [count]);

    const bubbleMessages: Record<OnboardingStep, string> = {
        0: "",
        1: "Cliquez ici pour suivre l'état de vos commandes 👆",
        2: "Astuce : vous pouvez déplacer ce bouton où vous voulez ✋",
    };

    return (
        <>
            {count > 0 && (
                <div
                    ref={constraintsRef}
                    className="fixed inset-4 z-9999 pointer-events-none"
                >
                    <motion.div
                        className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-auto"
                        style={{ touchAction: "none" }}
                        drag
                        dragConstraints={constraintsRef}
                        dragElastic={0.05}
                        dragMomentum={false}
                        whileDrag={{ scale: 1.08, cursor: "grabbing" }}
                        onDragStart={() => setOnboardingStep(0)}
                    >
                        <AnimatePresence mode="wait">
                            {onboardingStep > 0 && (
                                <motion.div
                                    key={`bubble-${onboardingStep}`}
                                    initial={{ opacity: 0, x: 15, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 15, scale: 0.9 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="absolute right-full top-1/2 -translate-y-1/2 mr-4 pointer-events-none max-w-[calc(90vw-6rem)] sm:max-w-[320px]"
                                >
                                    <div className="relative bg-white text-gray-800 text-[13px] font-medium px-4 py-2.5 rounded-2xl shadow-xl shadow-black/10 border border-gray-100 whitespace-normal wrap-break-words w-max max-w-full">
                                        {bubbleMessages[onboardingStep]}
                                        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            className="w-15 h-15 bg-orange-500 shadow-xl rounded-full cursor-grab active:cursor-grabbing"
                            animate={bounce ? { scale: [1, 1.18, 0.92, 1.05, 1] } : { scale: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                        >
                            <Button
                                type="button"
                                onClick={() => alert("Page hein")}
                                className="w-full h-full flex items-center justify-center text-white relative"
                            >
                                <MdRestaurant size={28} />
                                <AnimatePresence>
                                    {count > 0 && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 min-w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md px-1"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 25,
                                            }}
                                        >
                                            <motion.span
                                                key={count}
                                                initial={{ y: -8, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                            >
                                                {count}
                                            </motion.span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

export default OrdersCart;