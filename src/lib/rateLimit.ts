/**
 * 简易内存限流（固定窗口，按 key 计数）
 *
 * 进程内存实现，单实例内有效。Serverless 多实例环境下每个实例独立计数，
 * 只能作为兜底防护；如需严格限流请接入 Redis / Upstash 等外部存储。
 */

interface WindowCounter {
  count: number;
  resetAt: number;
}

const counters = new Map<string, WindowCounter>();

/** 表过大时清理已过期的计数器，避免内存无限增长 */
function sweepExpired(now: number): void {
  if (counters.size < 1000) return;
  for (const [key, c] of counters) {
    if (c.resetAt <= now) counters.delete(key);
  }
}

/**
 * 检查并消耗一次配额
 * @param key 限流维度（如 `gen:1.2.3.4`）
 * @param limit 窗口内允许的次数
 * @param windowMs 窗口时长（毫秒）
 * @returns true=放行；false=超出限制
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpired(now);
  const c = counters.get(key);
  if (!c || c.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (c.count >= limit) return false;
  c.count += 1;
  return true;
}

/** 从请求中提取客户端标识（优先代理头，本地开发为 unknown） */
export function getClientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
