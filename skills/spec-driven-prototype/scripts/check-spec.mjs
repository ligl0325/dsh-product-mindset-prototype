#!/usr/bin/env node
/**
 * check-spec.mjs — 规格自检（工作流步骤② 的完成判据、步骤⑤ 的第一项）
 *
 * 【解决什么问题】
 * 规格是唯一事实源，它自己错了后面全部跟着错：序号重号、字段挂到不存在的页面、
 * 权限矩阵漏页、口径改过以后旧词还散落在文档里。本脚本把这几件事变成断言：
 * 规格没通过就不许进下一步（铁律 10：自检断言旧口径词为 0）。
 *
 * 【用法】
 *   node scripts/check-spec.mjs --spec <规格.json>
 *   node scripts/check-spec.mjs --spec <规格.json> --banned banned.txt [--json 报告.json] [--quiet]
 *
 *   --spec          规格 JSON（meta + pages/fields/requirements/permissions/interactions/dictionary）
 *   --banned        旧口径词表（可选；不传用内置默认表），格式见下
 *   --enum-controls 视为「必须有枚举」的控件名，默认「下拉,枚举,多选,开关」
 *   --skip-keys     旧口径词扫描跳过的列，默认「source,entity」（这两列存来源系统原样页面名）
 *   --json          机器可读报告输出路径（可选）
 *   --quiet         只打印 FAIL 与结论
 *
 * 【banned.txt 格式】每行一条，支持四种行：
 *   # 注释
 *   旧词 -> 新词        命中时提示改成什么（推荐：改法一目了然）
 *   旧词
 *   !整句白名单        含这句话的单元格不算违规（用于必须保留的否定句，例：不另设独立放行审批）
 * 内置默认表是举例性的（取自参考项目），实际项目请换成自己的旧→新对照表。
 *
 * 【检查项】FAIL = 退出码非 0
 *   1 序号连续唯一    requirements[].no 唯一；全为数字时必须 1..N 连续
 *   2 枚举可追溯      下拉/枚举/多选/开关类字段必须有枚举来源（rule 的「枚举：」或字典同名条目）；
 *                    字典的「共 N 个取值」必须与取值个数一致
 *   3 页面引用完整    pages[].id 唯一；fields/permissions/requirements 的 pageId 不悬空；
 *                    交互目标至少一侧能对上页面名；交互 ID 唯一
 *   4 权限覆盖       每页恰好一行、角色列集合一致、取值只用 full/read/none（留空不允许）
 *   5 旧口径词为 0   六表所有字符串里不得出现词表里的词（白名单除外）
 *   6 必填字段统计    按页输出字段数与必填数（信息项，不判定成败）
 *   7 meta 计数       meta.pageCount/fieldCount/reqCount 与真实条数（不一致只告警）
 *
 * 【退出码】0 全部通过｜1 有 FAIL 项｜2 参数/文件错误
 *
 * 【配套】[SKILL.md](../SKILL.md)｜[workflow.md](../references/workflow.md) 步骤②/⑤
 *         上游 [gen-fields.mjs](gen-fields.mjs)｜下游 [audit-prototype.mjs](audit-prototype.mjs)、[shoot.mjs](shoot.mjs)
 *         规格结构与判据 [spec-schema.md](../references/spec-schema.md)
 */
import fs from 'node:fs'
import path from 'node:path'

const die = (msg) => { process.stderr.write('错误：' + msg + '\n'); process.exit(2) }
const args = {}
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--quiet') { args.quiet = true; continue }
  if (!a.startsWith('--')) continue
  const k = a.slice(2)
  const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
  args[k] = v
}
if (args.help || args.h || !args.spec) {
  console.log('用法：node check-spec.mjs --spec <规格json> [--banned banned.txt] [--json 报告.json] [--quiet]')
  process.exit(args.spec ? 0 : 2)
}
if (!fs.existsSync(args.spec)) die('找不到规格 JSON：' + args.spec)
let spec
try { spec = JSON.parse(fs.readFileSync(args.spec, 'utf8')) } catch (e) { die('规格 JSON 不合法（' + args.spec + '）：' + e.message) }

/* ------------------------- 旧口径词表 ------------------------- */
// 默认表是举例性的：取自参考项目「订单/台账类」的旧口径；实际项目请换成自己的
const DEFAULT_BANNED = [
  '# 举例：参考项目里被废弃的旧叫法（实际项目请替换成自己的旧→新对照表）',
  '订单台账 -> 销售订单',
  '签单与放行 -> 签单与额度',
  '签单台账 -> 财务签单',
  '借用台账 -> 样品借用',
  '备货跟进 -> 发货作业',
  '退换申请 -> 退货台账',
  '退换货台账 -> 退货台账',
  '物流订单 -> 发货管理',
  '物流回复交期 -> 物流预计发货日期',
  '放行额度 -> 签单额度',
  '放行范围 -> 可发货数量',
  '可发范围 -> 可发货数量',
  '财务放行 -> 签单额度',
  '按期交付率 -> 一次准交率',
  '按期率 -> 一次准交率',
  '批次回执与签收 -> 发货报表',
  '开票协同 -> 财务签单',
]

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

/* ------------------------- 断言小工具 ------------------------- */
const fails = [], warns = [], infos = [], oks = []
const ok = (msg) => { oks.push(msg); if (!args.quiet) console.log('  OK   ' + msg) }
const fail = (msg) => { fails.push(msg); console.log('  FAIL ' + msg) }
const warn = (msg) => { warns.push(msg); console.log('  警告 ' + msg) }
const info = (msg) => { infos.push(msg); if (!args.quiet) console.log('  信息 ' + msg) }
const ck = (cond, msg) => { if (cond) ok(msg); else fail(msg); return !!cond }
const arr = (k) => (Array.isArray(spec[k]) ? spec[k] : (spec[k] === undefined ? (warn('规格缺少数组 ' + k + '，按空处理'), []) : (fail('规格的 ' + k + ' 不是数组'), [])))

const pages = arr('pages'), fields = arr('fields'), reqs = arr('requirements')
const perms = arr('permissions'), its = arr('interactions'), dict = arr('dictionary')
const ids = pages.map((p) => p.id)
const idSet = new Set(ids)

/* ------------------------- 1. 序号连续唯一 ------------------------- */
if (!args.quiet) console.log('== 1. 序号连续唯一 ==')
{
  const nos = reqs.map((r) => String(r.no == null ? '' : r.no).trim())
  const empty = nos.filter((n) => !n).length
  ck(empty === 0, '需求序号无空值（' + reqs.length + ' 条）' + (empty ? '：空 ' + empty + ' 条' : ''))
  const dup = [...new Set(nos.filter((n, i) => n && nos.indexOf(n) !== i))]
  ck(dup.length === 0, '需求序号唯一' + (dup.length ? '：重复 ' + dup.slice(0, 8).join('、') : ''))
  const allNum = nos.length > 0 && nos.every((n) => /^\d+$/.test(n))
  if (!allNum) {
    info('序号非纯数字，跳过 1..N 连续性检查（只做唯一性）')
  } else {
    const nums = new Set(nos.map(Number))
    const miss = []
    for (let i = 1; i <= reqs.length; i++) if (!nums.has(i)) miss.push(i)
    ck(miss.length === 0, '需求序号 1..' + reqs.length + ' 连续' + (miss.length ? '：缺 ' + miss.slice(0, 10).join('、') : ''))
  }
}

/* ------------------------- 2. 枚举可追溯 ------------------------- */
if (!args.quiet) console.log('== 2. 枚举可追溯来源 ==')
{
  const dictByField = {}
  for (const d of dict) {
    const k = String(d.field)
    if (!dictByField[k]) dictByField[k] = []
    dictByField[k].push(d)
  }
  const enumOfRule = (rule) => {
    const m = /枚举[:：]\s*(.+)$/.exec(String(rule || ''))
    return m ? m[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean) : null
  }
  // 「选择器」默认不算：它挑的是外部对象（关联订单/组织/角色），本来就没有固定枚举
  const ENUM_CONTROLS = String(args['enum-controls'] || '下拉,枚举,多选,开关').split(',').map((s) => s.trim()).filter(Boolean)
  const needEnum = fields.filter((f) => ENUM_CONTROLS.includes(String(f.control || '').trim()))
  const missing = needEnum.filter((f) => {
    const e = enumOfRule(f.rule)
    return !(e && e.length) && !dictByField[String(f.field)]
  })
  ck(missing.length === 0, '控件为 ' + ENUM_CONTROLS.join('/') + ' 的字段都有枚举来源（' + needEnum.length + ' 个）'
    + (missing.length ? '：缺 ' + missing.slice(0, 8).map((f) => f.pageId + '/' + f.field).join('、') : ''))
  info('带「枚举：」写法的字段 ' + fields.filter((f) => enumOfRule(f.rule)).length + ' 个；数据字典 ' + dict.length + ' 条')
  const bad = []
  for (const d of dict) {
    const vals = String(d.note || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    const m = /共\s*(\d+)\s*个取值/.exec(String(d.relation || ''))
    if (m && Number(m[1]) !== vals.length) bad.push(String(d.field) + '（标 ' + m[1] + '，实际 ' + vals.length + '）')
    if (!vals.length) bad.push(String(d.field) + '（取值为空）')
  }
  ck(bad.length === 0, '数据字典取值个数与「共 N 个取值」一致' + (bad.length ? '：' + bad.slice(0, 8).join('、') : ''))
}

/* ------------------------- 3. 页面引用完整 ------------------------- */
if (!args.quiet) console.log('== 3. 页面引用完整 ==')
{
  const dupId = [...new Set(ids.filter((x, i) => x && ids.indexOf(x) !== i))]
  ck(dupId.length === 0, 'pages[].id 唯一（' + pages.length + ' 页）' + (dupId.length ? '：重复 ' + dupId.join('、') : ''))
  const dangling = (rows, what) => {
    const bad = [...new Set(rows.map((r) => r.pageId).filter((x) => x && !idSet.has(x)))]
    ck(bad.length === 0, what + ' 的 pageId 不悬空' + (bad.length ? '：' + bad.slice(0, 8).join('、') : ''))
  }
  dangling(fields, '字段清单')
  dangling(perms, '权限矩阵')
  dangling(reqs, '需求总表')
  const named = pages.map((p) => String(p.name || '')).filter(Boolean)
  // 只有「跳转」类才要求页面名对得上（弹窗/批量/规则的目标是弹窗名与动作名，本来就不是页面）
  const jumps = its.filter((i) => String(i.type || '') === '跳转' || /\u2192|->/.test(String(i.target || '')))
  const unres = jumps.filter((i) => {
    const parts = String(i.target || '').split(/\u2192|->/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return true
    return !parts.some((part) => named.some((n) => part.includes(n) || n.includes(part)))
  })
  ck(unres.length === 0, '跳转类交互的目标能对上页面名（' + jumps.length + '/' + its.length + ' 条）'
    + (unres.length ? '：' + unres.slice(0, 6).map((i) => i.id + '「' + i.target + '」').join('、') : ''))
  const dupIt = [...new Set(its.map((i) => i.id).filter((x, i, a) => x && a.indexOf(x) !== i))]
  ck(dupIt.length === 0, '交互 ID 唯一' + (dupIt.length ? '：重复 ' + dupIt.join('、') : ''))
}

/* ------------------------- 4. 权限行覆盖所有页面 ------------------------- */
if (!args.quiet) console.log('== 4. 权限行覆盖所有页面 ==')
{
  const permIds = perms.map((p) => p.pageId)
  const miss = ids.filter((x) => !permIds.includes(x))
  const dup = [...new Set(permIds.filter((x, i) => x && permIds.indexOf(x) !== i))]
  const extra = [...new Set(permIds.filter((x) => x && !idSet.has(x)))]
  ck(miss.length === 0, '每个页面都有权限行（' + pages.length + ' 页 / ' + perms.length + ' 行）' + (miss.length ? '：缺 ' + miss.slice(0, 8).join('、') : ''))
  ck(dup.length === 0, '每页恰好一行权限' + (dup.length ? '：重复 ' + dup.slice(0, 8).join('、') : ''))
  ck(extra.length === 0, '权限行没有多余页面' + (extra.length ? '：' + extra.slice(0, 8).join('、') : ''))
  const keySets = [...new Set(perms.map((p) => Object.keys(p.roles || {}).sort().join('|')))]
  ck(keySets.length <= 1, '各页权限行的角色列集合一致（' + (keySets[0] || '').split('|').length + ' 个角色）'
    + (keySets.length > 1 ? '：出现 ' + keySets.length + ' 种写法' : ''))
  const levels = new Set()
  for (const p of perms) for (const v of Object.values(p.roles || {})) levels.add(v === '' || v == null ? '（空）' : String(v))
  const ALLOWED = ['full', 'read', 'none']
  const badLevel = [...levels].filter((v) => !ALLOWED.includes(v))
  ck(badLevel.length === 0, '权限取值只用 ' + ALLOWED.join('/') + '（留空是不允许的，要显式写 none）'
    + (badLevel.length ? '：发现 ' + badLevel.join('、') : ''))
  const cnt = {}
  for (const p of perms) for (const v of Object.values(p.roles || {})) cnt[v] = (cnt[v] || 0) + 1
  info('权限取值分布：' + Object.entries(cnt).map((kv) => kv[0] + ' ' + kv[1]).join('｜'))
}

/* ------------------------- 5. 旧口径词为 0 ------------------------- */
if (!args.quiet) console.log('== 5. 旧口径词为 0 ==')
{
  // 这些列存的是来源系统原样名称（页面名/来源），必须逐字保留，不做旧口径词判定
  const SKIP_KEYS = String(args['skip-keys'] || 'source,entity').split(',').map((s) => s.trim()).filter(Boolean)
  info('词表来源：' + BAN.from + '（旧词 ' + BAN.banned.length + ' 个，整句白名单 ' + BAN.allow.length + ' 条）')
  info('跳过这些列（来源系统原样名，逐字保留）：' + SKIP_KEYS.join('、'))
  const hits = []
  const walk = (node, where, key) => {
    if (SKIP_KEYS.includes(key)) return
    if (typeof node === 'string') {
      if (BAN.allow.some((a) => node.includes(a))) return
      for (const b of BAN.banned) if (node.includes(b.word)) hits.push({ where, word: b.word, to: b.to, text: node })
      return
    }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, where + '[' + i + ']', key)); return }
    if (node && typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], where + '.' + k, k)
  }
  for (const k of Object.keys(spec)) walk(spec[k], k, k)
  ck(hits.length === 0, '规格全文没有旧口径词（' + BAN.banned.length + ' 个词 × 六表）'
    + (hits.length ? '：命中 ' + hits.length + ' 处' : ''))
  const byWord = {}
  for (const h of hits) { if (!byWord[h.word]) byWord[h.word] = []; byWord[h.word].push(h) }
  for (const w of Object.keys(byWord).slice(0, 15)) {
    const list = byWord[w]
    console.log('       · 「' + w + '」x' + list.length + (list[0].to ? ' -> 应改为「' + list[0].to + '」' : '') + '　首处 ' + list[0].where)
    if (!args.quiet) for (const h of list.slice(0, 2)) console.log('         ' + h.text.replace(/\s+/g, ' ').slice(0, 100))
  }
}

/* ------------------------- 6. 必填字段统计 ------------------------- */
if (!args.quiet) console.log('== 6. 必填字段统计（信息项） ==')
{
  const rows = []
  for (const p of pages) {
    const f = fields.filter((x) => x.pageId === p.id)
    if (!f.length) continue
    rows.push({ id: p.id, name: p.name, total: f.length, req: f.filter((x) => x.required === true).length })
  }
  info('总字段 ' + fields.length + '｜必填 ' + rows.reduce((a, r) => a + r.req, 0) + '｜带字段的页面 ' + rows.length + '/' + pages.length)
  for (const r of rows) console.log('       ' + r.id.padEnd(14) + String(r.name).padEnd(10) + ' 字段 ' + String(r.total).padStart(3) + '｜必填 ' + String(r.req).padStart(3))
}

/* ------------------------- 7. meta 计数 ------------------------- */
if (!args.quiet) console.log('== 7. meta 计数 ==')
{
  const m = spec.meta || {}
  const pairs = [['pageCount', pages.length], ['fieldCount', fields.length], ['reqCount', reqs.length]]
  for (const kv of pairs) {
    const k = kv[0], v = kv[1]
    if (m[k] === undefined) { warn('meta.' + k + ' 未填（实际 ' + v + '）'); continue }
    if (Number(m[k]) === v) ok('meta.' + k + ' = ' + v)
    else warn('meta.' + k + ' = ' + m[k] + '，实际 ' + v + '（改完源请重跑生成链刷新 meta）')
  }
}

/* ------------------------- 结论 ------------------------- */
const report = { spec: args.spec, passed: fails.length === 0, ok: oks.length, fails, warns, infos }
if (args.json) {
  try { fs.writeFileSync(path.resolve(args.json), JSON.stringify(report, null, 1), 'utf8') } catch (e) { die('写报告失败：' + args.json + '（' + e.message + '）') }
}
console.log('')
console.log((fails.length ? '有未通过项' : '全部通过') + '（' + fails.length + ' 项未通过，' + warns.length + ' 项告警，' + oks.length + ' 项通过）')
if (fails.length) {
  console.log('未通过项：')
  for (const f of fails) console.log('  · ' + f)
}
process.exit(fails.length ? 1 : 0)
