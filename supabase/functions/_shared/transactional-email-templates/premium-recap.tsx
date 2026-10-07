import * as React from 'npm:react@18.3.1'
import { PremiumRecapEmail } from '../email-templates/premium-recap.tsx'
import type { TemplateEntry } from './registry.ts'
import { pick } from '../i18n.ts'

interface Props {
  displayName?: string
  siteUrl?: string
  captures?: number
  species?: number
  xp?: number
  renewalDate?: string
  locale?: string
}

const Email = (p: Props) =>
  React.createElement(PremiumRecapEmail, {
    displayName: p.displayName || 'Explorateur',
    siteUrl: p.siteUrl || 'https://faunex.fr',
    captures: p.captures ?? 0,
    species: p.species ?? 0,
    xp: p.xp ?? 0,
    renewalDate: p.renewalDate || '',
    locale: p.locale,
  })

export const template = {
  component: Email,
  subject: (d: Props) =>
    pick({ fr: 'Ton mois Premium en chiffres — renouvellement bientôt', en: 'Your Premium month in numbers — renewal soon' }, d?.locale),
  displayName: 'Récap Premium avant renouvellement',
  previewData: { displayName: 'Valentin', captures: 12, species: 9, xp: 640, renewalDate: '10 octobre 2026', locale: 'fr' },
} satisfies TemplateEntry
