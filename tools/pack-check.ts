import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

import { $ } from 'bun'

type PackageJson = {
  name: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const workspaceRoot = path.resolve(import.meta.dir, '..')
const libraryRoot = path.join(workspaceRoot, 'libs', 'nextjs-router-events')
const libraryPackageJson = (await Bun.file(path.join(libraryRoot, 'package.json')).json()) as PackageJson
const examplePackageJson = (await Bun.file(
  path.join(workspaceRoot, 'apps', 'example', 'package.json')
).json()) as PackageJson
const rootPackageJson = (await Bun.file(path.join(workspaceRoot, 'package.json')).json()) as PackageJson
const packageName = libraryPackageJson.name
const tempRoot = path.join(workspaceRoot, '.tmp', 'pack-check')
const unpackRoot = path.join(tempRoot, 'unpacked')
const packageRoot = path.join(unpackRoot, 'package')
const consumerRoot = path.join(tempRoot, 'consumer')

const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/index.js',
  'dist/index.d.ts',
]

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message)
}

const getRequiredDependency = (packageJson: PackageJson, name: string) => {
  const version = packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
  assert(version, `Expected ${name} to be present in ${packageJson.name}`)
  return version
}

const getRelativeSpecifiers = (content: string) => {
  const patterns = [
    /from\s+['"](\.\.?\/[^'"]+)['"]/g,
    /import\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g,
    /import\s+['"](\.\.?\/[^'"]+)['"]/g,
  ]

  return patterns.flatMap((pattern) =>
    Array.from(content.matchAll(pattern), (match) => match[1] ?? '')
  )
}

const hasExtensionlessRelativeImport = (content: string) =>
  getRelativeSpecifiers(content).some((specifier) => path.extname(specifier) === '')

const assertPatchedSpecifiers = (directory: string) => {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      assertPatchedSpecifiers(fullPath)
      continue
    }

    if (!fullPath.endsWith('.js') && !fullPath.endsWith('.d.ts')) continue

    const content = readFileSync(fullPath, 'utf8')
    assert(
      !hasExtensionlessRelativeImport(content),
      `Packed artifact still contains an extensionless relative import in ${fullPath}`
    )
  }
}

rmSync(tempRoot, { recursive: true, force: true })
mkdirSync(tempRoot, { recursive: true })

const tarballOutput = (
  await $`bun pm pack --quiet --destination ${tempRoot}`.cwd(libraryRoot).text()
).trim()
const tarballPath = path.isAbsolute(tarballOutput)
  ? tarballOutput
  : path.join(tempRoot, tarballOutput)

assert(existsSync(tarballPath), `Expected tarball to exist at ${tarballPath}`)

mkdirSync(unpackRoot, { recursive: true })
await $`tar -xzf ${tarballPath} -C ${unpackRoot}`.cwd(workspaceRoot)

for (const relativePath of requiredFiles) {
  assert(
    existsSync(path.join(packageRoot, relativePath)),
    `Packed artifact is missing ${relativePath}`
  )
}

mkdirSync(consumerRoot, { recursive: true })

await Bun.write(
  path.join(consumerRoot, 'package.json'),
  `${JSON.stringify(
    {
      name: 'pack-check-consumer',
      private: true,
      type: 'module',
      dependencies: {
        [packageName]: tarballPath,
        next: getRequiredDependency(examplePackageJson, 'next'),
        react: getRequiredDependency(examplePackageJson, 'react'),
        'react-dom': getRequiredDependency(examplePackageJson, 'react-dom'),
      },
      devDependencies: {
        typescript: getRequiredDependency(rootPackageJson, 'typescript'),
      },
    },
    null,
    2
  )}\n`
)

await $`bun install --no-save --no-summary`.cwd(consumerRoot)

await Bun.write(
  path.join(consumerRoot, 'consumer.ts'),
  `import {
  RouteChangesProvider,
  useRouteChangeEvents,
  useRouter,
  type HistoryURL,
  type RouteChangeCallbacks,
  type RouteChangeDetail,
  type RouteChangeEndDetail,
  type RouteChangeSource,
} from '${packageName}'

const callbacks: RouteChangeCallbacks = {
  onBeforeRouteChange(target, detail) {
    const nextDetail: RouteChangeDetail = detail
    const source: RouteChangeSource = detail.source
    return Boolean(target) && Boolean(nextDetail.requestId) && Boolean(source)
  },
  onRouteChangeComplete(target, detail) {
    const href: HistoryURL = target
    const endDetail: RouteChangeEndDetail = detail
    return Boolean(href) && Boolean(endDetail.requestId) && Boolean(endDetail.source)
  },
}

void RouteChangesProvider
void useRouteChangeEvents
void useRouter
void callbacks
`
)

assertPatchedSpecifiers(path.join(packageRoot, 'dist'))

await $`bun x tsc --ignoreConfig --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --lib DOM,ES2022 --skipLibCheck consumer.ts`.cwd(
  consumerRoot
)
