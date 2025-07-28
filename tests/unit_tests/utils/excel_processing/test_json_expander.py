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

"""Tests for JSON expander module."""

import json
import pytest

from superset.utils.excel_processing.json_expander import JsonExpander


class TestJsonExpander:
    """Test cases for JsonExpander class."""
    
    def test_expand_first_level(self) -> None:
        """Test expanding JSON to first level only."""
        expander = JsonExpander(max_depth=1)
        
        data = {
            "simple": "value",
            "number": 42,
            "nested": {"inner": "value", "count": 10},
            "list": [1, 2, 3],
        }
        
        result = expander.expand_json(data)
        
        assert result["simple"] == "value"
        assert result["number"] == 42
        # Nested dict should be converted to JSON string at depth 1
        assert result["nested"] == '{"inner": "value", "count": 10}'
        # List should be converted to JSON string
        assert result["list"] == "[1, 2, 3]"
    
    def test_expand_multiple_levels(self) -> None:
        """Test expanding JSON to multiple levels."""
        expander = JsonExpander(max_depth=2)
        
        data = {
            "level1": {
                "level2": {
                    "level3": "deep value"
                },
                "simple": "value"
            }
        }
        
        result = expander.expand_json(data)
        
        assert result["level1.simple"] == "value"
        # level3 should be stringified at depth 2
        assert result["level1.level2"] == '{"level3": "deep value"}'
    
    def test_no_expansion(self) -> None:
        """Test with expansion disabled."""
        expander = JsonExpander(max_depth=0)
        
        data = {"key": "value", "nested": {"inner": "value"}}
        result = expander.expand_json(data)
        
        # Should return empty dict when max_depth is 0
        assert result == {}
    
    def test_should_expand(self) -> None:
        """Test the should_expand method."""
        expander_enabled = JsonExpander(max_depth=1)
        expander_disabled = JsonExpander(max_depth=0)
        
        # Test with dict
        assert expander_enabled.should_expand({"key": "value"}) is True
        assert expander_disabled.should_expand({"key": "value"}) is False
        
        # Test with non-dict values
        assert expander_enabled.should_expand("string") is False
        assert expander_enabled.should_expand([1, 2, 3]) is False
        assert expander_enabled.should_expand(42) is False
        assert expander_enabled.should_expand(None) is False
    
    def test_complex_nested_structure(self) -> None:
        """Test expanding complex nested structures."""
        expander = JsonExpander(max_depth=3)
        
        data = {
            "user": {
                "id": 123,
                "profile": {
                    "name": "John Doe",
                    "settings": {
                        "theme": "dark",
                        "notifications": {
                            "email": True,
                            "push": False
                        }
                    }
                },
                "tags": ["admin", "user"]
            },
            "metadata": {
                "created": "2024-01-01",
                "version": 2
            }
        }
        
        result = expander.expand_json(data)
        
        # Check flattened structure
        assert result["user.id"] == 123
        assert result["user.profile.name"] == "John Doe"
        assert result["user.profile.settings.theme"] == "dark"
        # At depth 3, deeper nesting should be stringified
        assert result["user.profile.settings.notifications"] == '{"email": true, "push": false}'
        assert result["user.tags"] == '["admin", "user"]'
        assert result["metadata.created"] == "2024-01-01"
        assert result["metadata.version"] == 2
    
    def test_empty_and_none_values(self) -> None:
        """Test handling of empty and None values."""
        expander = JsonExpander(max_depth=1)
        
        # Empty dict
        assert expander.expand_json({}) == {}
        
        # Non-dict input
        assert expander.expand_json(None) == {}  # type: ignore
        assert expander.expand_json("string") == {}  # type: ignore
        assert expander.expand_json([1, 2, 3]) == {}  # type: ignore
