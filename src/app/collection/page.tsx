"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PARTS, RARITY_META, Rarity, Part, OptisForm } from "@/lib/optis";
import OptisCreature from "@/components/OptisCreature";

interface OptisData {
  form: OptisForm;
  stage: 1 | 2 | 3;
  equippedBody: string;
  equippedAura: string;
  equippedAccessory: string | null;
  unlocked: string[];
}

const RARITY_ORDER: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"];

const TYPE_LABEL: Record<string, string> = {
  body: "ボディ",
  aura: "オーラ",
  accessory: "アクセサリー",
};

// 入手方法のヒント
const SOURCE_HINT: Record<Rarity, string> = {
  COMMON: "ルーレットで入手",
  UNCOMMON: "ルーレット / ミッション報酬",
  RARE: "週宝箱 / レアルーレット",
  LEGENDARY: "確変ルーレットの大当たり",
};

function PartVisual({ part, owned }: { part: Part; owned: boolean }) {
  if (!owned) {
    return (
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 text-gray-300 text-2xl">
        ?
      </div>
    );
  }
  if (part.emoji) {
    return <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 text-2xl">{part.emoji}</div>;
  }
  // オーラ/ボディは発光する円で表現
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${part.color})`, boxShadow: `0 0 12px ${part.color}88` }}
    >
      <div className="w-3.5 h-3.5 rounded-full bg-white/70" />
    </div>
  );
}

export default function CollectionPage() {
  const [data, setData] = useState<OptisData | null>(null);

  const load = useCallback(async () => {
    setData(await fetch("/api/optis").then(r => r.json()));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function equip(part: Part) {
    await fetch("/api/optis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: part.id, type: part.type }),
    });
    load();
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const owned = new Set(data.unlocked);
  const total = PARTS.length;
  const ownedCount = PARTS.filter(p => owned.has(p.id)).length;
  const rate = Math.round((ownedCount / total) * 100);

  const equippedSet = new Set([data.equippedBody, data.equippedAura, data.equippedAccessory].filter(Boolean) as string[]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">パーツ図鑑</h1>
        <Link href="/" className="text-sm text-blue-600 font-medium">‹ ホーム</Link>
      </div>

      {/* コンプリート率 + プレビュー */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="flex-shrink-0">
          <OptisCreature
            form={data.form}
            stage={data.stage}
            auraId={data.equippedAura}
            accessoryId={data.equippedAccessory}
            size={120}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-700">コンプリート率</span>
            <span className="text-2xl font-extrabold text-blue-600">{rate}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: "linear-gradient(90deg,#3b82f6,#a855f7)" }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{ownedCount} / {total} 種コンプ。タップで装備できます。</p>
        </div>
      </div>

      {/* レアリティ別 */}
      {RARITY_ORDER.map(rarity => {
        const parts = PARTS.filter(p => p.rarity === rarity);
        const got = parts.filter(p => owned.has(p.id)).length;
        const rm = RARITY_META[rarity];
        return (
          <div key={rarity}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: rm.color }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: rm.color }} />
                {rm.label}
              </span>
              <span className="text-xs text-gray-400">{got} / {parts.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {parts.map(part => {
                const isOwned = owned.has(part.id);
                const isEquipped = equippedSet.has(part.id);
                return (
                  <button
                    key={part.id}
                    disabled={!isOwned}
                    onClick={() => isOwned && equip(part)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all
                      ${isEquipped ? "border-blue-500 bg-blue-50" : isOwned ? "border-gray-200 bg-white hover:border-blue-300" : "border-dashed border-gray-200 bg-gray-50"}`}
                  >
                    <PartVisual part={part} owned={isOwned} />
                    <div className="min-w-0 flex-1">
                      {isOwned ? (
                        <>
                          <div className="text-sm font-bold text-gray-800 truncate">{part.name}</div>
                          <div className="text-[11px] text-gray-400">{TYPE_LABEL[part.type]}</div>
                          <div className={`text-[11px] font-medium mt-0.5 ${isEquipped ? "text-blue-600" : "text-gray-400"}`}>
                            {isEquipped ? "✓ 装備中" : "タップで装備"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold text-gray-400">？？？</div>
                          <div className="text-[11px] text-gray-400">{TYPE_LABEL[part.type]}</div>
                          <div className="text-[11px] text-gray-300 mt-0.5 truncate">{SOURCE_HINT[rarity]}</div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
