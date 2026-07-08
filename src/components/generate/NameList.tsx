"use client";

import { cn } from "@/lib/utils/cn";
import type { CandidateName, Wuxing, NameStyle, NameStyleProfile } from "@/types";
import { WUXING_LABELS } from "@/types";
import { isFavorite } from "@/lib/utils/storage";
import { STYLE_LABELS } from "@/lib/utils/style";
import { useEffect, useState } from "react";

export type SortKey = "default" | "wuxing" | "phonetic" | "meaning";

interface NameListProps {
  names: CandidateName[];
  selectedIndex: number | null;
  compareNames: string[];
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onSelect: (index: number) => void;
  onToggleCompare: (fullName: string) => void;
  onToggleFavorite: (name: CandidateName) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "综合推荐" },
  { value: "wuxing", label: "五行补益优先" },
  { value: "phonetic", label: "音律优先" },
  { value: "meaning", label: "寓意优先" },
];

type RiskLevel = "all" | "low" | "medium" | "high";

interface FilterState {
  minScore: 0 | 85 | 90;
  riskLevel: RiskLevel;
  hasPoetry: boolean;
  wuxingBoost: Wuxing[];
}

const DEFAULT_FILTER: FilterState = {
  minScore: 0,
  riskLevel: "all",
  hasPoetry: false,
  wuxingBoost: [],
};

const WUXING_COLORS: Record<Wuxing, string> = {
  wood: "bg-emerald-50 text-emerald-700 border-emerald-100",
  fire: "bg-red-50 text-red-700 border-red-100",
  earth: "bg-amber-50 text-amber-700 border-amber-100",
  metal: "bg-slate-50 text-slate-700 border-slate-100",
  water: "bg-blue-50 text-blue-700 border-blue-100",
};

/** 从八字五行分析文本中提取涉及的五行（补/喜用 + 兜底关键字） */
function extractWuxingFromAnalysis(analysis: string): Wuxing[] {
  const matches = analysis.match(/[补喜用][木火土金水]/g) ?? [];
  const set = new Set<Wuxing>();
  matches.forEach((m) => {
    const char = m.slice(-1);
    const entry = Object.entries(WUXING_LABELS).find(([, label]) => label === char);
    if (entry) set.add(entry[0] as Wuxing);
  });
  if (set.size === 0) {
    (["wood", "fire", "earth", "metal", "water"] as Wuxing[]).forEach((k) => {
      if (analysis.includes(WUXING_LABELS[k])) set.add(k);
    });
  }
  return Array.from(set);
}

export function NameList({
  names,
  selectedIndex,
  compareNames,
  sort,
  onSortChange,
  onSelect,
  onToggleCompare,
  onToggleFavorite,
  onRefresh,
  loading,
}: NameListProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setFavorites(new Set(names.map((n) => n.fullName).filter(isFavorite)));
  }, [names]);

  // 筛选/排序/数据变化时回到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sort, names.length]);

  const sortedNames = [...names].sort((a, b) => {
    if (sort === "default") return b.score - a.score;
    if (sort === "wuxing") return b.scores.wuxing - a.scores.wuxing;
    if (sort === "phonetic") return b.scores.phonetic - a.scores.phonetic;
    if (sort === "meaning") return b.scores.meaning - a.scores.meaning;
    return 0;
  });

  const activeFilterCount = [
    filter.minScore > 0,
    filter.riskLevel !== "all",
    filter.hasPoetry,
    filter.wuxingBoost.length > 0,
  ].filter(Boolean).length;

  const filteredNames = sortedNames.filter((name) => {
    if (filter.minScore > 0 && name.score < filter.minScore) return false;
    if (filter.riskLevel !== "all" && getRiskLevel(name) !== filter.riskLevel) return false;
    if (filter.hasPoetry && !name.poetryOrigin) return false;
    if (filter.wuxingBoost.length > 0) {
      const boosts = extractWuxingFromAnalysis(name.wuxingAnalysis);
      if (!filter.wuxingBoost.some((w) => boosts.includes(w))) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNames.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedNames = filteredNames.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex flex-col gap-3">
      {/* 头部 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
        <h2 className="text-sm font-bold text-stone-800 shrink-0">
          为您推荐的名字
          <span className="ml-1.5 text-xs font-normal text-stone-400">
            {names.length}个
            {activeFilterCount > 0 && ` · ${filteredNames.length}`}
          </span>
        </h2>
        <div className="flex items-center gap-1.5">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="input h-8 w-24 text-xs"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border px-2 text-xs font-medium transition-colors",
                activeFilterCount > 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 text-stone-600 hover:bg-stone-50",
              )}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              筛选
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <FilterPanel
                filter={filter}
                onChange={setFilter}
                onClose={() => setFilterOpen(false)}
                onClear={() => setFilter(DEFAULT_FILTER)}
              />
            )}
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-stone-200 px-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshIcon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">换一批</span>
          </button>
        </div>
      </div>

      {/* 表头 */}
      <div className="hidden grid-cols-[44px_1fr_56px_72px_56px_36px] items-center gap-2 px-3 text-xs font-medium text-stone-400 lg:grid">
        <span className="text-center">#</span>
        <span>姓名</span>
        <span className="text-center">评分</span>
        <span>五行</span>
        <span>风险</span>
        <span className="text-center">收藏</span>
      </div>

      {/* 列表 */}
      <div className="flex flex-col gap-2">
        {filteredNames.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white p-8 text-center text-sm text-stone-400">
            没有符合筛选条件的名字，试着调整筛选项
          </div>
        ) : (
          pagedNames.map((name, pageIndex) => {
            const idx = names.findIndex((n) => n.fullName === name.fullName);
            const selected = selectedIndex === idx;
            const comparing = compareNames.includes(name.fullName);
            const favorited = favorites.has(name.fullName);
            const risk = getRiskLevel(name);
            const serialNumber = (safePage - 1) * pageSize + pageIndex + 1;

            return (
              <div
                key={name.fullName}
                onClick={() => onSelect(idx)}
                className={cn(
                  "group relative cursor-pointer rounded-xl border bg-white shadow-sm transition-all hover:shadow-md",
                  selected
                    ? "border-amber-400 ring-1 ring-amber-200"
                    : "border-stone-200 hover:border-stone-300",
                )}
              >
                <div className="grid grid-cols-[44px_1fr_56px_72px_56px_36px] items-center gap-2 px-3 py-2.5">
                  {/* 序号 + 对比勾选 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-stone-300">
                      {String(serialNumber).padStart(2, "0")}
                    </span>
                    <label
                      className="flex h-4 w-4 cursor-pointer items-center justify-center rounded border border-stone-200 transition-colors hover:border-emerald-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={comparing}
                        onChange={() => onToggleCompare(name.fullName)}
                        className="h-3 w-3 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  </div>

                  {/* 姓名 + 拼音 */}
                  <div className="min-w-0">
                    <span className="text-lg font-bold text-stone-800">{name.fullName}</span>
                    <span className="ml-1.5 text-xs text-stone-400">{name.pinyin}</span>
                  </div>

                  {/* 评分 */}
                  <span
                    className={cn(
                      "justify-self-center rounded-full px-2 py-0.5 text-xs font-bold",
                      name.score >= 90
                        ? "bg-emerald-100 text-emerald-700"
                        : name.score >= 75
                          ? "bg-amber-100 text-amber-700"
                          : "bg-stone-100 text-stone-500",
                    )}
                  >
                    {name.score}
                  </span>

                  {/* 五行评分 */}
                  <span
                    className={cn(
                      "justify-self-center rounded-full px-2 py-0.5 text-xs font-bold",
                      name.scores.wuxing >= 85
                        ? "bg-emerald-100 text-emerald-700"
                        : name.scores.wuxing >= 70
                          ? "bg-amber-100 text-amber-700"
                          : "bg-stone-100 text-stone-500",
                    )}
                  >
                    {name.scores.wuxing}
                  </span>

                  {/* 风险 */}
                  <div className="justify-self-center">
                    <RiskBadge level={risk} />
                  </div>

                  {/* 收藏 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(name);
                    }}
                    className={cn(
                      "justify-self-center flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      favorited
                        ? "text-red-500 hover:bg-red-50"
                        : "text-stone-300 hover:bg-stone-50 hover:text-stone-400",
                    )}
                  >
                    <HeartIcon filled={favorited} className="h-4 w-4" />
                  </button>
                </div>

                {/* 风格标签 + 寓意摘要（横跨整行） */}
                {(name.meaning || name.recommendation || name.styleProfile) && (
                  <div className="flex items-center gap-2 border-t border-stone-100 px-3 py-1.5">
                    <StyleTag profile={name.styleProfile} />
                    <p className="truncate text-xs text-stone-500">
                      {name.meaning || name.recommendation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 分页器 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={cn(
                "h-7 w-7 rounded-lg text-xs font-medium transition-colors",
                p === safePage
                  ? "bg-emerald-600 text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50",
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

function StyleTag({ profile }: { profile?: NameStyleProfile }) {
  if (!profile) return null;
  const entries = Object.entries(profile) as [NameStyle, number][];
  const [style, score] = entries.sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  if (!style || score < 30) return null;
  return (
    <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
      {STYLE_LABELS[style]} {score}
    </span>
  );
}

function getRiskLevel(name: CandidateName): "low" | "medium" | "high" {
  if (!name.tabooCheck.passed) return "high";
  if (
    name.tabooCheck.homophoneWarnings.length > 0 ||
    name.tabooCheck.hasRareChar ||
    name.tabooCheck.hasPolyphonic
  )
    return "medium";
  return "low";
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: { label: "风险低", className: "bg-emerald-50 text-emerald-700" },
    medium: { label: "风险中", className: "bg-amber-50 text-amber-700" },
    high: { label: "风险高", className: "bg-red-50 text-red-700" },
  };
  const { label, className } = map[level];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", className)}>
      {label}
    </span>
  );
}

function WuxingTags({ analysis }: { analysis: string }) {
  const list = extractWuxingFromAnalysis(analysis);
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((wx) => (
        <span
          key={wx}
          className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", WUXING_COLORS[wx])}
        >
          {WUXING_LABELS[wx]}
        </span>
      ))}
    </div>
  );
}

function FilterPanel({
  filter,
  onChange,
  onClose,
  onClear,
}: {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const scoreOptions: { v: FilterState["minScore"]; label: string }[] = [
    { v: 0, label: "全部" },
    { v: 90, label: "≥90" },
    { v: 85, label: "≥85" },
  ];
  const riskOptions: { v: RiskLevel; label: string }[] = [
    { v: "all", label: "全部" },
    { v: "low", label: "低" },
    { v: "medium", label: "中" },
    { v: "high", label: "高" },
  ];
  const wuxingOptions = (["wood", "fire", "earth", "metal", "water"] as Wuxing[]).map((w) => ({
    v: w,
    label: WUXING_LABELS[w],
  }));

  const toggleWuxing = (w: Wuxing) => {
    const has = filter.wuxingBoost.includes(w);
    onChange({
      ...filter,
      wuxingBoost: has
        ? filter.wuxingBoost.filter((x) => x !== w)
        : [...filter.wuxingBoost, w],
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium text-stone-600">综合评分</div>
            <div className="flex gap-2">
              {scoreOptions.map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => onChange({ ...filter, minScore: opt.v })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    filter.minScore === opt.v
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-stone-600">谐音风险</div>
            <div className="flex flex-wrap gap-2">
              {riskOptions.map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => onChange({ ...filter, riskLevel: opt.v })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    filter.riskLevel === opt.v
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-stone-600">诗词典故</div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={filter.hasPoetry}
                onChange={(e) => onChange({ ...filter, hasPoetry: e.target.checked })}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              仅显示含诗词出处的名字
            </label>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-stone-600">五行补益</div>
            <div className="flex flex-wrap gap-2">
              {wuxingOptions.map((opt) => {
                const active = filter.wuxingBoost.includes(opt.v);
                return (
                  <button
                    key={opt.v}
                    onClick={() => toggleWuxing(opt.v)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      active
                        ? WUXING_COLORS[opt.v]
                        : "border-stone-200 text-stone-600 hover:bg-stone-50",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
          <button
            onClick={onClear}
            className="text-xs text-stone-400 transition-colors hover:text-stone-600"
          >
            清空筛选
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            确定
          </button>
        </div>
      </div>
    </>
  );
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
