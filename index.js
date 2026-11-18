/**
 * dsh-product-mindset-prototype — 产品技能包 / product management skill pack.
 *
 * Skill-only, host-only plugin: it registers no model tools and no client
 * modules. Its whole surface is the Markdown skills under ./skills, discovered
 * from disk on every catalog read:
 *
 *   product-mindset         产品心法 v2.0.0 — methodology and document router
 *   quick-prototype         快速原型 v4.3.0 — single-file HTML prototypes and reports
 *   product-prototype-review                 原型与业务说明校验
 *   requirement-analysis                     五级需求拆解 → Excel
 *   axure-prd-docx                           Axure 原型 → DOCX 需求文档
 *   spec-driven-prototype                    规格驱动原型 v1.0.0 — 规格 → 不漂移的多页后台原型（字段与来源系统逐字一致）
 *
 * The plugin registers its own `ctx.skills` provider instead of mounting
 * `@deepseek-ai/dsh-skill-filesystem`, because a bundle installed from a local
 * directory is linked into the profile and cannot resolve `@deepseek-ai/*` from
 * its own location. Everything here uses Node built-ins only, so the same code
 * works for a linked directory, a GitHub install and an npm install.
 *
 * Rank 300 equals a filesystem `custom` skill root: the agent-preset provider
 * still wins for same-named skills in project and user roots.
 */

import { readdirSync, watch } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name. */
export const name = 'product-mindset-prototype'
/** Service the provider registers on. */
export const inject = ['skills']

/** Provider name on `ctx.skills`; must not collide with DSH's own `filesystem`. */
export const PROVIDER_NAME = 'product-mindset-prototype'

/** Origin bucket reported in the skill catalog. */
export const SOURCE = 'custom'

/** Precedence: same as a filesystem custom skill root, above the user roots. */
export const RANK = 300

/** The bundled skills directory: one subdirectory per skill, each with SKILL.md. */
export const SKILLS_DIR = fileURLToPath(new URL('./skills/', import.meta.url))

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Skill directories are discovered from disk on every catalog read, so adding a
 * skill is copying a folder with a SKILL.md into ./skills — no code change.
 * @returns {Promise<string[]>} sorted skill directory names.
 */
export async function discoverSkillDirectories() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort()
}

/**
 * Parse the YAML frontmatter the two shipped skills use: single-line `key: value`
 * scalars, optionally quoted. Returns the instruction body with the frontmatter
 * removed, matching what DSH's own filesystem provider hands to the model.
 * @param {string} raw file contents.
 * @param {string} path file path, used in diagnostics.
 */
export function parseSkill(raw, path) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)
  if (frontmatter === null) throw new Error(`${path}: SKILL.md must start with YAML frontmatter`)
  const yaml = frontmatter[1]
  const field = key => {
    const match = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(yaml)
    return match === null ? undefined : unquote(match[1].trim())
  }
  const flag = key => {
    const value = field(key)
    if (value === undefined || value === '') return undefined
    const normalized = value.toLowerCase()
    if (normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === '1') return true
    if (normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '0') return false
    throw new Error(`${path}: frontmatter field "${key}" must be a boolean`)
  }
  const skillName = field('name')
  const description = field('description')
  if (skillName === undefined || !SKILL_NAME.test(skillName)) {
    throw new Error(`${path}: frontmatter "name" must be kebab-case`)
  }
  if (description === undefined || description === '') {
    throw new Error(`${path}: frontmatter "description" is required`)
  }
  const whenToUse = field('whenToUse')
  return {
    name: skillName,
    description,
    ...(whenToUse === undefined || whenToUse === '' ? {} : { whenToUse }),
    invocation: {
      modelInvocable: flag('disable-model-invocation') !== true,
      userInvocable: flag('user-invocable') !== false,
    },
    content: raw.slice(frontmatter[0].length).trim(),
  }
}

function unquote(value) {
  const quoted = /^(['"])([\s\S]*)\1$/.exec(value)
  return quoted === null ? value : quoted[2].replace(/\\(["'\\])/g, '$1')
}

/**
 * Read and parse one shipped skill.
 * @param {string} directory skill directory name under ./skills.
 */
async function readSkill(directory, signal) {
  const path = join(SKILLS_DIR, directory, 'SKILL.md')
  const raw = await readFile(path, { encoding: 'utf8', signal })
  return { path, skill: parseSkill(raw, path) }
}

/** Build the directory `resourceBase` DSH uses to resolve relative links. */
function resourceBaseOf(directory) {
  return { kind: 'directory', path: join(SKILLS_DIR, directory).split(sep).join('/') }
}

/**
 * Register the bundled product skills on `ctx.skills`.
 * A skill file that cannot be read or parsed is reported once and leaves the
 * catalog observation incomplete, so the registry retries instead of caching it.
 */
export function apply(ctx) {
  const reported = new Map()
  /** Set once the registry registers this provider; re-calling it is safe. */
  let invalidate
  const warnOnce = (key, message) => {
    if (reported.get(key) === message) return
    reported.set(key, message)
    ctx.logger?.warn(`product-mindset-prototype: ${message}`)
  }
  const register = control => {
    invalidate = control.invalidate
    return {
      name: PROVIDER_NAME,
      async list(options) {
        const candidates = []
        let complete = true
        let directories
        try {
          directories = await discoverSkillDirectories()
        } catch (error) {
          warnOnce('skills-root', `cannot read ${SKILLS_DIR}: ${errorMessage(error)}`)
          return { candidates, complete: false }
        }
        for (const directory of directories) {
          try {
            const { path, skill } = await readSkill(directory, options.signal)
            reported.delete(directory)
            candidates.push({
              name: skill.name,
              description: skill.description,
              ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
              invocation: skill.invocation,
              provider: PROVIDER_NAME,
              source: SOURCE,
              rank: RANK,
              resourceBase: resourceBaseOf(directory),
              locator: { directory, path },
            })
          } catch (error) {
            if (options.signal?.aborted === true) throw error
            if (persistent(error)) {
              // A directory without SKILL.md is simply not a skill.
              reported.delete(directory)
              continue
            }
            complete = false
            warnOnce(directory, `${directory} is unavailable: ${errorMessage(error)}`)
          }
        }
        return complete ? candidates : { candidates, complete }
      },
      async get(candidate, options) {
        const directory = candidate.locator?.directory
        try {
          const { path, skill } = await readSkill(directory, options.signal)
          return {
            name: skill.name,
            description: skill.description,
            ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
            invocation: skill.invocation,
            provider: PROVIDER_NAME,
            source: SOURCE,
            resourceBase: resourceBaseOf(directory),
            path,
            content: skill.content,
          }
        } catch (error) {
          if (persistent(error)) return undefined
          throw error
        }
      },
    }
  }
  ctx.skills.registerProvider(register)
  watchSkillFiles(ctx, () => invalidate?.())
}

/**
 * Invalidate the skill catalog when a shipped `SKILL.md` changes, so editing the
 * frontmatter description takes effect without toggling the plugin. The skill
 * directory is watched rather than the file, because editors usually save by
 * writing a temporary file and renaming it over the original.
 * @param {object} ctx context carrying `effect` and the logger.
 * @param {() => void} invalidate registry invalidation for this provider.
 */
function watchSkillFiles(ctx, invalidate) {
  if (typeof ctx.effect !== 'function') return
  ctx.effect(() => {
    const watchers = []
    let timer
    const notify = () => {
      clearTimeout(timer)
      timer = setTimeout(invalidate, 150)
      timer.unref?.()
    }
    const open = (target, recursive) => {
      const watcher = watch(target, { persistent: false, recursive }, notify)
      watcher.on('error', () => {})
      watchers.push(watcher)
    }
    try {
      open(SKILLS_DIR, true)
    } catch {
      // Recursive watching is unavailable on this platform; watch the root and
      // each skill directory instead, accepting manual refreshes for new skills.
      try {
        open(SKILLS_DIR, false)
      } catch (error) {
        ctx.logger?.warn(`product-mindset-prototype: cannot watch ${SKILLS_DIR} (${errorMessage(error)})`)
      }
      for (const directory of discoverSync()) {
        try {
          open(join(SKILLS_DIR, directory), false)
        } catch {
          // A skill directory that vanished before the watcher opened needs none.
        }
      }
    }
    return () => {
      clearTimeout(timer)
      for (const watcher of watchers) {
        try {
          watcher.close()
        } catch {
          // A watcher that already closed itself needs no further teardown.
        }
      }
    }
  }, 'product-mindset-prototype skill files')
}

function discoverSync() {
  try {
    return readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => entry.name)
  } catch {
    return []
  }
}

function persistent(error) {
  const code = error instanceof Error && 'code' in error ? error.code : undefined
  return code === 'ENOENT' || code === 'ENOTDIR'
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
