const REPORT_API_BASE = (window.BRAIN_REPORT_API_BASE || "https://brain-nutrient-map-api.sabrinamisan090.workers.dev").replace(/\/+$/, "");

const concerns = {
  memory: {
    title: "记忆力变差",
    focus: "先看饮食多样性、睡眠和长期压力，不把单一成分神化。",
    audience: "适合发给正在担心记忆力下降的中年朋友。",
    actions: ["本周增加 2 次菌菇类食物", "记录 7 天睡眠时长", "把“补充剂冲动”换成先看证据"]
  },
  brainfog: {
    title: "脑雾和注意力",
    focus: "脑雾常和睡眠、压力、血糖波动交织，食物成分只能作为观察线索之一。",
    audience: "适合发给长期熬夜、压力大、注意力下降的人。",
    actions: ["连续 3 天午后不加糖饮料", "睡前 45 分钟离屏", "记录脑雾出现的时间段"]
  },
  parents: {
    title: "父母认知健康",
    focus: "给父母看这类信息要温和：讲饮食多样性，不讲“预防痴呆”。",
    audience: "适合发给想帮爸妈做健康复盘的子女。",
    actions: ["和父母一起列一周菜单", "每周安排 2 次散步", "观察记忆变化时先做记录再就医"]
  },
  menopause: {
    title: "更年期脑健康",
    focus: "更年期脑健康可以关注睡眠、情绪、运动和体检指标，激素治疗问题必须问医生。",
    audience: "适合发给 40-60 岁关注脑健康的女性。",
    actions: ["记录热潮红/睡眠/情绪", "补足高质量蛋白和蔬菜", "HRT 相关问题只咨询医生"]
  }
};

const foods = [
  {
    name: "香菇 / Shiitake",
    tier: "高优先",
    tags: ["high", "easy"],
    note: "菌菇类是麦角硫因内容里最容易讲清楚的食物入口。"
  },
  {
    name: "平菇 / Oyster mushroom",
    tier: "高优先",
    tags: ["high", "easy"],
    note: "价格友好，适合做“本周加 2 次菌菇”的执行建议。"
  },
  {
    name: "杏鲍菇 / King oyster",
    tier: "高优先",
    tags: ["high", "easy"],
    note: "常见、好买、好做，适合大众传播。"
  },
  {
    name: "双孢蘑菇 / Button mushroom",
    tier: "中优先",
    tags: ["easy"],
    note: "适合替换部分高油高盐配菜。"
  },
  {
    name: "黑豆 / Black bean",
    tier: "辅助",
    tags: ["plant"],
    note: "不能包装成麦角硫因核心来源，更适合放在植物多样性里。"
  },
  {
    name: "燕麦 / Oats",
    tier: "辅助",
    tags: ["plant", "easy"],
    note: "适合作为早餐结构优化的一部分。"
  },
  {
    name: "芦笋 / Asparagus",
    tier: "辅助",
    tags: ["plant"],
    note: "可作为蔬菜多样性的补充，不做夸大表达。"
  },
  {
    name: "发酵豆制品",
    tier: "辅助",
    tags: ["plant"],
    note: "可连接肠道菌群和饮食结构，但不要声称改善认知。"
  },
  {
    name: "大蒜 / Garlic",
    tier: "辅助",
    tags: ["plant", "easy"],
    note: "适合作为家庭饮食结构的一小部分。"
  }
];

const flagLabels = {
  low_sleep: "睡眠不足",
  stress: "压力偏高",
  sugar: "代谢/血糖担心",
  parent_care: "父母健康照护"
};

let activeFilter = "all";
let activeVisualStyle = "report";
let latestShareText = "";
let latestLocalSummary = "";
let latestGeneratedReport = "";
let latestGeneratedImage = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  renderFoods();
  updateAll();

  $("brainForm").addEventListener("submit", (event) => {
    event.preventDefault();
    updateAll();
  });

  $("mushroomMeals").addEventListener("input", updateAll);
  for (const input of document.querySelectorAll("input, select, textarea")) {
    input.addEventListener("change", updateAll);
  }

  for (const button of document.querySelectorAll("[data-filter]")) {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderFoods();
      updateAll();
    });
  }

  for (const button of document.querySelectorAll("[data-visual-style]")) {
    button.addEventListener("click", () => {
      activeVisualStyle = button.dataset.visualStyle;
      document.querySelectorAll("[data-visual-style]").forEach((item) => item.classList.toggle("active", item === button));
      updateImageCaption();
    });
  }

  $("copyShareBtn").addEventListener("click", copyShareText);
  $("copyOfferBtn").addEventListener("click", copyOfferText);
  $("downloadCardBtn").addEventListener("click", downloadCard);
  $("generatePreviewBtn").addEventListener("click", () => generateAiReport("preview"));
  $("generatePaidBtn").addEventListener("click", generateReportWithVisual);
  $("generateImageBtn").addEventListener("click", generateAiImage);
  $("downloadImageBtn").addEventListener("click", downloadGeneratedImage);
});

function getState() {
  const concern = document.querySelector("input[name='concern']:checked")?.value || "memory";
  const meals = Number($("mushroomMeals").value);
  const flags = Array.from(document.querySelectorAll(".check-list input:checked")).map((item) => item.value);
  return {
    concern,
    meals,
    flags,
    ageBand: $("ageBand").value,
    roleType: $("roleType").value,
    userNote: $("userNote").value.trim().slice(0, 220)
  };
}

function updateAll() {
  const state = getState();
  $("mushroomMealsOut").textContent = `${state.meals} 次`;
  const concern = concerns[state.concern];
  const level = state.meals >= 3 ? "饮食基础较好" : state.meals >= 1 ? "可以继续增加多样性" : "本周适合从 1 次菌菇开始";
  const flagText = buildFlagText(state.flags);
  const noteText = state.userNote ? ` 你的自述是：“${state.userNote}”` : "";

  latestLocalSummary = `${level}。${concern.focus}${flagText}${noteText}`;
  $("resultTitle").textContent = concern.title;
  $("resultSummary").textContent = latestLocalSummary;
  $("actionList").innerHTML = concern.actions.map((item) => `<div class="action-item">${escapeHtml(item)}</div>`).join("");

  latestShareText = buildShareText(state, concern, level);
  drawCard(state, concern, level);
}

function buildFlagText(flags) {
  if (!flags.length) return "";
  return ` 你还勾选了：${flags.map((flag) => flagLabels[flag]).join("、")}，建议把这些和饮食一起复盘。`;
}

function buildShareText(state, concern, level) {
  const mealsText = state.meals ? `我每周大概有 ${state.meals} 次菌菇类食物。` : "我几乎不吃菌菇类食物。";
  return [
    "我今天参加了 AI 延续学实验 002：脑健康成分地图。",
    `我的关注点：${concern.title}，年龄段：${state.ageBand}。`,
    mealsText,
    `观察结论：${level}。`,
    "这不是补充剂推荐，也不是预防痴呆建议，只是把最新血液代谢物和脑健康研究线索，转成一张饮食复盘卡。"
  ].join("\n");
}

function renderFoods() {
  const shown = foods.filter((food) => activeFilter === "all" || food.tags.includes(activeFilter));
  $("foodGrid").innerHTML = shown.map((food) => `
    <article class="food-card">
      <h3>${escapeHtml(food.name)}</h3>
      <div class="tag-row">
        <span class="tag">${escapeHtml(food.tier)}</span>
        ${food.tags.map((tag) => `<span class="tag">${tagLabel(tag)}</span>`).join("")}
      </div>
      <p>${escapeHtml(food.note)}</p>
    </article>
  `).join("");
}

function tagLabel(tag) {
  return {
    high: "研究传播友好",
    easy: "好执行",
    plant: "植物来源"
  }[tag] || tag;
}

function buildAiPayload(mode, report = "") {
  updateAll();
  const state = getState();
  const concern = concerns[state.concern];
  const accessCodeInput = $("accessCode");
  const accessCode = accessCodeInput ? accessCodeInput.value.trim() : "";

  return {
    mode,
    accessCode,
    style: activeVisualStyle,
    report,
    source: "brain-nutrient-map-web",
    state: {
      concern: concern.title,
      ageBand: state.ageBand,
      roleType: roleLabel(state.roleType),
      mushroomMealsPerWeek: state.meals,
      flags: state.flags.map((flag) => flagLabels[flag]),
      userNote: state.userNote,
      localSummary: latestLocalSummary,
      localActions: concern.actions
    }
  };
}

async function generateAiReport(mode) {
  if (mode === "paid") {
    await generateReportWithVisual();
    return;
  }

  setReportMessage("正在生成免费 AI 摘要...");
  toggleReportButtons(true);

  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 90000);
    const response = await fetch(`${REPORT_API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(buildAiPayload(mode))
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "AI 摘要生成失败，请稍后重试。");
    }
    renderMarkdownReport(data.report, mode);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "AI 上游响应超时，请稍后重试。你的输入已经保留，可以直接再点一次生成。"
      : error.message || "AI 摘要生成失败，请稍后重试。";
    setReportMessage(message, true);
  } finally {
    clearTimeout(timer);
    toggleReportButtons(false);
  }
}

async function generateReportWithVisual() {
  latestGeneratedReport = "";
  latestGeneratedImage = "";
  setReportMessage("正在生成完整 AI 报告，完成后会自动生成图文海报...");
  setImageMessage("等待报告完成，随后会按报告内容写生图提示词并生成图文海报。");
  toggleReportButtons(true);
  toggleImageButtons(true);

  let reportTimer;
  try {
    const controller = new AbortController();
    reportTimer = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${REPORT_API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(buildAiPayload("paid"))
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "AI 报告生成失败，请稍后重试。");
    }

    latestGeneratedReport = data.report;
    renderMarkdownReport(data.report, "paid");
    setImageMessage("报告已生成，正在根据报告提炼标题、结论和行动点，然后生成图文海报...");

    const imageController = new AbortController();
    const imageTimer = setTimeout(() => imageController.abort(), 140000);
    try {
      const imageData = await requestAiImage(data.report, imageController.signal);
      renderGeneratedVisual(imageData);
    } finally {
      clearTimeout(imageTimer);
    }
  } catch (error) {
    const message = error.name === "AbortError"
      ? "AI 响应超时，请稍后重试。报告和图片都比较耗时，建议保留当前输入后再点一次。"
      : error.message || "AI 图文报告生成失败，请稍后重试。";
    if (!latestGeneratedReport) {
      setReportMessage(message, true);
    }
    setImageMessage(message, true);
  } finally {
    clearTimeout(reportTimer);
    toggleReportButtons(false);
    toggleImageButtons(false);
  }
}

function roleLabel(roleType) {
  return {
    self: "给自己复盘",
    parent: "给父母复盘",
    partner: "给伴侣复盘",
    content: "做科普内容选题"
  }[roleType] || roleType;
}

function setReportMessage(message, isError = false) {
  $("reportOutput").innerHTML = `<span class="status ${isError ? "error" : ""}">${escapeHtml(message)}</span>`;
}

function toggleReportButtons(disabled) {
  $("generatePreviewBtn").disabled = disabled;
  $("generatePaidBtn").disabled = disabled;
}

function renderMarkdownReport(markdown, mode) {
  const label = mode === "paid" ? "完整报告" : "免费摘要";
  $("reportOutput").innerHTML = `<span class="status">${label}已生成</span>${markdownToHtml(markdown)}`;
}

async function generateAiImage() {
  if (!latestGeneratedReport) {
    await generateReportWithVisual();
    return;
  }

  setImageMessage("正在根据当前报告重新生成图文海报...");
  toggleImageButtons(true);

  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 120000);
    const data = await requestAiImage(latestGeneratedReport, controller.signal);
    renderGeneratedVisual(data);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "AI 图文海报响应超时，请稍后重试。"
      : error.message || "AI 图文海报生成失败，请稍后重试。";
    setImageMessage(message, true);
  } finally {
    clearTimeout(timer);
    toggleImageButtons(false);
  }
}

async function requestAiImage(report, signal) {
  const response = await fetch(`${REPORT_API_BASE}/api/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(buildAiPayload("paid", report))
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "AI 图文海报生成失败，请稍后重试。");
  }
  return data;
}

function renderGeneratedVisual(data) {
  latestGeneratedImage = data.image;
  $("generatedImage").src = data.image;
  $("imagePlaceholder").hidden = true;
  $("visualPoster").hidden = false;
  $("downloadImageBtn").disabled = false;
  updateImageCaption(data.caption || "图文海报已生成：图片中的标题、结论和行动点由画图 AI 直接生成，可下载后发给家人或用于朋友圈/小红书测试。");
}

function setImageMessage(message, isError = false) {
  $("visualPoster").hidden = true;
  $("imagePlaceholder").hidden = false;
  $("imagePlaceholder").innerHTML = `<strong class="${isError ? "error-text" : ""}">${escapeHtml(message)}</strong><span>图文海报会根据完整报告自动生成，图片不替代医学结论。</span>`;
  $("downloadImageBtn").disabled = true;
}

function toggleImageButtons(disabled) {
  $("generateImageBtn").disabled = disabled;
  if (!latestGeneratedImage) {
    $("downloadImageBtn").disabled = true;
  } else {
    $("downloadImageBtn").disabled = disabled;
  }
}

function updateImageCaption(customText) {
  const labels = {
    report: "推荐用途：放在详细报告开头，作为“脑健康生活方式复盘”的完整图文封面。",
    parent: "推荐用途：发给家人前先缓和语气，用带文字的温和海报降低沟通压力。",
    social: "推荐用途：作为小红书/朋友圈首图，图片里已经包含标题、结论和行动点。"
  };
  $("imageCaption").textContent = customText || labels[activeVisualStyle] || labels.report;
}

function downloadGeneratedImage() {
  if (!latestGeneratedImage) return;
  downloadDataUrl(latestGeneratedImage, `brain-health-ai-text-poster-${activeVisualStyle}.png`);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const level = Math.min(4, heading[1].length + 2);
      html += `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineMarkdown(listItem[1])}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }
    html += `<p>${inlineMarkdown(line)}</p>`;
  }

  if (inList) html += "</ul>";
  return html;
}

function inlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function drawCard(state, concern, level) {
  const canvas = $("shareCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f6f8f4";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 54, 54, width - 108, height - 108, 28);
  ctx.fill();

  ctx.fillStyle = "#2f7d49";
  roundRect(ctx, 90, 90, 190, 42, 21);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("AI 延续学实验 002", 112, 119);

  ctx.fillStyle = "#18231f";
  ctx.font = "900 56px sans-serif";
  ctx.fillText("脑健康成分地图", 90, 205);

  ctx.fillStyle = "#64716b";
  ctx.font = "28px sans-serif";
  wrapText(ctx, "不是补充剂神话，而是一份脑健康饮食和生活方式复盘。", 90, 258, 700, 40);

  drawBrainIcon(ctx, 650, 145);
  drawMealBlock(ctx, state.meals);
  drawConcernBlock(ctx, state, concern, level);
  drawFoodBlock(ctx);

  ctx.fillStyle = "#64716b";
  ctx.font = "22px sans-serif";
  wrapText(ctx, "边界：只做健康信息整理，不声称预防痴呆，不推荐补充剂，不替代医生建议。", 90, 1010, 720, 30);
}

function drawMealBlock(ctx, meals) {
  ctx.fillStyle = "#f3f7f2";
  roundRect(ctx, 90, 345, 720, 165, 20);
  ctx.fill();

  ctx.fillStyle = "#18231f";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("每周菌菇餐次", 120, 395);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i < meals ? "#2f7d49" : "#d7e0d8";
    roundRect(ctx, 120 + i * 58, 420, 42, 58, 12);
    ctx.fill();
  }
  ctx.fillStyle = "#7a4d79";
  ctx.font = "900 46px sans-serif";
  ctx.fillText(`${meals} 次`, 630, 460);
}

function drawConcernBlock(ctx, state, concern, level) {
  ctx.fillStyle = "#fffaf0";
  roundRect(ctx, 90, 545, 720, 190, 20);
  ctx.fill();

  ctx.fillStyle = "#18231f";
  ctx.font = "900 32px sans-serif";
  ctx.fillText(`关注点：${concern.title}`, 120, 600);

  ctx.fillStyle = "#64716b";
  ctx.font = "700 24px sans-serif";
  ctx.fillText(`年龄段：${state.ageBand} · ${roleLabel(state.roleType)}`, 120, 640);

  ctx.fillStyle = "#315d8a";
  ctx.font = "800 28px sans-serif";
  ctx.fillText(level, 120, 685);

  ctx.fillStyle = "#18231f";
  ctx.font = "700 23px sans-serif";
  wrapText(ctx, concern.focus, 120, 720, 640, 34);
}

function drawFoodBlock(ctx) {
  const topFoods = ["香菇", "平菇", "杏鲍菇", "双孢蘑菇"];
  ctx.fillStyle = "#225f38";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("本周可以先看这些食物", 90, 800);
  topFoods.forEach((food, index) => {
    const x = 90 + (index % 2) * 320;
    const y = 840 + Math.floor(index / 2) * 68;
    ctx.fillStyle = index < 2 ? "#eef4ed" : "#f7f2e8";
    roundRect(ctx, x, y, 260, 46, 14);
    ctx.fill();
    ctx.fillStyle = "#18231f";
    ctx.font = "700 24px sans-serif";
    ctx.fillText(food, x + 24, y + 31);
  });
}

function drawBrainIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#eef4ed";
  roundRect(ctx, 0, 0, 150, 120, 38);
  ctx.fill();
  ctx.strokeStyle = "#2f7d49";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(52, 54, 28, 0, Math.PI * 2);
  ctx.arc(94, 54, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(74, 32);
  ctx.lineTo(74, 94);
  ctx.stroke();
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = Array.from(text);
  let line = "";
  for (const char of chars) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function copyShareText() {
  await navigator.clipboard.writeText(latestShareText);
  $("copyShareBtn").textContent = "已复制";
  setTimeout(() => {
    $("copyShareBtn").textContent = "复制分享文案";
  }, 1600);
}

async function copyOfferText() {
  const text = [
    "我想要「中年脑健康 AI 详细解读报告」。",
    "希望包含：一句话结论、优先级排序、7 天行动清单、麦角硫因食物来源表、给父母看的解释版。",
    "备注：我知道这不是医疗诊断，也不是补充剂推荐。"
  ].join("\n");
  await navigator.clipboard.writeText(text);
  $("copyOfferBtn").textContent = "下单说明已复制";
  setTimeout(() => {
    $("copyOfferBtn").textContent = "复制下单说明";
  }, 1600);
}

function downloadCard() {
  const link = document.createElement("a");
  link.download = "brain-nutrient-map.png";
  link.href = $("shareCanvas").toDataURL("image/png");
  link.click();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
