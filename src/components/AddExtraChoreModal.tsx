"use client";

import { useState, useEffect } from "react";
import { formatJPY } from "@/lib/dateUtils";

interface Chore {
  id: number;
  name: string;
  amount: number;
  description?: string | null;
}

interface AddExtraChoreModalProps {
  date: string;
  existingChoreIds: number[];
  onAdd: (choreId: number) => void;
  onClose: () => void;
}

export default function AddExtraChoreModal({ date, existingChoreIds, onAdd, onClose }: AddExtraChoreModalProps) {
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    fetch("/api/chores")
      .then(r => r.json())
      .then(data => setChores(data.filter((c: Chore & { isActive: boolean }) => c.isActive)));
  }, []);

  const available = chores.filter(c => !existingChoreIds.includes(c.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">お手伝いを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-96 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-gray-500 text-center py-4">追加できるお手伝いはありません</p>
          ) : (
            <div className="space-y-2">
              {available.map(chore => (
                <button
                  key={chore.id}
                  onClick={() => { onAdd(chore.id); onClose(); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div>
                    <div className="font-medium text-gray-800">{chore.name}</div>
                    {chore.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{chore.description}</div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{formatJPY(chore.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
