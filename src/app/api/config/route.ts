/**
 * 配置查询 API - GET /api/config
 * 返回脱敏的 LLM 配置，供 /settings 展示。不暴露 apiKey 本身。
 */

import { NextResponse } from "next/server";
import { getLlmConfigSummary } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getLlmConfigSummary());
}
