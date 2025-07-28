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
from typing import Any, Dict, Optional, Union

try:
    from bs4 import BeautifulSoup
    HAS_BEAUTIFULSOUP = True
except ImportError:
    HAS_BEAUTIFULSOUP = False

logger = logging.getLogger(__name__)


class HtmlParser:
    """Parser for extracting data from HTML content in table cells."""
    
    def __init__(self) -> None:
        """Initialize the HTML parser."""
        if not HAS_BEAUTIFULSOUP:
            logger.warning(
                "BeautifulSoup4 is not installed. HTML parsing will be disabled. "
                "Install with: pip install beautifulsoup4"
            )
    
    @property
    def is_available(self) -> bool:
        """Check if HTML parsing is available."""
        return HAS_BEAUTIFULSOUP
    
    def parse_cell_content(self, content: Any) -> Union[str, Dict[str, Any], Any]:
        """
        Parse HTML content from a table cell.
        
        Args:
            content: The cell content to parse
            
        Returns:
            Parsed content - either plain text, JSON dict, or original value
        """
        if not self.is_available:
            return content
            
        # Only process string content that looks like HTML
        if not isinstance(content, str):
            return content
            
        content_stripped = content.strip()
        if not (content_stripped.startswith("<") and content_stripped.endswith(">")):
            return content
            
        try:
            soup = BeautifulSoup(content, "html.parser")
            
            # Look for special data-info divs with JSON content
            data_div = soup.find("div", {"data-info-type": "show_params"})
            
            if data_div and data_div.get("data-info"):
                return self._extract_json_from_div(data_div, soup)
            
            # Default: return plain text without HTML tags
            return soup.get_text(strip=True)
            
        except Exception as e:
            logger.debug(f"Error parsing HTML content: {e}")
            return content
    
    def _extract_json_from_div(
        self, data_div: Any, soup: Any
    ) -> Union[str, Dict[str, Any]]:
        """
        Extract JSON data from a data-info div.
        
        Args:
            data_div: The BeautifulSoup div element
            soup: The BeautifulSoup object
            
        Returns:
            Extracted JSON dict or plain text on failure
        """
        try:
            data_info = data_div.get("data-info")
            # Unescape HTML entities (&quot; -> ")
            data_info = html.unescape(data_info)
            json_data = json.loads(data_info)
            return json_data
        except (json.JSONDecodeError, TypeError) as e:
            logger.debug(f"Failed to parse JSON from data-info: {e}")
            # Fall back to plain text
            return soup.get_text(strip=True)
    
    def is_html_content(self, content: Any) -> bool:
        """
        Check if content appears to be HTML.
        
        Args:
            content: The content to check
            
        Returns:
            True if content looks like HTML
        """
        if not isinstance(content, str):
            return False
            
        content_stripped = content.strip()
        return (
            content_stripped.startswith("<") and 
            content_stripped.endswith(">") and
            "<" in content and ">" in content
        )
