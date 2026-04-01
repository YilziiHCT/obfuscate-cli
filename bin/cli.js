#!/usr/bin/env node

/**
 * ObfuscateCLI — Entry Point
 * Multi-language code obfuscation tool with security testing
 */

'use strict';

const { main } = require('../src/index');

process.on('unhandledRejection', (err) => {
  console.error('\n❌ Fatal error:', err.message || err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught exception:', err.message || err);
  process.exit(1);
});

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  process.exit(1);
});
