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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirme ton email pour rejoindre Faunex 🌿</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={logo} />
        <Heading style={h1}>Bienvenue, explorateur ! 🦊</Heading>
        <Text style={text}>
          Merci de rejoindre{' '}
          <Link href={siteUrl} style={link}>
            <strong>Faunex</strong>
          </Link>
          , la communauté des naturalistes.
        </Text>
        <Text style={text}>
          Confirme ton adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Vérifier mon email
        </Button>
        <Text style={footer}>
          Si tu n'as pas créé de compte, tu peux ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
