"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PARTS, RARITY_META, Rarity, Part, OptisForm } from "@/lib/optis";
import OptisCreature from "@/components/OptisCreature";
import { playEquip } from "@/lib/sound";

interface OptisData {
  form: OptisForm;
  stage: 1 | 2 | 3;
  equippedBody: string;
  equippedAura: string;
  equippedAccessory: string | null;
  unlocked: string[];
}

interface OutfitSet {
  id: number;
  name: string;
  equippedBody: string;
  equippedAura: string;
  equippedAccessory: string | null;
}

const RARITY_ORDER: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"];

const TYPE_LABEL: Record<string, string> = {
  body: "ボディ",
  aura: "オーラ",
  accessory: "アクセサリー",
};

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
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${part.color})`, boxShadow: `0 0 12px ${part.color}88` }}
    >
      <div className="w-3.5 h-3.5 rounded-full bg-white/70" />
    </div>
  );
}

function OutfitCard({
  outfit,
  onApply,
  onDelete,
}: {
  outfit: OutfitSet;
  onApply: (o: OutfitSet) => void;
  onDelete: (id: number) => void;
}) {
  const body = PARTS.find(p => p.id === outfit.equippedBody);
  const aura = PARTS.find(p => p.id === outfit.equippedAura);
  const acc = outfit.equippedAccessory ? PARTS.find(p => p.id === outfit.equippedAccessory) : null;

  return (
    <div className="flex-shrink-0 w-36 bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5">
      <div className="text-xs font-bold text-gray-700 text-center truncate w-full">{outfit.name}</div>
      <div className="flex gap-1 text-xs text-gray-400 flex-wrap justify-center">
        {aura && <span style={{ color: aura.color }}>{aura.emoji ?? "○"}</span>}
        {acc && <span>{acc.emoji ?? "○"}</span>}
        {body && <span style={{ color: body.color }}>●</span>}
      </div>
      <div className="text-[10px] text-gray-400 text-center truncate w-full">
        {[aura?.name, acc?.name].filter(Boolean).join(" / ") || "—"}
      </div>
      <div className="flex gap-1.5 mt-0.5 w-full">
        <button
          onClick={() => onApply(outfit)}
          className="flex-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg py-1 active:scale-95 transition-transform"
        >
          着替え
        </button>
        <button
          onClick={() => onDelete(outfit.id)}
          className="text-[11px] text-gray-400 border border-gray-200 rounded-lg px-2 py-1 active:scale-95 transition-transform"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const [data, setData] = useState<OptisData | null>(null);
  const [outfits, setOutfits] = useState<OutfitSet[]>([]);
  const [savingName, setSavingName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [optis, ofs] = await Promise.all([
      fetch("/api/optis").then(r => r.json()),
      fetch("/api/outfits").then(r => r.json()),
    ]);
    setData(optis);
    setOutfits(ofs);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function equip(part: Part) {
    await fetch("/api/optis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: part.id, type: part.type }),
    });
    playEquip();
    load();
  }

  async function applyOutfit(o: OutfitSet) {
    await Promise.all([
      fetch("/api/optis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partId: o.equippedBody, type: "body" }) }),
      fetch("/api/optis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partId: o.equippedAura, type: "aura" }) }),
      o.equippedAccessory
        ? fetch("/api/optis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partId: o.equippedAccessory, type: "accessory" }) })
        : Promise.resolve(),
    ]);
    playEquip();
    load();
  }

  async function saveOutfit() {
    if (!data || !savingName.trim()) return;
    setSaving(true);
    await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: savingName.trim(),
        equippedBody: data.equippedBody,
        equippedAura: data.equippedAura,
        equippedAccessory: data.equippedAccessory,
      }),
    });
    setSaving(false);
    setSavingName("");
    setShowSaveModal(false);
    load();
  }

  async function deleteOutfit(id: number) {
    await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    setOutfits(prev => prev.filter(o => o.id !== id));
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

      {/* ── コーデ保存セクション ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">💅 マイコーデ</span>
          <button
            onClick={() => setShowSaveModal(true)}
            className="text-xs font-semibold text-blue-600 border border-blue-300 rounded-full px-3 py-1 active:scale-95 transition-transform"
          >
            + 今の装備を保存
          </button>
        </div>
        {outfits.length === 0 ? (
          <p className="text-xs text-gray-400 px-1">まだコーデがありません。上のボタンで保存しよう！</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {outfits.map(o => (
              <OutfitCard key={o.id} outfit={o} onApply={applyOutfit} onDelete={deleteOutfit} />
            ))}
          </div>
        )}
      </div>

      {/* ── パーツ一覧(レアリティ別) ──────────────────────────────────────── */}
      {RARITY_ORDER.map(rarity => {
        const parts = PARTS.filter(p => p.rarity === rarity);
        const got = parts.filter(p => owned.has(p.id)).length;
        const rm = RARITY_META[rarity];
        return (
          <div key={rarity}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: rm.color }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: rm.color }} />
                {rm.label}
              </span>
              <span className="text-xs text-gray-400">{got} / {parts.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {parts.map(part => {
                const isOwned = owned.has(part.id);
                const isEquipped = equippedSet.has(part.id);
                const hint = part.seasonal ? "季節イベント限定" : SOURCE_HINT[rarity];
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
                          {part.seasonal && (
                            <div className="text-[10px] text-orange-400 font-medium">季節限定</div>
                          )}
                          <div className={`text-[11px] font-medium mt-0.5 ${isEquipped ? "text-blue-600" : "text-gray-400"}`}>
                            {isEquipped ? "✓ 装備中" : "タップで装備"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold text-gray-400">？？？</div>
                          <div className="text-[11px] text-gray-400">{TYPE_LABEL[part.type]}</div>
                          <div className="text-[11px] text-gray-300 mt-0.5 truncate">{hint}</div>
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

      {/* ── コーデ保存モーダル ───────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">コーデに名前をつける</h2>
            <p className="text-xs text-gray-400 mb-4">
              現在の装備を保存します：
              {[PARTS.find(p => p.id === data.equippedAura)?.name, data.equippedAccessory ? PARTS.find(p => p.id === data.equippedAccessory)?.name : null]
                .filter(Boolean).join(" + ") || "—"}
            </p>
            <input
              type="text"
              value={savingName}
              onChange={e => setSavingName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveOutfit()}
              placeholder="例: 夏コーデ、お気に入り…"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 mb-4"
              autoFocus
              maxLength={20}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveModal(false); setSavingName(""); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={saveOutfit}
                disabled={!savingName.trim() || saving}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
