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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.fullName) {
      return NextResponse.json(
        { error: "请提供要分析的名字" },
        { status: 400 },
      );
    }

    // 构建上下文
    const context: string[] = [];
    context.push(`名字：${body.fullName}`);
    context.push(`姓氏：${body.surname}，性别：${body.gender}`);
    context.push(
      `风格：${STYLE_LABELS[body.style] ?? body.style}`,
    );
    if (body.birthDateTime) {
      context.push(`出生时间：${body.birthDateTime}（${body.calendarType === "lunar" ? "农历" : "公历"}）`);
      if (body.useBazi) context.push("需要结合八字五行分析，返回结构化 bazi 信息");
    }

    const userPrompt = `## 名字信息\n${context.join("。")}\n\n请对「${body.fullName}」进行深度分析，返回 JSON。`;

    const result = await chatJSON({
      system: DEEP_ANALYSIS_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    const data = result.json as AnalyzeResponse;

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
