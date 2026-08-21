/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const AccountBlockedEmail = () => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre compte Faunex a été bloqué</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
          width="48" height="48" alt="Faunex" style={logo}
        />
        <Heading style={h1}>Compte bloqué</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Nous vous informons que votre compte Faunex a été bloqué pour non-respect de notre
          règlement.
        </Text>
        <Text style={text}>
          Cette décision fait suite à des comportements contraires à nos règles, notamment
          l’utilisation ou la copie d’images appartenant à d’autres utilisateurs et/ou la saisie
          volontaire d’informations fausses ou trompeuses.
        </Text>
        <Text style={text}>
          Nous vous rappelons que ces pratiques sont interdites sur Faunex afin de garantir un
          environnement fiable et respectueux pour l’ensemble de nos utilisateurs.
        </Text>
        <Text style={text}>En conséquence, votre compte n’est plus accessible.</Text>
        <Text style={text}>
          Cordialement,<br />
          L’équipe Faunex
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountBlockedEmail,
  subject: 'Votre compte Faunex a été bloqué',
  displayName: 'Compte bloqué',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 18px' }
