import Link from "next/link";

const FEATURES = [
  {
    icon: "🔥",
    title: "八字五行",
    desc: "依据生辰排盘，分析五行缺漏，取喜用神补益之名",
  },
  {
    icon: "📜",
    title: "诗词典故",
    desc: "从《诗经》《楚辞》唐诗宋词中寻字，每个名字皆有出处",
  },
  {
    icon: "🎵",
    title: "音律字形",
    desc: "平仄声调相协，康熙笔画均衡，读着顺口写着好看",
  },
  {
    icon: "🧮",
    title: "算法推荐",
    desc: "多维度加权评分，从万千组合中筛出最优候选",
  },
  {
    icon: "⚠️",
    title: "避讳查重",
    desc: "自动检测不良谐音、生僻字，避开名人重名",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-amber-50 via-white to-white">
      {/* Hero */}
      <section className="flex w-full flex-col items-center px-6 py-24 text-center">
        <span className="mb-6 inline-block rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
          🏮 一名启一生
        </span>
        <h1 className="mb-6 text-6xl font-bold tracking-tight text-stone-800">
          启名
          <span className="ml-3 text-3xl font-normal text-stone-400">
            Qiming
          </span>
        </h1>
        <p className="mb-10 max-w-xl text-lg leading-relaxed text-stone-600">
          融合传统八字五行与诗词典故，为新生儿取一个有底蕴、有音律、有寓意的好名字。
        </p>
        <div className="flex gap-4">
          <Link
            href="/generate"
            className="rounded-full bg-stone-800 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-stone-700"
          >
            开始取名 →
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-stone-300 px-8 py-3 text-base font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            了解原理
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl px-6 pb-24">
        <h2 className="mb-12 text-center text-2xl font-semibold text-stone-800">
          五大维度，为名字保驾护航
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-stone-800">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-stone-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-stone-100 py-8 text-center text-sm text-stone-400">
        启名 Qiming · 用一个名字，开启孩子的一生
      </footer>
    </div>
  );
}
