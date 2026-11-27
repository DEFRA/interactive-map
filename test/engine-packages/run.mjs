// Checks each engine package the way a consumer uses it: packs the package, installs the tarball
// into a fresh project, builds the fixture app with each bundler (and the UMD scripts), then opens
// it in Chromium under a nonce-based Content Security Policy with fingerprinted files.
//
// A check passes when the map reaches map:firstidle with no CSP violations, page errors, console
// errors or failed requests, unless the check expects otherwise.
//
// Usage: node test/engine-packages/run.mjs [--engine=maplibre] [--bundler=vite] [--skip-build] [--verbose]
// ENGINE_CHECKS_CSP replaces the policy (NONCE is replaced with the nonce), to see what a policy breaks.
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { bundlers } from './bundlers.mjs'
import { ENGINE_CHECKS, PROVIDER_NAMES } from './engines.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url)) // NOSONAR - Standard Node.js convention in scripts
const ROOT = path.resolve(__dirname, '../..')
const FIXTURE = path.join(__dirname, 'fixture')
const WORK = path.join(os.tmpdir(), 'interactive-map-engine-checks')
const MAP_TIMEOUT = 30000
const SETTLE_TIME = 1500

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, value = true] = arg.replace(/^--/, '').split('=')
  return [key, value]
}))

const run = (command, commandArgs, cwd) => execFileSync(command, commandArgs, { cwd, stdio: 'pipe', encoding: 'utf8' })

const contentHash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8)

const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true })

// === Packing and installing ===

const installPackage = (engine) => {
  const projectDir = path.join(WORK, engine.name, 'project')
  fs.rmSync(projectDir, { recursive: true, force: true })
  fs.mkdirSync(projectDir, { recursive: true })

  const packOutput = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', path.join(WORK, engine.name)], path.join(ROOT, 'packages', engine.name)))
  const tarball = path.join(WORK, engine.name, packOutput[0].filename)

  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: `check-${engine.name}`, private: true, type: 'module' }, null, 2))
  run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', tarball], projectDir)
  copyDir(FIXTURE, path.join(projectDir, 'src'))
  return projectDir
}

// The files npm shows on a package's page. Every package in packages/ is checked for them,
// including the ones without bundler checks, so that no published package goes without them
const REQUIRED_PACKAGE_FILES = ['README.md', 'LICENSE']

const missingPackageFiles = (name) => {
  const packOutput = JSON.parse(run('npm', ['pack', '--dry-run', '--json'], path.join(ROOT, 'packages', name)))
  const packed = new Set(packOutput[0].files.map(file => file.path))
  return REQUIRED_PACKAGE_FILES.filter(file => !packed.has(file))
}

// Lists the package's scripts that contain another engine's provider name
const findOtherEngines = (engine, packageDir) => {
  const otherNames = Object.entries(PROVIDER_NAMES).filter(([name]) => name !== engine.name).map(([, providerName]) => providerName)
  return fs.readdirSync(packageDir, { recursive: true })
    .filter(file => /\.m?js$/.test(file) && !file.split(path.sep).includes('node_modules'))
    .flatMap(file => {
      const content = fs.readFileSync(path.join(packageDir, file), 'utf8')
      return otherNames.filter(providerName => content.includes(providerName)).map(providerName => `${file} contains ${providerName}`)
    })
}

// === Pages ===

// The stylesheets a service links to
const CSS_FILES = { core: 'dist/css/index.css', datasets: 'plugins/datasets/dist/css/index.css', draw: 'plugins/draw/dist/css/index.css' }

const copyCss = (packageDir, outDir) => {
  fs.mkdirSync(path.join(outDir, 'css'), { recursive: true })
  return Object.entries(CSS_FILES).map(([name, file]) => {
    fs.copyFileSync(path.join(packageDir, file), path.join(outDir, 'css', `${name}.css`))
    return `css/${name}.css`
  })
}

// A check's view (centre, zoom, test area and provider options) replaces the engine's
const writePage = ({ outDir, packageDir, engine, check, scripts, mapProviderOptions = {} }) => {
  const stylesheets = copyCss(packageDir, outDir)
  fs.copyFileSync(path.join(FIXTURE, 'style.json'), path.join(outDir, 'style.json'))
  fs.copyFileSync(path.join(FIXTURE, 'page.css'), path.join(outDir, 'page.css'))
  const { center, zoom, testArea, mapProviderOptions: viewOptions } = { ...engine, ...check.view }
  const config = { mapStyle: engine.mapStyle, center, zoom, testArea, mapProviderOptions: { ...viewOptions, ...mapProviderOptions } }

  fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Engine package check</title>
  <link rel="stylesheet" href="page.css">
${stylesheets.map(href => `  <link rel="stylesheet" href="${href}">`).join('\n')}
</head>
<body>
  <div id="map"></div>
  <script type="application/json" id="engine-config">${JSON.stringify(config)}</script>
${scripts.map(({ src, module }) => `  <script nonce="__NONCE__" ${module ? 'type="module"' : 'defer'} src="${src}"></script>`).join('\n')}
</body>
</html>
`)
}

// Copies the UMD scripts as a service would, renaming each entry script with a content hash
const buildUMD = async ({ engine, check, packageDir, outDir }) => {
  const entries = [['core', 'dist/umd'], ['datasets', 'plugins/datasets/dist/umd'], ['draw', 'plugins/draw/dist/umd']]
  const scripts = entries.map(([name, dir]) => {
    const to = path.join(outDir, name)
    copyDir(path.join(packageDir, dir), to)
    const fingerprinted = `index.${contentHash(path.join(to, 'index.js'))}.js`
    fs.renameSync(path.join(to, 'index.js'), path.join(to, fingerprinted))
    return { src: `${name}/${fingerprinted}` }
  })

  const esbuild = await import('esbuild')
  await esbuild.build({
    entryPoints: [path.join(FIXTURE, 'umd-entry.js')],
    bundle: true,
    format: 'iife',
    outfile: path.join(outDir, 'app.js'),
    logLevel: 'silent'
  })
  scripts.push({ src: `app.${contentHash(path.join(outDir, 'app.js'))}.js` })
  fs.renameSync(path.join(outDir, 'app.js'), path.join(outDir, scripts.at(-1).src))

  writePage({ outDir, packageDir, engine, check, scripts })
}

// Copies a file into the build with a content hash in its name, as a service would, and returns its URL
const copyFingerprinted = (file, outDir) => {
  const name = `${path.basename(file, '.mjs')}.${contentHash(file)}.mjs`
  fs.copyFileSync(file, path.join(outDir, name))
  return `/${name}`
}

const buildWithBundler = async ({ engine, check, projectDir, packageDir, outDir }) => {
  fs.writeFileSync(path.join(projectDir, 'src/main.js'), engine.entry)
  const { scripts } = await bundlers[check.bundler]({ projectDir, entry: path.join(projectDir, 'src/main.js'), outDir })

  const mapProviderOptions = {
    ...(check.copyWorker && { workerUrl: copyFingerprinted(path.join(projectDir, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'), outDir) }),
    ...(check.copyBngScript && { crsWorkerUrl: copyFingerprinted(path.join(packageDir, 'dist/esm/bngTransform.mjs'), outDir) })
  }
  writePage({ outDir, packageDir, engine, check, scripts, mapProviderOptions })
}

// === Serving under a CSP ===

// A strict policy: scripts only with the page's nonce, everything else only from the service.
// The bundler builds add 'strict-dynamic', as files they load with import() can't carry a nonce.
const CSP = {
  'default-src': ["'none'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'worker-src': ["'self'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"],
  'form-action': ["'self'"]
}

const csp = (nonce, { strictDynamic }) => {
  if (process.env.ENGINE_CHECKS_CSP) {
    return process.env.ENGINE_CHECKS_CSP.replaceAll('NONCE', nonce)
  }
  const directives = { 'script-src': [`'nonce-${nonce}'`, ...(strictDynamic ? ["'strict-dynamic'"] : [])], ...CSP }
  return Object.entries(directives).map(([name, sources]) => [name, ...sources].join(' ')).join('; ')
}

const CONTENT_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'
}

// OpenLayers' basemap: raster tiles served here, so no request leaves the machine
const TILE = path.join(FIXTURE, 'tile.png')

const serve = (outDir, policy) => new Promise(resolve => {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = urlPath.startsWith('/tiles/') ? TILE : path.join(outDir, urlPath === '/' ? 'index.html' : urlPath) // NOSONAR - short path choice, clearer inline
    if (!(file === TILE || file.startsWith(outDir)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404) // NOSONAR - HTTP status code
      res.end()
      return
    }
    const type = CONTENT_TYPES[path.extname(file)] || 'application/octet-stream'
    if (type === 'text/html') {
      const nonce = crypto.randomBytes(16).toString('base64')
      res.writeHead(200, { 'Content-Type': type, 'Content-Security-Policy': csp(nonce, policy) }) // NOSONAR - HTTP status code
      res.end(fs.readFileSync(file, 'utf8').replaceAll('__NONCE__', nonce))
      return
    }
    res.writeHead(200, { 'Content-Type': type }) // NOSONAR - HTTP status code
    res.end(fs.readFileSync(file))
  })
  server.listen(0, '127.0.0.1', () => resolve(server))
})

// === Checking in the browser ===

const launchBrowser = async () => {
  const options = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
  try {
    return await chromium.launch(options)
  } catch {
    return chromium.launch({ ...options, channel: 'chrome' })
  }
}

const checkPage = async (browser, url) => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  const problems = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', message => { if (message.type() === 'error') problems.consoleErrors.push(message.text()) }) // NOSONAR - one-line event handler
  page.on('pageerror', error => problems.pageErrors.push(args.verbose ? error.stack : error.message))
  page.on('requestfailed', request => problems.failedRequests.push(`${request.url()} (${request.failure()?.errorText})`))
  page.on('response', response => { if (response.status() >= 400) problems.failedRequests.push(`${response.url()} (${response.status()})`) }) // NOSONAR - one-line event handler, 400 and above are HTTP errors
  await page.addInitScript(() => {
    window.engineChecks = { violations: [], mapReady: false, firstIdle: false }
    document.addEventListener('securitypolicyviolation', e => {
      window.engineChecks.violations.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'}${e.sourceFile ? ` from ${e.sourceFile.split('/').pop()}:${e.lineNumber}` : ''}`) // NOSONAR - builds one log message
    })
  })

  await page.goto(url)
  await page.waitForFunction(() => window.engineChecks.firstIdle, null, { timeout: MAP_TIMEOUT }).catch(() => {})
  await page.waitForTimeout(SETTLE_TIME)
  const { violations, mapReady, firstIdle } = await page.evaluate(() => window.engineChecks)
  await page.close()
  return { ...problems, violations, mapReady, firstIdle }
}

const evaluate = (check, result) => {
  const failures = []
  const expectsLoad = !check.expectConsoleError
  if (expectsLoad && !result.firstIdle) {
    failures.push(`map didn't reach map:firstidle (map:ready ${result.mapReady ? 'fired' : "didn't fire"})`)
  }
  const unexpectedErrors = result.consoleErrors.filter(text => !(check.expectConsoleError && text.includes(check.expectConsoleError)))
  if (check.expectConsoleError && unexpectedErrors.length === result.consoleErrors.length) {
    failures.push(`expected a console error containing "${check.expectConsoleError}"`)
  }
  const ignoredRequests = check.expectFailedRequest ? result.failedRequests.filter(url => url.includes(check.expectFailedRequest)) : []
  const lists = {
    'CSP violations': result.violations,
    'page errors': check.expectPageError ? [] : result.pageErrors,
    'console errors': check.expectConsoleError ? [] : unexpectedErrors,
    'failed requests': result.failedRequests.filter(url => !ignoredRequests.includes(url))
  }
  Object.entries(lists).forEach(([label, items]) => {
    if (items.length) {
      failures.push(`${label}:\n      ${[...new Set(items)].join('\n      ')}`)
    }
  })
  return failures
}

// === Main ===

const main = async () => { // NOSONAR - runs the checks in order, splitting it would hide the flow
  const engines = Object.values(ENGINE_CHECKS).filter(engine => !args.engine || engine.name === args.engine)
  if (!args['skip-build']) {
    console.log('Building the engine packages…')
    run('npm', ['run', 'build:engines'], ROOT)
  }

  const results = []
  const packageNames = fs.readdirSync(path.join(ROOT, 'packages'))
    .filter(name => fs.existsSync(path.join(ROOT, 'packages', name, 'package.json')))
    .filter(name => !args.engine || name === args.engine)
  for (const name of packageNames) {
    const missing = missingPackageFiles(name)
    const failures = missing.length ? [`missing from the packed package: ${missing.join(', ')}`] : []
    results.push({ name: `${name} package files`, failures })
    console.log(`  ${failures.length ? 'FAIL' : 'pass'}  ${name} package has ${REQUIRED_PACKAGE_FILES.join(' and ')}${failures.map(f => `\n    - ${f}`).join('')}`) // NOSONAR - builds one log line
  }

  const browser = await launchBrowser()
  try {
    for (const engine of engines) {
      console.log(`\n${engine.name}: installing the packed package…`)
      const projectDir = installPackage(engine)
      const packageDir = path.join(projectDir, 'node_modules', engine.packageName)

      const otherEngines = findOtherEngines(engine, packageDir)
      const packageFailures = otherEngines.length ? [`code for other engines:\n      ${otherEngines.join('\n      ')}`] : []
      results.push({ name: `${engine.name} package`, failures: packageFailures })
      console.log(`  ${packageFailures.length ? 'FAIL' : 'pass'}  ${engine.name} package has no other engines${packageFailures.map(failure => `\n    - ${failure}`).join('')}`) // NOSONAR - builds one log line

      const checks = engine.checks.filter(check => !args.bundler || check.bundler === args.bundler)
      for (const check of checks) {
        const name = `${engine.name} ${check.name}`
        const outDir = path.join(WORK, engine.name, 'out', check.name.replace(/\W+/g, '-'))
        fs.rmSync(outDir, { recursive: true, force: true })
        fs.mkdirSync(outDir, { recursive: true })

        let failures
        try { // NOSONAR - each check reports its own build or run failure
          if (check.bundler === 'umd') {
            await buildUMD({ engine, check, packageDir, outDir })
          } else {
            await buildWithBundler({ engine, check, projectDir, packageDir, outDir })
          }
          const server = await serve(outDir, { strictDynamic: check.bundler !== 'umd' })
          const result = await checkPage(browser, `http://127.0.0.1:${server.address().port}/`)
          server.close()
          failures = evaluate(check, result)
          if (args.verbose) {
            console.log(`    ${JSON.stringify({ ...result, consoleErrors: result.consoleErrors.map(text => text.slice(0, 120)) })}`) // NOSONAR - trims long console errors in the verbose log
          }
        } catch (error) {
          failures = [`build or check failed: ${error.message.split('\n')[0]}`]
        }
        results.push({ name, failures })
        console.log(`  ${failures.length ? 'FAIL' : 'pass'}  ${name}${failures.map(f => `\n    - ${f}`).join('')}`) // NOSONAR - builds one log line
      }
    }
  } finally {
    await browser.close()
  }

  const failed = results.filter(r => r.failures.length)
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed`)
  process.exitCode = failed.length ? 1 : 0
}

main() // NOSONAR - a rejection still exits the script with an error
