<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 启名 Qiming · 项目说明

面向中国新生儿父母的智能取名 Web 应用。

## 项目简介

- **产品名**：启名（Qiming）
- **Slogan**：一名启一生
- **形态**：Next.js 全栈 Web 应用
- **目标用户**：25-40 岁中国准父母及新手父母

## 技术栈

- **框架**：Next.js 16（App Router）+ React 19
- **语言**：TypeScript（严格模式）
- **样式**：Tailwind CSS v4
- **工具**：clsx + tailwind-merge（`cn()` 合并类名）
- **数据库**：SQLite + Prisma（计划中，Phase 3）
- **包管理**：npm（淘宝镜像源）

## 五大取名维度

1. **八字五行** —— `src/lib/bazi/` 生辰排盘、五行分析、喜用神推算
2. **诗词典故** —— `src/lib/poetry/` 诗词检索、出处标注
3. **音律字形** —— 拼音声调、康熙笔画、字形结构评分
4. **现代算法推荐** —— `src/lib/naming/engine.ts` 多维加权评分排序
5. **避讳与查重** —— 谐音检测、生僻字、名人重名

## 目录结构

```
src/
├── app/                    # Next.js App Router 路由
│   ├── page.tsx           # 首页（落地页）
│   ├── generate/          # 取名主流程页
│   ├── name/[id]/         # 名字详情页
│   ├── saved/             # 我的收藏
│   ├── about/             # 关于/原理
│   └── api/generate/      # 取名 API
├── components/
│   ├── ui/                # 基础 UI 组件
│   ├── name/              # 名字相关组件
│   └── layout/            # 布局组件
├── lib/
│   ├── bazi/              # 八字排盘引擎
│   ├── naming/            # 取名核心引擎
│   ├── poetry/            # 诗词典故引擎
│   ├── data/              # 数据加载层
│   └── utils/             # 工具函数（cn 等）
├── data/                  # 静态数据资源
│   ├── characters/        # 汉字字库
│   ├── poetry/            # 诗词库
│   ├── wuxing/            # 五行字典
│   └── tabloo/            # 避讳词库
└── types/                 # TypeScript 类型定义

prisma/                    # 数据库 schema（计划中）
scripts/                   # 数据清洗/导入脚本
```

## 开发阶段

- **Phase 1（MVP）**：项目骨架 ✅ → 字库准备 → 五行取名引擎 → 取名列表页
- **Phase 2**：诗词库接入 → 典故标注 → 音律字形评分 → 名字详情页
- **Phase 3**：避讳查重 → 收藏登录 → 综合评分优化

## 开发约定

- 使用 `@/` 路径别名指向 `src/`
- 中文注释，代码标识符用英文
- 颜色以 stone / amber 系为主（呼应传统印章、宣纸质感）
- 数据资源放 `src/data/`，引擎放 `src/lib/`，二者分离
