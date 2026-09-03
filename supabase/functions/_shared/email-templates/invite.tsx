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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  locale?: Locale | string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  locale,
}: InviteEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: 'Tu es invité à rejoindre Faunex ! 🌿', en: "You're invited to join Faunex! 🌿" }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
          <Heading style={h1}>{pick({ fr: 'Tu es invité ! 🦉', en: "You're invited! 🦉" }, l)}</Heading>
          <Text style={text}>
            {pick({ fr: 'Tu as été invité à rejoindre', en: "You've been invited to join" }, l)}{' '}
            <Link href={siteUrl} style={link}>
              <strong>Faunex</strong>
            </Link>
            {pick({
              fr: ", la communauté des naturalistes. Clique ci-dessous pour accepter l'invitation et créer ton compte.",
              en: ', the naturalist community. Click below to accept the invitation and create your account.',
            }, l)}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {pick({ fr: "Accepter l'invitation", en: 'Accept the invitation' }, l)}
          </Button>
          <Text style={footer}>
            {pick({ fr: "Si tu n'attendais pas cette invitation, tu peux ignorer cet email.", en: "If you weren't expecting this invitation, you can ignore this email." }, l)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail

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
