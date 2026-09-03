import * as React from 'npm:react@18.3.1'
import { ReengagementEmail } from '../email-templates/reengagement.tsx'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick } from '../i18n.ts'

interface Props {
  displayName?: string
  siteUrl?: string
  locale?: Locale | string
}

const Email = ({ displayName, siteUrl, locale }: Props) =>
  React.createElement(ReengagementEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
    locale,
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    pick(
      { fr: `${data?.displayName || 'Explorateur'}, la nature t'attend ! 🌿`, en: `${data?.displayName || 'Explorer'}, nature is waiting for you! 🌿` },
      data?.locale,
    ),
  displayName: 'Relance J+2',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr', locale: 'fr' },
} satisfies TemplateEntry
