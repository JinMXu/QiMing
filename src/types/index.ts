/**
 * 启名 Qiming - 核心类型定义
 * 纯 LLM 驱动方案：用户输入 → LLM 生成名字+分析 → 展示
 */

/** 性别 */
export type Gender = "male" | "female" | "neutral";

/** 五行 */
export type Wuxing = "metal" | "wood" | "water" | "fire" | "earth";

/** 五行中文名 */
export const WUXING_LABELS: Record<Wuxing, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

/** 天干/地支/五行 */
export interface BaziPillar {
  /** 天干 */
  gan: string;
  /** 地支 */
  zhi: string;
  /** 天干五行 */
  ganWuxing: Wuxing;
  /** 地支五行 */
  zhiWuxing: Wuxing;
}

/** 八字四柱 */
export interface BaziPillars {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
}

/** 五行数量分布 */
export interface WuxingDistribution {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/** 八字分析信息（基于出生时间，所有名字共享） */
export interface BaziInfo {
  /** 八字分析摘要文本 */
  summary: string;
  /** 四柱 */
  pillars: BaziPillars;
  /** 五行分布 */
  distribution: WuxingDistribution;
  /** 喜用神 */
  xiyongshen: Wuxing[];
  /** 农历生日（可选） */
  lunarBirthday?: string;
}

/** 风格偏好 */
export type NameStyle =
  | "classical" // 古风典韵
  | "modern" // 现代清新
  | "literary" // 文艺诗意
  | "majestic" // 大气磅礴
  | "elegant" // 儒雅温润
  | "cute" // 俏皮可爱
  | "neutral"; // 中性大方

/** 风格维度权重（0-100） */
export interface NameStyleWeights {
  classical: number;
  modern: number;
  literary: number;
  majestic: number;
  elegant: number;
  cute: number;
  neutral: number;
}

/** 筛选条件 */
export interface FilterOptions {
  /** 避开生僻字 */
  avoidRareChars: boolean;
  /** 避开多音字 */
  avoidPolyphonic: boolean;
  /** 避开谐音不雅 */
  avoidBadHomophone: boolean;
  /** 笔画不宜过多（单字不超过指定笔画） */
  limitStrokes: boolean;
  /** 最大单字笔画数（limitStrokes 开启时生效） */
  maxStrokes?: number;
  /** 仅看高分名字（综合评分 ≥ 阈值） */
  highScoreOnly: boolean;
  /** 高分阈值 */
  minScore?: number;
}

/** 取名请求 —— 用户在表单里填的所有信息 */
export interface GenerateRequest {
  // ── 基本信息 ──
  /** 姓氏 */
  surname: string;
  /** 性别 */
  gender: Gender;
  /** 出生日期时间（公历，ISO 字符串或自由文本） */
  birthDateTime?: string;
  /** 出生地（用于真太阳时校正，可选） */
  birthPlace?: string;
  /** 是否按八字五行取名 */
  useBazi: boolean;
  /** 日历类型：公历 solar / 农历 lunar */
  calendarType: "solar" | "lunar";

  // ── 名字设置 ──
  /** 名字字数：1 单字名 / 2 双字名 */
  nameLength: 1 | 2;
  /** 辈分字（如有，必须包含在名字中） */
  generationChar?: string;
  /** 辈分字位置：first 名字首字 / last 名字末字 */
  generationCharPos?: "first" | "last";
  /** 喜欢的字（希望出现在名字中，可选） */
  likedChars?: string;
  /** 避讳的字（绝不能出现在名字中） */
  tabooChars?: string;

  // ── 风格与筛选 ──
  /** 风格偏好 */
  style: NameStyle;
  /** 风格维度权重（0-100），用于细调推荐方向 */
  styleWeights: NameStyleWeights;
  /** 筛选条件 */
  filters: FilterOptions;
  /** 其他补充说明（自由文本） */
  notes?: string;

  // ── 生成数量 ──
  /** 期望生成的候选名字数量 */
  count: number;
}

/** 候选名字（LLM 生成 + 分析一体的结果） */
export interface CandidateName {
  /** 完整姓名 */
  fullName: string;
  /** 名字部分（不含姓） */
  givenName: string;
  /** 拼音（带声调） */
  pinyin: string;
  /** 综合评分 0-100 */
  score: number;
  /** 各维度评分 */
  scores: NameScores;
  /** 寓意阐释 */
  meaning: string;
  /** 诗词出处（如有） */
  poetryOrigin?: PoetryOrigin;
  /** 八字五行契合分析 */
  wuxingAnalysis: string;
  /** 音律分析（声调、平仄、韵律） */
  phoneticAnalysis: string;
  /** 字形结构分析（笔画、偏旁、结构） */
  glyphAnalysis: string;
  /** 避讳检查结果 */
  tabooCheck: TabooCheck;
  /** 综合评价（分值量化的总结说明） */
  comprehensiveScore: string;
  /** 推荐理由（一句话） */
  recommendation: string;
}

export interface NameScores {
  /** 音律分 */
  phonetic: number;
  /** 字形分 */
  glyph: number;
  /** 寓意分 */
  meaning: number;
  /** 五行契合分 */
  wuxing: number;
  /** 诗词典故分 */
  poetry: number;
}

export interface PoetryOrigin {
  /** 诗句 */
  verse: string;
  /** 诗题 */
  title: string;
  /** 作者 */
  author: string;
  /** 朝代 */
  dynasty: string;
  /** 名字与诗句的关联说明 */
  connection: string;
}

export interface TabooCheck {
  /** 是否通过（无问题） */
  passed: boolean;
  /** 不良谐音提示 */
  homophoneWarnings: string[];
  /** 是否含生僻字 */
  hasRareChar: boolean;
  /** 是否含多音字 */
  hasPolyphonic: boolean;
  /** 最大单字笔画数 */
  maxStrokes: number;
}

/** 快速列表名字（仅基础信息，用于流式推送） */
export interface NameSummary {
  /** 完整姓名 */
  fullName: string;
  /** 名字部分（不含姓） */
  givenName: string;
  /** 拼音（带声调） */
  pinyin: string;
  /** 综合评分 0-100 */
  score: number;
  /** 各维度评分 */
  scores: NameScores;
  /** 一句话寓意摘要（≤20 字，列表展示用） */
  meaning: string;
  /** 推荐理由（一句话） */
  recommendation: string;
}

/** LLM 生成接口的返回结构 */
export interface GenerateResponse {
  /** 候选名字列表 */
  names: CandidateName[];
  /** 八字五行分析信息（如启用了八字） */
  bazi?: BaziInfo;
  /** LLM 的总体说明 */
  note?: string;
}

/** 深度分析请求 */
export interface AnalyzeRequest {
  /** 完整姓名 */
  fullName: string;
  /** 取名时使用的参数（用于上下文） */
  surname: string;
  gender: Gender;
  style: NameStyle;
  birthDateTime?: string;
  useBazi?: boolean;
  calendarType?: "solar" | "lunar";
}

/** 深度分析响应（不含 fullName/pinyin/score/scores，这些前端已有） */
export interface AnalyzeResponse {
  meaning: string;
  wuxingAnalysis: string;
  phoneticAnalysis: string;
  glyphAnalysis: string;
  poetryOrigin?: PoetryOrigin;
  tabooCheck: TabooCheck;
  comprehensiveScore: string;
  /** 八字信息（分析名字时如提供出生时间则返回） */
  bazi?: BaziInfo;
}

/** 对话消息 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** 对话式追问请求 */
export interface ChatRequest {
  /** 当前选中的名字（上下文） */
  currentName?: string;
  /** 该名字的生成参数（上下文） */
  generateRequest?: GenerateRequest;
  /** 历史对话 */
  messages: ChatMessage[];
  /** 用户最新提问 */
  userMessage: string;
}

/** 对话式追问响应 */
export interface ChatResponse {
  /** LLM 回复 */
  reply: string;
  /** 如果 LLM 建议了新名字，附带在这里 */
  suggestedNames?: CandidateName[];
}
