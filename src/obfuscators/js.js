'use strict';

const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('terser');

async function obfuscateLight(code) {

  const minified = await minify(code, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      passes: 2,
    },
    mangle: {
      toplevel: true,
    },
    output: {
      comments: false,
    },
  });

  if (minified.error) throw minified.error;

  const result = JavaScriptObfuscator.obfuscate(minified.code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: true,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: false,
    stringArrayEncoding: [],
    stringArrayThreshold: 0,
    target: 'node',
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  });

  return result.getObfuscatedCode();
}

async function obfuscateMedium(code) {
  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: true,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    target: 'node',
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
  });

  return result.getObfuscatedCode();
}

async function obfuscateHeavy(code) {
  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    domainLock: [],
    domainLockRedirectUrl: 'about:blank',
    forceTransformStrings: [],
    identifierNamesGenerator: 'hexadecimal',
    identifiersPrefix: '',
    ignoreImports: false,
    inputFileName: '',
    log: false,
    numbersToExpressions: true,
    optionsPreset: 'default',
    renameGlobals: true,
    renameProperties: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 3,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1,
    target: 'node',
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
  });

  return result.getObfuscatedCode();
}

async function obfuscateJS(code, level = 'medium') {
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

module.exports = { obfuscateJS };
