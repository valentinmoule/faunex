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

interface NoCaptureNudgeEmailProps {
  displayName: string
  siteUrl: string
  locale?: Locale | string
}

export const NoCaptureNudgeEmail = ({
  displayName,
  siteUrl,
  locale,
}: NoCaptureNudgeEmailProps) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: `Ta première carte t'attend, ${displayName} 🦊`, en: `Your first card is waiting, ${displayName} 🦊` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
            width="48"
            height="48"
            alt="Faunex"
            style={logo}
          />
          <Heading style={h1}>{pick({ fr: `Hé ${displayName}, prêt(e) pour la chasse ? 🌿`, en: `Hey ${displayName}, ready for the hunt? 🌿` }, l)}</Heading>
          <Text style={text}>
            {pick(
              {
                fr: "Une semaine que tu nous as rejoints, et ton bestiaire est encore tout vide… quelque part près de chez toi, une carte attend que tu la débloques !",
                en: "It's been a week since you joined, and your bestiary is still empty… somewhere near you, a card is waiting to be unlocked!",
              },
              l,
            )}
          </Text>
          <Text style={textHighlight}>
            {pick(
              { fr: "📸 Une photo, 3 secondes d'IA, et hop : ta première espèce capturée.", en: '📸 One photo, 3 seconds of AI, and boom: your first species captured.' },
              l,
            )}
          </Text>
          <Text style={text}>
            {pick(
              {
                fr: "Pigeon de balcon, fourmi du trottoir, mésange du parc — même les espèces communes comptent. Chaque capture rapporte de l'XP et fait grossir ta collection.",
                en: 'Balcony pigeon, sidewalk ant, park tit — even common species count. Every capture earns XP and grows your collection.',
              },
              l,
            )}
          </Text>
          <Button style={button} href={`${siteUrl}/capture`}>
            {pick({ fr: 'Faire ma première capture', en: 'Make my first capture' }, l)}
          </Button>
          <Text style={footer}>
            {pick(
              { fr: "On t'attend sur les sentiers !\nL'équipe Faunex 🦊", en: "We'll see you on the trails!\nThe Faunex team 🦊" },
              l,
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default NoCaptureNudgeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 30%, 8%)',
  margin: '0 0 20px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '14px',
  color: 'hsl(155, 10%, 45%)',
  lineHeight: '1.7',
  margin: '0 0 18px',
}
const textHighlight = {
  fontSize: '15px',
  color: 'hsl(160, 30%, 8%)',
  fontWeight: '600' as const,
  lineHeight: '1.6',
  margin: '0 0 18px',
  padding: '14px 16px',
  backgroundColor: 'hsl(152, 55%, 96%)',
  borderRadius: '12px',
  borderLeft: '3px solid hsl(152, 55%, 28%)',
}
const button = {
  backgroundColor: 'hsl(152, 55%, 28%)',
  color: 'hsl(60, 20%, 97%)',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '16px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '8px',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '30px 0 0',
  whiteSpace: 'pre-line' as const,
}
