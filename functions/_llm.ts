type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ChatContentPart[];
};

type LlmResult<T> = {
  data: T | null;
  status: "ok" | "not_configured" | "error";
  error?: string;
  model?: string;
  provider?: string;
};

type AiCallLog = {
  feature: string;
  requestedAt: string;
  success: boolean;
  status: LlmResult<unknown>["status"];
  provider: string;
  model: string;
  durationMs: number;
  fallback: boolean;
  errorType?: string;
};

const AI_CALL_LOGS: AiCallLog[] = [];

function getEnvValue(env: any, ...keys: string[]) {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function envFlag(env: any, key: string) {
  const value = getEnvValue(env, key).toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return null;
}

function aiEnabled(env: any) {
  const explicit = envFlag(env, "AI_ENABLED");
  return explicit === null ? true : explicit;
}

function numberEnv(env: any, keys: string[], fallback: number) {
  const raw = getEnvValue(env, ...keys);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function baseAiConfig(env: any, kind: "text" | "image") {
  const provider = getEnvValue(env, "AI_PROVIDER", "LLM_PROVIDER", "OPENAI_PROVIDER") || "openai-compatible";
  if (kind === "image") {
    return {
      provider,
      apiKey: getEnvValue(env, "AI_IMAGE_API_KEY", "LLM_IMAGE_API_KEY", "AI_API_KEY", "LLM_API_KEY", "OPENAI_API_KEY"),
      model: getEnvValue(env, "AI_IMAGE_MODEL", "LLM_IMAGE_MODEL", "OPENAI_IMAGE_MODEL"),
      baseUrl: getEnvValue(env, "AI_IMAGE_BASE_URL", "LLM_IMAGE_BASE_URL", "AI_BASE_URL", "LLM_BASE_URL", "OPENAI_BASE_URL") || "https://api.openai.com/v1",
      timeoutMs: numberEnv(env, ["AI_IMAGE_TIMEOUT_MS", "AI_TIMEOUT_MS", "LLM_IMAGE_TIMEOUT_MS", "LLM_TIMEOUT_MS"], 60000),
    };
  }
  return {
    provider,
    apiKey: getEnvValue(env, "AI_API_KEY", "LLM_API_KEY", "OPENAI_API_KEY"),
    model: getEnvValue(env, "AI_MODEL", "LLM_MODEL", "OPENAI_MODEL"),
    baseUrl: getEnvValue(env, "AI_BASE_URL", "LLM_BASE_URL", "OPENAI_BASE_URL") || "https://api.openai.com/v1",
    timeoutMs: numberEnv(env, ["AI_TIMEOUT_MS", "LLM_TIMEOUT_MS"], 30000),
  };
}

function recordAiCall(log: AiCallLog) {
  AI_CALL_LOGS.push(log);
  if (AI_CALL_LOGS.length > 50) AI_CALL_LOGS.splice(0, AI_CALL_LOGS.length - 50);
}

function normalizeErrorType(status: string, error?: string) {
  if (status === "not_configured") return "not_configured";
  if (!error) return undefined;
  if (/abort|timeout|timed out/i.test(error)) return "timeout";
  if (/401|403|key|unauthorized|forbidden/i.test(error)) return "auth";
  if (/429|rate/i.test(error)) return "rate_limit";
  if (/json|parse/i.test(error)) return "bad_response";
  return "provider_error";
}

function finishResult<T>(
  feature: string,
  startedAt: number,
  provider: string,
  model: string,
  result: LlmResult<any>,
): LlmResult<T> {
  const success = result.status === "ok";
  recordAiCall({
    feature,
    requestedAt: new Date(startedAt).toISOString(),
    success,
    status: result.status,
    provider,
    model: result.model || model,
    durationMs: Date.now() - startedAt,
    fallback: !success,
    errorType: normalizeErrorType(result.status, result.error),
  });
  return { ...result, provider: result.provider || provider, model: result.model || model } as LlmResult<T>;
}

function llmConfig(env: any) {
  const base = baseAiConfig(env, "text");

  if (!aiEnabled(env) || !base.apiKey || !base.model) return null;
  return {
    ...base,
    endpoint: `${base.baseUrl.replace(/\/+$/, "")}/chat/completions`,
  };
}

function imageModelConfig(env: any) {
  const base = baseAiConfig(env, "image");

  if (!aiEnabled(env) || !base.apiKey || !base.model) return null;
  return {
    ...base,
    endpoint: `${base.baseUrl.replace(/\/+$/, "")}/images/generations`,
  };
}

export function getAiRuntimeStatus(env: any) {
  const text = baseAiConfig(env, "text");
  const image = baseAiConfig(env, "image");
  const enabled = aiEnabled(env);
  const lastCall = AI_CALL_LOGS[AI_CALL_LOGS.length - 1] || null;

  return {
    enabled,
    provider: text.provider,
    textModelConfigured: enabled && Boolean(text.apiKey && text.model),
    imageModelConfigured: enabled && Boolean(image.apiKey && image.model),
    textModel: text.model || "",
    imageModel: image.model || "",
    timeoutMs: text.timeoutMs,
    lastError: lastCall && !lastCall.success ? {
      feature: lastCall.feature,
      errorType: lastCall.errorType,
      status: lastCall.status,
      requestedAt: lastCall.requestedAt,
    } : null,
    lastCallAt: lastCall?.requestedAt || null,
    recentCalls: AI_CALL_LOGS.slice(-10).reverse(),
  };
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function generateImage(
  env: any,
  prompt: string,
  options: { size?: string; n?: number; timeoutMs?: number; responseFormat?: "url" | "b64_json"; feature?: string } = {},
): Promise<LlmResult<{ url?: string; b64Json?: string; raw: any }>> {
  const startedAt = Date.now();
  const feature = options.feature || "image_generation";
  const base = baseAiConfig(env, "image");
  const config = imageModelConfig(env);
  if (!config) {
    return finishResult(feature, startedAt, base.provider, base.model, { data: null, status: "not_configured", model: base.model });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || config.timeoutMs);

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        prompt,
        n: options.n || 1,
        size: options.size || "1024x1024",
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: text.slice(0, 500), model: config.model });
    }

    const json: any = await res.json();
    const item = json?.data?.[0] || {};
    return finishResult(feature, startedAt, config.provider, config.model, {
      data: {
        url: str(item.url),
        b64Json: str(item.b64_json),
        raw: json,
      },
      status: "ok",
      model: config.model,
    });
  } catch (err: any) {
    return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: err?.message || "图像模型调用失败", model: config.model });
  } finally {
    clearTimeout(timer);
  }
}

async function callJsonModel<T>(
  env: any,
  messages: ChatMessage[],
  options: { temperature?: number; timeoutMs?: number; feature?: string } = {},
): Promise<LlmResult<T>> {
  const startedAt = Date.now();
  const feature = options.feature || "unknown";
  const base = baseAiConfig(env, "text");
  const config = llmConfig(env);
  if (!config) {
    return finishResult(feature, startedAt, base.provider, base.model, { data: null, status: "not_configured", model: base.model });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || config.timeoutMs);

  try {
    const payload = {
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.7,
    };
    const send = (jsonMode: boolean) => fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(jsonMode ? { ...payload, response_format: { type: "json_object" } } : payload),
    });

    let res = await send(true);
    if (!res.ok) {
      const text = await res.text();
      if ((res.status === 400 || res.status === 422) && /response_format|json_object|unsupported/i.test(text)) {
        res = await send(false);
        if (res.ok) {
          const json: any = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (typeof content !== "string") {
            return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: "模型未返回文本内容", model: config.model });
          }
          const parsed = parseJsonObject(content);
          if (!parsed || typeof parsed !== "object") {
            return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: "模型返回不是 JSON 对象", model: config.model });
          }
          return finishResult(feature, startedAt, config.provider, config.model, { data: parsed as T, status: "ok", model: config.model });
        }
        const retryText = await res.text();
        return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: retryText.slice(0, 500), model: config.model });
      }
      return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: text.slice(0, 500), model: config.model });
    }

    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: "模型未返回文本内容", model: config.model });
    }

    const parsed = parseJsonObject(content);
    if (!parsed || typeof parsed !== "object") {
      return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: "模型返回不是 JSON 对象", model: config.model });
    }

    return finishResult(feature, startedAt, config.provider, config.model, { data: parsed as T, status: "ok", model: config.model });
  } catch (err: any) {
    return finishResult(feature, startedAt, config.provider, config.model, { data: null, status: "error", error: err?.message || "模型调用失败", model: config.model });
  } finally {
    clearTimeout(timer);
  }
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function strList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  const list = value.map((item) => str(item)).filter(Boolean);
  return list.length ? list : fallback;
}

function sectionList(value: unknown, fallback: Array<{ title: string; text: string }> = []) {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .map((item: any) => ({ title: str(item?.title), text: str(item?.text) }))
    .filter((item) => item.title && item.text);
  return list.length ? list : fallback;
}

function score(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(60, Math.min(99, Math.round(n)));
}

export async function enhanceDreamReading(env: any, query: string, fallback: { preview: any; fullResult: any }) {
  const result = await callJsonModel<{
    title?: string;
    level?: string;
    category?: string;
    interpretation?: string;
    traditionalSymbols?: string[];
    realityReflection?: string;
    advice?: string;
    doList?: string[];
    avoidList?: string[];
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的周公解梦解读师。",
        "请融合传统梦象与现代心理参考，语气温和、克制、像给用户个人写的解析。",
        "不要宣称绝对预言，不要给医疗、法律、投资等专业结论。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        dream: query,
        matchedTraditionalResult: fallback.preview,
        outputSchema: {
          title: "梦境标题，8字以内优先",
          level: "上上/上吉/中吉/中平之一",
          category: "梦境分类",
          interpretation: "150-220字综合解析",
          traditionalSymbols: ["传统象征1", "传统象征2"],
          realityReflection: "现实心理参考，80字以内",
          advice: "近期提醒，80字以内",
          doList: ["宜做1", "宜做2"],
          avoidList: ["不宜1", "不宜2"],
        },
      }),
    },
  ], { temperature: 0.65, timeoutMs: 35000, feature: "dream" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallback,
      fullResult: {
        ...fallback.fullResult,
        aiEnhanced: false,
        aiStatus: result.status,
        generationNote: "本次已展示基础解读结果。",
      },
    };
  }

  const preview = {
    title: str(result.data.title, fallback.preview.title),
    level: str(result.data.level, fallback.preview.level),
    category: str(result.data.category, fallback.preview.category),
    interpretation: str(result.data.interpretation, fallback.preview.interpretation),
  };

  return {
    preview,
    fullResult: {
      ...preview,
      query,
      traditionalSymbols: strList(result.data.traditionalSymbols),
      realityReflection: str(result.data.realityReflection),
      advice: str(result.data.advice, fallback.fullResult.advice),
      doList: strList(result.data.doList),
      avoidList: strList(result.data.avoidList),
      aiEnhanced: true,
      aiModel: result.model,
    },
  };
}

export async function enhanceNamingReading(env: any, input: any, fallbackFull: any) {
  if (input?.mode === "evaluate" || fallbackFull?.mode === "evaluate") {
    return enhanceNameEvaluationReading(env, input, fallbackFull);
  }

  const result = await callJsonModel<{
    namingPrinciple?: string;
    candidates?: Array<{ name?: string; reason?: string; score?: number; source?: string }>;
    avoidAdvice?: string;
    classicSource?: string;
    overallAdvice?: string;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的中文起名师。",
        "必须基于用户提供的八字、五行、姓氏、字数、风格和避讳要求起名。",
        "不得修改已给出的八字、五行、日主等确定性结果。",
        "名字应自然、可长期使用，避免生僻怪字、谐音不雅、过度玄学承诺。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        input,
        computed: {
          bazi: fallbackFull.bazi,
          wuxing: fallbackFull.wuxing,
          dayMaster: fallbackFull.dayMaster,
        },
        existingCandidates: fallbackFull.candidates,
        outputSchema: {
          namingPrinciple: "整体起名原则，120字以内",
          candidates: [
            {
              name: "完整姓名，必须含姓氏",
              reason: "字义、音韵、五行和使用感解释，80-140字",
              score: "60-99整数",
              source: "典故或意象来源，允许为空",
            },
          ],
          avoidAdvice: "避讳/重名/使用提醒，80字以内",
          classicSource: "古籍或传统取义说明，80字以内",
          overallAdvice: "父母选名建议，80字以内",
        },
      }),
    },
  ], { temperature: 0.75, timeoutMs: 45000, feature: "naming" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础起名结果。",
    };
  }

  const surname = String(input?.surname || fallbackFull.surname || "");
  const fallbackCandidates = Array.isArray(fallbackFull.candidates) ? fallbackFull.candidates : [];
  const candidates = Array.isArray(result.data.candidates)
    ? result.data.candidates
        .map((item, index) => {
          const name = str(item?.name);
          if (!name || (surname && !name.startsWith(surname))) return null;
          return {
            name,
            reason: str(item?.reason, fallbackCandidates[index]?.reason || ""),
            score: score(item?.score, fallbackCandidates[index]?.score || 90),
            source: str(item?.source),
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...fallbackFull,
    namingPrinciple: str(result.data.namingPrinciple, fallbackFull.namingPrinciple),
    candidates: candidates.length ? candidates : fallbackCandidates,
    avoidAdvice: str(result.data.avoidAdvice, fallbackFull.avoidAdvice),
    classicSource: str(result.data.classicSource, fallbackFull.classicSource),
    overallAdvice: str(result.data.overallAdvice),
    aiEnhanced: true,
    aiModel: result.model,
  };
}

async function enhanceNameEvaluationReading(env: any, input: any, fallbackFull: any) {
  const result = await callJsonModel<{
    evaluationPrinciple?: string;
    evaluations?: Array<{
      name?: string;
      score?: number;
      summary?: string;
      fit?: string;
      sound?: string;
      meaning?: string;
      durability?: string;
      advice?: string;
    }>;
    bestName?: string;
    overallAdvice?: string;
    classicSource?: string;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的中文姓名测评师。",
        "必须基于用户提供的生辰八字、五行、待测姓名和备选姓名做姓名测评。",
        "不要擅自新增未提供的姓名；不要把测名写成起名候选方案。",
        "评价要覆盖八字贴合、音韵顺口、字义气质、长期使用感和现实避讳。",
        "语气温和克制，只作传统文化参考，不做绝对预言。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        input,
        computed: {
          bazi: fallbackFull.bazi,
          wuxing: fallbackFull.wuxing,
          dayMaster: fallbackFull.dayMaster,
        },
        namesToEvaluate: fallbackFull.evaluations?.map((item: any) => item.name) || [],
        fallback: {
          evaluationPrinciple: fallbackFull.evaluationPrinciple,
          evaluations: fallbackFull.evaluations,
          bestName: fallbackFull.bestName,
          overallAdvice: fallbackFull.overallAdvice,
          classicSource: fallbackFull.classicSource,
        },
        outputSchema: {
          evaluationPrinciple: "整体测评原则，80-120字",
          evaluations: [
            {
              name: "必须来自 namesToEvaluate",
              score: "60-99整数",
              summary: "总评摘要，60-100字",
              fit: "八字与五行贴合，80-130字",
              sound: "音韵顺口与称呼感，60-110字",
              meaning: "字义气质，60-110字",
              durability: "长期使用感，60-110字",
              advice: "现实校验建议，60-100字",
            },
          ],
          bestName: "如有多个名字，给出综合更稳的一个；必须来自 namesToEvaluate",
          overallAdvice: "综合建议，80-140字",
          classicSource: "传统取象或姓名学参考说明，80字以内",
        },
      }),
    },
  ], { temperature: 0.68, timeoutMs: 70000, feature: "name_evaluation" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础测评结果。",
    };
  }

  const fallbackEvaluations = Array.isArray(fallbackFull.evaluations) ? fallbackFull.evaluations : [];
  const allowedNames = new Set(fallbackEvaluations.map((item: any) => str(item?.name)));
  const evaluations = Array.isArray(result.data.evaluations)
    ? result.data.evaluations
        .map((item, index) => {
          const name = str(item?.name);
          if (!name || !allowedNames.has(name)) return null;
          const fallback = fallbackEvaluations.find((candidate: any) => candidate?.name === name) || fallbackEvaluations[index] || {};
          return {
            name,
            score: score(item?.score, fallback.score || 86),
            summary: str(item?.summary, fallback.summary),
            fit: str(item?.fit, fallback.fit),
            sound: str(item?.sound, fallback.sound),
            meaning: str(item?.meaning, fallback.meaning),
            durability: str(item?.durability, fallback.durability),
            advice: str(item?.advice, fallback.advice),
          };
        })
        .filter(Boolean)
    : [];

  const bestName = str(result.data.bestName, fallbackFull.bestName);

  return {
    ...fallbackFull,
    evaluationPrinciple: str(result.data.evaluationPrinciple, fallbackFull.evaluationPrinciple),
    evaluations: evaluations.length ? evaluations : fallbackEvaluations,
    bestName: allowedNames.has(bestName) ? bestName : fallbackFull.bestName,
    overallAdvice: str(result.data.overallAdvice, fallbackFull.overallAdvice),
    classicSource: str(result.data.classicSource, fallbackFull.classicSource),
    aiEnhanced: true,
    aiModel: result.model,
  };
}

export async function enhanceBaziReading(env: any, input: any, fallbackFull: any) {
  const result = await callJsonModel<{
    pattern?: string;
    character?: string;
    career?: string;
    wealth?: string;
    relationships?: string;
    health?: string;
    advice?: string;
    classics?: string;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的八字命理解读师。",
        "必须基于已排出的八字、日主、五行和师父风格来写完整解读。",
        "不得修改八字、日主、五行、性别、师父信息等确定性结果。",
        "语气温和克制，作为传统文化参考，不做绝对预言，不给医疗、法律、投资等专业结论。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        input,
        computed: {
          bazi: fallbackFull.bazi,
          dayMaster: fallbackFull.dayMaster,
          wuxing: fallbackFull.wuxing,
          gender: fallbackFull.gender,
          masterName: fallbackFull.masterName,
          masterStyle: fallbackFull.masterStyle,
        },
        fallback: {
          pattern: fallbackFull.pattern,
          character: fallbackFull.character,
          career: fallbackFull.career,
          wealth: fallbackFull.wealth,
          relationships: fallbackFull.relationships,
          health: fallbackFull.health,
          advice: fallbackFull.advice,
          classics: fallbackFull.classics,
        },
        outputSchema: {
          pattern: "格局根基，120-180字",
          character: "性情倾向，100-160字",
          career: "事业方向，100-160字",
          wealth: "财运提醒，80-140字",
          relationships: "亲缘感情，80-140字",
          health: "身心作息提醒，60-120字，必须提示不替代医疗",
          advice: "近期行动建议，80-140字",
          classics: "古籍或传统命理取义参考，80字以内",
        },
      }),
    },
  ], { temperature: 0.68, timeoutMs: 70000, feature: "bazi" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础排盘结果。",
    };
  }

  return {
    ...fallbackFull,
    pattern: str(result.data.pattern, fallbackFull.pattern),
    character: str(result.data.character, fallbackFull.character),
    career: str(result.data.career, fallbackFull.career),
    wealth: str(result.data.wealth, fallbackFull.wealth),
    relationships: str(result.data.relationships, fallbackFull.relationships),
    health: str(result.data.health, fallbackFull.health),
    advice: str(result.data.advice, fallbackFull.advice),
    classics: str(result.data.classics, fallbackFull.classics),
    aiEnhanced: true,
    aiModel: result.model,
  };
}

export async function enhanceLotReading(env: any, input: any, fallbackFull: any) {
  const result = await callJsonModel<{
    interpretation?: string;
    advice?: string;
    culturalNote?: string;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的灵签解读师。",
        "必须基于已抽出的签号、签诗、等级和用户问题来解签。",
        "不得修改签号、签诗、等级、师父信息等确定性结果。",
        "语气温和克制，不做绝对预言，不替代现实决策、医疗、法律或投资建议。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        question: input?.question || "",
        computed: {
          lotNumber: fallbackFull.lotNumber,
          level: fallbackFull.level,
          shortVerse: fallbackFull.shortVerse,
          verse: fallbackFull.verse,
          masterName: fallbackFull.masterName,
          masterStyle: fallbackFull.masterStyle,
        },
        fallback: {
          interpretation: fallbackFull.interpretation,
          advice: fallbackFull.advice,
          culturalNote: fallbackFull.culturalNote,
        },
        outputSchema: {
          interpretation: "结合签诗与问题的综合签解，120-180字",
          advice: "可执行建议，80-140字",
          culturalNote: "传统文化参考与现实边界提示，60字以内",
        },
      }),
    },
  ], { temperature: 0.7, timeoutMs: 35000, feature: "lottery" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础签解结果。",
    };
  }

  return {
    ...fallbackFull,
    interpretation: str(result.data.interpretation, fallbackFull.interpretation),
    advice: str(result.data.advice, fallbackFull.advice),
    culturalNote: str(result.data.culturalNote, fallbackFull.culturalNote),
    aiEnhanced: true,
    aiModel: result.model,
  };
}

export async function enhanceDivinationReading(env: any, input: any, fallbackFull: any) {
  const result = await callJsonModel<{
    original?: string;
    changing?: string;
    interpretation?: string;
    advice?: string;
    culturalNote?: string;
    references?: Array<{ book?: string; chapter?: string; quote?: string }>;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的六爻解卦师。",
        "必须基于已成的本卦、动爻、变卦、卦辞和用户问题来解读。",
        "不得修改本卦、变卦、动爻、卦辞、师父信息等确定性结果。",
        "语气温和克制，给出传统文化参考与可执行建议，不做绝对预言。",
        "不替代医疗、法律、投资等专业意见。只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        question: input?.question || fallbackFull.question || "",
        computed: {
          originalHexagram: fallbackFull.original_hexagram,
          changedHexagram: fallbackFull.changed_hexagram,
          changingLine: fallbackFull.changing_line,
          changingLineText: fallbackFull.changing_line_text,
          shiYing: fallbackFull.shiYing,
          sixRelations: fallbackFull.sixRelations,
          sixGods: fallbackFull.sixGods,
          lineTexts: fallbackFull.lineTexts,
          judgment: fallbackFull.judgment,
          masterName: fallbackFull.masterName,
          masterStyle: fallbackFull.masterStyle,
        },
        fallback: {
          original: fallbackFull.original,
          changing: fallbackFull.changing,
          interpretation: fallbackFull.interpretation,
          advice: fallbackFull.advice,
          culturalNote: fallbackFull.culturalNote,
          references: fallbackFull.references,
        },
        outputSchema: {
          original: "本卦解读，80-130字",
          changing: "动爻与变卦解读，80-130字",
          interpretation: "结合所问的综合卦解，140-220字",
          advice: "现实可执行建议，80-140字",
          culturalNote: "传统文化参考和现实边界提示，60字以内",
          references: [{ book: "古籍名", chapter: "篇章或卦名", quote: "短句，不超过40字" }],
        },
      }),
    },
  ], { temperature: 0.68, timeoutMs: 70000, feature: "divination" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础卦解结果。",
    };
  }

  const references = Array.isArray(result.data.references)
    ? result.data.references
        .map((item) => ({
          book: str(item?.book),
          chapter: str(item?.chapter),
          quote: str(item?.quote),
        }))
        .filter((item) => item.book && item.quote)
    : [];

  return {
    ...fallbackFull,
    original: str(result.data.original, fallbackFull.original),
    changing: str(result.data.changing, fallbackFull.changing),
    interpretation: str(result.data.interpretation, fallbackFull.interpretation),
    advice: str(result.data.advice, fallbackFull.advice),
    culturalNote: str(result.data.culturalNote, fallbackFull.culturalNote),
    references: references.length ? references : fallbackFull.references,
    aiEnhanced: true,
    aiModel: result.model,
  };
}

export async function enhancePalmistryReading(env: any, input: any, imageBase64: string, fallbackFull: any) {
  if (!imageBase64 || imageBase64 === "[data]") {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: "image_missing",
    };
  }

  const isFace = input?.mode === "face" || fallbackFull?.mode === "face";
  const fallbackSections = Array.isArray(fallbackFull?.sections) ? fallbackFull.sections : [];
  const result = await callJsonModel<{
    overview?: string;
    visibleFeatures?: string[];
    sections?: Array<{ title?: string; text?: string }>;
    advice?: string;
    privacyNote?: string;
  }>(env, [
    {
      role: "system",
      content: [
        "你是善缘阁的手相/面相解读师。",
        "只基于图片中清楚可见的特征给出传统文化参考；看不清的地方要说明不确定，不要硬编。",
        "不得做人脸识别、身份识别、年龄、性别、种族、健康诊断或医疗结论。",
        "不得给法律、医疗、投资等专业决策建议；语气温和克制，避免绝对预言。",
        "只输出 JSON 对象，不要 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            task: isFace ? "请根据上传照片做面相文化解读" : "请根据上传照片做手相文化解读",
            mode: isFace ? "face" : "hand",
            hand: input?.hand || fallbackFull?.hand || null,
            master: {
              name: fallbackFull?.masterName,
              style: fallbackFull?.masterStyle,
            },
            fallback: {
              overview: fallbackFull?.overview,
              sections: fallbackSections,
              advice: fallbackFull?.advice,
            },
            outputSchema: {
              overview: "整体观察，100-160字；必须说明只基于图上可见特征",
              visibleFeatures: ["图中可见特征1", "图中可见特征2", "图中可见特征3"],
              sections: [
                {
                  title: isFace ? "三庭与气色" : "掌色与掌丘",
                  text: "80-140字，结合图片可见特征和传统文化解释",
                },
                {
                  title: isFace ? "眉眼与表达" : "主线走势",
                  text: "80-140字，结合图片可见特征和传统文化解释",
                },
              ],
              advice: "80-140字，给现实可执行提醒，不作绝对预言",
              privacyNote: "图片仅用于本次解读，不应用于身份识别或其他用途。",
            },
          }),
        },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    },
  ], { temperature: 0.62, timeoutMs: 90000, feature: isFace ? "face_reading" : "palmistry" });

  if (result.status !== "ok" || !result.data) {
    return {
      ...fallbackFull,
      aiEnhanced: false,
      aiStatus: result.status,
      generationNote: "本次已展示基础图像解读结果。",
    };
  }

  return {
    ...fallbackFull,
    overview: str(result.data.overview, fallbackFull?.overview),
    visibleFeatures: strList(result.data.visibleFeatures),
    sections: sectionList(result.data.sections, fallbackSections),
    advice: str(result.data.advice, fallbackFull?.advice),
    privacyNote: str(result.data.privacyNote, fallbackFull?.privacyNote),
    aiEnhanced: true,
    aiModel: result.model,
  };
}
