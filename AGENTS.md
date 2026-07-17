<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 启名 Qiming · 项目说明

面向中国新生儿父母的智能取名 Web 应用。

- **产品名**：启名（Qiming）
- **Slogan**：一名启一生
- **形态**：Next.js 全栈 Web 应用，**纯 LLM 驱动**（无本地字库 / 取名引擎 / 数据库）
- **目标用户**：25-40 岁中国准父母及新手父母

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19
- **语言**：TypeScript（严格模式）
- **样式**：Tailwind CSS v4（`cn()` = clsx + tailwind-merge）
- **八字排盘**：lunar-javascript（仅服务端）
- **LLM**：OpenAI SDK 兼容接口（DeepSeek / OpenAI / 通义千问 / 智谱，见 `src/lib/llm.ts`）
- **持久化**：浏览器 localStorage / sessionStorage（无数据库、无登录体系）
- **包管理**：npm

## 核心架构

主流程（`/generate` 页）：

1. 用户填表单 → `POST /api/generate`
2. 服务端先用 lunar-javascript 排八字（`useBazi` 时），立即以 SSE 推送 `bazi` 事件
3. LLM 以 NDJSON 流式逐行输出候选名（含评分、逐字五行 `charWuxing`、风险预判 `risk`），服务端边收边推 `name` 事件
4. 用户点击某个名字 → `POST /api/analyze` 按需获取深度分析；前端用 `analyzed` 标记 + 内存 Map 防止重复请求
5. 收藏 / 历史 / 对比名单全部存浏览器本地（`src/lib/utils/storage.ts`）

### 关键约定（改动时务必遵守）

- **八字只能由服务端计算**（`src/lib/bazi/compute.ts`），结果注入 prompt 供 LLM 参考；LLM 输出的八字内容一律忽略，不要让 LLM 自己排盘。
- **出生时间一律传「不带时区的本地时间字符串」**（`YYYY-MM-DDTHH:mm`），前后端都按字面解析。禁止 `Date.toISOString()` —— UTC 转换会导致日期/时辰漂移。
- 出生地用于真太阳时校正（`compute.ts` 内置省级经度表，按 `(经度-120°)×4分钟` 平移）。
- 写 localStorage 必须走 `storage.ts` 的兜底逻辑：配额不足时历史记录自动降级（去大字段、丢最旧），调用方根据 `SaveResult` 提示用户。
- LLM 类 API 路由必须带：`rateLimit`（按 IP）、JSON 请求体 try/catch、`export const maxDuration`。

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页（落地页）
│   ├── generate/             # 取名主流程页（三列布局 + SSE 流式）
│   ├── name/[id]/            # 名字详情页（读 localStorage 缓存）
│   ├── saved/                # 我的收藏
│   ├── history/              # 历史记录
│   ├── settings/             # 设置（LLM 配置展示 + 数据管理）
│   ├── about/  guide/        # 关于 / 使用指南
│   └── api/
│       ├── generate/         # 取名 API（SSE 流式）
│       ├── analyze/          # 单名深度分析
│       ├── chat/             # 对话式追问（前端暂未接入）
│       └── config/           # 脱敏 LLM 配置查询（供设置页）
├── components/
│   ├── generate/             # BabyInfoForm / NameList / NameAnalysisPanel
│   └── layout/               # AppHeader
├── lib/
│   ├── bazi/compute.ts       # 八字排盘、五行分布、喜用神（服务端）
│   ├── llm.ts                # 多 provider LLM 调用层（chatJSON / chatStream）
│   ├── prompt.ts             # system prompt 三套 + user prompt 构建
│   ├── rateLimit.ts          # 内存限流（固定窗口）
│   └── utils/                # cn / calendar / area / storage / style / export
└── types/                    # 全部共享类型定义
```

## LLM 配置

通过 `.env.local` 环境变量（模板见 `.env.example`）：

- `LLM_PROVIDER`：deepseek（默认）/ openai / qwen / glm
- `LLM_MODEL` / `LLM_BASE_URL`：可选，覆盖默认值
- `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `DASHSCOPE_API_KEY` / `GLM_API_KEY`：各 provider 密钥
- 前端通过 `/api/config` 读取脱敏配置（不含密钥）

## 开发约定

- 使用 `@/` 路径别名指向 `src/`
- 中文注释，代码标识符用英文
- 颜色以 stone / amber 为主基调（宣纸、印章质感），主行动色用 emerald
- 提交前跑 `npx tsc --noEmit` 和 `npm run lint`
