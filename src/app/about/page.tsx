/**
 * 关于页 /about
 * 介绍取名原理与数据来源
 */

const PRINCIPLES = [
  {
    title: "八字五行",
    desc: "根据新生儿出生的年、月、日、时四柱，排出天干地支，统计金木水火土五行分布，找出缺失或偏弱的五行，作为取名补益的方向。",
  },
  {
    title: "三才五格",
    desc: "依据姓名笔画数，分析天格、人格、地格、外格、总格的吉凶，是传统姓名学的核心方法。",
  },
  {
    title: "诗词典故",
    desc: "从《诗经》《楚辞》《唐诗三百首》《宋词》等经典中检索字词，让名字承载文化底蕴。",
  },
  {
    title: "音律字形",
    desc: "平仄相协、声调起伏有致；康熙笔画均衡、字形结构稳重，兼顾读音与书写之美。",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-stone-800">
          取名原理
        </h1>
        <p className="mb-12 text-center text-stone-500">
          启名综合传统姓名学与现代算法，为每个名字提供多维度的解读
        </p>

        <div className="space-y-6">
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-2 text-xl font-semibold text-stone-800">
                {p.title}
              </h2>
              <p className="leading-relaxed text-stone-600">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            ⚠️ 启名提供的分析仅供参考，名字的好坏最终在于父母的期许与孩子的成长。
          </p>
        </div>
      </div>
    </div>
  );
}
