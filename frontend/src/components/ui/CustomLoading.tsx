import { useState } from "react";
import { Toaster } from "react-hot-toast";

export default function CustomLoading() {
  const [loading, setLoading] = useState(false);

  const handleToggleLoading = () => {
    setLoading(true);
    // Simulate a network request or a task
    setTimeout(() => {
      setLoading(false);
    }, 2000); // Hide the spinner after 2 seconds
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Custom Loading Spinner</h1>

      <button
        onClick={handleToggleLoading}
        className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full shadow-md hover:bg-emerald-600 transition-colors duration-300"
      >
        Show Loading Spinner
      </button>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-70 z-[9999] transition-opacity duration-300 opacity-100">
          <div className="h-16 w-16 border-4 border-t-4 border-gray-400 border-opacity-20 rounded-full animate-spin">
            <div className="absolute top-0 left-0 h-16 w-16 border-4 border-t-4 border-emerald-500 rounded-full"></div>
          </div>
        </div>
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#000",
            border: "1px solid #e5e7eb",
            padding: "12px",
          },
          success: {
            style: {
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #d1fae5",
            },
          },
          error: {
            icon: "❌",
            style: {
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
            },
          },
        }}
      />
    </div>
  );
}
