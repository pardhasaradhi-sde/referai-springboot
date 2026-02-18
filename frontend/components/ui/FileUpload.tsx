"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number; // in MB
    label?: string;
}

export function FileUpload({
    onFileSelect,
    accept = ".pdf,.doc,.docx,.txt",
    maxSize = 5,
    label = "Upload Resume",
}: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState("");

    const handleFile = (file: File) => {
        setError("");

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
            setError(`File size must be less than ${maxSize}MB`);
            return;
        }

        setSelectedFile(file);
        onFileSelect(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                {label}
            </label>

            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed p-8 text-center transition-colors ${dragActive
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
            >
                <input
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {selectedFile ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5" />
                            <div className="text-left">
                                <p className="font-medium text-sm">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                            }}
                            className="p-2 hover:bg-gray-100 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div>
                        <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm font-medium mb-1">
                            Drop your file here or click to browse
                        </p>
                        <p className="text-xs text-gray-500">
                            {accept.split(",").join(", ")} • Max {maxSize}MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
