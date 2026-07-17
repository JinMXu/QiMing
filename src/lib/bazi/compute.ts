/**
 * 八字排盘服务（服务端）
 *
 * 基于 lunar-javascript 计算八字四柱、五行分布、喜用神。
 * 不依赖 LLM，确保每次都能得到准确的八字分析。
 *
 * 出生时间约定：前端传入「不带时区的本地时间字符串」（YYYY-MM-DDTHH:mm），
 * 本模块按字面解析，不经过 Date 的时区转换，部署在任何时区的服务器结果都一致。
 * 出生地用于真太阳时校正（按省会经度近似）。
 */

import { Solar } from "lunar-javascript";
import type { BaziInfo, Wuxing } from "@/types";

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

// 各省会/首府经度（近似值），用于真太阳时校正
// 真太阳时 = 北京时间 + (当地经度 - 120°E) × 4 分钟
const PROVINCE_LONGITUDES: [string, number][] = [
  ["北京", 116.4], ["天津", 117.2], ["上海", 121.5], ["重庆", 106.5],
  ["河北", 114.5], ["山西", 112.5], ["内蒙古", 111.7], ["辽宁", 123.4],
  ["吉林", 125.3], ["黑龙江", 126.6], ["江苏", 118.8], ["浙江", 120.2],
  ["安徽", 117.3], ["福建", 119.3], ["江西", 115.9], ["山东", 117.0],
  ["河南", 113.6], ["湖北", 114.3], ["湖南", 113.0], ["广东", 113.3],
  ["广西", 108.3], ["海南", 110.3], ["四川", 104.1], ["贵州", 106.7],
  ["云南", 102.7], ["西藏", 91.1], ["陕西", 108.9], ["甘肃", 103.8],
  ["青海", 101.8], ["宁夏", 106.3], ["新疆", 87.6], ["香港", 114.2],
  ["澳门", 113.5], ["台湾", 121.5],
];

interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 解析「不带时区的本地时间字符串」，避免 Date 构造带来的时区依赖 */
function parseLocalDateTime(value: string): LocalDateTime | null {
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }
  return { year, month, day, hour, minute };
}

/** 根据出生地名称匹配省份经度 */
function lookupLongitude(birthPlace: string): number | undefined {
  const hit = PROVINCE_LONGITUDES.find(([name]) => birthPlace.includes(name));
  return hit?.[1];
}

/** 真太阳时校正：按出生地经度平移时间，返回校正后的时间与偏移分钟数 */
function applyTrueSolarTime(
  t: LocalDateTime,
  birthPlace?: string,
): { time: LocalDateTime; offsetMin: number } {
  const lng = birthPlace ? lookupLongitude(birthPlace) : undefined;
  if (lng === undefined) return { time: t, offsetMin: 0 };
  const offsetMin = Math.round((lng - 120) * 4);
  if (offsetMin === 0) return { time: t, offsetMin };
  // 用 UTC Date 做加减，避免本地时区干扰
  const shifted = new Date(
    Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute + offsetMin),
  );
  return {
    time: {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    },
    offsetMin,
  };
}

/**
 * 从本地时间字符串计算八字
 * @param birthDateTime 本地时间字符串（YYYY-MM-DDTHH:mm，不带时区，公历）
 * @param birthPlace 出生地（用于真太阳时校正，按省会经度近似）
 */
export function computeBazi(
  birthDateTime: string,
  birthPlace?: string,
): BaziInfo | null {
  try {
    const parsed = parseLocalDateTime(birthDateTime);
    if (!parsed) return null;

    // 真太阳时校正
    const { time, offsetMin } = applyTrueSolarTime(parsed, birthPlace);

    const solar = Solar.fromYmdHms(
      time.year,
      time.month,
      time.day,
      time.hour,
      time.minute,
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

    // 喜用神推算：结合月令旺衰与扶抑力量对比
    const monthZhiWx = ZHI_WUXING[monthZhi] ?? "earth";
    const { xiyongshen, strength } = computeXiyongshen(
      dayMasterWx,
      distribution,
      monthZhiWx,
    );

    // 生成摘要
    const summary = buildBaziSummary(
      dayGan, dayMasterWx, dayMasterYinYang,
      distribution, xiyongshen, pillars, strength, offsetMin,
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

// 五行生克关系
const GENERATES: Record<Wuxing, Wuxing> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
const GENERATED_BY: Record<Wuxing, Wuxing> = {
  wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
};
const RESTRICTS: Record<Wuxing, Wuxing> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};
const RESTRICTED_BY: Record<Wuxing, Wuxing> = {
  wood: "metal", metal: "fire", fire: "water", water: "earth", earth: "wood",
};

type DayMasterStrength = "偏强" | "偏弱" | "中和";

/**
 * 喜用神推算（扶抑法）
 *
 * 力量对比：比劫（同我）+ 印星（生我）为扶；食伤（我生）+ 财星（我克）+ 官杀（克我）为耗。
 * 月令（月支）对旺衰影响最大，额外记权重 2。
 * - 偏强 → 喜泄（食伤）、耗（财）、克（官杀），优先补数量少的
 * - 偏弱 → 喜生（印星）、扶（比劫）
 * - 中和 → 补全局数量最少的五行
 */
function computeXiyongshen(
  dayMasterWx: Wuxing,
  distribution: Record<Wuxing, number>,
  monthZhiWx: Wuxing,
): { xiyongshen: Wuxing[]; strength: DayMasterStrength } {
  const support = distribution[dayMasterWx] + distribution[GENERATED_BY[dayMasterWx]];
  const drain =
    distribution[GENERATES[dayMasterWx]] +
    distribution[RESTRICTS[dayMasterWx]] +
    distribution[RESTRICTED_BY[dayMasterWx]];

  const monthSupports =
    monthZhiWx === dayMasterWx || monthZhiWx === GENERATED_BY[dayMasterWx];
  const supportScore = support + (monthSupports ? 2 : 0);
  const drainScore = drain + (monthSupports ? 0 : 2);

  if (supportScore - drainScore >= 2) {
    const candidates = [
      GENERATES[dayMasterWx],
      RESTRICTS[dayMasterWx],
      RESTRICTED_BY[dayMasterWx],
    ].sort((a, b) => distribution[a] - distribution[b]);
    const picked = candidates.filter((w) => distribution[w] <= 2);
    return {
      xiyongshen: picked.length > 0 ? picked : candidates.slice(0, 1),
      strength: "偏强",
    };
  }

  if (drainScore - supportScore >= 2) {
    return {
      xiyongshen: [GENERATED_BY[dayMasterWx], dayMasterWx],
      strength: "偏弱",
    };
  }

  const weakest = (Object.entries(distribution) as [Wuxing, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([w]) => w);
  return { xiyongshen: weakest, strength: "中和" };
}

function buildBaziSummary(
  dayGan: string,
  dayMasterWx: Wuxing,
  yinyang: string,
  distribution: Record<Wuxing, number>,
  xiyongshen: Wuxing[],
  pillars: { gan: string; zhi: string }[],
  strength: DayMasterStrength,
  trueSolarOffsetMin: number,
): string {
  const dayWxLabel = WUXING_LABELS[dayMasterWx] ?? dayMasterWx;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  const distParts = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${WUXING_LABELS[k as Wuxing]}${v}`)
    .join("、");

  const xiParts = xiyongshen.map((w) => WUXING_LABELS[w]).join("、");

  const solarNote =
    trueSolarOffsetMin !== 0
      ? `已按出生地经度校正真太阳时（${trueSolarOffsetMin > 0 ? "+" : ""}${trueSolarOffsetMin} 分钟）。`
      : "";

  return `日主${dayGan}（${yinyang}${dayWxLabel}），生于${pillars[1]?.gan ?? ""}${pillars[1]?.zhi ?? ""}月。`
    + `八字五行分布：${distParts}（共${total}数）。`
    + `日主${strength}，喜用神为${xiParts}。`
    + `取名宜补${xiParts}属性的字，以平衡命局。`
    + solarNote;
}
