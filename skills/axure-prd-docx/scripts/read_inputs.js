#!/usr/bin/env node
/**
 * read_inputs.js — 解析前置输入，统一输出给 build_docx.js 使用。
 *   1) 需求拆解表 .xlsx  → <out>/xlsx.json
 *   2) 需求文档模板 .docx → <out>/template.txt（段落样式 + 是否含图片）
 *   3) 可选：原型目录 → <out>/pages.json（每个 html 的 <title> 与文本元素）
 *
 * 用法：
 *   node scripts/read_inputs.js --xlsx <需求拆解表.xlsx> --template <模板.docx> --out <目录>
 *   可选：--proto <原型目录>  --modules <node_modules>
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

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
function fail(msg) { console.error('[read_inputs] ' + msg); process.exit(1); }
function need(name, desc) {
  if (!args[name] || args[name] === true) fail('缺少参数 --' + name + '（' + desc + '）');
  return String(args[name]);
}

const OUT_DIR = need('out', '输出目录（xlsx.json / template.txt 等）');
const XLSX_PATH = args.xlsx && args.xlsx !== true ? String(args.xlsx) : '';
const TEMPLATE_PATH = args.template && args.template !== true ? String(args.template) : '';
if (!XLSX_PATH && !TEMPLATE_PATH) fail('至少要提供 --xlsx 或 --template 之一');
if (XLSX_PATH && !fs.existsSync(XLSX_PATH)) fail('需求拆解表不存在：' + XLSX_PATH);
if (TEMPLATE_PATH && !fs.existsSync(TEMPLATE_PATH)) fail('模板 docx 不存在：' + TEMPLATE_PATH);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- 依赖解析（jszip 必需） ----------
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
    try { if (fs.existsSync(path.join(c, 'jszip', 'package.json'))) return c; } catch (e) { /* ignore */ }
  }
  console.error('[read_inputs] 未找到依赖 jszip。已尝试以下目录：');
  for (const c of cands) console.error('  - ' + c);
  console.error('请在 skill 目录执行：npm install（或用 --modules / PRD_NODE_MODULES 指定已有依赖）');
  process.exit(2);
}
const MODULES_DIR = resolveModules(args.modules && args.modules !== true ? String(args.modules) : '');
const JSZip = require(path.join(MODULES_DIR, 'jszip'));

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}
function colToNum(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return [0, 0];
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return [c - 1, parseInt(m[2], 10) - 1];
}

// ---------- xlsx → xlsx.json ----------
async function readXlsx(file) {
  const buf = fs.readFileSync(file); // JSZip.loadAsync 必须传 Buffer
  const zip = await JSZip.loadAsync(buf);
  let shared = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const xml = await ssFile.async('string');
    shared = (xml.match(/<si>[\s\S]*?<\/si>/g) || []).map(si => {
      const texts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      return unescapeXml(texts.map(t => t.replace(/<[^>]+>/g, '')).join(''));
    });
  }
  const wb = await zip.file('xl/workbook.xml').async('string');
  const sheets = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"[^>]*\/>/g)]
    .map(m => ({ name: unescapeXml(m[1]), rid: m[2] }));
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relMap = {};
  [...rels.matchAll(/<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"[^>]*\/>/g)]
    .forEach(m => { relMap[m[1]] = m[2]; });

  const out = {};
  for (const s of sheets) {
    let target = relMap[s.rid] || 'worksheets/sheet1.xml';
    target = target.replace(/^\//, '').replace(/^xl\//, '');
    const f = zip.file('xl/' + target);
    if (!f) { console.log('  跳过工作表 ' + s.name + '（缺少 ' + target + '）'); continue; }
    const xml = await f.async('string');
    const rows = {};
    for (const rowXml of (xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [])) {
      const rNum = parseInt((rowXml.match(/<row[^>]*r="(\d+)"/) || [])[1], 10);
      const cells = {};
      for (const cXml of (rowXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) || [])) {
        const ref = (cXml.match(/r="([A-Z]+\d+)"/) || [])[1];
        if (!ref) continue;
        const ci = colToNum(ref)[0];
        const t = (cXml.match(/t="([^"]*)"/) || [])[1];
        let v = (cXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (t === 's' && v !== undefined) v = shared[parseInt(v, 10)];
        else if (t === 'inlineStr') v = (cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
        cells[ci] = v === undefined ? '' : unescapeXml(v);
      }
      rows[rNum] = cells;
    }
    out[s.name] = rows;
  }
  const dest = path.join(OUT_DIR, 'xlsx.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  const names = Object.keys(out);
  console.log('XLSX  工作表=' + JSON.stringify(names) + ' → ' + dest);
  for (const n of names) console.log('         - ' + n + '：' + Object.keys(out[n]).length + ' 行');
  return out;
}

// ---------- docx 模板 → template.txt ----------
async function readTemplate(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const doc = await zip.file('word/document.xml').async('string');
  const styleMap = {};
  const stFile = zip.file('word/styles.xml');
  if (stFile) {
    const sx = await stFile.async('string');
    [...sx.matchAll(/<w:style [^>]*w:styleId="([^"]*)"[^>]*>[\s\S]*?<w:name w:val="([^"]*)"\/>[\s\S]*?<\/w:style>/g)]
      .forEach(m => { styleMap[m[1]] = m[2]; });
  }
  const paras = doc.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) || [];
  const lines = [];
  for (const p of paras) {
    const pStyle = (p.match(/<w:pStyle w:val="([^"]*)"/) || [])[1] || '';
    const styleName = styleMap[pStyle] || pStyle;
    // 必须用 <w:t(?: [^>]*)?> 才能匹配带 xml:space 等属性的节点
    const texts = [...p.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => unescapeXml(m[1]));
    const text = texts.join('');
    const hasImg = /<w:drawing|<w:pict|<a:blip/.test(p);
    if (text.trim() || hasImg) lines.push('[' + styleName + ']' + (hasImg ? '{IMG}' : '') + ' ' + text);
  }
  const dest = path.join(OUT_DIR, 'template.txt');
  fs.writeFileSync(dest, lines.join('\n'));
  const tables = (doc.match(/<w:tbl>/g) || []).length;
  console.log('DOCX  段落=' + lines.length + ' 表格=' + tables +
    ' 样式=' + JSON.stringify([...new Set(lines.map(l => (l.match(/^\[([^\]]*)\]/) || [])[1]))]) +
    ' → ' + dest);
}

// ---------- 原型目录 → pages.json ----------
function readProto(dir) {
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.html')).sort();
  const out = [];
  for (const f of files) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const title = unescapeXml((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
    const texts = [...html.matchAll(/<div id="u\d+_text" class="text "\s*>([\s\S]*?)<\/div>/g)]
      .map(m => unescapeXml(m[1].replace(/<[^>]+>/g, '')).trim())
      .filter(Boolean);
    out.push({ file: f, title, texts });
  }
  const dest = path.join(OUT_DIR, 'pages.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  const txtDest = path.join(OUT_DIR, 'pages.txt');
  fs.writeFileSync(txtDest, out.map(o => o.file + '  ||  ' + o.title + '  || texts=' + o.texts.length).join('\n'));
  console.log('PROTO 页面=' + out.length + ' → ' + dest);
  return out;
}

(async () => {
  if (XLSX_PATH) await readXlsx(XLSX_PATH);
  if (TEMPLATE_PATH) await readTemplate(TEMPLATE_PATH);
  if (args.proto && args.proto !== true) {
    const dir = String(args.proto);
    if (!fs.existsSync(dir)) fail('原型目录不存在：' + dir);
    readProto(dir);
  }
  console.log('DONE 输出目录：' + path.resolve(OUT_DIR));
})().catch(e => { console.error('[read_inputs] ' + (e && e.stack || e)); process.exit(1); });
