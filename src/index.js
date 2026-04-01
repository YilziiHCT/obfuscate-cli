'use strict';

const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const boxen = require('boxen');
const ora = require('ora');

const {
  DIRS, getLanguage, getLanguageKey, getObfuscatedName,
  listSupportedFiles, listObfuscatedFiles,
  readFile, writeFile, ensureDir,
} = require('./utils/helpers');
const { printObfuscationSummary, printTestSummary, printEntropyChart } = require('./utils/summary');
const { generateReport } = require('./utils/reporter');

const { obfuscateJS } = require('./obfuscators/js');
const { obfuscatePHP } = require('./obfuscators/php');
const { obfuscateHTML, obfuscateCSS } = require('./obfuscators/html');
const { obfuscatePython } = require('./obfuscators/python');

const { runFunctionalityTest } = require('./tester/functional');
const { runSecurityTest } = require('./tester/security');
const { calculateEntropy, analyzeEntropy } = require('./tester/entropy');

function showBanner() {
  console.clear();
  const banner = figlet.textSync('ObfuscateCLI', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  const fireGradient = gradient(['#ff0000', '#ff4500', '#ff8c00', '#ffa500']);
  console.log(fireGradient(banner));

  console.log(
    boxen(
      chalk.gray('Multi-Language Code Obfuscation Tool\n') +
      chalk.gray('v1.0.0 • by ') + chalk.bold.white('YilziiHCT'),
      {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        margin: { top: 0, bottom: 1 },
        borderStyle: 'round',
        borderColor: 'gray',
        textAlignment: 'center',
      }
    )
  );
}

async function main() {
  showBanner();

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold('What would you like to do?'),
        choices: [
          { name: '🔒  Obfuscate file(s)', value: 'obfuscate' },
          { name: '🧪  Test obfuscated file(s)', value: 'test' },
          { name: '🔒🧪 Obfuscate + Test (full pipeline)', value: 'full' },
          { name: '📂  Show input/output directories', value: 'dirs' },
          new inquirer.Separator(),
          { name: '❌  Exit', value: 'exit' },
        ],
      },
    ]);

    switch (action) {
      case 'obfuscate':
        await handleObfuscate();
        break;
      case 'test':
        await handleTest();
        break;
      case 'full':
        await handleFullPipeline();
        break;
      case 'dirs':
        showDirectories();
        break;
      case 'exit':
        console.log(chalk.gray('\n👋 Goodbye!\n'));
        process.exit(0);
    }
  }
}

function showDirectories() {
  console.log();
  console.log(
    boxen(
      `${chalk.cyan.bold('📥 Input Directory:')}\n${chalk.white(DIRS.input)}\n\n` +
      `${chalk.cyan.bold('📤 Output Directory:')}\n${chalk.white(DIRS.output)}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: '📂 Directories',
        titleAlignment: 'center',
      }
    )
  );
  console.log();

  const inputFiles = listSupportedFiles(DIRS.input);
  if (inputFiles.length > 0) {
    console.log(chalk.cyan(`  Input files (${inputFiles.length}):`));
    inputFiles.forEach((f) => console.log(chalk.gray(`    • ${f}`)));
  } else {
    console.log(chalk.yellow('  ⚠ No supported files in input-files/ directory'));
  }

  const outputFiles = listObfuscatedFiles(DIRS.output);
  if (outputFiles.length > 0) {
    console.log(chalk.cyan(`\n  Output files (${outputFiles.length}):`));
    outputFiles.forEach((f) => console.log(chalk.gray(`    • ${f}`)));
  } else {
    console.log(chalk.gray('  No obfuscated files yet'));
  }

  console.log();
}

function getObfuscator(langKey) {
  const obfuscators = {
    js: obfuscateJS,
    php: obfuscatePHP,
    html: obfuscateHTML,
    css: obfuscateCSS,
    python: obfuscatePython,
  };
  return obfuscators[langKey] || null;
}

async function handleObfuscate() {
  ensureDir(DIRS.input);
  ensureDir(DIRS.output);

  const inputFiles = listSupportedFiles(DIRS.input);

  if (inputFiles.length === 0) {
    console.log(chalk.yellow('\n⚠ No supported files found in input-files/'));
    console.log(chalk.gray('  Place .js, .php, .html, .css, or .py files in the input-files/ directory.\n'));
    return [];
  }

  const choices = [];
  inputFiles.forEach((f) => {
    choices.push({
      name: `${f}  ${chalk.gray(`(${getLanguage(f)})`)}`,
      value: { file: f, source: 'input' },
    });
  });

  const { selectedFiles } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedFiles',
      message: chalk.bold('Select files to obfuscate:'),
      choices,
      validate: (input) => input.length > 0 ? true : 'Select at least one file',
    },
  ]);

  const { level } = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: chalk.bold('Select obfuscation level:'),
      choices: [
        {
          name: `${chalk.green('Light')}   ${chalk.gray('— rename variables, remove comments, minify')}`,
          value: 'light',
        },
        {
          name: `${chalk.yellow('Medium')}  ${chalk.gray('— encode strings, obfuscate names, control flow flattening')}`,
          value: 'medium',
        },
        {
          name: `${chalk.red('Heavy')}   ${chalk.gray('— full mutation, dead code, RC4 encryption, self-defending')}`,
          value: 'heavy',
        },
      ],
    },
  ]);

  console.log();
  const results = [];

  for (const { file, source } of selectedFiles) {
    const sourceDir = source === 'input' ? DIRS.input : DIRS.examples;
    const inputPath = path.join(sourceDir, file);
    const outputName = getObfuscatedName(file);
    const outputPath = path.join(DIRS.output, outputName);
    const langKey = getLanguageKey(file);
    const language = getLanguage(file);

    const spinner = ora({
      text: chalk.white(`Obfuscating ${chalk.cyan(file)} (${language}, ${level})...`),
      spinner: 'dots12',
      color: 'cyan',
    }).start();

    try {
      const originalCode = await readFile(inputPath);
      const obfuscator = getObfuscator(langKey);

      if (!obfuscator) {
        spinner.fail(chalk.red(`No obfuscator available for ${language}`));
        results.push({
          fileName: file,
          language,
          level,
          originalSize: Buffer.byteLength(originalCode),
          obfuscatedSize: 0,
          success: false,
        });
        continue;
      }

      const obfuscatedCode = await obfuscator(originalCode, level);
      await writeFile(outputPath, obfuscatedCode);

      const originalSize = Buffer.byteLength(originalCode);
      const obfuscatedSize = Buffer.byteLength(obfuscatedCode);

      spinner.succeed(chalk.green(`${file} → ${outputName}`));

      results.push({
        fileName: file,
        outputName,
        language,
        level,
        originalSize,
        obfuscatedSize,
        originalCode,
        obfuscatedCode,
        inputPath,
        outputPath,
        langKey,
        success: true,
      });
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${file} — ${err.message}`));
      results.push({
        fileName: file,
        language,
        level,
        originalSize: 0,
        obfuscatedSize: 0,
        success: false,
        error: err.message,
      });
    }
  }

  printObfuscationSummary(results);
  return results;
}

async function handleTest(preSelectedFiles = null) {
  ensureDir(DIRS.output);

  let filesToTest;

  if (preSelectedFiles && preSelectedFiles.length > 0) {
    filesToTest = preSelectedFiles;
  } else {
    const obfFiles = listObfuscatedFiles(DIRS.output);

    if (obfFiles.length === 0) {
      console.log(chalk.yellow('\n⚠ No obfuscated files found in obfuscated/ directory'));
      console.log(chalk.gray('  Run obfuscation first to generate files.\n'));
      return;
    }

    const choices = obfFiles.map((f) => ({
      name: `${f}  ${chalk.gray(`(${getLanguage(f) || 'Unknown'})`)}`,
      value: f,
    }));

    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: chalk.bold('Select files to test:'),
        choices,
        validate: (input) => input.length > 0 ? true : 'Select at least one file',
      },
    ]);

    filesToTest = selected.map((f) => {

      const originalName = f.replace('.obf', '');
      let inputPath = path.join(DIRS.input, originalName);
      if (!fs.existsSync(inputPath)) {
        inputPath = path.join(DIRS.examples, originalName);
      }

      return {
        fileName: f,
        outputName: f,
        outputPath: path.join(DIRS.output, f),
        inputPath: fs.existsSync(inputPath) ? inputPath : null,
        langKey: getLanguageKey(f),
        language: getLanguage(f) || 'Unknown',
      };
    });
  }

  console.log();

  for (const fileInfo of filesToTest) {
    const spinner = ora({
      text: chalk.white(`Testing ${chalk.cyan(fileInfo.outputName || fileInfo.fileName)}...`),
      spinner: 'dots12',
      color: 'yellow',
    }).start();

    try {
      const obfuscatedCode = await readFile(fileInfo.outputPath);
      let originalCode = '';

      if (fileInfo.originalCode) {
        originalCode = fileInfo.originalCode;
      } else if (fileInfo.inputPath && fs.existsSync(fileInfo.inputPath)) {
        originalCode = await readFile(fileInfo.inputPath);
      }

      spinner.text = chalk.white(`Testing functionality of ${chalk.cyan(fileInfo.outputName || fileInfo.fileName)}...`);
      let functionalityResult = { pass: true, detail: 'no original file for comparison' };

      if (fileInfo.inputPath && fs.existsSync(fileInfo.inputPath)) {
        functionalityResult = await runFunctionalityTest(fileInfo.inputPath, fileInfo.outputPath);
      }

      spinner.text = chalk.white(`Running security analysis on ${chalk.cyan(fileInfo.outputName || fileInfo.fileName)}...`);
      const securityResult = await runSecurityTest(originalCode, obfuscatedCode, fileInfo.langKey);

      spinner.text = chalk.white(`Analyzing entropy of ${chalk.cyan(fileInfo.outputName || fileInfo.fileName)}...`);
      const entropyResult = analyzeEntropy(originalCode, obfuscatedCode);

      spinner.succeed(chalk.green(`Tests complete for ${fileInfo.outputName || fileInfo.fileName}`));

      const report = {
        fileName: fileInfo.outputName || fileInfo.fileName,
        language: fileInfo.language,
        level: fileInfo.level || 'N/A',
        originalSize: Buffer.byteLength(originalCode || ''),
        obfuscatedSize: Buffer.byteLength(obfuscatedCode),
        entropyBefore: entropyResult.entropyBefore,
        entropyAfter: entropyResult.entropyAfter,
        functionalityPass: functionalityResult.pass,
        functionalityDetail: functionalityResult.detail,
        ...securityResult,
      };

      printTestSummary(report);
      printEntropyChart(entropyResult.entropyBefore, entropyResult.entropyAfter);

      const reportPath = await generateReport(report);
      console.log(chalk.gray(`  📄 Report saved: ${reportPath}\n`));
    } catch (err) {
      spinner.fail(chalk.red(`Test failed for ${fileInfo.outputName || fileInfo.fileName}: ${err.message}`));
    }
  }
}

async function handleFullPipeline() {
  console.log(
    boxen(
      chalk.cyan.bold('🔒🧪 Full Pipeline Mode\n') +
      chalk.gray('Obfuscate files and run all security tests automatically'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
      }
    )
  );

  const results = await handleObfuscate();

  if (!results || results.length === 0) return;

  const successResults = results.filter((r) => r.success);
  if (successResults.length === 0) {
    console.log(chalk.yellow('\n⚠ No files were successfully obfuscated. Skipping tests.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n━━━ Running Security Tests ━━━\n'));

  await handleTest(successResults);

  console.log(
    boxen(
      chalk.green.bold('✅ Full pipeline complete!\n') +
      chalk.gray(`Processed ${successResults.length} file(s)\n`) +
      chalk.gray(`Results saved in: ${DIRS.output}`),
      {
        padding: 1,
        margin: { top: 1 },
        borderStyle: 'round',
        borderColor: 'green',
        textAlignment: 'center',
      }
    )
  );
}

module.exports = { main };
