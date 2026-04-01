'use strict';

const { randomVarName, b64encode, rc4, randomString, hexEncode } = require('../utils/helpers');

function removeComments(code) {

  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  const lines = code.split('\n');
  const cleaned = lines.map((line) => {
    let inString = false;
    let strChar = '';
    let result = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inString) {
        result += c;
        if (c === strChar && line[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (c === '"' || c === "'") {
          inString = true;
          strChar = c;
          result += c;
        } else if (c === '/' && line[i + 1] === '/') {
          break;
        } else if (c === '#') {
          break;
        } else {
          result += c;
        }
      }
    }
    return result;
  });
  return cleaned.join('\n');
}

function renameVariables(code) {

  const reserved = new Set([
    '$this', '$_GET', '$_POST', '$_REQUEST', '$_SERVER', '$_SESSION',
    '$_COOKIE', '$_FILES', '$_ENV', '$GLOBALS', '$argc', '$argv',
    '$_', '$php_errormsg',
  ]);

  const varRegex = /\$([a-zA-Z_]\w*)/g;
  const varMap = new Map();
  let match;

  while ((match = varRegex.exec(code)) !== null) {
    const fullVar = match[0];
    if (!reserved.has(fullVar) && !varMap.has(fullVar)) {
      varMap.set(fullVar, '$' + randomVarName('_v'));
    }
  }

  let result = code;
  for (const [original, renamed] of varMap) {

    const escaped = original.replace(/\$/g, '\\$');
    const regex = new RegExp(escaped + '(?![a-zA-Z0-9_])', 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function renameFunctions(code) {
  const funcRegex = /function\s+([a-zA-Z_]\w*)\s*\(/g;
  const funcMap = new Map();
  let match;

  const builtins = new Set([
    'echo', 'print', 'isset', 'empty', 'unset', 'die', 'exit',
    'require', 'include', 'require_once', 'include_once',
    '__construct', '__destruct', '__call', '__get', '__set',
    '__toString', '__clone', '__invoke',
  ]);

  while ((match = funcRegex.exec(code)) !== null) {
    const funcName = match[1];
    if (!builtins.has(funcName) && !funcMap.has(funcName)) {
      funcMap.set(funcName, randomVarName('_fn'));
    }
  }

  let result = code;
  for (const [original, renamed] of funcMap) {
    const regex = new RegExp('\\b' + original + '\\b', 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function renameClasses(code) {
  const classRegex = /class\s+([a-zA-Z_]\w*)/g;
  const classMap = new Map();
  let match;

  while ((match = classRegex.exec(code)) !== null) {
    const className = match[1];
    if (!classMap.has(className)) {
      classMap.set(className, randomVarName('_C'));
    }
  }

  let result = code;
  for (const [original, renamed] of classMap) {
    const regex = new RegExp('\\b' + original + '\\b', 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function encodeStrings(code) {

  return code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);

    if (content.length < 2) return match;

    const encoded = b64encode(content);
    return `base64_decode("${encoded}")`;
  });
}

function wrapInEval(code, depth = 1) {
  let phpCode = code;

  const hasOpenTag = phpCode.trimStart().startsWith('<?php');
  if (hasOpenTag) {
    phpCode = phpCode.replace(/^\s*<\?php\s*/, '');
  }

  phpCode = phpCode.replace(/\s*\?>\s*$/, '');

  for (let i = 0; i < depth; i++) {
    const encoded = b64encode(phpCode);
    phpCode = `eval(base64_decode("${encoded}"))`;
  }

  return `<?php\n${phpCode};\n?>`;
}

function injectDeadCode(code) {
  const deadSnippets = [
    `if(false){${randomVarName('$_d')}=base64_decode("${b64encode(randomString(20))}");}`,
    `${randomVarName('$_x')}=array(${Array.from({ length: 5 }, () => `"${b64encode(randomString(8))}"`).join(',')});`,
    `for(${randomVarName('$_i')}=0;${randomVarName('$_i')}<0;${randomVarName('$_i')}++){${randomVarName('$_n')}=md5("${randomString(10)}");}`,
    `function ${randomVarName('_dead')}(){return str_rot13(base64_decode("${b64encode(randomString(15))}"));}`,
  ];

  const lines = code.split('\n');
  const result = [];

  for (const line of lines) {
    result.push(line);
    if (Math.random() > 0.6 && line.trim() && !line.trim().startsWith('<?') && !line.trim().startsWith('?>')) {
      const snippet = deadSnippets[Math.floor(Math.random() * deadSnippets.length)];
      result.push(snippet);
    }
  }

  return result.join('\n');
}

function minifyPHP(code) {
  const lines = code.split('\n');
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,()=+\-*/<>!&|])\s*/g, '$1');
}

function obfuscateLight(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = minifyPHP(result);
  return result;
}

function obfuscateMedium(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = renameFunctions(result);
  result = renameClasses(result);
  result = encodeStrings(result);
  result = minifyPHP(result);
  return result;
}

function obfuscateHeavy(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = renameFunctions(result);
  result = renameClasses(result);
  result = encodeStrings(result);
  result = injectDeadCode(result);
  result = minifyPHP(result);
  result = wrapInEval(result, 2);
  return result;
}

async function obfuscatePHP(code, level = 'medium') {
  switch (level) {
    case 'light':
      return obfuscateLight(code);
    case 'medium':
      return obfuscateMedium(code);
    case 'heavy':
      return obfuscateHeavy(code);
    default:
      throw new Error(`Unknown obfuscation level: ${level}`);
  }
}

module.exports = { obfuscatePHP };
