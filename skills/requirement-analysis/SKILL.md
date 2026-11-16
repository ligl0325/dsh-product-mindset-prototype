---
name: requirement-analysis
description: 将产品、软件和业务需求从文本、图片或 Excel 拆解为“系统—模块—功能组—原子操作—规则约束”五级结构，并生成或优化带追溯、待确认项和问题汇总的 Excel。用户要求需求分析、功能拆分、五级需求分解、需求规格化、验收规则梳理、图片需求识别，或审查/优化已有需求分解表时使用。
---

# 产品需求五级分解

## 运行时

本技能的脚本用 Python 跑，依赖 `openpyxl`。在 DSH 里先调用 `load_workspace_dependencies`，用返回的 `python` 绝对路径执行脚本（该运行时自带 `openpyxl`），不要假设 `python` 在 PATH，也不要安装无关依赖。下文 `python scripts/...` 均指该解释器。

## 目标

把原始需求转换为可评审、可追溯、可验收的五级结构。保留来源事实，明确推断和未知项，不把猜测写成确定规则。

## 工作流

1. 识别输入与期望产物。
   - 文本：直接提取原句、业务对象、用户动作和约束。
   - 图片：先查看图片并提取可辨认文字；对模糊内容标记“无法辨认”，不要猜测。
   - Excel：先运行 `scripts/requirement_workbook.py inspect --input <文件>` 查看 Sheet、表头和样例行，再映射列名。
   - 用户未指定格式时，少量内容先在对话中给出表格；批量输入或用户提供表格时输出 `.xlsx`。
2. 读取 [references/five-level-rules.md](references/five-level-rules.md)，按其中的层级定义、原子性和不确定性规则拆解。
3. 为每条原始需求建立追溯关系。
   - 一级：系统、平台或设备边界。
   - 二级：稳定的业务能力模块。
   - 三级：模块内聚的功能组。
   - 四级：单一、可观察的用户或系统操作。
   - 五级：与该四级操作直接对应的验收规则、校验、状态、异常或非功能约束。
4. 每个四级原子操作写一行。祖先层级可以重复，但不要在一个四级单元格中用分号塞入多个操作。
5. 处理未知信息。
   - 不虚构角色、权限、默认值、数值范围、时限、接口或错误文案。
   - 可从上下文稳健推断时，将状态标为“合理推断”并写明依据。
   - 无法确定时写 `待确认：<具体问题>`，状态标为“待确认”。
   - 只有用户明确要求补充行业最佳实践时，才提出建议值，并标记为“建议”，不得冒充原始要求。
6. 做质量检查：逐条核对覆盖、层级、原子性、规则可验收性、来源一致性和重复项。完整检查表见 [references/five-level-rules.md](references/five-level-rules.md)。
7. 需要 Excel 时，按 [references/io-format.md](references/io-format.md) 生成中间 JSON，再运行脚本构建工作簿：

```bash
python scripts/requirement_workbook.py validate --input decomposition.json
python scripts/requirement_workbook.py build --input decomposition.json --output 需求五级分解.xlsx
```

8. 重新打开或执行 `inspect` 验证生成文件的 Sheet、表头、行数和关键值。返回文件路径，并简要说明需求数、拆解行数及待确认项数量。

## 优化已有分解表

1. 用 `inspect` 读取原表，不覆盖源文件。
2. 保留每一行原值，建立等长的 `original_rows` 和优化后的 `rows`。
3. 只在有明确理由时修改；每一处实质修改都写入 `change_note`。
4. 将缺失、歧义、冲突、不可验收、越级或疑似臆测的问题写入 `issues`。
5. 使用 `mode: "optimize"` 构建三张 Sheet：`需求分解`、`需求优化对比`、`问题点汇总`。
6. 若原表粒度需要拆成多行，可以拆分，但为每个新行保留稳定的 `id`，并在 `change_note` 说明拆分关系。

## 输出约束

- 默认列为：`编号、原始需求、一级需求、二级需求、三级需求、四级需求、五级需求、状态、来源`。
- `五级需求` 可在 JSON 中使用字符串或字符串数组；脚本会规范为编号换行。
- `状态` 只使用 `已确认`、`合理推断`、`待确认`、`建议`。
- 保持输入顺序。不要为了表面整齐而改写原始需求。
- 合并单元格只用于相邻且完整祖先路径相同的层级，避免跨模块错误合并。
- 详细 JSON 字段、列名别名和命令见 [references/io-format.md](references/io-format.md)。

## 失败处理

- 缺少必需列时，列出实际表头与可接受别名，并请求用户确认映射。
- 图片无法辨认时，指出具体区域并请求更清晰版本。
- 脚本缺少 `openpyxl` 时，改用 `load_workspace_dependencies` 返回的 Python 运行时；不要安装与任务无关的整套依赖。
- 输出路径已存在时，除非用户明确允许覆盖，否则选择新文件名。
