/**
 * LLM 调用层（服务端）
 *
 * 支持多 provider，默认 deepseek-v4-pro。
 * 所有 provider 兼容 OpenAI SDK 接口。
 *
 * 环境变量（.env.local）：
 *   LLM_PROVIDER   - deepseek(默认) / openai / qwen / glm
 *   LLM_MODEL      - 模型名（可选，覆盖默认）
 *   DEEPSEEK_API_KEY / OPENAI_API_KEY / DASHSCOPE_API_KEY / GLM_API_KEY
 *   LLM_THINKING   - deepseek 是否启用思考模式（默认 disabled）
 */

import OpenAI from "openai";

export type ProviderName = "deepseek" | "openai" | "qwen" | "glm";

interface ProviderConfig {
  defaultModel: string;
  defaultBaseUrl: string;
  apiKeyEnv: string;
  baseUrlEnv: string;
}

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  deepseek: {
    defaultModel: "deepseek-v4-flash",
    defaultBaseUrl: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
  },
  openai: {
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
  },
  qwen: {
    defaultModel: "qwen-plus",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    baseUrlEnv: "DASHSCOPE_BASE_URL",
  },
  glm: {
    defaultModel: "glm-4-plus",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    baseUrlEnv: "GLM_BASE_URL",
  },
};

export interface LlmConfig {
  provider: ProviderName;
  model: string;
  baseUrl: string;
  apiKey: string;
  thinking: boolean;
}

/** 脱敏配置（供前端展示用，不包含 apiKey） */
export interface LlmConfigSummary {
  provider: ProviderName;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  thinking: boolean;
}

/** 返回脱敏的 LLM 配置摘要，供 /api/config 暴露给前端 */
export function getLlmConfigSummary(): LlmConfigSummary {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek") as ProviderName;
  const cfg = PROVIDERS[provider] ?? PROVIDERS.deepseek;
  const model = process.env.LLM_MODEL ?? cfg.defaultModel;
  const baseUrl =
    process.env.LLM_BASE_URL ??
    process.env[cfg.baseUrlEnv] ??
    cfg.defaultBaseUrl;
  const apiKey =
    process.env.LLM_API_KEY ?? process.env[cfg.apiKeyEnv] ?? "";
  return {
    provider,
    model,
    baseUrl,
    hasApiKey: Boolean(apiKey),
    thinking: (process.env.LLM_THINKING ?? "disabled") === "enabled",
  };
}

function loadLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek") as ProviderName;
  const cfg = PROVIDERS[provider] ?? PROVIDERS.deepseek;

  const model = process.env.LLM_MODEL ?? cfg.defaultModel;
  const baseUrl =
    process.env.LLM_BASE_URL ??
    process.env[cfg.baseUrlEnv] ??
    cfg.defaultBaseUrl;
  const apiKey =
    process.env.LLM_API_KEY ?? process.env[cfg.apiKeyEnv] ?? "";

  if (!apiKey) {
    throw new Error(
      `未找到 API Key。请在 .env.local 中设置 ${cfg.apiKeyEnv}。`,
    );
  }

  return {
    provider,
    model,
    baseUrl,
    apiKey,
    thinking: (process.env.LLM_THINKING ?? "disabled") === "enabled",
  };
}

let _client: OpenAI | null = null;
let _config: LlmConfig | null = null;

function getClient(): { client: OpenAI; config: LlmConfig } {
  if (!_client || !_config) {
    _config = loadLlmConfig();
    _client = new OpenAI({
      apiKey: _config.apiKey,
      baseURL: _config.baseUrl,
    });
  }
  return { client: _client, config: _config };
}

export interface ChatOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  json: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** 睡眠工具 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 单次调用 LLM
 * 返回原始 content 和 usage，不做 JSON 解析
 */
async function callOnce(
  client: OpenAI,
  config: LlmConfig,
  opts: ChatOptions,
): Promise<{ content: string; usage: ChatResult["usage"]; finishReason: string }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  // DeepSeek V4：不设置 extra_body，使用默认行为
  // 注意：thinking: disabled 可能导致 content 为空
  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model: config.model,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 4096,
    response_format: { type: "json_object" },
  };

  const response = await client.chat.completions.create(requestParams);

  const content = response.choices[0]?.message?.content ?? "";
  const finishReason = response.choices[0]?.finish_reason ?? "unknown";
  const usage = response.usage
    ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      }
    : undefined;

  return { content, usage, finishReason };
}

/**
 * 流式调用 LLM，返回文本块的异步生成器
 * 适用于需要边生成边处理的场景（如 NDJSON 逐行推送）
 * 不使用 response_format: json_object（与 stream 不兼容）
 */
export async function* chatStream(opts: ChatOptions): AsyncGenerator<string> {
  const { client, config } = getClient();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
    model: config.model,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 4096,
    stream: true,
  };

  // DeepSeek V4：不设置 extra_body，使用默认行为
  // 注意：某些情况下 thinking: disabled 可能导致 content 为空
  if (config.provider === "deepseek") {
    // 不主动干预 thinking 模式，由模型自行决定
  }

  const stream = await client.chat.completions.create(requestParams);

  let chunkCount = 0;
  let contentChunkCount = 0;
  for await (const chunk of stream) {
    chunkCount++;
    const delta = (chunk as OpenAI.Chat.Completions.ChatCompletionChunk).choices?.[0]
      ?.delta;
    if (delta?.content) {
      contentChunkCount++;
      yield delta.content;
    }
  }
  console.log(`[LLM stream] 收到 ${chunkCount} 个 chunk，其中 ${contentChunkCount} 个有内容`);
  console.log(`[LLM stream] 收到 ${chunkCount} 个 chunk，其中 ${contentChunkCount} 个有内容`);
}

/**
 * 调用 LLM 并解析 JSON 输出
 * - 自动重试空内容（最多 2 次）
 * - 检测截断（finish_reason === "length"）
 */
export async function chatJSON(opts: ChatOptions): Promise<ChatResult> {
  const { client, config } = getClient();
  const MAX_RETRIES = 2;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { content, usage, finishReason } = await callOnce(
        client,
        config,
        opts,
      );

      // 空内容检测
      if (!content || content.trim().length === 0) {
        console.warn(
          `[LLM] 第 ${attempt + 1} 次返回空内容 (finish_reason: ${finishReason})，重试中...`,
        );
        lastError = new Error(
          `LLM 返回空内容（finish_reason: ${finishReason}）。可能原因：思考模式消耗了全部 token 预算，或 maxTokens 不足。`,
        );
        if (attempt < MAX_RETRIES) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      // 截断检测
      if (finishReason === "length") {
        console.warn(
          `[LLM] 返回被截断 (finish_reason: length)，content 长度: ${content.length}`,
        );
        // 先尝试修复截断的 JSON（补全缺失的括号），可能挽救部分结果
        const repaired = tryRepairJson(content);
        if (repaired) {
          console.log("[LLM] 截断的 JSON 修复成功");
          return {
            content: repaired,
            json: JSON.parse(repaired),
            usage,
          };
        }
        // 修复失败：如果还有重试次数，用 1.5 倍 maxTokens 重试
        if (attempt < MAX_RETRIES) {
          const newMax = Math.round((opts.maxTokens ?? 4096) * 1.5);
          console.warn(
            `[LLM] JSON 修复失败，以 maxTokens=${newMax} 重试 (第 ${attempt + 2} 次)...`,
          );
          opts = { ...opts, maxTokens: newMax };
          await sleep(1000);
          continue;
        }
        throw new Error(
          `LLM 输出被截断（达到 max_tokens=${opts.maxTokens}）。已尝试修复和重试仍失败，请减少生成数量（如改为 4-5 个名字）。`,
        );
      }

      // 正常 JSON 解析
      let json: unknown = null;
      try {
        json = JSON.parse(content);
      } catch {
        // 尝试从 markdown 代码块中提取
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          json = JSON.parse(match[1]);
        } else {
          // 尝试修复
          const repaired = tryRepairJson(content);
          if (repaired) {
            json = JSON.parse(repaired);
          } else {
            throw new Error(
              `LLM 未返回合法 JSON。原始内容（前 500 字）:\n${content.slice(0, 500)}`,
            );
          }
        }
      }

      return { content, json, usage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // 网络错误或 API 错误才重试，JSON 解析错误不重试
      const isRetryable =
        lastError.message.includes("空内容") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("429") ||
        lastError.message.includes("503");

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(
          `[LLM] 第 ${attempt + 1} 次调用失败: ${lastError.message.slice(0, 100)}，重试中...`,
        );
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("LLM 调用失败");
}

/**
 * 尝试修复被截断的 JSON
 * 策略：补全缺失的 } 和 ]
 */
function tryRepairJson(content: string): string | null {
  let repaired = content.trim();

  // 移除可能的 markdown 包裹
  const match = repaired.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    repaired = match[1].trim();
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // 继续修复
  }

  // 统计未闭合的括号
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }

  // 如果在字符串中被截断，先闭合字符串
  if (inString) {
    repaired += '"';
  }

  // 反向补全未闭合的括号
  for (let i = stack.length - 1; i >= 0; i--) {
    const open = stack[i];
    repaired += open === "{" ? "}" : "]";
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}
