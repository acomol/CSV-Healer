import React, { useState } from 'react';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-600 p-4 flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Key className="w-5 h-5" />
            Enter Gemini API Key
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            To use the AI Audit feature, please provide a Google Gemini API key. 
            The cleanup features work without a key.
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(key);
                onClose();
              }}
              disabled={!key}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};