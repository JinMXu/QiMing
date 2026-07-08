"use client";

/**
 * 取名页 /generate —— 三列布局 + SSE 流式 + 按需分析
 */

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type {
  GenerateRequest,
  CandidateName,
  NameSummary,
  Gender,
  NameStyle,
  FilterOptions,
  AnalyzeResponse,
  BaziInfo,
  NameStyleWeights,
} from "@/types";
import { BabyInfoForm, type BabyInfoFormData } from "@/components/generate/BabyInfoForm";
import { NameList, type SortKey } from "@/components/generate/NameList";
import { NameAnalysisPanel } from "@/components/generate/NameAnalysisPanel";
import { formatBirthPlace } from "@/lib/utils/area";
import { convertToSolarDateTime } from "@/lib/utils/calendar";
import {
  addFavorite,
  removeFavorite,
  isFavorite,
  addHistory,
  getHistory,
  cacheLastNames,
  cacheLastBazi,
  getCompareList,
  setCompareList,
  type FavoriteItem,
} from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";
import { getDefaultWeightsForStyle } from "@/lib/utils/style";

const DEFAULT_STYLE_WEIGHTS = getDefaultWeightsForStyle("literary");

const DEFAULT_FILTERS: FilterOptions = {
  avoidRareChars: true,
  avoidPolyphonic: true,
  avoidBadHomophone: true,
  limitStrokes: false,
  maxStrokes: 20,
  highScoreOnly: false,
  minScore: 85,
};

const DEFAULT_FORM: BabyInfoFormData = {
  surname: "",
  gender: "neutral",
  calendarType: "solar",
  birthDateTime: "",
  birthPlaceProvince: "",
  birthPlaceCity: "",
  birthPlaceDistrict: "",
  useBazi: true,
  nameLength: 2,
  generationChar: "",
  generationCharPos: "first",
  likedChars: "",
  tabooChars: "",
  style: "literary",
  styleWeights: DEFAULT_STYLE_WEIGHTS,
  filters: DEFAULT_FILTERS,
  notes: "",
  count: 8,
};

export default function GeneratePage() {
  const router = useRouter();

  // ── 表单 ──
  const [form, setForm] = useState<BabyInfoFormData>(DEFAULT_FORM);

  // ── 结果 ──
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<CandidateName[]>([]);
  const [baziInfo, setBaziInfo] = useState<BaziInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── 交互 ──
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [compareNames, setCompareNames] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("default");
  const [showReport, setShowReport] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // ── 按需分析缓存 ──
  const [analyses, setAnalyses] = useState<Map<string, AnalyzeResponse>>(new Map());
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  // 顶部提示（用于历史回填等场景）
  const [notice, setNotice] = useState<string | null>(null);

  // compareList 跨页持久化（sessionStorage），从 /saved 加入对比后能在 /generate 看到
  const compareInitialized = useRef(false);

  // 从 /history 跳转过来时加载历史参数
  const handleLoadHistory = useCallback(
    (loadId: string) => {
      const item = getHistory().find((h) => h.id === loadId);
      if (!item) {
        setNotice("未找到该历史记录，请重新填写");
        router.replace("/generate");
        return;
      }
      if (!item.formSnapshot) {
        setNotice("该记录较旧，无法回填表单，请重新填写");
        return;
      }
      setForm(item.formSnapshot);

      // 如果历史记录中包含完整结果，直接恢复到结果视图
      if (item.names && item.names.length > 0) {
        setNames(item.names);
        setBaziInfo(item.baziInfo ?? null);
        setSelectedIdx(0);
        cacheLastNames(item.names);
        if (item.baziInfo) cacheLastBazi(item.baziInfo);
      }

      setNotice(`已加载 ${new Date(item.timestamp).toLocaleString("zh-CN")} 的历史参数`);
    },
    [router],
  );

  // 同步收藏状态
  useEffect(() => {
    setFavorites(new Set(names.map((n) => n.fullName).filter(isFavorite)));
  }, [names]);

  // 从 sessionStorage 加载对比名单
  useEffect(() => {
    setCompareNames(getCompareList());
    compareInitialized.current = true;
  }, []);

  // 对比名单变化时同步到 sessionStorage（初始化加载除外）
  useEffect(() => {
    if (compareInitialized.current) {
      setCompareList(compareNames);
    }
  }, [compareNames]);

  // ── 构建 API 请求 ──
  const buildRequest = useCallback((): GenerateRequest | { error: string } => {
    if (!form.surname.trim()) return { error: "请输入姓氏" };

    const solarDateTime = form.birthDateTime
      ? (convertToSolarDateTime(form.birthDateTime, form.calendarType) ?? undefined)
      : undefined;

    return {
      surname: form.surname.trim(),
      gender: form.gender,
      birthDateTime: solarDateTime,
      birthPlace: formatBirthPlace(
        form.birthPlaceProvince,
        form.birthPlaceCity,
        form.birthPlaceDistrict,
      ) || undefined,
      useBazi: form.useBazi && !!solarDateTime,
      calendarType: form.calendarType,
      nameLength: form.nameLength,
      generationChar: form.generationChar.trim() || undefined,
      generationCharPos: form.generationChar.trim() ? form.generationCharPos : undefined,
      likedChars: form.likedChars.trim() || undefined,
      tabooChars: form.tabooChars.trim() || undefined,
      style: form.style,
      styleWeights: form.styleWeights,
      filters: form.filters,
      notes: form.notes.trim() || undefined,
      count: form.count,
    };
  }, [form]);

  // ── 生成名字（SSE 流式） ──
  const handleGenerate = useCallback(async () => {
    const req = buildRequest();
    if ("error" in req) {
      setError(req.error);
      return;
    }

    setLoading(true);
    setError(null);
    setNames([]);
    setBaziInfo(null);
    setSelectedIdx(null);
    setCompareNames([]);
    setShowReport(false);
    setAnalyses(new Map());

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error ?? "请求失败");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const nameList: CandidateName[] = [];
      let savedBazi: BaziInfo | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          if (json === "[DONE]") continue;

          try {
            const event = JSON.parse(json);
            if (event.error) {
              setError(event.error);
              break;
            }
            if (event.type === "bazi") {
              const normalized = normalizeBazi(event.data);
              savedBazi = normalized;
              setBaziInfo(normalized);
              cacheLastBazi(normalized);
            } else if (event.type === "name") {
              const s = event.data as NameSummary;
              const candidate: CandidateName = {
                ...s,
                wuxingAnalysis: "",
                phoneticAnalysis: "",
                glyphAnalysis: "",
                comprehensiveScore: "",
                tabooCheck: {
                  passed: true,
                  homophoneWarnings: [],
                  hasRareChar: false,
                  hasPolyphonic: false,
                  maxStrokes: 0,
                },
              };
              nameList.push(candidate);
              setNames([...nameList]);
              if (nameList.length === 1) setSelectedIdx(0);
            } else if (event.type === "done") {
              setLoading(false);
              cacheLastNames(nameList);
              // 保存历史记录（含完整结果，便于「重新加载」直接恢复结果页）
              addHistory({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString(),
                request: req,
                formSnapshot: form,
                topNames: nameList.slice(0, 5).map((n) => ({
                  fullName: n.fullName,
                  score: n.score,
                })),
                names: nameList,
                baziInfo: savedBazi,
              });
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, [buildRequest, form]);

  // ── 按需深度分析 ──
  const fetchAnalysis = useCallback(
    async (idx: number) => {
      const name = names[idx];
      if (!name) return;
      const key = name.fullName;

      if (analyses.has(key)) return;

      setAnalyzing(key);
      try {
        const req = buildRequest();
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name.fullName,
            surname: form.surname,
            gender: form.gender,
            style: form.style,
            birthDateTime: "birthDateTime" in req ? req.birthDateTime : undefined,
            useBazi: form.useBazi,
            calendarType: form.calendarType,
          }),
        });
        if (!res.ok) throw new Error("分析失败");
        const data = (await res.json()) as AnalyzeResponse;

        const updatedName = { ...name, ...data };
        setNames((prev) => prev.map((n) => (n.fullName === key ? updatedName : n)));
        setAnalyses((prev) => new Map(prev).set(key, data));
        cacheLastNames([updatedName]);
        if (data.bazi) {
          setBaziInfo(data.bazi);
          cacheLastBazi(data.bazi);
        }
      } catch (err) {
        console.error("分析失败:", err);
      } finally {
        setAnalyzing(null);
      }
    },
    [names, analyses, form, buildRequest],
  );

  const handleSelect = useCallback(
    (idx: number) => {
      setSelectedIdx(idx);
      fetchAnalysis(idx);
    },
    [fetchAnalysis],
  );

  const handleToggleCompare = useCallback((fullName: string) => {
    setCompareNames((prev) => {
      if (prev.includes(fullName)) return prev.filter((n) => n !== fullName);
      if (prev.length >= 3) return prev;
      return [...prev, fullName];
    });
  }, []);

  const handleToggleFavorite = useCallback((name: CandidateName) => {
    const item: FavoriteItem = {
      fullName: name.fullName,
      givenName: name.givenName,
      pinyin: name.pinyin,
      score: name.score,
      savedAt: new Date().toISOString(),
    };
    if (isFavorite(name.fullName)) {
      removeFavorite(name.fullName);
    } else {
      addFavorite(item);
    }
    setFavorites(new Set(names.map((n) => n.fullName).filter(isFavorite)));
  }, [names]);

  const hasResults = names.length > 0;
  const selectedName = selectedIdx != null ? names[selectedIdx] : null;
  const isAnalyzing = selectedName ? analyzing === selectedName.fullName : false;
  const hasAnalysis = selectedName ? analyses.has(selectedName.fullName) : false;

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <HistoryLoader onLoad={handleLoadHistory} />
      </Suspense>
      {notice && (
        <div className="mx-auto w-full max-w-2xl px-6 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <span>{notice}</span>
            <button
              onClick={() => setNotice(null)}
              className="ml-3 text-amber-400 hover:text-amber-600"
              aria-label="关闭提示"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {!hasResults ? (
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-stone-800">开始取名</h1>
            <p className="text-stone-500">
              填写基本信息，AI 将根据八字五行、诗词典故、音律字形为宝宝生成候选好名字
            </p>
          </div>
          <BabyInfoForm
            value={form}
            onChange={setForm}
            onSubmit={handleGenerate}
            loading={loading}
            error={error}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-stone-800">
              取名结果
              {loading && (
                <span className="ml-2 text-sm font-normal text-amber-600 animate-pulse">
                  生成中…
                </span>
              )}
              {baziInfo && (
                <span className="text-sm font-normal text-amber-600"> · 已按八字五行筛选</span>
              )}
            </h1>
            <button
              onClick={() => {
                setNames([]);
                setSelectedIdx(null);
                setCompareNames([]);
                setBaziInfo(null);
              }}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              ← 重新填写
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] xl:grid-cols-[360px_minmax(360px,1fr)_minmax(420px,1.2fr)]">
            {/* 左侧表单 */}
            <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <BabyInfoForm
                  value={form}
                  onChange={setForm}
                  onSubmit={handleGenerate}
                  loading={loading}
                  error={error}
                  compact
                />
              </div>
            </aside>

            {/* 中间名字列表 */}
            <section className="space-y-3">
              <NameList
                names={names}
                selectedIndex={selectedIdx}
                compareNames={compareNames}
                sort={sort}
                onSortChange={setSort}
                onSelect={handleSelect}
                onToggleCompare={handleToggleCompare}
                onToggleFavorite={handleToggleFavorite}
                onRefresh={handleGenerate}
                loading={loading}
              />
            </section>

            {/* 右侧详情 */}
            <section className="space-y-4">
              {selectedName ? (
                hasAnalysis ? (
                  <NameAnalysisPanel
                    name={selectedName}
                    bazi={baziInfo}
                    compareNames={compareNames}
                    allNames={names}
                    onToggleCompare={handleToggleCompare}
                    onToggleFavorite={handleToggleFavorite}
                    favorited={favorites.has(selectedName.fullName)}
                    onShowReport={() => setShowReport(true)}
                  />
                ) : isAnalyzing ? (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 text-amber-600">
                    <span className="animate-pulse">🔍 正在解析「{selectedName.fullName}」…</span>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-stone-200 text-stone-400">
                    点击名字查看详细解析
                  </div>
                )
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-stone-200 text-stone-400">
                  ← 点击中间的名字查看详细解析
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {showReport && selectedName && hasAnalysis && (
        <ReportModal name={selectedName} bazi={baziInfo} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

function normalizeBazi(data: unknown): BaziInfo | null {
  if (!data || typeof data !== "object") return null;
  const b = data as Partial<BaziInfo>;
  if (!b.summary || !b.pillars || !b.distribution) return null;
  return {
    summary: b.summary,
    pillars: b.pillars,
    distribution: b.distribution,
    xiyongshen: b.xiyongshen ?? [],
    lunarBirthday: b.lunarBirthday,
  };
}

function ReportModal({
  name,
  bazi,
  onClose,
}: {
  name: CandidateName;
  bazi?: BaziInfo | null;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">{name.fullName} · 完整解析报告</h2>
            <p className="text-sm text-stone-400">
              {name.pinyin} · 综合评分 {name.score}/100
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-3 text-base font-semibold text-stone-700">📊 评分总览</h3>
            <div className="grid grid-cols-5 gap-3">
              {(
                [
                  ["八字五行", "wuxing"],
                  ["音律分析", "phonetic"],
                  ["字形结构", "glyph"],
                  ["寓意解析", "meaning"],
                  ["出处典故", "poetry"],
                ] as const
              ).map(([label, key]) => (
                <div key={key} className="rounded-lg bg-stone-50 p-3 text-center">
                  <div className="text-xs text-stone-400">{label}</div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      name.scores[key] >= 90
                        ? "text-emerald-600"
                        : name.scores[key] >= 75
                          ? "text-amber-600"
                          : "text-stone-500",
                    )}
                  >
                    {name.scores[key]}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {bazi && (
            <section>
              <h3 className="mb-2 text-base font-semibold text-stone-700">🔮 八字五行分析</h3>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {bazi.summary}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">🔥 五行契合</h3>
            <p className="text-sm text-stone-600">{name.wuxingAnalysis}</p>
          </section>
          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">🎵 音律分析</h3>
            <p className="text-sm text-stone-600">{name.phoneticAnalysis}</p>
          </section>
          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">✍️ 字形结构</h3>
            <p className="text-sm text-stone-600">{name.glyphAnalysis}</p>
          </section>
          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">💬 寓意解析</h3>
            <p className="text-sm text-stone-600">{name.meaning}</p>
          </section>
          {name.poetryOrigin && (
            <section>
              <h3 className="mb-2 text-base font-semibold text-stone-700">📜 出处典故</h3>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <p className="text-lg font-medium text-stone-700">「{name.poetryOrigin.verse}」</p>
                <p className="mt-2 text-sm text-stone-400">
                  ——{name.poetryOrigin.author}《{name.poetryOrigin.title}》（{name.poetryOrigin.dynasty}）
                </p>
                <p className="mt-2 text-sm text-stone-500">{name.poetryOrigin.connection}</p>
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">⚠️ 避讳提醒</h3>
            <div
              className={cn(
                "rounded-lg p-4 text-sm",
                name.tabooCheck.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
              )}
            >
              {name.tabooCheck.passed ? "✅ 未发现问题" : "⚠️ 有风险"}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-base font-semibold text-stone-700">📊 综合评价</h3>
            <p className="text-sm text-stone-600">{name.comprehensiveScore}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function HistoryLoader({ onLoad }: { onLoad: (loadId: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const loadId = searchParams.get("load");
    if (loadId) onLoad(loadId);
  }, [searchParams, onLoad]);
  return null;
}
