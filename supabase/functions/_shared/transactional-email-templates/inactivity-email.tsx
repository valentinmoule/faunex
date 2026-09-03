import * as React from 'npm:react@18.3.1'
import { InactivityEmail } from '../email-templates/inactivity-email.tsx'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick } from '../i18n.ts'

interface Props {
  displayName?: string
  siteUrl?: string
  locale?: Locale | string
}

const Email = ({ displayName, siteUrl, locale }: Props) =>
  React.createElement(InactivityEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
    locale,
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    pick(
      { fr: `${data?.displayName || 'Explorateur'}, la nature t'attend 🌿`, en: `${data?.displayName || 'Explorer'}, nature is waiting for you 🌿` },
      data?.locale,
    ),
  displayName: 'Inactivité (J+14)',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr', locale: 'fr' },
} satisfies TemplateEntry
