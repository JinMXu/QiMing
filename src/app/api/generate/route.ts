/**
 * 取名生成 API - POST /api/generate (SSE 流式)
 *
 * 使用 LLM 流式 API + NDJSON 格式，边生成边推送名字。
 * 只返回基础信息（姓名+评分+推荐），深度分析由 /api/analyze 按需获取。
 */

import { NextRequest } from "next/server";
import type { GenerateRequest } from "@/types";
import { chatStream } from "@/lib/llm";
import {
  FAST_LIST_SYSTEM_PROMPT,
  buildGenerateUserPrompt,
} from "@/lib/prompt";
import { computeBazi } from "@/lib/bazi/compute";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 流式生成可能持续较久，显式放宽函数超时（平台支持时生效）
export const maxDuration = 60;

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function POST(request: NextRequest) {
  // 限流：LLM 调用有成本，按 IP 每分钟最多 10 次
  if (!rateLimit(`gen:${getClientKey(request)}`, 10, 60_000)) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      { status: 429, headers: JSON_HEADERS },
    );
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是合法 JSON" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  // 参数校验
  if (!body.surname || body.surname.length > 2) {
    return new Response(
      JSON.stringify({ error: "请提供有效的姓氏（1-2 字）" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const count = Math.min(Math.max(body.count ?? 8, 1), 12);
  console.log(`[generate] 请求生成 ${count} 个名字 | 姓氏=${body.surname} | 风格=${body.style}`);

  // 服务端八字：优先于 LLM 排盘，确保四柱/五行/喜用神准确
  const serverBazi =
    body.useBazi && body.birthDateTime
      ? computeBazi(body.birthDateTime, body.birthPlace)
      : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      // 解析单行 JSON，推送对应事件
      let nameTotal = 0;
      let baziSent = false;
      const pushLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let obj: Record<string, unknown>;
        try {
          obj = JSON.parse(trimmed);
        } catch {
          return; // 跳过无法解析的行
        }

        // 八字行（有 summary / pillars 字段）：服务端已发送时忽略 LLM 的版本
        if (obj.summary && obj.pillars) {
          if (!baziSent) {
            baziSent = true;
            send({ type: "bazi", data: obj });
          }
          return;
        }

        // 名字行（有 fullName 字段）
        if (obj.fullName && nameTotal < count) {
          nameTotal++;
          send({ type: "name", data: obj });
        }
      };

      try {
        // 先推送服务端八字，前端可立即展示命盘
        if (serverBazi) {
          baziSent = true;
          send({ type: "bazi", data: serverBazi });
        }

        const userPrompt = buildGenerateUserPrompt({ ...body, count }, serverBazi);

        let buffer = "";
        let fullText = ""; // 累积完整响应文本，供回退解析
        for await (const chunk of chatStream({
          system: FAST_LIST_SYSTEM_PROMPT,
          user: userPrompt,
          temperature: 0.85,
          maxTokens: Math.max(4096, count * 400),
        })) {
          buffer += chunk;
          fullText += chunk;

          // 按行拆分，保留未完成的行在 buffer 中
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            pushLine(line);
          }
        }

        // 处理最后一行（可能没有换行符结尾）
        pushLine(buffer);

        // 回退解析：如果 NDJSON 逐行解析没有得到任何名字，
        // 尝试从完整文本中提取 JSON 对象（LLM 可能输出单一大 JSON 而非 NDJSON）
        if (nameTotal === 0) {
          const extracted = extractNamesFromText(fullText, count);
          for (const name of extracted.names) {
            if (nameTotal >= count) break;
            nameTotal++;
            send({ type: "name", data: name });
          }
          // 服务端已发送八字时不覆盖（LLM 排盘不可信）
          if (extracted.bazi && !baziSent) {
            baziSent = true;
            send({ type: "bazi", data: extracted.bazi });
          }
        }

        console.log(`[generate] 流式完成，共推送 ${nameTotal} 个名字`);
        send({ type: "done", total: nameTotal });
        controller.close();
      } catch (error) {
        console.error("取名生成失败:", error);
        send({
          error:
            error instanceof Error ? error.message : "未知错误",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * 从 LLM 完整响应中提取名字和八字数据（回退解析）。
 * LLM 可能输出单一大 JSON 对象 { baziSummary?, names: [...] } 而非 NDJSON。
 */
function extractNamesFromText(
  text: string,
  maxCount: number,
): { names: Record<string, unknown>[]; bazi?: Record<string, unknown> } {
  // 尝试提取 JSON：先找 markdown 代码块，再尝试整体解析
  let jsonText = text;

  // 去除 markdown 代码块包裹
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
    console.log(`[generate] 回退: 从 markdown 代码块中提取 JSON (${jsonText.length}字符)`);
  } else {
    // 尝试找到最外层 { ... }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonText = text.slice(firstBrace, lastBrace + 1);
    }
    console.log(`[generate] 回退: 尝试整体解析 (${jsonText.length}字符)`);
  }

  try {
    const obj = JSON.parse(jsonText) as Record<string, unknown>;

    // 提取八字
    let bazi: Record<string, unknown> | undefined;
    if (obj.summary && obj.pillars) {
      bazi = {
        summary: obj.summary,
        pillars: obj.pillars,
        distribution: obj.distribution,
        xiyongshen: obj.xiyongshen,
      };
    } else if (obj.baziSummary && typeof obj.baziSummary === "object") {
      bazi = obj.baziSummary as Record<string, unknown>;
    }

    // 提取名字列表
    const names: Record<string, unknown>[] = [];
    if (Array.isArray(obj.names)) {
      for (const name of obj.names) {
        if (name && typeof name === "object" && (name as Record<string, unknown>).fullName) {
          names.push(name as Record<string, unknown>);
          if (names.length >= maxCount) break;
        }
      }
    }

    console.log(`[generate] 回退: 提取到 ${names.length} 个名字`);
    return { names, bazi };
  } catch (e) {
    console.log(`[generate] 回退解析失败: ${(e as Error).message}`);
    return { names: [] };
  }
}
