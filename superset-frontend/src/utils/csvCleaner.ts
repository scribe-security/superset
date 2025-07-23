import { SupersetClient } from '@superset-ui/core';
import JSZip from 'jszip';

/**
 * CSV Cleaner Utility for Apache Superset
 *
 * This utility intercepts CSV exports from Superset and removes HTML div tags
 * that are sometimes embedded in the data cells. It handles multiple formats
 * of HTML that Superset might include, ensuring clean CSV output.
 *
 * The cleaner works by intercepting SupersetClient's post and postForm methods,
 * detecting CSV exports, and cleaning the content before it reaches the user.
 *
 * COMPLETE FIXED VERSION: Now properly handles ALL forms of show_params divs,
 * including CSV-escaped versions with double quotes.
 */

// State management for the cleaner
let isInstalled = false;
let originalPost: any;
let originalPostForm: any;

// Configuration options
const CONFIG = {
  // Enable detailed console logging
  enableLogging: true,
  // Maximum length for console log preview
  logPreviewLength: 500,
  // File name suffix for cleaned files
  cleanedSuffix: '_cleaned',
};

/**
 * Log helper that respects the enableLogging config
 */
function log(...args: any[]) {
  if (CONFIG.enableLogging) {
    console.log(...args);
  }
}

/**
 * Check if content is a ZIP file by looking for the ZIP magic bytes
 * ZIP files always start with "PK" (0x504B)
 */
function isZipFile(content: string | ArrayBuffer): boolean {
  if (typeof content === 'string') {
    return content.startsWith('PK');
  }
  // For ArrayBuffer, check the first two bytes
  const view = new Uint8Array(content);
  return view[0] === 0x50 && view[1] === 0x4b; // 'P' = 0x50, 'K' = 0x4B
}

/**
 * Extract CSV content from a ZIP file
 * This handles cases where Superset returns compressed CSV files
 */
async function extractCSVFromZip(
  zipData: ArrayBuffer | string,
): Promise<string> {
  log('📦 Detected ZIP file - extracting CSV content...');

  try {
    // Convert string to ArrayBuffer if needed
    let arrayBuffer: ArrayBuffer;
    if (typeof zipData === 'string') {
      // Convert binary string to ArrayBuffer
      const binaryData = new Uint8Array(zipData.length);
      for (let i = 0; i < zipData.length; i += 1) {
        binaryData[i] = zipData.charCodeAt(i);
      }
      arrayBuffer = binaryData.buffer;
    } else {
      arrayBuffer = zipData;
    }

    // Use JSZip to extract the CSV
    const zip = new JSZip();
    const loaded = await zip.loadAsync(arrayBuffer);

    // Find CSV files in the ZIP
    const csvFiles = Object.keys(loaded.files).filter(name =>
      name.endsWith('.csv'),
    );

    if (csvFiles.length === 0) {
      throw new Error('No CSV files found in ZIP archive');
    }

    // Log all CSV files found
    log(`📁 Found ${csvFiles.length} CSV file(s) in ZIP:`, csvFiles);

    // Extract the first CSV file
    const csvFile = loaded.files[csvFiles[0]];
    const csvContent = await csvFile.async('string');
    log(
      `✅ Extracted CSV file: ${csvFiles[0]} (${csvContent.length} characters)`,
    );

    return csvContent;
  } catch (error) {
    log('❌ Failed to extract CSV from ZIP:', error);
    throw error;
  }
}

/**
 * Clean HTML div tags from CSV content
 *
 * This function handles multiple patterns of HTML that might appear in CSV cells.
 * The patterns are applied in a specific order to ensure proper cleaning:
 *
 * -1. CSV-ESCAPED show_params: "<div data-info-type=""show_params""...>" (complete CSV cells)
 *  0. UNQUOTED show_params: <div data-info-type="show_params"...> (unquoted divs)
 *  1. dt-truncate-cell: Modern Superset format with nested divs
 *  2. data-info divs: Legacy format with JSON data in attributes
 *  3. Simple divs: Any remaining basic div elements
 *
 * Each pattern is designed to handle specific formatting variations that Superset
 * might produce, ensuring comprehensive cleaning of all HTML elements.
 *
 * @param csvContent - The raw CSV content that may contain HTML or be a ZIP file
 * @returns The cleaned CSV content with HTML removed
 */
async function cleanCSVContent(
  csvContent: string | ArrayBuffer,
): Promise<string> {
  // First, check if this is a ZIP file
  if (isZipFile(csvContent)) {
    try {
      // Extract CSV from ZIP first
      // eslint-disable-next-line no-param-reassign
      csvContent = await extractCSVFromZip(csvContent);
    } catch (error) {
      log('⚠️  Could not extract ZIP file:', error);
      throw new Error(
        `Failed to extract ZIP file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  // Ensure we're working with a string from here on
  const csvString =
    typeof csvContent === 'string'
      ? csvContent
      : new TextDecoder().decode(csvContent);

  // Quick check: if no divs found, return original content
  if (!csvString.includes('<div')) {
    log('✅ CSV is already clean - no HTML detected');
    return csvString;
  }

  log('🧹 Cleaning HTML from CSV content...');
  log(`📊 Original CSV size: ${csvString.length} characters`);
  log(
    '🔍 First 500 chars of CSV:',
    csvString.substring(0, CONFIG.logPreviewLength),
  );

  let cleaned = csvString;
  let replacementCount = 0;
  const replacementLog: string[] = [];

  // =====================================================================================
  // SPECIAL HANDLING FOR show_params DIVS
  // =====================================================================================
  // The show_params divs are particularly problematic because they:
  // 1. Appear as complete CSV cells with double-escaped quotes
  // 2. Often span multiple lines within a single cell
  // 3. Can break standard regex patterns if not handled carefully

  log('🔍 Analyzing CSV structure for show_params cleaning...');

  // First, let's understand the CSV structure better
  const lineCount = (cleaned.match(/\n/g) || []).length + 1;
  const showParamsCount = (cleaned.match(/show_params/gi) || []).length;

  log(
    `📊 Initial CSV stats: ~${lineCount} lines, ${showParamsCount} show_params occurrences`,
  );

  // SAFER APPROACH: Process show_params more carefully to preserve row structure
  // Instead of using overly greedy patterns, we'll use a more targeted approach

  // Step 1: Handle cells that are JUST show_params divs (complete cell replacement)
  // This pattern specifically looks for CSV cells that start with a show_params div
  const completeShowParamsCells =
    /"<div\s+data-info-type=""show_params""[^>]*>(?:[^"<]|"")*(?:<[^>]*>(?:[^"<]|"")*)*<\/div>"/g;

  let showParamsReplaced = 0;
  cleaned = cleaned.replace(completeShowParamsCells, match => {
    showParamsReplaced += 1;
    replacementCount += 1;

    // Log details but keep them concise
    const cellSize = match.length;
    log(
      `🚫 Replacing show_params cell #${showParamsReplaced} (${cellSize} chars)`,
    );

    if (showParamsReplaced <= 3) {
      // Only show preview for first few to avoid log spam
      const preview = match.substring(0, 80) + (cellSize > 80 ? '...' : '');
      log(`   Preview: ${preview}`);
    }

    replacementLog.push(`show_params cell (${cellSize} chars) → ""`);
    return '""'; // Empty CSV cell
  });

  log(`✅ Replaced ${showParamsReplaced} complete show_params cells`);

  // Step 2: Handle any escaped show_params that might be within larger cells
  // This is a backup pattern for cases where show_params might be embedded differently
  if (cleaned.includes('show_params')) {
    log(
      '⚠️  Some show_params references remain, applying secondary cleaning...',
    );

    // This pattern is more conservative - it only replaces within quote boundaries
    // @ts-ignore
    cleaned = cleaned.replace(
      /"([^"]*?)data-info-type=""show_params""([^"]*?)"/g,
      (match: string) => {
        // Check if this is likely a cell with only show_params content
        if (match.includes('<div') && match.includes('</div>')) {
          replacementCount += 1;
          showParamsReplaced += 1;
          log(`🚫 Secondary: Replaced embedded show_params div`);
          return '""';
        }
        return match; // Leave unchanged if not a clear show_params div
      },
    );
  }

  // Step 3: Final verification
  const finalShowParamsCount = (cleaned.match(/show_params/gi) || []).length;
  const finalLineCount = (cleaned.match(/\n/g) || []).length + 1;

  log('📊 Final CSV stats:');
  log(
    `   Lines: ${lineCount} → ${finalLineCount} (${(
      (finalLineCount / lineCount) *
      100
    ).toFixed(1)}% retained)`,
  );
  log(`   show_params: ${showParamsCount} → ${finalShowParamsCount}`);

  if (finalLineCount < lineCount * 0.8) {
    log(
      '⚠️  WARNING: More than 20% of lines were lost. This might indicate over-aggressive cleaning.',
    );
  }

  if (finalShowParamsCount > 0) {
    log(
      `⚠️  ${finalShowParamsCount} show_params references still remain in the CSV`,
    );

    // Try to find where they are
    const sample = cleaned.indexOf('show_params');
    if (sample > -1) {
      const context = cleaned.substring(
        Math.max(0, sample - 50),
        Math.min(cleaned.length, sample + 50),
      );
      log(`   Context: ...${context}...`);
    }
  } else {
    log('✅ All show_params content successfully removed');
  }

  // =====================================================================================
  // PATTERN 0: UNQUOTED show_params divs (HIGH PRIORITY)
  // =====================================================================================
  // These are show_params divs that appear without CSV quote wrapping
  // Example: <div data-info-type="show_params" data-info="{...}">...</div>

  log('🔍 Checking for unquoted show_params divs...');

  const unquotedShowParamsMatches = cleaned.match(
    /<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>/g,
  );
  if (unquotedShowParamsMatches) {
    log(
      `📍 Found ${unquotedShowParamsMatches.length} unquoted show_params divs`,
    );
  }

  // Pattern 0a: Main unquoted show_params pattern
  const showParamsPattern =
    /<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>/g;

  cleaned = cleaned.replace(showParamsPattern, (match: string) => {
    replacementCount += 1;
    const matchLength = match.length;
    log(
      `🚫 Pattern 0a (unquoted show_params): Removing div with ${matchLength} characters`,
    );
    replacementLog.push(
      `Unquoted show_params div (${matchLength} chars) → empty`,
    );
    return ''; // Return completely empty - no quotes
  });

  // Pattern 0b-0e: Handle show_params in various CSV positions
  cleaned = cleaned.replace(
    /,\s*<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>\s*(?=,|\r?\n|$)/g,
    ',',
  );
  cleaned = cleaned.replace(
    /^<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>\s*,/gm,
    ',',
  );
  cleaned = cleaned.replace(
    /,\s*<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>\s*$/gm,
    ',',
  );
  cleaned = cleaned.replace(
    /^<div\s+data-info-type="show_params"[^>]*>[\s\S]*?<\/div>$/gm,
    '',
  );

  // =====================================================================================
  // VERIFICATION: Check if all show_params are gone
  // =====================================================================================

  const remainingShowParams = cleaned.match(/show_params/gi);
  if (remainingShowParams) {
    log(
      `⚠️  WARNING: ${remainingShowParams.length} instances of 'show_params' text still found`,
    );

    // Find and log the context of the first remaining instance
    const firstIndex = cleaned.toLowerCase().indexOf('show_params');
    if (firstIndex > -1) {
      const contextStart = Math.max(0, firstIndex - 100);
      const contextEnd = Math.min(cleaned.length, firstIndex + 100);
      const context = cleaned.substring(contextStart, contextEnd);

      log('📍 Context of first remaining show_params:');
      log(`   Position: character ${firstIndex}`);
      log(`   Context: ...${context}...`);

      // Check if it's in a different format we haven't handled
      const lineStart = cleaned.lastIndexOf('\n', firstIndex) + 1;
      const lineEnd = cleaned.indexOf('\n', firstIndex);
      const fullLine = cleaned.substring(
        lineStart,
        lineEnd > -1 ? lineEnd : cleaned.length,
      );
      log(
        `   Full line: ${fullLine.substring(0, 200)}${
          fullLine.length > 200 ? '...' : ''
        }`,
      );
    }
  } else {
    log('✅ All show_params instances successfully removed!');
  }

  // =====================================================================================
  // Pattern 1: Handle dt-truncate-cell divs (Superset's modern format)
  // =====================================================================================
  const truncateCellPattern =
    /<div[^>]*class="dt-truncate-cell"[^>]*>[\s\S]*?<div[^>]*class="fill-available-width"[^>]*>([^<]*)<\/div>[\s\S]*?<\/div>/g;

  cleaned = cleaned.replace(
    truncateCellPattern,
    (match: string, innerText: string) => {
      replacementCount += 1;
      const extractedText = innerText.trim();
      replacementLog.push(`dt-truncate-cell → "${extractedText}"`);
      log(
        `🔄 Pattern 1 (dt-truncate-cell): Found and extracted "${extractedText.substring(
          0,
          50,
        )}${extractedText.length > 50 ? '...' : ''}"`,
      );
      return extractedText;
    },
  );

  // =====================================================================================
  // Pattern 2: Handle data-info divs (legacy format) with various quote escaping
  // =====================================================================================
  const dataInfoPatterns = [
    // Pattern 2a: CSV cells with double-escaped quotes
    {
      pattern:
        /"<div\s+data-info=""([^"]+(?:""[^"]+)*)""\s*[^>]*>([^<]*)<\/div>"/g,
      name: 'double-escaped quotes',
      isDoubleEscaped: true,
    },
    // Pattern 2b: Regular quoted HTML divs
    {
      pattern: /"<div[^>]+data-info="([^"]+)"[^>]*>([^<]*)<\/div>"/g,
      name: 'regular quotes',
      isDoubleEscaped: false,
    },
    // Pattern 2c: Unquoted HTML divs
    {
      pattern: /<div[^>]+data-info="([^"]+)"[^>]*>([^<]*)<\/div>/g,
      name: 'unquoted',
      isDoubleEscaped: false,
    },
  ];

  dataInfoPatterns.forEach((patternInfo, index) => {
    cleaned = cleaned.replace(
      patternInfo.pattern,
      (match: string, dataInfo: string, innerText: string) => {
        replacementCount += 1;
        log(
          `🔄 Pattern 2${String.fromCharCode(97 + index)} (${
            patternInfo.name
          }): Processing match`,
        );

        // Special case: Skip chevron icons
        if (match.includes('chevron_right.svg')) {
          log('  ↳ Found chevron icon - returning empty cell');
          replacementLog.push('chevron_right → ""');
          return '""';
        }

        try {
          let jsonStr = dataInfo;

          // Handle double-escaped quotes if needed
          if (patternInfo.isDoubleEscaped && dataInfo.includes('""')) {
            jsonStr = dataInfo.replace(/""/g, '"');
            log('  ↳ Unescaped double quotes in JSON');
          }

          // Decode HTML entities
          const decoded = jsonStr
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'");

          log(
            '  ↳ Decoded JSON string:',
            decoded.substring(0, 100) + (decoded.length > 100 ? '...' : ''),
          );

          // Find the last valid closing brace for JSON parsing
          let finalJson = decoded;
          const lastBrace = decoded.lastIndexOf('}');
          if (lastBrace > 0 && lastBrace < decoded.length - 1) {
            finalJson = decoded.substring(0, lastBrace + 1);
            log('  ↳ Trimmed JSON to last valid brace');
          }

          // Parse the JSON to extract meaningful data
          const data = JSON.parse(finalJson);

          // Extract the most meaningful value
          const value = data.component_name || innerText || '';
          log(`  ↳ Extracted value: "${value}"`);
          replacementLog.push(`data-info → "${value}"`);

          return `"${value}"`;
        } catch (e) {
          // Fall back to inner text if JSON parsing fails
          log(
            '  ⚠️ Error parsing data-info JSON:',
            e instanceof Error ? e.message : 'Unknown error',
          );
          log('  ↳ Falling back to inner text:', innerText);
          replacementLog.push(`data-info (fallback) → "${innerText}"`);
          return `"${innerText || ''}"`;
        }
      },
    );
  });

  // =====================================================================================
  // Pattern 3: Clean any remaining simple div tags
  // =====================================================================================
  const simpleDivPattern = /<div[^>]*>([^<]*)<\/div>/g;

  cleaned = cleaned.replace(
    simpleDivPattern,
    (match: string, content: string) => {
      // Skip if already handled by previous patterns
      if (match.includes('data-info') || match.includes('dt-truncate-cell')) {
        return match;
      }

      replacementCount += 1;
      const cleanedContent = content.trim();
      log(
        `🔄 Pattern 3 (simple div): Found and extracted "${cleanedContent.substring(
          0,
          50,
        )}${cleanedContent.length > 50 ? '...' : ''}"`,
      );
      replacementLog.push(`simple div → "${cleanedContent}"`);
      return cleanedContent;
    },
  );

  // =====================================================================================
  // FINAL VERIFICATION AND SUMMARY
  // =====================================================================================

  // One more check for any show_params that might have slipped through
  const finalCheck = cleaned.match(/show_params/gi);
  if (finalCheck) {
    log(
      `❌ FINAL CHECK FAILED: ${finalCheck.length} show_params still present`,
    );
    log("⚠️  This indicates a pattern we haven't handled yet.");
  } else {
    log('✅ FINAL CHECK PASSED: No show_params found in cleaned content');
  }

  // Log cleaning summary
  log(`✅ CSV cleaned successfully!`);
  log(`📊 Cleaning summary:`);
  log(`   - Original size: ${csvString.length} characters`);
  log(`   - Cleaned size: ${cleaned.length} characters`);
  log(
    `   - Size reduction: ${csvString.length - cleaned.length} characters (${(
      (1 - cleaned.length / csvString.length) *
      100
    ).toFixed(1)}%)`,
  );
  log(`   - HTML elements replaced: ${replacementCount}`);

  if (replacementLog.length > 0 && replacementLog.length <= 10) {
    log(`   - Replacements made:`, replacementLog);
  } else if (replacementLog.length > 10) {
    log(`   - First 10 replacements:`, replacementLog.slice(0, 10));
    log(`   - ... and ${replacementLog.length - 10} more`);
  }

  return cleaned;
}

/**
 * Install CSV cleaner interceptors
 *
 * This function patches SupersetClient's methods to intercept CSV exports
 * and clean them before they reach the user. It handles both API-based
 * exports (via post) and form-based downloads (via postForm).
 */
export function installCSVCleaner() {
  if (isInstalled) {
    log('✅ CSV cleaner already installed');
    return;
  }

  log('🔧 Installing CSV cleaner...');
  log('📌 Current configuration:', CONFIG);

  // Store references to original methods so we can restore them later
  originalPost = SupersetClient.post;
  originalPostForm = SupersetClient.postForm;

  // Override SupersetClient.post for API-based CSV exports
  SupersetClient.post = function (...args: any[]) {
    const [requestConfig] = args;

    // Detect if this is a CSV export request
    const isCSVExport =
      requestConfig?.postPayload?.result_format === 'csv' ||
      requestConfig?.postPayload?.result_type === 'results' ||
      (typeof requestConfig?.postPayload?.form_data === 'string' &&
        requestConfig.postPayload.form_data.includes('"result_format":"csv"'));

    if (isCSVExport) {
      log('🎯 CSV export detected via SupersetClient.post');
      log('📤 Request config:', requestConfig);

      // Call the original method and clean the response
      return originalPost
        .call(this, ...args)
        .then(async (response: any) => {
          // Check for various content types that need cleaning
          if (typeof response === 'string' && response.startsWith('PK')) {
            log('📦 ZIP file detected in API response');
            return cleanCSVContent(response);
          }

          if (
            typeof response === 'string' &&
            (response.includes('div data-info=') ||
              response.includes('dt-truncate-cell') ||
              response.includes('show_params')) // Added check for show_params
          ) {
            log('🔍 HTML detected in API response - cleaning...');
            return cleanCSVContent(response);
          }

          // Handle ArrayBuffer responses
          if (response instanceof ArrayBuffer) {
            log('🔍 Binary response detected - checking content...');
            return cleanCSVContent(response);
          }

          log('✅ API response is already clean');
          return response;
        })
        .catch((error: any) => {
          log('❌ Error in CSV post interceptor:', error);
          throw error;
        });
    }

    // Not a CSV export, pass through to original method
    return originalPost.call(this, ...args);
  };

  // Override SupersetClient.postForm for form-based CSV exports
  SupersetClient.postForm = function (url: string, formData: any) {
    log('📡 postForm called:', url);

    let isCSVExport = false;
    let sliceName = 'export';

    // Check if this is a CSV export by parsing the form data
    if (formData?.form_data) {
      try {
        const parsed = JSON.parse(formData.form_data);
        isCSVExport = parsed.result_format === 'csv';
        sliceName = parsed.slice_name || parsed.viz_type || 'export';
        log('📋 Form data parsed:', {
          isCSVExport,
          sliceName,
          result_format: parsed.result_format,
        });
      } catch (e) {
        log('⚠️ Could not parse form_data - not JSON or parsing error');
      }
    }

    if (isCSVExport) {
      log('🎯 CSV export detected via postForm - intercepting download...');

      // Fetch the data ourselves to apply cleaning
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams(formData).toString(),
        credentials: 'same-origin',
      })
        .then(response => {
          log('📥 Response received:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
          });

          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status} ${response.statusText}`,
            );
          }

          // Check content type to determine how to read the response
          const contentType = response.headers.get('content-type') || '';

          // Handle binary content types
          if (
            contentType.includes('application/zip') ||
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/x-zip-compressed')
          ) {
            log('🔍 Binary content-type detected, reading as ArrayBuffer...');
            return response.arrayBuffer();
          }

          // Otherwise, read as text and check for ZIP signature
          return response.text().then(text => {
            if (text.startsWith('PK')) {
              log('📦 ZIP signature detected, converting to binary...');
              const bytes = new Uint8Array(text.length);
              for (let i = 0; i < text.length; i += 1) {
                bytes[i] = text.charCodeAt(i) & 0xff;
              }
              return bytes.buffer;
            }
            return text;
          });
        })
        .then(async (content: string | ArrayBuffer) => {
          log('📊 Content received, type:', typeof content);
          if (content instanceof ArrayBuffer) {
            log('📊 Binary content size:', content.byteLength, 'bytes');
          } else {
            log('📊 Text content size:', content.length, 'characters');
          }

          // Handle ZIP files
          if (
            (typeof content === 'string' && content.startsWith('PK')) ||
            (content instanceof ArrayBuffer && isZipFile(content))
          ) {
            log('📦 ZIP file detected - attempting extraction...');

            try {
              // Try to extract and clean the CSV from the ZIP
              const cleanedCSV = await cleanCSVContent(content);

              // Download the cleaned CSV
              const blob = new Blob([cleanedCSV], {
                type: 'text/csv;charset=utf-8;',
              });
              const downloadUrl = URL.createObjectURL(blob);
              const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, '-')
                .slice(0, -5);
              const filename = `${sliceName}${CONFIG.cleanedSuffix}_${timestamp}.csv`;

              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              link.style.display = 'none';

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
              log(`✅ Extracted and cleaned CSV downloaded as "${filename}"`);
              return;
            } catch (error) {
              // Fall back to downloading the ZIP
              log(
                '⚠️ Could not extract CSV from ZIP, downloading ZIP file instead',
              );
              console.error('ZIP extraction error:', error);

              const blob =
                content instanceof ArrayBuffer
                  ? new Blob([content], { type: 'application/zip' })
                  : new Blob([content], { type: 'application/zip' });

              const downloadUrl = URL.createObjectURL(blob);
              const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, '-')
                .slice(0, -5);
              const filename = `${sliceName}_${timestamp}.zip`;

              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = filename;
              link.style.display = 'none';

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
              log(`📦 ZIP file downloaded as "${filename}"`);
              return;
            }
          }

          // For text content, check if it needs cleaning
          let finalContent: string;

          if (typeof content === 'string') {
            if (
              content.includes('div data-info=') ||
              content.includes('dt-truncate-cell') ||
              content.includes('show_params')
            ) {
              // Added check for show_params
              log('🧹 HTML detected in CSV, cleaning...');
              finalContent = await cleanCSVContent(content);
            } else {
              log('✅ CSV is already clean - no HTML detected');
              finalContent = content;
            }
          } else {
            // Handle unexpected binary content
            log('⚠️ Unexpected binary content for non-ZIP file');
            finalContent = new TextDecoder().decode(content);
          }

          // Create and download the cleaned CSV
          const blob = new Blob([finalContent], {
            type: 'text/csv;charset=utf-8;',
          });
          const downloadUrl = URL.createObjectURL(blob);

          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, -5);
          const filename = `${sliceName}${CONFIG.cleanedSuffix}_${timestamp}.csv`;

          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
            log('🧹 Cleaned up blob URL');
          }, 1000);

          log(`✅ Clean CSV downloaded successfully as "${filename}"!`);
        })
        .catch(error => {
          log('❌ CSV cleaning failed:', error);
          log('⚠️ Falling back to original form submission...');

          // Fall back to original form submission
          originalPostForm.call(this, url, formData);
        });

      // Don't call the original postForm for CSV exports
      return;
    }

    // Not a CSV export, use original method
    // eslint-disable-next-line consistent-return
    return originalPostForm.call(this, url, formData);
  };

  isInstalled = true;
  log('✅ CSV cleaner installed successfully!');
  log(
    'ℹ️  The cleaner will automatically process all CSV exports from Superset',
  );
}

/**
 * Uninstall CSV cleaner interceptors
 */
export function uninstallCSVCleaner() {
  if (!isInstalled) {
    log('ℹ️  CSV cleaner is not currently installed');
    return;
  }

  log('🧹 Uninstalling CSV cleaner...');

  // Restore original methods
  if (originalPost) {
    SupersetClient.post = originalPost;
    log('✅ Restored original SupersetClient.post');
  }
  if (originalPostForm) {
    SupersetClient.postForm = originalPostForm;
    log('✅ Restored original SupersetClient.postForm');
  }

  isInstalled = false;
  log('✅ CSV cleaner uninstalled successfully');
}

/**
 * Get the current status of the CSV cleaner
 */
export function getCSVCleanerStatus() {
  return {
    isInstalled,
    config: CONFIG,
    interceptedMethods: isInstalled
      ? ['SupersetClient.post', 'SupersetClient.postForm']
      : [],
  };
}

/**
 * Update CSV cleaner configuration
 */
export function updateCSVCleanerConfig(newConfig: Partial<typeof CONFIG>) {
  Object.assign(CONFIG, newConfig);
  log('🔧 CSV cleaner configuration updated:', CONFIG);
}
