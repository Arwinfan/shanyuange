import { Solar } from "lunar-javascript";

type MasterId = "huiming" | "mingxin" | "xuanzhen";

const MASTER_INFO: Record<MasterId, { name: string; style: string; voice: string }> = {
  huiming: {
    name: "慧照长老",
    style: "庄重持重，引经据典",
    voice: "多从格局根基与古籍脉络处落笔，语气稳重，重在提醒取舍。",
  },
  mingxin: {
    name: "明净师父",
    style: "慈悲温柔，劝人向善",
    voice: "多从家人、心念与修心处开解，语气温和，重在安顿当下。",
  },
  xuanzhen: {
    name: "玄清道长",
    style: "直爽通透，说大白话",
    voice: "多用直白话把利弊讲清，少绕弯，重在给出可执行的方向。",
  },
};

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const STEM_ELEMENTS: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const BRANCH_ELEMENTS: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const ELEMENTS = ["木", "火", "土", "金", "水"];

function mod(n: number, size: number) {
  return ((n % size) + size) % size;
}

function ganZhi(index: number) {
  return `${STEMS[mod(index, 10)]}${BRANCHES[mod(index, 12)]}`;
}

function getMaster(master: string): MasterId {
  return master === "mingxin" || master === "xuanzhen" ? master : "huiming";
}

export function masterName(master: string) {
  return MASTER_INFO[getMaster(master)].name;
}

export function masterStyle(master: string) {
  return MASTER_INFO[getMaster(master)].style;
}

export function isValidMaster(master: string) {
  return master === "huiming" || master === "mingxin" || master === "xuanzhen";
}

export function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

function yearGanZhi(year: number) {
  return ganZhi(year - 1984);
}

function monthGanZhi(year: number, month: number) {
  const yearStem = mod(year - 1984, 10);
  const stemIndex = yearStem * 2 + month + 1;
  const branchIndex = month + 1;
  return `${STEMS[mod(stemIndex, 10)]}${BRANCHES[mod(branchIndex, 12)]}`;
}

function dayGanZhi(year: number, month: number, day: number) {
  const base = Date.UTC(1900, 0, 31);
  const current = Date.UTC(year, month - 1, day);
  const diff = Math.floor((current - base) / 86400000);
  return ganZhi(diff + 40);
}

function hourBranchIndex(hour: string) {
  const found = BRANCHES.findIndex((branch) => hour.includes(`${branch}时`));
  return found >= 0 ? found : 7;
}

function hourGanZhi(dayStem: string, hour: string) {
  const branchIndex = hourBranchIndex(hour);
  const dayStemIndex = Math.max(0, STEMS.indexOf(dayStem));
  const stemIndex = dayStemIndex * 2 + branchIndex;
  return `${STEMS[mod(stemIndex, 10)]}${BRANCHES[branchIndex]}`;
}

function analyseElements(pillars: string[]) {
  const counts = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<string, number>;
  for (const pillar of pillars) {
    const stem = pillar[0];
    const branch = pillar[1];
    counts[STEM_ELEMENTS[stem]] += 1;
    counts[BRANCH_ELEMENTS[branch]] += 1;
  }
  const sorted = [...ELEMENTS].sort((a, b) => counts[b] - counts[a]);
  const missing = ELEMENTS.filter((element) => counts[element] === 0);
  return {
    counts,
    strongest: sorted[0],
    weakest: missing[0] || sorted[sorted.length - 1],
    missing,
  };
}

function buildBaziCore(input: { year: number; month: number; day: number; hour: string }) {
  const yearPillar = yearGanZhi(input.year);
  const monthPillar = monthGanZhi(input.year, input.month);
  const dayPillar = dayGanZhi(input.year, input.month, input.day);
  const hourPillar = hourGanZhi(dayPillar[0], input.hour);
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const dayMaster = `${dayPillar[0]}${STEM_ELEMENTS[dayPillar[0]]}`;
  const elements = analyseElements(pillars);
  const wuxing = elements.missing.length
    ? `${elements.strongest}旺缺${elements.missing.join("")}`
    : `${elements.strongest}旺，五行俱全`;

  return {
    pillars,
    bazi: pillars.join(" "),
    dayMaster,
    wuxing,
    elements,
  };
}

export function buildBaziReading(input: {
  master: string; year: number; month: number; day: number; hour: string; gender: string;
}) {
  const core = buildBaziCore(input);
  const monthBranch = core.pillars[1][1];
  const teacher = MASTER_INFO[getMaster(input.master)];
  const preview = {
    bazi: core.bazi,
    dayMaster: core.dayMaster,
    summary: `命主${core.dayMaster}生于${monthBranch}月，${core.wuxing}。排盘已完成，完整解读会展开格局、用神、大运与近年提醒。`,
  };

  const fullResult = {
    ...preview,
    wuxing: core.wuxing,
    masterName: teacher.name,
    masterStyle: teacher.style,
    gender: input.gender,
    pattern: `${core.dayMaster}坐${core.pillars[2][1]}，年柱${core.pillars[0]}、月柱${core.pillars[1]}定根基，时柱${core.pillars[3]}看后劲。`,
    character: `此盘${core.elements.strongest}气较显，做事容易先凭直觉起势；若能补足${core.elements.weakest}气，判断会更稳，后续耐力也更足。`,
    career: "事业宜先立一项可长期积累的本事，再逐步扩展人脉与资源。遇到选择时，不宜只看眼前收益，更要看三年后的可持续性。",
    wealth: "财运以正财、稳财为主，适合靠专业能力与持续服务得财；投机之事需设边界，避免情绪上头。",
    relationships: "亲缘与伴侣关系中，宜少用胜负心，多用商量心。盘中有可借之贵人气，但贵人多在守信、守时、守分寸之后出现。",
    health: "作息与情绪是此盘的养护重点。传统命理只作文化参考，身体不适仍应及时寻求专业医疗意见。",
    advice: `${teacher.voice} 建议近期先补一件拖延已久的小事，让气机流动起来，再谈大的改变。`,
    classics: "参考《滴天髓》“能知旺衰之真机，其于三命之奥，思过半矣”之意，先辨旺衰，再谈取用。",
  };

  return { preview, fullResult };
}

const STYLE_CHARS: Record<string, string[]> = {
  诗意: ["清", "云", "知", "月", "若", "安", "溪", "南"],
  刚毅: ["承", "毅", "峻", "行", "卓", "砺", "骁", "岳"],
  儒雅: ["文", "修", "怀", "谦", "书", "礼", "言", "知"],
  清逸: ["澄", "远", "舟", "然", "疏", "和", "栖", "白"],
  典雅: ["庭", "瑾", "昭", "宁", "嘉", "予", "宸", "璟"],
  温润: ["沐", "禾", "言", "舒", "念", "柔", "熙", "暖"],
};

function chooseNameChars(styles: string[] | undefined, wordCount: number, beiFenZi?: string, avoidZi?: string) {
  const pool = (styles && styles.length ? styles : ["诗意", "儒雅", "温润"])
    .flatMap((style) => STYLE_CHARS[style] || []);
  const fallback = ["清", "远", "明", "哲", "思", "源", "安", "和", "知", "宁"];
  const source = pool.length ? pool : fallback;
  const avoid = avoidZi || "";
  const names: string[][] = [];

  for (let i = 0; names.length < 8 && i < source.length * 3; i++) {
    const first = beiFenZi?.trim()?.[0] || source[i % source.length];
    const second = source[(i + 3) % source.length];
    const chars = wordCount === 2 ? [first] : [first, second];
    if (!chars.some((char) => avoid.includes(char))) names.push(chars);
  }

  return names.length ? names : [["安"], ["和"], ["清", "远"]];
}

function uniqueEvaluationNames(targetName?: string, compareNames?: string[]) {
  const names = [targetName, ...(Array.isArray(compareNames) ? compareNames : [])]
    .map((name) => String(name || "").trim())
    .filter(Boolean);
  return Array.from(new Set(names)).slice(0, 6);
}

function clampNameScore(value: number) {
  return Math.max(60, Math.min(98, Math.round(value)));
}

function buildNameEvaluation(name: string, core: ReturnType<typeof buildBaziCore>, index: number) {
  const chars = Array.from(name);
  const charSeed = chars.reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const fitScore = clampNameScore(72 + (charSeed % 18) + (core.elements.missing.length ? 2 : 5) - index);
  const soundScore = clampNameScore(70 + (chars.length >= 2 && chars.length <= 4 ? 10 : 2) + (charSeed % 9));
  const meaningScore = clampNameScore(73 + ((charSeed + core.dayMaster.charCodeAt(0)) % 16));
  const durabilityScore = clampNameScore(74 + (chars.length <= 4 ? 9 : 0) + (index % 3));
  const score = clampNameScore(fitScore * 0.35 + soundScore * 0.22 + meaningScore * 0.23 + durabilityScore * 0.2);

  return {
    name,
    score,
    summary: `${name}整体可用度${score}分。结合${core.wuxing}来看，名字的音形义基础尚稳，完整测评会展开八字贴合、读音节奏、字义气质和长期使用感。`,
    fit: `此名与命盘的关系重点看${core.elements.strongest}气是否过盛、${core.elements.weakest}气是否可补。若字义偏清正、舒展，可帮助名字气质更平衡。`,
    sound: chars.length >= 2 && chars.length <= 4
      ? "读音长度适中，日常称呼不显拖沓。若声调有起伏，社交场景中更容易被记住。"
      : "名字长度略非常规，正式登记或日常称呼时需留意辨识成本和重复解释成本。",
    meaning: "字义宜取端正、明朗、可长期解释的方向，避免只追求一时新奇。名字能被孩子长大后自然接受，比短期惊艳更重要。",
    durability: "长期使用上，建议同时检查书写难度、同音歧义、常见误读和亲友称呼感，确保从幼年到成年都不突兀。",
    advice: "若作为正式姓名，建议再结合家族避讳、户籍用字、普通话与方言读音做一次现实校验。",
  };
}

export function buildNamingReading(input: {
  mode: string; year: number; month: number; day: number; hour: string; gender: string;
  surname: string; wordCount: number; styles?: string[]; beiFenZi?: string; avoidZi?: string; targetName?: string; compareNames?: string[];
}) {
  const core = buildBaziCore(input);

  if (input.mode === "evaluate") {
    const names = uniqueEvaluationNames(input.targetName, input.compareNames);
    const evaluations = (names.length ? names : ["李安"]).map((name, index) => buildNameEvaluation(name, core, index));
    const best = evaluations.reduce((winner, item) => item.score > winner.score ? item : winner, evaluations[0]);
    const preview = {
      bazi: core.bazi,
      wuxing: core.wuxing,
      targetName: evaluations[0]?.name || "",
      evaluations: evaluations.slice(0, 3).map(({ name, score, summary }) => ({ name, score, summary })),
    };

    const fullResult = {
      ...preview,
      mode: input.mode,
      gender: input.gender,
      dayMaster: core.dayMaster,
      evaluationPrinciple: "先看生辰八字与五行喜忌，再看姓名音形义、书写辨识、长期使用感和现实避讳。",
      evaluations,
      bestName: best?.name || "",
      overallAdvice: best
        ? `综合比较，${best.name}当前得分较高，但姓名测评只作传统文化参考，正式使用前仍建议核对户籍用字、方言读音和家族避讳。`
        : "姓名测评只作传统文化参考，正式使用前仍建议核对户籍用字、方言读音和家族避讳。",
      classicSource: "参考传统姓名学中音、形、义、五行取象的思路，结合现代使用场景做克制判断。",
    };

    return { preview, fullResult };
  }

  const styleList = input.styles?.length ? input.styles : ["诗意", "儒雅", "温润"];
  const charGroups = chooseNameChars(styleList, input.wordCount, input.beiFenZi, input.avoidZi);
  const samples = charGroups.map((chars, index) => {
    const name = `${input.surname}${chars.join("")}`;
    const tone = index % 2 === 0 ? "开口清亮" : "收束温和";
    return {
      name,
      reason: `${chars.join("、")}字取${styleList[index % styleList.length]}之意，音节${tone}；结合${core.wuxing}，重在补其不足、收其太过。`,
      score: 92 - (index % 5),
    };
  });

  const preview = {
    bazi: core.bazi,
    wuxing: core.wuxing,
    samples: samples.slice(0, 3).map(({ name, reason }) => ({ name, reason })),
  };

  const fullResult = {
    ...preview,
    mode: input.mode,
    gender: input.gender,
    surname: input.surname,
    styles: styleList,
    dayMaster: core.dayMaster,
    namingPrinciple: "先取八字喜忌，再看音韵开合、字义耐久、书写结构与家族语境，避免只追逐一时流行。",
    candidates: samples,
    avoidAdvice: input.avoidZi ? `已避开：${input.avoidZi}` : "未填写避讳字，可在正式定名前再核对家族忌讳与重名情况。",
    classicSource: "参考《说文解字》取义思路与传统五行生克观，结果仅作传统文化参考。",
  };

  return { preview, fullResult };
}

export function buildPalmistryReading(input: {
  master: string; mode: "hand" | "face"; hand?: "left" | "right"; imageBase64?: string; recordId: string;
}) {
  const teacher = MASTER_INFO[getMaster(input.master)];
  const isHand = input.mode === "hand";
  const imageUrl = input.imageBase64 ? `/r2/palmistry/${input.recordId}.png` : "";
  const preview = {
    summary: isHand
      ? `已按${input.hand === "right" ? "右手后天发展" : "左手先天底色"}建立解读。可见掌色、主线走势与掌丘起伏会作为重点，完整解读需支付后解锁。`
      : "已建立面相解读。会围绕三庭、眉眼、鼻口与下庭等可见特征分段说明，完整解读需支付后解锁。",
    imageUrl,
  };

  const fullResult = {
    ...preview,
    masterName: teacher.name,
    masterStyle: teacher.style,
    mode: input.mode,
    hand: input.hand || null,
    overview: isHand
      ? "整体以掌色气色、生命线、智慧线、感情线与事业线相互印证，不凭单一纹路下断语。"
      : "整体以额、眉、眼、鼻、口、下庭互参，只围绕图上能确认的特征给出文化参考。",
    sections: isHand
      ? [
          { title: "生命线", text: "线势连贯者，多主基础气力尚稳；若中段细碎，提示阶段性消耗较多，应重视休息与节律。" },
          { title: "智慧线", text: "智慧线走向较清者，做事有主见；若分叉明显，常见兴趣广、想法多，也需防注意力分散。" },
          { title: "感情线", text: "感情线平顺者，待人重情但讲分寸；若末端上扬，表达善意较主动。" },
          { title: "事业财运", text: "事业线不以深浅论成败，更看掌丘承托与主线配合。宜先稳住长期技能，再求财运扩展。" },
        ]
      : [
          { title: "三庭", text: "上庭看早年学习与思考，中庭看执行和人际，下庭看耐力与晚成之势，需合参不宜单看。" },
          { title: "眉眼", text: "眉眼主精神与待人方式。眉眼舒展者，多利沟通；若眉眼紧促，则近期压力感偏强。" },
          { title: "鼻口", text: "鼻口看财帛承载与表达边界。宜重视守信、守时与稳定输出。" },
          { title: "当下提醒", text: "相由心转，阶段气色会随休息、情绪与环境变化，宜把解读当作自我观察的提醒。" },
        ],
    advice: teacher.voice,
    privacyNote: "图片只应被用于本次解读结果，不应复用到其他场景。",
  };

  return { preview, fullResult };
}

const LOTS = [
  { lotNumber: 1, level: "上上", shortVerse: "万事顺遂，贵人相助", verse: "乾元亨利贞，云开见月明。所求若守正，自有贵人临。", interpretation: "此签大吉，主事有转机，人事可成，但仍需守正，不宜贪快。", advice: "宜积极进取，把握良机。" },
  { lotNumber: 8, level: "上吉", shortVerse: "春风入户，旧事更新", verse: "春来草木发，雨过见青山。凡事从新起，行人即日还。", interpretation: "旧局渐散，新机渐开。问事多有回暖之象。", advice: "先整理旧问题，再推进新计划。" },
  { lotNumber: 24, level: "中吉", shortVerse: "拨云见日，渐入佳境", verse: "云开见月明，花开蝶自临。谋望须迟缓，急行反误心。", interpretation: "此签主先难后易，当前不可躁进，耐心经营则可见好。", advice: "保持耐心，静待时机。" },
  { lotNumber: 47, level: "中平", shortVerse: "守正待时，不急不躁", verse: "守得云开见月明，门前流水自分清。若问前程休妄动，贵在安身养性情。", interpretation: "当前宜守不宜攻，先稳住基本盘。", advice: "以静制动，以守为攻。" },
  { lotNumber: 63, level: "上上", shortVerse: "龙腾四海，鹏程万里", verse: "龙跃天门起，鹏抟九万程。平生怀抱事，今日渐分明。", interpretation: "此签大吉，主事业、学业或计划有起势。", advice: "大胆前行，必有收获。" },
  { lotNumber: 81, level: "上吉", shortVerse: "吉星高照，否极泰来", verse: "否极终须泰，云收月复圆。若能修德业，福至在眼前。", interpretation: "运势转好，但需顺势而为，不可放纵。", advice: "把握转折，顺势而为。" },
  { lotNumber: 3, level: "中吉", shortVerse: "初行有阻，后路渐开", verse: "行人初出岭，雾重路难明。待到风云散，前程自有程。", interpretation: "此签主先滞后通，事情开头多费心，但方向并非无望。", career: "事业宜先补流程和人手，不急于扩张。", wealth: "财运平稳，适合守预算、少冒进。", relationship: "感情与人际宜多解释，少凭情绪猜测。", health: "注意睡眠与肠胃作息，不替代医疗建议。", advice: "把困难拆小，先完成眼前一段。" },
  { lotNumber: 12, level: "上吉", shortVerse: "贵人扶持，谋事有成", verse: "一舟顺水过前滩，两岸花开日影宽。得遇贵人相引处，旧愁散尽换新颜。", interpretation: "此签主外力相助，所谋有人响应，但仍要自己把话说清、把事做实。", career: "适合争取资源、面谈合作或提交方案。", wealth: "正财较稳，合作收益需写清边界。", relationship: "有人愿意靠近，宜坦诚表达。", health: "宜舒展筋骨，避免久坐劳神。", advice: "主动联系可信之人，别把机会闷在心里。" },
  { lotNumber: 19, level: "中平", shortVerse: "事有反复，谨慎为先", verse: "风吹竹影乱纷纷，月在云中未见真。莫把浮言当定论，静听三日自分明。", interpretation: "此签主消息混杂、判断未定。短期不宜仓促定夺，先核实事实。", career: "文件、合同、口头承诺都要复核。", wealth: "不宜高风险投入，谨防冲动消费。", relationship: "误会可解，但要等情绪降温。", health: "少熬夜，心绪不宁时先休息。", advice: "先查证，再回应。" },
  { lotNumber: 28, level: "上上", shortVerse: "云开月朗，喜信将临", verse: "云外清光照碧台，门前喜鹊报春来。所求若合天人意，不日佳音次第开。", interpretation: "此签主好消息渐近，尤其利考试、求职、项目验收和家中喜事。", career: "可展示成果，争取关键节点通过。", wealth: "收益多来自已耕耘之事。", relationship: "感情有回应，家人之间也较和顺。", health: "状态回升，但仍需保持节律。", advice: "把准备做到位，等消息时别自乱阵脚。" },
  { lotNumber: 36, level: "中吉", shortVerse: "退一步宽，转身见路", verse: "山前一水隔行舟，欲渡还须觅浅洲。莫向急流争一步，回头别有好源头。", interpretation: "此签提醒换路不等于失败。当前若正面推进受阻，可改方法或改时机。", career: "适合调整方案、换沟通对象。", wealth: "少碰不熟悉的渠道，现金流为先。", relationship: "退让一句，反而能打开谈话。", health: "注意肩颈和压力累积。", advice: "别硬碰，寻找更顺的入口。" },
  { lotNumber: 52, level: "中平", shortVerse: "静守本心，勿听纷扰", verse: "庭前花落又花开，客语纷纷莫入怀。若守一心行正道，是非终自两边排。", interpretation: "此签主外界意见多，容易扰乱判断。真正关键是回到本心和长期目标。", career: "不宜频繁改方向，先稳定节奏。", wealth: "账目宜清，借贷担保要谨慎。", relationship: "少让旁人意见替代双方沟通。", health: "情绪压力需排解，可散步静坐。", advice: "减少噪音，保留一个清楚的判断标准。" },
  { lotNumber: 66, level: "上吉", shortVerse: "厚积薄发，水到渠成", verse: "多年根柢在深泥，一旦春风发旧枝。莫道前程来得晚，花开正是合时宜。", interpretation: "此签主积累见效，不是一夜暴起，而是长期准备终于进入收获期。", career: "利复盘过往经验，形成可交付成果。", wealth: "稳健收益渐显，不宜贪快。", relationship: "慢热但可靠，适合谈长期安排。", health: "长期调养会见效果，忌三天打鱼。", advice: "继续做对的事，别因慢而怀疑。" },
  { lotNumber: 74, level: "中吉", shortVerse: "远行有望，先备后动", verse: "驿路梅花带雪香，远人消息在他乡。若问前途须整备，行囊稳处路偏长。", interpretation: "此签利外出、迁动、跨城合作，但成败在准备是否充分。", career: "可拓展外部机会，先列资源清单。", wealth: "远方机会可看，但要算清成本。", relationship: "异地或久别之人有联系机缘。", health: "旅途劳顿，注意饮食与休息。", advice: "先备证件、预算和计划，再动身。" },
  { lotNumber: 89, level: "上吉", shortVerse: "灯火相传，家宅渐安", verse: "一盏明灯照夜深，堂前和气胜黄金。若能各守温良意，家运从今日日新。", interpretation: "此签主家庭、人际和团队气氛转好。和气能带动事情顺利。", career: "团队协作比单打独斗更有利。", wealth: "家中或团队资源可互相补位。", relationship: "适合修复关系、表达关心。", health: "身心安定最要紧，规律生活即可受益。", advice: "先把关系理顺，事情会跟着顺。" },
  { lotNumber: 96, level: "中平", shortVerse: "盈满须防，成事守度", verse: "花到全开易被风，月圆还恐有云封。功成莫忘来时路，留得三分保始终。", interpretation: "此签提醒已有成果时更要守度。越接近完成，越不能疏忽细节。", career: "收尾验收、交接文档要细。", wealth: "见好需收，勿贪最后一口。", relationship: "不要因一时得意忽略对方感受。", health: "避免过劳和饮食过量。", advice: "留余地，守住成果。" },
];

export function buildLotReading(master: string, question?: string) {
  const lot = LOTS[Math.floor(Math.random() * LOTS.length)];
  const teacher = MASTER_INFO[getMaster(master)];
  const preview = {
    lotNumber: lot.lotNumber,
    level: lot.level,
    shortVerse: lot.shortVerse,
    masterName: teacher.name,
  };
  const fullResult = {
    ...preview,
    verse: lot.verse,
    poem: (lot as any).poem || lot.verse,
    interpretation: lot.interpretation,
    career: lot.career || "事业宜先看清形势，稳住手头可控之事，再谈扩展。",
    wealth: lot.wealth || "财运以稳为先，重要投入宜多核算，不宜只凭一时冲动。",
    relationship: lot.relationship || "感情与人际贵在坦诚沟通，少猜测，多确认。",
    health: lot.health || "身心作息宜规律，若有不适请及时寻求专业帮助。",
    advice: question ? `${lot.advice} 你所问“${question}”，宜先看现实条件是否齐备，再顺势推进。` : lot.advice,
    masterStyle: teacher.style,
    culturalNote: "灵签结果仅作传统文化参考，不替代现实决策。",
  };
  return { preview, fullResult };
}

const TRIGRAM_LINES: Record<string, number[]> = {
  乾: [9, 9, 9],
  兑: [9, 9, 6],
  离: [9, 6, 9],
  震: [9, 6, 6],
  巽: [6, 9, 9],
  坎: [6, 9, 6],
  艮: [6, 6, 9],
  坤: [6, 6, 6],
};

// 按《周易》通行的文王卦序保存；爻位从下至上排列，供动爻翻转和卦画展示共用。
const HEXAGRAMS = [
  { name: "乾为天", lower: "乾", upper: "乾", summary: "乾卦重在自强与担当，适合主动推进，但需守住分寸。", judgment: "元亨利贞。" },
  { name: "坤为地", lower: "坤", upper: "坤", summary: "坤卦重在承载与配合，宜先稳根基，再顺势而为。", judgment: "元亨。利牝马之贞。" },
  { name: "水雷屯", lower: "震", upper: "坎", summary: "屯卦象征开端多阻，宜厘清次序、积累条件，不急于求成。", judgment: "元亨利贞。勿用有攸往，利建侯。" },
  { name: "山水蒙", lower: "坎", upper: "艮", summary: "蒙卦提示先学习与求教，信息未明时不宜凭感觉决断。", judgment: "亨。匪我求童蒙，童蒙求我。" },
  { name: "水天需", lower: "乾", upper: "坎", summary: "需卦宜耐心等待关键条件成熟，以准备代替空等。", judgment: "有孚，光亨，贞吉。利涉大川。" },
  { name: "天水讼", lower: "坎", upper: "乾", summary: "讼卦提醒分歧宜及早沟通，留凭据、守边界，避免意气相争。", judgment: "有孚，窒惕，中吉，终凶。利见大人，不利涉大川。" },
  { name: "地水师", lower: "坎", upper: "坤", summary: "师卦重在组织与纪律，复杂事务宜定责任、按步骤推进。", judgment: "贞，丈人吉，无咎。" },
  { name: "水地比", lower: "坤", upper: "坎", summary: "比卦重在互信协作，宜辨明同路人，真诚相待。", judgment: "吉。原筮，元永贞，无咎。" },
  { name: "风天小畜", lower: "乾", upper: "巽", summary: "小畜卦主小有积累，宜渐进经营，不宜一口气求满。", judgment: "亨。密云不雨，自我西郊。" },
  { name: "天泽履", lower: "兑", upper: "乾", summary: "履卦讲行事有度，面对压力越要谨慎、守礼而行。", judgment: "履虎尾，不咥人，亨。" },
  { name: "地天泰", lower: "乾", upper: "坤", summary: "泰卦主上下相通、内外协调，宜把握和合时机稳步推进。", judgment: "小往大来，吉亨。" },
  { name: "天地否", lower: "坤", upper: "乾", summary: "否卦提示沟通不畅，宜收敛锋芒、修整内部，不强行突破。", judgment: "否之匪人，不利君子贞，大往小来。" },
  { name: "天火同人", lower: "离", upper: "乾", summary: "同人卦重共同目标，坦诚协商能让分散的力量聚拢。", judgment: "同人于野，亨。利涉大川，利君子贞。" },
  { name: "火天大有", lower: "乾", upper: "离", summary: "大有卦主资源与机会汇集，宜以责任感驾驭成果。", judgment: "元亨。" },
  { name: "地山谦", lower: "艮", upper: "坤", summary: "谦卦以低处蓄势，宜谦和务实，让成果自然沉淀。", judgment: "亨，君子有终。" },
  { name: "雷地豫", lower: "坤", upper: "震", summary: "豫卦主预备与振作，宜先把计划落到可执行的安排上。", judgment: "利建侯行师。" },
  { name: "泽雷随", lower: "震", upper: "兑", summary: "随卦提示顺势而行，但应守住自己的原则与节奏。", judgment: "元亨利贞，无咎。" },
  { name: "山风蛊", lower: "巽", upper: "艮", summary: "蛊卦主整治旧弊，适合查漏补缺、处理拖延已久的问题。", judgment: "元亨，利涉大川。先甲三日，后甲三日。" },
  { name: "地泽临", lower: "兑", upper: "坤", summary: "临卦主接近与担当，宜亲自了解实情，及时回应他人。", judgment: "元亨利贞。至于八月有凶。" },
  { name: "风地观", lower: "坤", upper: "巽", summary: "观卦宜先观察全局，放慢判断，让事实逐渐显现。", judgment: "盥而不荐，有孚颙若。" },
  { name: "火雷噬嗑", lower: "震", upper: "离", summary: "噬嗑卦主排除阻碍，宜明确规则、直面关键问题。", judgment: "亨。利用狱。" },
  { name: "山火贲", lower: "离", upper: "艮", summary: "贲卦讲文饰有节，外在表达应服务于真实内容。", judgment: "亨。小利有攸往。" },
  { name: "山地剥", lower: "坤", upper: "艮", summary: "剥卦提示旧结构正在松动，宜收缩战线、保存根本。", judgment: "不利有攸往。" },
  { name: "地雷复", lower: "震", upper: "坤", summary: "复卦主回归正轨，适合从一件小而确定的事重新开始。", judgment: "亨。出入无疾，朋来无咎。反复其道，七日来复。" },
  { name: "天雷无妄", lower: "震", upper: "乾", summary: "无妄卦贵在真诚守正，少些侥幸与过度设计。", judgment: "元亨利贞。其匪正有眚，不利有攸往。" },
  { name: "山天大畜", lower: "乾", upper: "艮", summary: "大畜卦主蓄力养成，宜充实能力，等待更合适的时机。", judgment: "利贞。不家食吉，利涉大川。" },
  { name: "山雷颐", lower: "震", upper: "艮", summary: "颐卦关乎滋养与言语，宜照顾身心，也留意出口之言。", judgment: "贞吉。观颐，自求口实。" },
  { name: "泽风大过", lower: "巽", upper: "兑", summary: "大过卦提示负担偏重，宜优先减压、调整支撑结构。", judgment: "栋桡，利有攸往，亨。" },
  { name: "坎为水", lower: "坎", upper: "坎", summary: "坎卦代表反复的险阻，宜保持警觉，把大事拆成小步。", judgment: "有孚，维心亨，行有尚。" },
  { name: "离为火", lower: "离", upper: "离", summary: "离卦重在明辨与依托，宜厘清事实，再选择可靠的支持。", judgment: "利贞，亨。畜牝牛吉。" },
  { name: "泽山咸", lower: "艮", upper: "兑", summary: "咸卦主相互感应，宜真诚表达，也尊重彼此界限。", judgment: "亨，利贞，取女吉。" },
  { name: "雷风恒", lower: "巽", upper: "震", summary: "恒卦贵在持久，规律投入比短期冲劲更重要。", judgment: "亨，无咎，利贞，利有攸往。" },
  { name: "天山遁", lower: "艮", upper: "乾", summary: "遁卦不是退缩，而是及时避开消耗，保存力量再图进展。", judgment: "亨，小利贞。" },
  { name: "雷天大壮", lower: "乾", upper: "震", summary: "大壮卦有强劲行动力，越是势盛越应遵守边界。", judgment: "利贞。" },
  { name: "火地晋", lower: "坤", upper: "离", summary: "晋卦主循序上进，宜展示能力、争取正当支持。", judgment: "康侯用锡马蕃庶，昼日三接。" },
  { name: "地火明夷", lower: "离", upper: "坤", summary: "明夷卦提示环境不明时宜韬光养晦，先保全判断。", judgment: "利艰贞。" },
  { name: "风火家人", lower: "离", upper: "巽", summary: "家人卦重角色与秩序，宜把责任、期待和沟通说清楚。", judgment: "利女贞。" },
  { name: "火泽睽", lower: "兑", upper: "离", summary: "睽卦主差异并存，宜求同存异，先做好可协调的小事。", judgment: "小事吉。" },
  { name: "水山蹇", lower: "艮", upper: "坎", summary: "蹇卦遇阻宜绕行或求助，不必用蛮力硬撑。", judgment: "利西南，不利东北。利见大人，贞吉。" },
  { name: "雷水解", lower: "坎", upper: "震", summary: "解卦主压力渐释，宜及时处理遗留事项，恢复正常节奏。", judgment: "利西南。无所往，其来复吉。有攸往，夙吉。" },
  { name: "山泽损", lower: "兑", upper: "艮", summary: "损卦宜减去无效负担，把资源集中到真正重要的事情上。", judgment: "有孚，元吉，无咎，可贞，利有攸往。" },
  { name: "风雷益", lower: "震", upper: "巽", summary: "益卦主互惠增长，宜主动贡献价值，也善用外部助力。", judgment: "利有攸往，利涉大川。" },
  { name: "泽天夬", lower: "乾", upper: "兑", summary: "夬卦提示该决断处要清楚表态，但避免情绪化对抗。", judgment: "扬于王庭，孚号，有厉。告自邑，不利即戎，利有攸往。" },
  { name: "天风姤", lower: "巽", upper: "乾", summary: "姤卦主突如其来的相遇或机会，宜审慎判断，不仓促承诺。", judgment: "女壮，勿用取女。" },
  { name: "泽地萃", lower: "坤", upper: "兑", summary: "萃卦主聚合人心，宜确立共同方向，避免只聚不定。", judgment: "亨。王假有庙。利见大人，亨，利贞。" },
  { name: "地风升", lower: "巽", upper: "坤", summary: "升卦主稳步向上，宜脚踏实地积累，不急于一步登高。", judgment: "元亨。用见大人，勿恤。南征吉。" },
  { name: "泽水困", lower: "坎", upper: "兑", summary: "困卦提示资源受限，宜守住内在秩序，减少无谓消耗。", judgment: "亨，贞，大人吉，无咎。有言不信。" },
  { name: "水风井", lower: "巽", upper: "坎", summary: "井卦重共同资源，宜修好基础设施，长期经营可持续之事。", judgment: "改邑不改井，无丧无得。往来井井。" },
  { name: "泽火革", lower: "离", upper: "兑", summary: "革卦主必要变革，宜先达成共识，再有节奏地推进调整。", judgment: "己日乃孚。元亨利贞，悔亡。" },
  { name: "火风鼎", lower: "巽", upper: "离", summary: "鼎卦主更新与成就，宜整合资源，把经验化为新的成果。", judgment: "元吉，亨。" },
  { name: "震为雷", lower: "震", upper: "震", summary: "震卦主突发变动，宜先稳住心神，再迅速处理眼前事务。", judgment: "亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。" },
  { name: "艮为山", lower: "艮", upper: "艮", summary: "艮卦主止与定，宜暂停无效行动，给自己留出思考空间。", judgment: "艮其背，不获其身；行其庭，不见其人，无咎。" },
  { name: "风山渐", lower: "艮", upper: "巽", summary: "渐卦主循序渐进，关系与计划都宜让时间参与检验。", judgment: "女归吉，利贞。" },
  { name: "雷泽归妹", lower: "兑", upper: "震", summary: "归妹卦提示位置未稳，宜先校准条件与角色，不急于定局。", judgment: "征凶，无攸利。" },
  { name: "雷火丰", lower: "离", upper: "震", summary: "丰卦主盛大与明朗，成果显现时更要防止过满而失衡。", judgment: "亨，王假之。勿忧，宜日中。" },
  { name: "火山旅", lower: "艮", upper: "离", summary: "旅卦主客居与暂时，宜轻装应变、谨慎待人，不宜强求安定。", judgment: "小亨。旅贞吉。" },
  { name: "巽为风", lower: "巽", upper: "巽", summary: "巽卦主柔和深入，宜以持续沟通和细节推进来化解阻力。", judgment: "小亨，利有攸往，利见大人。" },
  { name: "兑为泽", lower: "兑", upper: "兑", summary: "兑卦主交流与愉悦，宜坦诚沟通，但避免只图一时和气。", judgment: "亨，利贞。" },
  { name: "风水涣", lower: "坎", upper: "巽", summary: "涣卦主疏解隔阂，宜把散乱的信息与情绪重新梳理。", judgment: "亨。王假有庙。利涉大川，利贞。" },
  { name: "水泽节", lower: "兑", upper: "坎", summary: "节卦主设定边界，适度节制能让事情走得更长远。", judgment: "亨。苦节不可贞。" },
  { name: "风泽中孚", lower: "兑", upper: "巽", summary: "中孚卦贵在诚信，真诚与一致的行动比漂亮承诺更有力量。", judgment: "豚鱼吉，利涉大川，利贞。" },
  { name: "雷山小过", lower: "艮", upper: "震", summary: "小过卦宜处理细节与小步调整，大事暂不宜冒进。", judgment: "亨，利贞。可小事，不可大事。" },
  { name: "水火既济", lower: "离", upper: "坎", summary: "既济卦主阶段完成，越接近收尾越要复盘细节、防微杜渐。", judgment: "亨小，利贞。初吉终乱。" },
  { name: "火水未济", lower: "坎", upper: "离", summary: "未济卦表示尚未完成，宜补齐条件，耐心走完最后一程。", judgment: "亨。小狐汔济，濡其尾，无攸利。" },
].map((item, index) => ({
  ...item,
  unicode: String.fromCodePoint(0x4dc0 + index),
  lines: [...TRIGRAM_LINES[item.lower], ...TRIGRAM_LINES[item.upper]],
}));

function hexagramKey(lines: number[]) {
  return lines.map((line) => (line === 7 || line === 9 ? "1" : "0")).join("");
}

const HEXAGRAM_BY_LINES = new Map(HEXAGRAMS.map((hexagram) => [hexagramKey(hexagram.lines), hexagram]));

const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
const SIX_GODS = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];
const SIX_RELATIONS = ["父母", "兄弟", "官鬼", "妻财", "子孙", "兄弟"];
const TRIGRAM_GUIDES: Record<string, { image: string; focus: string; action: string }> = {
  乾: { image: "天行健", focus: "主动与担当", action: "把目标、责任和时限写清，再稳步落实" },
  兑: { image: "泽润万物", focus: "交流与回应", action: "以坦诚沟通换取共识，同时留好边界" },
  离: { image: "离火照见", focus: "明辨与依托", action: "核实信息与条件，选择可靠的人和方法" },
  震: { image: "雷动而发", focus: "启动与变化", action: "先处理最紧急的一步，避免被突发情况带乱节奏" },
  巽: { image: "风行入微", focus: "渗透与沟通", action: "从细节和持续沟通处慢慢推动，不宜硬碰硬" },
  坎: { image: "水行有险", focus: "风险与耐心", action: "预留余地、逐项核对，把复杂问题拆小处理" },
  艮: { image: "山止而定", focus: "节制与停驻", action: "及时暂停无效消耗，先稳住基本盘再继续" },
  坤: { image: "地势坤厚", focus: "承载与配合", action: "先把基础和协作关系照顾好，让事情自然生长" },
};

const MOVING_LINE_GUIDES = [
  { focus: "事情刚起步", action: "先验证方向和第一步，不要过早承诺结果" },
  { focus: "需要协调身边的人与资源", action: "把分工和沟通说具体，避免各自揣测" },
  { focus: "进入推进与压力并存的阶段", action: "先解决关键阻点，避免同时开太多战线" },
  { focus: "开始面对外部环境与规则", action: "多看事实和反馈，再调整自己的策略" },
  { focus: "来到决策与承担的核心位置", action: "把原则摆在前面，用成熟判断带动全局" },
  { focus: "接近一个阶段的收尾或转折", action: "留出复盘和缓冲，防止在最后一步失衡" },
];

function questionGuide(question?: string) {
  const text = question?.trim() || "";
  if (/工作|事业|求职|职场|公司|项目|升职|创业/.test(text)) {
    return { label: "工作与事务", observation: "所问偏向工作与事务，宜把目标、协作和节奏拆开看。", step: "列出当前最重要的一项事务，并明确本周能完成的下一步。" };
  }
  if (/感情|恋|爱|婚|伴侣|关系|相处/.test(text)) {
    return { label: "关系与相处", observation: "所问偏向关系与相处，宜先分清感受、期待和现实安排。", step: "把最在意的一件事用平和方式说清，并给对方回应的空间。" };
  }
  if (/财|钱|收入|投资|生意|买|卖|债/.test(text)) {
    return { label: "财务与取舍", observation: "所问偏向财务与取舍，宜先看现金流、风险和可承受范围。", step: "先核对可动用资源与最坏情况，不以一时情绪做重大决定。" };
  }
  if (/健康|身体|病|睡眠|康复|治疗/.test(text)) {
    return { label: "身心状态", observation: "所问偏向身心状态，卦象仅作修心参考，宜以规律作息和专业意见为先。", step: "先安排一件能改善作息或减轻压力的小事，身体不适及时咨询专业人士。" };
  }
  if (/家人|父母|孩子|家庭|亲人/.test(text)) {
    return { label: "家庭与亲人", observation: "所问偏向家庭与亲人，宜兼顾责任、沟通和彼此的实际需要。", step: "先确认家人最需要被回应的事，再商量可共同承担的安排。" };
  }
  return { label: "所问之事", observation: "所问之事宜先辨明轻重缓急，再观察条件是否成熟。", step: "先完成最可控的一步，再根据新的反馈调整安排。" };
}

function normalizeDivinationQuestion(question?: string) {
  return (question || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()【】\[\]{}]/g, "");
}

function stableQuestionHash(question: string) {
  let hash = 2166136261;
  for (let index = 0; index < question.length; index += 1) {
    hash ^= question.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mergeTrigramFocus(first: { focus: string }, second: { focus: string }) {
  return first.focus === second.focus ? first.focus : `${first.focus}与${second.focus}`;
}

function mergeTrigramAction(first: { action: string }, second: { action: string }) {
  return first.action === second.action ? first.action : `${first.action}，并${second.action}`;
}

function lineDetail(hexagram: any, changed: any, changingLine: number, index: number) {
  const value = hexagram.lines[index];
  const yang = value === 7 || value === 9;
  const moving = index + 1 === changingLine;
  const relation = SIX_RELATIONS[index % SIX_RELATIONS.length];
  const god = SIX_GODS[index % SIX_GODS.length];
  const yinYang = yang ? "阳爻" : "阴爻";
  const trigram = index < 3 ? hexagram.lower : hexagram.upper;
  const guide = TRIGRAM_GUIDES[trigram];
  const lineGuide = MOVING_LINE_GUIDES[index];
  const text = moving
    ? `${LINE_NAMES[index]}发动，${relation}临${god}，此位关乎${lineGuide.focus}。由${hexagram.name}转向${changed.name}，宜${lineGuide.action}。`
    : `${LINE_NAMES[index]}为${yinYang}，${relation}临${god}，取${guide.image}之意，侧重${guide.focus}；此层宜${guide.action}。`;

  return {
    line: index + 1,
    name: LINE_NAMES[index],
    value,
    yinYang,
    moving,
    relation,
    god,
    text,
  };
}

export function buildDivinationReading(master: string, question?: string) {
  const normalizedQuestion = normalizeDivinationQuestion(question);
  const questionHash = stableQuestionHash(normalizedQuestion);
  const index = questionHash % HEXAGRAMS.length;
  const hexagram = HEXAGRAMS[index];
  const changingLine = Math.floor(questionHash / HEXAGRAMS.length) % 6 + 1;
  const changedLines = hexagram.lines.map((line, lineIndex) => (
    lineIndex + 1 === changingLine ? (line === 9 ? 6 : 9) : line
  ));
  const changed = HEXAGRAM_BY_LINES.get(hexagramKey(changedLines)) || hexagram;
  const changingLineText = LINE_NAMES[changingLine - 1];
  const lineDetails = hexagram.lines.map((_, lineIndex) => lineDetail(hexagram, changed, changingLine, lineIndex));
  const shiLine = (index % 6) + 1;
  const yingLine = ((shiLine + 2) % 6) + 1;
  const teacher = MASTER_INFO[getMaster(master)];
  const lowerGuide = TRIGRAM_GUIDES[hexagram.lower];
  const upperGuide = TRIGRAM_GUIDES[hexagram.upper];
  const changedLowerGuide = TRIGRAM_GUIDES[changed.lower];
  const changedUpperGuide = TRIGRAM_GUIDES[changed.upper];
  const movingGuide = MOVING_LINE_GUIDES[changingLine - 1];
  const topic = questionGuide(question);
  const currentFocus = mergeTrigramFocus(lowerGuide, upperGuide);
  const changedFocus = mergeTrigramFocus(changedLowerGuide, changedUpperGuide);
  const currentAction = mergeTrigramAction(lowerGuide, upperGuide);
  const changedAction = mergeTrigramAction(changedLowerGuide, changedUpperGuide);
  const preview = {
    hexagram: hexagram.name,
    lines: hexagram.lines,
    summary: hexagram.summary,
    original_hexagram: { name: hexagram.name, unicode: hexagram.unicode },
    changed_hexagram: { name: changed.name, unicode: changed.unicode },
    changing_line: changingLine,
  };
  const fullResult = {
    ...preview,
    masterName: teacher.name,
    masterStyle: teacher.style,
    question: question || "",
    original_hexagram: { name: hexagram.name, unicode: hexagram.unicode, summary: hexagram.summary },
    changed_hexagram: { name: changed.name, unicode: changed.unicode, summary: changed.summary },
    changing_line: changingLine,
    changing_line_text: changingLineText,
    shiYing: {
      shi: `${LINE_NAMES[shiLine - 1]}持世`,
      ying: `${LINE_NAMES[yingLine - 1]}为应`,
      note: "世爻看自身立场，应爻看对方、环境或外部回应。",
    },
    sixRelations: lineDetails.map((item) => ({ line: item.line, name: item.name, relation: item.relation, moving: item.moving })),
    sixGods: lineDetails.map((item) => ({ line: item.line, god: item.god, moving: item.moving })),
    lineTexts: lineDetails,
    keyChanges: [
      `${changingLineText}发动，重点落在${movingGuide.focus}，宜${movingGuide.action}。`,
      `${hexagram.name}当前以${currentFocus}为主，动后转为${changed.name}，后续更需留意${changedFocus}。`,
      `${LINE_NAMES[shiLine - 1]}持世，先看自己在${topic.label}中的立场；${LINE_NAMES[yingLine - 1]}为应，再观察外部回应。`,
    ],
    judgment: hexagram.judgment,
    original: `本卦《${hexagram.name}》：${hexagram.summary} 下卦取“${lowerGuide.image}”之象，偏向${lowerGuide.focus}；上卦取“${upperGuide.image}”之象，偏向${upperGuide.focus}。`,
    changing: `动在${changingLineText}，说明关键落在${movingGuide.focus}。动后为《${changed.name}》：${changed.summary}`,
    interpretation: `${topic.observation}${hexagram.summary} 当前宜从${currentFocus}着手；后续转向${changed.name}，则可借${changedFocus}来调整节奏。`,
    advice: `${teacher.name}的解读取向是：${teacher.voice} 就${topic.label}而言，${currentAction}。`,
    actionAdvice: [
      topic.step,
      `${changingLineText}主${movingGuide.focus}：${movingGuide.action}。`,
      `结合变卦《${changed.name}》，接下来可${changedAction}。`,
    ],
    references: [
      { book: "易经", chapter: hexagram.name, quote: hexagram.judgment },
      { book: "象传", chapter: changed.name, quote: changed.summary },
    ],
    culturalNote: "六爻解卦仅作传统文化参考，不替代现实决策。",
  };
  return { preview, fullResult };
}

const DREAM_DB: Record<string, { title: string; level: string; interpretation: string; category: string }> = {
  龙: { title: "梦见龙", level: "上上", interpretation: "龙为祥瑞之兆，主贵人扶持、事业腾达。近期将有重大机遇出现。", category: "天象瑞兽" },
  蛇: { title: "梦见蛇", level: "中吉", interpretation: "蛇主智慧与转变。梦中蛇若安静则财运将至；若追赶则提示近期需谨慎行事。", category: "动物" },
  水: { title: "梦见水", level: "中平", interpretation: "水主财运与情绪。清水主好运，浊水主烦恼。洪水则提醒需节制开支与情绪。", category: "天象自然" },
  火: { title: "梦见火", level: "中平", interpretation: "火主名声与事业。大火主兴旺，小火主口舌。需注意控制情绪。", category: "天象自然" },
  鱼: { title: "梦见鱼", level: "上吉", interpretation: "鱼为富足之象。大鱼主大财，小鱼主小利。梦见捕鱼更为吉利。", category: "动物" },
  牙齿: { title: "梦见掉牙", level: "中平", interpretation: "传统认为掉牙主长辈安康。现代心理学也常解为压力释放或对衰老的担忧。", category: "身体" },
  血: { title: "梦见流血", level: "上吉", interpretation: "鲜血在解梦中常反主财运将至，尤其大量流血更佳，莫被字面吓到。", category: "身体" },
  死人: { title: "梦见自己死了", level: "上上", interpretation: "梦中死亡是重生的象征，旧的告一段落，新的将启。", category: "生死婚丧" },
  父母: { title: "梦见父母", level: "上吉", interpretation: "近期家中诸事顺遂，家人安康。若双亲已故，则提示需多缅怀祭祀。", category: "人物" },
  孩子: { title: "梦见孩子", level: "中吉", interpretation: "象征新的开始与希望。怀孕者梦此为胎气稳固。", category: "人物" },
  僧人: { title: "梦见僧人", level: "上吉", interpretation: "象征心灵将得开悟，迷茫之事将有指引。", category: "鬼神宗教" },
  贵人: { title: "梦见贵人", level: "上上", interpretation: "事业上将遇贵人扶持，或得到上级器重。", category: "人物" },
};

export function buildDreamReading(query: string) {
  const q = query.toLowerCase();
  let result = {
    title: query.length <= 8 ? `梦见${query}` : "梦境解析",
    level: "中平",
    interpretation: `梦见“${query}”更适合结合当下情绪、近期压力与梦中细节来参详。传统解梦重象意，现代解读重心境：若梦中感到紧张，多提示现实里有未消化的担忧；若梦后心境平和，则可视作潜意识在整理记忆与关系。`,
    category: "综合",
  };
  for (const [key, value] of Object.entries(DREAM_DB)) {
    if (q.includes(key.toLowerCase())) {
      result = { ...value, title: value.title || `梦见${key}` };
      break;
    }
  }
  return {
    preview: result,
    fullResult: {
      ...result,
      query,
      advice: "解梦宜看情绪，不宜执着字面。若梦后心绪不安，可记录梦境、梳理近期压力，再做现实判断。",
    },
  };
}

export function buildBlessingFullResult(input: {
  name: string; relation: string; lampType: string; duration: string; wish?: string; donorName?: string; maskedName: string; maskedDonor: string;
}) {
  return {
    lampType: input.lampType,
    duration: input.duration,
    relation: input.relation,
    maskedName: input.maskedName,
    maskedDonor: input.maskedDonor,
    wish: input.wish || "愿平安顺遂，身心清明。",
    blessingText: `${input.maskedDonor}为${input.maskedName}点亮${input.lampType}，愿所念之人平安喜乐，福慧增长。`,
    culturalNote: "心愿供灯为线上仪式表达，仅作祝愿与记录。",
  };
}

function chineseDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

function toDateText(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function almanacSolar(parts: { year: number; month: number; day: number }, hour = 12) {
  return Solar.fromYmdHms(parts.year, parts.month, parts.day, hour, 0, 0);
}

function parseAlmanacParts(dateText?: string) {
  if (!dateText) return chineseDateParts(new Date());
  const [year, month, day] = dateText.split("-").map(Number);
  return { year, month, day, weekday: chineseDateParts(new Date(`${dateText}T12:00:00+08:00`)).weekday };
}

function lunarList(value: unknown, fallback = "无") {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[、,\s]+/) : [];
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  return clean.length ? clean : [fallback];
}

function lunarRating(lunar: any) {
  const tianShenType = lunar.getDayTianShenType?.() || "";
  const tianShenLuck = lunar.getDayTianShenLuck?.() || "";
  const yiCount = lunarList(lunar.getDayYi?.(), "").filter(Boolean).length;
  const jiCount = lunarList(lunar.getDayJi?.(), "").filter(Boolean).length;

  if (tianShenType === "黄道" && tianShenLuck === "吉" && yiCount >= jiCount) return "上上";
  if (tianShenType === "黄道" || tianShenLuck === "吉" || yiCount > jiCount) return "上吉";
  return "中平";
}

function lunarRatingText(lunar: any, rating: string) {
  const tianShen = lunar.getDayTianShen?.() || "值神";
  const tianShenType = lunar.getDayTianShenType?.() || "黄历";
  if (rating === "上上") return `${tianShen}${tianShenType}，诸事多顺，宜把握良机`;
  if (rating === "上吉") return `${tianShen}${tianShenType}，多事可行，宜稳中求进`;
  return `${tianShen}${tianShenType}，平日守正，宜少躁进`;
}

function lunarDayShort(lunar: any) {
  const text = lunar.toString?.() || "";
  return text.replace(/^.*月/, "") || String(lunar.getDayInChinese?.() || "");
}

function buildAlmanacForParts(parts: { year: number; month: number; day: number; weekday?: string }) {
  const solar = almanacSolar(parts);
  const lunar = solar.getLunar();
  const date = new Date(`${toDateText(parts)}T12:00:00+08:00`);
  const dateParts = chineseDateParts(date);
  const rating = lunarRating(lunar);
  const yi = lunarList(lunar.getDayYi?.());
  const ji = lunarList(lunar.getDayJi?.());
  const hourStarts = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

  const hours = hourStarts.map((hour) => {
    const hourLunar = almanacSolar(parts, hour).getLunar();
    const hourYi = lunarList(hourLunar.getTimeYi?.(), "无");
    const hourJi = lunarList(hourLunar.getTimeJi?.(), "无");
    return {
      shi: `${hourLunar.getTimeZhi?.()}时`,
      name: hourLunar.getTimeInGanZhi?.() || "",
      chong: `冲${hourLunar.getTimeChongDesc?.() || ""} 煞${hourLunar.getTimeSha?.() || ""}`,
      yi: hourYi,
      ji: hourJi,
    };
  });

  const weekDays = Array.from({ length: 7 }, (_, offset) => {
    const next = new Date(date.getTime() + offset * 86400000);
    const nextParts = chineseDateParts(next);
    const nextLunar = almanacSolar(nextParts).getLunar();
    return {
      day: offset === 0 ? "今日" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", weekday: "short" }).format(next),
      lunar: lunarDayShort(nextLunar),
      rating: lunarRating(nextLunar),
      date: toDateText(nextParts),
    };
  });

  return {
    dateInfo: {
      date: toDateText(dateParts),
      solar: `${dateParts.year}年${dateParts.month}月${dateParts.day}日`,
      weekday: dateParts.weekday,
      lunar: `农历${lunar.toString?.()}`,
      ganzhi: `${lunar.getYearInGanZhi?.()}年 ${lunar.getMonthInGanZhi?.()}月 ${lunar.getDayInGanZhi?.()}日`,
      zodiac: `${lunar.getYearShengXiao?.()}年`,
      rating,
      ratingText: lunarRatingText(lunar, rating),
    },
    yi,
    ji,
    shensha: [
      { label: "吉神宜趋", value: lunarList(lunar.getDayJiShen?.()).join("、"), variant: "gold" },
      { label: "凶神宜避", value: lunarList(lunar.getDayXiongSha?.()).join("、"), variant: "vermillion" },
      { label: "冲煞", value: `冲${lunar.getDayChongDesc?.()} 煞${lunar.getDaySha?.()}`, variant: "gold" },
      { label: "胎神方位", value: lunar.getDayPositionTai?.() || "参考当日黄历", variant: "gold" },
      { label: "28 宿", value: `${lunar.getXiu?.()}宿 · ${lunar.getXiuLuck?.()}`, variant: "gold" },
      { label: "12 建除", value: `${lunar.getZhiXing?.()}日`, variant: "gold" },
      { label: "值神", value: `${lunar.getDayTianShen?.()} · ${lunar.getDayTianShenType?.()} · ${lunar.getDayTianShenLuck?.()}`, variant: rating === "中平" ? "vermillion" : "gold" },
      { label: "彭祖百忌", value: `${lunar.getPengZuGan?.()}；${lunar.getPengZuZhi?.()}`, variant: "vermillion" },
    ],
    hours,
    weekDays,
    source: {
      name: "6tail lunar-javascript",
      url: "https://github.com/6tail/lunar-javascript",
      description: "宜忌、冲煞、吉神凶煞、节气、农历、干支、值神、建除等字段由 lunar-javascript 本地历法方法计算生成。",
      fallback: "未配置第三方万年历接口时使用本地历法结果。",
    },
  };
}

export function buildAlmanac(dateText?: string) {
  return buildAlmanacForParts(parseAlmanacParts(dateText));
}

export function recordTitle(type: string, preview: any) {
  if (type === "blessing_lamp") return `心愿供灯 · ${preview?.lampType || "心愿灯"}`;
  if (type === "temple_incense") return `一炷清香 · ${preview?.dedication || "为自己"}`;
  if (type === "fortune_draw") return `关帝灵签 · 第${preview?.lotNumber || "?"}签`;
  if (type === "fortune_bazi") return `八字精批 · ${preview?.dayMaster || "命盘"}`;
  if (type === "fortune_dream") return preview?.title || "周公解梦";
  if (type === "fortune_palmistry") return "手相 / 面相解读";
  if (type === "fortune_naming") return "宝宝起名";
  if (type === "fortune_divination") return `六爻占卜 · ${preview?.hexagram || "卦象"}`;
  return "服务记录";
}

export function recordSummary(type: string, preview: any) {
  if (type === "blessing_lamp") return `${preview?.maskedDonor || "善信"}为${preview?.maskedName || "家人"}点亮${preview?.lampType || "心愿灯"}`;
  if (type === "temple_incense") return `为${preview?.dedication || "自己"}敬上一炷清香，愿心中所念安稳明朗。`;
  return preview?.shortVerse || preview?.summary || preview?.interpretation || preview?.wuxing || preview?.level || "";
}

export function buildFullResultFromRecord(type: string, requestData: any, preview: any) {
  if (type === "fortune_bazi") return buildBaziReading(requestData).fullResult;
  if (type === "fortune_naming") return buildNamingReading(requestData).fullResult;
  if (type === "fortune_palmistry") return buildPalmistryReading({ ...requestData, recordId: requestData?.recordId || "record" }).fullResult;
  if (type === "fortune_draw") return { ...preview };
  if (type === "fortune_dream") return buildDreamReading(requestData?.query || preview?.title || "").fullResult;
  if (type === "fortune_divination") return { ...preview };
  if (type === "blessing_lamp") return { ...preview, blessingText: `${preview?.maskedDonor || "善信"}为${preview?.maskedName || "家人"}点亮${preview?.lampType || "心愿灯"}` };
  if (type === "temple_incense") return { ...preview };
  return { ...preview };
}
