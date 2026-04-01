'use strict';

const { js_beautify } = require('js-beautify');
const { getLanguageKey } = require('../utils/helpers');

/**
 * Security & Decodability Test Module
 * Tests obfuscated code resistance against reverse-engineering attempts
 */

/**
 * Extract meaningful identifiers from source code
 * Returns variable names, function names, class names, and string literals
 */
function extractIdentifiers(code, langKey) {
  const results = {
    variables: [],
    functions: [],
    classes: [],
    strings: [],
  };

  switch (langKey) {
    case 'js': {
      const varMatches = code.match(/(?:var|let|const)\s+([a-zA-Z_$]\w*)/g) || [];
      results.variables = varMatches.map((m) => m.replace(/(?:var|let|const)\s+/, ''));

      const funcMatches = code.match(/function\s+([a-zA-Z_$]\w*)/g) || [];
      results.functions = funcMatches.map((m) => m.replace('function ', ''));

      const classMatches = code.match(/class\s+([a-zA-Z_$]\w*)/g) || [];
      results.classes = classMatches.map((m) => m.replace('class ', ''));

      const strMatches = code.match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [];
      results.strings = strMatches
        .map((s) => s.slice(1, -1))
        .filter((s) => s.length > 3);
      break;
    }

    case 'php': {
      const varMatches = code.match(/\$([a-zA-Z_]\w*)/g) || [];
      results.variables = varMatches.map((m) => m.slice(1));

      const funcMatches = code.match(/function\s+([a-zA-Z_]\w*)/g) || [];
      results.functions = funcMatches.map((m) => m.replace('function ', ''));

      const classMatches = code.match(/class\s+([a-zA-Z_]\w*)/g) || [];
      results.classes = classMatches.map((m) => m.replace('class ', ''));

      const strMatches = code.match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [];
      results.strings = strMatches
        .map((s) => s.slice(1, -1))
        .filter((s) => s.length > 3);
      break;
    }

    case 'python': {
      const varMatches = code.match(/([a-zA-Z_]\w*)\s*=/g) || [];
      results.variables = varMatches.map((m) => m.replace(/\s*=/, ''));

      const funcMatches = code.match(/def\s+([a-zA-Z_]\w*)/g) || [];
      results.functions = funcMatches.map((m) => m.replace('def ', ''));

      const classMatches = code.match(/class\s+([a-zA-Z_]\w*)/g) || [];
      results.classes = classMatches.map((m) => m.replace('class ', ''));

      const strMatches = code.match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [];
      results.strings = strMatches
        .map((s) => s.slice(1, -1))
        .filter((s) => s.length > 3);
      break;
    }

    case 'html':
    case 'css': {
      const idMatches = code.match(/id\s*=\s*"([^"]+)"/gi) || [];
      results.variables = idMatches.map((m) => m.match(/"([^"]+)"/)[1]);

      const classMatches = code.match(/class\s*=\s*"([^"]+)"/gi) || [];
      results.classes = classMatches
        .map((m) => m.match(/"([^"]+)"/)[1])
        .flatMap((s) => s.split(/\s+/));

      const strMatches = code.match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || [];
      results.strings = strMatches
        .map((s) => s.slice(1, -1))
        .filter((s) => s.length > 3);
      break;
    }
  }

  const noise = new Set([
    'true', 'false', 'null', 'undefined', 'this', 'self',
    'constructor', 'prototype', 'length', 'name', 'value',
    'type', 'text', 'html', 'body', 'head', 'style', 'script',
  ]);

  results.variables = results.variables.filter((v) => !noise.has(v) && v.length > 2);
  results.functions = results.functions.filter((f) => !noise.has(f) && f.length > 2 && !f.startsWith('__'));
  results.classes = results.classes.filter((c) => !noise.has(c) && c.length > 2);

  return results;
}

/**
 * Test decodability — try to reverse the obfuscation
 * @param {string} obfuscatedCode - The obfuscated code
 * @param {string} langKey - Language key (js, php, html, css, python)
 * @returns {Object} - { score, label, details }
 */
function testDecodability(obfuscatedCode, langKey) {
  let score = 100;
  const survivingTechniques = [];
  const weaknesses = [];

  switch (langKey) {
    case 'js': {
      try {
        const beautified = js_beautify(obfuscatedCode);
        const readability = assessReadability(beautified);

        if (readability > 0.7) {
          score -= 40;
          weaknesses.push('Code easily beautified to readable format');
        } else if (readability > 0.4) {
          score -= 20;
          weaknesses.push('Code partially readable after beautification');
        } else {
          survivingTechniques.push('Beautification resistance');
        }
      } catch (err) {
        survivingTechniques.push('Beautifier cannot process code');
      }

      if (obfuscatedCode.includes('_0x')) {
        survivingTechniques.push('Hexadecimal identifier naming');
      }
      if (obfuscatedCode.includes('rc4') || obfuscatedCode.includes('atob')) {
        survivingTechniques.push('String encryption (RC4/Base64)');
      }

      if (obfuscatedCode.includes('switch') && obfuscatedCode.includes('while')) {
        survivingTechniques.push('Control flow flattening');
      }
      if (obfuscatedCode.includes('constructor') && obfuscatedCode.includes('return')) {
        survivingTechniques.push('Self-defending code patterns');
      }

      if (obfuscatedCode.length > obfuscatedCode.replace(/if\s*\(\s*false\s*\)/g, '').length) {
        survivingTechniques.push('Dead code injection');
      }

      break;
    }

    case 'php': {
      const evalCount = (obfuscatedCode.match(/eval\s*\(/g) || []).length;
      const base64Count = (obfuscatedCode.match(/base64_decode\s*\(/g) || []).length;

      if (evalCount > 0 && base64Count > 0) {
        if (evalCount >= 2) {
          survivingTechniques.push(`Multi-layer eval/base64 chain (${evalCount} layers)`);
        } else {
          score -= 15;
          weaknesses.push('Single-layer base64 encoding (easily decoded)');
        }
      }

      if (base64Count > 2) {
        survivingTechniques.push('Extensive string base64 encoding');
      }
      const hexVars = (obfuscatedCode.match(/\$_[a-zA-Z]{6,}/g) || []).length;
      if (hexVars > 3) {
        survivingTechniques.push('Variable name scrambling');
      }

      break;
    }

    case 'html': {
      const entityCount = (obfuscatedCode.match(/&#\d+;/g) || []).length;
      if (entityCount > 5) {
        survivingTechniques.push('HTML entity encoding');
      } else {
        score -= 10;
        weaknesses.push('Limited HTML entity encoding');
      }

      if (obfuscatedCode.includes('_0x') || obfuscatedCode.includes('atob')) {
        survivingTechniques.push('Obfuscated inline JavaScript');
      }
      if (!/\n\s+/.test(obfuscatedCode)) {
        survivingTechniques.push('Full minification');
      }

      break;
    }

    case 'css': {
      if (/\\[0-9a-f]{4}/i.test(obfuscatedCode)) {
        survivingTechniques.push('Unicode escape encoding');
      }
      if (!/\n\s+/.test(obfuscatedCode)) {
        survivingTechniques.push('Full minification');
      } else {
        score -= 10;
        weaknesses.push('Code not fully minified');
      }

      break;
    }

    case 'python': {
      const execCount = (obfuscatedCode.match(/exec\s*\(/g) || []).length;
      const b64Count = (obfuscatedCode.match(/b64decode/g) || []).length;

      if (execCount > 0 && b64Count > 0) {
        if (execCount >= 2) {
          survivingTechniques.push(`Multi-layer exec/base64 chain (${execCount} layers)`);
        } else {
          score -= 15;
          weaknesses.push('Single-layer base64 encoding');
        }
      }

      const hexStrings = (obfuscatedCode.match(/\\x[0-9a-f]{2}/gi) || []).length;
      if (hexStrings > 10) {
        survivingTechniques.push('Hex string encoding');
      }

      break;
    }
  }

  score = Math.min(100, score + survivingTechniques.length * 5);
  score = Math.max(0, score);

  let label;
  if (score >= 90) label = 'UNBREAKABLE';
  else if (score >= 70) label = 'STRONG';
  else if (score >= 40) label = 'MODERATE';
  else label = 'WEAK';

  return {
    score,
    label,
    details: survivingTechniques,
    weaknesses,
  };
}

/**
 * Static analysis — detect leakage of original identifiers
 * @param {string} originalCode - Original source code
 * @param {string} obfuscatedCode - Obfuscated code
 * @param {string} langKey - Language key
 * @returns {Object} - { stringLeakage, varLeakage, reverseRisk, warnings }
 */
function runStaticAnalysis(originalCode, obfuscatedCode, langKey) {
  const original = extractIdentifiers(originalCode, langKey);
  const warnings = [];

  let stringsLeaked = 0;
  for (const str of original.strings) {
    if (str.length > 4 && obfuscatedCode.includes(str)) {
      stringsLeaked++;
      if (stringsLeaked <= 3) {
        warnings.push(`Original string found in output: "${str.substring(0, 30)}..."`);
      }
    }
  }

  const stringLeakage = stringsLeaked > 0;
  if (stringsLeaked > 3) {
    warnings.push(`...and ${stringsLeaked - 3} more leaked strings`);
  }

  let varsLeaked = 0;
  for (const v of original.variables) {
    if (v.length > 3 && obfuscatedCode.includes(v)) {
      varsLeaked++;
      if (varsLeaked <= 3) {
        warnings.push(`Original variable name found: "${v}"`);
      }
    }
  }

  const varLeakage = varsLeaked > 0;

  for (const f of original.functions) {
    if (f.length > 3 && obfuscatedCode.includes(f)) {
      warnings.push(`Original function name found: "${f}"`);
    }
  }

  for (const c of original.classes) {
    if (c.length > 3 && obfuscatedCode.includes(c)) {
      warnings.push(`Original class name found: "${c}"`);
    }
  }

  let reverseRisk;
  const totalIssues = warnings.length;
  if (totalIssues === 0) reverseRisk = 'LOW';
  else if (totalIssues <= 3) reverseRisk = 'MODERATE';
  else reverseRisk = 'HIGH';

  if (obfuscatedCode.includes('atob(') || obfuscatedCode.includes('btoa(')) {
    warnings.push('Base64 encoding detected (easily reversible)');
  }
  if (/\\x[0-9a-f]{2}/i.test(obfuscatedCode)) {
    warnings.push('Hex encoding detected (tools can auto-decode)');
  }

  return {
    stringLeakage,
    varLeakage,
    reverseRisk,
    warnings,
  };
}

/**
 * Assess readability of beautified code (0 = unreadable, 1 = very readable)
 */
function assessReadability(code) {
  let score = 0;
  const lines = code.split('\n');

  const readableVars = (code.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  const totalTokens = (code.match(/\b\w+\b/g) || []).length;

  if (totalTokens > 0) {
    score += (readableVars / totalTokens) * 0.5;
  }

  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
  if (avgLineLength < 120) score += 0.2;

  const keywords = ['function', 'class', 'var', 'let', 'const', 'if', 'else', 'for', 'while'];
  const keywordCount = keywords.reduce((count, kw) => {
    return count + (code.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
  }, 0);

  if (keywordCount > 5) score += 0.3;

  return Math.min(1, score);
}

/**
 * Run a full security test suite
 * @param {string} originalCode - Original source code
 * @param {string} obfuscatedCode - Obfuscated code
 * @param {string} langKey - Language key
 * @returns {Object} - Full security analysis result
 */
async function runSecurityTest(originalCode, obfuscatedCode, langKey) {
  const decodability = testDecodability(obfuscatedCode, langKey);

  const staticAnalysis = runStaticAnalysis(originalCode, obfuscatedCode, langKey);

  return {
    decodabilityScore: decodability.score,
    decodabilityLabel: decodability.label,
    decodabilityDetails: decodability.details,
    decodabilityWeaknesses: decodability.weaknesses,
    stringLeakage: staticAnalysis.stringLeakage,
    varLeakage: staticAnalysis.varLeakage,
    reverseRisk: staticAnalysis.reverseRisk,
    staticWarnings: staticAnalysis.warnings,
  };
}

module.exports = {
  runSecurityTest,
  testDecodability,
  runStaticAnalysis,
  extractIdentifiers,
};
