import { execSync } from 'child_process'
import { copyFileSync, mkdirSync, watchFile } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// Initial build
console.log('Starting development build...')
try {
  execSync('node scripts/build.js', { cwd: projectRoot, stdio: 'inherit' })
} catch (error) {
  console.error('Initial build failed:', error.message)
  process.exit(1)
}

console.log('Development build complete!')
console.log('To load the extension:')
console.log('1. Open Chrome/Edge and go to chrome://extensions/')
console.log('2. Enable "Developer mode"')
console.log('3. Click "Load unpacked" and select the "dist" folder')
console.log('')
console.log('The extension will be rebuilt when you run "pnpm build"')
console.log('After rebuilding, click the refresh button in chrome://extensions/')
console.log('')
console.log('Press Ctrl+C to stop watching...')

// Keep the process alive
process.stdin.resume()