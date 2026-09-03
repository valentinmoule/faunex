/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface ReauthenticationEmailProps {
  token: string
  locale?: Locale | string
}

export const ReauthenticationEmail = ({ token, locale }: ReauthenticationEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: 'Ton code de vérification Faunex', en: 'Your Faunex verification code' }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
          <Heading style={h1}>{pick({ fr: "Vérification d'identité 🔐", en: 'Identity verification 🔐' }, l)}</Heading>
          <Text style={text}>{pick({ fr: 'Utilise le code ci-dessous pour confirmer ton identité :', en: 'Use the code below to confirm your identity:' }, l)}</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            {pick({
              fr: "Ce code expire rapidement. Si tu n'as pas fait cette demande, tu peux ignorer cet email.",
              en: "This code expires soon. If you didn't request this, you can ignore this email.",
            }, l)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail

const main = { backgroundColor: '#f7faf7', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 30%, 8%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(155, 10%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 30%, 8%)',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
