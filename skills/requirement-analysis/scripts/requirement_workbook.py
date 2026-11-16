#!/usr/bin/env python3
"""Validate requirement decomposition data and build formatted Excel workbooks."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
except ImportError as exc:  # pragma: no cover - environment-specific message
    raise SystemExit(
        "缺少 openpyxl。请使用 Codex 工作区依赖运行时，或仅安装 openpyxl。"
    ) from exc


ROW_FIELDS = (
    "id",
    "original_requirement",
    "level1",
    "level2",
    "level3",
    "level4",
    "level5",
    "status",
    "source",
)
LEVEL_FIELDS = ("level1", "level2", "level3", "level4", "level5")
VALID_STATUSES = {"已确认", "合理推断", "待确认", "建议"}

HEADERS = (
    "编号",
    "原始需求",
    "一级需求",
    "二级需求",
    "三级需求",
    "四级需求",
    "五级需求",
    "状态",
    "来源",
)
WIDTHS = (16, 36, 18, 22, 24, 28, 52, 14, 28)

HEADER_FILL = PatternFill("solid", fgColor="59B6E1")
HEADER_FONT = Font(name="微软雅黑", size=11, color="FFFFFF", bold=True)
BODY_FONT = Font(name="微软雅黑", size=10, color="222222")
THIN = Side(style="thin", color="D0D7DE")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
STATUS_FILLS = {
    "已确认": PatternFill("solid", fgColor="E2F0D9"),
    "合理推断": PatternFill("solid", fgColor="DDEBF7"),
    "待确认": PatternFill("solid", fgColor="FFF2CC"),
    "建议": PatternFill("solid", fgColor="E4DFEC"),
}


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("JSON 顶层必须是对象。")
    return data


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "是" if value else "否"
    return str(value).strip()


def _rules(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [_text(item) for item in value if _text(item)]
    text = _text(value).replace("\r\n", "\n")
    if not text:
        return []
    parts = re.split(r"[；;\n]+", text)
    return [re.sub(r"^\s*\d+[、.)．]\s*", "", part).strip() for part in parts if part.strip()]


def _numbered_rules(value: Any) -> str:
    return "\n".join(f"{index}、{item}" for index, item in enumerate(_rules(value), 1))


def _normalize_row(row: dict[str, Any], index: int) -> dict[str, str]:
    normalized = {field: _text(row.get(field, "")) for field in ROW_FIELDS}
    normalized["id"] = normalized["id"] or f"REQ-{index:03d}"
    normalized["level5"] = _numbered_rules(row.get("level5"))
    normalized["status"] = normalized["status"] or "已确认"
    normalized["change_note"] = _text(row.get("change_note", ""))
    return normalized


def validate_data(data: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    mode = _text(data.get("mode", "decompose")) or "decompose"
    if mode not in {"decompose", "optimize"}:
        errors.append("mode 必须是 decompose 或 optimize。")

    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        errors.append("rows 必须是非空数组。")
        return errors, warnings

    seen_ids: set[str] = set()
    for index, raw_row in enumerate(rows, 1):
        if not isinstance(raw_row, dict):
            errors.append(f"rows[{index}] 必须是对象。")
            continue
        row = _normalize_row(raw_row, index)
        if row["id"] in seen_ids:
            errors.append(f"编号重复：{row['id']}。")
        seen_ids.add(row["id"])
        for field in LEVEL_FIELDS:
            if not row[field]:
                errors.append(f"{row['id']} 缺少 {field}；未知内容请写为具体的“待确认：…”。")
        if row["status"] not in VALID_STATUSES:
            errors.append(
                f"{row['id']} 的状态“{row['status']}”无效；应为 {sorted(VALID_STATUSES)} 之一。"
            )
        if re.search(r"[；;\n]|\b(?:和|及|并且)\b", row["level4"]):
            warnings.append(f"{row['id']} 的四级需求可能包含多个操作，请检查原子性。")
        if "待确认" in row["level5"] and row["status"] not in {"待确认", "建议"}:
            warnings.append(f"{row['id']} 含待确认规则，但状态不是“待确认”。")
        if not row["original_requirement"]:
            warnings.append(f"{row['id']} 缺少原始需求，追溯性不足。")
        if not row["source"]:
            warnings.append(f"{row['id']} 缺少来源定位。")

    if mode == "optimize":
        originals = data.get("original_rows")
        if not isinstance(originals, list) or not originals:
            errors.append("optimize 模式必须提供非空 original_rows。")
        else:
            original_ids = {
                _text(item.get("id"))
                for item in originals
                if isinstance(item, dict) and _text(item.get("id"))
            }
            missing = sorted(row_id for row_id in seen_ids if row_id not in original_ids)
            if missing:
                warnings.append("以下优化行没有同编号原始行：" + "、".join(missing))

    issues = data.get("issues", [])
    if issues is not None and not isinstance(issues, list):
        errors.append("issues 必须是数组。")
    return errors, warnings


def _apply_header(ws, headers: Iterable[str]) -> None:
    for column, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=column, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[1].height = 28
    ws.freeze_panes = "A2"


def _style_body(ws, status_column: int | None = None) -> None:
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = BODY_FONT
            cell.border = BORDER
            cell.alignment = Alignment(vertical="top", wrap_text=True)
        if status_column:
            status_cell = ws.cell(row=row[0].row, column=status_column)
            fill = STATUS_FILLS.get(_text(status_cell.value))
            if fill:
                status_cell.fill = fill


def _set_widths(ws, widths: Iterable[int]) -> None:
    for index, width in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(index)].width = width


def _merge_hierarchy(
    ws, start_row: int, end_row: int, columns: tuple[int, ...], prefix_start: int = 1
) -> None:
    """Merge adjacent hierarchy cells only when their complete prefixes match."""
    if end_row <= start_row:
        return
    # Merge deepest ancestors first so earlier-column merges do not blank values
    # needed to evaluate later prefixes.
    for column in sorted(columns, reverse=True):
        group_start = start_row
        previous = tuple(
            _text(ws.cell(start_row, c).value) for c in range(prefix_start, column + 1)
        )
        for row in range(start_row + 1, end_row + 2):
            current = (
                tuple(_text(ws.cell(row, c).value) for c in range(prefix_start, column + 1))
                if row <= end_row
                else None
            )
            if current != previous:
                if row - 1 > group_start and previous and previous[-1]:
                    ws.merge_cells(
                        start_row=group_start,
                        start_column=column,
                        end_row=row - 1,
                        end_column=column,
                    )
                    ws.cell(group_start, column).alignment = Alignment(
                        horizontal="center", vertical="center", wrap_text=True
                    )
                group_start = row
                previous = current


def _add_decomposition_sheet(wb: Workbook, rows: list[dict[str, Any]]) -> None:
    ws = wb.active
    ws.title = "需求分解"
    _apply_header(ws, HEADERS)
    _set_widths(ws, WIDTHS)
    normalized_rows = [_normalize_row(row, index) for index, row in enumerate(rows, 1)]
    for row_index, row in enumerate(normalized_rows, 2):
        values = [row[field] for field in ROW_FIELDS]
        for column, value in enumerate(values, 1):
            ws.cell(row=row_index, column=column, value=value)
        ws.row_dimensions[row_index].height = max(30, 15 * max(2, row["level5"].count("\n") + 1))
    _style_body(ws, status_column=8)
    ws.auto_filter.ref = f"A1:I{ws.max_row}"
    # Original/system/module/function group: only merge within identical complete prefixes.
    _merge_hierarchy(ws, 2, ws.max_row, (2, 3, 4, 5), prefix_start=2)


def _issue_values(issue: Any, index: int) -> list[str]:
    if not isinstance(issue, dict):
        return [f"ISSUE-{index:03d}", "", "未分类", _text(issue), ""]
    return [
        _text(issue.get("id")) or f"ISSUE-{index:03d}",
        _text(issue.get("related_id")),
        _text(issue.get("type")) or "未分类",
        _text(issue.get("description")),
        _text(issue.get("question")),
    ]


def _add_issues_sheet(wb: Workbook, issues: list[Any], title: str) -> None:
    ws = wb.create_sheet(title)
    headers = ("问题编号", "关联需求", "问题类型", "问题描述", "待确认问题")
    _apply_header(ws, headers)
    _set_widths(ws, (16, 18, 18, 48, 48))
    for row_index, issue in enumerate(issues, 2):
        for column, value in enumerate(_issue_values(issue, row_index - 1), 1):
            ws.cell(row=row_index, column=column, value=value)
    _style_body(ws)
    ws.auto_filter.ref = f"A1:E{ws.max_row}"


def _original_map(rows: list[Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for index, raw in enumerate(rows, 1):
        if not isinstance(raw, dict):
            continue
        row = _normalize_row(raw, index)
        result[row["id"]] = row
    return result


def _add_comparison_sheet(
    wb: Workbook, original_rows: list[Any], optimized_rows: list[dict[str, Any]]
) -> None:
    ws = wb.create_sheet("需求优化对比")
    headers = (
        "编号",
        "原一级",
        "原二级",
        "原三级",
        "原四级",
        "原五级",
        "优化后一级",
        "优化后二级",
        "优化后三级",
        "优化后四级",
        "优化后五级",
        "修改说明",
    )
    _apply_header(ws, headers)
    _set_widths(ws, (16, 18, 20, 22, 26, 42, 18, 20, 22, 26, 42, 42))
    originals = _original_map(original_rows)
    for row_index, raw in enumerate(optimized_rows, 2):
        row = _normalize_row(raw, row_index - 1)
        original = originals.get(row["id"], {})
        values = [
            row["id"],
            original.get("level1", ""),
            original.get("level2", ""),
            original.get("level3", ""),
            original.get("level4", ""),
            original.get("level5", ""),
            row["level1"],
            row["level2"],
            row["level3"],
            row["level4"],
            row["level5"],
            row["change_note"],
        ]
        for column, value in enumerate(values, 1):
            ws.cell(row=row_index, column=column, value=value)
    _style_body(ws)
    gray = PatternFill("solid", fgColor="E7E6E6")
    green = PatternFill("solid", fgColor="E2F0D9")
    yellow = PatternFill("solid", fgColor="FFF2CC")
    for row in range(2, ws.max_row + 1):
        for column in range(2, 7):
            ws.cell(row, column).fill = gray
        for column in range(7, 12):
            ws.cell(row, column).fill = green
        ws.cell(row, 12).fill = yellow
    ws.auto_filter.ref = f"A1:L{ws.max_row}"


def build_workbook(data: dict[str, Any], output: Path) -> dict[str, Any]:
    errors, warnings = validate_data(data)
    if errors:
        raise ValueError("\n".join(errors))
    mode = _text(data.get("mode", "decompose")) or "decompose"
    rows = data["rows"]
    issues = data.get("issues") or []
    wb = Workbook()
    _add_decomposition_sheet(wb, rows)
    if mode == "optimize":
        _add_comparison_sheet(wb, data.get("original_rows", []), rows)
        _add_issues_sheet(wb, issues, "问题点汇总")
    elif issues:
        _add_issues_sheet(wb, issues, "待确认事项")
    wb.properties.title = _text(data.get("title")) or "需求五级分解"
    wb.properties.creator = "Codex requirement-analysis skill"
    output.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output)
    return {
        "status": "success",
        "output_path": str(output.resolve()),
        "mode": mode,
        "rows": len(rows),
        "issues": len(issues),
        "sheets": wb.sheetnames,
        "warnings": warnings,
    }


def inspect_workbook(path: Path, max_rows: int) -> dict[str, Any]:
    wb = load_workbook(path, read_only=False, data_only=False)
    sheets: list[dict[str, Any]] = []
    for ws in wb.worksheets:
        preview = []
        for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, max_rows), values_only=True):
            preview.append([_text(value) for value in row])
        sheets.append(
            {
                "name": ws.title,
                "max_row": ws.max_row,
                "max_column": ws.max_column,
                "merged_ranges": [str(item) for item in ws.merged_cells.ranges],
                "preview": preview,
            }
        )
    return {"status": "success", "input_path": str(path.resolve()), "sheets": sheets}


def _print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description="需求五级分解工作簿校验与生成工具")
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="检查 Excel 结构和样例行")
    inspect_parser.add_argument("--input", required=True, type=Path)
    inspect_parser.add_argument("--max-rows", type=int, default=10)

    validate_parser = subparsers.add_parser("validate", help="验证中间 JSON")
    validate_parser.add_argument("--input", required=True, type=Path)

    build_parser = subparsers.add_parser("build", help="从中间 JSON 生成 Excel")
    build_parser.add_argument("--input", required=True, type=Path)
    build_parser.add_argument("--output", required=True, type=Path)

    args = parser.parse_args()
    try:
        if args.command == "inspect":
            _print_json(inspect_workbook(args.input, max(1, args.max_rows)))
            return 0
        data = _read_json(args.input)
        errors, warnings = validate_data(data)
        if args.command == "validate":
            _print_json(
                {
                    "status": "error" if errors else "success",
                    "errors": errors,
                    "warnings": warnings,
                    "rows": len(data.get("rows", [])) if isinstance(data.get("rows"), list) else 0,
                }
            )
            return 1 if errors else 0
        _print_json(build_workbook(data, args.output))
        return 0
    except Exception as exc:  # concise CLI boundary
        _print_json({"status": "error", "message": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
