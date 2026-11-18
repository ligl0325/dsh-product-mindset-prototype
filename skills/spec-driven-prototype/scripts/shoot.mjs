#!/usr/bin/env node
/**
 * shoot.mjs — headless Chrome + CDP 逐屏截图（工作流步骤⑤ 的第四项）
 *
 * 【解决什么问题】
 * 验收要看每一个菜单项、每一个详情页、每一个弹窗的真实渲染（铺满/换行/对齐/空态引导）。
 * 手工点一遍截图既慢又会漏，本脚本用 Chrome DevTools Protocol 自动走一遍并逐屏存 PNG。
 *
 * 【关键顺序：先注入登录态 → 再 reload → 再改 hash】（改 hash 不会重载 store）
 *   1) 打开站点 origin（此时还没有登录态）
 *   2) Runtime.evaluate 往 localStorage 写登录态（键名与值都由 steps.json 给）
 *   3) Page.reload —— 让前端 store（Pinia/Vuex 之类）从 localStorage 初始化
 *   4) 以后每个步骤只改 location.hash（hash 路由不重载页面，store 保持已登录）
 *   如果反过来先改 hash 再注入，页面已经渲染成未登录态，截图全是登录页。
 *
 * 【用法】
 *   node scripts/shoot.mjs --url http://127.0.0.1:5173/
 *   node scripts/shoot.mjs --url <base> --out shots --steps steps.json [--width 1440] [--height 900]
 *   node scripts/shoot.mjs --url <base> --steps steps.json --chrome "C:/path/to/chrome.exe"
 *
 *   --url     站点地址（必填）；带 hash 也行，会取 origin 做登录态注入
 *   --out     截图目录（默认 ./shots，不存在会创建）
 *   --steps   步骤 JSON（不传就只截一张首屏）。结构见下
 *   --chrome  Chrome/Edge 可执行文件路径（不传按常见路径自动找）
 *   --width / --height  视口尺寸（默认 1440x900）
 *   --timeout 每步等待超时毫秒（默认 15000）
 *   --fail-fast  某步失败立即中止（默认记录失败继续跑完，最后统一报告）
 *   --headful    显示浏览器窗口（默认 headless）
 *
 * 【steps.json 结构】（steps 也可直接写成数组）
 * {
 *   "viewport": { "width": 1440, "height": 900 },
 *   "login":    { "storage": { "token键": "值", "角色键": "管理层" } },
 *   "steps": [
 *     { "name": "01_列表", "hash": "#/orders", "waitFor": "table", "shot": true },
 *     { "name": "02_详情", "hash": "#/orders/S2026112003", "waitFor": ".page", "wait": 800, "full": true },
 *     { "name": "03_弹窗", "hash": "#/orders", "click": ".el-button--primary", "waitFor": ".el-dialog" },
 *     { "name": "04_搜索", "hash": "#/orders", "fill": { "selector": "input[placeholder=不限]", "value": "广州" } },
 *     { "name": "05_整页", "url": "http://127.0.0.1:5173/#/dashboard", "full": true }
 *   ]
 * }
 *   login.storage 的值：字符串按原样存，非字符串按 JSON 存（前端 JSON.parse 的场景）
 *   hash/url 二选一：hash 只改 hash（不重载 store）；url 整页导航（会重载，登录态已在 localStorage 里，仍保持登录）
 *   shot 默认 true；full=true 时截整页（captureBeyondViewport）
 *   每步截图文件名 = 步骤 name（无 name 就用序号，例 03）
 *
 * 【断言】waitFor 指定的选择器必须在超时前出现，否则该步记为失败（可读错误里给出选择器与耗时）。
 * 【幂等】重跑覆盖同名 PNG；不清理 --out 里的其它文件。
 * 【退出码】0 全部步骤成功｜1 有步骤失败｜2 参数/环境错误（缺 Chrome、无 WebSocket 等）
 *
 * 【配套】[SKILL.md](../SKILL.md)｜[workflow.md](../references/workflow.md) 步骤⑤
 *         上游 [gen-fields.mjs](gen-fields.mjs)｜同批 [check-spec.mjs](check-spec.mjs)、[audit-prototype.mjs](audit-prototype.mjs)
 *         陷阱清单 [pitfalls.md](../references/pitfalls.md)
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const die = (msg, code = 2) => { process.stderr.write('错误：' + msg + '\n'); process.exit(code) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = {}
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--fail-fast' || a === '--headful') { args[a.slice(2)] = true; continue }
  if (!a.startsWith('--')) continue
  const k = a.slice(2)
  args[k] = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
}
if (args.help || args.h || !args.url) {
  console.log('用法：node shoot.mjs --url <站点地址> [--out shots] [--steps steps.json] [--chrome <路径>] [--width 1440] [--height 900] [--fail-fast]')
  process.exit(args.url ? 0 : 2)
}
const BASE = String(args.url)
let origin = ''
try { origin = new URL(BASE).origin } catch { die('--url 不是合法地址：' + BASE) }
if (typeof WebSocket === 'undefined') die('当前 Node 没有内置 WebSocket（需 Node 22+）：请升级 Node 后重试', 2)

/* ---------------- 步骤配置 ---------------- */
let cfg = { viewport: {}, login: { storage: {} }, steps: [] }
if (args.steps) {
  if (!fs.existsSync(args.steps)) die('找不到步骤文件：' + args.steps)
  let raw
  try { raw = JSON.parse(fs.readFileSync(args.steps, 'utf8')) } catch (e) { die('步骤 JSON 不合法：' + e.message) }
  cfg = Array.isArray(raw) ? { ...cfg, steps: raw } : { ...cfg, ...raw }
}
if (!Array.isArray(cfg.steps) || !cfg.steps.length) cfg.steps = [{ name: '01_首屏', shot: true }]
const VW = Number(args.width || (cfg.viewport || {}).width || 1440)
const VH = Number(args.height || (cfg.viewport || {}).height || 900)
const TIMEOUT = Number(args.timeout || 15000)
const OUT = path.resolve(args.out || 'shots')
try { fs.mkdirSync(OUT, { recursive: true }) } catch (e) { die('无法创建截图目录：' + OUT + '（' + e.message + '）') }

/* ---------------- 找 Chrome ---------------- */
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)
const chromePath = args.chrome ? String(args.chrome) : CANDIDATES.find((p) => fs.existsSync(p))
if (!chromePath) die('找不到 Chrome/Edge：用 --chrome <路径> 指定，或设环境变量 CHROME_PATH\n  找过：\n    ' + CANDIDATES.join('\n    '))
if (!fs.existsSync(chromePath)) die('--chrome 指向的文件不存在：' + chromePath)

/* ---------------- 启动浏览器 + 连 CDP ---------------- */
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shoot-'))
const flags = [
  args.headful ? '' : '--headless=new',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--window-size=' + VW + ',' + VH,
  'about:blank',
].filter(Boolean)
const child = spawn(chromePath, flags, { stdio: ['ignore', 'pipe', 'pipe'] })
let stderrBuf = ''
const wsUrl = await new Promise((resolve) => {
  const t = setTimeout(() => resolve(''), 20000)
  child.stderr.on('data', (d) => {
    stderrBuf += String(d)
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(stderrBuf)
    if (m) { clearTimeout(t); resolve(m[1].replace('ws://', 'ws://').trim()) }
  })
  child.on('exit', (code) => { clearTimeout(t); resolve('') })
})
if (!wsUrl) {
  try { child.kill() } catch {}
  die('浏览器没起来或没报 DevTools 端口（退出码/输出见下）\n' + stderrBuf.split('\n').slice(-6).join('\n'))
}
const port = Number(new URL(wsUrl).port)

// 取一个 page 目标（headless 启动时会自带一个 about:blank 页）
let list = []
try { list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json() } catch (e) { die('连不上 DevTools HTTP 端口 ' + port + '：' + e.message) }
let target = list.find((t) => t.type === 'page')
if (!target) {
  try { target = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json() }
  catch (e) { die('打不开新标签页：' + e.message) }
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('WebSocket 连接失败：' + target.webSocketDebuggerUrl)) })

let msgId = 0
const pending = new Map()
ws.onmessage = (ev) => {
  let m
  try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)) } catch { return }
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    // 注意：单行 if (x) f() else g() 在 JS 里是语法错误（ExpressionStatement 缺分号），必须加花括号
    if (m.error) { reject(new Error(m.error.message + '（' + m.method + '）')) } else { resolve(m.result) }
  }
}
function send(method, params) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params: params || {} }))
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP 超时：' + method)) } }, Math.max(TIMEOUT, 10000))
  })
}
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('页面脚本报错：' + (r.exceptionDetails.text || '') + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || ''))
  return r.result ? r.result.value : undefined
}
async function waitReady(timeout) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try { if (await evaluate('document.readyState') === 'complete') return true } catch {}
    await sleep(200)
  }
  return false
}
async function waitFor(sel, timeout) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try { if (await evaluate('!!document.querySelector(' + JSON.stringify(sel) + ')')) return Date.now() - t0 } catch {}
    await sleep(150)
  }
  return -1
}

/* ---------------- 走一遍 ---------------- */
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false })

  // 1) 打开 origin
  await send('Page.navigate', { url: origin + '/' })
  await waitReady(TIMEOUT)

  // 2) 注入登录态
  const store = (cfg.login && cfg.login.storage) || {}
  const keys = Object.keys(store)
  if (keys.length) {
    const expr = keys.map((k) => {
      const v = store[k]
      const raw = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(JSON.stringify(v))
      return 'localStorage.setItem(' + JSON.stringify(k) + ', ' + raw + ')'
    }).join(';') + '; localStorage.length'
    const n = await evaluate(expr)
    console.log('已注入登录态 ' + keys.length + ' 项：' + keys.join('、') + '（localStorage 现有 ' + n + ' 项）')
  } else {
    console.log('提示：steps.json 没有 login.storage，跳过登录态注入（只能截公开页面）')
  }

  // 3) reload，让 store 从 localStorage 初始化
  await send('Page.reload', { ignoreCache: false })
  await waitReady(TIMEOUT)
  await sleep(400)

  // 4) 逐步导航 + 断言 + 截图
  const results = []
  for (let i = 0; i < cfg.steps.length; i++) {
    const s = cfg.steps[i]
    const name = String(s.name || String(i + 1).padStart(2, '0'))
    const t0 = Date.now()
    const rec = { name, ok: true, notes: [], ms: 0, file: '' }
    try {
      if (s.url) {
        await send('Page.navigate', { url: String(s.url) })
        await waitReady(TIMEOUT)
      } else if (s.hash) {
        const h = String(s.hash)
        await evaluate('location.hash = ' + JSON.stringify(h.startsWith('#') ? h : '#' + h) + '; location.hash')
      } else if (i > 0) {
        rec.notes.push('本步没有 hash/url，沿用上一步页面')
      }
      await sleep(Number(s.wait || 500))
      if (s.waitFor) {
        const took = await waitFor(String(s.waitFor), Number(s.timeout || TIMEOUT))
        if (took < 0) { rec.ok = false; rec.notes.push('等不到选择器 ' + s.waitFor + '（超过 ' + (s.timeout || TIMEOUT) + 'ms）') }
        else rec.notes.push('选择器 ' + s.waitFor + ' 在 ' + took + 'ms 出现')
      }
      if (s.click) {
        for (const sel of [].concat(s.click)) {
          const hit = await evaluate('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return 0;e.click();return 1})()')
          if (!hit) { rec.ok = false; rec.notes.push('点不到 ' + sel) } else rec.notes.push('已点击 ' + sel)
          await sleep(300)
        }
      }
      if (s.fill) {
        const f = s.fill
        const ok2 = await evaluate('(function(){var e=document.querySelector(' + JSON.stringify(f.selector) + ');if(!e)return 0;e.value=' + JSON.stringify(String(f.value)) + ';e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return 1})()')
        if (!ok2) { rec.ok = false; rec.notes.push('填不进去 ' + f.selector) } else rec.notes.push('已填 ' + f.selector)
        await sleep(300)
      }
      if (s.waitFor && !rec.ok) { /* 断言失败：仍截图，便于人看现场 */ }
      if (s.shot !== false) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!s.full })
        const file = path.join(OUT, name + '.png')
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
        rec.file = file
      }
      rec.ms = Date.now() - t0
    } catch (e) {
      rec.ok = false
      rec.notes.push(String(e.message || e))
      rec.ms = Date.now() - t0
    }
    results.push(rec)
    console.log((rec.ok ? '  OK   ' : '  FAIL ') + name.padEnd(22) + String(rec.ms).padStart(6) + 'ms  ' + rec.notes.join('；'))
    if (!rec.ok && args['fail-fast']) break
  }

  /* ---------------- 汇总 ---------------- */
  const bad = results.filter((r) => !r.ok)
  console.log('')
  console.log('步骤 ' + results.length + '｜成功 ' + (results.length - bad.length) + '｜失败 ' + bad.length + '｜截图目录 ' + OUT)
  if (bad.length) {
    console.log('失败步骤：')
    for (const r of bad) console.log('  · ' + r.name + '：' + r.notes.join('；'))
  }
  try { ws.close() } catch {}
  try { await send('Browser.close') } catch {}
  await sleep(300)
  try { child.kill() } catch {}
  process.exit(bad.length ? 1 : 0)
} catch (e) {
  console.error('错误：' + (e && e.message ? e.message : e))
  try { ws.close() } catch {}
  try { child.kill() } catch {}
  process.exit(2)
}
