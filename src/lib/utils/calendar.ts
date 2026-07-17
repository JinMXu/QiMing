/**
 * 公历/农历转换工具
 * 基于 lunar-javascript
 *
 * 注意：提交给后端的出生时间统一为「不带时区的本地时间字符串」（YYYY-MM-DDTHH:mm），
 * 由服务端按字面解析。不要用 Date.toISOString()（UTC），否则前后端时区不一致时
 * 会导致日期/时辰漂移，八字排盘出错。
 */

import { Solar, Lunar, LunarMonth, LunarYear } from "lunar-javascript";

/**
 * 将农历日期时间转换为公历 Date
 * @param year 农历年
 * @param month 农历月（1-12，闰月用负数如 -4 表示闰四月）
 * @param day 农历日
 * @param hour 小时（0-23）
 * @param minute 分钟
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0);
  const solar = lunar.getSolar();
  return new Date(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour(),
    solar.getMinute(),
    0,
  );
}

/**
 * 将 Date 转换为 datetime-local 输入框需要的字符串
 */
export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 将公历 Date 转换为农历显示文本
 */
export function solarToLunarText(date: Date): string {
  const solar = Solar.fromYmd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const lunar = solar.getLunar();
  return lunar.toString();
}

/**
 * 将 datetime-local 字符串拆分为年月日时分
 */
export function parseDateTimeLocal(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if ([year, month, day, hour, minute].some((v) => Number.isNaN(v))) return null;
  return { year, month, day, hour, minute };
}

/**
 * 统一将前端日期时间（公历或农历）转换为提交给后端的本地时间字符串
 * 返回格式：YYYY-MM-DDTHH:mm（不带时区），服务端按字面解析，不受时区影响
 * @param value datetime-local 字符串
 * @param calendarType solar | lunar
 */
export function convertToSolarDateTime(
  value: string,
  calendarType: "solar" | "lunar",
): string | null {
  const parsed = parseDateTimeLocal(value);
  if (!parsed) return null;
  try {
    if (calendarType === "lunar") {
      const { year, month, day, hour, minute } = parsed;
      return formatDateTimeLocal(lunarToSolar(year, month, day, hour, minute));
    }
    // 公历：datetime-local 本身就是不带时区的本地时间字符串，原样传递
    return value;
  } catch {
    return null;
  }
}

/**
 * 获取农历年份选项（用于下拉框）
 * @param start 起始年份
 * @param end 结束年份
 */
export function getLunarYearOptions(start = 1901, end = 2100): number[] {
  const years: number[] = [];
  for (let y = start; y <= end; y++) {
    years.push(y);
  }
  return years;
}

/**
 * 获取农历月份选项（含闰月）
 * @param year 农历年
 */
export function getLunarMonthOptions(year: number): { value: number; label: string }[] {
  const leapMonth = LunarYear.fromYear(year).getLeapMonth();
  const options: { value: number; label: string }[] = [];
  const monthNames = [
    "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "冬月", "腊月",
  ];
  for (let m = 1; m <= 12; m++) {
    options.push({ value: m, label: monthNames[m - 1] });
    if (leapMonth === m) {
      options.push({ value: -m, label: `闰${monthNames[m - 1]}` });
    }
  }
  return options;
}

/**
 * 获取农历某日选项（1-30）
 * @param year 农历年
 * @param month 农历月（闰月用负数）
 */
export function getLunarDayOptions(year: number, month: number): { value: number; label: string }[] {
  const lunarMonth = LunarMonth.fromYm(year, month);
  if (!lunarMonth) return [];
  const days = lunarMonth.getDayCount();
  const dayNames = [
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
  ];
  const options: { value: number; label: string }[] = [];
  for (let d = 1; d <= days; d++) {
    options.push({ value: d, label: dayNames[d - 1] ?? `${d}日` });
  }
  return options;
}
