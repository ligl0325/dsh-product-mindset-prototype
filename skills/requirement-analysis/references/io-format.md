# 输入输出与 JSON 规范

## 目录

- [Excel 输入识别](#excel-输入识别)
- [中间 JSON](#中间-json)
- [优化模式](#优化模式)
- [命令](#命令)
- [工作簿输出](#工作簿输出)

## Excel 输入识别

常见原始需求列别名：`需求收集`、`原始需求`、`需求描述`、`需求内容`。

常见系统列别名：`涉及系统`、`一级需求`、`一级需求名称`、`系统`、`平台`。

常见五级列别名：

| 标准字段 | 可接受中文列名 |
|---|---|
| level1 | 一级需求、一级需求名称、涉及系统 |
| level2 | 二级需求、二级需求名称、模块 |
| level3 | 三级需求、三级需求名称、功能组 |
| level4 | 四级需求、四级需求名称、操作 |
| level5 | 五级需求、五级需求名称、规则约束 |

不要仅凭相似位置猜列。无法唯一映射时，列出实际表头并请用户确认。

## 中间 JSON

`mode` 为 `decompose` 时使用以下结构：

```json
{
  "mode": "decompose",
  "title": "需求五级分解",
  "rows": [
    {
      "id": "REQ-001-01",
      "original_requirement": "移动端用户可以使用手机号和验证码登录",
      "level1": "移动端",
      "level2": "身份认证模块",
      "level3": "短信验证码登录",
      "level4": "请求验证码",
      "level5": [
        "向输入手机号发送验证码",
        "待确认：验证码发送频率是多少？"
      ],
      "status": "待确认",
      "source": "需求清单 Sheet1 第 2 行"
    }
  ],
  "issues": [
    {
      "id": "ISSUE-001",
      "related_id": "REQ-001-01",
      "type": "规则缺失",
      "description": "未提供验证码发送频率",
      "question": "验证码发送频率是多少？"
    }
  ]
}
```

字段说明：

- `id`：稳定且唯一；拆分行时使用同一原始编号加子序号。
- `level5`：字符串或字符串数组。数组更利于逐条检查。
- `status`：`已确认`、`合理推断`、`待确认`、`建议`。
- `source`：文件、Sheet、行号、图片区域或对话原句等可定位来源。
- `issues`：可省略；存在待确认、冲突、缺失或不可验收内容时填写。

## 优化模式

`mode` 为 `optimize` 时同时提供原始与优化行：

```json
{
  "mode": "optimize",
  "title": "需求优化结果",
  "original_rows": [
    {
      "id": "REQ-001",
      "level1": "web端",
      "level2": "登录",
      "level3": "账号登录",
      "level4": "账号输入；密码输入",
      "level5": "待完善"
    }
  ],
  "rows": [
    {
      "id": "REQ-001",
      "original_requirement": "账号密码登录",
      "level1": "web端",
      "level2": "身份认证模块",
      "level3": "账号密码登录",
      "level4": "输入账号",
      "level5": "待确认：账号允许的字符与长度范围是什么？",
      "status": "待确认",
      "source": "原表第 2 行",
      "change_note": "拆分复合操作；规范模块名称；将缺失规则转为具体问题"
    }
  ],
  "issues": []
}
```

优化模式中 `original_rows` 与 `rows` 应按 `id` 对齐。若一行拆成多行，可在原始行和优化行中复用主编号并增加子序号，同时在 `change_note` 说明。

## 命令

检查 Excel 结构：

```bash
python scripts/requirement_workbook.py inspect --input 原始需求.xlsx --max-rows 20
```

验证 JSON：

```bash
python scripts/requirement_workbook.py validate --input decomposition.json
```

生成 Excel：

```bash
python scripts/requirement_workbook.py build --input decomposition.json --output 需求五级分解.xlsx
```

所有命令将 JSON 摘要写到标准输出。验证失败返回非零退出码。

## 工作簿输出

拆解模式生成 `需求分解`，存在问题时再生成 `待确认事项`。

优化模式生成：

1. `需求分解`：优化后的标准化结果；
2. `需求优化对比`：按编号展示原值、优化值和修改说明；
3. `问题点汇总`：展示缺失、歧义、冲突和待确认问题。

样式包括冻结表头、筛选、自动换行、边框、分层列宽，以及在完整祖先路径一致时合并相邻祖先单元格。五级规则会转为带序号的换行文本。
