"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { getFavorites, getHistory } from "@/lib/utils/storage";
import { useEffect, useState } from "react";
import { GuideIcon, HeartIcon, ClockIcon, SettingsIcon } from "@/components/ui/icons";

const NAV_ITEMS = [
  { href: "/guide", label: "使用指南", icon: GuideIcon },
  { href: "/saved", label: "我的收藏", icon: HeartIcon },
  { href: "/history", label: "历史记录", icon: ClockIcon },
  { href: "/settings", label: "设置", icon: SettingsIcon },
];

export function AppHeader() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ favorites: 0, history: 0 });

  useEffect(() => {
    setCounts({
      favorites: getFavorites().length,
      history: getHistory().length,
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-bold text-white shadow-sm">
            启
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-stone-800">
              启名
            </span>
            <span className="text-[10px] leading-tight text-stone-400">
              新生儿智能取名
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const count =
              item.href === "/saved"
                ? counts.favorites
                : item.href === "/history"
                  ? counts.history
                  : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-stone-100 text-stone-800"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
