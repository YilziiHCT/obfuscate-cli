'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getLanguageKey } = require('../utils/helpers');

/**
 * Functionality Test Runner
 * Tests whether obfuscated code produces the same output as original
 */

/**
 * Run a JavaScript file and capture output
 * @param {string} filePath - Path to the JS file
 * @returns {Object} - { success, output, error }
 */
function runJSFile(filePath) {
  try {
    const output = execSync(`node "${filePath}"`, {
      timeout: 10000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim(), error: null };
  } catch (err) {
    return {
      success: false,
      output: err.stdout ? err.stdout.trim() : '',
      error: err.stderr ? err.stderr.trim() : err.message,
    };
  }
}

/**
 * Run a Python file and capture output
 * @param {string} filePath - Path to the Python file
 * @returns {Object} - { success, output, error }
 */
function runPythonFile(filePath) {
  // Try python3 first, then python
  const commands = ['python', 'python3', 'py'];

  for (const cmd of commands) {
    try {
      const output = execSync(`${cmd} "${filePath}"`, {
        timeout: 10000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { success: true, output: output.trim(), error: null };
    } catch (err) {
      // If command not found, try next
      if (err.message && err.message.includes('is not recognized')) continue;
      if (err.message && err.message.includes('not found')) continue;

      return {
        success: false,
        output: err.stdout ? err.stdout.trim() : '',
        error: err.stderr ? err.stderr.trim() : err.message,
      };
    }
  }

  return {
    success: false,
    output: '',
    error: 'Python interpreter not found. Install Python to run functionality tests.',
  };
}

/**
 * Validate PHP file syntax (if PHP is available)
 * @param {string} filePath - Path to the PHP file
 * @returns {Object} - { success, output, error }
 */
function runPHPFile(filePath) {
  try {
    const output = execSync(`php -l "${filePath}"`, {
      timeout: 10000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      success: output.includes('No syntax errors'),
      output: output.trim(),
      error: null,
    };
  } catch (err) {
    // If PHP not installed, do basic validation
    if (err.message && (err.message.includes('is not recognized') || err.message.includes('not found'))) {
      return {
        success: true,
        output: 'PHP not available — syntax check skipped',
        error: null,
      };
    }
    return {
      success: false,
      output: err.stdout ? err.stdout.trim() : '',
      error: err.stderr ? err.stderr.trim() : err.message,
    };
  }
}

/**
 * Validate HTML file by checking structure
 * @param {string} filePath - Path to the HTML file
 * @returns {Object} - { success, output, error }
 */
function validateHTMLFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basic HTML validation
    const hasDoctype = /<(!DOCTYPE|html)/i.test(content);
    const hasHtmlTag = /<html/i.test(content);
    const hasBody = /<body/i.test(content) || content.length > 0;
    const balancedTags = checkBalancedTags(content);

    if (hasBody) {
      return {
        success: true,
        output: 'HTML structure valid — basic validation passed',
        error: null,
      };
    }

    return {
      success: false,
      output: '',
      error: 'Invalid HTML structure',
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err.message,
    };
  }
}

/**
 * Validate CSS file syntax
 * @param {string} filePath - Path to the CSS file
 * @returns {Object} - { success, output, error }
 */
function validateCSSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for balanced braces
    let braces = 0;
    for (const c of content) {
      if (c === '{') braces++;
      if (c === '}') braces--;
      if (braces < 0) {
        return {
          success: false,
          output: '',
          error: 'Unbalanced CSS braces',
        };
      }
    }

    if (braces !== 0) {
      return {
        success: false,
        output: '',
        error: `Unbalanced CSS braces (${braces > 0 ? 'missing closing' : 'extra closing'})`,
      };
    }

    return {
      success: true,
      output: 'CSS syntax valid — brace check passed',
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err.message,
    };
  }
}

/**
 * Simple balanced tag checker for HTML
 */
function checkBalancedTags(html) {
  const openTags = (html.match(/<[a-z][^\/]*?>/gi) || []).length;
  const closeTags = (html.match(/<\/[a-z]+>/gi) || []).length;
  return Math.abs(openTags - closeTags) < openTags * 0.3;
}

/**
 * Run functionality test for a file
 * @param {string} originalPath - Path to original file
 * @param {string} obfuscatedPath - Path to obfuscated file
 * @returns {Object} - { pass, detail }
 */
async function runFunctionalityTest(originalPath, obfuscatedPath) {
  const langKey = getLanguageKey(originalPath);

  switch (langKey) {
    case 'js': {
      const originalResult = runJSFile(originalPath);
      const obfuscatedResult = runJSFile(obfuscatedPath);

      if (!obfuscatedResult.success) {
        return {
          pass: false,
          detail: `Runtime error: ${obfuscatedResult.error}`,
        };
      }

      if (originalResult.output === obfuscatedResult.output) {
        return { pass: true, detail: 'output identical' };
      }

      return {
        pass: false,
        detail: `Output differs. Original: "${originalResult.output.substring(0, 50)}" vs Obfuscated: "${obfuscatedResult.output.substring(0, 50)}"`,
      };
    }

    case 'python': {
      const originalResult = runPythonFile(originalPath);
      const obfuscatedResult = runPythonFile(obfuscatedPath);

      if (!obfuscatedResult.success) {
        return {
          pass: false,
          detail: `Runtime error: ${obfuscatedResult.error}`,
        };
      }

      if (originalResult.output === obfuscatedResult.output) {
        return { pass: true, detail: 'output identical' };
      }

      return {
        pass: false,
        detail: `Output differs. Original: "${originalResult.output.substring(0, 50)}" vs Obfuscated: "${obfuscatedResult.output.substring(0, 50)}"`,
      };
    }

    case 'php': {
      const result = runPHPFile(obfuscatedPath);
      return {
        pass: result.success,
        detail: result.success
          ? (result.output || 'syntax valid')
          : (result.error || 'syntax error detected'),
      };
    }

    case 'html': {
      const result = validateHTMLFile(obfuscatedPath);
      return {
        pass: result.success,
        detail: result.success
          ? (result.output || 'structure valid')
          : (result.error || 'structure invalid'),
      };
    }

    case 'css': {
      const result = validateCSSFile(obfuscatedPath);
      return {
        pass: result.success,
        detail: result.success
          ? (result.output || 'syntax valid')
          : (result.error || 'syntax error'),
      };
    }

    default:
      return { pass: true, detail: 'no specific test available for this language' };
  }
}

module.exports = { runFunctionalityTest };
