"use client";

import Link from "next/link";
import { useRole } from "@/lib/useRole";

const items = [
  { href: "/tasks", label: "お手伝いカレンダー", icon: "🧹", desc: "お手伝いをチェックして稼ぐ" },
  { href: "/projects", label: "マイ・プロジェクト", icon: "🎯", desc: "クラファン型の目標達成 & 親ブースト" },
  { href: "/collection", label: "パーツ図鑑", icon: "📒", desc: "Optisのパーツ収集と装備" },
  { href: "/chores", label: "お手伝い設定", icon: "📋", desc: "お手伝いの種類とスケジュール" },
  { href: "/allowance", label: "おこづかい集計", icon: "💰", desc: "期間ごとの集計・支払い管理" },
  { href: "/stats", label: "統計", icon: "📊", desc: "お手伝いの達成率・推移" },
  { href: "/parent", label: "親ビュー", icon: "👪", desc: "残高・支出割合の確認、おねだり承認", parentOnly: true },
  { href: "/settings", label: "設定", icon: "⚙️", desc: "基本お小遣い・集計期間" },
];

export default function MorePage() {
  const { role, mounted } = useRole();
  const visibleItems = items.filter(item => !item.parentOnly || (mounted && role === "PARENT"));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">メニュー</h1>
      <div className="space-y-2">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-all"
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
