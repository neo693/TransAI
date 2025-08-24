import { execSync } from 'child_process'
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// Get target browser from command line args or default to chrome
const targetBrowser = process.argv[2] || 'chrome'
const supportedBrowsers = ['chrome', 'edge']

if (!supportedBrowsers.includes(targetBrowser)) {
  console.error(`Unsupported browser: ${targetBrowser}. Supported browsers: ${supportedBrowsers.join(', ')}`)
  process.exit(1)
}

console.log(`Building extension for ${targetBrowser}...`)

try {
  // Run TypeScript compilation and Vite build
  console.log('Building extension...')
  execSync('tsc && vite build', { cwd: projectRoot, stdio: 'inherit' })

  // Copy browser-specific manifest
  console.log(`Copying ${targetBrowser} manifest...`)
  const manifestPath = resolve(projectRoot, `src/manifests/${targetBrowser}.json`)
  const fallbackManifest = resolve(projectRoot, 'src/manifest.json')
  
  if (existsSync(manifestPath)) {
    copyFileSync(manifestPath, resolve(projectRoot, 'dist/manifest.json'))
  } else {
    console.warn(`Browser-specific manifest not found for ${targetBrowser}, using default`)
    copyFileSync(fallbackManifest, resolve(projectRoot, 'dist/manifest.json'))
  }

  // Copy public assets if they exist
  try {
    execSync('cp -r public/* dist/', { cwd: projectRoot })
  } catch (e) {
    // Public directory might not exist or be empty
  }

  // Move HTML files to correct locations
  console.log('Organizing build output...')
  
  // Create directories
  mkdirSync(resolve(projectRoot, 'dist/popup'), { recursive: true })
  mkdirSync(resolve(projectRoot, 'dist/options'), { recursive: true })

  // Move HTML files
  try {
    execSync('mv dist/src/popup/index.html dist/popup/', { cwd: projectRoot })
    execSync('mv dist/src/options/index.html dist/options/', { cwd: projectRoot })
    
    // Clean up src directory in dist
    rmSync(resolve(projectRoot, 'dist/src'), { recursive: true, force: true })
  } catch (e) {
    console.warn('Could not move HTML files:', e.message)
  }

  console.log(`Build completed successfully for ${targetBrowser}!`)
  console.log(`Output directory: dist/`)
  console.log(`To build for other browsers, use: pnpm build <browser>`)
  console.log(`Supported browsers: ${supportedBrowsers.join(', ')}`)
} catch (error) {
  console.error('Build failed:', error.message)
  process.exit(1)
}