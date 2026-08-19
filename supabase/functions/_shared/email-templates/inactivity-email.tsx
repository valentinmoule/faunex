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

interface InactivityEmailProps {
  displayName: string
  siteUrl: string
}

export const InactivityEmail = ({
  displayName,
  siteUrl,
}: InactivityEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>On t'a préparé de nouvelles découvertes, {displayName} 🌿</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
          width="48"
          height="48"
          alt="Faunex"
          style={logo}
        />
        <Heading style={h1}>Tu nous manques sur les sentiers 🦊</Heading>
        <Text style={text}>
          Ça fait un moment que tu n'as pas ouvert Faunex. Pourtant, la nature
          continue de bouger autour de toi : de nouvelles espèces, de nouvelles
          quêtes et peut-être même une carte rare à découvrir.
        </Text>
        <Text style={textHighlight}>
          🌿 Reviens capturer une espèce aujourd'hui et reprends ta série.
        </Text>
        <Text style={text}>
          Même une simple photo de balcon ou de jardin peut enrichir ton
          bestiaire. Chaque observation compte pour la communauté.
        </Text>
        <Button style={button} href={`${siteUrl}/home`}>
          Ouvrir Faunex
        </Button>
        <Text style={footer}>
          À bientôt dans la nature !{'\n'}
          L'équipe Faunex 🌿
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InactivityEmail

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
