"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getHistory,
  removeHistory,
  clearHistory,
  type HistoryItem,
} from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";
import { ClockIcon } from "@/components/ui/icons";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const refresh = () => setHistory(getHistory());

  const handleDelete = (id: string) => {
    removeHistory(id);
    refresh();
  };

  const handleClear = () => {
    if (confirm("确定清空所有历史记录吗？")) {
      clearHistory();
      refresh();
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">历史记录</h1>
          <p className="text-sm text-stone-500">共 {history.length} 次取名记录</p>
        </div>
        <button
          onClick={handleClear}
          disabled={history.length === 0}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          清空
        </button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
            <ClockIcon className="h-6 w-6 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-700">暂无历史记录</h3>
          <p className="mt-1 text-sm text-stone-500">每次生成名字后都会保存在这里</p>
          <Link
            href="/generate"
            className="mt-4 inline-block rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            去取名
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-stone-800">
                      {item.request.surname}姓
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                      {item.request.gender === "male"
                        ? "男"
                        : item.request.gender === "female"
                          ? "女"
                          : "中性"}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                      {item.request.nameLength}字名
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                      生成 {item.request.count ?? 0} 个
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(item.timestamp).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/generate?load=${encodeURIComponent(item.id)}`}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                  >
                    重新加载
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>

              {item.topNames.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.topNames.map((n) => (
                    <span
                      key={n.fullName}
                      className="rounded-lg bg-stone-50 px-2.5 py-1 text-sm text-stone-700"
                    >
                      {n.fullName}
                      <span className="ml-1 text-xs text-stone-400">{n.score}分</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
