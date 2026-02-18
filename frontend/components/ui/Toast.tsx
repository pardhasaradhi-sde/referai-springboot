"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
};

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const Icon = icons[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className={`fixed top-4 right-4 z-50 max-w-md border-2 px-6 py-4 shadow-lg ${colors[type]}`}
                >
                    <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="flex-1 text-sm font-medium">{message}</p>
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                setTimeout(onClose, 300);
                            }}
                            className="flex-shrink-0 hover:opacity-70 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Toast container for managing multiple toasts
export function ToastContainer() {
    const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

    useEffect(() => {
        // Listen for custom toast events
        const handleToast = (e: CustomEvent) => {
            const { message, type } = e.detail;
            const id = Math.random().toString(36).substring(7);
            setToasts((prev) => [...prev, { id, message, type }]);
        };

        window.addEventListener("toast" as any, handleToast);
        return () => window.removeEventListener("toast" as any, handleToast);
    }, []);

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                />
            ))}
        </div>
    );
}

// Helper function to show toasts
export function showToast(message: string, type: ToastType = "info") {
    window.dispatchEvent(new CustomEvent("toast", { detail: { message, type } }));
}
