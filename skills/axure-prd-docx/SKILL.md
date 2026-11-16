---
name: axure-prd-docx
description: 从 Axure 原型 + 需求拆解表 + 需求文档模板生成带原型截图和「规则|说明」表格的 DOCX 需求文档（Word）。用户提到 Axure、Axure 原型、原型目录、根据原型出需求文档/PRD/需求说明书、给文档补原型截图、生成 Word 需求文档时使用。
---

# Axure 原型 → DOCX 需求文档

把「Axure 原型 + 五级需求拆解表 + 需求文档模板」一次性渲染成可直接评审的 DOCX：逐页原型截图 + 每页一张「规则 | 说明」需求说明表格 + 需求列表 + 非功能需求。

## 何时使用（触发条件）

- 用户要求「根据原型出需求文档 / PRD / 需求说明书」，且给的是 Axure 导出的 HTML 目录；
- 已有需求拆解表（xlsx，五级需求）与需求文档模板（docx），要求产出同结构的 Word 文档；
- 需要给已有文档补/换原型截图、补需求说明表格；
- 需要把本 Skill 打包给别人或在其他客户端（Trae / Claude Code / Codex）安装。

## 三条硬性规范（违反即返工）

1. **原型截图必须排在需求说明表格之前**：页面标题 → 截图（含图注）→ kvTable → 子功能。
2. **需求说明必须以 kvTable 两列表格呈现**：表头「规则 | 说明」，左列规则项（功能描述/搜索/表格/交互说明/异常处理…）占 18%，右列说明占 82%，表头带 D9E2F3 底纹。
3. **截图只含低保真设计区**：不得出现右侧「需求说明/页面备注」面板，也不得保留大块灰底留白。

## 前置准备

### 1. Node

先调用 `load_workspace_dependencies`，用返回的 `node` 绝对路径当 `$NODE`（不要假设 `node` 在 PATH）。没有该工具时才退回 `Get-Command node`。

下文命令统一用 `& $NODE <脚本>`。

### 2. 依赖

`docx`、`jszip`、`xml-js` 已随本技能**内置**在 `vendor/modules/`，无需 `npm install`。脚本内置解析顺序：

1. `--modules <目录>`
2. 环境变量 `PRD_NODE_MODULES`
3. 技能目录内 `vendor/modules`（默认走这条）
4. 技能目录内 `node_modules`
5. 当前工作目录 `node_modules`
6. `~/node_modules`

报 `找不到 docx / jszip` 说明 `vendor/modules` 缺失（常见于打包时被排除），此时执行 `npm install`（`package.json` 已声明依赖），或用 `--modules` 指向已有的 `node_modules`。

### 3. Chrome

`capture.js` 自动探测：`CHROME_PATH` 环境变量 → PATH 中的 `chrome.exe` / `msedge.exe` / `chromium.exe` → 常见安装路径（Program Files、Program Files (x86)、LOCALAPPDATA；macOS / Linux 亦有对应路径）。
Windows 装了 Edge 即可直接用；如需强制：

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## 操作步骤（严格按序）

设工作目录 `$WORK`（截图、notes、xlsx.json 等中间产物都放这里），`$SKILL` 指向本技能目录：

```powershell
$SKILL = "<本技能目录>"          # 例：<插件目录>/skills/axure-prd-docx
$WORK  = Join-Path $env:TEMP "prd_work"
```

### 步骤 1：读输入（xlsx + 模板 docx）

```powershell
& $NODE "$SKILL\scripts\read_inputs.js" `
  --xlsx "E:\...\平安校园项目V1.0五级需求分解.xlsx" `
  --template "E:\...\【需求文档】安防综合管理平台V2.0-web端.docx" `
  --proto "E:\...\原型html2" `
  --out "$WORK\inputs"
```

产物：

- `$WORK\inputs\xlsx.json`：`{ 工作表名: { 行号: { 列号: 单元格文本 } } }`，列号为 0 基。
- `$WORK\inputs\template.txt`：`[样式]{IMG} 段落文本`，用于确认模板章节结构与图片位置。
- `$WORK\inputs\pages.json` / `pages.txt`（传了 `--proto` 时）：每个 html 的标题与文本元素，用于核对页面清单。

先读 `template.txt`，确认章节骨架与 `references/docx-structure.md` 一致；再读 `xlsx.json` 的表头行，确定 3.3 需求列表要用的列号（模块 / 功能点 / 需求说明 / 计划版本）。

### 步骤 2：批量截图

```powershell
& $NODE "$SKILL\scripts\capture.js" `
  --proto "E:\...\原型html2" `
  --out "$WORK\shots" `
  --notes "$WORK\notes.json"
```

常用可选参数：`--files "a.html,b.html"`（小样试跑）、`--pattern "a2-5-*"`、`--width 1920 --scale 1.5`、`--slice 2000 --seg 2600`、`--timeout 60000 --retries 2`。

脚本行为：

- 无头 Chrome + CDP（Node ≥18 内置 WebSocket），`deviceScaleFactor 1.5`；
- 在 `#base` 中找右侧备注面板（宽度 > 250、含「功能描述」且含「交互逻辑/交互说明/页面备注/需求说明/异常处理」），把其左侧起的所有同级容器 `display:none`；
- 测量设计区 bbox，宽度上限 1920，高度 ≤ `seg` 单图，否则按 `slice=2000` 分段输出 `_p1.._pN`；
- 输出 `notes.json`：`{ "<页面基名>": "<备注文本>", "_meta": {...} }`；**同标题页面只保留首份备注文本**（去重）；
- 单页有超时与重试（默认 2 次），失败页打印 `ERR` 不影响其他页。

### 步骤 3：建设内容模型（docspec）

复制 `assets/docspec.example.json` 到 `$WORK\docspec.json` 后改写（结构见 `references/docx-structure.md`）：

- `meta`：封面标题/版本/日期/适用范围、文档属性；
- `revision`：修订记录行；
- `chapters`：1~3 章、5 章的正文与表格（`para` / `bullets` / `numbered` / `table` / `image` / `reqTable`）；
- 第 4 章：`chapters` 中带 `modules` 的那一项，`modules[].items[].key` 必须**逐字等于原型 html 文件名去掉 `.html`**（含中文括号与下划线），否则取不到截图与备注。

建模型时先对齐清单：

```powershell
& $NODE -e "const n=require('$($WORK -replace '\\','/')/notes.json');console.log(Object.keys(n).filter(k=>k!=='_meta').join('\n'))"
```

key 缺失时，`build_docx.js` 会告警「未找到截图 / 空表格」，用 `synth` 字段兜底功能描述。

### 步骤 4：生成 DOCX

```powershell
& $NODE "$SKILL\scripts\build_docx.js" `
  --spec "$WORK\docspec.json" `
  --notes "$WORK\notes.json" `
  --shots "$WORK\shots" `
  --xlsx "$WORK\inputs\xlsx.json" `
  --images "E:\...\原型html2\images" `
  --out "$WORK\需求文档.docx"
```

渲染规则（固定，无需改代码）：

- 微软雅黑；正文 10.5pt（`size 21`）；标题 16/14/12/11/10.5pt；
- 图片最大 585×900 px，等比缩放，居中，图注 9pt 灰；
- kvTable 列宽 18% / 82%，表头「规则 | 说明」+ D9E2F3 底纹；
- 每个功能页：h4/h5 标题 → 图片(+图注) → kvTable → 子功能 h5；
- 3.3 需求列表按 docspec 中 `filter` / `columns` 从 xlsx.json 生成；
- 末尾打印 `bytes / images / kvTables / items`，用于核对数量。

### 步骤 5：校验（必做）

```powershell
# 1) 文件存在且体积合理（含截图通常 > 2MB）
Get-Item "$WORK\需求文档.docx" | Select-Object Length, LastWriteTime

# 2) 用 Word 只读打开，确认可解析（不改文件）
$w = New-Object -ComObject Word.Application; $w.Visible = $false
$d = $w.Documents.Open("$WORK\需求文档.docx", [ref]$false, [ref]$true)
"pages=$($d.ComputeStatistics(2)) tables=$($d.Tables.Count) shapes=$($d.InlineShapes.Count)"
$d.Close([ref]$false); $w.Quit()
```

再用 `references/docx-structure.md` 第 5 节的清单逐项核对：目录、图片在表格之前、kvTable 两列、超长页分段、截图无备注面板。

确认无误后，才把成稿写到交付路径。**不要覆盖已有的交付文件**，除非用户明确要求。

## 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 截图右侧出现「需求说明」面板 | 备注面板与设计区不在同一父级、或面板宽度 < 250 未被识别 | 检查 `--width`；确认页面有 `#base`；必要时在 docspec 之外单独调 `capture.js` 的判定阈值（`MEASURE` 中 `r.width>250`） |
| 截图右侧大片灰底留白 | 设计区 bbox 被隐藏元素撑大 | 确认 `hidden` 日志里有面板容器 id；调 `--seg` 观察段落是否合理 |
| 超长页只截到一半 | 高度 > 浏览器上限或 `--seg` 过大 | 保持默认 `--slice 2000 --seg 2600`；生成 docx 侧 900px 上限会自动缩放，但分段更清晰 |
| 图片被拉伸变形 | 非 PNG 或尺寸读取失败 | 只支持 PNG；`capture.js` 固定输出 PNG，勿手工替换 |
| 中文文件名报错 / 取不到截图 | PowerShell 引号或 key 被 sanitize | item.key 用原始 html 基名（含中文括号）；PowerShell 路径用双引号包住 |
| 需求说明表格为空或串行 | 备注面板结构不是「功能描述 + 交互说明」两段式 | 打开 `notes.json` 看实际文本；调整 `parseNotes` 的标签集合，或在 docspec 里写 `synth` 兜底 |
| 找不到 docx / jszip | 依赖不在 5 个候选目录内 | `npm install`，或 `--modules` / `PRD_NODE_MODULES` 指向已有 node_modules |
| 打包后对方跑不起来 | 导出的 zip 不含 `vendor/modules` | 对方执行 `npm install`，或用 `--modules` / `PRD_NODE_MODULES` 指向已有依赖 |
| 截图乱序/新旧混用 | 复用旧截图目录 | `capture.js` 会清理同名 `_pN` 旧分段；整批重跑建议清空 `--out` 目录 |

## 打包与安装（跨客户端）

```powershell
# 导出 zip（排除 node_modules / vendor，含 SKILL.md / scripts / references / assets / package.json）
& $NODE "$SKILL\scripts\port.js" export --out "$env:TEMP\axure-prd-docx.zip"

# 安装到指定客户端的 skills 目录（自动落到 <target>\axure-prd-docx）
& $NODE "$SKILL\scripts\port.js" install --target "<目标客户端>\skills"
& $NODE "$SKILL\scripts\port.js" install --target "<目标客户端>\skills" --force

# 查看已探测的客户端目录与安装状态
& $NODE "$SKILL\scripts\port.js" list
```

`list` 探测：`~/.trae-cn/skills`（Trae）、`~/.trae/skills`（Trae 国际版）、`~/.claude/skills`（Claude Code）、`~/.codex/skills`（Codex）。安装只复制文件，`vendor/modules` 不在导出范围内，目标环境需 `npm install` 或设置 `PRD_NODE_MODULES`。

## 目录说明

```
axure-prd-docx/
  SKILL.md                     本说明
  package.json                 依赖声明（docx / jszip / xml-js）
  scripts/capture.js           Axure 原型批量截图 + 备注抽取
  scripts/build_docx.js        内容模型 → DOCX 渲染器
  scripts/read_inputs.js       xlsx / 模板 docx / 原型目录解析
  scripts/port.js              export / install / list
  assets/docspec.example.json  通用示例内容模型（复制后改写）
  vendor/modules/              内置依赖 docx / jszip / xml-js（脚本自动找到）
  references/docx-structure.md 章节骨架与写作规范
```
