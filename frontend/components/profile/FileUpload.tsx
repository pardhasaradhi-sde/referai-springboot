"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { UploadResumeResponse } from "@/lib/api/types";

interface FileUploadProps {
  onUploadSuccess: (extractedText: string, fileUrl: string, fileName: string) => void;
  currentFileName?: string;
}

export function FileUpload({ onUploadSuccess, currentFileName }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(currentFileName || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus("error");
        setErrorMessage("File size must be less than 5MB");
        return;
      }

      // Validate file type
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!validTypes.includes(file.type)) {
        setUploadStatus("error");
        setErrorMessage("Only PDF and DOCX files are supported");
        return;
      }

      setUploading(true);
      setUploadStatus("idle");
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const token = localStorage.getItem("referai_token");
        
        if (!token) {
          throw new Error("Not authenticated. Please log in again.");
        }

        const response = await fetch(`${apiUrl}/api/profiles/upload-resume`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Upload failed with status ${response.status}`);
        }

        const result: UploadResumeResponse = await response.json();

        if (result.success && result.extractedText && result.fileUrl && result.fileName) {
          setUploadStatus("success");
          setUploadedFile(result.fileName);
          onUploadSuccess(result.extractedText, result.fileUrl, result.fileName);
        } else {
          setUploadStatus("error");
          setErrorMessage(result.error || "Upload failed");
        }
      } catch (error) {
        setUploadStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-black bg-gray-50"
            : uploadStatus === "success"
            ? "border-green-500 bg-green-50"
            : uploadStatus === "error"
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
              <p className="text-sm font-bold uppercase tracking-widest">Uploading & Extracting...</p>
            </>
          ) : uploadStatus === "success" ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-sm font-bold uppercase tracking-widest text-green-600">Upload Successful!</p>
              {uploadedFile && (
                <p className="text-xs text-gray-600">
                  <FileText className="w-4 h-4 inline mr-1" />
                  {uploadedFile}
                </p>
              )}
            </>
          ) : uploadStatus === "error" ? (
            <>
              <XCircle className="w-12 h-12 text-red-600" />
              <p className="text-sm font-bold uppercase tracking-widest text-red-600">Upload Failed</p>
              <p className="text-xs text-red-600">{errorMessage}</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-sm font-bold uppercase tracking-widest">
                {isDragActive ? "Drop file here" : "Drag & drop resume or click to browse"}
              </p>
              <p className="text-xs text-gray-500">PDF or DOCX • Max 5MB</p>
              {uploadedFile && (
                <p className="text-xs text-gray-600 mt-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Current: {uploadedFile}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      
      {uploadStatus === "success" && (
        <div className="text-xs text-gray-600 bg-green-50 border border-green-200 p-3">
          ✓ Text extracted successfully. You can edit it below if needed.
        </div>
      )}
    </div>
  );
}
