"use client";

/**
 * 名字详情页 /name/[id]
 * id 为 URL-encoded fullName，从 localStorage 缓存中查找 CandidateName。
 * 与 /generate 右侧面板内容一致，复用 NameAnalysisPanel。
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CandidateName, BaziInfo } from "@/types";
import { NameAnalysisPanel } from "@/components/generate/NameAnalysisPanel";
import {
  getCachedName,
  getCachedBazi,
  isFavorite,
  addFavorite,
  removeFavorite,
  type FavoriteItem,
} from "@/lib/utils/storage";

export default function NameDetailPage() {
  const params = useParams<{ id: string }>();
  const fullName = decodeURIComponent(params.id);

  const [name, setName] = useState<CandidateName | null>(null);
  const [bazi, setBazi] = useState<BaziInfo | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setName(getCachedName(fullName));
    setBazi(getCachedBazi());
    setFavorited(isFavorite(fullName));
    setLoaded(true);
  }, [fullName]);

  const handleToggleFavorite = (n: CandidateName) => {
    const item: FavoriteItem = {
      fullName: n.fullName,
      givenName: n.givenName,
      pinyin: n.pinyin,
      score: n.score,
      savedAt: new Date().toISOString(),
    };
    if (isFavorite(n.fullName)) {
      removeFavorite(n.fullName);
    } else {
      addFavorite(item);
    }
    setFavorited(isFavorite(n.fullName));
  };

  if (!loaded) {
    return <div className="flex flex-1 items-center justify-center text-stone-400">加载中…</div>;
  }

  if (!name) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <div className="mb-3 text-4xl">🔍</div>
          <h1 className="mb-2 text-xl font-bold text-stone-700">名字未找到</h1>
          <p className="mb-5 text-sm text-stone-500">
            「{fullName}」不在本地缓存中，可能已被清理或来自其他设备。请重新生成名字后查看。
          </p>
          <Link
            href="/generate"
            className="inline-block rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            去取名
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Link
          href="/generate"
          className="text-sm text-stone-400 transition-colors hover:text-stone-600"
        >
          ← 返回取名
        </Link>
      </div>
      <NameAnalysisPanel
        name={name}
        bazi={bazi}
        compareNames={[]}
        allNames={[name]}
        onToggleCompare={() => {}}
        onToggleFavorite={handleToggleFavorite}
        favorited={favorited}
      />
    </div>
  );
}
