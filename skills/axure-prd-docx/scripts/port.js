#!/usr/bin/env node
/**
 * port.js — Skill 的打包导出与跨客户端安装。
 *
 *   node scripts/port.js export --out <zip路径>
 *   node scripts/port.js install --target <目标客户端的 skills 目录> [--force]
 *   node scripts/port.js list
 *
 * 仅依赖 Node 内置模块 + jszip。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const SKILL_NAME = path.basename(SKILL_DIR);
const pkg = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'package.json'), 'utf8'));

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
const cmd = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '';
function fail(msg) { console.error('[port] ' + msg); process.exit(1); }

const SKIP = new Set(['node_modules', 'vendor', '.git', '.svn', '.DS_Store', '__pycache__']);
function walk(dir, prefix, out) {
  out = out || [];
  prefix = prefix || '';
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const abs = path.join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, rel, out);
    else if (!/\.zip$/i.test(name)) out.push({ abs, rel, size: st.size });
  }
  return out;
}

// ---------- jszip 解析（仅 export 需要） ----------
function resolveModules(explicit) {
  const cands = [];
  if (explicit) cands.push(explicit);
  if (process.env.PRD_NODE_MODULES) cands.push(process.env.PRD_NODE_MODULES);
  cands.push(path.join(SKILL_DIR, 'node_modules'));
  cands.push(path.join(process.cwd(), 'node_modules'));
  cands.push(path.join(SKILL_DIR, 'vendor', 'modules'));
  cands.push(path.join(os.homedir(), 'node_modules'));
  for (const c of cands) {
    if (!c) continue;
    try { if (fs.existsSync(path.join(c, 'jszip', 'package.json'))) return c; } catch (e) { /* ignore */ }
  }
  console.error('[port] 未找到依赖 jszip。已尝试：');
  for (const c of cands) console.error('  - ' + c);
  console.error('请在 skill 目录执行：npm install（或用 --modules / PRD_NODE_MODULES 指定）');
  process.exit(2);
}

// ---------- 已知客户端 skills 目录 ----------
function knownSkillDirs() {
  const home = os.homedir();
  return [
    { client: 'Trae', dir: path.join(home, '.trae-cn', 'skills') },
    { client: 'ZCode', dir: path.join(home, '.zcode', 'skills') },
    { client: 'Trae 国际版', dir: path.join(home, '.trae', 'skills') },
    { client: 'Claude Code', dir: path.join(home, '.claude', 'skills') },
    { client: 'Codex', dir: path.join(home, '.codex', 'skills') }
  ];
}

// ---------- export ----------
async function doExport() {
  const out = args.out && args.out !== true ? String(args.out) : '';
  if (!out) fail('缺少参数 --out <zip 路径>，例如：--out C:/Temp/axure-prd-docx.zip');
  const JSZip = require(path.join(resolveModules(args.modules && args.modules !== true ? String(args.modules) : ''), 'jszip'));
  const files = walk(SKILL_DIR);
  const zip = new JSZip();
  const root = zip.folder(SKILL_NAME);
  for (const f of files) root.file(f.rel, fs.readFileSync(f.abs));
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log('EXPORT ' + SKILL_NAME + '@' + pkg.version + '  files=' + files.length +
    '  bytes=' + buf.length + ' → ' + path.resolve(out));
}

// ---------- install ----------
function copyTree(src, dest, prefix) {
  prefix = prefix || '';
  let n = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const abs = path.join(src, name);
    const target = path.join(dest, name);
    if (fs.statSync(abs).isDirectory()) n += copyTree(abs, target, prefix + name + '/');
    else { fs.copyFileSync(abs, target); n++; }
  }
  return n;
}
function doInstall() {
  if (!args.target || args.target === true) {
    console.error('[port] 缺少参数 --target <目录>。可安装到以下已知位置：');
    printKnown(true);
    process.exit(1);
  }
  const target = path.resolve(String(args.target));
  const dest = path.basename(target) === SKILL_NAME ? target : path.join(target, SKILL_NAME);
  if (fs.existsSync(dest) && !args.force) {
    fail('目标已存在：' + dest + '\n如需覆盖请加 --force');
  }
  if (fs.existsSync(dest) && args.force) fs.rmSync(dest, { recursive: true, force: true });
  const n = copyTree(SKILL_DIR, dest);
  console.log('INSTALL ' + SKILL_NAME + '@' + pkg.version + '  files=' + n + ' → ' + dest);
  console.log('提示：若目标客户端需要依赖，请在该目录执行 npm install，或用 PRD_NODE_MODULES 指向已有 node_modules。');
}

// ---------- list ----------
function printKnown(brief) {
  for (const k of knownSkillDirs()) {
    const exists = fs.existsSync(k.dir);
    const installed = path.join(k.dir, SKILL_NAME);
    let state = exists ? '目录存在，未安装' : '目录不存在';
    let ver = '';
    if (fs.existsSync(path.join(installed, 'SKILL.md'))) {
      state = '已安装';
      try { ver = ' v' + JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8')).version; }
      catch (e) { ver = ''; }
    }
    console.log('  ' + (state === '已安装' ? '[OK]' : '[--]') + ' ' + k.client + '  ' + k.dir + '  → ' + state + ver);
  }
}
function doList() {
  console.log('SKILL ' + SKILL_NAME + '@' + pkg.version + '  源目录：' + SKILL_DIR);
  console.log('已知客户端 skills 目录：');
  printKnown();
  console.log('自定义安装：node scripts/port.js install --target <目标 skills 目录>');
  console.log('打包导出：  node scripts/port.js export --out <zip 路径>');
}

// ---------- main ----------
if (cmd === 'export') doExport().catch(e => { console.error('[port] ' + (e && e.stack || e)); process.exit(1); });
else if (cmd === 'install') doInstall();
else if (cmd === 'list') doList();
else {
  console.log('用法：');
  console.log('  node scripts/port.js export --out <zip路径>');
  console.log('  node scripts/port.js install --target <目标 skills 目录> [--force]');
  console.log('  node scripts/port.js list');
  if (cmd) process.exit(1);
}
