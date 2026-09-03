/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: Locale | string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  locale,
}: RecoveryEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: 'Réinitialise ton mot de passe Faunex', en: 'Reset your Faunex password' }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
          <Heading style={h1}>{pick({ fr: 'Mot de passe oublié ? 🔑', en: 'Forgot your password? 🔑' }, l)}</Heading>
          <Text style={text}>
            {pick({
              fr: "On a reçu une demande de réinitialisation de ton mot de passe Faunex. Clique sur le bouton ci-dessous pour en choisir un nouveau.",
              en: "We received a request to reset your Faunex password. Click the button below to choose a new one.",
            }, l)}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {pick({ fr: 'Réinitialiser mon mot de passe', en: 'Reset my password' }, l)}
          </Button>
          <Text style={footer}>
            {pick({
              fr: "Si tu n'as pas fait cette demande, tu peux ignorer cet email. Ton mot de passe ne sera pas modifié.",
              en: "If you didn't request this, you can ignore this email. Your password won't be changed.",
            }, l)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

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
const button = {
  backgroundColor: 'hsl(152, 55%, 28%)',
  color: 'hsl(60, 20%, 97%)',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '16px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
