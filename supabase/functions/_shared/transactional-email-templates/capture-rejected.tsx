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
  /** 'duplicate' = espèce déjà présente dans le bestiaire de l'explorateur. */
  reason?: 'not_identifiable' | 'duplicate' | string
  locale?: Locale | string
}

const CaptureRejectedEmail = ({
  recipientName = 'Explorateur',
  animalName = 'ta capture',
  captureUrl = 'https://faunex.lovable.app',
  reason = 'not_identifiable',
  locale,
}: Props) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: `Ta capture de ${animalName} n'a pas pu être validée`, en: `Your capture of ${animalName} could not be approved` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
            width="48" height="48" alt="Faunex" style={logo}
          />
          <Heading style={h1}>{pick({ fr: 'Capture non validée', en: 'Capture not approved' }, l)}</Heading>
          <Text style={text}>{pick({ fr: 'Salut', en: 'Hey' }, l)} <strong>{recipientName}</strong>,</Text>
          {reason === 'duplicate' ? (
            <Text style={text}>
              {pick(
                {
                  fr: `Ta capture de ${animalName} n'a pas été ajoutée : cette espèce figure déjà dans ton bestiaire. Chaque espèce ne compte qu'une seule fois dans Faunex — part à la rencontre d'une nouvelle espèce pour agrandir ta collection !`,
                  en: `Your capture of ${animalName} wasn't added: this species is already in your bestiary. Each species only counts once in Faunex — go find a new one to grow your collection!`,
                },
                l,
              )}
            </Text>
          ) : (
            <Text style={text}>
              {pick(
                {
                  fr: `Ta capture de ${animalName} n'a pas pu être validée : l'espèce n'était pas identifiable sur la photo. Rien de grave, retente ta chance avec un cliché plus net ou plus rapproché.`,
                  en: `Your capture of ${animalName} could not be approved: the species wasn't identifiable in the photo. No worries, try again with a clearer or closer shot.`,
                },
                l,
              )}
            </Text>
          )}
          <Button style={button} href={captureUrl}>
            {reason === 'duplicate'
              ? pick({ fr: 'Capturer une nouvelle espèce', en: 'Capture a new species' }, l)
              : pick({ fr: 'Refaire une capture', en: 'Try another capture' }, l)}
          </Button>
          <Text style={footer}>{pick({ fr: 'À bientôt sur le terrain !', en: 'See you out there!' }, l)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CaptureRejectedEmail,
  subject: (d: Props) =>
    d?.reason === 'duplicate'
      ? pick(
          { fr: `${d?.animalName || 'Cette espèce'} est déjà dans ton bestiaire`, en: `${d?.animalName || 'This species'} is already in your bestiary` },
          d?.locale,
        )
      : pick(
          { fr: `${d?.animalName || 'Ta capture'} n'a pas pu être validée`, en: `${d?.animalName || 'Your capture'} could not be approved` },
          d?.locale,
        ),
  displayName: 'Capture rejetée',
  previewData: { recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: 'hsl(152, 55%, 28%)', color: 'hsl(60, 20%, 97%)', fontSize: '14px', fontWeight: '600' as const, borderRadius: '16px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
