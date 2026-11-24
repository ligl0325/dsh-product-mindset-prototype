# 产品技能包 · dsh-product-mindset-prototype

把六个产品经理技能打成一个 DeepSeek Harness 插件，**装完直接说人话就能用**，不用敲 `/技能名`，也不用往 `~/.agents/skills` 里散装复制。

| 技能 | 一句话 | 运行时 |
|---|---|---|
| `product-mindset` | 产品心法 v2.0.0：方法论与文档路由器，先判断意图，再只加载 1 个工作流 + 至多 1 个模板 | 纯 Markdown |
| `quick-prototype` | 快速原型 v4.3.0：六种设备形态的单文件可交互 HTML 原型 + 可打印 HTML 报告 | 纯 Markdown |
| `spec-driven-prototype` | 规格驱动原型 v1.0.0：需求规格 → 多页后台原型工程（Vue 3），字段由规格生成、与来源系统逐字一致 | Node（无第三方依赖）+ Python（仅标准库，抽字段） |
| `product-prototype-review` | 原型与业务功能说明的六维校验，输出 P0/P1/P2 评审报告 | 纯 Markdown |
| `requirement-analysis` | 五级需求拆解（系统—模块—功能组—操作—规则）→ 带追溯、待确认项、问题汇总的 Excel | Python（`openpyxl`，DSH 自带） |
| `axure-prd-docx` | Axure 原型 + 五级需求表 + 文档模板 → 带截图和「规则｜说明」表格的 DOCX 需求文档 | Node + 无头 Chrome（依赖已内置） |

## 安装

> 推荐用 **GitHub 方式**：装进去的是某个具体 commit 的正式包，目录改名、换盘、删掉本地仓库都不影响运行，
> 而且你和同事跑的是同一份代码。

**方式一：GitHub（推荐，发给同事也用这个）**

仓库：<https://github.com/ligl0325/dsh-product-mindset-prototype>

```js
plugin_manager({ action: "install_bundle", target: "github:ligl0325/dsh-product-mindset-prototype" })
```

在 **Plugins → 添加插件** 里填 `github:ligl0325/dsh-product-mindset-prototype` 也可以。

装好后 `pnpm-lock.yaml` 会把版本钉在解析到的那个 commit 上（形如 `.../tar.gz/<commit>`），
也就是说**装的是快照，不会自己跟着 main 漂**；要更新见下面「更新流程与协作约定」。

**方式二：本地目录 link（只给开发期用）**

在 DSH 里打开 **Plugins**，选「添加插件」，选中你 clone 出来的这个目录；或让 Agent 执行
（把 `<本仓库目录>` 换成你自己的绝对路径）：

```js
plugin_manager({ action: "install_bundle", target: "<本仓库目录>" })
```

它会被记成 `link:<目录>`，改本地文件立即生效——调试时方便，**但目录一改名或挪盘，插件就直接失效**。
所以调完记得切回方式一。

**方式三：tarball（对方不方便用 git 时）**

```sh
pnpm pack        # 产出 dsh-product-mindset-prototype-<version>.tgz
```

```js
plugin_manager({ action: "install_bundle", target: "file:<tgz 的绝对路径>" })
```

**方式四：npm（本仓库暂未发布）**

目前**没有发布到 npm**，所以不要指望 `install_bundle dsh-product-mindset-prototype` 能装到。
要发布得先 `npm login` 再 `npm publish`；而新版 npm 的登录必须经过 npmjs.com 网站，
访问不了该网站的环境（如部分内网/受限网络）登录会直接失败。这种情况下用方式一或方式三。

装完后**开一个新会话**，或者直接在输入框敲 `/` 看命令菜单里有没有这六个技能。

## 更新流程与协作约定

本仓库只认 **GitHub 一个源头**，本地**只保留一个工作副本**。

- 工作副本只留一份。另存一份完整克隆（带 `.git`）很容易变成两条提交线，改着改着就分叉了；
  需要第二份就重新 clone，别复制目录。
- 更新流程固定三步：改 → 提交推送 → 重新安装，把锁定的 commit 前移：

```sh
git add -A && git commit -m "..." && git push
```

```js
plugin_manager({ action: "install_bundle", target: "github:ligl0325/dsh-product-mindset-prototype" })
```

- 想把锁文件显式钉到某个提交：`github:ligl0325/dsh-product-mindset-prototype#<commit>`；
- 判断本机装的和仓库是不是同一版：比对 `pnpm-lock.yaml` 里的 `codeload.github.com/.../tar.gz/<commit>`
  与本仓库的 `git rev-parse HEAD`，两者一致就说明线上线下一套；
- 调试期想「改了就生效」：临时切成方式二的 `link:<目录>`，调完再切回方式一。

## 场景一：这个方向到底能不能做

> 老板丢来一句「做个 AI 质检，下季度上线」，你不知道从哪开始。

你怎么说：

- 「这个功能值不值得做」「先出一页纸给我」
- 「帮我做一次项目诊断，别急着拆需求」
- 「用 ICE 排一下这几个需求的优先级」

得到什么：一页纸产品 Brief（用户 / 痛点 / MVP 范围 / 最小验证方案 / 做或不做的结论）、项目诊断报告（干系人、需求确定性、关键风险、边界声明），
以及 ✅做 / ⚠️验证后做 / ❌不做 的明确判断——**技能被强制要求先给结论再展开，缺证据的数字写"待验证"而不是编一个**。

## 场景二：写 PRD

> 需求定了，要一份能过评审的 PRD。

你怎么说：

- 「写一份 B 端工单系统的轻量 PRD」
- 「按我们的完整 PRD 结构写，12 章那种」
- 「把这份需求整理成 PRD，字段和验收标准要落到能开发」

得到什么：按小需求→轻量、大需求→完整自动分级；落到角色、动作、字段、权限、公式、状态和验收标准，
带红线清单（明确不做什么 + 理由）和风险登记册。

## 场景三：竞品调研

> 竞品刚上线一个新模块，要判断跟不跟。

你怎么说：

- 「调研一下这三家竞品，我要决定跟不跟」
- 「把这家公司的功能拆开，告诉我哪些该抄、哪些不该抄」

得到什么：公司画像 → 功能四级拆解（每个功能给 ✅采纳 / ⚠️简化 / ❌不做 的判断）→ 竞争格局 → 标杆案例的「痛点 → 方案 → 本项目需求」映射 → 明确的跟/不跟建议。

## 场景四：拆需求，产出一张能评审的 Excel

> 立项通过了，要把 P0 功能拆到可开发、可测试。

你怎么说：

- 「把这段需求拆成五级，出 Excel」
- 「这是我拍的原型截图，帮我识别成需求再拆」
- 「优化我这张需求分解表，标出哪些地方是猜的」

得到什么：`需求分解` 表（编号 / 原始需求 / 一级…五级 / 状态 / 来源），状态列严格区分 **已确认 / 合理推断 / 待确认 / 建议**，
每条待确认项写成一个具体问题；优化模式还会额外出 `需求优化对比` 和 `问题点汇总` 两张表，原表不被覆盖。

> 边界：`requirement-analysis` 只管"拆成表"，方法论和 PRD 写作在 `product-mindset`。

## 场景五：做个原型或大屏 demo 给领导看

> 明天要演示，来不及做前端。

你怎么说：

- 「做一个会议室一体机的签到屏，深色高级感」
- 「出一版 H5 移动端的报销申请流程 demo」
- 「画个后台客户管理看板，要能点进去看详情」
- 「把这个页面的 UI 稿做出来，用我们主色 #2D6BFF」

得到什么：**单个 HTML 文件**，双击就能在浏览器打开，无 CDN 依赖；按设备形态自动选骨架（Web 后台 / H5 / 原生 APP / PC 桌面 / 嵌入式小屏 / 会议一体机），
按业务领域自动选风格（企业管理偏瑞士风、工业偏 HUD 深色、医疗偏无障碍浅色……），并且强制过一遍"反 AI 审美"检查（不给你紫色渐变 + 三列等宽卡片那种一眼假的东西）。

> 边界：`quick-prototype` 出的是**一个 HTML 文件**；要**多页前端工程**、字段必须跟老系统/规格逐字对齐时，用 `spec-driven-prototype`（见场景九）。

## 场景六：原型评审

> 设计给的稿子要过评审，或者自己做的原型想先自查一遍。

你怎么说：

- 「检查这个原型，指出问题和优先级」
- 「这个页面有什么问题」
- 「原型和需求文档对不对得上」

得到什么：六维校验（页面完整性 / 布局排版 / 功能逻辑 / 交互逻辑 / 设计创新 / 内容正确性）+ 业务说明歧义检查 + 一致性核对，
输出固定结构报告：评估等级、问题总览表（每条带**位置**和 P0/P1/P2）、分维度优化建议、工时估算与分阶段计划。

支持输入：效果图图片、HTML 原型文件或目录、Axure 导出目录。**只评审不改文件**。

## 场景七：Axure 原型 → Word 需求文档

> 原型定稿了，评审要一份带截图的正式需求文档。

你怎么说：

- 「根据这个 Axure 原型出需求文档」
- 「用这份五级需求表和我们的模板，生成 Word 版 PRD」
- 「给这份文档补上原型截图」

得到什么：DOCX，结构是**页面标题 → 原型截图（含图注）→ 「规则｜说明」两列表格 → 子功能**，
外加封面、修订记录、目录、需求列表和非功能需求章节；截图自动裁掉 Axure 右侧的"需求说明"面板，超长页面自动分段。

> 需要三样东西：Axure 导出的 HTML 目录、一份五级需求拆解表（xlsx）、一份需求文档模板（docx）。
> 依赖（`docx` / `jszip` / `xml-js`）已内置，不需要 `npm install`；截图用本机 Chrome 或 Edge。

## 场景八：上线之后做复盘

> 上线一个月，老板问效果。

你怎么说：「做一次上线复盘」「这版上线带来了什么」

得到什么：7 / 30 / 90 天价值验证框架——目标达成、实际数据、偏差原因、下一步动作，避免复盘写成流水账。

## 场景九：老系统迁移，要一套字段对得上的后台原型

> 客户有个用了十年的订单/台账老系统，要迁到新系统，最怕上线时字段对不上账。

你怎么说：

- 「字段要跟老系统一模一样，不能漂移」
- 「按这份需求规格出一套能点的多页后台原型」
- 「原型和需求文档必须一致，改规格原型要跟着变」
- 「明细行字段太多放不下，列要能自己配」

得到什么：一套多页可运行的前端工程（Vue 3）——列表 / 详情 / 建单三套页面模板 + 查询条 / 表单块 / 可配置表格 / 列配置抽屉四个通用组件；
页面上的字段、枚举、必填、明细列**全部由规格生成**（`gen-fields.mjs`，不手写），老系统界面先用 `extract-legacy-fields.py` 抽成结构化字段表，
字段名、枚举取值甚至错别字都照抄来源系统；再跑 `check-spec.mjs` 做规格自检（含旧口径词为 0）、`audit-prototype.mjs` 做原型审计（四态齐全、交互落地、没有手写字段），
最后 `shoot.mjs` 用本机 Chrome 逐屏截图验收。

> 边界：要**一个 HTML 文件**的演示原型用 `quick-prototype`；要**多页工程 + 字段由规格驱动**才用它。

## 串起来用：一条真实链路

新需求从 0 到交付，六个技能可以接力，每一步都是普通对话：

```text
1. 「这个方向值不值得做」                  → 产品 Brief，先拿做/不做的结论
2. 「立项了，先帮我诊断一下」              → 项目诊断，锁定范围与风险
3. 「写一份轻量 PRD」                      → 分级 PRD，含字段与验收标准
4. 「把 P0 拆成五级需求，出 Excel」         → 需求分解表，待确认项一次问清
5. 「做个后台看板原型，能点进去看详情」      → 单文件 HTML，直接演示
6. 「按规格出一套字段对得上的多页后台」      → 规格驱动的 Vue 工程，字段不漂移
7. 「检查这个原型，和需求对不对得上」        → 评审报告，P0 问题先修
8. 「根据原型和需求表出 Word 需求文档」      → 可评审/可归档的 DOCX
9. 「上线一个月了，帮我复盘」               → 7/30/90 天价值验证
```

技能之间会自动按描述切换，不用手动点名；想强制指定某个技能时用 `/product-mindset`、`/quick-prototype` 这类命令。

## 六个技能的边界（避免互相抢词）

- `product-mindset` 只管**方法论与文档写法**，不产 Excel 表格、不评原型；
- `requirement-analysis` **独占**「拆需求 / 五级需求 / 需求分解表 / Excel」，只出表、不出原型；
- `quick-prototype` **只生成**原型，不评，且**单文件 HTML 归它**（一个文件、双击能开、不用构建）；
- `spec-driven-prototype` **只做多页前端工程 + 规格驱动的字段**：字段、枚举、必填、明细列由规格生成，与来源系统逐字一致，出的是 Vue 3 多页工程。
  同样一句「做个后台原型」，**要一个文件用 `quick-prototype`，要一套字段对得上的工程用 `spec-driven-prototype`**；
- `product-prototype-review` **只评审**原型与业务说明（单文件、多页工程、Axure 目录都能评），只出报告不改文件；
- `axure-prd-docx` 负责**最终 Word 交付物**（截图 + 需求表格）。

想改某个技能的命中范围：改它 `SKILL.md` 顶部的 `description`（写用户会说的词），保存后下一次请求就按新词路由。

## 目录结构

```
dsh-product-mindset-prototype/
├── package.json / cordis.patch.yml / index.js   # 一行插件，自带 skill provider
├── skills/                                      # 扫这个目录，放进去就生效
│   ├── product-mindset/                         # SKILL.md + references(13) + templates(7)
│   ├── quick-prototype/                         # SKILL.md + design-rules + report-html + templates-*(6)
│   ├── product-prototype-review/                # SKILL.md（自包含，无外部依赖）
│   ├── requirement-analysis/                    # SKILL.md + references(2) + scripts/requirement_workbook.py
│   ├── axure-prd-docx/                          # SKILL.md + scripts(4) + references + assets + vendor/modules
│   └── spec-driven-prototype/                   # SKILL.md + references(6) + scripts(5) + templates(页面 3 / 组件 4 / cfg.example.json)
├── locale/en.json  locale/zh.json               # Plugins 面板里的标题/说明
├── docs/DETAIL.md  docs/DETAIL.zh.md  docs/preview.svg
├── icon.svg
├── tools/validate.mjs  tools/smoke.mjs          # 打包自检
└── README.md  LICENSE
```

## 工作原理

`index.js` 用 `ctx.skills.registerProvider()` 注册一个 provider：

- **技能目录在每次目录读取时从磁盘发现**（扫 `skills/*/SKILL.md`），加技能 = 丢一个文件夹，不用改代码；
- 解析 frontmatter 得到 `name`/`description`，去掉 frontmatter 的正文交给模型，`resourceBase` 指向该技能目录，
  所以 `references/…`、`templates-*.md` 的相对引用照常可读；
- **只用 Node 内置模块**，不依赖任何 npm 包；
- 监听 `skills/` 的文件变化并主动刷新技能目录：改描述、改正文下一次请求即生效；
- provider 随插件行卸载：**停用插件 = 六个技能立刻从所有会话消失**；
- rank 用 300（等同文件系统 custom 根）。rank 只在**同一层内**比较：项目 100 < runtime 250 < custom 300 < 用户根 400/500 < 内置 600。

### ⚠️ 优先级须知

DSH 的技能目录按「层」合并，**离 Agent 最近的层胜出，与 rank 无关**。
`~/.agents/skills`、`~/.dsh/skills` 和项目 `.dsh/skills` 由 **Agent 预设自带的 skill provider** 扫描，
属于比 Host 层更近的作用域，所以**这些目录里的同名技能会盖住插件版本**。装插件前先确认这些目录里没有同名副本。

## 脚本类技能的运行时

- `requirement-analysis`：先调 `load_workspace_dependencies` 拿 `python` 绝对路径（自带 `openpyxl`），再跑
  `scripts/requirement_workbook.py`。不要假设 `python` 在 PATH。
- `axure-prd-docx`：
  - Node 用 `load_workspace_dependencies` 返回的 `node`；
  - `docx` / `jszip` / `xml-js` 已内置在 `skills/axure-prd-docx/vendor/modules/`（约 3.7MB，已裁剪到运行必需文件），
    脚本会自动找到，**不需要 `npm install`**；
  - 截图需要本机 Chrome 或 Edge（`capture.js` 自动探测，可用 `CHROME_PATH` 强制指定）。
- `spec-driven-prototype`：
  - Node 用 `load_workspace_dependencies` 返回的 `node`；`scripts/*.mjs` **只用 Node 内置模块**，不需要 `npm install`；
  - 抽字段 `scripts/extract-legacy-fields.py` 用同一个 `python`（只用标准库）；
  - 逐屏截图 `scripts/shoot.mjs` 需要本机 Chrome 或 Edge（自动探测，可用 `CHROME_PATH` 指定），并依赖 Node 22+ 的内置 WebSocket。

## 自检与维护

```sh
npm run check     # = node tools/validate.mjs && node tools/smoke.mjs
```

- `validate.mjs`：manifest、patch 行、locale、图标、每个 skill 的 frontmatter 与相对链接是否都有目标文件。
- `smoke.mjs`：用假 `ctx` 跑一遍 `apply()`，断言六个技能都能列出/加载、字段符合 DSH 注册表校验，
  并且六个技能的关键词路由词还在（改描述把词改没了会直接报错）。

维护要点：

- **加技能**：`skills/` 下新建目录放 `SKILL.md`，跑 `npm run check`，代码不用动；
- **改技能内容**：覆盖 Markdown 即可，但**生效时机取决于安装方式**——`link:` 安装是保存即生效；
  `github:` 安装要 `commit && push` 后重新安装一次（见「更新流程与协作约定」）；
- **改命中范围**：只改 `SKILL.md` 顶部的 `description`；
- **改 `index.js`**：ESM 模块会被进程缓存，需要重启 DSH 或停用/启用插件；
- 改完把 `package.json` 的 `version` 加一，并在提交信息里写清改了哪个技能。

## 已知限制

- `axure-prd-docx` 的「截图 → 内容模型 → DOCX」全流程尚未在真实 Axure 工程上做过端到端验收，
  目前验证到的是脚本与内置依赖可正常出文档；
- `spec-driven-prototype` 的字段生成需要一个项目配置文件：`templates/cfg.example.json` 只是示例（取自参考项目），
  复制成自己的 `cfg.json` 后要改 `pageSource` / `pageAlias` / `sourceRoles` / `blocks` / `lineSets`——页面映射不到时脚本直接报错，不猜；
- 六个技能都依赖模型按描述选技能，描述写得含糊就会选偏——命中不准时优先改 `description`。

## 许可

打包代码 MIT；`skills/` 下的技能正文版权归原作者，按其原授权使用。
