import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { nativeEmailPayload } from '../../supabase/functions/_shared/native-push-policy'

const moderationPage = readFileSync(resolve(__dirname, '../../src/pages/ModerationPage.tsx'), 'utf8')
const notificationsPage = readFileSync(resolve(__dirname, '../../src/pages/NotificationsPage.tsx'), 'utf8')

describe('development stage rejection reason', () => {
  it('offers the dedicated reason to moderators', () => {
    expect(moderationPage).toContain("value: 'development_stage'")
    expect(moderationPage).toContain('Stade de développement non accepté (œuf, larve, cocon, chrysalide…)')
  })

  it('sends a dedicated push for the development stage reason', () => {
    const fr = nativeEmailPayload('capture-rejected', { reason: 'development_stage', animalName: 'Papillon' }, 'fr', 'tag')
    expect(fr?.body).toBe('Les œufs, larves, cocons et chrysalides ne sont pas acceptés. Photographie l’animal identifiable !')
    const en = nativeEmailPayload('capture-rejected', { reason: 'development_stage', animalName: 'Butterfly' }, 'en', 'tag')
    expect(en?.body).toBe('Eggs, larvae, cocoons and chrysalises are not accepted. Photograph the identifiable animal!')
  })

  it('maps the development stage notification marker to its in-app message', () => {
    expect(notificationsPage).toMatch(/development_stage[|]/)
  })

  it('emails the exact reason to notify-moderation-decision', () => {
    const fn = readFileSync(resolve(__dirname, '../../supabase/functions/notify-moderation-decision/index.ts'), 'utf8')
    expect(fn).toContain("'development_stage'")
  })
})
