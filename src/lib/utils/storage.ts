/**
 * 本地持久化工具（收藏、历史记录、最近名字缓存）
 */

import type { GenerateRequest, CandidateName, BaziInfo } from "@/types";
import type { BabyInfoFormData } from "@/components/generate/BabyInfoForm";

const STORAGE_KEYS = {
  favorites: "qiming:favorites",
  history: "qiming:history",
  lastNames: "qiming:lastNames",
  lastBazi: "qiming:lastBazi",
};

/** 最近名字缓存上限 */
const LAST_NAMES_MAX = 50;

export interface FavoriteItem {
  fullName: string;
  givenName: string;
  pinyin: string;
  score: number;
  savedAt: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  request: GenerateRequest;
  /** 表单快照（用于「重新加载参数」时 1:1 还原表单，避免反向解析 birthPlace 字符串） */
  formSnapshot?: BabyInfoFormData;
  topNames: { fullName: string; score: number }[];
  /** 生成结果（用于「重新加载」时直接恢复结果页，跳过重新生成） */
  names?: CandidateName[];
  /** 八字分析（用于「重新加载」时直接恢复结果页） */
  baziInfo?: BaziInfo | null;
}

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ── 收藏 ──

export function getFavorites(): FavoriteItem[] {
  return safeGet<FavoriteItem[]>(STORAGE_KEYS.favorites) ?? [];
}

export function addFavorite(item: FavoriteItem): FavoriteItem[] {
  const favorites = getFavorites();
  if (favorites.some((f) => f.fullName === item.fullName)) return favorites;
  const next = [item, ...favorites];
  safeSet(STORAGE_KEYS.favorites, next);
  return next;
}

export function removeFavorite(fullName: string): FavoriteItem[] {
  const favorites = getFavorites();
  const next = favorites.filter((f) => f.fullName !== fullName);
  safeSet(STORAGE_KEYS.favorites, next);
  return next;
}

export function isFavorite(fullName: string): boolean {
  return getFavorites().some((f) => f.fullName === fullName);
}

export function clearFavorites(): void {
  safeSet(STORAGE_KEYS.favorites, []);
}

// ── 历史记录 ──

export function getHistory(): HistoryItem[] {
  return safeGet<HistoryItem[]>(STORAGE_KEYS.history) ?? [];
}

export function addHistory(item: HistoryItem): HistoryItem[] {
  const history = getHistory();
  const next = [item, ...history].slice(0, 50);
  safeSet(STORAGE_KEYS.history, next);
  return next;
}

export function removeHistory(id: string): HistoryItem[] {
  const history = getHistory();
  const next = history.filter((h) => h.id !== id);
  safeSet(STORAGE_KEYS.history, next);
  return next;
}

export function clearHistory(): void {
  safeSet(STORAGE_KEYS.history, []);
}

// ── 最近名字缓存（供 /name/[id] 详情页使用） ──

/**
 * 缓存最近一次生成的名字列表（合并去重，最多保留 50 个）。
 * 后续 /name/[id] 详情页通过 fullName 从中查找。
 */
export function cacheLastNames(names: CandidateName[]): void {
  if (names.length === 0) return;
  const existing = safeGet<CandidateName[]>(STORAGE_KEYS.lastNames) ?? [];
  const map = new Map<string, CandidateName>();
  // 旧的在前，新的覆盖
  for (const n of existing) map.set(n.fullName, n);
  for (const n of names) map.set(n.fullName, n);
  const merged = Array.from(map.values()).slice(-LAST_NAMES_MAX);
  safeSet(STORAGE_KEYS.lastNames, merged);
}

/** 根据 fullName 查找缓存的名字 */
export function getCachedName(fullName: string): CandidateName | null {
  const all = safeGet<CandidateName[]>(STORAGE_KEYS.lastNames) ?? [];
  return all.find((n) => n.fullName === fullName) ?? null;
}

/** 缓存最近一次八字信息（供详情页还原八字上下文） */
export function cacheLastBazi(bazi: BaziInfo | null): void {
  if (!bazi) return;
  safeSet(STORAGE_KEYS.lastBazi, bazi);
}

/** 读取缓存的八字信息 */
export function getCachedBazi(): BaziInfo | null {
  return safeGet<BaziInfo>(STORAGE_KEYS.lastBazi);
}

// ── 对比名单（sessionStorage，跨页同步，最多 3 个） ──

const COMPARE_KEY = "qiming:compare";
const COMPARE_MAX = 3;

function sessionGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** 读取对比名单 */
export function getCompareList(): string[] {
  return sessionGet<string[]>(COMPARE_KEY) ?? [];
}

/** 写入对比名单（自动截断到 3 个） */
export function setCompareList(names: string[]): string[] {
  const next = names.slice(0, COMPARE_MAX);
  sessionSet(COMPARE_KEY, next);
  return next;
}

/** 加入对比，返回最新名单。已存在或满 3 个时不添加。 */
export function addToCompare(fullName: string): string[] {
  const list = getCompareList();
  if (list.includes(fullName) || list.length >= COMPARE_MAX) return list;
  const next = [...list, fullName];
  return setCompareList(next);
}

/** 从对比中移除 */
export function removeFromCompare(fullName: string): string[] {
  return setCompareList(getCompareList().filter((n) => n !== fullName));
}
