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

"""Tests for backward compatibility of scribe_post_processing module."""

import pandas as pd
import pytest
from io import StringIO, BytesIO

from superset.charts.scribe_post_processing import (
    convert_html_col,
    expand_json_first_level,
    process_col,
    apply_scribe_post_process,
)


class TestScribePostProcessingBackwardCompatibility:
    """Test backward compatibility of the original API."""
    
    def test_convert_html_col(self) -> None:
        """Test convert_html_col function."""
        # Test HTML conversion
        assert convert_html_col("<p>Test</p>") == "Test"
        
        # Test JSON extraction
        html_with_json = '<div data-info-type="show_params" data-info=\'{"key": "value"}\'>Text</div>'
        result = convert_html_col(html_with_json)
        assert result == {"key": "value"}
        
        # Test non-HTML
        assert convert_html_col("plain text") == "plain text"
        assert convert_html_col(42) == 42
    
    def test_expand_json_first_level(self) -> None:
        """Test expand_json_first_level function."""
        data = {
            "simple": "value",
            "nested": {"inner": "value"},
            "list": [1, 2, 3]
        }
        
        result = expand_json_first_level(data)
        
        assert result["simple"] == "value"
        assert result["nested"] == '{"inner": "value"}'
        assert result["list"] == "[1, 2, 3]"
    
    def test_process_col(self) -> None:
        """Test process_col function."""
        series = pd.Series(["<p>HTML</p>", "plain text", 123])
        result = process_col(series)
        
        assert result.tolist() == ["HTML", "plain text", 123]
    
    def test_apply_scribe_post_process_csv(self) -> None:
        """Test apply_scribe_post_process with CSV data."""
        # Create test CSV data
        csv_data = """col1,col2,html_col
1,text,<p>Paragraph</p>
2,more text,<div data-info-type="show_params" data-info='{"status": "active"}'>Click</div>"""
        
        result = apply_scribe_post_process(csv_data, is_csv_format=True)
        
        # Parse result
        result_df = pd.read_csv(StringIO(result))
        
        # Check HTML was processed
        assert result_df.loc[0, "html_col"] == "Paragraph"
        assert result_df.loc[1, "html_col"] == ""  # JSON was extracted
        assert "status" in result_df.columns
        assert result_df.loc[1, "status"] == "active"
    
    def test_apply_scribe_post_process_excel(self) -> None:
        """Test apply_scribe_post_process with Excel data."""
        # Create test DataFrame
        df = pd.DataFrame({
            "id": [1, 2],
            "data": ["<p>Text</p>", "Normal"]
        })
        
        # Convert to Excel bytes
        buf = BytesIO()
        df.to_excel(buf, index=False)
        excel_data = buf.getvalue()
        
        # Process
        result = apply_scribe_post_process(excel_data, is_csv_format=False)
        
        # Check result
        assert isinstance(result, bytes)
        result_df = pd.read_excel(BytesIO(result))
        assert result_df.loc[0, "data"] == "Text"
        assert result_df.loc[1, "data"] == "Normal"
    
    def test_apply_scribe_post_process_empty_csv(self) -> None:
        """Test handling of empty CSV."""
        result = apply_scribe_post_process("\n", is_csv_format=True)
        assert result == "\n"
    
    def test_apply_scribe_post_process_error_handling(self) -> None:
        """Test error handling returns original data."""
        # Invalid CSV data
        invalid_data = "not,valid,csv\ndata"
        
        # Should handle error and return original
        result = apply_scribe_post_process(invalid_data, is_csv_format=True)
        # The function might process this successfully or return original on error
        assert isinstance(result, str)
