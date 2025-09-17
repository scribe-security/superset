# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

"""Post-processing utilities for Excel/CSV exports."""

import json
from typing import Any, Dict, List, Optional, Set

import pandas as pd
from flask import current_app

from .html_parser import HtmlParser

DETAILS_PREFIX = "Details/"
CLEAR_JSON_SOURCES_AFTER_FLATTEN = True  # clear only where JSON was parsed


# -------------------------
# Helpers
# -------------------------
def _is_jsonish_string(val: Any) -> bool:
    return isinstance(val, str) and val.strip()[:1] in ("{", "[") and val.strip()[-1:] in ("}", "]")


def _parse_json_safe(val: Any) -> Any:
    if not isinstance(val, str):
        return val
    s = val.strip()
    if not (s.startswith("{") and s.endswith("}")) and not (s.startswith("[") and s.endswith("]")):
        return val
    try:
        return json.loads(s)
    except Exception:
        try:
            import ast
            return ast.literal_eval(s)
        except Exception:
            return val


def _is_effectively_empty(v: Any) -> bool:
    # NEW: treat pandas NA/NaT/None/np.nan as empty, regardless of dtype
    try:
        if pd.isna(v):
            return True
    except Exception:
        pass
    if isinstance(v, str) and v.strip() == "":
        return True
    if isinstance(v, (list, dict)) and len(v) == 0:
        return True
    return False


# -------------------------
# JSON Flattener
# -------------------------
class JsonFlattener:
    """Flatten dict/list deeply into Details/<path> columns.
       - Normalize keys by cutting before first ':' (e.g., 'CWEs: ...' -> 'CWEs')
       - Skip keys starting with 'sc_'
       - Lists of primitives -> JSON string at leaf
       - Lists of objects -> index in path
    """

    @staticmethod
    def _norm(key: str) -> str:
        key = str(key)
        return key.split(":", 1)[0].strip() if ":" in key else key.strip()

    @staticmethod
    def _skip(key: str) -> bool:
        return key.startswith("sc_")

    def flatten(self, data: Any, parent: str = "") -> Dict[str, Any]:
        out: Dict[str, Any] = {}

        if data is None:
            return out

        if isinstance(data, dict):
            for k, v in data.items():
                k_norm = self._norm(k)
                if self._skip(k_norm):
                    continue
                path = f"{parent}/{k_norm}" if parent else k_norm
                if isinstance(v, (dict, list)):
                    out.update(self.flatten(v, path))
                else:
                    out[path] = v
            return out

        if isinstance(data, list):
            if all(isinstance(i, (str, int, float, bool, type(None))) for i in data):
                # primitives -> store JSON string
                out[parent] = json.dumps(data)
                return out
            for i, item in enumerate(data):
                path = f"{parent}/{i}" if parent else str(i)
                out.update(self.flatten(item, path))
            return out

        out[parent] = data
        return out


# -------------------------
# PostProcessor
# -------------------------
class PostProcessor:
    """Main post-processor for Excel/CSV exports."""

    def __init__(
        self,
        enable_html_parsing: bool = True,
        json_expansion_depth: int = 1,  # kept for compatibility (we flatten fully)
        process_only_html_columns: bool = True,
        column_conflict_strategy: str = "increment",  # kept for compatibility
        exclude_column_prefixes: Optional[List[str]] = None,
    ) -> None:
        self.enable_html_parsing = enable_html_parsing
        self.json_expansion_depth = json_expansion_depth
        self.process_only_html_columns = process_only_html_columns
        self.column_conflict_strategy = column_conflict_strategy
        self.exclude_column_prefixes = exclude_column_prefixes or []

        self.html_parser = HtmlParser()
        self.flattener = JsonFlattener()

    # -------- public --------
    def process_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df

        try:
            protected_cols: Set[str] = set(df.columns)

            # 1) HTML parse
            if self.enable_html_parsing and self.html_parser.is_available:
                df = self._process_html_columns(df)

            # 2) JSON flatten into Details/*
            df = self._flatten_json_columns(df, protected_cols)

            # 3) dedupe columns
            df = df.loc[:, ~df.columns.duplicated()]

            # 4) drop empty Details/*
            df = self._drop_empty_details_columns(df)

            # 5) apply excludes
            if self.exclude_column_prefixes:
                keep = [c for c in df.columns if not any(c.startswith(p) for p in self.exclude_column_prefixes)]
                df = df[keep]

            return df

        except Exception as e:
            return df

    # -------- steps --------
    def _process_html_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        cols = list(out.select_dtypes(include=["object"]).columns) if self.process_only_html_columns else list(out.columns)

        parsed_cols = 0
        for col in cols:
            s = out[col]
            if s.dtype != "object":
                continue
            mask = s.apply(self.html_parser.is_html_content)
            if not mask.any():
                continue

            parsed = s[mask].apply(self.html_parser.parse_cell_content)
            out.loc[mask, col] = parsed
            parsed_cols += 1

        return out

    def _find_jsonish_columns(self, df: pd.DataFrame) -> List[str]:
        cols: List[str] = []
        for col in df.columns:
            s = df[col]
            if s.apply(lambda x: isinstance(x, (dict, list)) or _is_jsonish_string(x)).any():
                cols.append(col)
        return cols

    def _flatten_json_columns(self, df: pd.DataFrame, protected_columns: Set[str]) -> pd.DataFrame:
        json_cols = self._find_jsonish_columns(df)
        if not json_cols:
            return df

        per_row: Dict[int, Dict[str, Any]] = {}

        for col in json_cols:
            s = df[col]
            affected = 0
            for idx, raw in s.items():
                val = _parse_json_safe(raw) if isinstance(raw, str) else raw
                if isinstance(val, (dict, list)) and val:
                    flat = self.flattener.flatten(val, parent="")
                    if flat:
                        if idx not in per_row:
                            per_row[idx] = {}
                        for k, v in flat.items():
                            details_k = f"{DETAILS_PREFIX}{k}"
                            per_row[idx][details_k] = v
                        affected += 1

        if not per_row:
            return df

        # discover populated columns
        populated: Set[str] = set()
        for m in per_row.values():
            for k, v in m.items():
                if not _is_effectively_empty(v):
                    populated.add(k)

        if not populated:
            return df

        # create columns as object dtype
        for col in sorted(populated):
            if col not in df.columns:
                df[col] = pd.Series([pd.NA] * len(df), dtype="object")

        # fill with "fill-when-empty" rule
        for idx, m in per_row.items():
            for k, v in m.items():
                if k not in populated:
                    continue
                if _is_effectively_empty(df.at[idx, k]):
                    df.at[idx, k] = v

        # clear the source cells where JSON was detected
        if CLEAR_JSON_SOURCES_AFTER_FLATTEN:
            for col in json_cols:
                s = df[col]
                mask = s.apply(lambda x: isinstance(x, (dict, list)) or _is_jsonish_string(x))
                if mask.any():
                    df.loc[mask, col] = ""  # do not drop column; just clear affected cells

        return df

    def _drop_empty_details_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        to_drop: List[str] = []
        for c in df.columns:
            if not c.startswith(DETAILS_PREFIX):
                continue
            ser = df[c]
            if (ser.isna().all()) or (ser.astype(str).str.strip() == "").all():
                to_drop.append(c)
        if to_drop:
            df = df.drop(columns=to_drop)
        return df

    # -------- factory --------
    @classmethod
    def from_config(cls, config: Optional[Dict[str, Any]] = None) -> "PostProcessor":
        if config is None:
            config = current_app.config if current_app else {}
        return cls(
            enable_html_parsing=config.get("EXCEL_PROCESSING_ENABLE_HTML_PARSING", True),
            json_expansion_depth=config.get("EXCEL_PROCESSING_JSON_EXPANSION_DEPTH", 1),
            process_only_html_columns=config.get("EXCEL_PROCESSING_ONLY_HTML_COLUMNS", True),
            column_conflict_strategy=config.get("EXCEL_PROCESSING_COLUMN_CONFLICT_STRATEGY", "increment"),
            exclude_column_prefixes=config.get("EXCEL_PROCESSING_EXCLUDE_COLUMN_PREFIXES", []),
        )
