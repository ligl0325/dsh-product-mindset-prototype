# 产品技能包 · dsh-product-mindset-prototype

把五个产品经理技能打成一个 DeepSeek Harness 插件，**装完直接说人话就能用**，不用敲 `/技能名`，也不用往 `~/.agents/skills` 里散装复制。

| 技能 | 内容 | 运行时 |
|---|---|---|
| `product-mindset` | 产品心法 v2.0.0：方法论与文档路由器（Brief / 立项诊断 / PRD / 竞品调研 / 优先级 / 评审会 / 复盘），只加载 1 个工作流 + 至多 1 个模板 | 纯 Markdown |
| `quick-prototype` | 快速原型 v4.3.0：六种设备形态的单文件可交互 HTML 原型 + 可打印 HTML 报告 | 纯 Markdown |
| `product-prototype-review` | 原型与业务功能说明六维校验（完整性 / 布局 / 功能逻辑 / 交互 / 创新 / 内容），输出 P0/P1/P2 评审报告 | 纯 Markdown |
| `requirement-analysis` | 五级需求拆解（系统—模块—功能组—操作—规则）→ 带追溯、待确认项、问题汇总的 Excel | Python（`openpyxl`，DSH 自带） |
| `axure-prd-docx` | Axure 原型 + 五级需求表 + 文档模板 → 带截图和「规则｜说明」表格的 DOCX 需求文档 | Node + 无头 Chrome（依赖已内置） |

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

装完后**开一个新会话**，或者直接在输入框敲 `/` 看命令菜单里有没有这五个技能。

## 用法：直接说人话

DSH 的技能路由看的是每个技能 frontmatter 里的 `description`，跟技能名无关。正常说话就会命中：

| 你说 | 命中 | 会发生什么 |
|---|---|---|
| 「写一份 B 端工单系统的轻量 PRD」「这个功能值不值得做」 | `product-mindset` | 读 `references/workflows/prd.md` + 一个 PRD 模板 |
| 「调研一下竞品」「需求太多帮我砍范围」 | `product-mindset` | 竞品调研 / ICE、RRS |
| 「做个会议室一体机的看板原型」「出个 demo 给我看」 | `quick-prototype` | 读 `templates-conference.md`，出单文件 HTML |
| 「把这份调研结论排成网页报告」 | `quick-prototype` | 报告模式（`report-html.md`） |
| 「检查这个原型」「原型和需求对不对得上」 | `product-prototype-review` | 六维校验 + P0/P1/P2 报告 |
| 「把这份需求拆成五级表」「优化我这张需求分解表」 | `requirement-analysis` | 生成/优化 `.xlsx`，带追溯与待确认项 |
| 「根据 Axure 原型出需求文档」「生成 Word 版 PRD」 | `axure-prd-docx` | 截图 → 内容模型 → DOCX |

### 五个技能的边界（避免抢词）

- `product-mindset` 只管**方法论与文档写法**，不产 Excel 表格、不评原型；
- `requirement-analysis` **独占**「拆需求 / 五级需求 / 需求分解表 / Excel」；
- `quick-prototype` **只生成**原型，不评；
- `product-prototype-review` **只评审**原型与业务说明；
- `axure-prd-docx` 负责**最终 Word 交付物**（截图 + 需求表格）。

想改某个技能的命中范围：改它 `SKILL.md` 顶部的 `description`，保存后下一次请求就按新词路由（插件监听文件变化，见「维护」）。

## 目录结构

```
dsh-product-mindset-prototype/
├── package.json / cordis.patch.yml / index.js   # 一行插件，自带 skill provider
├── skills/                                      # 扫这个目录，放进去就生效
│   ├── product-mindset/                         # SKILL.md + references(13) + templates(7)
│   ├── quick-prototype/                         # SKILL.md + design-rules + report-html + templates-*(6)
│   ├── product-prototype-review/                # SKILL.md（自包含，无外部依赖）
│   ├── requirement-analysis/                    # SKILL.md + references(2) + scripts/requirement_workbook.py
│   └── axure-prd-docx/                          # SKILL.md + scripts(4) + references + assets + vendor/modules
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
- **只用 Node 内置模块**，不依赖任何 npm 包（本地目录安装是 `link:`，从它自己的位置解析不到 `@deepseek-ai/*`）；
- 监听 `skills/` 的文件变化并主动刷新技能目录：改描述、改正文下一次请求即生效；
- provider 随插件行卸载：**停用插件 = 五个技能立刻从所有会话消失**；
- rank 用 300（等同文件系统 custom 根）。rank 只在**同一层内**比较：项目 100 < runtime 250 < custom 300 < 用户根 400/500 < 内置 600。

### ⚠️ 优先级须知

DSH 的技能目录按「层」合并，**离 Agent 最近的层胜出，与 rank 无关**。
`~/.agents/skills`、`~/.dsh/skills` 和项目 `.dsh/skills` 由 **Agent 预设自带的 skill provider** 扫描，
属于比 Host 层更近的作用域，所以**这些目录里的同名技能会盖住插件版本**。

- 装插件前先确认这些目录里没有同名副本；有的话先挪到别处备份，再装插件；
- 想临时覆盖插件版本，把同名技能放进 `~/.agents/skills/<名字>/SKILL.md` 就行（这是 DSH 的正常语义，不是 bug）。

## 脚本类技能的运行时

- `requirement-analysis`：先调 `load_workspace_dependencies` 拿 `python` 绝对路径（自带 `openpyxl`），再跑
  `scripts/requirement_workbook.py`。不要假设 `python` 在 PATH，也不要安装无关依赖。
- `axure-prd-docx`：
  - Node 用 `load_workspace_dependencies` 返回的 `node`；
  - `docx` / `jszip` / `xml-js` 已内置在 `skills/axure-prd-docx/vendor/modules/`（约 3.7MB，已裁剪到运行必需文件），
    脚本会自动找到，**不需要 `npm install`**；
  - 截图需要本机 Chrome 或 Edge（`capture.js` 自动探测，可用 `CHROME_PATH` 强制指定）。

## 自检

```sh
npm run check     # = node tools/validate.mjs && node tools/smoke.mjs
```

- `validate.mjs`：manifest、patch 行、locale 的 `meta.title/description/detail`、详情页只含一张图、
  图标合规、每个 skill 的 frontmatter（kebab-case `name` + `description`）、`SKILL.md` 里所有相对 Markdown 链接都有目标文件。
- `smoke.mjs`：用假的 `ctx` 跑一遍 `apply()`，断言 provider 能列出/加载**五个**技能、
  每个字段符合 DSH 技能注册表校验，并且五个技能的关键词路由词都还在（改描述把词改没了会直接报错）。

## 维护

- **加技能**：在 `skills/` 下新建目录放 `SKILL.md`（+ 可选 references/assets/scripts），跑 `npm run check` 即可，代码不用动。
- **改技能内容**：直接覆盖 Markdown，保存即生效。
- **改命中范围**：只改 `SKILL.md` 顶部 frontmatter 的 `description`（写用户会说的词），`name` 不要动。
  本包对上游描述做过关键词增强：产品心法 v2.0.0、快速原型 v4.3.0 的原描述里没有「需求文档 / demo / 线框图」这类词。
- **改 `index.js`**：ESM 模块会被进程缓存，需要重启 DSH 或停用/启用插件才会加载新代码。
- 改完把 `package.json` 的 `version` 加一，跑 `npm run check`。

## 交付物与隐私

- 本仓库不进版本控制的：`NOTES.local.md`（本机路径与备份位置）、`node_modules/`、`*.tgz`。
- `axure-prd-docx` 的上游版本曾把同事机器的路径（`C:\Users\…`、`E:\SVN-…`）和某个真实客户项目的
  `docspec.paxc.json` 写进技能里；本包已清掉这些内容，只留通用示例 `assets/docspec.example.json`。
- `product-prototype-review` 的上游版本引用了 9 个不存在的规范/模板文件，本包把它重写成自包含版本。

## 验证记录（2026-11-16，v2.0.0）

- `install_bundle` 返回 `application: applied`，`include:product-mindset-prototype` 行 `fiberPhase: active`；
- 技能目录出现五个技能，描述与 `SKILL.md` 一致；
- 编辑 `SKILL.md` 的 `description` 后，无需重启即刷新（watcher 生效，实测）；
- `pnpm pack` 产物含全部技能文件与 `vendor/modules`；
- **未端到端验证**：`axure-prd-docx` 的截图→DOCX 全流程（缺真实的 Axure 原型目录与模板 docx）、
  `requirement-analysis` 的真实需求输入（只验证了脚本与依赖可用）；Plugins 面板的图标/详情页渲染。

## 没打进包的东西

源目录里这些不属于技能运行时，已剔除：

- `ai-marketing-assistant.html`、`quick-prototype-skill-report.html`（原型/报告的交付物，正文未引用）
- `产品心法报告.html`、`重构实施计划.md`（开发过程产物）
- `scripts/validate_package.py`（技能作者自己的包校验脚本，本仓库用 `tools/validate.mjs` 代替）
- `requirement-analysis/agents/openai.yaml`（其他客户端的 agent 清单，DSH 不读）
- `axure-prd-docx/assets/docspec.paxc.json`（真实客户项目内容，换成通用示例）

## 许可

打包代码 MIT；`skills/` 下的技能正文版权归原作者，按其原授权使用。
