"use client";

import React, { useState } from "react";
import { Button } from "./components/button";
import { Input } from "./components/input";
import { Label } from "./components/label";
import { Loader2, Upload, CheckCircle, Download, FileSpreadsheet, X, AlertCircle } from "lucide-react";

// Error Boundary Component to Prevent Blank Page
class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ExcelProcessor() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingState, setProcessingState] = useState("idle");
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedFileUrl, setProcessedFileUrl] = useState(null);
  const [error, setError] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError("No file selected");
      return;
    }
    if (!file.name.endsWith(".xlsx")) {
      setError("Please upload a valid .xlsx file");
      return;
    }
    setUploadingFile(file);
    setUploadProgress(0);
    setError(null);

    // Simulate file upload progress
    const uploadInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          setSelectedFile(file);
          setUploadingFile(null);
          setUploadProgress(0);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadingFile(null);
    setUploadProgress(0);
    setProcessedFileUrl(null);
    setError(null);
    const fileInput = document.getElementById("file-upload");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Please select a file to process");
      return;
    }

    setProcessingState("processing");
    setError(null);
    setProcessedFileUrl(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:5001/generate-seo-descriptions", {
        method: "POST",
        body: formData,
      });

      const jsonResponse = await response.json();
      console.log("Backend response:", { status: response.status, jsonResponse });

      if (!response.ok) {
        setProcessingState("idle");
        throw new Error(jsonResponse.error || `Server error: ${response.status}`);
      }

      if (jsonResponse.error) {
        setProcessingState("idle");
        throw new Error(jsonResponse.error);
      }

      if (!jsonResponse.file) {
        setProcessingState("idle");
        throw new Error("No processed file returned from server");
      }

      const binaryString = atob(jsonResponse.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      setProcessedFileUrl(url);

      if (jsonResponse.errors && jsonResponse.errors.length > 0) {
        setError(`Some rows had issues:\n${jsonResponse.errors.join("\n")}`);
      }

      setProcessingState("completed");
    } catch (err) {
      console.error("Error processing file:", err);
      setError(err.message || "Sorry, something went wrong while processing the file. Please try again later.");
      setProcessingState("idle");
      setProcessedFileUrl(null);
    }
  };

  const handleDownload = () => {
    if (!processedFileUrl) {
      setError("No processed file available for download");
      return;
    }

    const link = document.createElement("a");
    link.href = processedFileUrl;
    link.download = "processed_" + (selectedFile?.name || "file.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadingFile(null);
    setUploadProgress(0);
    setProcessingState("idle");
    setProcessedFileUrl(null);
    setError(null);
    const fileInput = document.getElementById("file-upload");
    if (fileInput) fileInput.value = "";
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4 shadow-lg">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">SEO Product Description Generator</h1>
            <p className="text-gray-600">Upload your Excel file to generate optimized descriptions</p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div className="text-sm">
                  {error.includes("\n") ? (
                    <ul className="list-disc pl-5">
                      {error.split("\n").map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
              </div>
            )}

            {processingState === "idle" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="file-upload" className="text-lg font-medium text-gray-700">
                    Select Excel File (.xlsx)
                  </Label>
                  <div className="relative">
                    <div
                      className={`border-2 ${
                        selectedFile
                          ? "border-solid border-green-500"
                          : uploadingFile
                          ? "border-solid border-blue-500"
                          : "border-dashed border-green-300"
                      } hover:border-green-400 rounded-lg p-4 bg-white hover:bg-green-50 transition-all duration-200`}
                    >
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="cursor-pointer h-12 border-0 bg-transparent file:mr-4 file:py-3 file:px-6 file:h-10 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-500 file:text-white hover:file:bg-green-600 file:transition-all file:duration-200"
                        disabled={uploadingFile}
                      />
                      <Upload className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                    </div>
                  </div>

                  {uploadingFile && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-900 text-sm">{uploadingFile.name}</span>
                            <span className="text-blue-600 text-xs">{uploadProgress}%</span>
                          </div>
                          <div className="text-blue-600 text-xs mt-1">
                            {formatFileSize(uploadingFile.size)} • Uploading...
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {selectedFile && !uploadingFile && (
                    <div className="flex items-center justify-between gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <div>
                          <span className="font-medium text-sm block">{selectedFile.name}</span>
                          <span className="text-green-600 text-xs">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors duration-200"
                        title="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium"
                  disabled={!selectedFile || uploadingFile}
                >
                  Start Processing
                </Button>
              </form>
            )}

            {processingState === "processing" && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                  <span className="text-lg font-medium text-gray-700">Processing, please wait...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
            )}

            {processingState === "completed" && (
              <div className="text-center space-y-5">
                <div className="flex items-center justify-center space-x-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-medium">File processed successfully</span>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={handleDownload}
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Updated File
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="w-full h-10 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    Process Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default ExcelProcessor;