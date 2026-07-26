/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  animalName?: string
  captureUrl?: string
}

const CaptureApprovedEmail = ({
  recipientName = 'Explorateur',
  animalName = 'ta capture',
  captureUrl = 'https://faunex.lovable.app',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ta capture de {animalName} rejoint ton bestiaire 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
          width="48" height="48" alt="Faunex" style={logo}
        />
        <Heading style={h1}>Capture validée ! 🎉</Heading>
        <Text style={text}>Salut <strong>{recipientName}</strong>,</Text>
        <Text style={text}>
          Ta capture de <strong>{animalName}</strong> vient d'être validée : elle rejoint
          officiellement ton bestiaire.
        </Text>
        <Button style={button} href={captureUrl}>Voir ma carte</Button>
        <Text style={footer}>Continue d'explorer la faune sauvage !</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CaptureApprovedEmail,
  subject: (d: Props) => `${d?.animalName || 'Ta capture'} a été validée 🎉`,
  displayName: 'Capture validée',
  previewData: { recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: 'hsl(152, 55%, 28%)', color: 'hsl(60, 20%, 97%)', fontSize: '14px', fontWeight: '600' as const, borderRadius: '16px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
