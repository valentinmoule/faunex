import * as React from 'npm:react@18.3.1'
import { NoCaptureNudgeEmail } from '../email-templates/no-capture-j7.tsx'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick } from '../i18n.ts'

interface Props {
  displayName?: string
  siteUrl?: string
  locale?: Locale | string
}

const Email = ({ displayName, siteUrl, locale }: Props) =>
  React.createElement(NoCaptureNudgeEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
    locale,
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    pick(
      { fr: `${data?.displayName || 'Explorateur'}, ta première carte t'attend 🦊`, en: `${data?.displayName || 'Explorer'}, your first card is waiting 🦊` },
      data?.locale,
    ),
  displayName: 'Première capture (J+7)',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr', locale: 'fr' },
} satisfies TemplateEntry
