'use strict';

/**
 * Shannon Entropy Calculator
 * Measures the randomness/information density of data
 */

/**
 * Calculate Shannon entropy of a string (bits per byte)
 * @param {string} data - Input string
 * @returns {number} - Entropy value (0–8 bits/byte)
 */
function calculateEntropy(data) {
  if (!data || data.length === 0) return 0;

  const freq = new Map();
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    freq.set(byte, (freq.get(byte) || 0) + 1);
  }

  const len = data.length;
  let entropy = 0;

  for (const [, count] of freq) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Classify entropy level
 * @param {number} entropy - Shannon entropy value
 * @returns {string} - Classification label
 */
function classifyEntropy(entropy) {
  if (entropy >= 7.0) return 'VERY HIGH';
  if (entropy >= 6.0) return 'HIGH';
  if (entropy >= 4.5) return 'MEDIUM';
  if (entropy >= 3.0) return 'LOW';
  return 'VERY LOW';
}

/**
 * Generate ASCII entropy bar
 * @param {number} entropy - Shannon entropy value (0–8)
 * @param {number} width - Bar width in characters
 * @returns {string} - ASCII bar representation
 */
function entropyBar(entropy, width = 40) {
  const filled = Math.round((entropy / 8) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Perform full entropy analysis comparing original and obfuscated content
 * @param {string} original - Original source code
 * @param {string} obfuscated - Obfuscated source code
 * @returns {Object} - Entropy analysis results
 */
function analyzeEntropy(original, obfuscated) {
  const entropyBefore = calculateEntropy(original);
  const entropyAfter = calculateEntropy(obfuscated);
  const diff = entropyAfter - entropyBefore;

  return {
    entropyBefore,
    entropyAfter,
    entropyDiff: diff,
    labelBefore: classifyEntropy(entropyBefore),
    labelAfter: classifyEntropy(entropyAfter),
    barBefore: entropyBar(entropyBefore),
    barAfter: entropyBar(entropyAfter),
    improved: diff > 0,
  };
}

module.exports = {
  calculateEntropy,
  classifyEntropy,
  entropyBar,
  analyzeEntropy,
};
