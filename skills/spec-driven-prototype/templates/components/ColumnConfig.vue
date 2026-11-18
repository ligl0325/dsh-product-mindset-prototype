<!--
  ColumnConfig.vue —— 列配置抽屉（列表页 / 明细行共用）
  【解决什么】原型必须能证明「几十上百列可配置」。本组件把列集做全选/反选/按组快选/拖拽排序/恢复默认，
              并且「固定列」永远勾不掉 —— 版式再怎么改，标识列都在。
  【用之前要改哪里】
    1. columns 必须由规格生成器产出（键 = 规格字段名）；分组字段 group 也由生成器给，别手写。
    2. 默认显示的列集由父组件给（props.defaultVisible），本组件不猜默认值。
    3. 持久化不在这里做：父组件（或 [LineTable.vue](./LineTable.vue) 的 storageKey）负责存取。
  【列项（columns 数组的元素）形状】
    key      string   列键，= 规格字段名，逐字一致，列表渲染与勾选都靠它
    label    string   列头文字
    locked   boolean  true = 固定列：抽屉里勾选框禁用、不能被取消、不能被反选/取消全选带走
    group    string   分组名（按组快选、抽屉里显示）；缺省归入「其他」
    width    number   列宽（本组件不用，透传给表格）
    align    string   'left' | 'center' | 'right'
    type     string   'text' | 'number' | 'money' | 'date' | 'enum'
  【排序规则】勾选/反选/按组快选之后，visible 一律按 columns 的原始顺序重排（normalize），
              只有手动拖拽会改顺序 —— 避免「同样的勾选集合、两次出现不同顺序」。
  【配套文件】[QueryBar.vue](./QueryBar.vue) · [FieldBlock.vue](./FieldBlock.vue) · [LineTable.vue](./LineTable.vue)
  【用在】[../pages/list.vue](../pages/list.vue) · [LineTable.vue](./LineTable.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :size="size"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="cc">
      <div class="cc-top">
        <el-input v-model="kw" size="small" placeholder="搜索列名 / 列键" clearable />
        <span class="cc-cnt">已显示 <b>{{ local.length }}</b> / {{ columns.length }}</span>
      </div>

      <div class="cc-ops">
        <el-button size="small" :type="allChecked ? 'default' : 'primary'" plain @click="toggleAll">
          {{ allChecked ? '取消全选' : '全选' }}
        </el-button>
        <el-button size="small" @click="invert">反选</el-button>
        <el-button size="small" text @click="resetAll">恢复默认</el-button>
      </div>

      <div v-if="groups.length > 1" class="cc-groups">
        <span class="cc-gl">按组：</span>
        <el-tag
          v-for="g in groups"
          :key="g.name"
          size="small"
          effect="plain"
          class="cc-gt"
          :type="groupFull(g) ? 'primary' : 'info'"
          @click="toggleGroup(g)"
        >
          {{ g.name }} {{ g.keys.filter((k) => local.includes(k)).length }}/{{ g.keys.length }}
        </el-tag>
      </div>

      <div class="cc-list">
        <div
          v-for="c in filtered"
          :key="c.key"
          class="cc-row"
          :class="{ 'is-fixed': c.locked }"
          draggable="true"
          @dragstart="onDragStart(c.key)"
          @dragover.prevent
          @drop="onDrop(c.key)"
          @dragend="dragKey = ''"
        >
          <span class="cc-grip" title="拖动排序">⠿</span>
          <el-checkbox
            :model-value="local.includes(c.key)"
            :disabled="!!c.locked"
            @update:model-value="(v) => toggle(c.key, v)"
          />
          <span class="cc-nm">{{ c.label }}</span>
          <span class="cc-gp">{{ c.group || '其他' }}</span>
          <span v-if="c.locked" class="cc-lock">固定</span>
        </div>
        <div v-if="!filtered.length" class="cc-empty">没有匹配的列（换个关键词，或清空搜索）</div>
      </div>

      <div class="cc-foot">
        <span class="cc-tip">拖动 ⠿ 调顺序 · 「固定」列不可取消 · 勾选即生效，无需点保存</span>
        <el-button size="small" type="primary" @click="emit('update:modelValue', false)">完成</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /** 抽屉开关，v-model */
  modelValue: { type: Boolean, default: false },
  /** 全量列项（形状见文件头注释） */
  columns: { type: Array, default: () => [] },
  /** 当前显示的列键，顺序即列顺序；v-model:visible */
  visible: { type: Array, default: () => [] },
  /** 恢复默认时回抛给父组件的默认列集（只读，不在本组件内生效） */
  defaultVisible: { type: Array, default: () => [] },
  /** 抽屉标题 */
  title: { type: String, default: '列配置' },
  /** 抽屉宽度 */
  size: { type: String, default: '400px' }, /* 占位：按列名长度改（列名长的页面给 420px 以上） */
})
const emit = defineEmits(['update:modelValue', 'update:visible', 'reset'])

/* 占位：搜索关键词。列名有别名/简称时，改成按「别名 -> 列键」的映射表匹配 */
const kw = ref('')
const local = ref(props.visible.slice())
const dragKey = ref('')
watch(
  () => props.visible,
  (v) => { local.value = Array.isArray(v) ? v.slice() : [] },
  { deep: true },
)

const allKeys = computed(() => props.columns.map((c) => c.key))
const lockedKeys = computed(() => props.columns.filter((c) => c.locked).map((c) => c.key))
const filtered = computed(() => {
  const k = kw.value.trim()
  if (!k) return props.columns
  return props.columns.filter((c) => String(c.label || '').includes(k) || String(c.key).includes(k))
})
const allChecked = computed(
  () => filtered.value.length > 0 && filtered.value.every((c) => local.value.includes(c.key)),
)
// 统一重排：集合 -> 按 columns 原顺序的键数组（columns 里已删除的键会被丢掉）
const normalize = (set) => {
  const out = allKeys.value.filter((k) => set.has(k))
  for (const k of local.value) if (!allKeys.value.includes(k) && set.has(k)) out.push(k)
  return out
}
const sync = () => emit('update:visible', local.value.slice())

const toggle = (key, on) => {
  const set = new Set(local.value)
  if (on) set.add(key)
  else if (!lockedKeys.value.includes(key)) set.delete(key)
  local.value = normalize(set)
  sync()
}
// 全选 / 取消全选：作用于「搜索过滤后的列」，固定列永远保留
const toggleAll = () => {
  const keys = filtered.value.map((c) => c.key)
  const set = new Set(local.value)
  if (allChecked.value) {
    for (const k of keys) if (!lockedKeys.value.includes(k)) set.delete(k)
  } else {
    for (const k of keys) set.add(k)
  }
  local.value = normalize(set)
  sync()
}
// 反选：固定列保持选中
const invert = () => {
  const set = new Set(local.value)
  for (const c of filtered.value) {
    if (c.locked) { set.add(c.key); continue }
    if (set.has(c.key)) set.delete(c.key)
    else set.add(c.key)
  }
  local.value = normalize(set)
  sync()
}
// 分组：用于按组快选；进来就最少勾一列的场景，由父组件在 defaultVisible 里给
const groups = computed(() => {
  const out = []
  for (const c of props.columns) {
    const name = c.group || '其他'
    let g = out.find((x) => x.name === name)
    if (!g) { g = { name, keys: [] }; out.push(g) }
    g.keys.push(c.key)
  }
  return out
})
const groupFull = (g) => g.keys.every((k) => local.value.includes(k))
const toggleGroup = (g) => {
  const set = new Set(local.value)
  if (groupFull(g)) {
    for (const k of g.keys) if (!lockedKeys.value.includes(k)) set.delete(k)
  } else {
    for (const k of g.keys) set.add(k)
  }
  local.value = normalize(set)
  sync()
}
// 恢复默认：本组件不自己重置，回抛给父组件改 visible，watch 再同步 local
const resetAll = () => emit('reset')

const onDragStart = (key) => { dragKey.value = key }
const onDrop = (target) => {
  const from = dragKey.value
  dragKey.value = ''
  if (!from || from === target) return
  const arr = local.value.slice()
  const i = arr.indexOf(from)
  const j = arr.indexOf(target)
  if (i < 0 || j < 0) return
  arr.splice(j, 0, arr.splice(i, 1)[0])
  local.value = arr
  sync()
}
</script>

<style scoped>
.cc { display: flex; flex-direction: column; height: 100%; }
.cc-top { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; }
.cc-cnt { font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); white-space: nowrap; }
.cc-ops { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--c-line, #e5e7eb); }
.cc-groups { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px dashed var(--c-line2, #eef0f2); }
.cc-gl { font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
.cc-gt { cursor: pointer; user-select: none; }
.cc-list { flex: 1; overflow: auto; padding: 4px 0; }
.cc-row { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px dashed var(--c-line2, #eef0f2); cursor: grab; }
.cc-row:hover { background: var(--c-primary-weak, #f5f8ff); }
.cc-row.is-fixed { background: #fafafa; }
.cc-grip { color: var(--c-ink3, #9ca3af); font-size: 12px; }
.cc-nm { flex: 1; font-size: var(--fs-body, 14px); }
.cc-gp { font-size: 11px; color: var(--c-ink3, #9ca3af); }
.cc-lock { font-size: 11px; color: var(--c-primary, #2563eb); border: 1px solid var(--c-primary-line, #bfdbfe); border-radius: 3px; padding: 0 4px; }
.cc-empty { padding: 24px; text-align: center; color: var(--c-ink3, #9ca3af); font-size: var(--fs-hint, 12px); }
.cc-foot { display: flex; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid var(--c-line, #e5e7eb); }
.cc-tip { flex: 1; font-size: 11px; color: var(--c-ink3, #9ca3af); }
</style>
