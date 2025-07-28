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

"""JSON expansion utilities for Excel/CSV exports."""

import json
import logging
from typing import Any, Dict, Union

logger = logging.getLogger(__name__)


class JsonExpander:
    """Expands JSON objects into separate columns for Excel/CSV export."""
    
    def __init__(self, max_depth: int = 1) -> None:
        """
        Initialize the JSON expander.
        
        Args:
            max_depth: Maximum depth for JSON expansion (0 = no expansion)
        """
        self.max_depth = max_depth
    
    def expand_json(
        self, json_obj: Dict[str, Any], current_depth: int = 0
    ) -> Dict[str, Any]:
        """
        Expand a JSON object to the specified depth.
        
        Args:
            json_obj: The JSON object to expand
            current_depth: Current recursion depth
            
        Returns:
            Flattened dictionary with expanded keys
        """
        if not isinstance(json_obj, dict) or current_depth >= self.max_depth:
            return {}
        
        result = {}
        
        for key, value in json_obj.items():
            if isinstance(value, dict) and current_depth + 1 < self.max_depth:
                # Recursively expand nested dictionaries
                nested = self.expand_json(value, current_depth + 1)
                for nested_key, nested_value in nested.items():
                    result[f"{key}.{nested_key}"] = nested_value
            elif isinstance(value, list):
                # Convert lists to JSON strings
                result[key] = json.dumps(value)
            elif isinstance(value, (dict, list)):
                # At max depth, convert complex types to strings
                result[key] = json.dumps(value)
            else:
                # Keep simple values as-is
                result[key] = value
        
        return result
    
    def should_expand(self, value: Any) -> bool:
        """
        Check if a value should be expanded.
        
        Args:
            value: The value to check
            
        Returns:
            True if the value is a dict that should be expanded
        """
        return isinstance(value, dict) and self.max_depth > 0
