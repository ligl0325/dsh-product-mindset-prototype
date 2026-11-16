#!/usr/bin/env node
/**
 * Contract smoke test for dsh-product-mindset-prototype.
 *
 * Runs `apply()` against a stub `ctx.skills` registry and checks that both
 * shipped skills are listed and loadable with the shape DSH's skill registry
 * validates: kebab-case name, non-empty description, boolean invocation policy,
 * numeric rank, matching provider name, a directory resourceBase, and a body
 * without frontmatter.
 *
 * Usage: node tools/smoke.mjs
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { apply, PROVIDER_NAME, RANK, SKILLS_DIR, parseSkill } from '../index.js'

let factory
const warnings = []
apply({
  skills: {
    registerProvider(create) {
      factory = create
    },
  },
  logger: { warn: message => warnings.push(message) },
})

assert.equal(typeof factory, 'function', 'apply() must register a skill provider')
const provider = factory({ signal: new AbortController().signal, invalidate() {} })
assert.equal(provider.name, PROVIDER_NAME)

const observation = await provider.list({})
const candidates = Array.isArray(observation) ? observation : observation.candidates
assert.equal(Array.isArray(observation) ? true : observation.complete, true, 'discovery must be complete')
assert.equal(candidates.length, 2, `expected two skills, got ${candidates.length}`)

const names = candidates.map(candidate => candidate.name).sort()
assert.deepEqual(names, ['product-mindset', 'quick-prototype'])

for (const candidate of candidates) {
  assert.match(candidate.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert.equal(candidate.provider, PROVIDER_NAME)
  assert.equal(candidate.rank, RANK)
  assert.equal(candidate.source, 'custom')
  assert.equal(typeof candidate.description, 'string')
  assert.ok(candidate.description.length > 0)
  assert.equal(typeof candidate.invocation.modelInvocable, 'boolean')
  assert.equal(typeof candidate.invocation.userInvocable, 'boolean')
  assert.equal(candidate.resourceBase.kind, 'directory')
  assert.ok(candidate.resourceBase.path.startsWith(SKILLS_DIR.replaceAll('\\', '/')), candidate.resourceBase.path)

  const definition = await provider.get(candidate, {})
  assert.ok(definition !== undefined, `${candidate.name} must load`)
  assert.equal(definition.name, candidate.name)
  assert.equal(definition.provider, PROVIDER_NAME)
  assert.ok(definition.content.length > 1000, `${candidate.name} body looks empty`)
  assert.ok(!definition.content.startsWith('---'), `${candidate.name} body must not keep its frontmatter`)
  assert.match(definition.resourceBase.path, new RegExp(`${candidate.name}$`))

  const base = definition.resourceBase.path
  for (const [, target] of definition.content.matchAll(/\[[^\]]*\]\(([^)\s]+\.md)\)/g)) {
    assert.ok(existsSync(join(base, target)), `${candidate.name}: relative link "${target}" has no file under the resource base`)
  }
}

const version = candidates.find(candidate => candidate.name === 'quick-prototype')
assert.match(version.description, /报告/, 'the shipped quick-prototype must be v4.3.0 (report mode)')

assert.deepEqual(warnings, [], `unexpected warnings: ${warnings.join('; ')}`)

const parsed = parseSkill('---\nname: demo-skill\ndescription: "Quoted: value"\n---\n\nBody\n', 'fixture')
assert.equal(parsed.name, 'demo-skill')
assert.equal(parsed.description, 'Quoted: value')
assert.equal(parsed.content, 'Body')
assert.equal(parsed.invocation.modelInvocable, true)
assert.throws(() => parseSkill('no frontmatter', 'fixture'), /frontmatter/)
assert.throws(() => parseSkill('---\nname: Bad_Name\ndescription: x\n---\n', 'fixture'), /kebab-case/)

console.log(`SMOKE OK: provider=${PROVIDER_NAME} rank=${RANK} skills=${names.join(', ')}`)
