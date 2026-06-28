"use client";

import GiftMoneySection from "@/components/GiftMoneySection";

export default function GiftPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">お年玉・お祝い金</h1>
        <p className="text-sm text-gray-500 mt-1">
          おじいちゃん・おばあちゃんや親戚からもらった特別なお金を、財布とは別に管理します。
        </p>
      </div>
      <GiftMoneySection defaultOpen />
    </div>
  );
}
