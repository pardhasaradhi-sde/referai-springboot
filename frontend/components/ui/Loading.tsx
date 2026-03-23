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
        <div className="min-h-screen bg-white flex flex-col pt-20 px-12 animate-pulse">
            <div className="w-48 h-10 bg-gray-200 rounded-lg mb-8" />
            <div className="w-64 h-4 bg-gray-100 rounded mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="border border-gray-100 p-6 rounded-xl">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
                        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                        <div className="h-4 bg-gray-100 rounded mb-4 w-1/2" />
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-5/6" />
                        </div>
                    </div>
                ))}
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
