/**
 * 八字排盘服务（服务端）
 *
 * 基于 lunar-javascript 计算八字四柱、五行分布、喜用神。
 * 不依赖 LLM，确保每次都能得到八字分析。
 */

import { Solar } from "lunar-javascript";
import type { BaziInfo, Wuxing } from "@/types";

// 中文五行 -> 英文
const WUXING_MAP: Record<string, Wuxing> = {
  "木": "wood",
  "火": "fire",
  "土": "earth",
  "金": "metal",
  "水": "water",
};

// 天干五行
const GAN_WUXING: Record<string, Wuxing> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

// 地支五行
const ZHI_WUXING: Record<string, Wuxing> = {
  "子": "water", "丑": "earth",
  "寅": "wood", "卯": "wood",
  "辰": "earth", "巳": "fire",
  "午": "fire", "未": "earth",
  "申": "metal", "酉": "metal",
  "戌": "earth", "亥": "water",
};

// 天干阴阳
const GAN_YINYANG: Record<string, string> = {
  "甲": "阳", "乙": "阴",
  "丙": "阳", "丁": "阴",
  "戊": "阳", "己": "阴",
  "庚": "阳", "辛": "阴",
  "壬": "阳", "癸": "阴",
};

const WUXING_LABELS: Record<Wuxing, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

/**
 * 从 ISO 日期时间字符串计算八字
 * @param birthDateTime ISO 8601 格式的日期时间字符串（公历）
 * @param birthPlace 出生地（用于真太阳时校正，暂未实现）
 */
export function computeBazi(
  birthDateTime: string,
  birthPlace?: string,
): BaziInfo | null {
  try {
    const date = new Date(birthDateTime);
    if (isNaN(date.getTime())) return null;

    const solar = Solar.fromYmdHms(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      0,
    );
    const lunar = solar.getLunar();
    const bz = lunar.getEightChar();

    // 四柱
    const yearGan = bz.getYearGan();
    const yearZhi = bz.getYearZhi();
    const monthGan = bz.getMonthGan();
    const monthZhi = bz.getMonthZhi();
    const dayGan = bz.getDayGan();
    const dayZhi = bz.getDayZhi();
    const timeGan = bz.getTimeGan();
    const timeZhi = bz.getTimeZhi();

    // 五行分布
    const distribution: Record<Wuxing, number> = {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    };

    const pillars = [
      { gan: yearGan, zhi: yearZhi },
      { gan: monthGan, zhi: monthZhi },
      { gan: dayGan, zhi: dayZhi },
      { gan: timeGan, zhi: timeZhi },
    ];

    for (const p of pillars) {
      const ganWx = GAN_WUXING[p.gan];
      const zhiWx = ZHI_WUXING[p.zhi];
      if (ganWx) distribution[ganWx]++;
      if (zhiWx) distribution[zhiWx]++;
    }

    // 日主五行
    const dayMasterWx = GAN_WUXING[dayGan] ?? "earth";
    const dayMasterYinYang = GAN_YINYANG[dayGan] ?? "阳";

    // 简单喜用神推算：推荐最弱且能生扶日主的五行
    const xiyongshen = computeXiyongshen(dayMasterWx, distribution);

    // 生成摘要
    const summary = buildBaziSummary(
      dayGan, dayMasterWx, dayMasterYinYang,
      distribution, xiyongshen, pillars,
    );

    // 农历生日文本
    const lunarBirthday = `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

    return {
      summary,
      pillars: {
        year: { gan: yearGan, zhi: yearZhi, ganWuxing: GAN_WUXING[yearGan] ?? "earth", zhiWuxing: ZHI_WUXING[yearZhi] ?? "earth" },
        month: { gan: monthGan, zhi: monthZhi, ganWuxing: GAN_WUXING[monthGan] ?? "earth", zhiWuxing: ZHI_WUXING[monthZhi] ?? "earth" },
        day: { gan: dayGan, zhi: dayZhi, ganWuxing: GAN_WUXING[dayGan] ?? "earth", zhiWuxing: ZHI_WUXING[dayZhi] ?? "earth" },
        hour: { gan: timeGan, zhi: timeZhi, ganWuxing: GAN_WUXING[timeGan] ?? "earth", zhiWuxing: ZHI_WUXING[timeZhi] ?? "earth" },
      },
      distribution,
      xiyongshen,
      lunarBirthday: birthPlace ? `${lunarBirthday}（${birthPlace}）` : lunarBirthday,
    };
  } catch (e) {
    console.error("八字计算失败:", e);
    return null;
  }
}

/**
 * 简易喜用神计算
 * 基于日主强弱和五行分布，推荐补益的五行
 */
function computeXiyongshen(
  dayMasterWx: Wuxing,
  distribution: Record<Wuxing, number>,
): Wuxing[] {
  const dayCount = distribution[dayMasterWx] ?? 0;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  // 生克关系
  const generates: Record<Wuxing, Wuxing> = {
    wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
  };
  const generatedBy: Record<Wuxing, Wuxing> = {
    wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
  };
  const restricts: Record<Wuxing, Wuxing> = {
    wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
  };
  const restrictedBy: Record<Wuxing, Wuxing> = {
    wood: "metal", metal: "fire", fire: "water", water: "earth", earth: "wood",
  };

  const ratio = dayCount / Math.max(total, 1);

  // 日主偏强 → 喜克泄耗；偏弱 → 喜生扶
  if (ratio >= 0.25) {
    // 偏强：喜克（restrictedBy）和泄（generates）
    const shen = generates[dayMasterWx]; // 食伤（泄）
    const cai = restricts[dayMasterWx]; // 财（耗）
    const guan = restrictedBy[dayMasterWx]; // 官杀（克）
    return [shen, cai, guan].filter((w) => distribution[w] <= 2);
  } else {
    // 偏弱：喜生（generatedBy）和扶（同五行）
    const yin = generatedBy[dayMasterWx]; // 印（生）
    const bi = dayMasterWx; // 比劫（扶）
    return [yin, bi].filter((w) => w !== dayMasterWx || distribution[w] <= 3);
  }
}

function buildBaziSummary(
  dayGan: string,
  dayMasterWx: Wuxing,
  yinyang: string,
  distribution: Record<Wuxing, number>,
  xiyongshen: Wuxing[],
  pillars: { gan: string; zhi: string }[],
): string {
  const dayWxLabel = WUXING_LABELS[dayMasterWx] ?? dayMasterWx;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  const distParts = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${WUXING_LABELS[k as Wuxing]}${v}`)
    .join("、");

  const xiParts = xiyongshen.map((w) => WUXING_LABELS[w]).join("、");

  let strength = "";
  const dayCount = distribution[dayMasterWx] ?? 0;
  if (dayCount >= 3) strength = "偏强";
  else if (dayCount <= 1) strength = "偏弱";
  else strength = "中和";

  return `日主${dayGan}（${yinyang}${dayWxLabel}），生于${pillars[1]?.gan ?? ""}${pillars[1]?.zhi ?? ""}月。`
    + `八字五行分布：${distParts}（共${total}数）。`
    + `日主${strength}，喜用神为${xiParts}。`
    + `取名宜补${xiParts}属性的字，以平衡命局。`;
}
