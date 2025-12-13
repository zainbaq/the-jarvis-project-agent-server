import React, { useState, useEffect } from "react";
import { Settings, X } from "lucide-react";

interface BackendConfigProps {
  onUrlChange: (url: string) => void;
}

export function BackendConfig({
  onUrlChange,
}: BackendConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const saved =
      localStorage.getItem("jarvis_backend_url") ||
      "http://127.0.0.1:8000";
    const demo =
      localStorage.getItem("jarvis_demo_mode") === "true";
    setUrl(saved);
    setIsDemoMode(demo);
    onUrlChange(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem("jarvis_backend_url", url);
    localStorage.setItem("jarvis_demo_mode", "false"); // Disable demo mode when saving URL
    onUrlChange(url);
    setIsOpen(false);
    window.location.reload(); // Reload to apply new URL
  };

  const toggleDemoMode = () => {
    const newDemoMode = !isDemoMode;
    localStorage.setItem(
      "jarvis_demo_mode",
      String(newDemoMode),
    );
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl shadow-2xl max-w-lg w-full border border-white/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-white">
              Backend Configuration
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          <div className="mb-5">
            <label className="block text-sm mb-2 text-gray-300">
              Backend URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="https://your-ngrok-url.ngrok.io"
            />
            <p className="text-xs text-gray-400 mt-2">
              Enter your backend server URL (must be HTTPS or
              use ngrok)
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-5 text-xs">
            <p className="text-blue-300 mb-2">
              <strong>Using ngrok (recommended):</strong>
            </p>
            <pre className="bg-black/40 text-gray-200 p-3 rounded-lg overflow-x-auto mb-2">
              ngrok http 8000
            </pre>
            <p className="text-blue-400/70">
              Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
              and paste above
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center"
            >
              Save & Reload
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 border border-white/20 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}