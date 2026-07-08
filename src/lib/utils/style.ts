/**
 * 风格偏好工具函数
 */

import type { NameStyle, NameStyleWeights } from "@/types";

/** 风格中文简称（UI 展示用） */
export const STYLE_LABELS: Record<NameStyle, string> = {
  classical: "古典文雅",
  modern: "现代简约",
  literary: "诗词典故",
  majestic: "明朗大气",
  elegant: "温润平和",
  cute: "俏皮可爱",
  neutral: "中性大方",
};

/** UI 展示顺序 */
export const STYLE_ORDER: NameStyle[] = [
  "classical",
  "elegant",
  "majestic",
  "literary",
  "modern",
  "cute",
  "neutral",
];

/**
 * 根据选定的风格基调返回默认的混合权重分布。
 * 基调风格占主导（80），其余风格作为辅助（30），用户仍可手动微调。
 */
export function getDefaultWeightsForStyle(style: NameStyle): NameStyleWeights {
  return {
    classical: style === "classical" ? 80 : 30,
    modern: style === "modern" ? 80 : 30,
    literary: style === "literary" ? 80 : 30,
    majestic: style === "majestic" ? 80 : 30,
    elegant: style === "elegant" ? 80 : 30,
    cute: style === "cute" ? 80 : 30,
    neutral: style === "neutral" ? 80 : 30,
  };
}
