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

"""HTML parsing utilities for Excel/CSV exports."""

import html
import json
import logging
import re
from typing import Any, Dict, Optional, Union

try:
    from bs4 import BeautifulSoup
    HAS_BEAUTIFULSOUP = True
except ImportError:
    HAS_BEAUTIFULSOUP = False

logger = logging.getLogger(__name__)


class HtmlParser:
    """Parser for extracting data from HTML content in table cells.

    Priority:
      1) If an element has a `data-info` attribute that holds JSON -> return dict (for flattening).
      2) Else if a <div class="custom-cell_wrapper" style="--tooltip-string:'...'> exists:
         return the substring AFTER the first '|' in that tooltip string.
      3) Else return visible text.
    """

    def __init__(self) -> None:
        if not HAS_BEAUTIFULSOUP:
            logger.warning(
                "BeautifulSoup4 is not installed. HTML parsing will be disabled. "
                "Install with: pip install beautifulsoup4"
            )

    @property
    def is_available(self) -> bool:
        return HAS_BEAUTIFULSOUP

    def is_html_content(self, content: Any) -> bool:
        """A light check: treat any string containing <...> as HTML."""
        return isinstance(content, str) and "<" in content and ">" in content

    def parse_cell_content(self, content: Any) -> Union[str, Dict[str, Any], Any]:
        if not self.is_available:
            return content
        if not isinstance(content, str) or "<" not in content:
            return content

        try:
            soup = BeautifulSoup(content, "html.parser")

            # (1) Try to extract JSON from data-info
            json_obj = self._extract_json_from_data_info(soup)
            if json_obj is not None:
                logger.debug("HtmlParser: extracted data-info JSON keys: %s", list(json_obj.keys())[:10])
                return json_obj

            # (2) Try tooltip string after '|'
            tooltip_after_bar = self._extract_tooltip_after_bar(soup)
            if tooltip_after_bar is not None:
                logger.debug("HtmlParser: extracted tooltip text after '|': %s", tooltip_after_bar[:80])
                return tooltip_after_bar

            # (3) Fallback: visible text
            text = soup.get_text(" ", strip=True)
            logger.debug("HtmlParser: fallback text used")
            return text

        except Exception as e:
            logger.debug("HtmlParser: failed to parse HTML (returning original). Error: %s", e)
            return content

    # ----- internals -----

    def _extract_json_from_data_info(self, soup) -> Optional[Dict[str, Any]]:
        # Prefer the explicit pattern from your cells
        node = soup.find("div", {"data-info-type": "show_params", "data-info": True})
        if not node:
            # fallback: any element with data-info
            node = soup.find(attrs={"data-info": True})
            if not node:
                return None

        raw = node.get("data-info")
        if not raw:
            return None

        # Try JSON first with HTML entities unescaped
        unescaped = html.unescape(raw)
        try:
            parsed = json.loads(unescaped)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        # Fallback to Python literal (e.g., single quotes)
        try:
            import ast
            parsed = ast.literal_eval(unescaped)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            logger.debug("HtmlParser: data-info present but not valid JSON")
            return None

        return None

    def _extract_tooltip_after_bar(self, soup) -> Optional[str]:
        wrapper = soup.find("div", {"class": "custom-cell_wrapper"})
        if not wrapper:
            return None
        style = wrapper.get("style", "") or ""
        m = re.search(r"--tooltip-string:\s*'([^']+)'", style)
        if not m:
            return None
        tooltip = m.group(1).strip()
        return tooltip.split("|", 1)[1].strip() if "|" in tooltip else tooltip
