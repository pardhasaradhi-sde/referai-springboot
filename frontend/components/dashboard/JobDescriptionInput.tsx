"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import type { ExtractJdResponse } from "@/lib/api/types";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onExtractSuccess?: (data: ExtractJdResponse) => void;
}

export function JobDescriptionInput({ value, onChange, onExtractSuccess }: JobDescriptionInputProps) {
  const [isUrl, setIsUrl] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<"idle" | "success" | "error">("idle");
  const [extractedSource, setExtractedSource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const urlPattern = /^https?:\/\//i;
    setIsUrl(urlPattern.test(value.trim()));
  }, [value]);

  const handleExtract = async () => {
    if (!isUrl || !value.trim()) return;

    setExtracting(true);
    setExtractStatus("idle");
    setErrorMessage("");
    setExtractedSource(null);

    try {
      const result = await api.post<ExtractJdResponse>("/api/matching/extract-jd", {
        input: value.trim(),
      });

      if (result.success && result.description) {
        setExtractStatus("success");
        setExtractedSource(result.source || "URL");
        onChange(result.description);
        
        if (onExtractSuccess) {
          onExtractSuccess(result);
        }
      } else {
        setExtractStatus("error");
        setErrorMessage(result.fallbackMessage || result.error || "Extraction failed");
      }
    } catch (error) {
      setExtractStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
          Job Description *
        </label>
        
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setExtractStatus("idle");
            setExtractedSource(null);
          }}
          placeholder="Paste any job URL (company careers pages, LinkedIn, Indeed, etc.) or full job description..."
          rows={16}
          className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none resize-none"
        />

        {isUrl && extractStatus === "idle" && !extracting && (
          <div className="absolute top-12 right-3">
            <button
              onClick={handleExtract}
              className="flex items-center gap-2 px-3 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              Extract from URL
            </button>
          </div>
        )}

        {extracting && (
          <div className="absolute top-12 right-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-xs font-bold uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting...
            </div>
          </div>
        )}
      </div>

      {extractStatus === "success" && extractedSource && (
        <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 p-3 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span className="font-bold uppercase tracking-widest">
            Extracted from {extractedSource}
          </span>
        </div>
      )}

      {extractStatus === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 p-3 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-bold uppercase tracking-widest">Extraction Failed</span>
          </div>
          <p className="text-xs text-red-600">{errorMessage}</p>
          <p className="text-xs text-gray-600">
            Please copy and paste the job description manually.
          </p>
        </div>
      )}

      {isUrl && extractStatus === "idle" && !extracting && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 p-3">
          <LinkIcon className="w-4 h-4" />
          <span>
            URL detected! Click &quot;Extract from URL&quot; to automatically fetch the job description.
          </span>
        </div>
      )}
    </div>
  );
}
