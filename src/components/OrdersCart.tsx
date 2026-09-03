import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import { MdRestaurant } from "react-icons/md";
import type { Order } from "../interfaces/order.types";

function OrdersCart() {
    const readOrderCount = (): number => {
        try {
            const orderData = localStorage.getItem("Order");
            if (!orderData) return 0;
            const parsed: Order = JSON.parse(orderData);
            return parsed.order.length;
        } catch (error) {
            console.log(error);
            return 0;
        }
    };

    const [count, setCount] = useState<number>(readOrderCount);
    const [animKey, setAnimKey] = useState(0);
    const prevCountRef = useRef<number>(readOrderCount());

    // Petit son "ding" satisfaisant avec Web Audio API
    const playPopSound = useCallback(() => {
        try {
            const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return;
            const audioCtx = new AudioCtx();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
            setTimeout(() => audioCtx.close(), 500);
        } catch (e) {
            console.log(e)
        }
    }, []);

    const updateCount = useCallback(() => {
        const newCount = readOrderCount();
        setCount((prev) => {
            if (newCount !== prev) {
                if (newCount > prev) {
                    playPopSound();
                    setAnimKey((k) => k + 1);
                }
            }
            return newCount;
        });
    }, [playPopSound]);

    useEffect(() => {
        // Écoute l'événement personnalisé
        window.addEventListener("orderUpdated", updateCount);

        // Écoute les changements de localStorage (cross-tab ou autre)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "Order") {
                updateCount();
            }
        };
        window.addEventListener("storage", handleStorage);

        // Polling léger pour catch les changements même sans événement
        const interval = setInterval(() => {
            const current = readOrderCount();
            if (current !== prevCountRef.current) {
                prevCountRef.current = current;
                updateCount();
            }
        }, 300);

        // Aussi écouter le focus pour rattraper
        const handleFocus = () => updateCount();
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("orderUpdated", updateCount);
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", handleFocus);
            clearInterval(interval);
        };
    }, [updateCount]);

    return (
        <motion.div
            className="w-15 h-15 bg-orange-500 shadow-xl rounded-full fixed z-9999 right-5 bottom-25"
            animate={animKey > 0 ? { scale: [1, 1.15, 0.95, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
            key={animKey}
        >
            <Button
                type="button"
                className="w-full h-full flex items-center justify-center text-white relative"
            >
                <MdRestaurant size={28} />
                <AnimatePresence>
                    {count > 0 && (
                        <motion.div
                            key={`badge-${animKey}`}
                            className="absolute -top-1 -right-1 min-w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md px-1"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 1.4, 0.9, 1.1, 1],
                                opacity: 1,
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                duration: 0.5,
                                ease: "easeOut",
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
    );
}

export default OrdersCart;
