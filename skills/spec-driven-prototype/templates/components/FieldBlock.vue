<!--
  FieldBlock.vue —— 详情页 / 建单页的「分组折叠表单块」
  【解决什么】一个单据上百个字段，平铺没法看。按业务分组折叠成块，只读态与可编辑态同一套结构，
              字段名与枚举来自规格，不看代码也能核对「界面 = 规格」。
  【用之前要改哪里】
    1. 分组名和分组内的字段由规格生成器产出（分组规则写在生成器里，不写在本组件）。
    2. 字段项形状同 [QueryBar.vue](./QueryBar.vue)；来源标识 src 的取值改 SRC_MAP 一处即可。
    3. 只读态的空值占位「—」在 TEMPLATE.empty 里改。
  【只读 / 可编辑两态】
    editable = false（默认）：纯展示，字段值直接取自 modelValue，不做二次格式化（金额格式化见 moneyText）。
    editable = true：渲染输入控件，改动通过 update:modelValue 回抛，父组件持有真值。
  【来源三类】口径取「外部引用 / 本单录入 / 系统计算」（界面上用短标识：引用 / 录入 / 系统）。
  【配套文件】[QueryBar.vue](./QueryBar.vue) · [LineTable.vue](./LineTable.vue) · [ColumnConfig.vue](./ColumnConfig.vue)
  【用在】[../pages/detail.vue](../pages/detail.vue) · [../pages/create.vue](../pages/create.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="fb">
    <div class="fb-h" @click="open = !open">
      <span class="fb-arr">{{ open ? '▾' : '▸' }}</span>
      <span class="fb-ttl">{{ title }}</span>
      <span class="fb-n">{{ fields.length }}</span>
      <span class="fb-hint">{{ editable ? '可编辑' : '只读' }}</span>
    </div>

    <div v-show="open" class="fb-b">
      <div class="fb-grid" :style="{ '--fb-cols': String(cols) }">
        <div
          v-for="f in fields"
          :key="keyOf(f)"
          class="fb-cell"
          :class="{ 'is-wide': spanOf(f) > 1 }"
          :style="{ gridColumn: 'span ' + spanOf(f) }"
        >
          <label :title="labelOf(f)">
            <span v-if="f.required" class="fb-req">*</span>{{ labelOf(f) }}
          </label>
          <span v-if="showSrc" class="fb-badge" :class="'is-' + (f.src || 'input')">{{ srcText(f) }}</span>

          <template v-if="!editable || f.readonly">
            <span class="fb-val" :class="{ 'is-empty': isEmpty(f) }">{{ showValue(f) }}</span>
          </template>
          <el-select
            v-else-if="isEnum(f)"
            :model-value="valOf(f)"
            size="small"
            clearable
            placeholder="请选择"
            style="flex: 1"
            @update:model-value="(v) => setValue(keyOf(f), v === null || v === undefined ? '' : v)"
          >
            <el-option v-for="e in f.enums" :key="e" :label="e" :value="e" />
          </el-select>
          <el-date-picker
            v-else-if="f.type === 'date'"
            :model-value="valOf(f)"
            size="small"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择"
            style="flex: 1"
            @update:model-value="(v) => setValue(keyOf(f), v || '')"
          />
          <el-input
            v-else
            :model-value="valOf(f)"
            size="small"
            :placeholder="f.required ? '必填' : ''"
            style="flex: 1"
            @update:model-value="(v) => setValue(keyOf(f), v)"
          />
        </div>
        <div v-if="!fields.length" class="fb-empty">本组没有字段（规格里这一组为空，请核对生成器）</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  /** 分组标题，取规格里该区块的名字 */
  title: { type: String, default: '___区块名___' },
  /** 本组字段项（形状见 QueryBar.vue 文件头） */
  fields: { type: Array, default: () => [] },
  /** 字段值对象，键 = 字段 key；v-model 双向 */
  modelValue: { type: Object, default: () => ({}) },
  /** false = 只读展示；true = 可编辑 */
  editable: { type: Boolean, default: false },
  /** 初始是否展开 */
  defaultOpen: { type: Boolean, default: true },
  /** 每行列数 */
  cols: { type: Number, default: 3 },
  /** 是否显示字段来源标识（引用 / 录入 / 系统），建单页开，详情页关 */
  showSrc: { type: Boolean, default: false }, /* 占位：按页面需要改默认值 */
})
const emit = defineEmits(['update:modelValue', 'toggle'])

const open = ref(props.defaultOpen)
/* 占位：来源标识映射 —— 左边是字段集里的 src 取值（取规格生成器的输出），右边是原型上的文字。
   生成器若用了别的写法，只改这里一处。只在界面上留标识，规则不要写进原型。 */
const SRC_MAP = {
  ref: '引用',
  input: '录入',
  derived: '系统',
}
/* 占位：只读态的空值占位符（空值 = 没数据，与「数据在别处」含义不同，别混用） */
const TEMPLATE = { empty: '—' }
const keyOf = (f) => f.key || f.label || f.name
const labelOf = (f) => f.label || f.key || f.name || ''
const spanOf = (f) => (f.span && f.span > 1 ? Math.min(f.span, props.cols) : 1)
const isEnum = (f) => f.type === 'enum' || (Array.isArray(f.enums) && f.enums.length > 0)
const srcText = (f) => SRC_MAP[f.src] || ''
const rawVal = (f) => props.modelValue[keyOf(f)]
const valOf = (f) => {
  const v = rawVal(f)
  return v === undefined || v === null ? '' : v
}
const isEmpty = (f) => valOf(f) === ''
const moneyText = (v) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const showValue = (f) => {
  if (isEmpty(f)) return TEMPLATE.empty
  const v = valOf(f)
  if (f.type === 'money' && !isNaN(Number(v))) return moneyText(v)
  return String(v)
}
const setValue = (key, v) => emit('update:modelValue', { ...props.modelValue, [key]: v })
</script>

<style scoped>
.fb { border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); margin-bottom: 8px; background: #fff; }
.fb-h { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; background: #fafbfc; border-radius: var(--r, 8px) var(--r, 8px) 0 0; }
.fb-arr { color: var(--c-ink3, #9ca3af); font-size: 11px; width: 10px; }
.fb-ttl { font-size: var(--fs-body, 14px); font-weight: 600; }
.fb-n { font-size: 11px; color: var(--c-ink3, #9ca3af); border: 1px solid var(--c-line, #e5e7eb); border-radius: 8px; padding: 0 6px; }
.fb-hint { margin-left: auto; font-size: 11px; color: var(--c-ink3, #9ca3af); }
.fb-b { padding: 10px 12px 4px; }
.fb-grid { display: grid; grid-template-columns: repeat(var(--fb-cols, 3), minmax(0, 1fr)); gap: 8px 16px; }
.fb-cell { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.fb-cell label { width: 132px; flex: none; text-align: right; font-size: var(--fs-hint, 12px); color: var(--c-ink2, #4b5563); line-height: 1.4; padding-top: 3px; word-break: break-all; }
.fb-req { color: var(--c-danger, #dc2626); margin-right: 2px; }
.fb-val { flex: 1; font-size: var(--fs-body, 14px); color: var(--c-ink, #111827); line-height: 1.4; padding-top: 2px; word-break: break-all; }
.fb-val.is-empty { color: var(--c-ink3, #9ca3af); }
.fb-badge { flex: none; margin-top: 3px; font-size: 10px; line-height: 16px; padding: 0 5px; border-radius: 3px; border: 1px solid var(--c-line, #e5e7eb); color: var(--c-ink3, #6b7280); background: #f9fafb; }
.fb-badge.is-ref { color: #1d4ed8; border-color: #bfdbfe; background: #eff6ff; }
.fb-badge.is-input { color: #b45309; border-color: #fde68a; background: #fffbeb; }
.fb-badge.is-derived { color: #6b7280; border-color: #e5e7eb; background: #f9fafb; }
.fb-empty { grid-column: 1 / -1; color: var(--c-ink3, #9ca3af); font-size: var(--fs-hint, 12px); padding: 6px 0; }
@media (max-width: 1400px) { .fb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
