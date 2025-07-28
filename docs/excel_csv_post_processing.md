# Excel/CSV Post-Processing Feature

This document describes the new Excel/CSV post-processing feature added to Apache Superset.

## Overview

The Excel/CSV post-processing feature enhances data exports by:
1. **HTML Parsing**: Automatically converts HTML content in table cells to plain text or extracts embedded JSON data
2. **JSON Expansion**: Expands JSON objects in cells into separate columns for better data analysis

## Use Cases

This feature is particularly useful when:
- Your database queries return HTML-formatted content (e.g., from web scraping or content management systems)
- You have JSON data stored in columns that you want to analyze in Excel
- You need cleaner exports without HTML tags for business users

## Configuration

The feature can be configured in `superset/config.py`:

```python
# Enable/disable the entire feature
EXCEL_PROCESSING_ENABLED = True

# Enable HTML parsing (requires beautifulsoup4)
EXCEL_PROCESSING_ENABLE_HTML_PARSING = True

# JSON expansion depth (0 = disabled, 1 = first level only, etc.)
EXCEL_PROCESSING_JSON_EXPANSION_DEPTH = 1

# Performance optimization: only process columns containing HTML
EXCEL_PROCESSING_ONLY_HTML_COLUMNS = True
```

## Example Transformations

### HTML Content
**Input cell:**
```html
<div>
  <p>Product Name: <b>Widget A</b></p>
  <span>Price: $99.99</span>
</div>
```

**Output cell:**
```
Product Name: Widget A Price: $99.99
```

### JSON Extraction from HTML
**Input cell:**
```html
<div data-info-type="show_params" data-info='{"status": "active", "count": 42}'>
  Click to expand
</div>
```

**Output columns:**
- Original column: (empty)
- `status` column: `active`
- `count` column: `42`

### Direct JSON Expansion
**Input cell:**
```json
{"customer": "John Doe", "order_id": 12345, "items": ["A", "B"]}
```

**Output columns:**
- Original column: (empty)
- `customer` column: `John Doe`
- `order_id` column: `12345`
- `items` column: `["A", "B"]` (arrays are kept as JSON strings)

## Dependencies

This feature requires:
- `beautifulsoup4` for HTML parsing (optional but recommended)
- No additional dependencies for JSON expansion (uses standard library)

## Performance Considerations

1. **Selective Processing**: By default, only columns containing HTML-like content are processed
2. **Configurable Depth**: JSON expansion depth can be limited to prevent excessive column creation
3. **Error Handling**: Processing errors are logged but don't fail the export

## Backward Compatibility

The original `scribe_post_processing` module API is maintained for backward compatibility while delegating to the new modular implementation.

## Testing

Comprehensive test coverage includes:
- HTML parsing with various formats
- JSON extraction and expansion
- Error handling and edge cases
- Performance optimizations
- Backward compatibility

## Migration Guide

If you have custom code using the original `scribe_post_processing` module:

1. The original functions (`convert_html_col`, `expand_json_first_level`, etc.) continue to work
2. For new code, consider using the new modular API:
   ```python
   from superset.utils.excel_processing import PostProcessor
   
   processor = PostProcessor.from_config()
   processed_df = processor.process_dataframe(df)
   ```

## Future Enhancements

Potential future improvements:
- Support for more HTML data extraction patterns
- Configurable column naming for expanded JSON
- Custom transformation plugins
- Performance metrics and monitoring
