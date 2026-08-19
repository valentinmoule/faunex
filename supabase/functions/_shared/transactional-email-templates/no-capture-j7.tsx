import * as React from 'npm:react@18.3.1'
import { NoCaptureNudgeEmail } from '../email-templates/no-capture-j7.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  displayName?: string
  siteUrl?: string
}

const Email = ({ displayName, siteUrl }: Props) =>
  React.createElement(NoCaptureNudgeEmail, {
    displayName: displayName || 'Explorateur',
    siteUrl: siteUrl || 'https://faunex.fr',
  })

export const template = {
  component: Email,
  subject: (data: Props) =>
    `${data?.displayName || 'Explorateur'}, ta première carte t'attend 🦊`,
  displayName: 'Première capture (J+7)',
  previewData: { displayName: 'Valentin', siteUrl: 'https://faunex.fr' },
} satisfies TemplateEntry
