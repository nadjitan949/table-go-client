// components/Button.tsx
import type { MouseEventHandler } from "react";

interface ButtonProps {
    children: React.ReactNode;
    className?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    // Tu peux ajouter d'autres props natives si besoin
}

export default function Button({ children, className = "", onClick, type = "button", disabled = false }: ButtonProps) {
    return (
        <button
            className={`cursor-pointer ${className}`}
            onClick={onClick}
            type={type}
            disabled={disabled}
        >
            {children}
        </button>
    );
}