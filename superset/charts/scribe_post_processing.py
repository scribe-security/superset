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

"""
Backward compatibility module for scribe post-processing.

This module maintains the original API while delegating to the new
excel_processing utilities.
"""

import logging
from io import BytesIO, StringIO
from typing import Any, Dict, Union

import pandas as pd
from flask import current_app

from superset.utils.excel_processing import HtmlParser, JsonExpander, PostProcessor

logger = logging.getLogger(__name__)

# Maintain backward compatibility with the original API
_html_parser = HtmlParser()
_json_expander = JsonExpander(max_depth=1)


def convert_html_col(html_content: Any) -> Union[str, Dict[str, Any], Any]:
    """
    Enhanced version that handles table cells with chevron icon buttons.
    
    Maintained for backward compatibility.
    """
    return _html_parser.parse_cell_content(html_content)


def expand_json_first_level(json_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Expand only first-level keys from JSON dict.
    
    Maintained for backward compatibility.
    """
    return _json_expander.expand_json(json_dict, current_depth=0)


def process_col(col: pd.Series) -> pd.Series:
    """
    Process a column to convert HTML to text/JSON.
    
    Maintained for backward compatibility.
    """
    return col.apply(convert_html_col)


def apply_scribe_post_process(
    data: Union[str, bytes], is_csv_format: bool
) -> Union[str, bytes]:
    """
    Main processing function for CSV/Excel export.
    
    Maintained for backward compatibility.
    """
    try:
        # Handle empty CSV case
        if is_csv_format and data == "\n":
            return data
        
        # Parse the data into a DataFrame
        if is_csv_format:
            df = pd.read_csv(StringIO(data) if isinstance(data, str) else BytesIO(data))
        else:
            df = pd.read_excel(BytesIO(data) if isinstance(data, bytes) else StringIO(data))
        
        # Get configuration
        config = current_app.config if current_app else {}
        
        # Apply post-processing
        processor = PostProcessor(
            enable_html_parsing=True,
            json_expansion_depth=1,
            process_only_html_columns=False,  # Match original behavior
            column_conflict_strategy=config.get(
                "EXCEL_PROCESSING_COLUMN_CONFLICT_STRATEGY", "merge"
            ),
            exclude_column_prefixes=config.get(
                "EXCEL_PROCESSING_EXCLUDE_COLUMN_PREFIXES", ["sc_"]
            ),
        )
        df = processor.process_dataframe(df)
        
        # Convert back to CSV/Excel
        if is_csv_format:
            buf = StringIO()
            df.to_csv(buf, index=False)
            return buf.getvalue()
        else:
            buf = BytesIO()
            df.to_excel(buf, index=False)
            return buf.getvalue()
            
    except Exception as e:
        logger.error(f"Error in apply_scribe_post_process: {e}")
        # Return original data on error
        return data
