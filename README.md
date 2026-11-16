# 产品技能包 · dsh-product-mindset-prototype

把两个产品经理 skill 打成一个 DeepSeek Harness 插件，**装完即生效**，不用再往 `~/.agents/skills` 里散装复制。

| 技能 | 版本 | 作用 |
|---|---|---|
| `product-mindset` | 产品心法 v2.0.0 | 任务路由器：一句话判断意图，再只加载 1 个工作流 + 至多 1 个模板。覆盖产品 Brief、项目诊断、PRD、竞品调研、五级需求拆解、优先级（ICE/RRS）、多方评审、上线复盘 |
| `quick-prototype` | 快速原型 v4.3.0 | 六种设备形态的单文件可交互 HTML 原型（Web 后台 / H5 / 原生 APP / PC 桌面 / 嵌入式 / 会议一体机），也可把已有分析排版成可阅读、可打印的 HTML 报告 |

## 安装

**方式一：本地目录（已经 clone 下来时最快）**

在 DSH 里打开 **Plugins**，选「添加插件 / Add plugin」，选中你 clone 出来的这个目录；
或让 Agent 执行（把 `<本仓库目录>` 换成你自己的绝对路径）：

```js
plugin_manager({ action: "install_bundle", target: "<本仓库目录>" })
```

**方式二：GitHub（发给别人用，不用传文件）**

仓库：<https://github.com/ligl0325/dsh-product-mindset-prototype>

```js
plugin_manager({ action: "install_bundle", target: "github:ligl0325/dsh-product-mindset-prototype" })
```

在 **Plugins → 添加插件** 里填 `github:ligl0325/dsh-product-mindset-prototype` 也可以。

> 仓库名、包名、行 id 现在统一为 `dsh-product-mindset-prototype`。改名要同步这四处：
> `package.json` 的 `name`、`cordis.patch.yml` 的行 `name`、`index.js` 的插件名与 provider 名、以及本节的三条安装命令。

**方式三：npm（可选，需要你的 npm 账号）**

```sh
npm publish
plugin_manager({ action: "install_bundle", target: "dsh-product-mindset-prototype" })
```

装完后**开一个新会话**，或者直接在输入框敲 `/` 看命令菜单里有没有 `product-mindset` / `quick-prototype`。

## 用法：直接说人话，不用敲技能名

DSH 的技能路由看的是每个技能 frontmatter 里的 `description`，跟技能名无关。正常说话就会命中：

| 你说 | 命中 | 会发生什么 |
|---|---|---|
| 「写一份 B 端工单系统的轻量 PRD」「把需求整理成 PRD」 | `product-mindset` | 读 `references/workflows/prd.md` + 一个 PRD 模板 |
| 「拆一下这个需求，拆到能开发」「这个功能值不值得做」 | `product-mindset` | 五级需求拆解 / 产品 Brief 工作流 |
| 「调研一下竞品」「需求太多帮我砍范围」 | `product-mindset` | 竞品调研 / ICE、RRS |
| 「做个会议室一体机的看板原型」「出个 demo 给我看」 | `quick-prototype` | 读 `templates-conference.md`，出单文件 HTML |
| 「画个线框图」「做个界面稿」 | `quick-prototype` | 按设备形态选模板 |
| 「把这份调研结论排成网页报告」 | `quick-prototype` | 报告模式（`report-html.md`） |

### 关键词表（写进 `description` 的触发词）

- **`product-mindset`**：PRD、需求、写需求、拆需求、需求分析、需求文档、功能清单、五级需求、用户故事、验收标准、立项、诊断、竞品、调研、优先级、ICE、RRS、砍范围、评审、会议纪要、复盘、值不值得做、要不要做、先做什么、怎么落地、政策转规则、边缘 AI / Agent
- **`quick-prototype`**：原型、页面原型、交互原型、demo、演示、样机、mockup、线框图、草图、UI 预览、界面稿、看板大屏、会议大屏、签到屏、H5 页面、后台管理页面、HTML 报告

`/product-mindset`、`/quick-prototype` 仍然可用（想强制指定时才需要）。命中范围不对时，改对应 `SKILL.md` 顶部的 `description` 就行——这是唯一的路由配置。

技能引用的 `references/`、`templates-*` 跟着 `resourceBase` 解析，相对路径照旧可用；**没被加载的文件不进上下文**。

## 目录结构

```
dsh-product-mindset-prototype/
├── package.json          # dsh.bundle.patch 声明，exports 暴露 . / ./icon / ./locale
├── cordis.patch.yml      # 插入 1 行：product-mindset-prototype
├── index.js              # 自带 skill provider，只读本包 skills/
├── skills/
│   ├── product-mindset/  # SKILL.md + references/(13) + templates/(7)
│   └── quick-prototype/  # SKILL.md + design-rules + report-html + templates-*(6)
├── locale/en.json  locale/zh.json   # Plugins 面板里的标题/说明（含详情页路径）
├── docs/DETAIL.md  docs/DETAIL.zh.md  docs/preview.svg   # 详情页配图
├── icon.svg              # 36×36 原创矢量图标
├── tools/validate.mjs    # 打包自检（manifest、locale、图标、技能结构、相对链接）
├── tools/smoke.mjs       # provider 契约冒烟测试（不需要安装 DSH）
└── README.md  LICENSE
```

## 工作原理

`index.js` 用 `ctx.skills.registerProvider()` 自己注册一个 provider，从本包 `./skills` 读两个 `SKILL.md`：
解析 frontmatter 得到 `name`/`description`，去掉 frontmatter 后的正文交给模型，`resourceBase` 指向该技能目录，
所以 `references/workflows/prd.md`、`templates-web.md` 这些相对引用照常可读。

- **只用 Node 内置模块**（`node:fs/promises`、`node:path`、`node:url`），不依赖任何 npm 包。
  本地目录安装时插件是被 `link:` 进 profile 的，从它自己的位置解析不到 `@deepseek-ai/*`，
  所以这里刻意不动态引入 `@deepseek-ai/dsh-skill-filesystem`（这是第一版踩过的坑）。
- provider 随插件行卸载：**停用插件 = 两个技能立刻从所有会话消失**，不留垃圾。
- rank 用 300（等同文件系统 custom 根）。rank 只在**同一层内**比较：
  项目 100 < runtime 250 < custom 300 < 用户根 400/500 < 内置 600，小者胜。

### ⚠️ 优先级须知（重要）

DSH 的技能目录按"层"合并，**离 Agent 最近的层胜出，与 rank 无关**。
`~/.agents/skills`、`~/.dsh/skills` 和项目 `.dsh/skills` 是由 **Agent 预设自带的 skill provider** 扫描的，
属于比 Host 层更近的作用域，所以**这些目录里的同名技能会盖住插件版本**。

- 装插件前先确认这些目录里没有同名副本；有的话先挪到别处备份，再装插件；
- 想临时覆盖插件版本，把同名技能放进 `~/.agents/skills/<名字>/SKILL.md` 就行（这是 DSH 的正常语义，不是 bug）。

## 自检

```sh
npm run check     # = node tools/validate.mjs && node tools/smoke.mjs
```

- `validate.mjs`：manifest、patch 行、locale 的 `meta.title/description/detail`、详情页只含一张图、
  图标合规（尺寸/无 script/style/text/image）、每个 skill 的 frontmatter（kebab-case `name` + `description`）、
  `SKILL.md` 里所有相对 Markdown 链接都有目标文件。
- `smoke.mjs`：用假的 `ctx` 跑一遍 `apply()`，断言 provider 能列出/加载两个技能，
  且每个字段都符合 DSH 技能注册表的校验要求（rank、provider 名、invocation、resourceBase、正文无 frontmatter）。

两个都不需要安装 DSH，改完内容提交前跑一次即可。

## 维护

- **改技能内容**：直接覆盖 `skills/<技能名>/` 下的 Markdown，保存即生效——provider 每次读取都重新解析文件，并监听 `SKILL.md` 的变化主动刷新技能目录，不用重装、不用重启。
- **改命中范围**：只改 `SKILL.md` 顶部 frontmatter 的 `description`（写用户会说的词），`name` 不要动。
  本包对上游的 `description` 做了关键词增强：产品心法 v2.0.0、快速原型 v4.3.0 的原描述里没有「需求文档 / demo / 线框图」这类词，导致自动命不中。
- **改 `index.js`**：ESM 模块会被进程缓存，需要重启 DSH 或重新安装插件才会加载新代码。
- 改完把 `package.json` 的 `version` 加一，跑 `npm run check`。

## 没打进包的东西

源目录里这些不属于 skill 运行时，已剔除：

- `ai-marketing-assistant.html`、`quick-prototype-skill-report.html`（原型/报告的交付物，正文未引用）
- `产品心法报告.html`、`重构实施计划.md`（开发过程产物）
- `scripts/validate_package.py`（skill 作者自己的包校验脚本，本仓库用 `tools/validate.mjs` 代替）

## 验证记录（2026-11-16）

- `install_bundle` 返回 `application: applied`，`include:product-mindset-prototype` 行 `fiberPhase: active`；
- 新会话技能目录出现 `product-mindset` / `quick-prototype`，描述分别是 v2.0.0 与 v4.3.0 的文案；
- 加载 `quick-prototype` 时 `<skill_resources>` 正确指向包内 `skills/quick-prototype`，正文为 v4.3.0（含 HTML 报告模式）；
- 旧的三个散装副本（产品心法 v1.1、快速原型 v4.2.0、快速原型 v4.3.0 副本）已备份并移出 `~/.agents/skills`；
- **未验证**：Plugins 面板里图标、标题、详情页的实际渲染（当前会话没有浏览器控制能力）。
  资源文件本身已通过 `validate.mjs` 校验。

## 卸载与回退

插件里点停用或卸载即可。想回到散装方式，把之前备份的三个技能目录拷回用户技能根 `~/.agents/skills/`。

## 许可

打包代码 MIT；`skills/` 下的技能正文版权归原作者 蕉佬，按其原授权使用。
