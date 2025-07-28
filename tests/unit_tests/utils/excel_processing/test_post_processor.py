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

"""Tests for post processor module."""

import pandas as pd
import pytest
from unittest.mock import Mock, patch

from superset.utils.excel_processing.post_processor import PostProcessor


class TestPostProcessor:
    """Test cases for PostProcessor class."""
    
    def test_process_empty_dataframe(self) -> None:
        """Test processing an empty DataFrame."""
        processor = PostProcessor()
        df = pd.DataFrame()
        
        result = processor.process_dataframe(df)
        assert result.empty
        assert result.equals(df)
    
    def test_process_html_columns(self) -> None:
        """Test processing DataFrame with HTML content."""
        processor = PostProcessor(
            enable_html_parsing=True,
            json_expansion_depth=0,  # Disable JSON expansion for this test
        )
        
        df = pd.DataFrame({
            "text": ["Plain text", "More text"],
            "html": ["<p>Paragraph</p>", "<div>Content</div>"],
            "mixed": ["Plain", "<span>HTML</span>"],
        })
        
        result = processor.process_dataframe(df)
        
        # HTML should be converted to plain text
        assert result["html"].tolist() == ["Paragraph", "Content"]
        assert result["mixed"].tolist() == ["Plain", "HTML"]
        assert result["text"].tolist() == ["Plain text", "More text"]
    
    def test_process_json_expansion(self) -> None:
        """Test processing DataFrame with JSON expansion."""
        processor = PostProcessor(
            enable_html_parsing=False,  # Disable HTML parsing for this test
            json_expansion_depth=1,
        )
        
        df = pd.DataFrame({
            "id": [1, 2],
            "data": [
                {"name": "John", "age": 30},
                {"name": "Jane", "age": 25}
            ],
            "text": ["A", "B"]
        })
        
        result = processor.process_dataframe(df)
        
        # Check that JSON was expanded
        assert "name" in result.columns
        assert "age" in result.columns
        assert result["name"].tolist() == ["John", "Jane"]
        assert result["age"].tolist() == [30, 25]
        # Original JSON column should be cleared
        assert result["data"].tolist() == ["", ""]
    
    def test_process_html_with_json(self) -> None:
        """Test processing DataFrame with HTML containing JSON."""
        processor = PostProcessor(
            enable_html_parsing=True,
            json_expansion_depth=1,
        )
        
        df = pd.DataFrame({
            "id": [1, 2],
            "content": [
                '<div data-info-type="show_params" data-info=\'{"status": "active", "count": 10}\'>Click</div>',
                '<p>Plain HTML</p>'
            ]
        })
        
        result = processor.process_dataframe(df)
        
        # First row should have JSON extracted and expanded
        assert result.loc[0, "status"] == "active"
        assert result.loc[0, "count"] == 10
        assert result.loc[0, "content"] == ""
        
        # Second row should just have text extracted
        assert pd.isna(result.loc[1, "status"]) or result.loc[1, "status"] == ""
        assert pd.isna(result.loc[1, "count"]) or result.loc[1, "count"] == ""
        assert result.loc[1, "content"] == "Plain HTML"
    
    def test_column_name_conflicts(self) -> None:
        """Test handling of column name conflicts during expansion."""
        processor = PostProcessor(json_expansion_depth=1)
        
        df = pd.DataFrame({
            "id": [1],
            "name": ["Original"],
            "data": [{"name": "From JSON", "id": 999}]
        })
        
        result = processor.process_dataframe(df)
        
        # Original columns should be preserved
        assert result["id"].tolist() == [1]
        assert result["name"].tolist() == ["Original"]
        
        # Conflicting names should get suffixes
        assert "name_1" in result.columns or "id_1" in result.columns
    
    def test_performance_optimization(self) -> None:
        """Test performance optimization for HTML detection."""
        processor = PostProcessor(
            enable_html_parsing=True,
            process_only_html_columns=True,
        )
        
        # Create a large DataFrame where only one column has HTML
        df = pd.DataFrame({
            f"col_{i}": ["text"] * 100 for i in range(10)
        })
        df["html_col"] = ["<p>HTML</p>"] * 100
        
        # Process should only check the HTML column
        with patch.object(processor.html_parser, 'parse_cell_content') as mock_parse:
            mock_parse.return_value = "HTML"
            result = processor.process_dataframe(df)
            
            # Should only be called for the HTML column values
            assert mock_parse.call_count == 100  # Only for html_col
    
    def test_error_handling(self) -> None:
        """Test error handling during processing."""
        processor = PostProcessor()
        
        # Create a DataFrame that might cause issues
        df = pd.DataFrame({
            "col1": [1, 2, 3],
            "col2": ["a", "b", "c"]
        })
        
        # Mock an error during processing
        with patch.object(processor, '_process_html_columns', side_effect=Exception("Test error")):
            result = processor.process_dataframe(df)
            
            # Should return original DataFrame on error
            assert result.equals(df)
    
    def test_from_config(self) -> None:
        """Test creating PostProcessor from configuration."""
        config = {
            "EXCEL_PROCESSING_ENABLE_HTML_PARSING": False,
            "EXCEL_PROCESSING_JSON_EXPANSION_DEPTH": 2,
            "EXCEL_PROCESSING_ONLY_HTML_COLUMNS": False,
        }
        
        processor = PostProcessor.from_config(config)
        
        assert processor.enable_html_parsing is False
        assert processor.json_expansion_depth == 2
        assert processor.process_only_html_columns is False
    
    def test_duplicate_column_removal(self) -> None:
        """Test that duplicate columns are removed."""
        processor = PostProcessor()
        
        # Create DataFrame with duplicate columns
        df = pd.DataFrame({
            "A": [1, 2],
            "B": [3, 4],
        })
        # Manually add a duplicate column
        df["A"] = [5, 6]  # This creates a duplicate
        
        result = processor.process_dataframe(df)
        
        # Should have unique columns
        assert len(result.columns) == len(set(result.columns))
