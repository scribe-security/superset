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

"""Tests for HTML parser module."""

import pytest

from superset.utils.excel_processing.html_parser import HtmlParser


class TestHtmlParser:
    """Test cases for HtmlParser class."""
    
    def test_parse_simple_html(self) -> None:
        """Test parsing simple HTML content."""
        parser = HtmlParser()
        
        # Test plain text extraction
        html = '<p>Simple text</p>'
        result = parser.parse_cell_content(html)
        assert result == "Simple text"
        
        # Test with multiple tags
        html = '<div><span>Hello</span> <b>World</b></div>'
        result = parser.parse_cell_content(html)
        assert result == "Hello World"
    
    def test_parse_data_info_json(self) -> None:
        """Test parsing HTML with data-info JSON content."""
        parser = HtmlParser()
        
        # Test with valid JSON in data-info
        html = '''<div data-info-type="show_params" data-info='{"key": "value", "number": 42}'>
                    <span>Click to expand</span>
                  </div>'''
        result = parser.parse_cell_content(html)
        assert isinstance(result, dict)
        assert result == {"key": "value", "number": 42}
    
    def test_parse_escaped_json(self) -> None:
        """Test parsing HTML with escaped JSON content."""
        parser = HtmlParser()
        
        # Test with HTML-escaped JSON
        html = '''<div data-info-type="show_params" data-info="{&quot;key&quot;: &quot;value&quot;}">
                    Text
                  </div>'''
        result = parser.parse_cell_content(html)
        assert isinstance(result, dict)
        assert result == {"key": "value"}
    
    def test_parse_invalid_json(self) -> None:
        """Test parsing HTML with invalid JSON falls back to text."""
        parser = HtmlParser()
        
        # Test with invalid JSON
        html = '''<div data-info-type="show_params" data-info="{invalid json}">
                    Fallback text
                  </div>'''
        result = parser.parse_cell_content(html)
        assert result == "Fallback text"
    
    def test_non_html_content(self) -> None:
        """Test that non-HTML content is returned unchanged."""
        parser = HtmlParser()
        
        # Test plain string
        assert parser.parse_cell_content("Plain text") == "Plain text"
        
        # Test numbers
        assert parser.parse_cell_content(42) == 42
        
        # Test None
        assert parser.parse_cell_content(None) is None
        
        # Test dict
        original_dict = {"key": "value"}
        assert parser.parse_cell_content(original_dict) == original_dict
    
    def test_is_html_content(self) -> None:
        """Test HTML content detection."""
        parser = HtmlParser()
        
        # Should detect HTML
        assert parser.is_html_content("<p>text</p>") is True
        assert parser.is_html_content("<div>content</div>") is True
        assert parser.is_html_content("   <span>text</span>   ") is True
        
        # Should not detect as HTML
        assert parser.is_html_content("plain text") is False
        assert parser.is_html_content("a < b and c > d") is False
        assert parser.is_html_content(42) is False
        assert parser.is_html_content(None) is False
        assert parser.is_html_content({"key": "value"}) is False
    
    def test_complex_html_structure(self) -> None:
        """Test parsing complex HTML structures."""
        parser = HtmlParser()
        
        # Test nested structure with data-info
        html = '''
        <div class="wrapper">
            <div data-info-type="show_params" data-info='{"params": {"a": 1, "b": 2}, "type": "test"}'>
                <i class="icon-chevron"></i>
                <span>Parameters</span>
            </div>
        </div>
        '''
        result = parser.parse_cell_content(html)
        assert isinstance(result, dict)
        assert result == {"params": {"a": 1, "b": 2}, "type": "test"}
