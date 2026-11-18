<!--
  list.vue —— 列表页模板（页头 → 查询条 → 队列条 → 铺满的表格 → 分页 → 列配置）
  【解决什么】把「单一事实源规格」里的一页查询条件 + 列表列，落成一个不漂移的列表页：
              条件与列都来自规格生成器，页面里不出现手写字段；表格铺满内容区，行点击进详情页。
  【用之前要改哪里】
    1. 顶部 PAGE_* 三个常量：PAGE_ID / 页面名 / 副标题。
    2. 查询字段数组、列表列数组换成生成器产出（不要手抄字段名）；示例里给的是占位数据。
    3. 行点击的目标路由 goDetail() 里的路径换成你的路由；没有 vue-router 就用 emit。
    4. 队列口径（QUEUES）来自规格的 requirements，页面里只做映射，不要在这里发明业务规则。
    5. 接后端时改 load()：state 走 'loading' | 'ok' | 'error' | 'denied' 四态。
  【硬约定】
    · 行点击进详情页，不是弹窗（弹窗只用于「确认/配置」这类不承载页面信息的事）。
    · 表格必须铺满：.page 用 flex 纵向撑满，.tbl-wrap flex: 1 + min-height: 0，el-table height="100%"。
    · 固定列（locked）不可取消，保证标识列永远在第一屏。
    · 标识列 + 状态列必须在默认列集里，账台类页面没有它们就没法用。
  【依赖】[../components/QueryBar.vue](../components/QueryBar.vue) · [../components/ColumnConfig.vue](../components/ColumnConfig.vue)
  【同族】[detail.vue](./detail.vue) · [create.vue](./create.vue)
  【口径依据】[../../SKILL.md](../../SKILL.md)（十铁律）· [../../references/spec-schema.md](../../references/spec-schema.md)（字段清单与位置）· [../../references/workflow.md](../../references/workflow.md)（步骤 ③ 生成字段 / ④ 建原型）
-->
<template>
  <div class="page">
    <!-- 页头：标题 + 副标题（字段数与来源）+ 动作。项目已有统一页头组件时，整段替换成它。 -->
    <div class="phead">
      <div class="ph-l">
        <h1 class="ph-ttl">{{ PAGE_TITLE }}</h1>
        <span class="ph-sub">{{ SUB_TITLE }}</span>
      </div>
      <div class="ph-r">
        <el-button size="small" @click="colCfg = true">列表列配置</el-button>
        <el-button size="small" type="primary" @click="$router.push('/___PAGE_ID___/new')">新建___单据名___</el-button>
      </div>
    </div>

    <!-- 查询条：字段来自规格的「查询条件」位置 -->
    <QueryBar v-model="query" :fields="QUERY_FIELDS" :max="6" @search="onSearch" @reset="onReset" />

    <div class="page-card fill">
      <!-- 队列 / 快捷筛选条：一屏内回答「我现在该看哪一批」 -->
      <div class="bar">
        <el-radio-group v-model="queue" size="small">
          <el-radio-button v-for="q in QUEUES" :key="q.value" :value="q.value">{{ q.label }}</el-radio-button>
        </el-radio-group>
        <span class="cnt">共 <b>{{ filtered.length }}</b> 行 · 显示 {{ shownCols.length }}/{{ COLUMNS.length }} 列</span>
      </div>

      <div class="tbl-wrap">
        <!-- 四态：加载 / 失败 / 无权限 / 空 —— 四态必须齐全，别只做空态 -->
        <div v-if="state === 'loading'" class="hint">加载中…（骨架屏或 el-skeleton）</div>
        <div v-else-if="state === 'denied'" class="hint">无权限查看本页数据（权限矩阵：___角色___）</div>
        <div v-else-if="state === 'error'" class="hint">
          加载失败：___错误摘要___
          <el-button link type="primary" @click="load">重试</el-button>
        </div>
        <el-empty v-else-if="!filtered.length" description="暂无数据 · 换个筛选条件试试" />
        <!-- 行点击 -> 详情页（不是弹窗） -->
        <el-table
          v-else
          :data="paged"
          size="small"
          border
          height="100%"
          class="tbl"
          @row-click="goDetail"
        >
          <el-table-column
            v-for="c in shownCols"
            :key="c.key"
            :prop="c.key"
            :label="c.label"
            :width="c.width"
            :align="c.align || 'left'"
            :fixed="c.locked ? 'left' : false"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-tag v-if="c.type === 'enum' && row[c.key]" size="small" effect="plain">{{ row[c.key] }}</el-tag>
              <span v-else-if="c.type === 'money'">{{ money(row[c.key]) }}</span>
              <span v-else :class="{ 'is-empty': isEmpty(row[c.key]) }">{{ isEmpty(row[c.key]) ? '—' : row[c.key] }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click.stop="goDetail(row)">详情</el-button>
              <el-button link type="primary" size="small" @click.stop="___动作___">___动作文字___</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          small
          background
        />
      </div>
    </div>

    <ColumnConfig
      v-model="colCfg"
      :columns="COLUMNS"
      :visible="tableVisible"
      :default-visible="DEFAULT_VISIBLE"
      @update:visible="setTableVisible"
      @reset="resetCols"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QueryBar from '../components/QueryBar.vue'
import ColumnConfig from '../components/ColumnConfig.vue'

const router = useRouter()

/* ---------- 占位：这四行换成你这一页的真实值 ---------- */
const PAGE_ID = '___PAGE_ID___'                        // 例：'a8-1-1'（举例：规格 JSON 的 pageId）
const PAGE_TITLE = '___页面名___'                       // 例：'销售订单'（举例）
const SUB_TITLE = '字段 ___N___ 个 · 来源：来源系统「___单据名___」'
const STORAGE_KEY = 'proto.tableCols.' + PAGE_ID       // 列版式持久化，一页一个键

/* ---------- 占位：查询条件字段（由规格生成器产出，例：FIELD_SETS[PAGE_ID].query） ---------- */
const QUERY_FIELDS = [
  { key: '___字段名A___', label: '___字段名A___', type: 'text' },
  { key: '___字段名B___', label: '___字段名B___', type: 'enum', enums: ['___取值1___', '___取值2___'] },
  { key: '___字段名C___', label: '___字段名C___', type: 'date' },
]

/* ---------- 占位：列表列（由规格生成器产出，例：FIELD_SETS[PAGE_ID].table） ---------- */
const COLUMNS = [
  { key: '___标识列___', label: '___标识列___', type: 'text', width: 140, locked: true, group: '标识' },
  { key: '___状态列___', label: '___状态列___', type: 'enum', width: 96, align: 'center', group: '标识' },
  { key: '___主体列A___', label: '___主体列A___', type: 'text', width: 160, group: '字段' },
  { key: '___金额列___', label: '___金额列___', type: 'money', width: 116, align: 'right', group: '字段' },
]
const DEFAULT_VISIBLE = COLUMNS.map((c) => c.key)

/* ---------- 占位：队列口径。值 -> 过滤条件的映射写在这里，规则来源见规格 requirements ---------- */
const QUEUES = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待我审' },
  { value: 'run', label: '执行中' },
  { value: 'ship', label: '待发货' },
]

/* ---------- 占位：行数据。接后端时换成接口返回 ---------- */
const ROWS = [
  { id: '___单号1___', ___标识列___: '___单号1___', ___状态列___: '___取值1___', ___主体列A___: '___客户1___', ___金额列___: '12800.00' },
  { id: '___单号2___', ___标识列___: '___单号2___', ___状态列___: '___取值2___', ___主体列A___: '___客户2___', ___金额列___: '9600.00' },
]
const state = ref('ok') // 'loading' | 'ok' | 'error' | 'denied'
const load = () => { state.value = 'ok' /* 占位：改成真实请求，失败置 'error'，无权限置 'denied' */ }

const query = ref({})
const queue = ref('all')
const page = ref(1)
const pageSize = ref(50)
const colCfg = ref(false)
watch([queue, pageSize], () => { page.value = 1 })

const filtered = computed(() => {
  let rows = ROWS
  /* 占位：队列过滤。例：if (queue.value === 'ship') rows = rows.filter(r => Number(r.已下单) > Number(r.已发货)) */
  if (queue.value === 'todo') rows = rows.filter((r) => r.___状态列___ === '___取值1___')
  const k = (query.value.___字段名A___ || '').toString().trim()
  if (k) rows = rows.filter((r) => String(r.___标识列___ || '').includes(k))
  return rows
})
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const onSearch = () => { page.value = 1 }
const onReset = () => { query.value = {}; page.value = 1 }
// 行点击进详情页（不是弹窗）；没有 vue-router 时改成 emit('open-detail', row)
const goDetail = (row) => { if (row && row.id) router.push('/___PAGE_ID___/' + row.id) }

// 非浏览器环境（SSR / 单测）与隐私模式下 localStorage 可能不可用，先判断再读写
const hasLS = () => typeof localStorage !== 'undefined'
const readStored = () => {
  if (!hasLS()) return DEFAULT_VISIBLE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) && v.length ? v : DEFAULT_VISIBLE
  } catch (e) { return DEFAULT_VISIBLE }
}
const tableVisible = ref(readStored())
const setTableVisible = (v) => {
  tableVisible.value = v
  if (!hasLS()) return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch (e) { /* 原型：忽略 */ }
}
const resetCols = () => setTableVisible(DEFAULT_VISIBLE)
const shownCols = computed(() => tableVisible.value.map((k) => COLUMNS.find((c) => c.key === k)).filter(Boolean))

const isEmpty = (v) => v === undefined || v === null || v === ''
const money = (v) => (isEmpty(v) || isNaN(Number(v)) ? '—' : Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: calc(100vh - 100px); }
.phead { display: flex; align-items: flex-end; gap: 12px; padding: 0 0 10px; }
.ph-l { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.ph-ttl { margin: 0; font-size: 18px; font-weight: 600; }
.ph-sub { font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-r { margin-left: auto; display: flex; gap: 8px; }
.page-card { background: #fff; border: 1px solid var(--c-line, #e5e7eb); border-radius: var(--r, 8px); }
/* 表格铺满：flex 撑满内容区，min-height: 0 是让 el-table 内部滚动而不是撑破页面 */
.fill { flex: 1; min-height: 320px; display: flex; flex-direction: column; overflow: hidden; }
.bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px 8px; flex-wrap: wrap; }
.cnt { margin-left: auto; font-size: var(--fs-hint, 12px); color: var(--c-ink3, #9ca3af); }
.tbl-wrap { flex: 1; min-height: 0; padding: 0 14px; }
.tbl { cursor: pointer; }
.pager { display: flex; justify-content: flex-end; padding: 8px 14px 10px; }
.hint { padding: 24px 4px; color: var(--c-ink2, #4b5563); font-size: 13px; }
.is-empty { color: var(--c-ink3, #9ca3af); }
</style>
