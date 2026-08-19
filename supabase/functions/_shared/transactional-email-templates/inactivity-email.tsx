import * as React from 'npm:react@18.3.1'
import { InactivityEmail } from '../email-templates/inactivity-email.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  displayName?: string
  siteUrl?: string
}

const Email = ({ displayName, siteUrl }: Props) =>
  React.createElement(InactivityEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    `${data?.displayName || 'Explorateur'}, la nature t'attend 🌿`,
  displayName: 'Inactivité (J+14)',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr' },
} satisfies TemplateEntry
