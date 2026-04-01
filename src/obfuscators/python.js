'use strict';

const { randomVarName, b64encode, rc4, randomString, hexEncode } = require('../utils/helpers');

function removeComments(code) {

  let result = code.replace(/"""[\s\S]*?"""/g, '""');
  result = result.replace(/'''[\s\S]*?'''/g, "''");

  const lines = result.split('\n');
  const cleaned = lines.map((line) => {
    let inString = false;
    let strChar = '';
    let cleanLine = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inString) {
        cleanLine += c;
        if (c === strChar && line[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (c === '"' || c === "'") {
          inString = true;
          strChar = c;
          cleanLine += c;
        } else if (c === '#') {
          break;
        } else {
          cleanLine += c;
        }
      }
    }
    return cleanLine;
  });

  return cleaned.join('\n');
}

function renameVariables(code) {

  const reserved = new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'try', 'while', 'with', 'yield',
    'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict',
    'set', 'tuple', 'bool', 'type', 'input', 'open', 'super',
    'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr',
    'delattr', 'callable', 'iter', 'next', 'enumerate', 'zip',
    'map', 'filter', 'sorted', 'reversed', 'abs', 'all', 'any',
    'bin', 'chr', 'ord', 'hex', 'oct', 'format', 'hash', 'id',
    'max', 'min', 'sum', 'pow', 'round', 'repr', 'vars', 'dir',
    'staticmethod', 'classmethod', 'property', 'object',
    'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'AttributeError', 'RuntimeError', 'StopIteration',
    '__init__', '__str__', '__repr__', '__name__', '__main__',
    '__class__', '__dict__', '__doc__', '__module__',
    'self', 'cls',
  ]);

  const varMap = new Map();
  const assignRegex = /^(\s*)([a-zA-Z_]\w*)\s*=/gm;
  let match;

  while ((match = assignRegex.exec(code)) !== null) {
    const varName = match[2];
    if (!reserved.has(varName) && !varMap.has(varName)) {
      varMap.set(varName, randomVarName('_'));
    }
  }

  const paramRegex = /def\s+\w+\s*\(([^)]*)\)/g;
  while ((match = paramRegex.exec(code)) !== null) {
    const params = match[1].split(',').map((p) => p.trim().split('=')[0].trim().split(':')[0].trim());
    for (const param of params) {
      if (param && !reserved.has(param) && param !== 'self' && param !== 'cls' && !varMap.has(param)) {
        varMap.set(param, randomVarName('_'));
      }
    }
  }

  let result = code;
  for (const [original, renamed] of varMap) {
    const regex = new RegExp(`\\b${original}\\b`, 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function renameFunctions(code) {
  const reserved = new Set([
    '__init__', '__str__', '__repr__', '__del__', '__new__',
    '__enter__', '__exit__', '__call__', '__len__', '__getitem__',
    '__setitem__', '__contains__', '__iter__', '__next__',
    '__eq__', '__lt__', '__gt__', '__hash__', '__bool__',
    'main',
  ]);

  const funcMap = new Map();
  const funcRegex = /def\s+([a-zA-Z_]\w*)\s*\(/g;
  let match;

  while ((match = funcRegex.exec(code)) !== null) {
    const funcName = match[1];
    if (!reserved.has(funcName) && !funcName.startsWith('__') && !funcMap.has(funcName)) {
      funcMap.set(funcName, randomVarName('_f'));
    }
  }

  let result = code;
  for (const [original, renamed] of funcMap) {
    const regex = new RegExp(`\\b${original}\\b`, 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function renameClasses(code) {
  const reserved = new Set(['Exception', 'object', 'type']);
  const classMap = new Map();
  const classRegex = /class\s+([a-zA-Z_]\w*)/g;
  let match;

  while ((match = classRegex.exec(code)) !== null) {
    const className = match[1];
    if (!reserved.has(className) && !classMap.has(className)) {
      classMap.set(className, randomVarName('_C'));
    }
  }

  let result = code;
  for (const [original, renamed] of classMap) {
    const regex = new RegExp(`\\b${original}\\b`, 'g');
    result = result.replace(regex, renamed);
  }

  return result;
}

function encodeStrings(code) {

  return code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);

    if (content.length < 3) return match;

    if (content.includes('import ')) return match;

    const encoded = Buffer.from(content, 'utf-8')
      .toString('hex')
      .match(/.{1,2}/g)
      .map((h) => `\\x${h}`)
      .join('');

    return `"${encoded}"`;
  });
}

function injectDeadCode(code) {
  const deadSnippets = [
    `${randomVarName('_d')} = [${Array.from({ length: 3 }, () => `"${b64encode(randomString(8))}"`).join(', ')}]`,
    `if False:\n    ${randomVarName('_x')} = __import__("base64").b64decode("${b64encode(randomString(15))}")`,
    `${randomVarName('_h')} = lambda x: "".join([chr(ord(c) ^ 42) for c in x])`,
    `try:\n    ${randomVarName('_p')} = eval("".join([chr(x) for x in [${Array.from({ length: 5 }, () => Math.floor(Math.random() * 26) + 97).join(', ')}]]))\nexcept:\n    pass`,
  ];

  const lines = code.split('\n');
  const result = [];

  for (const line of lines) {
    result.push(line);

    if (Math.random() > 0.65 && line.trim() && !line.trim().startsWith('@') && !line.trim().startsWith('#')) {

      const indent = line.match(/^(\s*)/)[1];
      const snippet = deadSnippets[Math.floor(Math.random() * deadSnippets.length)];
      const indentedSnippet = snippet.split('\n').map((l) => indent + l).join('\n');
      result.push(indentedSnippet);
    }
  }

  return result.join('\n');
}

function wrapInExec(code, depth = 1) {
  let pyCode = code;

  for (let i = 0; i < depth; i++) {
    const encoded = b64encode(pyCode);
    pyCode = `import base64;exec(base64.b64decode("${encoded}"))`;
  }

  return pyCode;
}

function cleanWhitespace(code) {
  return code
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, i, arr) => {

      if (line === '' && i > 0 && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n');
}

function obfuscateLight(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = cleanWhitespace(result);
  return result;
}

function obfuscateMedium(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = renameFunctions(result);
  result = renameClasses(result);
  result = encodeStrings(result);
  result = cleanWhitespace(result);
  return result;
}

function obfuscateHeavy(code) {
  let result = removeComments(code);
  result = renameVariables(result);
  result = renameFunctions(result);
  result = renameClasses(result);
  result = encodeStrings(result);
  result = injectDeadCode(result);
  result = cleanWhitespace(result);
  result = wrapInExec(result, 2);
  return result;
}

async function obfuscatePython(code, level = 'medium') {
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

module.exports = { obfuscatePython };
