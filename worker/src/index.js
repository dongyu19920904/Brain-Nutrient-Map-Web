const SYSTEM_PROMPT = `你是一名中文脑健康生活方式解读助手，服务对象是普通中文用户，尤其是 35-60 岁关注脑雾、记忆力下降、更年期脑健康或父母认知健康的人。

边界要求：
1. 你只能做健康信息整理、科普解释、生活方式复盘和低风险行动建议。
2. 不能诊断疾病，不能判断用户是否有阿尔茨海默病、痴呆、抑郁、焦虑或内分泌疾病。
3. 不能声称麦角硫因、蘑菇、补充剂或任何食物可以预防、治疗或逆转疾病。
4. 不推荐用户购买补充剂，不给剂量，不给用药建议，不评价激素治疗是否适合。
5. 如果用户提到症状明显、进展加快、影响生活、头痛眩晕、突然认知变化、慢病治疗中、正在服药或照护老人，应建议带记录咨询合格医生。
6. 建议必须具体、低风险、能在 7 天内执行，围绕饮食结构、睡眠、压力、运动、记录和就医复核。
7. 语气要克制、温和、可交付，像一份 19.9 元小报告，不要像广告。`;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://dongyu19920904.github.io",
  "https://yuyu.aivora.cn",
  "https://brain.aivora.cn",
  "http://127.0.0.1:8787",
  "http://localhost:8787"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "brain-nutrient-map-api" }, 200, cors);
    }

    if (url.pathname !== "/api/report") {
      return json({ ok: false, error: "Not found" }, 404, cors);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, cors);
    }

    try {
      const payload = await readPayload(request);
      let access = null;
      if (payload.mode === "preview") {
        await enforcePreviewLimit(request, env);
      } else {
        access = await validateAccessCode(env, payload.accessCode);
      }

      const report = await callAnthropic(env, buildUserPrompt(payload), payload.mode);
      if (payload.mode === "paid") {
        await markCodeUsed(env, access);
      }

      return json({
        ok: true,
        mode: payload.mode,
        report,
        model: env.DEFAULT_ANTHROPIC_MODEL || "claude-opus-4-6"
      }, 200, cors);
    } catch (error) {
      const status = error.status || 500;
      return json({
        ok: false,
        error: error.publicMessage || "AI 报告生成失败，请稍后重试。"
      }, status, cors);
    }
  }
};

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
  const allowOrigin = origin === "null" || allowedOrigins.includes("*") || allowedOrigins.includes(origin)
    ? origin || "*"
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

async function readPayload(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    throw publicError(400, "请求格式不正确。");
  }

  const mode = payload.mode === "paid" ? "paid" : "preview";
  const state = sanitizeState(payload.state || {});
  if (!state.concern) {
    throw publicError(400, "请先选择你的关注点。");
  }

  return {
    mode,
    accessCode: normalizeCode(payload.accessCode),
    source: String(payload.source || "brain-nutrient-map-web").slice(0, 80),
    state
  };
}

function sanitizeState(input) {
  const flags = Array.isArray(input.flags)
    ? input.flags.map((item) => String(item).slice(0, 40)).slice(0, 8)
    : [];
  const actions = Array.isArray(input.localActions)
    ? input.localActions.map((item) => String(item).slice(0, 80)).slice(0, 5)
    : [];

  return {
    concern: String(input.concern || "").slice(0, 60),
    ageBand: String(input.ageBand || "").slice(0, 30),
    roleType: String(input.roleType || "").slice(0, 40),
    mushroomMealsPerWeek: clampNumber(input.mushroomMealsPerWeek, 0, 7),
    flags,
    userNote: String(input.userNote || "").trim().slice(0, 240),
    localSummary: String(input.localSummary || "").slice(0, 500),
    localActions: actions
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, 80);
}

async function enforcePreviewLimit(request, env) {
  if (!env.BRAIN_REPORT_LIMITS) return;

  const limit = Number(env.PREVIEW_DAILY_LIMIT || 3);
  if (!Number.isFinite(limit) || limit <= 0) return;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const key = `preview:${today}:${ip}`;
  const count = Number(await env.BRAIN_REPORT_LIMITS.get(key) || "0");
  if (count >= limit) {
    throw publicError(429, "今天的免费 AI 摘要次数已用完，可以明天再试或使用付费兑换码。");
  }
  await env.BRAIN_REPORT_LIMITS.put(key, String(count + 1), { expirationTtl: 60 * 60 * 30 });
}

async function validateAccessCode(env, accessCode) {
  if (!accessCode) {
    throw publicError(400, "请先输入购买后获得的报告兑换码。");
  }

  if (env.REPORT_MODE === "open") return { type: "open" };

  const authorCodes = String(env.AUTHOR_ACCESS_CODES || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
  if (authorCodes.includes(accessCode)) {
    return { type: "author" };
  }

  if (env.BRAIN_REPORT_CODES) {
    const key = `code:${accessCode}`;
    const raw = await env.BRAIN_REPORT_CODES.get(key);
    if (!raw) {
      throw publicError(401, "兑换码无效，请检查是否输入正确。");
    }
    const record = parseCodeRecord(raw);
    if (record.usedAt) {
      throw publicError(409, "这个兑换码已经使用过。");
    }
    return { type: "kv", key, record };
  }

  const fallbackCodes = String(env.REPORT_ACCESS_CODES || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);

  if (fallbackCodes.includes(accessCode)) return { type: "static" };

  throw publicError(503, "详细报告兑换码系统还没有配置，请先联系管理员。");
}

async function markCodeUsed(env, access) {
  if (!access || access.type !== "kv" || !env.BRAIN_REPORT_CODES) return;

  await env.BRAIN_REPORT_CODES.put(access.key, JSON.stringify({
    ...access.record,
    usedAt: new Date().toISOString()
  }));
}

function parseCodeRecord(raw) {
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return {};
  }
}

function buildUserPrompt(payload) {
  const { mode, state } = payload;
  const structure = mode === "paid"
    ? `请输出一份详细 Markdown 报告，必须包含：
- 标题
- 一句话结论
- 用户画像和真实困扰复述
- 当前最值得先看的 3 个优先级
- 饮食结构建议，必须讲清楚麦角硫因只是研究线索，不是神药
- 睡眠、压力、运动和记录建议
- 7 天行动计划
- 给家人/父母看的温和解释话术
- 什么时候应该咨询医生
- 非医疗声明`
    : `请输出一份短版 Markdown 摘要，必须包含：
- 一句话结论
- 3 个优先级
- 7 天行动清单
- 什么时候应该咨询医生
- 非医疗声明`;

  return `请根据下面的用户输入，生成${mode === "paid" ? "付费详细版" : "免费短版"}脑健康生活方式解读。

【用户输入】
${JSON.stringify(state, null, 2)}

【输出结构】
${structure}

写作要求：
1. 中文输出，具体、温和、克制。
2. 不要编造用户没有提供的症状、疾病、体检结果或家庭史。
3. 不要推荐补充剂品牌、剂量或治疗方案。
4. 不要把菌菇/麦角硫因写成可以预防痴呆。
5. 建议要能让用户今天或本周开始做。`;
}

async function callAnthropic(env, prompt, mode) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw publicError(503, "AI 服务密钥未配置。");
  }

  const baseUrl = String(env.ANTHROPIC_API_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.DEFAULT_ANTHROPIC_MODEL || "claude-opus-4-6",
      max_tokens: mode === "paid" ? 4200 : 1800,
      temperature: mode === "paid" ? 0.32 : 0.38,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Anthropic-compatible API error", response.status, detail.slice(0, 500));
    throw publicError(502, "AI 服务暂时不可用，请稍后重试。");
  }

  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map((item) => item.text || "").join("\n").trim()
    : "";

  if (!text) {
    throw publicError(502, "AI 服务没有返回报告内容。");
  }

  return text;
}

function publicError(status, publicMessage) {
  const error = new Error(publicMessage);
  error.status = status;
  error.publicMessage = publicMessage;
  return error;
}

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
