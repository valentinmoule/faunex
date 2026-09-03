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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail?: string
  email: string
  newEmail: string
  confirmationUrl: string
  locale?: Locale | string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
  locale,
}: EmailChangeEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: "Confirme ton changement d'email Faunex", en: 'Confirm your Faunex email change' }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
          <Heading style={h1}>{pick({ fr: "Changement d'email 📧", en: 'Email change 📧' }, l)}</Heading>
          <Text style={text}>
            {pick({ fr: 'Tu as demandé à changer ton adresse email Faunex de', en: 'You requested to change your Faunex email address from' }, l)}{' '}
            <Link href={`mailto:${email}`} style={link}>
              {email}
            </Link>{' '}
            {pick({ fr: 'vers', en: 'to' }, l)}{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={text}>
            {pick({ fr: 'Clique sur le bouton ci-dessous pour confirmer ce changement :', en: 'Click the button below to confirm this change:' }, l)}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {pick({ fr: 'Confirmer le changement', en: 'Confirm the change' }, l)}
          </Button>
          <Text style={footer}>
            {pick({ fr: "Si tu n'as pas demandé ce changement, sécurise ton compte immédiatement.", en: "If you didn't request this change, secure your account immediately." }, l)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail

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
const link = { color: 'inherit', textDecoration: 'underline' }
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
