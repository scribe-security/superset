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

import logging
from typing import Any, Dict, List, Optional, Set

import pandas as pd
from flask import current_app

from .html_parser import HtmlParser
from .json_expander import JsonExpander

logger = logging.getLogger(__name__)


class PostProcessor:
    """Main post-processor for Excel/CSV exports."""
    
    def __init__(
        self,
        enable_html_parsing: bool = True,
        json_expansion_depth: int = 1,
        process_only_html_columns: bool = True,
        column_conflict_strategy: str = "increment",
        exclude_column_prefixes: Optional[List[str]] = None,
    ) -> None:
        """
        Initialize the post-processor.
        
        Args:
            enable_html_parsing: Whether to enable HTML parsing
            json_expansion_depth: Depth for JSON expansion (0 = disabled)
            process_only_html_columns: Only process columns that contain HTML
            column_conflict_strategy: How to handle column name conflicts
                - "increment": Add number suffix (current behavior)
                - "skip": Skip conflicting columns
                - "merge": Reuse existing columns
            exclude_column_prefixes: List of column prefixes to exclude from export
        """
        self.enable_html_parsing = enable_html_parsing
        self.json_expansion_depth = json_expansion_depth
        self.process_only_html_columns = process_only_html_columns
        self.column_conflict_strategy = column_conflict_strategy
        self.exclude_column_prefixes = exclude_column_prefixes or []
        
        self.html_parser = HtmlParser()
        self.json_expander = JsonExpander(max_depth=json_expansion_depth)
    
    def process_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Process a DataFrame for Excel/CSV export.
        
        Args:
            df: The DataFrame to process
            
        Returns:
            Processed DataFrame with HTML parsed and JSON expanded
        """
        if df.empty:
            return df
        
        try:
            # Step 1: Parse HTML content
            if self.enable_html_parsing and self.html_parser.is_available:
                df = self._process_html_columns(df)
            
            # Step 2: Expand JSON columns
            if self.json_expansion_depth > 0:
                if self.column_conflict_strategy == "merge":
                    df = self._expand_json_columns_merge(df)
                else:
                    df = self._expand_json_columns(df)
            
            # Step 3: Remove duplicate columns
            df = df.loc[:, ~df.columns.duplicated()]
            
            # Step 4: Filter out columns with excluded prefixes
            if self.exclude_column_prefixes:
                columns_to_keep = []
                for col in df.columns:
                    should_exclude = False
                    for prefix in self.exclude_column_prefixes:
                        if col.startswith(prefix):
                            should_exclude = True
                            logger.debug(f"Excluding column '{col}' (starts with '{prefix}')")
                            break
                    if not should_exclude:
                        columns_to_keep.append(col)
                
                df = df[columns_to_keep]
            
            return df
            
        except Exception as e:
            logger.error(f"Error during post-processing: {e}")
            # Return original DataFrame on error
            return df
    
    def _process_html_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Process HTML content in DataFrame columns.
        
        Args:
            df: The DataFrame to process
            
        Returns:
            DataFrame with HTML content parsed
        """
        if self.process_only_html_columns:
            # Only process object (string) columns that might contain HTML
            columns_to_process = []
            for col in df.select_dtypes(include=['object']).columns:
                # Check if any value in the column looks like HTML
                if df[col].apply(self.html_parser.is_html_content).any():
                    columns_to_process.append(col)
            
            logger.debug(f"Processing HTML in columns: {columns_to_process}")
            
            for col in columns_to_process:
                df[col] = df[col].apply(self.html_parser.parse_cell_content)
        else:
            # Process all columns
            for col in df.columns:
                df[col] = df[col].apply(self.html_parser.parse_cell_content)
        
        return df
    
    def _expand_json_columns_merge(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Expand JSON objects using merge strategy - reuse columns for all rows.
        
        Args:
            df: The DataFrame to process
            
        Returns:
            DataFrame with JSON columns expanded without creating duplicates
        """
        # Step 1: Find all columns containing JSON and collect all unique keys
        json_columns_data = {}  # {col_name: {row_idx: expanded_json}}
        all_json_keys = set()
        
        for col in df.columns:
            json_mask = df[col].apply(lambda x: isinstance(x, dict))
            if json_mask.any():
                json_columns_data[col] = {}
                for idx in df[json_mask].index:
                    json_obj = df.at[idx, col]
                    expanded = self.json_expander.expand_json(json_obj)
                    json_columns_data[col][idx] = expanded
                    all_json_keys.update(expanded.keys())
        
        if not json_columns_data:
            return df
        
        logger.debug(f"Merge strategy: Found JSON keys: {all_json_keys}")
        
        # Step 2: Build a DataFrame with expanded data to avoid fragmentation
        # Create a dictionary to collect all updates
        expanded_data = {key: pd.Series(index=df.index, dtype='object') for key in all_json_keys}
        
        # Fill in values from JSON expansion
        for col, row_data in json_columns_data.items():
            for idx, expanded_dict in row_data.items():
                for key, value in expanded_dict.items():
                    expanded_data[key][idx] = value
        
        # Create DataFrame from expanded data
        expanded_df = pd.DataFrame(expanded_data)
        
        # Determine which columns are new
        new_columns = [col for col in expanded_df.columns if col not in df.columns]
        existing_columns = [col for col in expanded_df.columns if col in df.columns]
        
        # Add new columns to the original DataFrame
        if new_columns:
            df = pd.concat([df, expanded_df[new_columns]], axis=1)
        
        # Update existing columns with expanded values (where not null)
        for col in existing_columns:
            mask = expanded_df[col].notna()
            df.loc[mask, col] = expanded_df.loc[mask, col]
        
        # Clear original JSON columns
        for col in json_columns_data.keys():
            df[col] = ''
        
        return df
    
    def _expand_json_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Expand JSON objects in DataFrame columns (original increment/skip strategy).
        
        Args:
            df: The DataFrame to process
            
        Returns:
            DataFrame with JSON columns expanded
        """
        # Find columns containing JSON dictionaries
        json_columns: List[str] = []
        for col in df.columns:
            if df[col].apply(lambda x: isinstance(x, dict)).any():
                json_columns.append(col)
        
        if not json_columns:
            return df
        
        logger.debug(f"Expanding JSON in columns: {json_columns}")
        
        # Collect all updates to apply in bulk to avoid fragmentation
        updates = {}  # {column_name: {row_idx: value}}
        new_columns_set: Set[str] = set()
        
        for col in json_columns:
            # Get rows where this column has JSON
            json_mask = df[col].apply(lambda x: isinstance(x, dict))
            
            if not json_mask.any():
                continue
            
            # Expand JSON for rows that have it
            for idx in df[json_mask].index:
                json_obj = df.at[idx, col]
                expanded = self.json_expander.expand_json(json_obj)
                
                for key, value in expanded.items():
                    if self.column_conflict_strategy == "skip":
                        # Skip strategy: only add if column doesn't exist
                        if key not in df.columns and key not in new_columns_set:
                            new_columns_set.add(key)
                            if key not in updates:
                                updates[key] = {}
                            updates[key][idx] = value
                    else:  # increment strategy (default)
                        # Handle column name conflicts
                        new_col_name = key
                        counter = 1
                        while new_col_name in df.columns or new_col_name in new_columns_set:
                            new_col_name = f"{key}_{counter}"
                            counter += 1
                        
                        new_columns_set.add(new_col_name)
                        if new_col_name not in updates:
                            updates[new_col_name] = {}
                        updates[new_col_name][idx] = value
            
            # Mark original JSON column for clearing
            if col not in updates:
                updates[col] = {}
            for idx in df[json_mask].index:
                updates[col][idx] = ''
        
        # Apply all updates in bulk to avoid fragmentation
        # First, ensure all new columns exist
        for col_name in updates.keys():
            if col_name not in df.columns:
                df[col_name] = pd.NA
        
        # Then apply all updates at once
        for col_name, col_updates in updates.items():
            for idx, value in col_updates.items():
                df.at[idx, col_name] = value
        
        return df
    
    @classmethod
    def from_config(cls, config: Optional[Dict[str, Any]] = None) -> "PostProcessor":
        """
        Create a PostProcessor from Flask configuration.
        
        Args:
            config: Optional config dict (uses Flask config if not provided)
            
        Returns:
            Configured PostProcessor instance
        """
        if config is None:
            config = current_app.config if current_app else {}
        
        return cls(
            enable_html_parsing=config.get("EXCEL_PROCESSING_ENABLE_HTML_PARSING", True),
            json_expansion_depth=config.get("EXCEL_PROCESSING_JSON_EXPANSION_DEPTH", 1),
            process_only_html_columns=config.get(
                "EXCEL_PROCESSING_ONLY_HTML_COLUMNS", True
            ),
            column_conflict_strategy=config.get(
                "EXCEL_PROCESSING_COLUMN_CONFLICT_STRATEGY", "increment"
            ),
            exclude_column_prefixes=config.get(
                "EXCEL_PROCESSING_EXCLUDE_COLUMN_PREFIXES", []
            ),
        )
