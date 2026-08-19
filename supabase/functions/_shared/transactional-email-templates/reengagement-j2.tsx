import * as React from 'npm:react@18.3.1'
import { ReengagementEmail } from '../email-templates/reengagement.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  displayName?: string
  siteUrl?: string
}

const Email = ({ displayName, siteUrl }: Props) =>
  React.createElement(ReengagementEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    `${data?.displayName || 'Explorateur'}, la nature t'attend ! 🌿`,
  displayName: 'Relance J+2',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr' },
} satisfies TemplateEntry
