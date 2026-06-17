"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentMonthRange } from "@/lib/dateUtils";
import { useRole } from "@/lib/useRole";

const STORAGE_KEY = "optis_lunch_seen_at";

interface LunchTx {
  id: number;
  imageUrl: string | null;
  createdAt: string;
}

export default function LunchPhotoAlert() {
  const { role, mounted } = useRole();
  const [newCount, setNewCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!mounted || role !== "PARENT") return;

    const { start, end } = currentMonthRange();
    fetch(`/api/transactions?category=昼食&startDate=${start}&endDate=${end}`)
      .then(r => r.json())
      .then((txs: LunchTx[]) => {
        const photos = txs.filter(t => t.imageUrl);
        const seenAt = localStorage.getItem(STORAGE_KEY);
        if (!seenAt) {
          // First visit: initialize silently, no banner
          localStorage.setItem(STORAGE_KEY, new Date().toISOString());
          return;
        }
        const count = photos.filter(p => new Date(p.createdAt) > new Date(seenAt)).length;
        setNewCount(count);
      })
      .catch(() => {});
  }, [mounted, role]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setNewCount(0);
  }

  function handleTap() {
    dismiss();
    router.push("/parent");
  }

  if (!mounted || role !== "PARENT" || newCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 pt-2">
      <div className="w-full max-w-2xl bg-amber-50 border border-amber-300 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <button onClick={handleTap} className="flex-1 text-left">
          <span className="text-amber-800 font-semibold text-sm">
            🍱 新しいお昼の写真が {newCount}件 とどいています！
          </span>
        </button>
        <button
          onClick={dismiss}
          className="text-amber-500 hover:text-amber-700 text-lg leading-none flex-shrink-0"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
