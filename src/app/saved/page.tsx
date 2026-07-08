"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getFavorites,
  removeFavorite,
  clearFavorites,
  getCompareList,
  setCompareList,
  type FavoriteItem,
} from "@/lib/utils/storage";
import { exportFavorites } from "@/lib/utils/export";
import { cn } from "@/lib/utils/cn";

const COMPARE_MAX = 3;

export default function SavedPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const refresh = () => setFavorites(getFavorites());

  const toggleSelect = (fullName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });
  };

  const handleRemove = (fullName: string) => {
    removeFavorite(fullName);
    refresh();
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(fullName);
      return next;
    });
  };

  const handleClear = () => {
    if (confirm("确定清空所有收藏吗？")) {
      clearFavorites();
      refresh();
      setSelected(new Set());
    }
  };

  const handleExport = () => {
    exportFavorites(favorites);
  };

  // 批量操作
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleBatchExport = () => {
    const selectedFavorites = favorites.filter((f) => selected.has(f.fullName));
    exportFavorites(selectedFavorites);
    showToast(`已导出 ${selectedFavorites.length} 个名字`);
  };

  const handleBatchCompare = () => {
    const current = getCompareList();
    const remaining = COMPARE_MAX - current.length;
    if (remaining <= 0) {
      showToast("对比名单已满（3 个），请先在取名页移除部分名字");
      return;
    }
    const toAdd = Array.from(selected).filter((n) => !current.includes(n)).slice(0, remaining);
    if (toAdd.length === 0) {
      showToast("所选名字已在对比名单中");
      return;
    }
    setCompareList([...current, ...toAdd]);
    showToast(`已加入 ${toAdd.length} 个名字到对比，前往取名页查看`);
  };

  const handleBatchRemove = () => {
    if (!confirm(`确定取消收藏 ${selected.size} 个名字吗？`)) return;
    selected.forEach((fullName) => removeFavorite(fullName));
    setSelected(new Set());
    refresh();
  };

  const handleClearSelection = () => setSelected(new Set());

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">我的收藏</h1>
          <p className="text-sm text-stone-500">已收藏 {favorites.length} 个好名</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={favorites.length === 0}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            导出
          </button>
          <button
            onClick={handleClear}
            disabled={favorites.length === 0}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            清空
          </button>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-20 text-center">
          <div className="mb-3 text-4xl">⭐</div>
          <h3 className="text-lg font-semibold text-stone-700">还没有收藏的名字</h3>
          <p className="mt-1 text-sm text-stone-500">在取名结果中点击心形，即可收藏到这里</p>
          <Link
            href="/generate"
            className="mt-4 inline-block rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            去取名
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <div
              key={f.fullName}
              onClick={() => toggleSelect(f.fullName)}
              className={cn(
                "relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
                selected.has(f.fullName)
                  ? "border-emerald-400 ring-1 ring-emerald-200"
                  : "border-stone-200",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-stone-800">{f.fullName}</h3>
                  <p className="text-sm text-stone-400">{f.pinyin}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-sm font-bold",
                    f.score >= 90
                      ? "bg-emerald-100 text-emerald-700"
                      : f.score >= 75
                        ? "bg-amber-100 text-amber-700"
                        : "bg-stone-100 text-stone-500",
                  )}
                >
                  {f.score}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  收藏于 {new Date(f.savedAt).toLocaleDateString("zh-CN")}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(f.fullName);
                  }}
                  className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
