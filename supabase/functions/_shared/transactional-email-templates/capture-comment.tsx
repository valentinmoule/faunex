/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface Props {
  actorName?: string
  recipientName?: string
  animalName?: string
  commentText?: string
  captureUrl?: string
  locale?: Locale | string
}

const CaptureCommentEmail = ({
  actorName = 'Un explorateur',
  recipientName = 'Explorateur',
  animalName = 'ta capture',
  commentText = '',
  captureUrl = 'https://faunex.lovable.app',
  locale,
}: Props) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: `${actorName} a commenté ta capture de ${animalName} 💬`, en: `${actorName} commented on your capture of ${animalName} 💬` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
            width="48" height="48" alt="Faunex" style={logo}
          />
          <Heading style={h1}>{pick({ fr: 'Nouveau commentaire ! 💬', en: 'New comment! 💬' }, l)}</Heading>
          <Text style={text}>{pick({ fr: 'Salut', en: 'Hey' }, l)} <strong>{recipientName}</strong>,</Text>
          <Text style={text}>
            <strong>{actorName}</strong>{' '}
            {pick({ fr: `a commenté ta capture de ${animalName} :`, en: `commented on your capture of ${animalName}:` }, l)}
          </Text>
          {commentText && <Text style={quote}>« {commentText} »</Text>}
          <Button style={button} href={captureUrl}>{pick({ fr: 'Voir la conversation', en: 'View the conversation' }, l)}</Button>
          <Text style={footer}>{pick({ fr: "Réponds-lui depuis l'application.", en: 'Reply from the app.' }, l)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CaptureCommentEmail,
  subject: (d: Props) => pick(
    { fr: `${d?.actorName || 'Un explorateur'} a commenté ta capture de ${d?.animalName || 'faune'} 💬`, en: `${d?.actorName || 'An explorer'} commented on your capture of ${d?.animalName || 'wildlife'} 💬` },
    d?.locale,
  ),
  displayName: 'Capture Comment',
  previewData: { actorName: 'Alex', recipientName: 'Sam', animalName: 'Renard roux', commentText: 'Magnifique !', captureUrl: 'https://faunex.lovable.app', locale: 'fr' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 25px' }
const quote = { fontSize: '14px', color: 'hsl(160, 30%, 8%)', lineHeight: '1.6', margin: '0 0 25px', padding: '12px 16px', borderLeft: '3px solid hsl(152, 55%, 28%)', backgroundColor: '#f7faf7', borderRadius: '6px', fontStyle: 'italic' as const }
const button = { backgroundColor: 'hsl(152, 55%, 28%)', color: 'hsl(60, 20%, 97%)', fontSize: '14px', fontWeight: '600' as const, borderRadius: '16px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
