#!/usr/bin/env node
/**
 * capture.js — 用无头 Chrome + CDP 批量截取 Axure 原型页面（仅低保真设计区）。
 *
 * 用法：
 *   node scripts/capture.js --proto <原型目录> --out <截图目录> --notes <notes.json>
 *   可选：--files "a.html,b.html"  --pattern "a2-5-*"  --width 1920 --scale 1.5
 *         --slice 2000 --seg 2600 --timeout 60000 --retries 2 --port 9360
 *
 * 产物：
 *   <截图目录>/<页面基名>.png            高度 ≤ seg 时单图
 *   <截图目录>/<页面基名>_p1.png ... _pN.png   超长页按 slice 分段
 *   <notes.json>                          { "<页面基名>": "<备注文本>", "_meta": {...} }
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

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
function fail(msg) { console.error('[capture] ' + msg); process.exit(1); }
function need(name, desc) {
  if (!args[name] || args[name] === true) fail('缺少参数 --' + name + '（' + desc + '）');
  return String(args[name]);
}

const PROTO = need('proto', 'Axure 原型目录（含 *.html）');
const OUT = need('out', '截图输出目录');
const NOTES_PATH = args.notes && args.notes !== true ? String(args.notes) : path.join(OUT, 'notes.json');
const WIDTH = Number(args.width || 1920);
const SCALE = Number(args.scale || 1.5);
const SLICE = Number(args.slice || 2000);
const SEG = Number(args.seg || 2600);
const TIMEOUT = Number(args.timeout || 60000);
const RETRIES = Number(args.retries || 2);
const BASE_H = 1200;

if (!fs.existsSync(PROTO)) fail('原型目录不存在：' + PROTO);
const protoStat = fs.statSync(PROTO);
const PROTO_DIR = protoStat.isFile() ? path.dirname(PROTO) : PROTO;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(path.resolve(NOTES_PATH)), { recursive: true });

// ---------- Chrome 探测 ----------
function findChrome() {
  const names = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe', 'chromium.exe']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  const cands = [];
  if (process.env.CHROME_PATH) cands.push(process.env.CHROME_PATH);
  // PATH 中查找
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const n of names) cands.push(path.join(dir, n));
  }
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:/Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    cands.push(
      pf + '/Google/Chrome/Application/chrome.exe',
      pf86 + '/Google/Chrome/Application/chrome.exe',
      pf + '/Microsoft/Edge/Application/msedge.exe',
      pf86 + '/Microsoft/Edge/Application/msedge.exe',
      local + '/Google/Chrome/Application/chrome.exe',
      local + '/Microsoft/Edge/Application/msedge.exe'
    );
  } else if (process.platform === 'darwin') {
    cands.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    cands.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium');
  }
  const seen = new Set();
  for (const c of cands) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    try { if (fs.existsSync(c)) return c; } catch (e) { /* ignore */ }
  }
  return '';
}
const CHROME = findChrome();
if (!CHROME) {
  fail('未找到 Chrome / Edge 可执行文件。请安装 Chrome，或设置环境变量 CHROME_PATH 指向浏览器可执行文件。');
}

// ---------- 待截页面 ----------
function listPages() {
  if (args.files && args.files !== true) {
    const list = String(args.files).split(',').map(s => s.trim()).filter(Boolean);
    return list.map(f => {
      const abs = path.isAbsolute(f) ? f : path.join(PROTO_DIR, f);
      if (!fs.existsSync(abs)) fail('页面不存在：' + abs);
      return abs;
    });
  }
  let files = fs.readdirSync(PROTO_DIR).filter(f => f.toLowerCase().endsWith('.html'));
  if (args.pattern && args.pattern !== true) {
    const rx = new RegExp(String(args.pattern));
    files = files.filter(f => rx.test(f));
  }
  files.sort();
  return files.map(f => path.join(PROTO_DIR, f));
}
const PAGES = listPages();
if (!PAGES.length) fail('未找到任何 .html 页面：' + PROTO_DIR);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('TIMEOUT ' + label + ' (' + ms + 'ms)')), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

// ---------- 主流程 ----------
async function main() {
  const udd = path.join(os.tmpdir(), 'chrome_prd_' + Date.now());
  const port = args.port && args.port !== true ? Number(args.port) : 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
    '--hide-scrollbars', '--disable-extensions', '--mute-audio',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + udd, 'about:blank'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { proc.kill(); } catch (e) { /* ignore */ }
    setTimeout(() => { try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) { /* ignore */ } }, 800);
  };

  try {
    // 等待 CDP 端口就绪
    let ver = null;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) { ver = await r.json(); break; }
      } catch (e) { /* not ready */ }
      await sleep(250);
    }
    if (!ver) throw new Error('Chrome CDP 端口未就绪（port=' + port + '）');
    console.log('CHROME ' + CHROME + '  port=' + port);

    const ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 连接失败')); });
    let id = 0;
    const pend = new Map();
    const lastLoad = { n: 0 };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) {
        const p = pend.get(m.id); pend.delete(m.id); clearTimeout(p.t);
        m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
      } else if (m.method === 'Page.loadEventFired') lastLoad.n++;
    };
    const send = (method, params = {}, sid, tmo = 30000) => new Promise((res, rej) => {
      const i = ++id;
      const t = setTimeout(() => { pend.delete(i); rej(new Error('TIMEOUT ' + method)); }, tmo);
      pend.set(i, { res, rej, t });
      ws.send(JSON.stringify(sid ? { id: i, method, params, sessionId: sid } : { id: i, method, params }));
    });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId: sid } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sid);
    const setMetrics = (w, hh) => send('Emulation.setDeviceMetricsOverride',
      { width: w, height: hh, deviceScaleFactor: SCALE, mobile: false }, sid, 15000);

    // 测量 + 隐藏备注面板 + 收集备注
    const MEASURE = `JSON.stringify((()=>{
      const base=document.getElementById('base');
      if(!base) return {err:'no #base (不是 Axure 原型页？)'};
      const cands=[...document.querySelectorAll('div')].filter(e=>{
        const t=e.innerText||''; const r=e.getBoundingClientRect();
        return r.width>250 && t.length>40 && /功能描述/.test(t) && /(交互逻辑|交互说明|页面备注|需求说明|异常处理)/.test(t) && r.x>600;});
      let notesX=Infinity, notesEl=null, bestA=0;
      for(const e of cands){ const r=e.getBoundingClientRect(); notesX=Math.min(notesX,r.x);
        const a=r.width*r.height; if(a>bestA){bestA=a;notesEl=e;} }
      const hidden=[];
      if(notesX!==Infinity){
        [...base.children].forEach(e=>{ const r=e.getBoundingClientRect();
          if(r.width>0 && r.x>=notesX-8){ hidden.push(e.id||String(e.className)); e.style.display='none'; }});
        if(notesEl && notesEl.style.display!=='none'){ notesEl.style.display='none'; }
      }
      let maxR=0,maxB=0;
      document.querySelectorAll('#base div,#base img,#base span,#base ul,#base li,#base td,#base p,#base table').forEach(e=>{
        const r=e.getBoundingClientRect(); const dx=(e.ownerDocument.defaultView.getComputedStyle(e).display);
        if(dx==='none') return;
        if(r.width>1&&r.height>1&&r.x>=-4&&r.right<9000){ maxR=Math.max(maxR,r.right); maxB=Math.max(maxB,r.bottom); }});
      return {title:(document.title||'').trim(), notesX:notesX===Infinity?-1:Math.round(notesX),
        w:Math.ceil(maxR)+16, h:Math.ceil(maxB)+16, notes:notesEl?notesEl.innerText:'', hidden:hidden.slice(0,8)};
    })())`;

    const notes = {};
    const titles = {};
    const titleToText = new Map();
    let okCount = 0, failCount = 0, dedupCount = 0;

    for (const abs of PAGES) {
      const file = path.basename(abs);
      const base = file.replace(/\.html$/i, '');
      const outName = base.replace(/[^\w\u4e00-\u9fa5\-\.]/g, '_');
      const pngPath = path.join(OUT, outName + '.png');

      const captureOnce = async () => {
        await setMetrics(WIDTH, BASE_H);
        const before = lastLoad.n;
        await send('Page.navigate', { url: pathToFileURL(abs).href }, sid, 25000);
        for (let k = 0; k < 80; k++) { if (lastLoad.n > before) break; await sleep(150); }
        await sleep(1300);
        const r = await send('Runtime.evaluate', { expression: MEASURE, returnByValue: true }, sid, 20000);
        const v = JSON.parse(r.result.value);
        if (v.err) throw new Error(v.err);
        const w = Math.min(WIDTH, Math.max(400, v.w));
        const hh = Math.max(300, v.h);
        // 清理上一轮遗留的分段图，避免新旧混用
        for (let i = 1; i <= 40; i++) {
          const old = path.join(OUT, outName + '_p' + i + '.png');
          if (fs.existsSync(old)) { try { fs.unlinkSync(old); } catch (e) { /* ignore */ } }
        }
        let seg = 0;
        if (hh <= SEG) {
          await setMetrics(w, hh);
          await sleep(300);
          const shot = await send('Page.captureScreenshot', { format: 'png' }, sid, 120000);
          fs.writeFileSync(pngPath, Buffer.from(shot.data, 'base64'));
          if (fs.existsSync(pngPath)) return v;
        } else {
          seg = Math.ceil(hh / SLICE);
          await setMetrics(w, Math.min(hh, SLICE));
          await sleep(300);
          for (let i = 0; i < seg; i++) {
            const y = i * SLICE, hSlice = Math.min(SLICE, hh - y);
            const shot = await send('Page.captureScreenshot',
              { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: w, height: hSlice, scale: 1 } }, sid, 120000);
            fs.writeFileSync(path.join(OUT, outName + '_p' + (i + 1) + '.png'), Buffer.from(shot.data, 'base64'));
          }
        }
        return { ...v, w, h: hh, seg };
      };

      let lastErr = null, res = null;
      for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
        try {
          res = await withTimeout(captureOnce(), TIMEOUT, file + ' 第' + attempt + '次');
          break;
        } catch (e) {
          lastErr = e;
          console.log('RETRY ' + file + ' 第' + attempt + '次失败：' + e.message);
          await sleep(600);
        }
      }
      if (!res) { failCount++; console.log('ERR  ' + file + ' :: ' + (lastErr && lastErr.message)); continue; }
      okCount++;

      // notes 以页面标题去重：同标题页面复用首个页面的备注，避免文案重复
      let text = res.notes || '';
      const title = res.title || '';
      if (title && titleToText.has(title)) { text = titleToText.get(title); dedupCount++; }
      else if (title) titleToText.set(title, text);
      notes[base] = text;
      titles[base] = title;

      console.log('OK   ' + outName + ' ' + res.w + 'x' + res.h +
        (res.seg ? ' seg=' + res.seg : '') + ' notes=' + text.length + ' notesX=' + res.notesX +
        ' hidden=' + JSON.stringify(res.hidden));
    }

    notes._meta = { proto: PROTO_DIR, chrome: CHROME, capturedAt: new Date().toISOString(), titles: titles, pages: okCount, failed: failCount, deduped: dedupCount };
    fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 1));
    console.log('DONE ok=' + okCount + '/' + PAGES.length + ' deduped=' + dedupCount + ' notes=' + NOTES_PATH);
    try { ws.close(); } catch (e) { /* ignore */ }
  } finally {
    cleanup();
  }
}

main().catch(e => { console.error('[capture] ' + (e && e.stack || e)); process.exit(1); });
