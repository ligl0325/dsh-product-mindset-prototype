#!/usr/bin/env node
/**
 * Package self-check for dsh-plugin-product-skills.
 *
 * Verifies the bundle manifest, the patch row, display resources (locale files,
 * icon, optional detail document) and every shipped skill: frontmatter, unique
 * kebab-case names, and relative Markdown links that resolve inside the skill.
 *
 * Usage: node tools/validate.mjs
 * Exit code 0 means the package is ready to install or publish.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const notes = []

const fail = message => errors.push(message)
const rel = path => relative(ROOT, path).split(sep).join('/')

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`${rel(path)}: ${error.message}`)
    return undefined
  }
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    fail(`${rel(path)}: ${error.message}`)
    return undefined
  }
}

function insidePackage(path) {
  return !isAbsolute(relative(ROOT, normalize(path))) && !relative(ROOT, normalize(path)).startsWith('..')
}

// 1. Manifest -----------------------------------------------------------------
const manifestPath = join(ROOT, 'package.json')
const manifest = readJson(manifestPath)
if (manifest !== undefined) {
  if (typeof manifest.name !== 'string' || !/^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(manifest.name)) {
    fail('package.json: invalid "name"')
  }
  if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(manifest.version)) {
    fail('package.json: invalid "version"')
  }
  if (manifest.type !== 'module') fail('package.json: "type" must be "module"')
  const patch = manifest.dsh?.bundle?.patch
  if (typeof patch !== 'string') {
    fail('package.json: missing dsh.bundle.patch')
  } else if (!existsSync(join(ROOT, patch))) {
    fail(`package.json: dsh.bundle.patch "${patch}" does not exist`)
  }
  const exports = manifest.exports ?? {}
  if (exports['.'] === undefined) fail('package.json: exports["."] is required')
  if (exports['./icon'] === undefined) fail('package.json: exports["./icon"] is required')
  if (exports['./locale/*.json'] === undefined) fail('package.json: exports["./locale/*.json"] is required')

  // 2. Patch row ---------------------------------------------------------------
  if (typeof patch === 'string' && existsSync(join(ROOT, patch))) {
    const yaml = readText(join(ROOT, patch)) ?? ''
    if (!yaml.includes(`'${manifest.name}'`) && !yaml.includes(`"${manifest.name}"`)) {
      fail(`${patch}: no row naming "${manifest.name}"`)
    }
    if (!/^-?\s*insert:/m.test(yaml) && !/^\s*-\s+id:/m.test(yaml)) fail(`${patch}: no insert list or row id`)
  }

  // 3. files array -------------------------------------------------------------
  const covered = manifest.files ?? []
  for (const entry of covered) {
    const pattern = entry.replace(/\/\*.*$/, '')
    if (!existsSync(join(ROOT, pattern))) fail(`package.json files: "${entry}" does not exist`)
  }
  for (const required of ['index.js', 'cordis.patch.yml', 'skills', 'locale', 'icon.svg']) {
    if (!covered.some(entry => entry === required || entry.startsWith(`${required}/`))) {
      fail(`package.json files: missing "${required}"`)
    }
  }
}

// 4. Display resources --------------------------------------------------------
const localeDir = join(ROOT, 'locale')
const locales = existsSync(localeDir) ? readdirSync(localeDir).filter(name => name.endsWith('.json')) : []
if (locales.length === 0) fail('locale/: no locale JSON files')
for (const name of locales) {
  const data = readJson(join(localeDir, name))
  if (data === undefined) continue
  const meta = data.meta ?? {}
  if (typeof meta.title !== 'string' || meta.title.trim() === '') fail(`locale/${name}: meta.title is required`)
  if (typeof meta.description !== 'string' || meta.description.trim() === '') fail(`locale/${name}: meta.description is required`)
  if (/[<>]/.test(meta.description ?? '')) notes.push(`locale/${name}: meta.description contains angle brackets, which the detail page shows literally`)
  if (meta.detail === undefined) continue
  if (typeof meta.detail !== 'string' || !/\.(md|markdown)$/.test(meta.detail)) {
    fail(`locale/${name}: meta.detail must be a .md path`)
    continue
  }
  const docPath = join(ROOT, meta.detail)
  if (!insidePackage(docPath)) fail(`locale/${name}: meta.detail escapes the package`)
  if (!existsSync(docPath)) {
    fail(`locale/${name}: meta.detail "${meta.detail}" does not exist`)
    continue
  }
  const doc = readText(docPath) ?? ''
  const images = [...doc.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)]
  if (images.length !== 1) fail(`${meta.detail}: a detail document holds exactly one image line, found ${images.length}`)
  const headings = doc.split(/\r?\n/).filter(line => /^#{1,6}\s/.test(line))
  if (headings.length > 0) fail(`${meta.detail}: no headings; functionality belongs in meta.description`)
  for (const match of images) {
    const imagePath = join(dirname(docPath), match[1])
    if (!insidePackage(imagePath)) fail(`${meta.detail}: image escapes the package`)
    else if (!existsSync(imagePath)) fail(`${meta.detail}: image "${match[1]}" does not exist`)
  }
}

const iconPath = join(ROOT, 'icon.svg')
if (!existsSync(iconPath)) fail('icon.svg: missing')
else {
  const icon = readText(iconPath) ?? ''
  const bytes = statSync(iconPath).size
  if (bytes > 256 * 1024) fail(`icon.svg: ${bytes} bytes exceeds 256 KiB`)
  if (!icon.trimStart().startsWith('<svg')) fail('icon.svg: not an SVG document')
  if (!/viewBox="[^"]+"/.test(icon)) fail('icon.svg: viewBox is required')
  for (const tag of ['script', 'style', 'text', 'image', 'foreignObject', 'animate']) {
    if (new RegExp(`<${tag}[\\s>]`, 'i').test(icon)) fail(`icon.svg: <${tag}> is not allowed in an icon`)
  }
}

// 5. Skills -------------------------------------------------------------------
const skillsDir = join(ROOT, 'skills')
const seen = new Map()
if (!existsSync(skillsDir)) {
  fail('skills/: missing')
} else {
  for (const entry of readdirSync(skillsDir).sort()) {
    const skillDir = join(skillsDir, entry)
    if (!statSync(skillDir).isDirectory()) {
      fail(`skills/${entry}: not a skill directory`)
      continue
    }
    const skillFile = join(skillDir, 'SKILL.md')
    if (!existsSync(skillFile)) {
      fail(`skills/${entry}: SKILL.md is missing`)
      continue
    }
    const raw = readText(skillFile) ?? ''
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)
    if (frontmatter === null) {
      fail(`skills/${entry}/SKILL.md: frontmatter must start at the first byte`)
      continue
    }
    const field = key => {
      const match = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter[1])
      if (match === null) return undefined
      return match[1].trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim()
    }
    const skillName = field('name')
    const description = field('description')
    if (skillName === undefined || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)) {
      fail(`skills/${entry}/SKILL.md: "name" must be kebab-case`)
    }
    if (description === undefined || description === '') fail(`skills/${entry}/SKILL.md: "description" is required`)
    if (skillName !== undefined) {
      if (seen.has(skillName)) fail(`skills/${entry}/SKILL.md: name "${skillName}" is also used by skills/${seen.get(skillName)}`)
      else seen.set(skillName, entry)
      if (skillName !== entry) notes.push(`skills/${entry}: directory name differs from skill name "${skillName}"`)
    }
    const linked = [...raw.matchAll(/\[[^\]]*\]\(([^)\s]+\.md)\)/g)].map(match => match[1])
    for (const target of linked) {
      const resolved = join(skillDir, target)
      if (!insidePackage(resolved)) fail(`skills/${entry}/SKILL.md: link "${target}" escapes the package`)
      else if (!existsSync(resolved)) fail(`skills/${entry}/SKILL.md: link target "${target}" does not exist`)
    }
    const files = countFiles(skillDir)
    if (files === 0) fail(`skills/${entry}: no files`)
  }
  if (seen.size === 0) fail('skills/: no skill was recognised')
}

function countFiles(dir) {
  let total = 0
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    total += statSync(path).isDirectory() ? countFiles(path) : 1
  }
  return total
}

// Report ----------------------------------------------------------------------
for (const note of notes) console.log(`note: ${note}`)
if (errors.length > 0) {
  console.error('VALIDATION FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`VALIDATION OK: ${manifest?.name ?? '?'}@${manifest?.version ?? '?'}, skills=${[...seen.keys()].join(', ')}, locales=${locales.length}`)
