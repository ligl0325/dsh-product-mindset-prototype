<!--
  QueryBar.vue —— 列表页顶部的「可折叠查询条」
  【解决什么】列表页字段动辄上百个，全铺开挤占表格空间；只铺前 N 个又丢条件。
              本组件把查询条件做成「默认 N 个 + 更多筛选」，字段只来自规格，不在这里硬编码。
  【用之前要改哪里】
    1. 字段数组（fields）由规格生成器产出，不要手写；核对 props.fields 的字段名与规格 JSON 逐字一致。
    2. 若字段项的 type/enums 名字不同，改下面的 TYPE_ENUM / isEnum()，别改模板。
    3. CSS 变量有兜底值（var(--x, #xxx)）；接了设计令牌就删掉兜底值。
  【字段项（fields 数组的元素）形状】
    key       string   字段名，与规格 JSON 的 field 逐字一致；查询参数用它做键
    label     string   界面文字；缺省用 key
    type      string   'text' | 'number' | 'money' | 'date' | 'enum'，默认 'text'
    enums     string[] type='enum' 时的取值（来自规格的「枚举：a,b,c」原文，顺序不要重排）
    required  boolean  必填（查询条一般不用，留给表单）
  【配套文件】[FieldBlock.vue](./FieldBlock.vue) · [LineTable.vue](./LineTable.vue) · [ColumnConfig.vue](./ColumnConfig.vue)
  【用在】[../pages/list.vue](../pages/list.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="qb">
    <div class="qb-grid" :style="{ '--qb-cols': String(cols) }">
      <div v-for="f in shownFields" :key="keyOf(f)" class="qb-item">
        <label :title="labelOf(f)">{{ labelOf(f) }}</label>
        <el-select
          v-if="isEnum(f)"
          :model-value="valOf(f)"
          size="small"
          clearable
          filterable
          placeholder="全部"
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
          placeholder="不限"
          style="width: 100%"
          @update:model-value="(v) => setValue(keyOf(f), v || '')"
        />
        <el-input
          v-else
          :model-value="valOf(f)"
          size="small"
          clearable
          placeholder="不限"
          @update:model-value="(v) => setValue(keyOf(f), v)"
        />
      </div>
    </div>

    <div class="qb-bar">
      <el-button size="small" type="primary" @click="emit('search', { ...modelValue })">查询</el-button>
      <el-button size="small" @click="onReset">重置</el-button>
      <el-button
        v-if="collapsible && fields.length > max"
        size="small"
        link
        type="primary"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : '更多筛选 (' + (fields.length - max) + ')' }}
      </el-button>
      <span class="qb-cnt">共 {{ fields.length }} 个查询条件 · 已填 {{ filledCount }}</span>
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** 查询条件字段项（形状见文件头注释） */
  fields: { type: Array, default: () => [] },
  /** 查询值对象，键 = 字段 key；v-model 双向 */
  modelValue: { type: Object, default: () => ({}) },
  /** 默认展示的条件个数，超出部分进「更多筛选」 */
  max: { type: Number, default: 6 }, /* 占位：按页面条件数改，保证表格首屏不被挤掉 */
  /** 是否允许折叠（条件数 <= max 时不显示按钮） */
  collapsible: { type: Boolean, default: true },
  /** 每行条件列数，窄屏由 CSS 媒体查询继续降列 */
  cols: { type: Number, default: 4 },
})
const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const expanded = ref(false)
const keyOf = (f) => f.key || f.label || f.name
const labelOf = (f) => f.label || f.key || f.name || ''
const valOf = (f) => {
  const v = props.modelValue[keyOf(f)]
  return v === undefined || v === null ? '' : v
}
/* 占位：枚举判定 —— type='enum' 或带 enums 的字段都渲染成下拉；
   字段集里的 type 命名不同（例：数字型控件代号）时，只改这一处，不要动模板 */
const isEnum = (f) => f.type === 'enum' || (Array.isArray(f.enums) && f.enums.length > 0)
const setValue = (key, v) => emit('update:modelValue', { ...props.modelValue, [key]: v })
const onReset = () => {
  emit('update:modelValue', {})
  emit('reset')
}

const shownFields = computed(() => (expanded.value ? props.fields : props.fields.slice(0, props.max)))
const filledCount = computed(() => {
  let n = 0
  for (const f of props.fields) {
    const v = props.modelValue[keyOf(f)]
    if (v !== undefined && v !== null && v !== '') n += 1
  }
  return n
})
</script>

<style scoped>
.qb { background: #fff; border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); padding: 12px 14px 10px; margin-bottom: 10px; }
.qb-grid { display: grid; grid-template-columns: repeat(var(--qb-cols, 4), minmax(0, 1fr)); gap: 8px 14px; }
.qb-item { display: flex; align-items: center; gap: 8px; min-width: 0; }
.qb-item label { width: 96px; flex: none; text-align: right; font-size: var(--fs-hint, 12px); color: var(--c-ink2, #4b5563); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qb-bar { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.qb-cnt { margin-left: auto; font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
@media (max-width: 1400px) { .qb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1080px) { .qb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
