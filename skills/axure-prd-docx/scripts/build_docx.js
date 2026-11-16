#!/usr/bin/env node
/**
 * build_docx.js — 读取内容模型（docspec）+ 原型备注（notes.json）+ 原型截图目录 + 需求拆解表（xlsx.json），
 * 渲染为 DOCX 需求文档。只负责渲染，不内置任何项目文案。
 *
 * 用法：
 *   node scripts/build_docx.js --spec assets/docspec.paxc.json \
 *     --notes out/notes.json --shots out/shots --xlsx out/xlsx.json \
 *     --images <原型目录>/images --out out/需求文档.docx [--modules <node_modules>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- CLI ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[k] = next; i++; }
    else out[k] = true;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const SKILL_DIR = path.join(__dirname, '..');

function fail(msg) {
  console.error('[build_docx] ' + msg);
  process.exit(1);
}
function need(name, desc) {
  if (!args[name] || args[name] === true) fail('缺少参数 --' + name + '（' + desc + '）');
  return String(args[name]);
}

const SPEC_PATH = need('spec', '内容模型 docspec.json');
const NOTES_PATH = need('notes', 'capture.js 输出的 notes.json');
const SHOTS_DIR = need('shots', '原型截图表目录');
const OUT_PATH = need('out', '输出 docx 路径');
const XLSX_PATH = args.xlsx && args.xlsx !== true ? String(args.xlsx) : '';
const IMAGES_DIR = args.images && args.images !== true ? String(args.images) : '';

// ---------- 依赖解析 ----------
// 顺序：--modules → PRD_NODE_MODULES → skill 内 node_modules → cwd/node_modules → 常见共享目录
const COMMON_MODULE_DIRS = [
  path.join(SKILL_DIR, 'vendor', 'modules'),
  path.join(os.homedir(), 'node_modules')
];
function resolveModules(explicit) {
  const cands = [];
  if (explicit) cands.push(explicit);
  if (process.env.PRD_NODE_MODULES) cands.push(process.env.PRD_NODE_MODULES);
  cands.push(path.join(SKILL_DIR, 'vendor', 'modules'));
  cands.push(path.join(SKILL_DIR, 'node_modules'));
  cands.push(path.join(process.cwd(), 'node_modules'));
  cands.push(...COMMON_MODULE_DIRS);
  for (const c of cands) {
    if (!c) continue;
    try { if (fs.existsSync(path.join(c, 'docx', 'package.json'))) return c; } catch (e) { /* ignore */ }
  }
  console.error('[build_docx] 未找到依赖 docx。已尝试以下目录：');
  for (const c of cands) console.error('  - ' + c);
  console.error('请在 skill 目录执行：npm install');
  console.error('或用 --modules <node_modules 目录> / 环境变量 PRD_NODE_MODULES 指定已有依赖。');
  process.exit(2);
}
const MODULES_DIR = resolveModules(args.modules && args.modules !== true ? String(args.modules) : '');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow,
  TableCell, WidthType, ImageRun, TableOfContents, PageBreak, BorderStyle, ShadingType,
  VerticalAlign
} = require(path.join(MODULES_DIR, 'docx'));

// ---------- 输入加载 ----------
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
const notes = JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
const xlsx = XLSX_PATH ? JSON.parse(fs.readFileSync(XLSX_PATH, 'utf8')) : {};
const layout = spec.layout || {};
const FONT = layout.font || '微软雅黑';
const H_FONT = FONT;
const MAXW = layout.imageMaxWidth || 585;
const MAXH = layout.imageMaxHeight || 900;
const CN = { size: layout.bodySize || 21 };
const KV_W = layout.kvWidths || [18, 82];

// ---------- 图片 ----------
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
function sanitize(s) { return String(s).replace(/[^\w\u4e00-\u9fa5\-\.]/g, '_'); }
function imgFiles(key) {
  const s = sanitize(key);
  const slices = [];
  for (let i = 1; i <= 20; i++) {
    const f = path.join(SHOTS_DIR, s + '_p' + i + '.png');
    if (fs.existsSync(f)) slices.push(f);
  }
  if (slices.length) return slices;
  const f = path.join(SHOTS_DIR, s + '.png');
  return fs.existsSync(f) ? [f] : [];
}

let statImages = 0, statKv = 0, statItems = 0;

// ---------- 备注解析 ----------
function norm(s) {
  return String(s).replace(/^[\u2705\u26A0\u2714\uFE0F\u200D]+\s*/, '')
    .replace(/[\uFE0F\u200D]/g, '').trim();
}
// 把 Axure 备注面板文本解析成 { desc, sections }。
// 结构约定：功能描述 → 若干「规则项 + 内容」段落（规则项由下一行以 交互逻辑/交互说明 开头，或本身是
// 交互说明 / 异常处理 / 异常情况 / 交互逻辑说明 等标签识别）
function parseNotes(text) {
  const out = { desc: [], sections: [] };
  if (!text) return out;
  const blocks = String(text).split(/\n\n+/).map(s => s.replace(/\r/g, '').trim()).filter(Boolean);
  const flat = [];
  for (const b of blocks) for (const l of b.split('\n').map(norm)) if (l) flat.push(l);
  const clean = flat.filter(t => !['功能', '说明', '变更记录'].includes(t));
  const MU = j => clean[j] !== undefined && /^(交互逻辑|交互规则)/.test(clean[j]);
  const LBL = ['交互说明', '异常处理', '异常情况', '交互逻辑说明'];
  const isSec = j => (clean[j + 1] !== undefined && MU(j + 1)) || LBL.includes(clean[j]);
  let start = clean.indexOf('功能描述');
  start = start >= 0 ? start + 1 : 0;
  let firstSec = -1;
  for (let j = start; j < clean.length; j++) { if (isSec(j)) { firstSec = j; break; } }
  out.desc = clean.slice(start, firstSec < 0 ? clean.length : firstSec);
  let i = firstSec;
  while (i >= 0 && i < clean.length) {
    if (MU(i)) { i++; continue; }
    const title = clean[i];
    let j = i + 1;
    const lines = [];
    while (j < clean.length && !isSec(j)) { lines.push(clean[j]); j++; }
    out.sections.push({ title, lines });
    i = j;
  }
  return out;
}

// ---------- 排版辅助 ----------
function txt(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: CN.size, ...opts });
}
function para(text, opts = {}) {
  return new Paragraph({ children: [txt(text)], spacing: { after: 120, line: 300 }, ...opts });
}
function bullet(text) {
  return new Paragraph({ children: [txt(text, { size: 20 })], bullet: { level: 0 }, spacing: { after: 60, line: 280 } });
}
function h(text, level) { return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } }); }
function label(text) { return new Paragraph({ children: [txt(text, { bold: true, size: 20 })], spacing: { before: 120, after: 60 } }); }
function fullBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}
function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.w || 100, type: WidthType.PERCENTAGE },
    shading: opts.head ? { type: ShadingType.CLEAR, fill: 'D9E2F3' } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: [txt(String(text == null ? '' : text), { size: 19, bold: !!opts.head })], spacing: { after: 0, line: 260 } })]
  });
}
function table(headers, rows, widths) {
  const trows = [new TableRow({ tableHeader: true, children: headers.map((h0, i) => cell(h0, { head: true, w: widths ? widths[i] : undefined })) })];
  rows.forEach(r => trows.push(new TableRow({ children: r.map((c, i) => cell(c, { w: widths ? widths[i] : undefined })) })));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: fullBorders(), rows: trows });
}
// 多行内容单元格
function cellLines(lines, opts = {}) {
  const arr = (Array.isArray(lines) ? lines : [lines]).filter(x => x != null && String(x).trim().length);
  const ps = (arr.length ? arr : ['']).map((l, i) => new Paragraph({
    children: [txt(String(l), { size: 19, bold: !!opts.bold })],
    spacing: { after: i < arr.length - 1 ? 40 : 0, line: 260 }
  }));
  return new TableCell({
    width: { size: opts.w || 100, type: WidthType.PERCENTAGE },
    shading: opts.head ? { type: ShadingType.CLEAR, fill: 'D9E2F3' } : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: ps
  });
}
// 需求说明表格：左列规则项，右列说明内容
function kvTable(rows, widths) {
  const w0 = (widths && widths[0]) || KV_W[0], w1 = (widths && widths[1]) || KV_W[1];
  const trows = [new TableRow({ tableHeader: true, children: [cellLines('规则', { head: true, w: w0 }), cellLines('说明', { head: true, w: w1 })] })];
  rows.forEach(r => trows.push(new TableRow({ children: [cellLines(r[0], { w: w0 }), cellLines(r[1], { w: w1 })] })));
  statKv++;
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: fullBorders(), rows: trows });
}
function image(file, capText) {
  if (!file || !fs.existsSync(file)) {
    console.warn('[build_docx] 图片不存在，已跳过：' + file);
    return [];
  }
  const buf = fs.readFileSync(file);
  const { w, h } = pngSize(buf);
  if (w < 60) { console.warn('[build_docx] 图片过窄，已跳过：' + file); return []; }
  const scale = Math.min(MAXW / w, MAXH / h);
  const iw = Math.round(w * scale), ih = Math.round(h * scale);
  statImages++;
  const arr = [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: iw, height: ih } })]
  })];
  if (capText) arr.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [txt(capText, { size: 18, color: '595959' })] }));
  return arr;
}
function resolveImage(src) {
  if (!src) return '';
  if (path.isAbsolute(src)) return fs.existsSync(src) ? src : '';
  if (!IMAGES_DIR) { console.warn('[build_docx] 未提供 --images，跳过图片：' + src); return ''; }
  return path.join(IMAGES_DIR, src);
}

// ---------- 需求列表 ----------
function reqRows(block) {
  const sheetName = block.sheet;
  const sheet = xlsx[sheetName];
  if (!sheet) {
    console.warn('[build_docx] xlsx.json 中不存在工作表「' + sheetName + '」，需求列表为空');
    return [];
  }
  const cols = block.columns || { module: 1, point: 2, desc: 4, version: 5 };
  const filter = block.filter || null;
  const rows = [];
  let idx = 0;
  const rNums = Object.keys(sheet).map(Number).sort((a, b) => a - b);
  for (const r of rNums) {
    const c = sheet[String(r)] || sheet[r];
    if (!c) continue;
    if (filter && !filter.values.includes(c[filter.column])) continue;
    idx++;
    const ver = (cols.version != null && c[cols.version]) || block.versionDefault || 'V1.0';
    rows.push([String(idx), c[cols.module] || '', c[cols.point] || '', c[cols.desc] || '', ver]);
  }
  return rows;
}

// ---------- 通用内容块 ----------
function renderBlocks(blocks) {
  for (const b of blocks || []) {
    switch (b.type) {
      case 'para':
        body.push(para(b.text));
        break;
      case 'bullets':
        (b.items || []).forEach(t => body.push(bullet(t)));
        break;
      case 'numbered':
        (b.items || []).forEach((t, i) => body.push(para('（' + (i + 1) + '）' + t)));
        break;
      case 'table':
        body.push(table(b.headers || [], b.rows || [], b.widths));
        break;
      case 'image':
        body.push(...image(resolveImage(b.src), b.caption));
        break;
      case 'reqTable': {
        const rows = reqRows(b);
        if (!rows.length) body.push(para('（无需求明细数据，请检查 xlsx.json 与 docspec 中的 filter 配置）'));
        else body.push(table(b.headers || ['序号', '所属模块', '功能点', '需求说明', '计划版本'], rows, b.widths));
        break;
      }
      default:
        console.warn('[build_docx] 未知内容块类型：' + b.type);
    }
  }
}

// ---------- 文档组装 ----------
const body = [];
const meta = spec.meta || {};

// 封面
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 }, children: [txt(meta.title || '需求文档', { size: 52, bold: true, font: H_FONT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1000 }, children: [txt(meta.subtitle || '需求文档', { size: 40, bold: true, font: H_FONT })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [txt('版本：' + (meta.version || 'V1.0'), { size: 26 })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [txt('文档状态：' + (meta.status || '评审中'), { size: 26 })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [txt('编制日期：' + (meta.date || ''), { size: 26 })] }));
if (meta.scope) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [txt(meta.scope, { size: 22, color: '595959' })] }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// 修订记录
if (spec.revision) {
  body.push(h('修订记录', HeadingLevel.HEADING_1));
  body.push(table(spec.revision.headers, spec.revision.rows, spec.revision.widths));
  body.push(new Paragraph({ children: [new PageBreak()] }));
}

// 目录
body.push(h('目录', HeadingLevel.HEADING_1));
body.push(new TableOfContents('目录', { hyperlink: true, headingStyleRange: '1-3' }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// 各章
let h4n = 0;
function renderItem(item, level) {
  statItems++;
  const lvl = level === 5 ? HeadingLevel.HEADING_5 : HeadingLevel.HEADING_4;
  body.push(h(item.title, lvl));
  // 硬性顺序：标题 → 原型截图（含图注）→ 需求说明（kvTable）→ 子功能
  const files = imgFiles(item.key);
  if (!files.length) console.warn('[build_docx] 未找到截图：' + item.key + '（' + item.title + '）');
  files.forEach((f, i) => {
    const cap = files.length > 1 ? `图 ${item.title}（${i + 1}/${files.length}）` : `图 ${item.title}`;
    body.push(...image(f, cap));
  });
  const parsed = parseNotes(notes[item.key] || '');
  const krows = [];
  const desc = parsed.desc.length ? parsed.desc : (item.synth ? [item.synth] : []);
  if (desc.length) krows.push(['功能描述', desc]);
  for (const s of parsed.sections) {
    const lines = (s.lines || []).filter(l => l && String(l).trim().length);
    krows.push([s.title || '说明', lines.length ? lines : ['']]);
  }
  if (krows.length) body.push(kvTable(krows, KV_W));
  if (item.sub) for (const s of item.sub) renderItem(s, 5);
}

function renderModule(m) {
  body.push(h(m.title, HeadingLevel.HEADING_2));
  if (m.desc) {
    body.push(h('功能描述', HeadingLevel.HEADING_3));
    m.desc.forEach(t => body.push(para(t)));
  }
  if (m.flow) {
    body.push(h('功能流程', HeadingLevel.HEADING_3));
    m.flow.forEach((t, i) => body.push(para('（' + (i + 1) + '）' + t)));
  }
  if (m.rules) {
    body.push(h('规则限制', HeadingLevel.HEADING_3));
    m.rules.forEach(t => body.push(bullet(t)));
  }
  body.push(h('功能详明', HeadingLevel.HEADING_3));
  const groups = m.subs || [{ name: null, desc: null, flow: null, rules: null, items: m.items || [] }];
  for (const g of groups) {
    if (g.name) {
      body.push(new Paragraph({ children: [txt(g.name, { bold: true, size: 24, color: '2E5496' })], spacing: { before: 240, after: 100 } }));
      if (g.desc) g.desc.forEach(t => body.push(para(t)));
      if (g.flow) { body.push(label('功能流程')); g.flow.forEach((t, i) => body.push(para('（' + (i + 1) + '）' + t))); }
      if (g.rules) { body.push(label('规则限制')); g.rules.forEach(t => body.push(bullet(t))); }
    }
    for (const item of g.items) renderItem(item, 4);
  }
}

for (const ch of spec.chapters || []) {
  body.push(h(ch.title, HeadingLevel.HEADING_1));
  if (ch.modules) {
    (ch.intro || []).forEach(t => body.push(para(t)));
    ch.modules.forEach(m => renderModule(m));
    continue;
  }
  for (const sec of ch.sections || []) {
    body.push(h(sec.title, HeadingLevel.HEADING_2));
    renderBlocks(sec.blocks);
  }
}

// ---------- 输出 ----------
const doc = new Document({
  creator: meta.creator || '',
  title: meta.docTitle || meta.title || '',
  description: meta.docDescription || '',
  styles: {
    default: {
      document: { run: { font: FONT, size: CN.size }, paragraph: { spacing: { line: 300 } } },
      heading1: { run: { font: H_FONT, size: 32, bold: true, color: '1F3864' }, paragraph: { spacing: { before: 360, after: 160 } } },
      heading2: { run: { font: H_FONT, size: 28, bold: true, color: '2E5496' }, paragraph: { spacing: { before: 280, after: 140 } } },
      heading3: { run: { font: H_FONT, size: 24, bold: true, color: '2E5496' }, paragraph: { spacing: { before: 220, after: 120 } } },
      heading4: { run: { font: H_FONT, size: 22, bold: true, color: '333333' }, paragraph: { spacing: { before: 180, after: 100 } } },
      heading5: { run: { font: H_FONT, size: 21, bold: true, color: '595959' }, paragraph: { spacing: { before: 140, after: 80 } } }
    }
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    children: body
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(path.dirname(path.resolve(OUT_PATH)), { recursive: true });
  fs.writeFileSync(OUT_PATH, buf);
  console.log('WROTE ' + OUT_PATH);
  console.log('  bytes=' + buf.length + '  images=' + statImages + '  kvTables=' + statKv + '  items=' + statItems);
}).catch(e => { console.error(e); process.exit(1); });
