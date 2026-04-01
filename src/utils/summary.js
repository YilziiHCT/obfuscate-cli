'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const boxen = require('boxen');
const { formatBytes, percentChange } = require('./helpers');

/**
 * Print obfuscation summary table
 * @param {Array<Object>} results - Array of obfuscation result objects
 */
function printObfuscationSummary(results) {
  console.log();

  const table = new Table({
    head: [
      chalk.cyan.bold('File'),
      chalk.cyan.bold('Language'),
      chalk.cyan.bold('Level'),
      chalk.cyan.bold('Original'),
      chalk.cyan.bold('Obfuscated'),
      chalk.cyan.bold('Change'),
      chalk.cyan.bold('Status'),
    ],
    style: {
      head: [],
      border: ['gray'],
    },
    colWidths: [22, 14, 10, 12, 12, 12, 10],
  });

  for (const r of results) {
    const change = percentChange(r.originalSize, r.obfuscatedSize);
    const changeStr = change >= 0
      ? chalk.yellow(`+${change.toFixed(0)}%`)
      : chalk.green(`${change.toFixed(0)}%`);

    table.push([
      chalk.white(r.fileName),
      chalk.magenta(r.language),
      chalk.blue(r.level),
      formatBytes(r.originalSize),
      formatBytes(r.obfuscatedSize),
      changeStr,
      r.success ? chalk.green('✅ OK') : chalk.red('❌ FAIL'),
    ]);
  }

  console.log(table.toString());

  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;

  const summaryText = [
    `${chalk.bold('Total files:')} ${total}`,
    `${chalk.green.bold('Succeeded:')} ${passed}`,
    failed > 0 ? `${chalk.red.bold('Failed:')} ${failed}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  console.log(
    boxen(summaryText, {
      padding: 1,
      margin: { top: 1 },
      borderStyle: 'round',
      borderColor: passed === total ? 'green' : 'yellow',
      title: '📊 Summary',
      titleAlignment: 'center',
    })
  );
}

/**
 * Print security test summary
 * @param {Object} report - Full test report object
 */
function printTestSummary(report) {
  console.log();

  const table = new Table({
    style: { border: ['gray'] },
    colWidths: [22, 48],
  });

  table.push(
    [{ colSpan: 2, content: chalk.cyan.bold(`  OBFUSCATION REPORT — ${report.fileName}`), hAlign: 'center' }],
    [chalk.gray('Language'), chalk.white(report.language)],
    [chalk.gray('Level'), chalk.blue(report.level || 'N/A')],
    [chalk.gray('Original Size'), formatBytes(report.originalSize)],
    [chalk.gray('Obfuscated Size'), formatBytes(report.obfuscatedSize)],
    [chalk.gray('Size Change'), formatSizeChange(report.originalSize, report.obfuscatedSize)],
    [chalk.gray('Entropy Before'), `${report.entropyBefore.toFixed(2)} bits/byte`],
    [chalk.gray('Entropy After'), formatEntropy(report.entropyAfter)],
    [{ colSpan: 2, content: chalk.gray('─'.repeat(68)) }],
    [chalk.gray('Functionality'), formatPassFail(report.functionalityPass, report.functionalityDetail)],
    [chalk.gray('Decodability'), formatDecodability(report.decodabilityScore, report.decodabilityLabel)],
    [chalk.gray('String Leakage'), formatLeakage(report.stringLeakage, 'strings')],
    [chalk.gray('Var Name Leakage'), formatLeakage(report.varLeakage, 'variables')],
    [chalk.gray('Reverse Risk'), formatReverseRisk(report.reverseRisk)]
  );

  console.log(table.toString());
}

/**
 * Format size change display
 */
function formatSizeChange(original, obfuscated) {
  const change = percentChange(original, obfuscated);
  const prefix = change >= 0 ? '+' : '';
  const note = change > 100 ? ' (dead code injected)' : change < -30 ? ' (minified)' : '';
  return chalk.yellow(`${prefix}${change.toFixed(0)}%${note}`);
}

/**
 * Format entropy with ASCII bar chart
 */
function formatEntropy(entropy) {
  const maxBars = 14;
  const filled = Math.round((entropy / 8) * maxBars);
  const empty = maxBars - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  let label, color;
  if (entropy >= 6.5) {
    label = 'HIGH';
    color = chalk.red;
  } else if (entropy >= 4.5) {
    label = 'MEDIUM';
    color = chalk.yellow;
  } else {
    label = 'LOW';
    color = chalk.green;
  }

  return `${entropy.toFixed(2)} bits/byte ${color(bar)} ${color.bold(label)}`;
}

/**
 * Format pass/fail status
 */
function formatPassFail(pass, detail) {
  if (pass) {
    return chalk.green(`✅ PASS — ${detail || 'output identical'}`);
  }
  return chalk.red(`❌ FAIL — ${detail || 'error detected'}`);
}

/**
 * Format decodability score
 */
function formatDecodability(score, label) {
  const colors = {
    WEAK: chalk.red,
    MODERATE: chalk.yellow,
    STRONG: chalk.green,
    UNBREAKABLE: chalk.cyan,
  };
  const colorFn = colors[label] || chalk.white;
  return colorFn(`🔒 ${label} (score: ${score}/100)`);
}

/**
 * Format leakage detection
 */
function formatLeakage(hasLeakage, type) {
  if (!hasLeakage) {
    return chalk.green(`✅ No original ${type} found`);
  }
  return chalk.red(`⚠️  Some original ${type} still visible`);
}

/**
 * Format reverse engineering risk
 */
function formatReverseRisk(risk) {
  const levels = {
    LOW: chalk.green('🟢 LOW — well protected'),
    MODERATE: chalk.yellow('🟡 MODERATE — partially detectable'),
    HIGH: chalk.red('🔴 HIGH — easily reversible'),
  };
  return levels[risk] || chalk.gray('N/A');
}

/**
 * Print entropy comparison chart in terminal
 */
function printEntropyChart(entropyBefore, entropyAfter) {
  console.log();
  console.log(chalk.cyan.bold('  📊 Entropy Analysis'));
  console.log();

  const width = 40;

  const beforeFilled = Math.round((entropyBefore / 8) * width);
  const beforeBar = chalk.blue('█'.repeat(beforeFilled)) + chalk.gray('░'.repeat(width - beforeFilled));
  console.log(`  Before: ${beforeBar} ${entropyBefore.toFixed(2)}`);

  const afterFilled = Math.round((entropyAfter / 8) * width);
  const afterBar = chalk.red('█'.repeat(afterFilled)) + chalk.gray('░'.repeat(width - afterFilled));
  console.log(`  After:  ${afterBar} ${entropyAfter.toFixed(2)}`);

  console.log();
  const diff = entropyAfter - entropyBefore;
  const direction = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
  console.log(`  Change: ${direction} ${Math.abs(diff).toFixed(2)} bits/byte`);
  console.log();
}

module.exports = {
  printObfuscationSummary,
  printTestSummary,
  printEntropyChart,
  formatEntropy,
};
