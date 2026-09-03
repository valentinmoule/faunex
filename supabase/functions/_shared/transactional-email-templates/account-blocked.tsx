/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface Props {
  locale?: Locale | string
}

const AccountBlockedEmail = ({ locale }: Props) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: 'Votre compte Faunex a été bloqué', en: 'Your Faunex account has been blocked' }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png"
            width="48" height="48" alt="Faunex" style={logo}
          />
          <Heading style={h1}>{pick({ fr: 'Compte bloqué', en: 'Account blocked' }, l)}</Heading>
          <Text style={text}>{pick({ fr: 'Bonjour,', en: 'Hello,' }, l)}</Text>
          <Text style={text}>
            {pick(
              {
                fr: 'Nous vous informons que votre compte Faunex a été bloqué pour non-respect de notre règlement.',
                en: 'We are informing you that your Faunex account has been blocked for violating our rules.',
              },
              l,
            )}
          </Text>
          <Text style={text}>
            {pick(
              {
                fr: 'Cette décision fait suite à des comportements contraires à nos règles, notamment l’utilisation ou la copie d’images appartenant à d’autres utilisateurs et/ou la saisie volontaire d’informations fausses ou trompeuses.',
                en: 'This decision follows behavior that violates our rules, in particular the use or copying of images belonging to other users and/or the deliberate entry of false or misleading information.',
              },
              l,
            )}
          </Text>
          <Text style={text}>
            {pick(
              {
                fr: 'Nous vous rappelons que ces pratiques sont interdites sur Faunex afin de garantir un environnement fiable et respectueux pour l’ensemble de nos utilisateurs.',
                en: 'We remind you that such practices are prohibited on Faunex in order to guarantee a reliable and respectful environment for all our users.',
              },
              l,
            )}
          </Text>
          <Text style={text}>{pick({ fr: 'En conséquence, votre compte n’est plus accessible.', en: 'As a result, your account is no longer accessible.' }, l)}</Text>
          <Text style={text}>
            {pick({ fr: 'Cordialement,', en: 'Best regards,' }, l)}<br />
            {pick({ fr: 'L’équipe Faunex', en: 'The Faunex team' }, l)}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AccountBlockedEmail,
  subject: (d: Props) => pick({ fr: 'Votre compte Faunex a été bloqué', en: 'Your Faunex account has been blocked' }, d?.locale),
  displayName: 'Compte bloqué',
  previewData: { locale: 'fr' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.6', margin: '0 0 18px' }
