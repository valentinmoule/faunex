/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface Props {
  recipientName?: string
  animalName?: string
  captureUrl?: string
  /** true = la validation concerne une demande de correction d'espèce. */
  correction?: boolean
  locale?: Locale | string
}

const CaptureApprovedEmail = ({
  recipientName = 'Explorateur',
  animalName = 'ta capture',
  captureUrl = 'https://faunex.lovable.app',
  correction = false,
  locale,
}: Props) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{correction
        ? pick({ fr: `Ta correction a été acceptée : ta capture est maintenant « ${animalName} » 🎉`, en: `Your correction was accepted: your capture is now "${animalName}" 🎉` }, l)
        : pick({ fr: `Ta capture de ${animalName} rejoint ton bestiaire 🎉`, en: `Your ${animalName} capture just joined your bestiary 🎉` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
            width="48" height="48" alt="Faunex" style={logo}
          />
          <Heading style={h1}>{correction
            ? pick({ fr: 'Correction acceptée ! 🎉', en: 'Correction accepted! 🎉' }, l)
            : pick({ fr: 'Capture validée ! 🎉', en: 'Capture approved! 🎉' }, l)}</Heading>
          <Text style={text}>{pick({ fr: 'Salut', en: 'Hey' }, l)} <strong>{recipientName}</strong>,</Text>
          <Text style={text}>
            {correction
              ? pick(
                  {
                    fr: `Bonne nouvelle : ta demande de correction a été acceptée. Ta capture est maintenant identifiée comme « ${animalName} » dans ton bestiaire.`,
                    en: `Good news: your correction request was accepted. Your capture is now identified as "${animalName}" in your bestiary.`,
                  },
                  l,
                )
              : pick(
                  {
                    fr: `Ta capture de ${animalName} vient d'être validée : elle rejoint officiellement ton bestiaire.`,
                    en: `Your capture of ${animalName} has just been approved: it officially joins your bestiary.`,
                  },
                  l,
                )}
          </Text>
          <Button style={button} href={captureUrl}>{pick({ fr: 'Voir ma carte', en: 'View my card' }, l)}</Button>
          <Text style={footer}>{pick({ fr: "Continue d'explorer la faune sauvage !", en: 'Keep exploring the wildlife!' }, l)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CaptureApprovedEmail,
  subject: (d: Props) => pick(
    { fr: `${d?.animalName || 'Ta capture'} a été validée 🎉`, en: `${d?.animalName || 'Your capture'} has been approved 🎉` },
    d?.locale,
  ),
  displayName: 'Capture validée',
  previewData: { recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: 'hsl(152, 55%, 28%)', color: 'hsl(60, 20%, 97%)', fontSize: '14px', fontWeight: '600' as const, borderRadius: '16px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
