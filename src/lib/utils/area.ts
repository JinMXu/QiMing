/**
 * 中国省市区数据工具
 * 基于 china-area-data
 */

import areaData from "china-area-data/data.json";

export interface AreaNode {
  code: string;
  name: string;
}

/** 省份列表 */
export function getProvinces(): AreaNode[] {
  const provinces = (areaData as Record<string, Record<string, string>>)["86"];
  return Object.entries(provinces).map(([code, name]) => ({ code, name }));
}

/** 根据省份 code 获取城市列表 */
export function getCities(provinceCode: string): AreaNode[] {
  if (!provinceCode) return [];
  const cities = (areaData as Record<string, Record<string, string>>)[provinceCode];
  if (!cities) return [];
  return Object.entries(cities).map(([code, name]) => ({ code, name }));
}

/** 根据城市 code 获取区县列表 */
export function getDistricts(cityCode: string): AreaNode[] {
  if (!cityCode) return [];
  const districts = (areaData as Record<string, Record<string, string>>)[cityCode];
  if (!districts) return [];
  return Object.entries(districts).map(([code, name]) => ({ code, name }));
}

/** 根据 code 获取地区名称 */
export function getAreaName(code: string): string | undefined {
  for (const parentCode in areaData) {
    const children = (areaData as Record<string, Record<string, string>>)[parentCode];
    if (children[code]) return children[code];
  }
  return undefined;
}

/** 拼接省市区为字符串 */
export function formatBirthPlace(
  provinceCode: string,
  cityCode: string,
  districtCode: string,
): string {
  const parts = [
    getAreaName(provinceCode),
    getAreaName(cityCode),
    getAreaName(districtCode),
  ].filter(Boolean);
  return parts.join(" ");
}
