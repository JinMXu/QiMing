"use client";

import { useEffect, useState } from "react";
import {
  clearFavorites,
  clearHistory,
  getFavorites,
  getHistory,
} from "@/lib/utils/storage";
import { exportFavorites, exportHistory } from "@/lib/utils/export";
import type { LlmConfigSummary } from "@/lib/llm";

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  qwen: "通义千问",
  glm: "智谱 GLM",
};

export default function SettingsPage() {
  const [counts, setCounts] = useState({ favorites: 0, history: 0 });
  const [llm, setLlm] = useState<LlmConfigSummary | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);

  useEffect(() => {
    setCounts({
      favorites: getFavorites().length,
      history: getHistory().length,
    });
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setLlm(data as LlmConfigSummary))
      .catch(() => setLlmError("配置读取失败"));
  }, []);

  const refresh = () =>
    setCounts({
      favorites: getFavorites().length,
      history: getHistory().length,
    });

  const handleClearFavorites = () => {
    if (confirm("确定清空所有收藏吗？")) {
      clearFavorites();
      refresh();
    }
  };

  const handleClearHistory = () => {
    if (confirm("确定清空所有历史记录吗？")) {
      clearHistory();
      refresh();
    }
  };

  const handleExportFavorites = () => {
    exportFavorites(getFavorites());
  };

  const handleExportHistory = () => {
    exportHistory(getHistory());
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold text-stone-800">设置</h1>

      <div className="space-y-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-stone-800">LLM 配置</h2>
          {llmError ? (
            <p className="text-sm text-red-500">{llmError}</p>
          ) : llm ? (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-stone-500">服务商</dt>
              <dd className="font-medium text-stone-800">
                {PROVIDER_LABELS[llm.provider] ?? llm.provider}
              </dd>

              <dt className="text-stone-500">模型</dt>
              <dd className="font-mono text-xs text-stone-800">{llm.model}</dd>

              <dt className="text-stone-500">API Key</dt>
              <dd>
                {llm.hasApiKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    ● 已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    ● 未配置
                  </span>
                )}
              </dd>

              <dt className="text-stone-500">思考模式</dt>
              <dd className="text-stone-800">
                {llm.thinking ? "已启用" : "已关闭"}
              </dd>

              <dt className="text-stone-500">Base URL</dt>
              <dd className="truncate font-mono text-xs text-stone-500">{llm.baseUrl}</dd>
            </dl>
          ) : (
            <p className="text-sm text-stone-400">加载中…</p>
          )}
          <p className="mt-3 text-xs text-stone-400">
            配置通过环境变量读取，敏感信息不可在前端修改。如需调整，请编辑服务端 .env.local。
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-stone-800">数据管理</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">我的收藏</p>
                <p className="text-xs text-stone-400">共 {counts.favorites} 条</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportFavorites}
                  disabled={counts.favorites === 0}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  导出
                </button>
                <button
                  onClick={handleClearFavorites}
                  disabled={counts.favorites === 0}
                  className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">历史记录</p>
                <p className="text-xs text-stone-400">共 {counts.history} 条</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportHistory}
                  disabled={counts.history === 0}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  导出
                </button>
                <button
                  onClick={handleClearHistory}
                  disabled={counts.history === 0}
                  className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  清空
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-stone-800">关于启名</h2>
          <p className="text-sm leading-relaxed text-stone-500">
            启名 Qiming 是一款面向中国新生儿父母的智能取名工具。我们融合传统八字五行、诗词典故与现代算法，为宝宝取一个有底蕴、有音律、有寓意的好名字。
          </p>
          <p className="mt-2 text-xs text-stone-400">版本：0.1.0</p>
        </section>
      </div>
    </div>
  );
}
