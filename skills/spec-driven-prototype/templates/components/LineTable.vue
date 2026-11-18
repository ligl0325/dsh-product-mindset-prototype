<!--
  LineTable.vue —— 可配置明细行表格（详情页只读 / 建单页可编辑共用）
  【解决什么】明细行是这个系统的重头戏：列多（几十列）、要能配置、要能就地录入、要能删行。
              本组件把「列集 -> 表格」这条链路固定下来：列只来自规格，版式由用户配，固定列不许改。
  【用之前要改哪里】
    1. columns 由规格生成器产出（键 = 规格明细行字段名，逐字一致）；defaultVisible 由生成器给默认列集。
    2. 需要持久化时传 storageKey（一页一个键，例：'proto.tableCols.___PAGE_ID___'）；不需要就别传。
    3. 「系统计算列」在编辑态要保持只读：在列项上写 editable: false（金额小计、已出货数量这类）。
    4. 金额/日期格式化只在本组件做一次；不要在页面里再 format 一遍。
  【列项形状】同 [ColumnConfig.vue](./ColumnConfig.vue) 文件头；
              editable: false 表示该列在任何情况下都只读展示。
  【v-model】visible（列键数组，顺序 = 列顺序）· rows（行数据数组）
  【配套文件】[ColumnConfig.vue](./ColumnConfig.vue) · [QueryBar.vue](./QueryBar.vue) · [FieldBlock.vue](./FieldBlock.vue)
  【用在】[../pages/detail.vue](../pages/detail.vue) · [../pages/create.vue](../pages/create.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="lt">
    <div class="lt-bar">
      <span class="lt-ttl">{{ title }}</span>
      <span class="lt-cnt">已显示 {{ shown.length }} / {{ columns.length }} 列 · {{ rows.length }} 行</span>
      <el-button size="small" @click="cfgOpen = true">列配置</el-button>
      <el-button v-if="editable" size="small" type="primary" @click="addRow">＋ 添加行</el-button>
      <slot name="extra" />
      <span v-if="summary && sumText" class="lt-sum">{{ sumText }}</span>
    </div>

    <el-table
      :data="rows"
      size="small"
      border
      :height="height"
      :row-key="rowKey"
      class="lt-tb"
    >
      <el-table-column v-if="showIndex" type="index" label="行号" width="60" align="center" fixed="left" />
      <el-table-column
        v-for="c in shown"
        :key="c.key"
        :prop="c.key"
        :label="c.label"
        :width="c.width"
        :align="c.align || 'left'"
        :fixed="c.locked ? 'left' : false"
      >
        <template #default="{ row, $index }">
          <el-input
            v-if="editable && c.editable !== false"
            :model-value="cell(row, c.key)"
            size="small"
            :placeholder="c.label"
            @update:model-value="(v) => setCell($index, c.key, v)"
          />
          <el-tag v-else-if="c.type === 'enum' && cell(row, c.key)" size="small" effect="plain">
            {{ cell(row, c.key) }}
          </el-tag>
          <span v-else :class="{ 'lt-empty': isEmpty(row, c) }">{{ text(row, c) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="editable && deletable" label="操作" width="70" align="center" fixed="right">
        <template #default="{ $index }">
          <el-button link type="danger" size="small" @click="delRow($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <ColumnConfig
      v-model="cfgOpen"
      :columns="columns"
      :visible="visibleKeys"
      :default-visible="defaultVisible"
      @update:visible="applyVisible"
      @reset="resetCols"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ColumnConfig from './ColumnConfig.vue'

const props = defineProps({
  /** 表格标题（例：明细行） */
  title: { type: String, default: '明细行' },
  /** 全量列项（必填，形状见 ColumnConfig.vue 文件头） */
  columns: { type: Array, required: true },
  /** 当前显示列键，v-model:visible；传空则按 storageKey -> defaultVisible -> 前 12 列回退 */
  visible: { type: Array, default: () => [] },
  /** 恢复默认时用的列集（由规格生成器给） */
  defaultVisible: { type: Array, default: () => [] },
  /** 行数据，v-model:rows */
  rows: { type: Array, default: () => [] },
  /** true = 单元格可录入 + 可增删行 */
  editable: { type: Boolean, default: false },
  /** 行的唯一键字段名（表格 row-key；没有唯一键时可用 'row' 由父组件补） */
  rowKey: { type: String, default: 'id' }, /* 占位：行键字段名按数据接口改 */
  /** 是否显示行号列 */
  showIndex: { type: Boolean, default: true },
  /** 版式持久化的 localStorage 键；空字符串 = 不持久化 */
  storageKey: { type: String, default: '' },
  /** 是否在工具条显示合计（对 type=number / money 的列求和） */
  summary: { type: Boolean, default: true },
  /** 表格高度，'100%' 时需父容器有确定高度（配合 flex: 1; min-height: 0） */
  height: { type: [String, Number], default: '100%' },
  /** 是否允许删行（仅 editable 时生效） */
  deletable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:visible', 'update:rows', 'row-add', 'row-delete', 'cell-change', 'reset'])

const cfgOpen = ref(false)
/* 占位：没给 defaultVisible 时的兜底列集 —— 12 是经验值（超过一屏就没法看了）。
   正式用法必须由规格生成器给 defaultVisible（标识列 + 关键数量列优先），别靠这里的兜底。 */
const fallbackKeys = () => props.columns.slice(0, 12).map((c) => c.key)
// 非浏览器环境（SSR / 单测）与隐私模式下 localStorage 可能不可用，先判断再读
const hasLS = () => typeof localStorage !== 'undefined'
const stored = () => {
  if (!props.storageKey || !hasLS()) return null
  try {
    const raw = localStorage.getItem(props.storageKey)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) && v.length ? v : null
  } catch (e) {
    return null
  }
}
const initialKeys = () => {
  if (props.visible.length) return props.visible.slice()
  const s = stored()
  if (s) return s
  if (props.defaultVisible.length) return props.defaultVisible.slice()
  return fallbackKeys()
}
const visibleKeys = ref(initialKeys())

watch(
  () => props.visible,
  (v) => {
    if (Array.isArray(v) && v.length && v.join('|') !== visibleKeys.value.join('|')) visibleKeys.value = v.slice()
  },
)
const persist = (arr) => {
  if (!props.storageKey || !hasLS()) return
  try { localStorage.setItem(props.storageKey, JSON.stringify(arr)) } catch (e) { /* 原型：配额满/隐私模式忽略 */ }
}
const applyVisible = (v) => {
  visibleKeys.value = v.slice()
  persist(v)
  emit('update:visible', v.slice())
}
const resetCols = () => {
  applyVisible(props.defaultVisible.length ? props.defaultVisible.slice() : fallbackKeys())
  emit('reset')
}
// 显示的列 = 列键顺序在 columns 里查表（查不到的键丢弃，列被删掉不会留空列）
const shown = computed(() => {
  const out = []
  for (const k of visibleKeys.value) {
    const c = props.columns.find((x) => x.key === k)
    if (c) out.push(c)
  }
  return out
})

const cell = (row, key) => {
  const v = row ? row[key] : ''
  return v === undefined || v === null ? '' : v
}
const isEmpty = (row, c) => cell(row, c.key) === ''
const money = (v) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const text = (row, c) => {
  const v = cell(row, c.key)
  if (v === '') return '—'
  if (c.type === 'money' && !isNaN(Number(v))) return money(v)
  return String(v)
}
const sumText = computed(() => {
  const parts = []
  for (const c of shown.value) {
    if (c.type !== 'number' && c.type !== 'money') continue
    const total = props.rows.reduce((a, r) => a + (isNaN(Number(cell(r, c.key))) ? 0 : Number(cell(r, c.key))), 0)
    parts.push(c.label + ' ' + (c.type === 'money' ? money(total) : total))
  }
  return parts.length ? '合计：' + parts.join(' · ') : ''
})

const blankRow = () => {
  const o = {}
  for (const c of props.columns) o[c.key] = ''
  return o
}
const addRow = () => {
  const row = blankRow()
  emit('update:rows', props.rows.concat([row]))
  emit('row-add', row)
}
const delRow = (index) => {
  const next = props.rows.slice()
  const [row] = next.splice(index, 1)
  emit('update:rows', next)
  emit('row-delete', { index, row })
}
const setCell = (index, key, value) => {
  const next = props.rows.map((r, i) => (i === index ? { ...r, [key]: value } : r))
  emit('update:rows', next)
  emit('cell-change', { index, key, value })
}
</script>

<style scoped>
.lt { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.lt-bar { display: flex; align-items: center; gap: 8px; padding: 0 0 8px; flex-wrap: wrap; }
.lt-ttl { font-size: var(--fs-card, 15px); font-weight: 600; }
.lt-cnt { font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
.lt-sum { margin-left: auto; font-size: var(--fs-hint, 12px); color: var(--c-ink2, #4b5563); }
.lt-tb { flex: 1; min-height: 0; }
.lt-empty { color: var(--c-ink3, #9ca3af); }
</style>
