/**
 * 数据导出工具（前端使用，触发浏览器下载）
 */

import type { FavoriteItem, HistoryItem } from "./storage";

/** 触发浏览器下载文本文件 */
export function exportText(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导出收藏为文本 */
export function exportFavorites(favorites: FavoriteItem[]): void {
  if (favorites.length === 0) return;
  const content = favorites
    .map(
      (f) =>
        `${f.fullName} (${f.pinyin}) - ${f.score}分 · 收藏于 ${new Date(f.savedAt).toLocaleString("zh-CN")}`,
    )
    .join("\n");
  exportText("启名-收藏.txt", content);
}

/** 导出历史为文本 */
export function exportHistory(history: HistoryItem[]): void {
  if (history.length === 0) return;
  const content = history
    .map((h) => {
      const time = new Date(h.timestamp).toLocaleString("zh-CN");
      const gender =
        h.request.gender === "male"
          ? "男"
          : h.request.gender === "female"
            ? "女"
            : "中性";
      const names = h.topNames.map((n) => `${n.fullName}(${n.score}分)`).join("、");
      return `[${time}] ${h.request.surname}姓 · ${gender} · 生成${h.request.count ?? 0}个\n  候选：${names || "（无）"}`;
    })
    .join("\n\n");
  exportText("启名-历史.txt", content);
}
