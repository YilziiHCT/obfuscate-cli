'use strict';

const { minify: htmlMinify } = require('html-minifier-terser');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { randomVarName, b64encode, hexEncode, randomString } = require('../utils/helpers');

function removeCSSComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function renameCSSSelectors(css, selectorMap) {
  let result = css;

  for (const [original, renamed] of selectorMap) {

    const classRegex = new RegExp(`\\.${escapeRegex(original)}(?=[\\s{:,+~>\\[\\]])`, 'g');
    result = result.replace(classRegex, `.${renamed}`);

    const idRegex = new RegExp(`#${escapeRegex(original)}(?=[\\s{:,+~>\\[\\]])`, 'g');
    result = result.replace(idRegex, `#${renamed}`);
  }

  return result;
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function encodeCSSValues(css) {
  return css.replace(/content\s*:\s*["']([^"']+)["']/g, (match, str) => {
    const encoded = str
      .split('')
      .map((c) => '\\' + c.charCodeAt(0).toString(16).padStart(4, '0'))
      .join('');
    return `content:"${encoded}"`;
  });
}

async function obfuscateCSS(code, level = 'medium') {
  let result = code;

  switch (level) {
    case 'light':
      result = removeCSSComments(result);
      result = minifyCSS(result);
      break;
    case 'medium':
      result = removeCSSComments(result);
      result = encodeCSSValues(result);
      result = minifyCSS(result);
      break;
    case 'heavy':
      result = removeCSSComments(result);
      result = encodeCSSValues(result);
      result = minifyCSS(result);

      result = wrapCSSInJS(result);
      break;
  }

  return result;
}

function wrapCSSInJS(css) {
  const encoded = b64encode(css);
  return `\n` +
    `(function(){var s=document.createElement('style');` +
    `s.textContent=atob("${encoded}");` +
    `document.head.appendChild(s)})();\n` +
    ``;
}

function obfuscateInlineScripts(html, level) {
  return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
    if (!scriptContent.trim()) return match;

    if (match.match(/src\s*=/i)) return match;

    try {
      let obfuscatedCode;
      const obfOptions = getJSObfuscationOptions(level);
      const result = JavaScriptObfuscator.obfuscate(scriptContent, obfOptions);
      obfuscatedCode = result.getObfuscatedCode();
      return `<script>${obfuscatedCode}</script>`;
    } catch (err) {

      return match;
    }
  });
}

function getJSObfuscationOptions(level) {
  switch (level) {
    case 'light':
      return {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: false,
        target: 'browser',
      };
    case 'medium':
      return {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        target: 'browser',
        unicodeEscapeSequence: true,
      };
    case 'heavy':
      return {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 1,
        target: 'browser',
        unicodeEscapeSequence: true,
      };
    default:
      return {};
  }
}

function obfuscateInlineCSS(html, level) {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, cssContent) => {
    if (!cssContent.trim()) return match;
    const minified = minifyCSS(cssContent);
    return `<style>${minified}</style>`;
  });
}

function encodeHTMLAttributes(html) {

  return html.replace(/(?:title|alt|placeholder|value)\s*=\s*"([^"]+)"/gi, (match, value) => {
    const encoded = value
      .split('')
      .map((c) => `&#${c.charCodeAt(0)};`)
      .join('');
    const attr = match.split('=')[0];
    return `${attr}="${encoded}"`;
  });
}

function renameHTMLIdentifiers(html) {
  const idMap = new Map();
  const classMap = new Map();

  html.replace(/id\s*=\s*"([^"]+)"/gi, (match, id) => {
    if (!idMap.has(id)) {
      idMap.set(id, randomVarName('_id'));
    }
  });

  html.replace(/class\s*=\s*"([^"]+)"/gi, (match, classes) => {
    classes.split(/\s+/).forEach((cls) => {
      if (cls && !classMap.has(cls)) {
        classMap.set(cls, randomVarName('_cls'));
      }
    });
  });

  let result = html;

  for (const [original, renamed] of idMap) {
    result = result.replace(new RegExp(`id\\s*=\\s*"${escapeRegex(original)}"`, 'gi'), `id="${renamed}"`);
    result = result.replace(new RegExp(`getElementById\\(["']${escapeRegex(original)}["']\\)`, 'g'), `getElementById("${renamed}")`);
    result = result.replace(new RegExp(`#${escapeRegex(original)}(?=[\\s{:,])`, 'g'), `#${renamed}`);
  }

  for (const [original, renamed] of classMap) {
    result = result.replace(new RegExp(`(?<=class\\s*=\\s*"[^"]*?)\\b${escapeRegex(original)}\\b(?=[^"]*")`, 'gi'), renamed);
    result = result.replace(new RegExp(`\\.${escapeRegex(original)}(?=[\\s{:,+~>])`, 'g'), `.${renamed}`);
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function obfuscateHTML(code, level = 'medium') {
  let result = code;

  result = obfuscateInlineScripts(result, level);

  result = obfuscateInlineCSS(result, level);

  if (level === 'medium' || level === 'heavy') {

    result = encodeHTMLAttributes(result);
  }

  if (level === 'heavy') {

    result = renameHTMLIdentifiers(result);
  }

  try {
    result = await htmlMinify(result, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: level !== 'light',
      minifyCSS: true,
      minifyJS: false,
      removeAttributeQuotes: false,
      collapseBooleanAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
    });
  } catch (err) {

  }

  return result;
}

module.exports = { obfuscateHTML, obfuscateCSS };
