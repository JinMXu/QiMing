"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { CandidateName, BaziInfo, Wuxing } from "@/types";
import { WUXING_LABELS } from "@/types";
import { HeartIcon } from "./icons";

type TabKey = "bazi" | "phonetic" | "glyph" | "meaning" | "poetry" | "taboo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "bazi", label: "八字五行" },
  { key: "phonetic", label: "音律分析" },
  { key: "glyph", label: "字形结构" },
  { key: "meaning", label: "寓意解析" },
  { key: "poetry", label: "出处典故" },
  { key: "taboo", label: "避讳提醒" },
];

interface NameAnalysisPanelProps {
  name: CandidateName;
  bazi?: BaziInfo | null;
  compareNames: string[];
  allNames: CandidateName[];
  onToggleCompare: (fullName: string) => void;
  onToggleFavorite: (name: CandidateName) => void;
  favorited: boolean;
  onShowReport?: () => void;
}

export function NameAnalysisPanel({
  name,
  bazi,
  compareNames,
  allNames,
  onToggleCompare,
  onToggleFavorite,
  favorited,
  onShowReport,
}: NameAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("bazi");
  const [compareActive, setCompareActive] = useState<string | null>(null);

  // 综合评价展示的名字：优先看对比区点击的名字，否则当前主名字
  const scoreName = compareActive
    ? allNames.find((n) => n.fullName === compareActive)
    : name;

  const scoreDimensions: [string, keyof CandidateName["scores"]][] = [
    ["八字五行", "wuxing"],
    ["音律音调", "phonetic"],
    ["字形结构", "glyph"],
    ["寓意内涵", "meaning"],
    ["诗词典故", "poetry"],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-stone-800">{name.fullName}</h2>
              <button
                onClick={() => onToggleFavorite(name)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  favorited
                    ? "bg-red-50 text-red-500"
                    : "bg-stone-100 text-stone-300 hover:text-stone-400",
                )}
              >
                <HeartIcon filled={favorited} className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-stone-400">{name.pinyin}</p>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "text-4xl font-bold",
                name.score >= 90
                  ? "text-emerald-600"
                  : name.score >= 75
                    ? "text-amber-600"
                    : "text-stone-500",
              )}
            >
              {name.score}
            </div>
            <div className="text-xs text-stone-400">综合评分</div>
          </div>
        </div>

        <p className="rounded-xl bg-amber-50/70 p-3 text-sm leading-relaxed text-amber-900">
          {name.recommendation}
        </p>

        {/* Tab 导航 */}
        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-stone-100 pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="mt-4 min-h-[200px]">
          {activeTab === "bazi" && <BaziTab name={name} bazi={bazi} />}
          {activeTab === "phonetic" && <AnalysisBlock title="音律分析" content={name.phoneticAnalysis} />}
          {activeTab === "glyph" && <AnalysisBlock title="字形结构" content={name.glyphAnalysis} />}
          {activeTab === "meaning" && <AnalysisBlock title="寓意解析" content={name.meaning} />}
          {activeTab === "poetry" && <PoetryBlock poetry={name.poetryOrigin} />}
          {activeTab === "taboo" && <TabooBlock check={name.tabooCheck} />}
        </div>
      </div>

      {/* 对比区 */}
      <CompareBar
        compareNames={compareNames}
        allNames={allNames}
        onToggleCompare={onToggleCompare}
        currentName={name.fullName}
        activeCompare={compareActive}
        onActivateCompare={setCompareActive}
      />

      {/* 综合评价 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-stone-800">
          综合评价
          {compareActive && scoreName && (
            <span className="ml-2 font-normal text-amber-600">
              · {scoreName.fullName}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {scoreName && scoreDimensions.map(([label, key]) => (
            <ScoreBar key={key} label={label} score={scoreName.scores[key]} />
          ))}
          {scoreName && (
            <ScoreBar
              label="避讳风险"
              score={scoreName.tabooCheck.passed ? 95 : 60}
            />
          )}
        </div>
        {onShowReport && (
          <button
            onClick={onShowReport}
            className="mt-5 w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            📄 查看完整解析报告
          </button>
        )}
      </div>
    </div>
  );
}

function BaziTab({ name, bazi }: { name: CandidateName; bazi?: BaziInfo | null }) {
  if (!bazi) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-400">
        未提供出生时间，暂无八字五行分析
      </div>
    );
  }

  const total = Object.values(bazi.distribution).reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...Object.values(bazi.distribution)) || 1;

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          五行分布（喜用：{bazi.xiyongshen.map((w) => WUXING_LABELS[w]).join("、")}）
        </h4>
        <div className="space-y-2">
          {(Object.entries(WUXING_LABELS) as [Wuxing, string][]).map(([key, label]) => {
            const count = bazi.distribution[key] ?? 0;
            const percent = (count / total) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-5 text-sm font-medium text-stone-600">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn("h-full rounded-full", wuxingColor(key))}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-stone-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          八字命盘
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["年柱", bazi.pillars.year],
              ["月柱", bazi.pillars.month],
              ["日柱", bazi.pillars.day],
              ["时柱", bazi.pillars.hour],
            ] as const
          ).map(([label, pillar]) => (
            <div
              key={label}
              className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-center"
            >
              <div className="text-xs text-stone-400">{label}</div>
              <div className="mt-1 text-lg font-bold text-stone-800">
                {pillar.gan}{pillar.zhi}
              </div>
              <div className="mt-1 flex justify-center gap-1 text-[10px]">
                <span className={cn("rounded px-1", wuxingBadge(pillar.ganWuxing))}>
                  {WUXING_LABELS[pillar.ganWuxing]}
                </span>
                <span className={cn("rounded px-1", wuxingBadge(pillar.zhiWuxing))}>
                  {WUXING_LABELS[pillar.zhiWuxing]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnalysisBlock title="命理简析" content={name.wuxingAnalysis} />
    </div>
  );
}

function AnalysisBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {title}
      </h4>
      <p className="text-sm leading-relaxed text-stone-600">{content || "暂无分析"}</p>
    </div>
  );
}

function PoetryBlock({ poetry }: { poetry?: CandidateName["poetryOrigin"] }) {
  if (!poetry) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-400">
        未匹配到明确诗词典故
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
      <p className="text-lg font-medium text-stone-800">「{poetry.verse}」</p>
      <p className="mt-2 text-xs text-stone-400">
        ——{poetry.author}《{poetry.title}》（{poetry.dynasty}）
      </p>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">{poetry.connection}</p>
    </div>
  );
}

function TabooBlock({ check }: { check: CandidateName["tabooCheck"] }) {
  const issues: string[] = [];
  if (check.homophoneWarnings.length > 0) issues.push(`谐音注意：${check.homophoneWarnings.join("、")}`);
  if (check.hasRareChar) issues.push("含生僻字");
  if (check.hasPolyphonic) issues.push("含多音字");

  return (
    <div>
      {check.passed && issues.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ 未发现谐音、生僻字、多音字等问题
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ {issue}
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-stone-400">最大单字笔画：{check.maxStrokes} 画</p>
    </div>
  );
}

function CompareBar({
  compareNames,
  allNames,
  onToggleCompare,
  currentName,
  activeCompare,
  onActivateCompare,
}: {
  compareNames: string[];
  allNames: CandidateName[];
  onToggleCompare: (fullName: string) => void;
  currentName: string;
  activeCompare: string | null;
  onActivateCompare: (fullName: string | null) => void;
}) {
  const items = compareNames
    .map((name) => allNames.find((n) => n.fullName === name))
    .filter(Boolean) as CandidateName[];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-800">对比名字（最多 3 个）</h3>
        {items.length > 0 && (
          <button
            onClick={() => compareNames.forEach((n) => onToggleCompare(n))}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            清空
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((name) => (
          <div
            key={name.fullName}
            onClick={() =>
              onActivateCompare(
                activeCompare === name.fullName ? null : name.fullName,
              )
            }
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors cursor-pointer",
              activeCompare === name.fullName
                ? "border-amber-400 bg-amber-50 ring-1 ring-amber-200"
                : "border-stone-100 bg-stone-50 hover:border-stone-300 hover:bg-white",
            )}
          >
            <div>
              <div className="text-sm font-bold text-stone-800">{name.fullName}</div>
              <div className="text-[10px] text-stone-400">{name.score}分</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(name.fullName);
              }}
              className="ml-1 rounded-full p-1 text-stone-400 hover:bg-stone-200"
            >
              ×
            </button>
          </div>
        ))}
        {items.length < 3 && !compareNames.includes(currentName) && (
          <button
            onClick={() => onToggleCompare(currentName)}
            className="flex items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-medium text-stone-500 hover:border-stone-400 hover:bg-stone-50"
          >
            + 添加对比
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const colorClass =
    score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-stone-400";
  const textClass =
    score >= 90 ? "text-emerald-600" : score >= 75 ? "text-amber-600" : "text-stone-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-stone-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("w-8 text-right text-sm font-medium", textClass)}>{score}</span>
    </div>
  );
}

function wuxingColor(wx: Wuxing): string {
  const map: Record<Wuxing, string> = {
    wood: "bg-emerald-400",
    fire: "bg-red-400",
    earth: "bg-amber-400",
    metal: "bg-slate-400",
    water: "bg-blue-400",
  };
  return map[wx];
}

function wuxingBadge(wx: Wuxing): string {
  const map: Record<Wuxing, string> = {
    wood: "bg-emerald-100 text-emerald-700",
    fire: "bg-red-100 text-red-700",
    earth: "bg-amber-100 text-amber-700",
    metal: "bg-slate-100 text-slate-700",
    water: "bg-blue-100 text-blue-700",
  };
  return map[wx];
}
