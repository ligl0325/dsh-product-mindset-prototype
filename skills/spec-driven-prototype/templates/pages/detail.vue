<!--
  detail.vue —— 详情页模板（页头三轨状态 → KPI 条 → 信息行 → 页签 → 执行记录）
  【解决什么】把「一页单据」的信息密度安排明白：状态在页头一次看全（三轨分开写），
              关键数量进 KPI 条，字段进分组折叠块，明细行进可配置表格，操作留痕进执行记录。
  【用之前要改哪里】
    1. PAGE_ID / 页头取值：编号、三轨状态、右上动作按钮。
    2. TRACKS / KPIS / INFO_ROWS 换成规格里对应页面的字段（三轨不是拼一个状态，是三条独立轨迹）。
    3. BLOCKS 换成生成器的分组（例：FIELD_SETS[PAGE_ID].blocks），字段名逐字一致。
    4. 明细行的 columns / defaultVisible 由生成器的明细行字段集给。
    5. 接口未通时该环节标「数据在 ___下游系统___」，不要留空值（空值 = 没数据，两者含义不同）。
  【硬约定】
    · 编号 + 三轨状态 + 动作 必须在页头同一行，滚动时不用回滚看状态。
    · 明细行用 [../components/LineTable.vue](../components/LineTable.vue)（只读态），不要在详情页自己写 el-table。
    · 页签而不是无限往下堆：基本信息 / 明细行 / ___附加页签___ / 执行记录。
    · 只读字段由 [../components/FieldBlock.vue](../components/FieldBlock.vue) 的 editable=false 渲染。
  【依赖】[../components/FieldBlock.vue](../components/FieldBlock.vue) · [../components/LineTable.vue](../components/LineTable.vue)
  【同族】[list.vue](./list.vue) · [create.vue](./create.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="page">
    <!-- 四态：加载 / 失败 / 无权限 / 单据不存在。四态必须齐全，别只做「单据不存在」 -->
    <div v-if="state === 'loading'" class="hint">加载中…（骨架屏或 el-skeleton）</div>
    <div v-else-if="state === 'denied'" class="hint">无权限查看该单据（权限矩阵：___角色___）</div>
    <div v-else-if="state === 'error'" class="hint">
      加载失败：___错误摘要___
      <el-button link type="primary" @click="load">重试</el-button>
    </div>
    <el-empty v-else-if="!found" description="单据不存在或已删除（单号 ___）" />
    <template v-else>
    <!-- 页头：编号 + 三轨状态 + 动作 -->
    <div class="phead">
      <div class="ph-l">
        <h1 class="ph-ttl">{{ doc.___编号字段___ || '—' }}</h1>
        <span class="tracks">
          <span v-for="t in TRACKS" :key="t.label" class="tk">
            <em>{{ t.label }}</em>
            <b :class="{ 'is-warn': t.warn }">{{ t.value || '—' }}</b>
          </span>
          <span v-for="f in FLAGS" :key="f.text" class="fl" :class="{ red: f.red }">{{ f.text }}</span>
        </span>
      </div>
      <div class="ph-r">
        <el-button v-for="a in ACTIONS" :key="a.text" size="small" :type="a.primary ? 'primary' : 'default'" @click="a.run">
          {{ a.text }}
        </el-button>
      </div>
    </div>

    <!-- KPI 条：数量类信息（已安排 / 已下单 / 已发货 / 未发 / 已签收 / 已回款 …） -->
    <div class="kstrip">
      <div v-for="k in KPIS" :key="k.label" class="ks">
        <span class="k">{{ k.label }}</span>
        <span class="v" :class="{ 'is-red': k.warn }">{{ k.value }}</span>
        <span v-if="k.unit" class="u">{{ k.unit }}</span>
        <span v-if="k.note" class="warn">{{ k.note }}</span>
      </div>
      <div class="ks tail">
        <el-link type="primary" :underline="false" @click="more = !more">{{ more ? '收起信息' : '更多信息' }}</el-link>
      </div>
    </div>

    <!-- 信息行：一眼看的字段 + 每个值的来源系统（来源不同，出错时找谁修不同） -->
    <div class="page-card info">
      <div class="irow">
        <template v-for="r in INFO_ROWS" :key="r.label">
          <span class="ik">{{ r.label }}</span>
          <b :class="{ mut: r.mut }">{{ r.value || '—' }}</b>
        </template>
      </div>
      <div v-show="more" class="irow wrap">
        <template v-for="r in INFO_ROWS_MORE" :key="r.label">
          <span class="ik">{{ r.label }}</span>
          <b :class="{ mut: r.mut }">{{ r.value || '—' }}</b>
        </template>
      </div>
    </div>

    <div class="page-card mt">
      <el-tabs v-model="tab" class="dt-tabs">
        <el-tab-pane name="info">
          <template #label>基本信息<span class="tb">{{ BLOCKS.length }}</span></template>
          <div class="pane">
            <FieldBlock
              v-for="b in BLOCKS"
              :key="b.title"
              :title="b.title"
              :fields="b.fields"
              :model-value="doc"
              :editable="false"
              :default-open="true"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane name="lines">
          <template #label>明细行<span class="tb">{{ lines.length }}</span></template>
          <div class="pane pane-lines">
            <LineTable
              v-model:rows="lines"
              :columns="LINE_COLUMNS"
              :default-visible="DEFAULT_LINE_VISIBLE"
              :title="'___明细行标题___'"
              :row-key="'id'"
              :editable="false"
              :summary="true"
              :storage-key="'proto.lineCols.' + PAGE_ID"
            >
              <template #extra>
                <span class="lt-tip">列来自来源系统「___单据名___」明细行 · 勾选/拖拽即改版式</span>
              </template>
            </LineTable>
          </div>
        </el-tab-pane>

        <el-tab-pane label="___附加页签___" name="extra">
          <div class="pane">
            <!-- 占位：写清这个页签回答什么问题（额度 / 附件 / 关联单），没有就删掉这个页签 -->
            <el-alert type="info" :closable="false" show-icon title="___附加页签内容占位___" />
          </div>
        </el-tab-pane>

        <el-tab-pane name="events">
          <template #label>执行记录<span class="tb">{{ events.length }}</span></template>
          <div class="pane">
            <el-timeline>
              <el-timeline-item v-for="e in events" :key="e.time" :timestamp="e.time" :type="e.type">
                <b>{{ e.title }}</b>
                <div class="ev">{{ e.desc }}</div>
              </el-timeline-item>
            </el-timeline>
            <div v-if="!events.length" class="hint">暂无执行记录</div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FieldBlock from '../components/FieldBlock.vue'
import LineTable from '../components/LineTable.vue'

const PAGE_ID = '___PAGE_ID___' // 例：'a8-1-2'（举例）

/* ---------- 占位：三轨状态。三条轨迹分开，不要合成一个「状态」------------
   审批轨：草稿 / 审核中 / 审核通过（来源系统只管理这三个）
   签单轨：签单状态是枚举字段，不是状态机，取值按规格原文列全
   履约轨：履约状态由本系统自己派生（来源系统不管履约）
   ---------------------------------------------------------------------- */
const TRACKS = [
  { label: '审批', value: '___审批状态___', warn: false },
  { label: '签单', value: '___签单状态___', warn: false },
  { label: '履约', value: '___履约状态___', warn: false },
]
const FLAGS = [{ text: '___标记___', red: false }]
const ACTIONS = [
  { text: '___动作A___', primary: false, run: () => ___动作A处理___() },
  { text: '___主动作___', primary: true, run: () => ___主动作处理___() },
]

/* ---------- 占位：KPI 条 ---------- */
const KPIS = [
  { label: '___KPI1___', value: '___值1___', unit: '台', warn: false, note: '' },
  { label: '___KPI2___', value: '___值2___', unit: '台', warn: false, note: '' },
  { label: '___KPI3___', value: '___值3___', unit: '台', warn: true, note: '___未计入说明___' },
]

/* ---------- 占位：信息行（常显 / 展开两段） ---------- */
const INFO_ROWS = [
  { label: '___锚点对象___', value: '___名称（编号）___' },
  { label: '来源合同', value: '___合同编号（版本）___' },
  { label: '数据来源', value: '客户/项目来自 ___来源A___ · 合同来自 ___来源B___ · 料号来自 ___来源C___', mut: true },
]
const INFO_ROWS_MORE = [
  { label: '___更多字段___', value: '___值___' },
  { label: '销售归属（实际）', value: '___下单时快照___', mut: true },
  { label: '___系统计算字段___', value: '___值___', mut: true },
]

/* ---------- 占位：分组折叠块（由生成器的 blocks 产出，字段名逐字一致） ---------- */
const BLOCKS = [
  {
    title: '___区块名___',
    fields: [
      { key: '___字段名A___', label: '___字段名A___', type: 'text' },
      { key: '___字段名B___', label: '___字段名B___', type: 'money' },
      { key: '___字段名C___', label: '___字段名C___', type: 'date' },
    ],
  },
]

/* ---------- 占位：明细行列集（由生成器的明细行字段集给） ---------- */
const LINE_COLUMNS = [
  { key: '___行字段A___', label: '___行字段A___', type: 'text', width: 150, locked: true, group: '基础' },
  { key: '___行字段B___', label: '___行字段B___', type: 'number', width: 88, align: 'right', group: '数量' },
  { key: '___行字段C___', label: '___行字段C___', type: 'money', width: 116, align: 'right', group: '价格' },
]
const DEFAULT_LINE_VISIBLE = LINE_COLUMNS.map((c) => c.key)
const lines = ref([
  { id: '___行1___', ___行字段A___: '___值___', ___行字段B___: 1, ___行字段C___: '100.00' },
])

/* ---------- 占位：执行记录（按时间倒序，谁在什么时候改了什么） ---------- */
const events = [
  { time: '___时间___', title: '___事件___', desc: '___说明___', type: 'primary' },
]

/* 占位：四态与存在性。接接口时把这几个 ref 换成请求结果 */
const state = ref('ok') // 'loading' | 'ok' | 'error' | 'denied'
const found = ref(true) // 详情页独有的第五态：单据不存在/已删除
const load = () => { state.value = 'ok' /* 失败置 'error'，无权限置 'denied'，查无此单置 found=false */ }

const tab = ref('info')
const more = ref(false)
const doc = computed(() => ({ ___编号字段___: '___单号___', ___字段名A___: '___值___' }))
</script>

<style scoped>
.page { display: flex; flex-direction: column; padding-bottom: 12px; }
.phead { display: flex; align-items: center; gap: 12px; padding: 0 0 10px; }
.ph-l { display: flex; align-items: center; gap: 14px; min-width: 0; flex-wrap: wrap; }
.ph-ttl { margin: 0; font-size: 18px; font-weight: 600; }
.ph-r { margin-left: auto; display: flex; gap: 8px; }
.tracks { display: inline-flex; align-items: center; gap: 14px; font-size: 12px; flex-wrap: wrap; }
.tk { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.tk em { font-style: normal; color: var(--c-ink3, #9ca3af); font-size: 11px; }
.tk b { font-weight: 500; }
.tk b.is-warn { color: var(--c-danger, #dc2626); }
.fl { font-size: 11px; border: 1px solid var(--c-line, #e5e7eb); border-radius: 4px; padding: 0 6px; color: var(--c-ink2, #4b5563); }
.fl.red { color: var(--c-danger, #dc2626); border-color: #fecaca; background: #fff7f7; }
.kstrip { display: flex; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); padding: 9px 8px; }
.ks { display: flex; align-items: baseline; gap: 5px; padding: 0 16px; border-right: 1px solid var(--c-line2, #eef0f2); }
.ks .k { color: var(--c-ink3, #9ca3af); font-size: 12px; }
.ks .v { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ks .v.is-red { color: var(--c-danger, #dc2626); }
.ks .u { font-size: 12px; color: var(--c-ink2, #4b5563); }
.ks .warn { color: var(--c-danger, #dc2626); font-size: 11px; margin-left: 9px; padding-left: 9px; border-left: 1px solid #fecaca; }
.ks.tail { margin-left: auto; border-right: 0; }
.info { margin-top: 10px; padding: 10px 16px; }
.irow { display: flex; align-items: baseline; gap: 6px; padding: 3px 0; flex-wrap: wrap; }
.ik { color: var(--c-ink3, #9ca3af); font-size: 12px; white-space: nowrap; }
.irow b { font-weight: 500; margin-right: 20px; font-size: 13px; }
.mut { color: var(--c-ink2, #4b5563); font-weight: 400; font-size: 12px; }
.page-card { background: #fff; border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); }
.mt { margin-top: 12px; }
.tb { margin-left: 6px; font-size: 11px; color: var(--c-ink3, #9ca3af); }
.dt-tabs :deep(.el-tabs__header) { margin: 0; padding: 0 14px; }
.pane { padding: 14px 16px; min-height: 260px; }
.pane-lines { display: flex; flex-direction: column; height: 520px; padding-bottom: 6px; }
.lt-tip { font-size: 12px; color: var(--c-ink3, #9ca3af); }
.ev { color: var(--c-ink2, #4b5563); font-size: 12px; margin-top: 2px; }
.hint { padding: 16px 0; color: var(--c-ink3, #9ca3af); font-size: 13px; }
</style>
