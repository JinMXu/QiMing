/**
 * 对话式追问 API - POST /api/chat
 *
 * 支持用户对名字追问、调整风格、要求解释等。
 */

import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/types";
import { chatJSON } from "@/lib/llm";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 限流：LLM 调用有成本，按 IP 每分钟最多 20 次
  if (!rateLimit(`chat:${getClientKey(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  try {
    let body: ChatRequest;
    try {
      body = (await request.json()) as ChatRequest;
    } catch {
      return NextResponse.json(
        { error: "请求体不是合法 JSON" },
        { status: 400 },
      );
    }

    if (!body.userMessage?.trim()) {
      return NextResponse.json(
        { error: "消息不能为空" },
        { status: 400 },
      );
    }

    // 构建上下文
    const contextLines: string[] = [];
    if (body.currentName) {
      contextLines.push(`用户当前正在看这个候选名字：${body.currentName}`);
    }
    if (body.generateRequest) {
      const g = body.generateRequest;
      contextLines.push(
        `取名参数回顾：姓氏${g.surname}，性别${g.gender}，${g.nameLength}字名，风格${g.style}`,
      );
      if (g.likedChars) contextLines.push(`喜欢的字：${g.likedChars}`);
      if (g.tabooChars) contextLines.push(`避讳：${g.tabooChars}`);
      if (g.generationChar) contextLines.push(`辈分字：${g.generationChar}`);
    }

    const contextBlock = contextLines.length > 0
      ? `\n## 对话背景\n${contextLines.join("\n")}\n`
      : "";

    const userPrompt = `${contextBlock}\n## 用户消息\n${body.userMessage}`;

    const result = await chatJSON({
      system: CHAT_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.85,
      maxTokens: 2048,
    });

    const data = result.json as ChatResponse;

    return NextResponse.json({
      reply: data?.reply ?? "",
      suggestedNames: data?.suggestedNames ?? [],
    });
  } catch (error) {
    console.error("对话失败:", error);
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
