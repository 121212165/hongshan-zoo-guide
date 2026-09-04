// ============================================================
// 红山朋友 · 项目说明 PPTX 生成脚本
// 基于 pptxgenjs，匹配瑞士风 IKB 蓝主题
// ============================================================
const pptxgen = require("pptxgenjs");

// ============================================================
// SLIDE DIMENSIONS
// ============================================================
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "红山朋友团队";
pres.title = "红山朋友 · 陪逛 Agent · 项目说明";

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const CX = MARGIN;
const CY = MARGIN;
const CW = SLIDE_W - 2 * MARGIN; // 9
const CH = SLIDE_H - 2 * MARGIN; // 4.625

// ============================================================
// THEME COLORS (IKB 克莱因蓝)
// ============================================================
const C = {
  ink: "0A0A0A",
  paper: "FAFAF8",
  accent: "002FA7",
  accentOn: "FFFFFF",
  grey1: "F0F0EE",
  grey2: "D4D4D2",
  grey3: "737373",
  darkBg: "0A0A0A",
  accentBright: "5B7BFF",
};

// Fonts: serif for titles, sans-serif for body (per pptx skill rules)
const F_TITLE = "Georgia";
const F_BODY = "Calibri";

// ============================================================
// Helpers
// ============================================================
function addSlide(background) {
  const slide = pres.addSlide();
  if (background) slide.background = { color: background };
  return slide;
}

function stackY(startY, heights, gap) {
  const positions = [];
  let y = startY;
  for (const h of heights) {
    positions.push(y);
    y += h + gap;
  }
  return positions;
}

// ============================================================
// SLIDE 1: Cover
// ============================================================
(() => {
  const slide = addSlide(C.accent);

  // Decorative top bar
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SLIDE_W, h: 0.04, fill: { color: C.accentOn }, transparency: 20 });

  // Subtitle line
  slide.addText("HONGSHAN FRIEND · TOUR GUIDE AGENT", {
    x: CX, y: 1.2, w: CW, h: 0.4, fontSize: 11, fontFace: F_BODY,
    color: C.accentOn, charSpacing: 3, transparency: 30,
  });

  // Main title
  slide.addText("红山朋友\n陪逛 Agent", {
    x: CX, y: 1.8, w: CW, h: 1.6, fontSize: 40, fontFace: F_TITLE,
    color: C.accentOn, bold: true, charSpacing: 2.5, lineSpacingMultiple: 1.1,
  });

  // Description
  slide.addText("让每个人按自己的方式，逛出只属于自己的红山。", {
    x: CX, y: 3.5, w: CW * 0.7, h: 0.5, fontSize: 14, fontFace: F_BODY,
    color: C.accentOn, transparency: 20,
  });

  // Bottom info
  slide.addText("参赛演示作品 · 南京红山森林动物园", {
    x: CX, y: SLIDE_H - 0.6, w: 4, h: 0.3, fontSize: 10, fontFace: F_BODY,
    color: C.accentOn, transparency: 40,
  });
  slide.addText("SS · 26.07.20 · 01 / 11", {
    x: SLIDE_W - CX - 2.5, y: SLIDE_H - 0.6, w: 2.5, h: 0.3, fontSize: 10, fontFace: F_BODY,
    color: C.accentOn, transparency: 40, align: "right",
  });
})();

// ============================================================
// SLIDE 2: TOC - 四篇章
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("02 / 11 · 目录", {
    x: CX, y: CY, w: 3, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  // Left big number
  slide.addText("四", {
    x: CX, y: 1.2, w: 2.5, h: 2.5, fontSize: 72, fontFace: F_TITLE,
    color: C.accent, bold: true, charSpacing: 2.5, margin: 0,
  });
  slide.addText("个篇章", {
    x: CX + 2.5, y: 1.4, w: 2, h: 0.8, fontSize: 28, fontFace: F_TITLE,
    color: C.ink, bold: true, charSpacing: 1.5,
  });

  // Right section list
  const sections = [
    { num: "01", title: "问题与定位", desc: "600万游客背后的1000+沉睡故事" },
    { num: "02", title: "产品与功能", desc: "三幕旅程 × 六模块闭环" },
    { num: "03", title: "技术方案", desc: "六层栈 · 薄承载厚技能" },
    { num: "04", title: "工程化与评测", desc: "50题金标 · 门禁已通过" },
  ];

  const colW = CW * 0.55;
  const colX = SLIDE_W - MARGIN - colW;

  sections.forEach((s, i) => {
    const y = 1.0 + i * 0.85;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: colX, y, w: 0.04, h: 0.65, fill: { color: C.accent },
    });
    slide.addText(s.num, {
      x: colX + 0.2, y, w: 0.5, h: 0.65, fontSize: 18, fontFace: F_TITLE,
      color: C.accent, bold: true, valign: "middle", margin: 0,
    });
    slide.addText(s.title, {
      x: colX + 0.7, y, w: colW - 0.7, h: 0.4, fontSize: 16, fontFace: F_TITLE,
      color: C.ink, bold: true, margin: 0,
    });
    slide.addText(s.desc, {
      x: colX + 0.7, y: y + 0.35, w: colW - 0.7, h: 0.3, fontSize: 10, fontFace: F_BODY,
      color: C.grey3, margin: 0,
    });
  });

  // Footer
  slide.addText("RED MOUNTAIN FRIEND · 红山朋友", {
    x: CX, y: SLIDE_H - 0.5, w: 5, h: 0.25, fontSize: 9, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });
})();

// ============================================================
// SLIDE 3: 问题与定位 (KPI Tower)
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("03 / 11 · 问题与定位", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  slide.addText("为何需要一只陪逛 Agent？", {
    x: CX, y: 1.0, w: CW, h: 0.7, fontSize: 28, fontFace: F_TITLE,
    color: C.ink, bold: true, charSpacing: 1.5,
  });

  // Three KPI cards
  const kpis = [
    { num: "600万", unit: "人次/年", label: "年游客量", desc: "红山森林动物园年接待游客超600万，大量游客首次到访" },
    { num: "1000+", unit: "个", label: "沉睡故事", desc: "场馆内动物个体故事、饲养员知识无法被游客有效获取" },
    { num: "1v1", unit: "限定", label: "饲养员讲解", desc: "深度讲解仅限饲养员1v1导览，无法规模化覆盖所有游客" },
  ];

  const cardW = (CW - 0.6) / 3;
  kpis.forEach((k, i) => {
    const x = CX + i * (cardW + 0.3);
    const y = 2.0;

    // Accent top bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 0.04, fill: { color: i === 1 ? C.accent : C.grey2 },
    });

    // Big number
    slide.addText(k.num, {
      x, y: y + 0.2, w: cardW, h: 0.7, fontSize: 36, fontFace: F_TITLE,
      color: i === 1 ? C.accent : C.ink, bold: true, charSpacing: 1.5, margin: 0,
    });

    // Unit
    slide.addText(k.unit, {
      x: x + cardW * 0.65, y: y + 0.25, w: cardW * 0.35, h: 0.3, fontSize: 11, fontFace: F_BODY,
      color: C.grey3, margin: 0,
    });

    // Label
    slide.addText(k.label, {
      x, y: y + 1.0, w: cardW, h: 0.35, fontSize: 14, fontFace: F_TITLE,
      color: C.ink, bold: true, margin: 0,
    });

    // Description
    slide.addText(k.desc, {
      x, y: y + 1.4, w: cardW, h: 0.8, fontSize: 10, fontFace: F_BODY,
      color: C.grey3, lineSpacingMultiple: 1.3,
    });
  });
})();

// ============================================================
// SLIDE 4: 三幕痛点 (Dark)
// ============================================================
(() => {
  const slide = addSlide(C.darkBg);

  slide.addText("04 / 11 · 痛点洞察", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY,
    color: C.accentOn, transparency: 40, charSpacing: 2,
  });

  slide.addText("游前 · 游中 · 游后，每一幕都有隐性需求", {
    x: CX, y: 1.0, w: CW, h: 0.7, fontSize: 24, fontFace: F_TITLE,
    color: C.accentOn, bold: true, charSpacing: 1.5,
  });

  const acts = [
    { title: "游前", subtitle: "信息过载", items: ["攻略分散在20+平台", "路线规划耗时30-60分钟", "无法预知动物状态"] },
    { title: "游中", subtitle: "看不懂", items: ["动物不认识，故事听不到", "饲养员1v1名额秒空", "遇到'看不到'时无人解释"] },
    { title: "游后", subtitle: "体验断档", items: ["照片在相册里落灰", "知识碎片化无法沉淀", "与动物园的联结止于离开"] },
  ];

  const colW = (CW - 0.6) / 3;
  acts.forEach((act, i) => {
    const x = CX + i * (colW + 0.3);
    const y = 2.0;

    // Number circle
    slide.addShape(pres.shapes.OVAL, {
      x, y, w: 0.4, h: 0.4, fill: { color: C.accent },
    });
    slide.addText(`0${i + 1}`, {
      x, y, w: 0.4, h: 0.4, fontSize: 11, fontFace: F_BODY,
      color: C.accentOn, align: "center", valign: "middle", bold: true, margin: 0,
    });

    // Title
    slide.addText(act.title, {
      x: x + 0.55, y, w: colW - 0.55, h: 0.4, fontSize: 18, fontFace: F_TITLE,
      color: C.accentOn, bold: true, valign: "middle", margin: 0,
    });

    // Subtitle
    slide.addText(act.subtitle, {
      x, y: y + 0.55, w: colW, h: 0.35, fontSize: 13, fontFace: F_BODY,
      color: C.accentBright, margin: 0,
    });

    // Items
    slide.addText(
      act.items.map((item, j) => ({
        text: item,
        options: { bullet: true, breakLine: j < act.items.length - 1, fontSize: 10, color: C.accentOn, transparency: 30 },
      })),
      { x, y: y + 1.0, w: colW, h: 1.6, fontFace: F_BODY, lineSpacingMultiple: 1.4, valign: "top" }
    );
  });
})();

// ============================================================
// SLIDE 5: 产品定位
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("05 / 11 · 产品定位", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  // Left: definition
  slide.addText("PRODUCT", {
    x: CX, y: 1.0, w: 1.5, h: 0.3, fontSize: 10, fontFace: F_BODY, color: C.accent, bold: true, charSpacing: 2, margin: 0,
  });

  slide.addText("红山朋友", {
    x: CX, y: 1.35, w: 3.5, h: 0.5, fontSize: 24, fontFace: F_TITLE, color: C.accent, bold: true, charSpacing: 1.5, margin: 0,
  });

  slide.addText("把饲养员 1v1 的体验，规模化。", {
    x: CX, y: 2.0, w: 4, h: 0.6, fontSize: 20, fontFace: F_TITLE, color: C.ink, bold: true, charSpacing: 1,
  });

  slide.addText("一只随身、可信任、会预期管理的 AI 陪逛伙伴——游前为你编织行程，游中陪你认动物，游后替你沉淀手账。", {
    x: CX, y: 2.7, w: 4, h: 0.9, fontSize: 11, fontFace: F_BODY, color: C.grey3, lineSpacingMultiple: 1.4,
  });

  // Right: three acts
  const acts = [
    { tag: "ACT 01", title: "游前编织", desc: "基于兴趣/体力/时段动态生成专属路线" },
    { tag: "ACT 02", title: "游中陪逛", desc: "语音+图文多模态讲解，预期管理反转" },
    { tag: "ACT 03", title: "游后手账", desc: "自动生成'我的红山地图'长期资产" },
  ];

  const actsX = 5.2;
  const actsW = 4.3;
  acts.forEach((a, i) => {
    const y = 1.8 + i * 0.95;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: actsX, y, w: actsW, h: 0.04, fill: { color: C.accent },
    });
    slide.addText(a.tag, {
      x: actsX, y: y + 0.15, w: actsW, h: 0.25, fontSize: 9, fontFace: F_BODY, color: C.grey3, charSpacing: 2, margin: 0,
    });
    slide.addText(a.title, {
      x: actsX, y: y + 0.4, w: actsW, h: 0.35, fontSize: 16, fontFace: F_TITLE, color: C.ink, bold: true, margin: 0,
    });
    slide.addText(a.desc, {
      x: actsX, y: y + 0.7, w: actsW, h: 0.25, fontSize: 10, fontFace: F_BODY, color: C.grey3, margin: 0,
    });
  });
})();

// ============================================================
// SLIDE 6: 六大功能矩阵
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("06 / 11 · 六大功能模块", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  slide.addText("从内容活化到游后手账，六模块闭环。", {
    x: CX, y: 1.0, w: CW, h: 0.6, fontSize: 22, fontFace: F_TITLE, color: C.ink, bold: true, charSpacing: 1.5,
  });

  const modules = [
    { id: "M1", title: "内容活化", desc: "将动物档案+饲养员知识转化为可交互的个体故事卡" },
    { id: "M2", title: "行程编织", desc: "基于兴趣/体力/时段生成动态专属路线" },
    { id: "M3", title: "多模态讲解", desc: "语音+图文+视频多模态动物识别与讲解", accent: true },
    { id: "M4", title: "预期管理", desc: "直面'看不到'，用反转叙事替代失望" },
    { id: "M5", title: "动态调线", desc: "根据实时客流/动物活跃度调整推荐路线" },
    { id: "M6", title: "游后手账", desc: "自动生成个人红山地图+理念时刻相册" },
  ];

  const cardW = (CW - 0.3) / 3;
  const cardH = 1.3;
  modules.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = CX + col * (cardW + 0.15);
    const y = 1.9 + row * (cardH + 0.2);

    // Card background
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH, fill: { color: m.accent ? C.accent : C.grey1 },
    });

    // Module ID
    slide.addText(m.id, {
      x: x + 0.15, y: y + 0.15, w: 0.5, h: 0.3, fontSize: 10, fontFace: F_BODY,
      color: m.accent ? C.accentOn : C.accent, bold: true, margin: 0,
    });

    // Title
    slide.addText(m.title, {
      x: x + 0.15, y: y + 0.45, w: cardW - 0.3, h: 0.35, fontSize: 14, fontFace: F_TITLE,
      color: m.accent ? C.accentOn : C.ink, bold: true, margin: 0,
    });

    // Description
    slide.addText(m.desc, {
      x: x + 0.15, y: y + 0.8, w: cardW - 0.3, h: 0.4, fontSize: 9, fontFace: F_BODY,
      color: m.accent ? C.accentOn : C.grey3, margin: 0, transparency: m.accent ? 15 : 0,
    });
  });
})();

// ============================================================
// SLIDE 7: 灵魂亮点（预期管理反转）
// ============================================================
(() => {
  const slide = addSlide(C.accent);

  slide.addText("07 / 11 · 灵魂亮点", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY,
    color: C.accentOn, transparency: 40, charSpacing: 2,
  });

  // Big statement
  slide.addText("看不到，也是一种看见。", {
    x: CX, y: 1.4, w: CW, h: 1.2, fontSize: 36, fontFace: F_TITLE,
    color: C.accentOn, bold: true, charSpacing: 2.5, lineSpacingMultiple: 1.1,
  });

  // Explanation
  slide.addText("当杜杜在树上睡觉、茉莉在抱树休息、老马已离世——「看不到」恰恰是红山最骄傲的事：在这里，动物有不营业的权利。", {
    x: CX, y: 2.7, w: CW * 0.7, h: 0.6, fontSize: 12, fontFace: F_BODY,
    color: C.accentOn, transparency: 20, lineSpacingMultiple: 1.4,
  });

  // Three-step approach
  const steps = [
    { num: "01", text: "先承认事实——「它此刻大概率在树冠高处背对着大家睡觉」" },
    { num: "02", text: "再提供理念——「看不到它，恰恰是红山最骄傲的事」" },
    { num: "03", text: "最后给替代——「明早 9:30–10:30 它最活跃；或去东侧观察窗」" },
  ];

  steps.forEach((s, i) => {
    const y = 3.5 + i * 0.5;
    slide.addShape(pres.shapes.OVAL, {
      x: CX, y, w: 0.3, h: 0.3, fill: { color: C.accentOn }, transparency: 20,
    });
    slide.addText(s.num, {
      x: CX, y, w: 0.3, h: 0.3, fontSize: 9, fontFace: F_BODY,
      color: C.accent, align: "center", valign: "middle", bold: true, margin: 0,
    });
    slide.addText(s.text, {
      x: CX + 0.45, y, w: CW - 0.45, h: 0.3, fontSize: 11, fontFace: F_BODY,
      color: C.accentOn, transparency: 15, valign: "middle", margin: 0,
    });
  });
})();

// ============================================================
// SLIDE 8: 六层技术栈
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("08 / 11 · 技术架构", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  slide.addText("六层栈，薄承载厚技能。", {
    x: CX, y: 1.0, w: CW, h: 0.55, fontSize: 22, fontFace: F_TITLE, color: C.ink, bold: true, charSpacing: 1.5,
  });

  const layers = [
    { id: "L6", name: "合规伦理", desc: "安全护栏+立场声明+边界诚实拒绝", color: "1A3A7A" },
    { id: "L5", name: "数据知识", desc: "动物档案+场馆图谱+知识库RAG", color: "002FA7" },
    { id: "L4", name: "模型组合", desc: "Qwen3-Max·Qwen-Long·Qwen-VL·FunASR·CosyVoice·BGE-M3", color: "1A5AB0" },
    { id: "L3", name: "Agent编排", desc: "确定性路由+LLM网关+降级链", color: "3A7AD0" },
    { id: "L2", name: "三幕应用", desc: "游前编织/游中陪逛/游后手账", color: "5A9AF0" },
    { id: "L1", name: "交互层", desc: "语音+图文+多模态Web前端", color: "8AB8FF" },
  ];

  const nodeW = 1.5;
  const nodeH = 0.65;
  const gap = 0.1;
  const totalW = nodeW;
  const startX = (SLIDE_W - totalW) / 2;
  const startY = 1.75;

  layers.forEach((layer, i) => {
    const y = startY + i * (nodeH + gap);

    // Layer block
    slide.addShape(pres.shapes.RECTANGLE, {
      x: startX, y, w: nodeW, h: nodeH, fill: { color: layer.color },
    });

    // Layer ID
    slide.addText(layer.id, {
      x: startX + 0.08, y, w: 0.4, h: nodeH, fontSize: 9, fontFace: F_BODY,
      color: C.accentOn, valign: "middle", margin: 0, transparency: 20,
    });

    // Layer name
    slide.addText(layer.name, {
      x: startX + 0.45, y, w: nodeW - 0.5, h: nodeH, fontSize: 12, fontFace: F_TITLE,
      color: C.accentOn, bold: true, valign: "middle", margin: 0,
    });

    // Description on the right
    slide.addText(layer.desc, {
      x: startX + nodeW + 0.3, y, w: CW - nodeW - 0.3, h: nodeH, fontSize: 10, fontFace: F_BODY,
      color: C.grey3, valign: "middle", margin: 0,
    });

    // Connector line
    if (i < layers.length - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: startX + nodeW / 2, y: y + nodeH, w: 0, h: gap,
        line: { color: C.grey2, width: 1 },
      });
    }
  });
})();

// ============================================================
// SLIDE 9: 工程化 Timeline
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  slide.addText("09 / 11 · 工程化质量保障", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  slide.addText("从网关到日历，五站质量门禁。", {
    x: CX, y: 1.0, w: CW, h: 0.55, fontSize: 22, fontFace: F_TITLE, color: C.ink, bold: true, charSpacing: 1.5,
  });

  const steps = [
    { label: "Gateway", title: "LLM 网关", desc: "统一入口+降级链\nMax→Plus→模板" },
    { label: "Benchmark", title: "金标50题", desc: "覆盖6大场景\n确定性路由验证" },
    { label: "Scoring", title: "三维评分卡", desc: "准确性+安全性+立场\n句级否定感知Judge" },
    { label: "CI", title: "CI三档门禁", desc: "P0硬阻断/P1告警/P2\n监控，自动化拦截" },
    { label: "Calendar", title: "质量日历", desc: "每日基线巡检\n周度回归报告" },
  ];

  const nodeW = 1.5;
  const hGap = 0.3;
  const totalW = steps.length * nodeW + (steps.length - 1) * hGap;
  const startX = (SLIDE_W - totalW) / 2;
  const nodeY = 2.2;

  // Timeline line
  slide.addShape(pres.shapes.LINE, {
    x: startX + nodeW / 2, y: nodeY + 0.5, w: totalW - nodeW, h: 0,
    line: { color: C.accent, width: 2 },
  });

  steps.forEach((s, i) => {
    const x = startX + i * (nodeW + hGap);

    // Dot
    slide.addShape(pres.shapes.OVAL, {
      x: x + nodeW / 2 - 0.08, y: nodeY + 0.42, w: 0.16, h: 0.16, fill: { color: C.accent },
    });

    // Title
    slide.addText(s.title, {
      x, y: nodeY + 0.7, w: nodeW, h: 0.35, fontSize: 12, fontFace: F_TITLE,
      color: C.ink, bold: true, align: "center", margin: 0,
    });

    // Description
    slide.addText(s.desc, {
      x, y: nodeY + 1.1, w: nodeW, h: 0.7, fontSize: 9, fontFace: F_BODY,
      color: C.grey3, align: "center", lineSpacingMultiple: 1.3,
    });

    // Label below dot
    slide.addText(s.label, {
      x, y: nodeY - 0.35, w: nodeW, h: 0.3, fontSize: 8, fontFace: F_BODY,
      color: C.accent, align: "center", bold: true, charSpacing: 1.5, margin: 0,
    });
  });
})();

// ============================================================
// SLIDE 10: 评测结果 (Dark)
// ============================================================
(() => {
  const slide = addSlide(C.darkBg);

  slide.addText("10 / 11 · 评测结果", {
    x: CX, y: CY, w: 4, h: 0.35, fontSize: 10, fontFace: F_BODY,
    color: C.accentOn, transparency: 40, charSpacing: 2,
  });

  slide.addText("50 题金标 · 门禁已通过。", {
    x: CX, y: 1.0, w: CW, h: 0.7, fontSize: 26, fontFace: F_TITLE,
    color: C.accentOn, bold: true, charSpacing: 1.5,
  });

  slide.addText("CURRENT STATE", {
    x: CX, y: 1.7, w: CW, h: 0.25, fontSize: 9, fontFace: F_BODY,
    color: C.accent, bold: true, charSpacing: 2, margin: 0,
  });

  const metrics = [
    { num: "1.93", unit: "/3.0", label: "平均分", desc: "50题三维评分加权平均" },
    { num: "0%", unit: "", label: "0分率", desc: "无任何维度得0分的用例" },
    { num: "0", unit: "例", label: "立场0分", desc: "立场维度无违规，边界安全" },
    { num: "100%", unit: "", label: "引用覆盖", desc: "所有回答均引用知识库" },
  ];

  const colW = (CW - 0.45) / 4;
  metrics.forEach((m, i) => {
    const x = CX + i * (colW + 0.15);
    const y = 2.3;

    // Big number
    slide.addText(m.num, {
      x, y, w: colW, h: 0.9, fontSize: 36, fontFace: F_TITLE,
      color: i === 3 ? C.accentBright : C.accentOn, bold: true, charSpacing: 1.5, margin: 0,
    });
    if (m.unit) {
      slide.addText(m.unit, {
        x: x + colW * 0.55, y: y + 0.15, w: colW * 0.45, h: 0.3, fontSize: 10, fontFace: F_BODY,
        color: C.accentOn, transparency: 40, margin: 0,
      });
    }

    // Label
    slide.addText(m.label, {
      x, y: y + 1.0, w: colW, h: 0.3, fontSize: 13, fontFace: F_TITLE,
      color: C.accentOn, bold: true, margin: 0,
    });

    // Description
    slide.addText(m.desc, {
      x, y: y + 1.35, w: colW, h: 0.4, fontSize: 9, fontFace: F_BODY,
      color: C.accentOn, transparency: 35, margin: 0,
    });
  });
})();

// ============================================================
// SLIDE 11: Closing
// ============================================================
(() => {
  const slide = addSlide(C.paper);

  // Left accent column
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SLIDE_W * 0.45, h: SLIDE_H, fill: { color: C.accent },
  });

  // Three closing statements on the left
  const statements = [
    "把红山沉睡故事\n变成个体档案。",
    "让失望时刻\n反转为理念时刻。",
    "这套 pipeline\n送给全国中小动物园。",
  ];

  statements.forEach((s, i) => {
    const y = 1.0 + i * 1.4;
    slide.addText(s, {
      x: 0.3, y, w: SLIDE_W * 0.45 - 0.6, h: 1.1, fontSize: 18, fontFace: F_TITLE,
      color: C.accentOn, bold: true, charSpacing: 1, lineSpacingMultiple: 1.2,
    });
  });

  // Right side: takeaway list
  slide.addText("11 / 11 · 展望", {
    x: SLIDE_W * 0.45 + 0.3, y: CY, w: 3, h: 0.35, fontSize: 10, fontFace: F_BODY, color: C.grey3, charSpacing: 2,
  });

  slide.addText("下一步", {
    x: SLIDE_W * 0.45 + 0.3, y: 1.2, w: SLIDE_W * 0.5 - 0.6, h: 0.5, fontSize: 22, fontFace: F_TITLE,
    color: C.ink, bold: true, charSpacing: 1.5,
  });

  const takeaways = [
    { num: "01", title: "千园计划 · pipeline 开源", desc: "将质量工程pipeline适配到全国中小动物园，降低AI导览接入门槛" },
    { num: "02", title: "多模态升级", desc: "接入实时视频流分析，实现动物行为识别与自动讲解" },
    { num: "03", title: "社区共建数据层", desc: "开放动物档案编辑平台，让饲养员与游客共同丰富知识库" },
  ];

  takeaways.forEach((t, i) => {
    const y = 2.0 + i * 1.0;
    slide.addText(t.num, {
      x: SLIDE_W * 0.45 + 0.3, y, w: 0.4, h: 0.35, fontSize: 14, fontFace: F_TITLE,
      color: C.accent, bold: true, margin: 0,
    });
    slide.addText(t.title, {
      x: SLIDE_W * 0.45 + 0.8, y, w: SLIDE_W * 0.45, h: 0.35, fontSize: 14, fontFace: F_TITLE,
      color: C.ink, bold: true, margin: 0,
    });
    slide.addText(t.desc, {
      x: SLIDE_W * 0.45 + 0.8, y: y + 0.35, w: SLIDE_W * 0.45, h: 0.4, fontSize: 10, fontFace: F_BODY,
      color: C.grey3, margin: 0, lineSpacingMultiple: 1.3,
    });
  });
})();

// ============================================================
// OUTPUT
// ============================================================
const outputPath = "c:\\Users\\lenovo\\Desktop\\Kimi_Agent_红山导览方案\\.trae\\documents\\红山朋友项目说明PPT.pptx";
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log("PPTX generated: " + outputPath);
}).catch(err => {
  console.error("Error: " + err.message);
  process.exit(1);
});