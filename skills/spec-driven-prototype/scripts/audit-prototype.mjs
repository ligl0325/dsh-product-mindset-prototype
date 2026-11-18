#!/usr/bin/env node
/**
 * audit-prototype.mjs — 原型审计（静态扫源码，不启浏览器）（工作流步骤⑤ 的第三项）
 *
 * 【解决什么问题】
 * 原型漂移有四种典型形态，都能在源码里静态查出来，不必开浏览器：
 *   1) 页面缺四态（加载/空/失败/无权限），验收时才发现白屏；
 *   2) 规格里的交互没落地（跳转没写 router.push、弹窗没写 el-dialog、批量没有批量动作）；
 *   3) 原型里写了成句的业务规则（口径/不参与/不得/＝/仅 X 回传/必须）——铁律 8：原型不写业务规则；
 *   4) 字段手写，不来自生成物——铁律 1：原型字段不许手写。
 * 本脚本只读源码、只出报告，不改任何文件。
 *
 * 【用法】
 *   node scripts/audit-prototype.mjs --src <前端src目录>
 *   node scripts/audit-prototype.mjs --src <src> --spec <规格json> --out 审计报告.md [--strict]
 *
 *   --src     前端 src 目录（下面应有 views/ 与 data/fieldSets.js、data/lineColumns.js）
 *   --spec    规格 JSON（可选；给了才能查交互落地与页面清单，不给就用 views/*.vue 的文件名当页面）
 *   --out     报告 md 路径（默认 ./原型审计报告.md；传 "" 只打印）
 *   --banned  旧口径词表（可选；与 check-spec.mjs 同格式）
 *   --rules   规则文案关键词正则（默认：不参与|不计入|口径|不得|＝|仅.{0,10}回传|必须）
 *   --hint-class 说明类样式块的正则（默认：hint|note|tip|meta|rule|legend|desc|dsc|sub|badge|说明|提示）
 *   --map     交互宿主映射 JSON（可选）：{"DIALOG_HOST":{"D01":"PAGE_ID"},"BATCH_HOST":{...},"JUMP_HOST":{...}}
 *             不给时按交互目标里的页面名自动解析宿主页面
 *   --skip-pages 不参与四态检查的页面 ID（逗号分隔；默认自动跳过 id 含「无页面」的与登录页）
 *   --skip-dirs  字段/旧词扫描跳过的目录（相对 --src；默认 data，即生成物本身不重复扫）
 *   --extra-patterns 额外的手写字段名识别正则（逗号分隔，命中组 1 视为字段名），
 *                    例：项目习惯写 const M = { '单号': row.id }，可传 "['\"]([^'\"]{2,14})['\"]\s*:\s*[a-z]"
 *   --strict  有 FAIL 项时退出码 1（默认只告警也退 0）
 *
 * 【判定口径】（与参考项目的巡检脚本一致，抽掉项目专名）
 *   四态：页面用了统一四态容器（含 StateWrapper 之类）即视为四态齐全；否则按四个关键字的样式/文案标记逐个判
 *   交互：跳转→该页有 router.push；弹窗→该页有 el-dialog；批量→该页有「批量」；四态→全部页面四态齐；规则→标「规则已写」
 *   规则文案：命中关键词**且**该行位于说明类样式块（class 命中 --hint-class）才算 FAIL
 *   手写字段：视图里的“字段绑定”写法（form['X'] / el-form-item label="X" / :label="'X'"）若不在生成物里，逐个列出。
 *              表头、动作列、区块标题、KPI 名称之类的中文串不是字段，不在此列（要一起查用 --extra-patterns）
 *
 * 【退出码】0 完成（有 FAIL 时 0，除非 --strict）｜1 硬性失败（缺 src/生成物）或 --strict 下有 FAIL｜2 参数错误
 *
 * 【配套】[SKILL.md](../SKILL.md)｜[workflow.md](../references/workflow.md) 步骤⑤
 *         上游 [gen-fields.mjs](gen-fields.mjs)｜同批 [check-spec.mjs](check-spec.mjs)、[shoot.mjs](shoot.mjs)
 *         原型约定与陷阱 [conventions.md](../references/conventions.md)、[pitfalls.md](../references/pitfalls.md)
 */
import fs from 'node:fs'
import path from 'node:path'

const die = (msg, code = 2) => { process.stderr.write('错误：' + msg + '\n'); process.exit(code) }
const args = {}
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--strict' || a === '--quiet') { args[a.slice(2)] = true; continue }
  if (!a.startsWith('--')) continue
  const k = a.slice(2)
  args[k] = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
}
if (args.help || args.h || !args.src) {
  console.log('用法：node audit-prototype.mjs --src <前端src目录> [--spec 规格.json] [--out 报告.md] [--banned banned.txt] [--strict]')
  process.exit(args.src ? 0 : 2)
}
const SRC = path.resolve(args.src)
if (!fs.existsSync(SRC) || !fs.statSync(SRC).isDirectory()) die('--src 不是目录：' + SRC)
const VIEWS = path.join(SRC, 'views')
if (!fs.existsSync(VIEWS)) die('在 --src 下找不到 views/：' + VIEWS + '（模板工程约定页面放 views/）')

const readAll = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) readAll(p, out)
    else if (/\.(vue|js|ts|jsx|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/')

/* ---------------- 旧口径词表（与 check-spec.mjs 同格式，独立实现，保证单文件可用） ---------------- */
const DEFAULT_BANNED = ['订单台账 -> 销售订单', '签单与放行 -> 签单与额度', '借用台账 -> 样品借用', '备货跟进 -> 发货作业', '物流订单 -> 发货管理', '物流回复交期 -> 物流预计发货日期', '放行额度 -> 签单额度', '财务放行 -> 签单额度', '按期交付率 -> 一次准交率', '批次回执与签收 -> 发货报表', '开票协同 -> 财务签单']
function loadBanned(file) {
  if (file && !fs.existsSync(file)) die('找不到词表：' + file)
  const lines = file ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : DEFAULT_BANNED
  const banned = [], allow = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('!')) { allow.push(line.slice(1).trim()); continue }
    const m = /^(.*?)\s*(?:->|=>|\u2192)\s*(.*)$/.exec(line)
    banned.push(m && m[1].trim() ? { word: m[1].trim(), to: (m[2] || '').trim() } : { word: line, to: '' })
  }
  return { banned, allow, from: file || '（内置默认表，举例性）' }
}
const BAN = loadBanned(args.banned)

const RULES_RE = new RegExp(args.rules || '不参与|不计入|口径|不得|＝|仅.{0,10}回传|必须')
const HINT_RE = new RegExp(args['hint-class'] || 'hint|note|tip|meta|rule|legend|desc|dsc|sub|badge|说明|提示')

/* ---------------- 规格（可选） ---------------- */
let spec = null
if (args.spec) {
  if (!fs.existsSync(args.spec)) die('找不到规格 JSON：' + args.spec)
  try { spec = JSON.parse(fs.readFileSync(args.spec, 'utf8')) } catch (e) { die('规格 JSON 不合法：' + e.message) }
}
const pages = spec && Array.isArray(spec.pages) ? spec.pages.filter((p) => p.id !== '无页面（接口/配置类）') : []
const pageIds = spec ? pages.map((p) => p.id) : fs.readdirSync(VIEWS).filter((f) => f.endsWith('.vue')).map((f) => f.slice(0, -4))
const nameToId = {}
if (spec) for (const p of pages) nameToId[String(p.name)] = p.id
const pick = (text) => {
  for (const n of Object.keys(nameToId)) if (String(text).indexOf(n) >= 0) return nameToId[n]
  return null
}

/* ---------------- 读页面源码 ---------------- */
const views = {}
for (const id of pageIds) {
  const f = path.join(VIEWS, id + '.vue')
  views[id] = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
}
const missingFile = pageIds.filter((id) => !views[id])

/* ---------------- A. 四态齐全 ---------------- */
const MARK = {
  loading: /el-skeleton|加载中|骨架|StateWrapper|loading/i,
  empty: /空态|暂无|没有匹配|el-empty|无数据|没有数据/,
  error: /失败|重试|error|Error/,
  denied: /无权限|权限|denied|Denied/,
}
const skipPages = String(args['skip-pages'] || '').split(',').map((s) => s.trim()).filter(Boolean)
const autoSkip = (id) => /无页面/.test(id) || /login|a0-1/i.test(id)
const fourRows = []
for (const id of pageIds) {
  if (skipPages.includes(id) || autoSkip(id)) { fourRows.push({ id, skipped: true, four: null }); continue }
  const src = views[id]
  if (!src) { fourRows.push({ id, missing: true, four: { loading: false, empty: false, error: false, denied: false } }); continue }
  const wrapped = /StateWrapper|StateBox|FourStates|useDemoState/.test(src)
  const four = {}
  for (const k of Object.keys(MARK)) four[k] = wrapped || MARK[k].test(src)
  fourRows.push({ id, wrapped, four })
}
const fourFull = fourRows.filter((r) => r.four && Object.values(r.four).every(Boolean))
const fourBad = fourRows.filter((r) => r.four && Object.values(r.four).some((v) => !v))

/* ---------------- B. 交互覆盖 ---------------- */
const MAP = args.map ? JSON.parse(fs.readFileSync(args.map, 'utf8')) : {}
const hostOf = (kind, i) => {
  const m = MAP[kind] || {}
  if (m[i.id]) return m[i.id]
  const parts = String(i.target || '').split(/\u2192|->/).map((s) => s.trim())
  return pick(parts[0] || '')
}
const itRows = []
if (spec && Array.isArray(spec.interactions)) {
  for (const i of spec.interactions) {
    const type = String(i.type || '')
    let host = '', verdict = '人工'
    if (type === '跳转') {
      host = hostOf('JUMP_HOST', i)
      verdict = host && views[host] && /router\.push|\$router\.push/.test(views[host]) ? '已实现' : (host ? '待核' : '人工')
    } else if (type === '弹窗') {
      host = hostOf('DIALOG_HOST', i)
      verdict = host && views[host] && /el-dialog/.test(views[host]) ? '已实现' : (host ? '待核' : '人工')
    } else if (type === '批量') {
      host = hostOf('BATCH_HOST', i)
      verdict = host && views[host] && /批量|全部已读/.test(views[host]) ? '已实现' : '待核'
    } else if (type === '四态') {
      verdict = fourBad.length === 0 && fourFull.length > 0 ? '已实现' : '部分'
    } else if (type === '规则') {
      verdict = '规则已写'
    }
    itRows.push({ type, id: i.id, target: i.target, host: host || '—', verdict })
  }
} else if (!spec) {
  console.log('提示：未传 --spec，跳过交互覆盖检查')
}

/* ---------------- C. 规则文案扫描（说明类样式块内的成句规则） ---------------- */
const ruleHits = []
for (const f of readAll(SRC)) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  lines.forEach((line, idx) => {
    if (!RULES_RE.test(line)) return
    const cls = /class="([^"]*)"/.exec(line)
    if (!cls || !HINT_RE.test(cls[1])) return
    const kw = (RULES_RE.exec(line) || [])[0]
    ruleHits.push({ file: rel(f), line: idx + 1, kw, text: line.trim().replace(/\s+/g, ' ').slice(0, 160) })
  })
}

/* ---------------- D. 旧口径词扫描 ---------------- */
const skipDirs = String(args['skip-dirs'] === undefined ? 'data' : args['skip-dirs']).split(',').map((s) => s.trim()).filter(Boolean)
const banHits = []
for (const f of readAll(SRC)) {
  const r = rel(f)
  if (skipDirs.some((d) => r.startsWith(d + '/'))) continue
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  lines.forEach((line, idx) => {
    if (BAN.allow.some((a) => line.includes(a))) return
    for (const b of BAN.banned) if (line.includes(b.word)) banHits.push({ file: r, line: idx + 1, word: b.word, to: b.to, text: line.trim().slice(0, 140) })
  })
}

/* ---------------- E. 字段是否来自生成物 ---------------- */
const DATA = path.join(SRC, 'data')
const generated = new Set()
const genFiles = ['fieldSets.js', 'lineColumns.js'].map((n) => path.join(DATA, n))
const genMissing = genFiles.filter((p) => !fs.existsSync(p))
for (const p of genFiles) {
  if (!fs.existsSync(p)) continue
  const t = fs.readFileSync(p, 'utf8')
  for (const m of t.matchAll(/"(?:label|name|key)":\s*"([^"]+)"/g)) generated.add(m[1])
}
const handRows = []
if (genMissing.length) {
  console.log('警告：缺少生成物 ' + genMissing.map(rel).join('、') + '——请先跑 gen-fields.mjs；本项跳过')
} else {
  // 只认“字段绑定”写法，不认普通中文对象键（否则表头、动作列、区块标题都会被当成字段，无法收敛）
  // level=high：字段读写位置（form['X']）——基本可确定是字段；level=low：只是 label，可能是界面标签或动作列
  const NAMES = [
    { level: 'high', re: /(?:form|model|q|query|editForm|formData)(?:\.value)?\s*\[\s*['"]([^'"]{2,14})['"]\s*\]/g },
    { level: 'low', re: /(?:el-form-item|el-table-column|el-select|el-input)[^>]{0,160}?\blabel="([^"]{2,14})"/g },
    { level: 'low', re: /:label="'([^']{2,14})'"/g },
  ]
  // 项目自己的字段映射写法（例：const M = { '单号': row.id }）可加 --extra-patterns 传入（按 high 记）
  for (const s of String(args['extra-patterns'] || '').split(',').map((x) => x.trim()).filter(Boolean)) NAMES.push({ level: 'high', re: new RegExp(s, 'g') })
  // 明确不是字段的界面标签（动作列/序号之类），可被 --ui-labels 覆盖
  const UI_LABELS = new Set(String(args['ui-labels'] === undefined ? '操作,序号,行号,合计' : args['ui-labels']).split(',').map((s) => s.trim()).filter(Boolean))
  const isFieldLike = (s) => /[\u4e00-\u9fa5]/.test(s) && !/[\s/，。；：、（）()\[\]{}<>|#@]/.test(s) && !/^(全部|无|是|否|其他)$/.test(s)
  for (const f of readAll(path.join(SRC, 'views'))) {
    const r = rel(f)
    const src = fs.readFileSync(f, 'utf8')
    const local = { high: new Set(), low: new Set() }
    for (const n of NAMES) for (const m of src.matchAll(n.re)) {
      const v = m[1]
      if (!isFieldLike(v) || UI_LABELS.has(v) || generated.has(v)) continue
      local[n.level].add(v)
    }
    if (local.high.size || local.low.size) handRows.push({ file: r, high: [...local.high], low: [...local.low] })
  }
}
const genCount = generated.size

/* ---------------- 报告 ---------------- */
const L = []
const P = (s) => L.push(s)
P('# 原型审计报告（静态扫描）')
P('')
P('> 源码目录：' + SRC + '｜规格：' + (args.spec || '（未传，跳过交互检查）'))
P('')
P('## 摘要')
P('')
P('| 指标 | 数值 |')
P('| --- | --- |')
P('| 页面 | ' + pageIds.length + (missingFile.length ? '（缺文件 ' + missingFile.length + '）' : '') + ' |')
P('| 四态齐全 | ' + fourFull.length + ' / ' + fourRows.filter((r) => r.four).length + ' |')
P('| 交互条目 | ' + itRows.length + '（已实现 ' + itRows.filter((r) => r.verdict === '已实现').length + '） |')
P('| 规则文案命中（说明类样式块内） | ' + ruleHits.length + ' |')
P('| 旧口径词命中 | ' + banHits.length + ' |')
P('| 手写字段名（高置信/低置信） | ' + handRows.reduce((a, r) => a + r.high.length, 0) + ' / ' + handRows.reduce((a, r) => a + r.low.length, 0) + ' |')
P('')
P('## 一、四态覆盖')
P('')
P('| 页面 | 统一四态容器 | 加载 | 空 | 失败 | 无权限 |')
P('| --- | --- | --- | --- | --- | --- |')
for (const r of fourRows) {
  if (r.skipped) { P('| ' + r.id + ' | — | — | — | — | — |'); continue }
  if (r.missing) { P('| ' + r.id + ' | 缺文件 | — | — | — | — |'); continue }
  P('| ' + r.id + ' | ' + (r.wrapped ? '有' : '—') + ' | ' + ['loading', 'empty', 'error', 'denied'].map((k) => (r.four[k] ? '有' : '—')).join(' | ') + ' |')
}
P('')
P('## 二、交互覆盖')
P('')
P('| 类型 | ID | 对象 | 宿主页面 | 判定 |')
P('| --- | --- | --- | --- | --- |')
for (const r of itRows) P('| ' + r.type + ' | ' + r.id + ' | ' + r.target + ' | ' + r.host + ' | ' + r.verdict + ' |')
P('')
P('## 三、规则文案（原型不该出现的成句规则）')
P('')
P('| 文件 | 行 | 命中词 | 文案 |')
P('| --- | --- | --- | --- |')
for (const h of ruleHits) P('| ' + h.file + ' | ' + h.line + ' | ' + h.kw + ' | ' + h.text + ' |')
if (!ruleHits.length) P('| — | — | — | — |')
P('')
P('## 四、旧口径词')
P('')
P('| 文件 | 行 | 旧词 | 应改为 | 文案 |')
P('| --- | --- | --- | --- | --- |')
for (const h of banHits) P('| ' + h.file + ' | ' + h.line + ' | ' + h.word + ' | ' + (h.to || '—') + ' | ' + h.text + ' |')
if (!banHits.length) P('| — | — | — | — |')
P('')
P('## 五、手写字段名（不在生成物里）')
P('')
P('生成物字段名 ' + genCount + ' 个。分两档：**高置信**=出现在字段读写位置（form[\'X\']）；**低置信**=只出现在 label，可能是界面标签或动作列。')
P('')
P('| 文件 | 高置信（字段读写位置的字段名） | 低置信（仅 label） |')
P('| --- | --- | --- |')
for (const r of handRows) P('| ' + r.file + ' | ' + (r.high.join('、') || '—') + ' | ' + (r.low.join('、') || '—') + ' |')
if (!handRows.length) P('| — | — | — |')
P('')
const reportPath = args.out === undefined ? path.resolve('原型审计报告.md') : (args.out ? path.resolve(args.out) : '')
if (reportPath) {
  try { fs.writeFileSync(reportPath, L.join('\n'), 'utf8') } catch (e) { die('写报告失败：' + reportPath + '（' + e.message + '）') }
}
console.log('页面 ' + pageIds.length + '｜四态齐全 ' + fourFull.length + '｜交互 ' + itRows.length + '（已实现 ' + itRows.filter((r) => r.verdict === '已实现').length + '）'
  + '｜规则文案 ' + ruleHits.length + '｜旧口径词 ' + banHits.length
  + '｜手写字段名 高置信 ' + handRows.reduce((a, r) => a + r.high.length, 0) + ' / 低置信 ' + handRows.reduce((a, r) => a + r.low.length, 0))
if (missingFile.length) console.log('缺页面文件：' + missingFile.slice(0, 10).join('、'))
if (fourBad.length) console.log('四态不全：' + fourBad.slice(0, 12).map((r) => r.id + '[' + Object.keys(r.four).filter((k) => !r.four[k]).join(',') + ']').join('　'))
if (reportPath) console.log('报告：' + reportPath)
const hardFail = genMissing.length > 0 || missingFile.length > 0
if (hardFail && !args.strict) console.log('提示：有硬性失败项（缺生成物或缺页面文件），加 --strict 可让它退出码非 0')
process.exit(hardFail || (args.strict && (fourBad.length || ruleHits.length || banHits.length || handRows.length)) ? 1 : 0)
