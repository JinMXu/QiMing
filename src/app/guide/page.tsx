"use client";

import Link from "next/link";
import {
  FlameIcon,
  ScrollIcon,
  MusicIcon,
  CalculatorIcon,
  ShieldAlertIcon,
} from "@/components/ui/icons";

const DIMENSIONS = [
  {
    icon: FlameIcon,
    title: "八字五行",
    desc: "依据宝宝生辰排盘，分析四柱天干地支，统计五行分布，找出喜用神。取名时优先使用喜用神对应的五行字，以平衡命局。",
  },
  {
    icon: ScrollIcon,
    title: "诗词典故",
    desc: "从《诗经》《楚辞》、唐诗宋词等经典中寻字觅意，让每个名字都有文化出处，读起来有画面感。",
  },
  {
    icon: MusicIcon,
    title: "音律字形",
    desc: "平仄声调相协，避免拗口；笔画结构均衡，避免头重脚轻。让名字读着顺口、写着好看。",
  },
  {
    icon: CalculatorIcon,
    title: "算法推荐",
    desc: "多维度加权评分，从音律、字形、寓意、五行、诗词五个角度综合打分，筛出最优候选。",
  },
  {
    icon: ShieldAlertIcon,
    title: "避讳查重",
    desc: "自动检测不良谐音、生僻字、多音字，帮助家长避开取名雷区。",
  },
];

const STEPS = [
  { title: "填写宝宝信息", desc: "输入姓氏、性别、出生时间、出生地等基本信息。支持公历/农历切换。" },
  { title: "调整风格偏好", desc: "通过滑块设置古典、现代、诗意等风格权重，越高的维度越受推荐影响。" },
  { title: "生成候选名字", desc: "AI 根据八字五行和您的偏好生成多个候选名字，并按综合评分排序。" },
  { title: "查看深度解析", desc: "点击任意名字，查看八字五行、音律、字形、寓意、典故、避讳等详细分析。" },
  { title: "收藏与对比", desc: "喜欢就点收藏，最多可同时对比 3 个名字，帮助您做出最终决定。" },
];

export default function GuidePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-stone-800">使用指南</h1>
        <p className="mt-2 text-stone-500">了解启名的五大维度与使用方法</p>
      </div>

      <section className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-stone-800">五大取名维度</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DIMENSIONS.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <d.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-800">{d.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-stone-800">使用步骤</h2>
        <div className="relative space-y-6 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-stone-200">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <span className="absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {i + 1}
              </span>
              <h3 className="text-base font-semibold text-stone-800">{step.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link
          href="/generate"
          className="inline-block rounded-xl bg-emerald-700 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-800"
        >
          开始取名 →
        </Link>
      </div>
    </div>
  );
}
