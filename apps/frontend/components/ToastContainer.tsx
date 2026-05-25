"use client";

import { useAssignmentStore, ToastMessage } from "../store/useAssignmentStore";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export default function ToastContainer() {
  const toasts = useAssignmentStore((state) => state.toasts);
  const removeToast = useAssignmentStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full font-sans">
      {toasts.map((toast: ToastMessage) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-lg flex items-start space-x-3 transition-all duration-300 transform translate-y-0 scale-100 bg-white ${
              isSuccess
                ? "border-green-200 text-green-800"
                : isError
                ? "border-red-200 text-red-800"
                : "border-orange-200 text-orange-800"
            }`}
          >
            <div className="mt-0.5">
              {isSuccess ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Info className="w-5 h-5 text-brand-orange" />
              )}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
