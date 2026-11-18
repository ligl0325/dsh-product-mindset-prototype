<!--
  create.vue —— 建单页模板（锚点选择 → 字段来源图例 → 分段表单 → 明细行 → 底部动作）
  【解决什么】建单页最容易和规格漂移：字段名改一个字、来源搞错（该带出的让人手填）。本模板把
              「先选锚点对象 → 带出引用字段 → 再录本单字段」的顺序写死，来源只用标识标出，
              规则不写进界面（规则在规格 JSON 里，界面只负责表现）。
  【用之前要改哪里】
    1. PAGE_ID / PAGE_TITLE / 锚点对象名（___锚点对象___）/ 上游单据名。
    2. ANCHOR_FIELDS：锚点对象带出的字段映射表（哪一列填到哪个字段），与规格的「引用」类字段一致。
    3. SECTIONS：分段表单，顺序 = 来源系统界面的录入顺序，由生成器的 sections 给（不要自己重排）。
    4. LINE_COLUMNS：明细行可编辑列集，来自生成器的明细行字段集。
    5. 兜底入口（直接建单）：FALLBACK 里的字段名与校验，接后端时在 submit() 里同步改。
  【硬约定】
    · 锚点对象没选之前，引用类字段一律只读且显示「（待引用）」，不能让人直接手填。
    · 字段来源只用三个标识：引用 / 录入 / 系统 —— 只留标识，不写规则（规则写进规格，不写进原型）。
    · 明细行用 [../components/LineTable.vue](../components/LineTable.vue) 的 editable 态；
      「系统计算」类列（小计、已出货数量）在列项上写 editable: false，别让人改。
    · 底部动作与页头动作必须同一套（保存草稿 / 提交），不能只有一边。
  【兜底入口（直接建单）】规格要求两条，缺一不可：
    ① 原因必填 —— 不填原因不能提交（留痕，列表与详情要显示来源标记）；
    ② 可事后补关联 —— 补关联只建立关联、不改历史数据，补后「待补关联」自动转「否」。
    下面的 FALLBACK 常量与 submit() 里的两条校验是占位实现，接后端时按这两条落实（写到接口校验里，别只写在前端）。
  【依赖】[../components/FieldBlock.vue](../components/FieldBlock.vue) · [../components/LineTable.vue](../components/LineTable.vue)
  【同族】[list.vue](./list.vue) · [detail.vue](./detail.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="page">
    <!-- 四态：加载 / 失败 / 无权限 / 可录入 -->
    <div v-if="state === 'loading'" class="hint">加载中…（骨架屏或 el-skeleton）</div>
    <div v-else-if="state === 'denied'" class="hint">无权限建单（权限矩阵：___角色___）</div>
    <div v-else-if="state === 'error'" class="hint">
      加载失败：___错误摘要___
      <el-button link type="primary" @click="load">重试</el-button>
    </div>
    <template v-else>
    <!-- 页头：标题 + 副标题（录入顺序与字段数来源）+ 动作 -->
    <div class="phead">
      <div class="ph-l">
        <h1 class="ph-ttl">新建___单据名___</h1>
        <span class="ph-sub">按来源系统「___上游单据名___」录入顺序 · 表单 ___N___ 字段 · 明细 ___M___ 列</span>
      </div>
      <div class="ph-r">
        <el-button size="small" @click="cancel">取消</el-button>
        <el-button size="small" @click="submit('draft')">保存草稿</el-button>
        <el-button size="small" type="primary" @click="submit('commit')">提交审单</el-button>
      </div>
    </div>

    <!-- ① 锚点选择区：先选外部对象，再带出只读字段 -->
    <div class="page-card src">
      <div class="src-row">
        <span class="badge ref big">引用</span>
        <div v-for="f in ANCHOR_FIELDS" :key="f.to" class="si">
          <em>{{ f.label }}</em>
          <b v-if="anchor" :class="{ miss: !anchorValue(f) }">{{ anchorValue(f) || '—' }}</b>
          <b v-else class="miss">未选择</b>
        </div>
        <el-radio-group v-model="way" size="small">
          <el-radio-button value="anchor">___锚点对象___起单</el-radio-button>
          <el-radio-button value="fallback">直接建单（兜底）</el-radio-button>
        </el-radio-group>
        <el-button v-if="way === 'anchor'" size="small" type="primary" @click="pickerOpen = true">
          选择___锚点对象___
        </el-button>
        <el-tag v-else size="small" type="warning" effect="plain">兜底入口 · 不走锚点对象，必须留痕</el-tag>
      </div>

      <!-- 兜底入口：原因必填 + 可事后补关联（占位实现，规则见文件头） -->
      <div v-if="way === 'fallback'" class="fallback">
        <span class="badge input">录入</span>
        <em class="wk">原因 *</em>
        <el-select v-model="form[FALLBACK.reasonKey]" size="small" placeholder="必填：为什么直接建单" style="width: 240px">
          <el-option v-for="r in FALLBACK.REASONS" :key="r" :label="r" :value="r" />
        </el-select>
        <em class="wk">{{ FALLBACK.linkLabel }}</em>
        <el-input
          v-model="form[FALLBACK.linkKey]"
          size="small"
          :placeholder="'___锚点对象___编号（可空，事后补关联）'"
          style="width: 300px"
        />
        <span class="wk-tip">补关联只建立关联、不改历史数据；补后「待补关联」自动转「否」</span>
      </div>

      <!-- 字段来源图例：只留标识，不写规则 -->
      <div class="legend">
        <span class="lg"><span class="badge ref">引用</span>外部引用：来自___锚点对象___/上游单据，只读</span>
        <span class="lg"><span class="badge input">录入</span>本单录入</span>
        <span class="lg"><span class="badge sys">系统</span>系统计算，不可改</span>
        <el-switch v-model="unlockRef" size="small" active-text="复核后可改引用字段" class="sw" />
      </div>
      <div v-if="!anchor && way === 'anchor'" class="warnbar">
        ⚠ 未选择___锚点对象___：引用类字段无法带出，请先「选择___锚点对象___」。
      </div>
    </div>

    <!-- ② 分段表单：顺序 = 来源系统录入顺序 -->
    <div class="page-card mt">
      <!-- 单据条：单号、单据日期、单据状态、附件。字段不出现在下面的表单区（由生成器排除） -->
      <div class="docbar">
        <span class="di"><em>单据日期</em>
          <el-date-picker v-model="doc.date" size="small" type="date" value-format="YYYY-MM-DD" style="width: 132px" />
        </span>
        <span class="di"><em>单号</em><b class="auto">{{ doc.no }}</b><span class="hint">自动生成</span></span>
        <span class="di"><em>单据状态</em><el-tag size="small" type="info" effect="plain">{{ doc.state }}</el-tag></span>
        <span class="di"><em>附件</em><el-button size="small" @click="___上传附件___">上传</el-button></span>
      </div>

      <div v-for="(sec, i) in SECTIONS" :key="i" class="sec">
        <FieldBlock
          :title="sec.title || '___首段区块名___'"
          :fields="sec.fields"
          :model-value="form"
          :editable="true"
          :show-src="true"
          :default-open="true"
          @update:model-value="(v) => (form = v)"
        />
      </div>
    </div>

    <!-- ③ 明细行：可编辑表 -->
    <div class="page-card mt">
      <div class="pane-lines">
        <LineTable
          v-model:rows="lines"
          :columns="LINE_COLUMNS"
          :default-visible="DEFAULT_LINE_VISIBLE"
          :title="'___明细行标题___'"
          :row-key="'id'"
          :editable="true"
          :deletable="true"
          :summary="true"
          :storage-key="'proto.lineCols.' + PAGE_ID + '.new'"
        >
          <template #extra>
            <el-button size="small" @click="fromUpstream">按上游清单带出</el-button>
          </template>
        </LineTable>
      </div>
    </div>

    <!-- ④ 底部动作：与页头同一套 -->
    <div class="footbar">
      <span class="ftip">必填项来自规格的 required 标记；「系统」类字段不参与必填校验。</span>
      <el-button size="small" @click="cancel">取消</el-button>
      <el-button size="small" @click="submit('draft')">保存草稿</el-button>
      <el-button size="small" type="primary" @click="submit('commit')">提交审单</el-button>
    </div>

    <!-- 锚点对象选择器：列表 + 关键字，点行即带出 -->
    <el-dialog v-model="pickerOpen" title="选择___锚点对象___" width="820px">
      <el-input v-model="kw" size="small" clearable placeholder="名称 / 编号 / 客户" style="width: 280px; margin-bottom: 8px" />
      <el-table :data="anchorList" size="small" border highlight-current-row @row-click="useAnchor">
        <el-table-column v-for="c in ANCHOR_PICKER_COLUMNS" :key="c.key" :prop="c.key" :label="c.label" :width="c.width" />
      </el-table>
      <div v-if="!anchorList.length" class="hint">没有匹配的___锚点对象___（改用「直接建单」并填原因留痕）</div>
      <template #footer>
        <el-button @click="pickerOpen = false">取消</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import FieldBlock from '../components/FieldBlock.vue'
import LineTable from '../components/LineTable.vue'

const router = useRouter()
const PAGE_ID = '___PAGE_ID___' // 例：'a8-2-1'（举例）

/* ---------- 占位：锚点对象带出字段的映射（to = 表单字段名，from = 锚点对象上的属性） ---------- */
const ANCHOR_FIELDS = [
  { label: '___锚点对象___', to: '___锚点名称字段___', from: 'name' },
  { label: '客户', to: '___客户字段___', from: 'customer' },
  { label: '合同', to: '___合同字段___', from: 'contractNo' },
  { label: '负责人', to: '___负责人字段___', from: 'owner' },
]

/* ---------- 占位：分段表单（顺序 = 来源系统录入顺序，由生成器的 sections 产出） ---------- */
const SECTIONS = [
  {
    title: '___首段区块名___',
    fields: [
      { key: '___字段名A___', label: '___字段名A___', type: 'text', required: true, src: 'ref' },
      { key: '___字段名B___', label: '___字段名B___', type: 'enum', enums: ['___取值1___', '___取值2___'], src: 'input' },
      { key: '___字段名C___', label: '___字段名C___', type: 'date', src: 'input' },
      { key: '___字段名D___', label: '___字段名D___', type: 'money', src: 'derived', readonly: true },
    ],
  },
]

/* ---------- 占位：明细行可编辑列集（系统计算列写 editable: false，不让人改） ---------- */
const LINE_COLUMNS = [
  { key: '___行字段A___', label: '___行字段A___', type: 'text', width: 150, locked: true, group: '基础' },
  { key: '___行字段B___', label: '___行字段B___', type: 'number', width: 88, align: 'right', group: '数量' },
  { key: '___行字段C___', label: '___行字段C___', type: 'money', width: 116, align: 'right', group: '价格' },
  { key: '___小计___', label: '___小计___', type: 'money', width: 116, align: 'right', group: '价格', editable: false },
]
const DEFAULT_LINE_VISIBLE = LINE_COLUMNS.map((c) => c.key)

/* ---------- 占位：兜底入口（直接建单）的字段名与选项 ---------- */
const FALLBACK = {
  reasonKey: '___原因字段___',        // 例：'起单原因'（举例）
  linkKey: '___补关联字段___',        // 例：'补关联对象'（举例）
  linkLabel: '补关联对象',
  REASONS: ['___原因1___', '___原因2___', '___原因3___'],
}

/* ---------- 占位：锚点对象候选列表（接后端时换成接口数据） ---------- */
const ANCHOR_PICKER_COLUMNS = [
  { key: 'id', label: '编号', width: 130 },
  { key: 'name', label: '名称', width: 180 },
  { key: 'customer', label: '客户', width: 180 },
  { key: 'contractNo', label: '合同', width: 130 },
]
const anchors = ref([
  { id: '___编号1___', name: '___名称1___', customer: '___客户1___', contractNo: '___合同1___', owner: '___负责人1___' },
])

/* 占位：四态。接接口时换成请求结果 */
const state = ref('ok') // 'loading' | 'ok' | 'error' | 'denied'
const load = () => { state.value = 'ok' /* 失败置 'error'，无权限置 'denied' */ }

const way = ref('anchor')
const anchor = ref(null)
const pickerOpen = ref(false)
const kw = ref('')
const unlockRef = ref(false)
const form = ref({ [FALLBACK.reasonKey]: '', [FALLBACK.linkKey]: '' })
const doc = ref({
  date: new Date().toISOString().slice(0, 10),
  no: '___单号前缀___' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '001',
  state: '草稿',
})
const lines = ref([blankLine()])

function blankLine() {
  const o = {}
  for (const c of LINE_COLUMNS) o[c.key] = ''
  return o
}
const money = (v) => (v === undefined || v === null || v === '' ? '—' : Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 }))

const anchorList = computed(() => {
  const k = kw.value.trim()
  if (!k) return anchors.value
  return anchors.value.filter((a) => (a.id + a.name + a.customer + a.contractNo).includes(k))
})
const anchorValue = (f) => (anchor.value ? anchor.value[f.from] : '')
// 选锚点 -> 带出引用字段（一列对一字段，映射表在 ANCHOR_FIELDS）
const useAnchor = (a) => {
  anchor.value = a
  const next = { ...form.value }
  for (const f of ANCHOR_FIELDS) next[f.to] = a[f.from] === undefined ? '' : a[f.from]
  form.value = next
  pickerOpen.value = false
  ElMessage.success('已引用___锚点对象___ ' + a.id + '，引用字段已带出')
}
const fromUpstream = () => {
  if (!anchor.value) { ElMessage.warning('请先选择___锚点对象___'); return }
  lines.value = lines.value.concat([{ ...blankLine(), ___行字段A___: '___来自上游清单的行___' }])
  ElMessage.success('已按上游清单带出明细（占位）')
}
const cancel = () => router.push('/___PAGE_ID___')

// 提交校验：必填 + 兜底两条规则（原因必填 / 可事后补关联）
const submit = (mode) => {
  if (way.value === 'fallback' && !form.value[FALLBACK.reasonKey]) {
    ElMessage.warning('直接建单：必须填写原因留痕，否则不能提交')
    return
  }
  if (way.value === 'anchor' && !anchor.value) {
    ElMessage.warning('请先选择___锚点对象___：引用字段由它带出')
    return
  }
  if (mode === 'draft') {
    ElMessage.success('已保存草稿（占位）：' + doc.value.no)
    router.push('/___PAGE_ID___')
    return
  }
  // 必填校验：只校验非「系统计算」的字段
  const miss = []
  for (const sec of SECTIONS) {
    for (const f of sec.fields) {
      if (f.required && f.src !== 'derived' && !form.value[f.key]) miss.push(f.label || f.key)
    }
  }
  if (miss.length) {
    ElMessage.warning('还有 ' + miss.length + ' 个必填未填：' + miss.slice(0, 4).join('、') + (miss.length > 4 ? ' 等' : ''))
    return
  }
  ElMessage.success('已提交审单（占位）：' + doc.value.no)
  router.push('/___PAGE_ID___')
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; padding-bottom: 12px; }
.phead { display: flex; align-items: flex-end; gap: 12px; padding: 0 0 10px; }
.ph-l { display: flex; align-items: baseline; gap: 10px; }
.ph-ttl { margin: 0; font-size: 18px; font-weight: 600; }
.ph-sub { font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
.ph-r { margin-left: auto; display: flex; gap: 8px; }
.page-card { background: #fff; border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); }
.mt { margin-top: 10px; }
.src { padding: 12px 14px; }
.src-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.si { display: flex; align-items: baseline; gap: 6px; font-size: var(--fs-body, 14px); }
.si em { font-style: normal; color: var(--c-ink3, #9ca3af); font-size: var(--fs-hint, 12px); }
.si .miss { color: var(--c-ink3, #9ca3af); font-weight: 400; }
.badge { flex: none; font-size: 10px; line-height: 16px; padding: 0 5px; border-radius: 3px; border: 1px solid var(--c-line, #e5e7eb); background: #f9fafb; color: #6b7280; }
.badge.ref { color: #1d4ed8; border-color: #bfdbfe; background: #eff6ff; }
.badge.input { color: #b45309; border-color: #fde68a; background: #fffbeb; }
.badge.sys { color: #6b7280; border-color: #e5e7eb; background: #f9fafb; }
.badge.big { font-size: 11px; line-height: 20px; padding: 0 8px; font-weight: 600; }
.fallback { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--c-line2, #eef0f2); }
.wk { font-style: normal; color: var(--c-ink3, #9ca3af); font-size: var(--fs-hint, 12px); white-space: nowrap; }
.wk-tip { font-size: 11px; color: var(--c-ink3, #9ca3af); }
.legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--c-line2, #eef0f2); font-size: var(--fs-hint, 12px); color: var(--c-ink2, #4b5563); }
.lg { display: inline-flex; align-items: center; gap: 5px; }
.sw { margin-left: auto; }
.warnbar { margin-top: 8px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 6px; font-size: var(--fs-hint, 12px); }
.docbar { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid var(--c-line, #e5e7eb); background: #fafbfc; }
.di { display: flex; align-items: center; gap: 6px; font-size: var(--fs-body, 14px); }
.di em { font-style: normal; color: var(--c-ink3, #9ca3af); font-size: var(--fs-hint, 12px); }
.auto { font-weight: 600; }
.hint { font-size: 11px; color: var(--c-ink3, #9ca3af); }
.sec { padding: 4px 14px 6px; }
.pane-lines { display: flex; flex-direction: column; height: 420px; padding: 12px 14px 6px; }
.footbar { display: flex; align-items: center; gap: 8px; padding: 12px 0 4px; }
.ftip { flex: 1; font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
</style>
