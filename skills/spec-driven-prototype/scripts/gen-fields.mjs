#!/usr/bin/env node
/**
 * gen-fields.mjs — 规格 JSON (+ 老系统字段全量) → 原型字段定义（工作流步骤③ 生成字段）
 *
 * 【解决什么问题】
 * 原型的字段定义（查询条有哪些字段、列表列、详情区块、明细行可配置列）如果手写，
 * 就一定和规格漂移（踩过：规格 750 字段、原型 15 字段）。本脚本把这一步变成生成：
 * 规格改一次，重跑本脚本，原型字段同步；生成物文件头写清源与重跑命令（铁律 2：改源不改产物）。
 *
 * 产出两个文件（路径由 --out 决定，通常指向前端工程的 src/data/）：
 *   fieldSets.js   export const FIELD_SETS = { [pageId]: {name, menu, doc, aliasOf?, query, table, form, line, required, blocks, sections} }
 *   lineColumns.js export const LINE_SETS  = { [setKey]: {label, doc, pageId, columns, defaultVisible} }
 * 两个形状与四件通用组件（QueryBar / FieldBlock / LineTable / ColumnConfig）的入参一致：
 *   query/table 元素 {label,type,align,width,enums,required}
 *   form 元素      {name,type,enums,required,block,src}      // src: crm(外部引用) | derived(系统计算) | order(本单录入)
 *   line 元素      {key,label,type,align,width,enums,group,locked}
 *
 * 【用法】
 *   node scripts/gen-fields.mjs --spec <规格.json> --legacy <老系统字段.json> --out <目录>
 *   node scripts/gen-fields.mjs --spec ... --legacy ... --out ... --config cfg.json [--log 生成日志.md]
 *
 *   --spec    规格 JSON（六表：pages/fields/requirements/permissions/interactions/dictionary）
 *   --legacy  老系统字段全量 JSON（extract-legacy-fields.py 的产出；给录入顺序、枚举、必填星号）
 *   --out     产出目录（不存在会创建）
 *   --config  配置 JSON，全部键可选，见下
 *   --log     生成日志 md 路径（可选；不传就只打印到屏幕）
 *   --split   并格拆分配置 JSON（可选，格式与 extract-legacy-fields.py 的 --split 相同）。
 *             抽取脚本已经拆过了，这里只是兜底：老系统字段 JSON 来自别处时用它把并格拆开。
 *
 * 【配套】[SKILL.md](../SKILL.md)｜[workflow.md](../references/workflow.md) 步骤③
 *         上游 [extract-legacy-fields.py](extract-legacy-fields.py)｜下游 [check-spec.mjs](check-spec.mjs)、[audit-prototype.mjs](audit-prototype.mjs)、[shoot.mjs](shoot.mjs)
 *         组件契约 [QueryBar.vue](../templates/components/QueryBar.vue)、[FieldBlock.vue](../templates/components/FieldBlock.vue)、[LineTable.vue](../templates/components/LineTable.vue)、[ColumnConfig.vue](../templates/components/ColumnConfig.vue)
 *         页面模板 [list.vue](../templates/pages/list.vue)、[detail.vue](../templates/pages/detail.vue)、[create.vue](../templates/pages/create.vue)
 *         细则 [spec-schema.md](../references/spec-schema.md)、[line-config.md](../references/line-config.md)
 *
 * 【抽象出的五件事】（都是配置，不是写死的项目名）
 *   1) 页面 → 来源文档映射：优先 config.pageSource，其次读规格 fields[].source 的「前缀·文档名」；
 *      再不行查 lineSets.doc 与 legacy 页面名的同名匹配。映射不到就报可读错误，不猜。
 *   2) 类型推断：文本 / 数字 / 金额 / 日期 / 枚举，规则是 config.types 里的正则。
 *   3) 列宽对齐：按类型给定宽与对齐（金额数字右对齐、日期居中、文本左对齐），宽度按字段名长度分档。
 *   4) 业务分组 + 来源系统顺序分段：form 按 config.blocks 归组（详情页阅读用）；
 *      sections 按老系统表单区的录入顺序切段（建单/编辑页保持录入顺序，段标题见 config.sectionTitles）。
 *   5) 字段来源三分类 + 明细行列集：来源名单（config.sourceRoles）可配；每类单据一套列集（config.lineSets）。
 *
 * 【配置】（--config 指向的 JSON，全部键可选；数组/对象为「替换」，其余为「覆盖」）
 * {
 *   "sourcePrefix": "老系统·",
 *   "pageSource":   { "PAGE_ID": "老系统里的页面名" },
 *   "pageAlias":    { "详情页PAGE_ID": "所属单据PAGE_ID" },
 *   "positions":    { "query": "查询条件", "table": "列表列", "line": "明细行字段",
 *                     "form": ["表单字段", "表单字段（*）", "表单字段（**）"] },
 *   "formIncludes": ["查询条件", "列表列", "表单字段"],
 *   "sectionTitles": ["基础信息系统信息"],
 *   "docbarSkip":   ["单号", "单据状态"],
 *   "blocks":       [["客户与合同", "客户|合同"], ["金额与折扣", "金额|折扣"]],
 *   "blockDefault": "状态与其他",
 *   "sourceRoles":  { "crm":     { "names": ["客户名称"], "patterns": ["^客户"] },
 *                     "derived": { "names": [], "patterns": ["合计|率$"] } },
 *   "types":        { "enumInRule": "枚举：", "date": "日期|时间|^至$", "money": "金额|总价|小计",
 *                     "number": "数量|折扣|率$", "enum": "^(是否|有无)" },
 *   "alignOf":      { "money": "right", "number": "right", "date": "center", "text": "left" },
 *   "widthOf":      { "date": 112, "money": 116, "number": 88, "text8": 150, "text6": 130, "text": 108 },
 *   "lineSets":     [ { "key": "sale", "label": "销售订单行", "doc": "老系统页面名", "pageId": "PAGE_ID" } ],
 *   "lineGroups":   [ ["基础", "货品|型号"], ["价格", "单价|金额"] ],
 *   "defaultVisible": { "max": 11, "locked": ["货品名称", "数量"], "prefer": ["货品名称", "数量", "单价"] },
 *   "requiredFrom": ["spec"],
 *   "dateField":    "meta.date"
 * }
 *
 * 【幂等】产物里不含当前时间：文件头日期取规格 meta.date（或 config.dateField 指定），连跑两遍逐字节一致。
 * 【退出码】0 成功｜2 参数/输入错误（缺文件、JSON 不合法、页面→来源文档映射不到）｜3 产出为空
 */
import fs from 'node:fs'
import path from 'node:path'

/* ------------------------------ 默认配置（与来源项目无关） ------------------------------ */
const DEFAULTS = {
  sourcePrefix: '老系统·',
  pageSource: {},
  pageAlias: {},
  positions: { query: '查询条件', table: '列表列', line: '明细行字段', form: ['表单字段'] },
  formIncludes: ['查询条件', '列表列', '表单字段'],
  sectionTitles: [],
  docbarSkip: [],
  blocks: [],
  blockDefault: '状态与其他',
  sourceRoles: { crm: { names: [], patterns: [] }, derived: { names: [], patterns: [] } },
  types: {
    enumInRule: '枚举：',
    date: '日期|时间',
    money: '金额|总价|小计|合计|成本|单价|价$|费$|利润',
    number: '数量|件数|折扣|折$|率$|比例|重量|材积|数$',
    enum: '^(是否|有无|可)',
  },
  alignOf: { money: 'right', number: 'right', date: 'center', text: 'left' },
  widthOf: { date: 112, money: 116, number: 88, text8: 150, text6: 130, text: 108 },
  lineSets: [],
  lineGroups: [],
  defaultVisible: { max: 11, locked: [], prefer: [] },
  requiredFrom: ['spec'],
  dateField: 'meta.date',
  banner: '自动生成，勿手改',
  generator: 'node scripts/gen-fields.mjs',
}

const die = (msg, code = 2) => { process.stderr.write('错误：' + msg + '\n'); process.exit(code) }
const warn = (msg) => process.stderr.write('警告：' + msg + '\n')

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { out._.push(a); continue }
    const k = a.slice(2)
    const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
    out[k] = v
  }
  return out
}

/** 允许逐键深合并的配置节（其余键一律整体替换，映射表类配置尤其不能半合并）。 */
const DEEP_MERGE_KEYS = new Set(['positions', 'types', 'alignOf', 'widthOf', 'sourceRoles', 'defaultVisible'])

/** 配置合并：名单/映射表整体替换；上面列出的配置节逐键覆盖。 */
function merge(base, user, where = '') {
  const out = Array.isArray(base) ? base.slice() : { ...base }
  for (const [k, v] of Object.entries(user || {})) {
    if (!(k in out)) { warn('配置里的未知键 ' + (where ? where + '.' : '') + k + ' 已忽略'); continue }
    const isPlain = v && typeof v === 'object' && !Array.isArray(v)
    if (isPlain && DEEP_MERGE_KEYS.has(k) && out[k] && typeof out[k] === 'object') out[k] = merge(out[k], v, (where ? where + '.' : '') + k)
    else out[k] = v
  }
  return out
}

function readJson(p, what) {
  if (!fs.existsSync(p)) die('找不到' + what + '：' + p)
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) }
  catch (e) { die(what + '不是合法 JSON（' + p + '）：' + e.message) }
}

/* ---------------------------------- 小工具 ---------------------------------- */
const stripDecor = (s) => String(s == null ? '' : s).replace(/^[*\s]+/, '').replace(/[*\u201c\u201d\s]+$/g, '').replace(/[:：]+$/, '').trim()
const uniq = (a) => [...new Set(a)]
const toRe = (src, what) => { try { return new RegExp(src) } catch (e) { die(what + ' 正则不合法：' + src + '（' + e.message + '）') } }

function main() {
  const args = parseArgs(process.argv.slice(2))
  const need = ['spec', 'legacy', 'out']
  for (const k of need) if (!args[k]) die('缺少必需参数 --' + k + '（用法见文件头注释）')
  if (args.help || args.h) { console.log('用法：node gen-fields.mjs --spec <规格json> --legacy <老系统字段json> --out <目录> [--config cfg.json] [--log 日志.md]'); return 0 }

  const cfg = args.config ? merge(DEFAULTS, readJson(args.config, '配置文件')) : { ...DEFAULTS }
  const spec = readJson(args.spec, '规格 JSON')
  const legacyRaw = readJson(args.legacy, '老系统字段 JSON')
  const legacy = legacyRaw.pages && typeof legacyRaw.pages === 'object' ? legacyRaw.pages : legacyRaw
  for (const k of ['pages', 'fields']) if (!Array.isArray(spec[k])) die('规格 JSON 缺少数组 ' + k + '：' + args.spec)

  const dateOf = (obj, dotted) => dotted.split('.').reduce((o, k) => (o ? o[k] : undefined), obj)
  const genDate = String(dateOf(spec, cfg.dateField) || '')

  /* ---------------- 类型推断 / 对齐 / 宽度 ---------------- */
  const RE = {
    date: toRe(cfg.types.date, 'types.date'),
    money: toRe(cfg.types.money, 'types.money'),
    number: toRe(cfg.types.number, 'types.number'),
    enum: toRe(cfg.types.enum, 'types.enum'),
  }
  const parseEnums = (rule) => {
    const m = new RegExp(cfg.types.enumInRule + '(.+)$').exec(String(rule || ''))
    return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : null
  }
  const typeOf = (name, enums) => {
    if (enums && enums.length) return 'enum'
    if (RE.date.test(name)) return 'date'
    if (RE.money.test(name)) return 'money'
    if (RE.number.test(name)) return 'number'
    if (RE.enum.test(name)) return 'enum'
    return 'text'
  }
  const alignOf = (t) => cfg.alignOf[t] || 'left'
  const widthOf = (name, t) => {
    const w = cfg.widthOf
    if (t === 'date') return w.date
    if (t === 'money') return w.money
    if (t === 'number') return w.number
    if (String(name).length >= 8) return w.text8
    if (String(name).length >= 6) return w.text6
    return w.text
  }

  /* ---------------- 来源三分类（可配名单 + 正则） ---------------- */
  const ROLE = Object.entries(cfg.sourceRoles).map(([role, r]) => ({
    role,
    names: new Set(r.names || []),
    res: (r.patterns || []).map((p) => toRe(p, 'sourceRoles.' + role + '.patterns')),
  }))
  const srcOf = (name) => {
    for (const r of ROLE) if (r.names.has(name) || r.res.some((re) => re.test(name))) return r.role
    return 'order'
  }

  /* ---------------- 业务分组（详情页阅读用） ---------------- */
  const BLOCKS = (cfg.blocks || []).map(([title, src]) => [title, toRe(src, 'blocks.' + title)])
  const blockOf = (name) => {
    for (const [b, re] of BLOCKS) if (re.test(name)) return b
    return cfg.blockDefault
  }

  /* ---------------- 页面 → 来源文档 ---------------- */
  const legacyHas = (doc) => !!legacy[doc]
  const pageSource = (pageId) => {
    if (cfg.pageSource[pageId]) return cfg.pageSource[pageId]
    const hit = spec.fields.find((f) => f.pageId === pageId && String(f.source || '').startsWith(cfg.sourcePrefix))
    if (hit) return String(hit.source).slice(cfg.sourcePrefix.length)
    const ls = cfg.lineSets.find((s) => s.pageId === pageId)
    if (ls && legacyHas(ls.doc)) return ls.doc
    return ''
  }

  /* ---------------- 并格拆分（与抽取脚本共用一份 split 表；此处只做兜底） ---------------- */
  const splitMap = args.split ? readJson(args.split, '并格拆分配置') : null
  const splitName = (name) => {
    if (!splitMap) return [name]
    const table = splitMap.split || splitMap
    if (Array.isArray(table[name])) return table[name]
    const flat = Object.keys(table).find((k) => k.replace(/\s+/g, '') === name.replace(/\s+/g, ''))
    return flat ? table[flat] : [name]
  }

  /* ---------------- 表单分段：按老系统录入顺序 ---------------- */
  const formPosSet = new Set(cfg.positions.form)
  function buildSections(doc, formFields) {
    const seq = ((legacy[doc] || []).filter((f) => formPosSet.has(f.pos)).map((f) => stripDecor(f.field)))
    const names = formFields.map((f) => f.name)
    const order = []
    for (const n of seq) if ((names.includes(n) || cfg.sectionTitles.includes(n)) && !order.includes(n)) order.push(n)
    for (const n of names) if (!order.includes(n) && !cfg.docbarSkip.includes(n)) order.push(n)
    const byName = {}
    for (const f of formFields) byName[f.name] = f
    const out = [{ title: '', fields: [] }]
    for (const n of order) {
      if (cfg.sectionTitles.includes(n)) { out.push({ title: n, fields: [] }); continue }
      if (byName[n]) out[out.length - 1].fields.push(byName[n])
    }
    return out.filter((s) => s.fields.length).map((s) => ({ title: s.title, count: s.fields.length, fields: s.fields }))
  }

  /* ---------------- 页面字段集 ---------------- */
  const reqFromStar = cfg.requiredFrom.includes('star')
  const starSet = (doc) => new Set(((legacy[doc] || []) || []).filter((f) => f.star).map((f) => stripDecor(f.field)))
  const fieldSets = {}
  const log = []
  for (const p of spec.pages) {
    const all = spec.fields.filter((f) => f.pageId === p.id)
    if (!all.length) continue
    const doc = pageSource(p.id)
    const stars = reqFromStar && doc ? starSet(doc) : new Set()
    const req = (f) => f.required === true || stars.has(String(f.field))
    const mk = (f) => {
      const enums = parseEnums(f.rule)
      const t = typeOf(String(f.field), enums)
      return { label: String(f.field), type: t, align: alignOf(t), width: widthOf(f.field, t), enums, required: req(f) }
    }
    const at = (pos) => all.filter((f) => String(f.display || '') === pos)
    const formPos = uniq([...cfg.formIncludes, ...cfg.positions.form])
    const isForm = (f) => formPos.includes(String(f.display || ''))
    const query = at(cfg.positions.query).map(mk)
    const table = at(cfg.positions.table).map(mk)
    const line = at(cfg.positions.line).map(mk)
    const form = all.filter(isForm).map((f) => {
      const m = mk(f)
      return { name: String(f.field), type: m.type, enums: m.enums, required: m.required, block: blockOf(String(f.field)), src: srcOf(String(f.field)) }
    })
    const blocks = {}
    for (const f of form) (blocks[f.block] || (blocks[f.block] = [])).push(f.name)
    fieldSets[p.id] = {
      name: p.name,
      menu: p.menu || '',
      doc,
      query, table, form, line,
      required: all.filter(req).map((f) => String(f.field)),
      blocks,
      sections: doc ? buildSections(doc, form) : [{ title: '', count: form.length, fields: form }],
    }
    log.push({ id: p.id, name: p.name, doc, spec: { query: at(cfg.positions.query).length, table: at(cfg.positions.table).length, form: all.filter(isForm).length, line: at(cfg.positions.line).length }, got: { query: query.length, table: table.length, form: form.length, line: line.length } })
  }
  if (!Object.keys(fieldSets).length) die('规格里没有任何页面带字段，检查 fields[].pageId', 3)

  // 页面别名：详情/建单这类操作页没有自己的字段，指向所属单据的字段集
  for (const [alias, target] of Object.entries(cfg.pageAlias)) {
    if (!fieldSets[target]) { warn('pageAlias.' + alias + ' 指向的 ' + target + ' 没有字段集，已跳过'); continue }
    fieldSets[alias] = { ...fieldSets[target], aliasOf: target }
  }

  /* ---------------- 明细行列集（每类单据一套） ---------------- */
  const GROUP_RULES = (cfg.lineGroups || []).map(([g, src]) => [g, toRe(src, 'lineGroups.' + g)])
  const groupOf = (n) => { for (const [g, re] of GROUP_RULES) if (re.test(n)) return g; return '其他' }
  const lineColumns = {}
  const lineLog = []
  for (const ls of cfg.lineSets) {
    if (!ls.key || !ls.doc) { warn('lineSets 条目缺 key 或 doc，已跳过：' + JSON.stringify(ls)); continue }
    const raw = (legacy[ls.doc] || []).filter((f) => f.pos === cfg.positions.line)
    if (!raw.length) { warn('老系统字段里找不到「' + ls.doc + '」的「' + cfg.positions.line + '」，跳过列集 ' + ls.key); continue }
    const cols = []
    for (const f of raw) {
      const rawName = stripDecor(f.field)
      if (!rawName) continue
      const enums = f.enums ? String(f.enums).split(',').map((s) => s.trim()).filter(Boolean) : []
      for (const name of splitName(rawName)) {
        const t = typeOf(name, enums)
        cols.push({ key: name, label: name, type: t, align: alignOf(t), width: widthOf(name, t), enums: enums.length ? enums : null, group: groupOf(name) })
      }
    }
    for (const c of cols) if (cfg.defaultVisible.locked.includes(c.key)) c.locked = true
    const def = cols.filter((c) => c.locked).map((c) => c.key)
    for (const pref of cfg.defaultVisible.prefer) {
      const c = cols.find((x) => x.key === pref)
      if (c && !def.includes(c.key) && def.length < cfg.defaultVisible.max) def.push(c.key)
    }
    for (const [g] of GROUP_RULES) {
      for (const c of cols) {
        if (def.length >= cfg.defaultVisible.max) break
        if (c.group === g && !def.includes(c.key)) def.push(c.key)
      }
      if (def.length >= cfg.defaultVisible.max) break
    }
    lineColumns[ls.key] = { label: ls.label || ls.key, doc: ls.doc, pageId: ls.pageId || '', columns: cols, defaultVisible: def }
    lineLog.push({ key: ls.key, label: ls.label || ls.key, doc: ls.doc, cols: cols.length, def: def.length })
  }
  if (!Object.keys(lineColumns).length) warn('没有生成任何明细行列集（检查 config.lineSets 与老系统字段里的明细行字段）')

  /* ---------------- 写文件 ---------------- */
  const outDir = path.resolve(args.out)
  try { fs.mkdirSync(outDir, { recursive: true }) } catch (e) { die('无法创建产出目录：' + outDir + '（' + e.message + '）') }
  const banner = (what) =>
    '// ' + cfg.banner + ' —— ' + what + '\n'
    + '// 源：' + path.relative(outDir, path.resolve(args.spec)).split(path.sep).join('/') + (genDate ? '（' + genDate + '）' : '') + '\n'
    + '// 重新生成：' + cfg.generator + ' --spec <规格json> --legacy <老系统字段json> --out ' + path.relative(process.cwd(), outDir).split(path.sep).join('/') + '\n\n'
  const write = (file, body) => {
    const p = path.join(outDir, file)
    try { fs.writeFileSync(p, body, 'utf8') } catch (e) { die('写文件失败：' + p + '（' + e.message + '）') }
    return p
  }
  write('fieldSets.js', banner('页面字段集：' + Object.keys(fieldSets).length + ' 页') + 'export const FIELD_SETS = ' + JSON.stringify(fieldSets, null, 1) + '\n')
  write('lineColumns.js', banner('明细行可配置列：' + Object.keys(lineColumns).length + ' 套') + 'export const LINE_SETS = ' + JSON.stringify(lineColumns, null, 1) + '\n')

  /* ---------------- 生成日志（每页四类条数 vs 规格，供对账） ---------------- */
  const bad = log.filter((r) => Object.keys(r.spec).some((k) => r.spec[k] !== r.got[k]))
  const rows = []
  rows.push('# 生成日志（字段）', '', '> 规格：' + args.spec + '｜老系统字段：' + args.legacy + (genDate ? '｜规格日期：' + genDate : ''), '')
  rows.push('## 一、页面字段集（' + Object.keys(fieldSets).length + ' 页）', '')
  rows.push('| 页面ID | 页面名 | 来源文档 | query 规格/产出 | table 规格/产出 | form 规格/产出 | line 规格/产出 |', '| --- | --- | --- | --- | --- | --- | --- |')
  for (const r of log) rows.push('| ' + r.id + ' | ' + r.name + ' | ' + (r.doc || '—') + ' | ' + r.spec.query + '/' + r.got.query + ' | ' + r.spec.table + '/' + r.got.table + ' | ' + r.spec.form + '/' + r.got.form + ' | ' + r.spec.line + '/' + r.got.line + ' |')
  rows.push('', '四类条数与规格不一致的页面：' + (bad.length ? bad.map((r) => r.id).join('、') : '无（全部一致）'), '')
  rows.push('## 二、明细行列集（' + Object.keys(lineColumns).length + ' 套）', '')
  rows.push('| 列集 key | 名称 | 来源文档 | 列数 | 默认可见 |', '| --- | --- | --- | --- | --- |')
  for (const r of lineLog) rows.push('| ' + r.key + ' | ' + r.label + ' | ' + r.doc + ' | ' + r.cols + ' | ' + r.def + ' |')
  rows.push('')
  if (args.log) {
    try { fs.writeFileSync(path.resolve(args.log), rows.join('\n'), 'utf8') } catch (e) { die('写生成日志失败：' + args.log + '（' + e.message + '）') }
  }
  console.log('fieldSets.js  ' + Object.keys(fieldSets).length + ' 页｜lineColumns.js  ' + Object.keys(lineColumns).length + ' 套')
  for (const r of log) console.log('  ' + r.id.padEnd(14) + String(r.name).padEnd(10) + ' query ' + String(r.got.query).padStart(3) + ' | table ' + String(r.got.table).padStart(3) + ' | form ' + String(r.got.form).padStart(3) + ' | line ' + String(r.got.line).padStart(3) + ' | 段 ' + (fieldSets[r.id].sections.map((s) => (s.title || '前段') + ':' + s.count).join(' ') || '—'))
  for (const r of lineLog) console.log('  ' + r.key.padEnd(14) + String(r.label).padEnd(12) + String(r.cols).padStart(3) + ' 列，默认 ' + r.def)
  if (bad.length) warn('以下页面四类条数与规格不一致：' + bad.map((r) => r.id).join('、') + '（检查 positions / formIncludes 配置）')
  console.log('产出：' + path.join(outDir, 'fieldSets.js') + ' / ' + path.join(outDir, 'lineColumns.js'))
  return 0
}

process.exit(main())
