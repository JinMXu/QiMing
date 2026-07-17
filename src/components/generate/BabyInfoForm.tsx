"use client";

import { useMemo } from "react";
import type { Gender, NameStyle, NameStyleWeights, FilterOptions } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  getProvinces,
  getCities,
  getDistricts,
  formatBirthPlace,
} from "@/lib/utils/area";
import {
  getDefaultWeightsForStyle,
  STYLE_LABELS,
  STYLE_ORDER,
} from "@/lib/utils/style";
import {
  getLunarYearOptions,
  getLunarMonthOptions,
  getLunarDayOptions,
  formatDateTimeLocal,
  parseDateTimeLocal,
  lunarToSolar,
} from "@/lib/utils/calendar";
import { Solar } from "lunar-javascript";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男孩" },
  { value: "female", label: "女孩" },
  { value: "neutral", label: "中性" },
];

const STYLE_OPTIONS: { value: NameStyle; label: string }[] = STYLE_ORDER.map(
  (value) => ({ value, label: STYLE_LABELS[value] }),
);

export interface BabyInfoFormData {
  surname: string;
  gender: Gender;
  calendarType: "solar" | "lunar";
  birthDateTime: string;
  birthPlaceProvince: string;
  birthPlaceCity: string;
  birthPlaceDistrict: string;
  useBazi: boolean;
  nameLength: 1 | 2;
  generationChar: string;
  generationCharPos: "first" | "last";
  likedChars: string;
  tabooChars: string;
  style: NameStyle;
  styleWeights: NameStyleWeights;
  filters: FilterOptions;
  notes: string;
  count: number;
}

interface BabyInfoFormProps {
  value: BabyInfoFormData;
  onChange: (value: BabyInfoFormData) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

export function BabyInfoForm({
  value,
  onChange,
  onSubmit,
  loading,
  error,
  compact,
}: BabyInfoFormProps) {
  const provinces = useMemo(() => getProvinces(), []);
  const cities = useMemo(
    () => getCities(value.birthPlaceProvince),
    [value.birthPlaceProvince],
  );
  const districts = useMemo(
    () => getDistricts(value.birthPlaceCity),
    [value.birthPlaceCity],
  );

  const update = <K extends keyof BabyInfoFormData>(key: K, val: BabyInfoFormData[K]) => {
    onChange({ ...value, [key]: val });
  };

  const updateFilter = (key: keyof FilterOptions) => {
    onChange({
      ...value,
      filters: { ...value.filters, [key]: !value.filters[key] },
    });
  };

  const updateStyleWeight = (style: NameStyle, weight: number) => {
    onChange({
      ...value,
      styleWeights: { ...value.styleWeights, [style]: weight },
    });
  };

  const birthPlaceText = formatBirthPlace(
    value.birthPlaceProvince,
    value.birthPlaceCity,
    value.birthPlaceDistrict,
  );

  return (
    <div className={cn("space-y-5", compact ? "" : "rounded-2xl border border-stone-200 bg-white p-6 shadow-sm")}>
      <SectionTitle icon="👶" title="宝宝信息" />

      {/* 姓氏 + 性别 + 名字字数 */}
      <div className="grid grid-cols-1 gap-4">
        <Field label="姓氏" required>
          <input
            type="text"
            maxLength={2}
            placeholder="如：林"
            value={value.surname}
            onChange={(e) => update("surname", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="性别倾向">
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("gender", opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  value.gender === opt.value
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="名字字数">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 2 as const, label: "双字名" },
              { value: 1 as const, label: "单字名" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("nameLength", opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  value.nameLength === opt.value
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* 出生时间 */}
      <Field label="出生时间">
        <div className="space-y-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3">
          <div className="flex gap-2">
            {[
              { value: "solar" as const, label: "公历" },
              { value: "lunar" as const, label: "农历" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("calendarType", opt.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  value.calendarType === opt.value
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-stone-500 hover:bg-stone-100",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {value.calendarType === "solar" ? (
            <input
              type="datetime-local"
              value={value.birthDateTime}
              onChange={(e) => update("birthDateTime", e.target.value)}
              className="input"
            />
          ) : (
            <LunarDatetimePicker
              value={value.birthDateTime}
              onChange={(v) => update("birthDateTime", v)}
            />
          )}

          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={value.useBazi}
              onChange={(e) => update("useBazi", e.target.checked)}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            结合八字五行分析
          </label>
        </div>
      </Field>

      {/* 出生地 */}
      <Field label="出生地（选填）">
        <div className="grid grid-cols-[1.2fr_1.5fr_1fr] gap-2">
          <select
            value={value.birthPlaceProvince}
            onChange={(e) =>
              // 切换省份时重置市/区（级联重置在事件中完成，不用 effect）
              onChange({
                ...value,
                birthPlaceProvince: e.target.value,
                birthPlaceCity: "",
                birthPlaceDistrict: "",
              })
            }
            className="input truncate"
          >
            <option value="">省</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={value.birthPlaceCity}
            onChange={(e) =>
              onChange({
                ...value,
                birthPlaceCity: e.target.value,
                birthPlaceDistrict: "",
              })
            }
            className="input truncate"
            disabled={!value.birthPlaceProvince}
          >
            <option value="">市</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={value.birthPlaceDistrict}
            onChange={(e) => update("birthPlaceDistrict", e.target.value)}
            className="input truncate"
            disabled={!value.birthPlaceCity}
          >
            <option value="">区</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {birthPlaceText && (
          <p className="mt-1 text-xs text-stone-400">{birthPlaceText}</p>
        )}
      </Field>

      <SectionTitle icon="✨" title="名字设置" />

      <div className="grid grid-cols-1 gap-4">
        <Field label="辈分字（选填）">
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={1}
              placeholder="辈分"
              value={value.generationChar}
              onChange={(e) => update("generationChar", e.target.value)}
              className="input w-20"
            />
            <button
              type="button"
              onClick={() => update("generationCharPos", "first")}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                value.generationCharPos === "first"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              首字
            </button>
            <button
              type="button"
              onClick={() => update("generationCharPos", "last")}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                value.generationCharPos === "last"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              末字
            </button>
          </div>
        </Field>

        <Field label="喜欢的字（选填）">
          <input
            type="text"
            placeholder="希望含有的字，如：安、宁、予"
            value={value.likedChars}
            onChange={(e) => update("likedChars", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="避讳的字（选填）">
          <input
            type="text"
            placeholder="绝不出现的字，如：伟、强、丽"
            value={value.tabooChars}
            onChange={(e) => update("tabooChars", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <SectionTitle icon="🎨" title="风格偏好" />

      <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50/50 p-3">
        <Field label="风格基调">
          <div className="grid grid-cols-4 gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    style: opt.value,
                    styleWeights: getDefaultWeightsForStyle(opt.value),
                  })
                }
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                  value.style === opt.value
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-3">
          <p className="text-xs font-medium text-stone-600">风格混合度</p>
          {STYLE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <span className="w-16 text-xs text-stone-500">{opt.label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={value.styleWeights[opt.value]}
                onChange={(e) => updateStyleWeight(opt.value, Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-emerald-600"
              />
              <span className="w-8 text-right text-xs font-medium text-stone-600">
                {value.styleWeights[opt.value]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle icon="🔍" title="更多筛选" />

      <div className="grid grid-cols-2 gap-3">
        <FilterToggle
          label="避开生僻字"
          checked={value.filters.avoidRareChars}
          onChange={() => updateFilter("avoidRareChars")}
        />
        <FilterToggle
          label="避开多音字"
          checked={value.filters.avoidPolyphonic}
          onChange={() => updateFilter("avoidPolyphonic")}
        />
        <FilterToggle
          label="避开谐音不雅"
          checked={value.filters.avoidBadHomophone}
          onChange={() => updateFilter("avoidBadHomophone")}
        />
        <FilterToggle
          label="仅看高分名字"
          checked={value.filters.highScoreOnly}
          onChange={() => updateFilter("highScoreOnly")}
        />
        <FilterToggle
          label={`笔画不宜过多（≤${value.filters.maxStrokes ?? 20}画）`}
          checked={value.filters.limitStrokes}
          onChange={() => updateFilter("limitStrokes")}
        />
      </div>

      <Field label="补充说明（选填）">
        <input
          type="text"
          placeholder="其他要求"
          value={value.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="input"
        />
      </Field>

      <Field label="生成数量">
        <select
          value={value.count}
          onChange={(e) => update("count", Number(e.target.value))}
          className="input"
        >
          <option value={4}>4 个</option>
          <option value={6}>6 个</option>
          <option value={8}>8 个</option>
          <option value={10}>10 个</option>
          <option value={12}>12 个</option>
        </select>
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              surname: "",
              birthDateTime: "",
              birthPlaceProvince: "",
              birthPlaceCity: "",
              birthPlaceDistrict: "",
              generationChar: "",
              likedChars: "",
              tabooChars: "",
              notes: "",
              style: "literary",
              styleWeights: getDefaultWeightsForStyle("literary"),
            })
          }
          className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
        >
          清空
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              生成中…
            </>
          ) : (
            <>
              ✨ 生成好名
            </>
          )}
        </button>
      </div>

      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}

function LunarDatetimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // value 是公历 ISO 字符串，需要反推出农历显示
  const solar = useMemo(() => {
    const parsed = parseDateTimeLocal(value);
    if (!parsed) return Solar.fromYmd(new Date().getFullYear(), 1, 1);
    return Solar.fromYmd(parsed.year, parsed.month, parsed.day);
  }, [value]);

  const lunar = useMemo(() => solar.getLunar(), [solar]);
  const year = lunar.getYear();
  const month = lunar.getMonth();
  const day = lunar.getDay();
  const parsedTime = parseDateTimeLocal(value);
  const hour = parsedTime?.hour ?? 0;
  const minute = parsedTime?.minute ?? 0;

  const years = useMemo(() => getLunarYearOptions(), []);
  const months = useMemo(() => getLunarMonthOptions(year), [year]);
  const days = useMemo(() => getLunarDayOptions(year, month), [year, month]);

  const update = (patch: { year?: number; month?: number; day?: number; hour?: number; minute?: number }) => {
    const next = {
      year,
      month,
      day,
      hour,
      minute,
      ...patch,
    };
    try {
      const solarDate = lunarToSolar(next.year, next.month, next.day, next.hour, next.minute);
      onChange(formatDateTimeLocal(solarDate));
    } catch {
      // 无效日期不做处理
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select value={year} onChange={(e) => update({ year: Number(e.target.value) })} className="input">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select value={month} onChange={(e) => update({ month: Number(e.target.value) })} className="input">
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select value={day} onChange={(e) => update({ day: Number(e.target.value) })} className="input">
          {days.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={hour} onChange={(e) => update({ hour: Number(e.target.value) })} className="input">
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}时
            </option>
          ))}
        </select>
        <select value={minute} onChange={(e) => update({ minute: Number(e.target.value) })} className="input">
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}分
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-stone-800">
      <span>{icon}</span>
      {title}
    </h3>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-stone-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
      />
      {label}
    </label>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
