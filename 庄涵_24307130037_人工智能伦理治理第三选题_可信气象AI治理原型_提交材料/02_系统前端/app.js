const channelMetrics = [
  {
    channel: "CH09",
    name: "高层水汽",
    meaning: "5.80-6.70 μm, 反映高层湿度、上层云和水汽输送背景。",
    mae: 1.22,
    rmse: 1.98,
    r2: 0.950,
    baseRisk: 8,
    risk: "low"
  },
  {
    channel: "CH10",
    name: "中层水汽",
    meaning: "6.75-7.15 μm, 反映中层湿度结构和云系发展环境。",
    mae: 1.48,
    rmse: 2.41,
    r2: 0.948,
    baseRisk: 12,
    risk: "low"
  },
  {
    channel: "CH12",
    name: "长波红外",
    meaning: "8.3-8.8 μm, 对云、薄云和部分水汽/发射率敏感。",
    mae: 3.30,
    rmse: 5.27,
    r2: 0.939,
    baseRisk: 32,
    risk: "high"
  },
  {
    channel: "CH13",
    name: "红外窗口",
    meaning: "10.30-11.30 μm, 有云时反映云顶亮温, 晴空下接近地表或海表亮温。",
    mae: 3.44,
    rmse: 5.35,
    r2: 0.943,
    baseRisk: 34,
    risk: "high"
  }
];

const blackboxRows = [
  {
    problem: "内部表征不可直接解释",
    risk: "使用者不知道模型为什么给出某个亮温预测, 容易把输出当作确定事实。",
    response: "显示模型卡、通道物理意义、训练数据范围和关键误差图, 让黑盒输出具备外部透明性。"
  },
  {
    problem: "平均指标遮蔽局部错误",
    risk: "总体 R2 较高可能掩盖冷云顶、云边界和窗口通道的大误差。",
    response: "按通道、亮温区间和空间区域展示误差, 将高风险区域单独标注。"
  },
  {
    problem: "模型置信被误读",
    risk: "预测图看起来平滑完整, 但不等于可靠或可用于预警。",
    response: "加入风险计算器和治理动作, 明确高风险结果必须人工复核。"
  },
  {
    problem: "责任链不清",
    risk: "模型出错后难以判断是数据、模型、使用场景还是人工流程问题。",
    response: "记录输入时间、模型版本、风险阈值、复核结论和使用目的。"
  }
];

const safetyScenarios = [
  {
    title: "漏报强对流冷云顶",
    level: "critical",
    consequence: "低亮温区域被预测偏暖, 可能削弱对深对流发展或强降水风险的关注。",
    safety: "可能影响户外活动、交通调度和应急准备, 具有间接人身安全风险。",
    control: "220 K 以下区域强制高风险标注, 结合雷达、地面观测和人工经验复核。",
    severity: "高",
    likelihood: "中"
  },
  {
    title: "误报高风险云区",
    level: "high",
    consequence: "模型把普通云系误判为快速发展区域, 可能造成过度响应。",
    safety: "可能导致资源误配、公众疲劳和对后续预警的不信任。",
    control: "将模型输出定位为辅助证据, 需要多源资料交叉验证。",
    severity: "中",
    likelihood: "中"
  },
  {
    title: "自动化偏见",
    level: "critical",
    consequence: "使用者过度依赖模型图像, 忽略业务经验和异常天气背景。",
    safety: "在灾害天气中可能延误人工判断, 放大模型局部错误的后果。",
    control: "禁止模型单独触发预警, 所有高风险结果必须记录人工复核。",
    severity: "高",
    likelihood: "中"
  },
  {
    title: "训练分布外使用",
    level: "high",
    consequence: "把两天样本训练得到的模型用于不同季节、不同区域或极端过程。",
    safety: "模型泛化不足时, 可能给出看似合理但实际偏差较大的结果。",
    control: "跨季节、跨区域和极端天气应用需要重新验证或标注不可用。",
    severity: "高",
    likelihood: "中"
  }
];

const workflowSteps = [
  ["1. 数据进入", "记录 FY4B-AGRI 数据来源、时间、通道和质量控制结果。"],
  ["2. 模型预测", "CNN-Transformer 输出下一时次亮温预测和已有误差证据。"],
  ["3. 风险分级", "根据通道、亮温、云边界、数据质量和使用场景计算风险。"],
  ["4. 复核门禁", "中高风险结果进入人工复核, 高风险禁止自动预警。"],
  ["5. 审计留痕", "保存模型版本、输入条件、风险等级、复核意见和外部反馈。"]
];

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function riskText(level) {
  return {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    critical: "极高风险"
  }[level];
}

function riskClass(score) {
  if (score >= 78) return "critical";
  if (score >= 55) return "high";
  if (score >= 32) return "medium";
  return "low";
}

function renderMetrics() {
  const grid = $("#metricGrid");
  grid.innerHTML = channelMetrics.map((item) => `
    <article class="metric-card ${item.risk}">
      <div class="metric-head">
        <h3>${item.channel} ${item.name}</h3>
        <span class="risk-pill ${item.risk}">${riskText(item.risk)}</span>
      </div>
      <p>${item.meaning}</p>
      <dl class="metric-stats">
        <div><dt>MAE</dt><dd>${item.mae.toFixed(2)} K</dd></div>
        <div><dt>RMSE</dt><dd>${item.rmse.toFixed(2)} K</dd></div>
        <div><dt>R2</dt><dd>${item.r2.toFixed(3)}</dd></div>
      </dl>
    </article>
  `).join("");
}

function renderBlackboxRows() {
  $("#blackboxRows").innerHTML = blackboxRows.map((row) => `
    <tr>
      <td>${row.problem}</td>
      <td>${row.risk}</td>
      <td>${row.response}</td>
    </tr>
  `).join("");
}

function renderScenarios() {
  $("#scenarioGrid").innerHTML = safetyScenarios.map((item) => `
    <article class="scenario-card ${item.level}">
      <div class="scenario-head">
        <h3>${item.title}</h3>
        <span class="risk-pill ${item.level}">${riskText(item.level)}</span>
      </div>
      <p><strong>错误后果:</strong> ${item.consequence}</p>
      <p><strong>安全影响:</strong> ${item.safety}</p>
      <p><strong>治理控制:</strong> ${item.control}</p>
      <div class="scenario-meta">
        <div><strong>严重性</strong><br>${item.severity}</div>
        <div><strong>可能性</strong><br>${item.likelihood}</div>
      </div>
    </article>
  `).join("");
}

function renderWorkflow() {
  $("#workflow").innerHTML = workflowSteps.map(([title, text]) => `
    <article class="workflow-step">
      <strong>${title}</strong>
      <p>${text}</p>
    </article>
  `).join("");
}

function selectedRadio(name) {
  const item = document.querySelector(`input[name="${name}"]:checked`);
  return item ? item.value : "";
}

function updateRisk() {
  const channel = $("#channelSelect").value;
  const metric = channelMetrics.find((item) => item.channel === channel);
  const bt = Number($("#brightnessTemp").value);
  const gradient = selectedRadio("gradient");
  const context = selectedRadio("context");
  const ood = $("#oodToggle").checked;
  const quality = $("#qualityToggle").checked;

  let score = metric.baseRisk;
  const reasons = [`${channel} 基础风险 ${metric.baseRisk}, RMSE=${metric.rmse.toFixed(2)} K。`];

  if (bt < 200) {
    score += 30;
    reasons.push("目标区最低亮温低于 200 K, 可能对应深对流冷云顶。");
  } else if (bt < 220) {
    score += 22;
    reasons.push("目标区最低亮温低于 220 K, 属于低亮温高不确定区间。");
  } else if (bt < 240) {
    score += 10;
    reasons.push("目标区处于偏低亮温区间, 需要关注云顶变化。");
  }

  if (gradient === "edge") {
    score += 14;
    reasons.push("云边界和强梯度区域容易被模型平滑。");
  }
  if (gradient === "rapid") {
    score += 22;
    reasons.push("快速发展云系具有更强时变性, 预测误差可能放大。");
  }

  if (context === "assist") {
    score += 8;
    reasons.push("业务辅助场景需要更严格的交叉验证。");
  }
  if (context === "warning") {
    score += 24;
    reasons.push("预警研判涉及公共安全, 必须提升治理等级。");
  }

  if (ood) {
    score += 18;
    reasons.push("当前输入可能超出训练数据覆盖范围。");
  }
  if (quality) {
    score += 20;
    reasons.push("输入数据质量问题会削弱预测可信度。");
  }

  score = Math.min(100, score);
  const level = riskClass(score);
  const actions = governanceActions(level, context);

  $("#btValue").textContent = `${bt} K`;
  const scoreBox = $("#riskScore");
  scoreBox.textContent = score;
  scoreBox.className = `risk-score ${level}`;
  $("#riskLevel").textContent = riskText(level);
  $("#riskSummary").textContent = reasons.join(" ");
  $("#riskActions").innerHTML = actions.map((action) => `<li>${action}</li>`).join("");
  $("#auditText").textContent = `通道=${channel}; 最低亮温=${bt}K; 空间结构=${gradient}; 场景=${context}; 训练分布外=${ood ? "是" : "否"}; 数据质量异常=${quality ? "是" : "否"}; 风险分数=${score}; 风险等级=${riskText(level)}。`;
}

function governanceActions(level, context) {
  const base = ["保留模型版本、数据时间、通道和阈值规则。"];
  if (level === "low") {
    return base.concat(["可作为短时趋势参考, 仍需与实况图像对照。"]);
  }
  if (level === "medium") {
    return base.concat([
      "需要查看误差图和亮温分箱误差, 不得只看预测图。",
      "建议引入 persistence baseline 或其他观测资料交叉验证。"
    ]);
  }
  if (level === "high") {
    return base.concat([
      "必须由人工复核后才能进入业务讨论。",
      "需要结合雷达、地面观测、数值预报或相邻时次云图。",
      context === "warning" ? "不得由模型单独形成预警结论。" : "不得把结果表述为确定性结论。"
    ]);
  }
  return base.concat([
    "暂不建议用于决策, 应标注为极高风险输出。",
    "必须进行人工复核和多源资料核验。",
    "禁止模型自动触发灾害预警、停课停工或应急响应建议。"
  ]);
}

function resetRisk() {
  $("#channelSelect").value = "CH09";
  $("#brightnessTemp").value = "210";
  document.querySelector('input[name="gradient"][value="smooth"]').checked = true;
  document.querySelector('input[name="context"][value="research"]').checked = true;
  $("#oodToggle").checked = false;
  $("#qualityToggle").checked = false;
  updateRisk();
}

function setupTabs() {
  $all(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const viewId = tab.dataset.view;
      $all(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      $all(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    });
  });
}

function setupRiskEvents() {
  ["change", "input"].forEach((eventName) => {
    $("#riskForm").addEventListener(eventName, updateRisk);
  });
  $("#resetRisk").addEventListener("click", resetRisk);
}

function init() {
  setupTabs();
  renderMetrics();
  renderBlackboxRows();
  renderScenarios();
  renderWorkflow();
  setupRiskEvents();
  updateRisk();
}

init();
