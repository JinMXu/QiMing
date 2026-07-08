# 启名 Qiming · 一名启一生

面向中国新生儿父母的智能取名 Web 应用。基于八字五行、诗词典故、音律字形等多维度综合分析，为宝宝生成高质量候选名字。

## 特性

- **八字五行分析** — 基于 `lunar-javascript` 的八字排盘，五行分布与喜用神推算
- **AI 智能生成** — 接入 DeepSeek / OpenAI 等 LLM，流式生成候选名字
- **多维度评分** — 音律、字形、寓意、五行契合、诗词典故五大维度
- **深度解析** — 每个名字的详细分析报告，含出处典故
- **收藏与对比** — 本地持久化收藏，多名字对比
- **历史回溯** — 历史记录一键恢复，参数与结果完整保留

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript (strict) |
| 样式 | Tailwind CSS v4 |
| AI | DeepSeek V4 / OpenAI 兼容接口 |
| 八字 | lunar-javascript |
| 工具 | clsx + tailwind-merge |

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装

```bash
git clone git@github.com:JinMXu/QiMing.git
cd QiMing
npm install
```

### 配置 LLM

创建 `.env.local` 文件：

```env
# LLM Provider（deepseek / openai / qwen / glm）
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=your-api-key

# 可选：OpenAI 兼容接口
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### 启动

```bash
npm run dev
```

打开 http://localhost:3000 开始取名。

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── generate/          # 取名主流程（表单 + 三列结果）
│   ├── name/[id]/         # 名字详情页
│   ├── history/           # 历史记录
│   ├── saved/             # 我的收藏
│   └── api/               # API 路由（generate / analyze / chat）
├── components/
│   ├── generate/          # 取名页组件（表单、名字列表、分析面板）
│   ├── layout/            # 布局组件（Header、Footer）
│   └── ui/                # 基础 UI
├── lib/
│   ├── bazi/              # 八字排盘引擎
│   ├── naming/            # 取名核心引擎
│   ├── poetry/            # 诗词典故引擎
│   ├── data/              # 数据加载层
│   └── utils/             # 工具函数
├── types/                 # TypeScript 类型定义
└── data/                  # 静态数据（字库、诗词库、五行字典）
```

## 取名维度

1. **八字五行** — 生辰排盘、五行分布、喜用神推算
2. **诗词典故** — 诗词检索、出处标注
3. **音律字形** — 拼音声调、康熙笔画、字形结构
4. **算法推荐** — 多维加权评分排序
5. **避讳查重** — 谐音检测、生僻字、名人重名

## 开发阶段

- **Phase 1（MVP）** ✅ 项目骨架 → 五行取名引擎 → 取名列表页
- **Phase 2** 🚧 诗词库接入 → 典故标注 → 音律字形评分 → 名字详情页
- **Phase 3** 📋 避讳查重 → 用户系统 → 综合评分优化

## License

MIT
