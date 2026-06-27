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

let activeFilter = "all";
let latestShareText = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  renderFoods();
  updateAll();

  $("brainForm").addEventListener("submit", (event) => {
    event.preventDefault();
    updateAll();
  });

  $("mushroomMeals").addEventListener("input", updateAll);
  for (const input of document.querySelectorAll("input")) {
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

  $("copyShareBtn").addEventListener("click", copyShareText);
  $("copyOfferBtn").addEventListener("click", copyOfferText);
  $("downloadCardBtn").addEventListener("click", downloadCard);
});

function getState() {
  const concern = document.querySelector("input[name='concern']:checked")?.value || "memory";
  const meals = Number($("mushroomMeals").value);
  const flags = Array.from(document.querySelectorAll(".check-list input:checked")).map((item) => item.value);
  return { concern, meals, flags };
}

function updateAll() {
  const state = getState();
  $("mushroomMealsOut").textContent = `${state.meals} 次`;
  const concern = concerns[state.concern];
  const level = state.meals >= 3 ? "饮食基础较好" : state.meals >= 1 ? "可以继续增加多样性" : "本周适合从 1 次菌菇开始";
  const flagText = buildFlagText(state.flags);

  $("resultTitle").textContent = concern.title;
  $("resultSummary").textContent = `${level}。${concern.focus}${flagText}`;
  $("actionList").innerHTML = concern.actions.map((item) => `<div class="action-item">${escapeHtml(item)}</div>`).join("");

  latestShareText = buildShareText(state, concern, level);
  drawCard(state, concern, level);
}

function buildFlagText(flags) {
  if (!flags.length) return "";
  const labels = {
    low_sleep: "睡眠不足",
    stress: "压力偏高",
    sugar: "代谢/血糖担心",
    parent_care: "父母健康照护"
  };
  return ` 你还勾选了：${flags.map((flag) => labels[flag]).join("、")}，建议把这些和饮食一起复盘。`;
}

function buildShareText(state, concern, level) {
  const mealsText = state.meals ? `我每周大概有 ${state.meals} 次菌菇类食物。` : "我几乎不吃菌菇类食物。";
  return [
    "我今天参加了 AI 延续学实验 002：脑健康成分地图。",
    `我的关注点：${concern.title}。`,
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
  roundRect(ctx, 90, 90, 180, 42, 21);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("AI 延续学实验 002", 112, 119);

  ctx.fillStyle = "#18231f";
  ctx.font = "900 56px sans-serif";
  ctx.fillText("脑健康成分地图", 90, 205);

  ctx.fillStyle = "#64716b";
  ctx.font = "28px sans-serif";
  wrapText(ctx, "麦角硫因不是神药。它只是最新脑健康代谢物研究里值得观察的一个饮食信号。", 90, 258, 700, 40);

  drawBrainIcon(ctx, 650, 150);
  drawMealBars(ctx, state.meals);

  ctx.fillStyle = "#18231f";
  ctx.font = "900 34px sans-serif";
  ctx.fillText(`关注点：${concern.title}`, 90, 520);

  ctx.fillStyle = "#315d8a";
  ctx.font = "800 30px sans-serif";
  ctx.fillText(level, 90, 572);

  ctx.fillStyle = "#18231f";
  ctx.font = "700 26px sans-serif";
  wrapText(ctx, concern.focus, 90, 628, 700, 38);

  const topFoods = ["香菇", "平菇", "杏鲍菇", "双孢蘑菇"];
  ctx.fillStyle = "#225f38";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("本周可以先看这些食物", 90, 790);
  topFoods.forEach((food, index) => {
    const x = 90 + (index % 2) * 320;
    const y = 830 + Math.floor(index / 2) * 70;
    ctx.fillStyle = index < 2 ? "#eef4ed" : "#f7f2e8";
    roundRect(ctx, x, y, 260, 46, 14);
    ctx.fill();
    ctx.fillStyle = "#18231f";
    ctx.font = "700 24px sans-serif";
    ctx.fillText(food, x + 24, y + 31);
  });

  ctx.fillStyle = "#64716b";
  ctx.font = "22px sans-serif";
  wrapText(ctx, "边界：只做健康信息整理，不声称预防痴呆，不推荐补充剂，不替代医生建议。", 90, 1010, 720, 30);
}

function drawMealBars(ctx, meals) {
  ctx.fillStyle = "#18231f";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("每周菌菇餐次", 90, 400);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i < meals ? "#2f7d49" : "#d7e0d8";
    roundRect(ctx, 90 + i * 62, 425, 46, 120 - i * 7, 14);
    ctx.fill();
  }
  ctx.fillStyle = "#7a4d79";
  ctx.font = "900 48px sans-serif";
  ctx.fillText(`${meals} 次`, 580, 470);
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
    "我想要「中年脑健康自查清单」资料包。",
    "希望包含：脑健康 7 个自查问题、麦角硫因食物来源表、研究边界说明、给父母看的解释版。",
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
