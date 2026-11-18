#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""extract-legacy-fields.py — 老系统界面文本 → 结构化字段 JSON（工作流步骤① 抽字段）

【解决什么问题】
老系统没有接口、没有导出，字段只能从界面上复制出来的文本里认。本脚本把一个目录的 *.txt
批量解析成「按页面名分组的字段全量 JSON」，并另出一份抽取报告：各位置条数、被剔除的杂质、
被拆开的并格。产出给步骤② 建规格用，也是步骤③ 生成字段的原始录入顺序来源。

【用法】
  python scripts/extract-legacy-fields.py --dir <文本目录> --out <字段全量.json>
  python scripts/extract-legacy-fields.py --dir <文本目录> --out <json> --split split.json
  python scripts/extract-legacy-fields.py --dir <文本目录> --out <json> --report <报告.md>

  --dir     老系统界面文本目录：一个 .txt = 一个页面，文件名（去后缀）即页面名
  --out     输出 JSON：{ "页面名": [ {field, pos, enums, star}, ... ] }
  --split   可选配置 JSON：并格拆分表 / 杂质黑名单 / 分区标记，字段见下方「配置」
  --report  抽取报告 md 路径（默认与 --out 同目录的「抽取报告.md」；传空串 "" 则不写）
  --quiet   只打印一行汇总

【位置分区规则】（默认，全部可被 --split 覆盖）
  文本按出现顺序切四段，位置名固定为四值：
    查询条件 → 列表列（出现 listStart 标记后）→ 表单字段（出现 formStart 标记后）
            → 明细行字段（出现 detailMarks 之一后）
  1) 查询条件：*字段名： 独占一行；下一行若是逗号列表且不含制表符，作为枚举，该行不再当字段。
  2) 列表列：  逐行即列名；表头「序」、带「(降序)」、纯数字的汇总行剔除。
  3) 表单字段：*字段名： / 字段名： 独占一行；允许无冒号（老系统粘出来常丢冒号）。
  4) 明细行字段：不含制表符、长度 2..maxFieldLen 的短行；以全角「：」结尾的行视为表单标签，跳过。
  5) 星号前缀 * / ** 记入 star（"*" / "**" / ""），与字段名分开存，不改字段名本身。

【四条硬规则】
  1) 去重键 = （字段名 + 位置）。同一页面同一位置重复出现只保留首次；同名不同位置都保留。
  2) 并格拆分：老系统把多个列粘在一格（例：开票型号 品牌）→ 按 split 表拆成独立字段。
  3) 杂质黑名单：公司名、部门路径、示例值、界面按钮（自动生成 / 选择引用 / 草稿 …）按 noise + noisePatterns 剔除。
  4) 逐字保留：只去掉星号与界面装饰引号、去尾部冒号；**错别字照抄不修**（铁律 4），
     修改只走 split / noise 配置，保证可复现、可审计。

【配置】（--split 指向的 JSON，全部键可选）
{
  "split":            { "开票型号品牌": ["开票型号", "品牌"] },
  "splitSpace":       true,
  "noise":            ["自动生成", "选择引用", "草稿", "未签单"],
  "noisePatterns":    ["^\\d{4}-\\d{2}-\\d{2}$", "^\\d+(\\.\\d+)?$", "有限公司$"],
  "detailMarks":      ["订单明细：", "签单行", "样品订单行"],
  "listStart":        ["拖拽列头到这里以用它分组"],
  "formStart":        ["新增弹窗", "详细信息"],
  "endMarks":         ["没有数据", "没有记录"],
  "listDropPatterns": ["^序\\s*$", "\\(降序\\)$"],
  "pageNames":        { "界面文本文件名": "规格里的页面名" },
  "maxFieldLen":      26,
  "startMode":        "查询条件",
  "encoding":         "auto"
}

startMode 用于「页面文本不是从查询区开始」的情况（例：只有表单的页面传 "表单字段"）；分区仍是单向推进。

【退出码】0 成功｜1 没有可用输入（无 .txt 或全部页面抽不到字段）｜2 参数/文件错误

【配套】[SKILL.md](../SKILL.md)｜[workflow.md](../references/workflow.md) 步骤①｜细则 [field-extraction.md](../references/field-extraction.md)｜下游 [gen-fields.mjs](gen-fields.mjs)
"""
import argparse
import json
import os
import re
import sys

# 四种位置名（与规格字段清单的「显示位置」列逐字一致）
POS_QUERY, POS_LIST, POS_FORM, POS_LINE = "查询条件", "列表列", "表单字段", "明细行字段"
POS_ORDER = [POS_QUERY, POS_LIST, POS_FORM, POS_LINE]
POS_DONE = "结束"  # 仅内部状态：列表区已结束、表单区尚未开始

DEFAULTS = {
    "split": {},
    "splitSpace": True,
    "noise": [
        "自动生成", "选择引用", "新建弹窗", "详细信息", "提交", "草稿",
        "无", "首页", "上一页", "下一页", "尾页", "转到", "页", "汇总:",
        "未签单",
        # 注意：老系统的段标题（例：「基础信息系统信息」）**不进黑名单**——它是表单分段的信号，
        # 由 gen-fields.mjs 的 sectionTitles 名单识别为段标题，不算字段。
    ],
    "noisePatterns": [
        r"^\d{4}-\d{2}-\d{2}$",
        r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$",
        r"^\d+(\.\d+)?$",
        r"有限公司$",
        r"股份有限公司$",
        r"[/>]\s*\S+[/>]",
    ],
    "detailMarks": ["订单明细：", "签单行", "样品订单行", "退货单行", "退回明细行：", "换货明细行：", "销售单行："],
    "listStart": ["拖拽列头到这里以用它分组"],
    "formStart": ["新增弹窗", "详细信息"],
    "endMarks": ["没有数据", "没有记录"],
    "listDropPatterns": [r"^序\s*$", r"\(降序\)$"],
    "pageNames": {},
    "maxFieldLen": 26,
    "startMode": POS_QUERY,
    "encoding": "auto",
}

DECOR = "\u201c\u201d\u2018\u2019\"'"


def die(msg, code=2):
    """可读错误：统一前缀，便于在日志里 grep。"""
    sys.stderr.write("错误：" + msg + "\n")
    sys.exit(code)


def load_cfg(path):
    cfg = json.loads(json.dumps(DEFAULTS))  # 深拷贝
    if not path:
        return cfg
    if not os.path.isfile(path):
        die("找不到配置文件 --split " + path)
    try:
        with open(path, encoding="utf-8-sig") as f:
            user = json.load(f)
    except json.JSONDecodeError as e:
        die("配置文件不是合法 JSON（" + path + "）：第 " + str(e.lineno) + " 行 " + e.msg)
    if not isinstance(user, dict):
        die("配置文件顶层必须是对象（" + path + "）")
    for k, v in user.items():
        if k not in DEFAULTS:
            sys.stderr.write("提示：配置里的未知键 " + k + " 已忽略\n")
            continue
        if isinstance(DEFAULTS[k], dict):
            merged = dict(DEFAULTS[k])
            merged.update(v or {})
            cfg[k] = merged
        elif isinstance(v, list) and k in ("noise",):  # 黑名单：配置即全量替换，避免叠加到无法解释
            cfg[k] = list(v)
        else:
            cfg[k] = v
    return cfg


def read_text(path, cfg):
    """encoding=auto 时 utf-8-sig 优先、失败退回 gbk；指定时只用指定的编码。"""
    if cfg.get("encoding") and cfg["encoding"] != "auto":
        try:
            with open(path, encoding=cfg["encoding"]) as f:
                return f.read()
        except (UnicodeDecodeError, LookupError):
            die("按配置的 encoding=" + str(cfg["encoding"]) + " 无法解码：" + path)
    for enc in ("utf-8-sig", "gbk"):
        try:
            with open(path, encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    die("无法解码文本（试过 utf-8 / gbk）：" + path)


def strip_decor(s):
    """去掉界面装饰：首尾空白、引号、尾部冒号。星号在外层单独处理。"""
    s = s.strip().strip(DECOR)
    s = re.sub(r"[:：]+\s*$", "", s)
    return s.strip().strip(DECOR).strip()


# 词黑名单（noise 精确 + noisePatterns 正则），拆分前后都套
class Noise(object):
    def __init__(self, cfg):
        self.exact = set(cfg["noise"])
        self.res = []
        for p in cfg["noisePatterns"]:
            try:
                self.res.append(re.compile(p))
            except re.error as e:
                die("noisePatterns 里的正则不合法：" + p + "（" + str(e) + "）")

    def hit(self, name):
        if not name:
            return True
        if name in self.exact:
            return True
        return any(r.search(name) for r in self.res)


def note_noise(name, pos, noise, report):
    """登记被黑名单剔除的串（只登记非空且命中的），供报告逐条人工确认。"""
    if name and noise.hit(name) and name not in report["noiseSet"]:
        report["noiseSet"].add(name)
        report["noise"].append((pos, name))


def split_name(name, cfg):
    """并格拆分：先查 split 表（键忽略空格），再按空格拆（splitSpace）。"""
    table = cfg["split"]
    if name in table:
        return list(table[name])
    nosort = re.sub(r"\s+", "", name)
    for k, v in table.items():
        if re.sub(r"\s+", "", k) == nosort:
            return list(v)
    if cfg["splitSpace"] and " " in name:
        parts = [p for p in re.split(r"\s+", name) if len(p) >= 2]
        if len(parts) > 1:
            return parts
    return [name]


def parse(txt, cfg, noise, report):
    lines = txt.split("\n")
    mode = cfg["startMode"]
    if mode not in POS_ORDER:
        die("配置项 startMode 只能是 " + " / ".join(POS_ORDER) + "，收到：" + str(mode))
    raw = []  # (name, pos, enums, star)
    i, n = 0, len(lines)
    while i < n:
        s = lines[i].strip()
        nxt = lines[i + 1].strip() if i + 1 < n else ""

        # --- 分区标记（按出现顺序单向推进，不回退） ---
        if any(k in s for k in cfg["listStart"]):
            mode = POS_LIST if mode == POS_QUERY else mode
            i += 1
            continue
        if any(k in s for k in cfg["endMarks"]) and mode == POS_LIST:
            mode = POS_DONE  # 列表区结束：汇总行/翻页行一律不解析，等 formStart 再进表单区
            i += 1
            continue
        if any(k in s for k in cfg["formStart"]):
            mode = POS_FORM
            i += 1
            continue
        if any(s.startswith(k) or s == k.rstrip("：") for k in cfg["detailMarks"]):
            mode = POS_LINE
            i += 1
            continue

        if mode == POS_QUERY:
            m = re.match(r"^\*{0,2}([^：\t]{2,%d})：\s*$" % cfg["maxFieldLen"], s)
            if m:
                star, nm = split_star(m.group(1))
                nm = strip_decor(nm)
                note_noise(nm, POS_QUERY, noise, report)
                if nm and not noise.hit(nm):
                    enums = []
                    if nxt and "," in nxt and not nxt.endswith("：") and "\t" not in lines[i + 1] and len(nxt) < 200:
                        enums = [x.strip() for x in nxt.split(",") if x.strip()]
                        i += 1
                    raw.append((nm, POS_QUERY, ",".join(enums), star))
            i += 1
            continue

        if mode == POS_LIST:
            if s and not any(re.search(p, s) for p in cfg["listDropPatterns"]):
                star, nm = split_star(s)
                nm = strip_decor(re.sub(r"\s*\(.*\)\s*$", "", nm))
                note_noise(nm, POS_LIST, noise, report)
                if nm and not noise.hit(nm):
                    raw.append((nm, POS_LIST, "", star))
            i += 1
            continue

        if mode == POS_FORM:
            m = re.match(r"^\*{0,2}([^：\t]{2,%d})：?\s*$" % cfg["maxFieldLen"], s)
            if m:
                star, nm = split_star(m.group(1))
                nm = strip_decor(nm)
                note_noise(nm, POS_FORM, noise, report)
                if nm and not noise.hit(nm):
                    raw.append((nm, POS_FORM, "", star))
            i += 1
            continue

        # POS_LINE（其余状态不解析）
        if mode != POS_LINE:
            i += 1
            continue
        if s and "\t" not in s and not s.endswith("：") and 2 <= len(s) <= cfg["maxFieldLen"]:
            star, nm = split_star(s)
            nm = strip_decor(nm)
            note_noise(nm, POS_LINE, noise, report)
            if nm and not noise.hit(nm):
                raw.append((nm, POS_LINE, "", star))
        i += 1

    # --- 拆分并格 + 去重（字段名 + 位置） ---
    out, seen = [], set()
    for name, pos, enums, star in raw:
        for part in split_name(name, cfg):
            part = strip_decor(part)
            if len(part) < 2 or noise.hit(part):
                note_noise(part, pos, noise, report)
                continue
            if part != name and (name, pos) not in report["splitSet"]:
                report["splitSet"].add((name, pos))
                report["split"].append((name, " / ".join(split_name(name, cfg))))
            key = (part, pos)
            if key in seen:
                report["dup"].append((part, pos))
                continue
            seen.add(key)
            out.append({"field": part, "pos": pos, "enums": enums, "star": star})
    return out


def split_star(s):
    m = re.match(r"^(\*{0,2})\s*(.*)$", s)
    return (m.group(1), m.group(2)) if m else ("", s)


def write_report(path, allp, report, cfg):
    rows = ["# 抽取报告", "",
            "> 来源目录：见命令参数 --dir｜页面数 " + str(len(allp)) + "｜字段总数 "
            + str(sum(len(v) for v in allp.values())), ""]
    rows += ["## 一、各页面条数", "", "| 页面 | 查询条件 | 列表列 | 表单字段 | 明细行字段 | 合计 |", "| --- | --- | --- | --- | --- | --- |"]
    for page in sorted(allp):
        c = {p: 0 for p in POS_ORDER}
        for f in allp[page]:
            c[f["pos"]] = c.get(f["pos"], 0) + 1
        rows.append("| " + page + " | " + " | ".join(str(c[p]) for p in POS_ORDER)
                    + " | " + str(len(allp[page])) + " |")
    rows += ["", "## 二、被拆开的并格（" + str(len(report["split"])) + " 处并格，需人工确认拆法）", "",
             "| 原始并格 | 拆成（按空格或 split 表） |", "| --- | --- |"]
    for a, b in report["split"]:
        rows.append("| " + a + " | " + b + " |")
    if not report["split"]:
        rows.append("| — | — |")
    rows += ["", "## 三、被剔除的杂质（" + str(len(report["noise"])) + " 条，逐条确认「为什么它不是字段」）", "",
             "| 位置 | 被剔除的串 |", "| --- | --- |"]
    for pos, v in report["noise"]:
        rows.append("| " + pos + " | " + v + " |")
    if not report["noise"]:
        rows.append("| — | — |")
    rows += ["", "## 四、同名同位置重复被丢弃（" + str(len(report["dup"])) + " 条，正常应很少）", "",
             "| 字段 | 位置 |", "| --- | --- |"]
    for a, b in report["dup"]:
        rows.append("| " + a + " | " + b + " |")
    if not report["dup"]:
        rows.append("| — | — |")
    rows += ["", "## 五、默认黑名单（可被 --split 覆盖）", "", "| 类型 | 值 |", "| --- | --- |",
             "| noise | " + "、".join(cfg["noise"]) + " |",
             "| noisePatterns | " + "、".join(cfg["noisePatterns"]) + " |", ""]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(rows))


def main():
    ap = argparse.ArgumentParser(add_help=True, description="老系统界面文本 → 结构化字段 JSON")
    ap.add_argument("--dir", required=True, help="老系统界面文本目录（*.txt）")
    ap.add_argument("--out", required=True, help="输出字段全量 JSON 路径")
    ap.add_argument("--split", default="", help="配置 JSON：并格拆分表 / 杂质黑名单 / 分区标记")
    ap.add_argument("--report", default=None, help='抽取报告 md 路径；传 "" 则不写')
    ap.add_argument("--quiet", action="store_true", help="只打印一行汇总")
    args = ap.parse_args()

    if not os.path.isdir(args.dir):
        die("--dir 不是目录：" + args.dir)
    cfg = load_cfg(args.split)
    noise = Noise(cfg)

    files = sorted(f for f in os.listdir(args.dir) if f.lower().endswith(".txt"))
    if not files:
        die("目录里没有 *.txt 界面文本：" + args.dir + "（一个 .txt = 一个页面）", 1)

    allp, report = {}, {"noise": [], "noiseSet": set(), "split": [], "splitSet": set(), "dup": []}
    for fn in files:
        stem = fn[: -len(".txt")]
        page = cfg["pageNames"].get(stem, stem)
        txt = read_text(os.path.join(args.dir, fn), cfg)
        fields = parse(txt, cfg, noise, report)
        if not fields:
            sys.stderr.write("警告：页面「" + page + "」一个字段都没抽到，检查文本格式或分区标记：" + fn + "\n")
        allp[page] = fields

    total = sum(len(v) for v in allp.values())
    if total == 0:
        die("所有页面都没抽到字段，检查 --dir 里的文本是否为老系统界面粘贴内容", 1)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(allp, f, ensure_ascii=False, indent=1)
        f.write("\n")

    rp = args.report
    if rp is None:
        rp = os.path.join(os.path.dirname(os.path.abspath(args.out)), "抽取报告.md")
    if rp != "":
        write_report(rp, allp, report, cfg)

    if args.quiet:
        print("页面 " + str(len(allp)) + "｜字段 " + str(total) + "｜拆分 " + str(len(report["split"]))
              + "｜剔除杂质 " + str(len(report["noise"])) + " → " + args.out)
    else:
        print("页面数 " + str(len(allp)) + "｜字段总数 " + str(total))
        for page in sorted(allp):
            c = {p: 0 for p in POS_ORDER}
            for f in allp[page]:
                c[f["pos"]] = c.get(f["pos"], 0) + 1
            print("  " + page.ljust(20) + " 查询 " + str(c[POS_QUERY]).rjust(3)
                  + " | 列表 " + str(c[POS_LIST]).rjust(3)
                  + " | 表单 " + str(c[POS_FORM]).rjust(3)
                  + " | 明细 " + str(c[POS_LINE]).rjust(3)
                  + " | 合计 " + str(len(allp[page])).rjust(3))
        print("拆开并格 " + str(len(report["split"])) + " 处｜剔除杂质 " + str(len(report["noise"])) + " 条")
        print("已写出：" + args.out)
        if rp:
            print("抽取报告：" + rp)
    return 0


if __name__ == "__main__":
    sys.exit(main())
