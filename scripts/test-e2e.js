#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const distPath = join(projectRoot, 'dist', 'chrome');

console.log('🔧 Preparing E2E tests...');

// Check if extension is built
if (!existsSync(distPath)) {
  console.log('📦 Building extension for E2E tests...');
  
  const buildProcess = spawn('pnpm', ['build:chrome'], {
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Extension built successfully');
      runE2ETests();
    } else {
      console.error('❌ Extension build failed');
      process.exit(1);
    }
  });
} else {
  console.log('✅ Extension already built');
  runE2ETests();
}

function runE2ETests() {
  console.log('🧪 Running E2E tests...');
  
  const testArgs = process.argv.slice(2);
  const playwrightProcess = spawn('npx', ['playwright', 'test', ...testArgs], {
    stdio: 'inherit',
    shell: true
  });
  
  playwrightProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ E2E tests completed successfully');
    } else {
      console.error('❌ E2E tests failed');
    }
    process.exit(code);
  });
}