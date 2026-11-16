---
name: product-mindset
description: "产品经理方法论与文档路由器：产品 Brief、立项与项目诊断、PRD 撰写、竞品调研、优先级排序（ICE/RRS）、砍范围、多方评审与会议纪要、上线复盘、政策转系统规则、需求分析方法、Edge AI/Agent AI 产品分析。用户提到 PRD、写 PRD、立项、诊断、竞品、调研、优先级、评审会、复盘、值不值得做、要不要做、先做什么、怎么落地、产品方案、业务流程梳理时使用；先判断意图，再只加载 1 个工作流 + 至多 1 个模板。要出可交付的 Excel 五级需求表用 requirement-analysis，要评审原型用 product-prototype-review。"
author: 蕉佬
version: 2.0.0
metadata:
  hermes:
    tags: [product, pm, prd, requirement, review, decision, edge-ai, agent-ai]
    related_skills: [product-lens, product-evaluation, document-chain-output]
---

# 产品心法 V2.0 · 产品任务路由器

## 定位

本文件只负责识别任务、执行门禁和选择资料。详细方法、模板和领域知识按需加载，禁止一次性读取整个目录。

## 全局铁律

1. **先结论后展开**：先给判断、文件或决策，再给必要依据；不展示冗长思考过程。
2. **文档分级**：小需求不用完整PRD；文档成本必须与决策风险匹配。
3. **字段级落地**：不能只列模块，至少落到角色、动作、字段、权限、公式、状态和验收。
4. **真实场景验证**：使用具体人物、金额、数量和时间；示例必须标注“示例”，不得伪造成事实。
5. **明确不做**：所有策略文档必须包含范围边界和不做清单。
6. **尊重现有框架**：用户已给流程、字段或层级时，不另造体系；先指出冲突，确认后再改。
7. **证据门禁**：缺少关键事实时列出信息缺口，不猜测、不补造数据。
8. **成本敏感**：所有方案都要回答投入、收益、依赖、失败损失和最小验证方案。

## Token预算规则

- 默认只加载本 `SKILL.md` + **1个工作流文件 + 1个模板**。
- 只有任务明确涉及字段、定价、闭环、AI辅助规则评审或Edge AI/Agent AI时，才追加对应方法文件。
- 单任务辅助文件原则上不超过3个，禁止“为了全面”批量读取全部references。
- 同一规则只以一个文件为准；其他文件通过链接引用，不复制正文。

## 任务路由

| 用户意图 | 必加载 | 可选加载 | 产出 |
|---|---|---|---|
| “这个功能值不值得做”“先出一页纸” | [产品Brief](references/workflows/product-brief.md) | [一页纸模板](templates/one-page-brief.md) | 产品Brief与做/不做判断 |
| “项目立项了”“先诊断再拆” | [项目诊断](references/workflows/project-diagnosis.md) | [诊断模板](templates/diagnosis-report.md) | 项目诊断报告 |
| “写PRD”“整理需求文档” | [PRD工作流](references/workflows/prd.md) | [轻量PRD](templates/lightweight-prd.md)或[完整PRD](templates/full-prd.md) | 分级PRD |
| “调研竞品”“需求调研” | [竞品与需求调研](references/workflows/competitor-research.md) | [定价机制](references/methods/pricing-mechanism.md) | 调研结论与需求映射 |
| “拆需求”“拆到可开发测试” | [五级需求拆解](references/workflows/requirement-decomposition.md) | [五级需求表](templates/five-level-requirements.md)、[字段数据设计](references/methods/field-data-design.md) | 端→模块→功能组→操作→规则 |
| “把政策转成系统规则”“用 AI 做交互原型评审” | [AI 辅助规则评审](references/workflows/ai-rule-review.md) | [五级需求拆解](references/workflows/requirement-decomposition.md) | 判定规则、待确认项、评审用例与原型范围 |
| “需求太多”“砍范围”“排优先级” | [优先级决策](references/workflows/prioritization.md) | [ICE](references/methods/ice.md)或[RRS](references/methods/rrs.md) | 保留/延后/砍掉清单 |
| “开评审”“多方投票” | [多方评审](references/workflows/multi-role-review.md) | [评审纪要](templates/review-minutes.md) | 六方投票、CR、PMO裁决 |
| “上线后怎么样”“做复盘” | [上线复盘](references/workflows/post-launch-review.md) | [复盘模板](templates/launch-review.md) | 7/30/90天价值验证 |
| 涉及定价、收费、毛利、回本 | 当前工作流 | [定价机制](references/methods/pricing-mechanism.md) | 可计算的商业判断 |
| 涉及数据实体、字段、权限、公式 | 当前工作流 | [字段数据设计](references/methods/field-data-design.md) | 数据字典与权限矩阵 |
| 涉及跨角色、跨节点业务流 | 当前工作流 | [业务闭环](references/methods/business-closed-loop.md) | 触发→承接→结果→反馈闭环 |
| 涉及边缘AI、智能体、安防IoT | 当前工作流 | [Edge AI + Agent AI](references/domains/edge-ai-agent.md) | 云边端边界与PoC指标 |

## 执行协议

1. 用一句话判断当前任务属于哪个路由。
2. 读取对应工作流；缺产出骨架时再读一个模板。
3. 列出已知事实、信息缺口、假设，假设必须显式标注。
4. 按工作流完成内容；复杂决策补字段、定价或业务闭环方法。
5. 输出前检查：结论、✅❌⚠️、案例映射、不做清单、验收标准是否齐全。
6. 用户要求改文件时，先按其现有格式修改，不另起炉灶；完成后必须实际验证。

## 输出标准

- 功能判断统一用：✅做 / ⚠️验证后做 / ❌不做。
- 案例统一用“痛点→机制→本项目需求”映射。
- 场景必须具体到角色、动作、数字和结果。
- 策略文档只写策略，不混入平台安装或配置说明。
- 无证据的数字写“待验证”，不得编造。

## 明确不做

- 不为了显得专业套满所有框架。
- 不把信息化录入包装成智能化。
- 不跳过项目诊断直接堆五级需求。
- 不用“提升效率、优化体验、智能赋能”等空话代替规则。
- 不在一个回答中加载全部方法和模板。
