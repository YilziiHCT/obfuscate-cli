'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Project root directory (two levels up from utils/)
 */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Directory paths
 */
const DIRS = {
  input: path.join(PROJECT_ROOT, 'input-files'),
  output: path.join(PROJECT_ROOT, 'obfuscated'),
  examples: path.join(PROJECT_ROOT, 'examples'),
};

/**
 * Supported file extensions mapped to language names
 */
const LANGUAGE_MAP = {
  '.js': 'JavaScript',
  '.php': 'PHP',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.py': 'Python',
};

/**
 * Get the language name from a file extension
 */
function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || null;
}

/**
 * Get the language key (for obfuscator dispatch) from file extension
 */
function getLanguageKey(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const keyMap = {
    '.js': 'js',
    '.php': 'php',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.py': 'python',
  };
  return keyMap[ext] || null;
}

/**
 * List files in a directory filtered by supported extensions
 */
function listSupportedFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return [];
    }
    const files = fs.readdirSync(dirPath);
    return files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return LANGUAGE_MAP.hasOwnProperty(ext);
    });
  } catch (err) {
    console.error(chalk.red(`Error reading directory: ${err.message}`));
    return [];
  }
}

/**
 * List all files in obfuscated directory
 */
function listObfuscatedFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return [];
    }
    const files = fs.readdirSync(dirPath);
    return files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return LANGUAGE_MAP.hasOwnProperty(ext) && !f.startsWith('report-');
    });
  } catch (err) {
    console.error(chalk.red(`Error reading directory: ${err.message}`));
    return [];
  }
}

/**
 * Generate obfuscated file name: name.obf.ext
 */
function getObfuscatedName(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  return `${base}.obf${ext}`;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Calculate percentage change between two values
 */
function percentChange(original, obfuscated) {
  if (original === 0) return 0;
  return ((obfuscated - original) / original) * 100;
}

/**
 * Ensure a directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read file content as UTF-8 string
 */
async function readFile(filePath) {
  return fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Write content to a file
 */
async function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  return fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RC4 encryption/decryption
 */
function rc4(key, data) {
  const s = [];
  let j = 0;
  let result = '';

  for (let i = 0; i < 256; i++) s[i] = i;

  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }

  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    result += String.fromCharCode(data.charCodeAt(k) ^ s[(s[i] + s[j]) % 256]);
  }

  return result;
}

/**
 * Generate a random string of given length
 */
function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random variable name starting with underscore
 */
function randomVarName(prefix = '_') {
  return prefix + randomString(6) + Math.floor(Math.random() * 9999);
}

/**
 * Base64 encode
 */
function b64encode(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * Base64 decode
 */
function b64decode(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Hex encode a string
 */
function hexEncode(str) {
  return Buffer.from(str, 'utf-8').toString('hex');
}

module.exports = {
  PROJECT_ROOT,
  DIRS,
  LANGUAGE_MAP,
  getLanguage,
  getLanguageKey,
  listSupportedFiles,
  listObfuscatedFiles,
  getObfuscatedName,
  formatBytes,
  percentChange,
  ensureDir,
  readFile,
  writeFile,
  sleep,
  rc4,
  randomString,
  randomVarName,
  b64encode,
  b64decode,
  hexEncode,
};
