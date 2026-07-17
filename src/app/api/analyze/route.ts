/**
 * 深度分析 API - POST /api/analyze
 *
 * 对单个名字做六大维度深度分析（八字五行/音律/字形/寓意/典故/避讳+综合评价）。
 * 前端缓存分析结果，相同名字不重复请求。
 */

import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "@/types";
import { chatJSON } from "@/lib/llm";
import { DEEP_ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompt";
import { STYLE_LABELS } from "@/lib/prompt";
import { computeBazi } from "@/lib/bazi/compute";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 限流：LLM 调用有成本，按 IP 每分钟最多 30 次
  if (!rateLimit(`anlz:${getClientKey(request)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  try {
    let body: AnalyzeRequest;
    try {
      body = (await request.json()) as AnalyzeRequest;
    } catch {
      return NextResponse.json(
        { error: "请求体不是合法 JSON" },
        { status: 400 },
      );
    }

    if (!body.fullName) {
      return NextResponse.json(
        { error: "请提供要分析的名字" },
        { status: 400 },
      );
    }

    // 服务端八字：优先于 LLM 排盘，确保四柱/五行/喜用神准确
    const serverBazi =
      body.useBazi && body.birthDateTime
        ? computeBazi(body.birthDateTime, body.birthPlace)
        : null;

    // 构建上下文
    const context: string[] = [];
    context.push(`名字：${body.fullName}`);
    context.push(`姓氏：${body.surname}，性别：${body.gender}`);
    context.push(
      `风格：${STYLE_LABELS[body.style] ?? body.style}`,
    );
    if (serverBazi) {
      const p = serverBazi.pillars;
      context.push(
        `八字信息（系统已精确排盘，以此为准）：四柱 ${p.year.gan}${p.year.zhi}年 ${p.month.gan}${p.month.zhi}月 ${p.day.gan}${p.day.zhi}日 ${p.hour.gan}${p.hour.zhi}时。${serverBazi.summary}`,
      );
    } else if (body.birthDateTime) {
      context.push(`出生时间：${body.birthDateTime}（公历）`);
      if (body.useBazi) context.push("需要结合八字五行分析，返回结构化 bazi 信息");
    }

    const userPrompt = `## 名字信息\n${context.join("。\n")}\n\n请对「${body.fullName}」进行深度分析，返回 JSON。`;

    const result = await chatJSON({
      system: DEEP_ANALYSIS_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    const data = result.json as AnalyzeResponse;
    // 八字信息以服务端排盘为准，忽略 LLM 返回的版本
    if (serverBazi) {
      data.bazi = serverBazi;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("深度分析失败:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "分析失败",
      },
      { status: 500 },
    );
  }
}
