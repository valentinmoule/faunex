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

interface ReengagementEmailProps {
  displayName: string
  siteUrl: string
  locale?: Locale | string
}

export const ReengagementEmail = ({
  displayName,
  siteUrl,
  locale,
}: ReengagementEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: `La nature t'attend, ${displayName} ! 🌿`, en: `Nature is waiting for you, ${displayName}! 🌿` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
          <Heading style={h1}>{pick({ fr: `Salut ${displayName} ! 🦊`, en: `Hey ${displayName}! 🦊` }, l)}</Heading>
          <Text style={text}>
            {pick(
              {
                fr: "Ça fait déjà 2 jours que tu as rejoint Faunex — et il y a plein d'espèces qui n'attendent que toi !",
                en: "It's already been 2 days since you joined Faunex — and plenty of species are just waiting for you!",
              },
              l,
            )}
          </Text>
          <Text style={text}>
            {pick(
              {
                fr: "🐦 Ouvre l'appareil photo et capture ton premier animal\n🌍 Explore ta région et découvre la faune locale\n🏆 Gagne de l'XP et monte en niveau",
                en: '🐦 Open the camera and capture your first animal\n🌍 Explore your area and discover local wildlife\n🏆 Earn XP and level up',
              },
              l,
            )}
          </Text>
          <Button style={button} href={siteUrl}>
            {pick({ fr: "Partir en exploration", en: 'Start exploring' }, l)}
          </Button>
          <Text style={footer}>
            {pick(
              { fr: "À bientôt sur les sentiers !\nL'équipe Faunex 🌿", en: 'See you on the trails soon!\nThe Faunex team 🌿' },
              l,
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReengagementEmail

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
  lineHeight: '1.8',
  margin: '0 0 25px',
  whiteSpace: 'pre-line' as const,
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
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '30px 0 0',
  whiteSpace: 'pre-line' as const,
}
