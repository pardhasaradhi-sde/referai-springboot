"use client";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizes = {
        sm: "w-4 h-4 border-2",
        md: "w-8 h-8 border-3",
        lg: "w-12 h-12 border-4",
    };

    return (
        <div className={`${sizes[size]} border-gray-200 border-t-black rounded-full animate-spin`} />
    );
}

export function LoadingPage() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                    Loading...
                </p>
            </div>
        </div>
    );
}

export function LoadingCard() {
    return (
        <div className="border border-gray-200 p-6 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-4" />
            <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
            <div className="h-4 bg-gray-200 rounded mb-4 w-1/2" />
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
        </div>
    );
}
