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

interface NoCaptureNudgeEmailProps {
  displayName: string
  siteUrl: string
}

export const NoCaptureNudgeEmail = ({
  displayName,
  siteUrl,
}: NoCaptureNudgeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ta première carte t'attend, {displayName} 🦊</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
          width="48"
          height="48"
          alt="Faunex"
          style={logo}
        />
        <Heading style={h1}>Hé {displayName}, prêt(e) pour la chasse ? 🌿</Heading>
        <Text style={text}>
          Une semaine que tu nous as rejoints, et ton bestiaire est encore tout vide…
          quelque part près de chez toi, une carte attend que tu la débloques !
        </Text>
        <Text style={textHighlight}>
          📸 Une photo, 3 secondes d'IA, et hop : ta première espèce capturée.
        </Text>
        <Text style={text}>
          Pigeon de balcon, fourmi du trottoir, mésange du parc — même les espèces communes
          comptent. Chaque capture rapporte de l'XP et fait grossir ta collection.
        </Text>
        <Button style={button} href={`${siteUrl}/capture`}>
          Faire ma première capture
        </Button>
        <Text style={footer}>
          On t'attend sur les sentiers !{'\n'}
          L'équipe Faunex 🦊
        </Text>
      </Container>
    </Body>
  </Html>
)

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
