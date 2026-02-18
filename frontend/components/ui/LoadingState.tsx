"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = "PROCESSING INTELLIGENCE..." }: LoadingStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
        >
            <div className="relative">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    <Loader2 className="w-8 h-8 text-black" />
                </motion.div>
            </div>
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400"
            >
                {message}
            </motion.p>
        </motion.div>
    );
}
