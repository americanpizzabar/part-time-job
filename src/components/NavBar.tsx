"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSimpleMode } from "@/lib/useSimpleMode";

const fullLinks = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/tasks", label: "お手伝い", icon: "📅" },
  { href: "/budget", label: "かけいぼ", icon: "📒" },
  { href: "/goals", label: "目標", icon: "🎯" },
  { href: "/presentations", label: "おねだり", icon: "🙏" },
  { href: "/more", label: "メニュー", icon: "☰" },
];

// 簡易モード: お手伝い+お年玉に絞ったスリムなナビ
const simpleLinks = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/tasks", label: "お手伝い", icon: "📅" },
  { href: "/gift", label: "お年玉", icon: "🧧" },
  { href: "/more", label: "メニュー", icon: "☰" },
];

const moreRoutes = ["/collection", "/projects", "/allowance", "/stats", "/settings", "/parent", "/chronicle", "/portfolio", "/manual", "/gift", "/chores"];

export default function NavBar() {
  const pathname = usePathname();
  const { simple } = useSimpleMode();
  const links = simple ? simpleLinks : fullLinks;
  // 簡易モードでは /gift がタブになるため「メニュー配下」から外す
  const menuRoutes = simple ? moreRoutes.filter(r => r !== "/gift") : moreRoutes;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="max-w-2xl mx-auto flex">
        {links.map(link => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : link.href === "/more"
                ? pathname.startsWith("/more") || menuRoutes.some(r => pathname.startsWith(r))
                : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors
                ${active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <span className="text-xl mb-0.5">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
