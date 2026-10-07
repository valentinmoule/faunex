/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { Locale } from '../i18n.ts'
import { pick, resolveLocale } from '../i18n.ts'

interface Props {
  displayName: string
  siteUrl: string
  captures: number
  species: number
  xp: number
  renewalDate: string
  locale?: Locale | string
}

export const PremiumRecapEmail = ({ displayName, siteUrl, captures, species, xp, renewalDate, locale }: Props) => {
  const l = resolveLocale(locale as string | undefined)
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{pick({ fr: `Ton mois Premium en chiffres 🦊`, en: `Your Premium month in numbers 🦊` }, l)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://pakwuooxumrghsbwczwx.supabase.co/storage/v1/object/public/avatars/email-assets/faunex-logo.png" width="48" height="48" alt="Faunex" style={{ marginBottom: '20px' }} />
          <Heading style={h1}>{pick({ fr: `${displayName}, ton mois Premium 🌿`, en: `${displayName}, your Premium month 🌿` }, l)}</Heading>
          <Text style={highlight}>
            {pick({
              fr: `📸 ${captures} capture${captures > 1 ? 's' : ''}\n🦋 ${species} espèce${species > 1 ? 's' : ''} différente${species > 1 ? 's' : ''}${xp > 0 ? `\n⭐ ${xp} XP gagnés` : ''}`,
              en: `📸 ${captures} capture${captures === 1 ? '' : 's'}\n🦋 ${species} different species${xp > 0 ? `\n⭐ ${xp} XP earned` : ''}`,
            }, l)}
          </Text>
          <Text style={text}>
            {pick({
              fr: `Ton abonnement Premium se renouvelle automatiquement le ${renewalDate}. Le prélèvement apparaîtra sous le nom « PADDLE.NET* FAUNEX » sur ton relevé.`,
              en: `Your Premium subscription renews automatically on ${renewalDate}. The charge will appear as "PADDLE.NET* FAUNEX" on your statement.`,
            }, l)}
          </Text>
          <Text style={text}>
            {pick({
              fr: `Astuce : la formule annuelle revient à 2 € par mois. Tu peux changer de formule ou gérer ton abonnement à tout moment depuis la page Premium.`,
              en: `Tip: the yearly plan works out at €2 per month. You can switch plans or manage your subscription anytime from the Premium page.`,
            }, l)}
          </Text>
          <Button style={button} href={`${siteUrl}/premium`}>
            {pick({ fr: 'Voir mon abonnement', en: 'View my subscription' }, l)}
          </Button>
          <Text style={footer}>{pick({ fr: "Merci de soutenir Faunex !\nL'équipe Faunex 🦊", en: 'Thanks for supporting Faunex!\nThe Faunex team 🦊' }, l)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PremiumRecapEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', 'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(160, 30%, 8%)', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: 'hsl(155, 10%, 45%)', lineHeight: '1.7', margin: '0 0 18px' }
const highlight = {
  fontSize: '15px', color: 'hsl(160, 30%, 8%)', fontWeight: '600' as const, lineHeight: '1.8', margin: '0 0 18px',
  padding: '14px 16px', backgroundColor: 'hsl(152, 55%, 96%)', borderRadius: '12px', borderLeft: '3px solid hsl(152, 55%, 28%)',
  whiteSpace: 'pre-line' as const,
}
const button = {
  backgroundColor: 'hsl(152, 55%, 28%)', color: 'hsl(60, 20%, 97%)', fontSize: '14px', fontWeight: '600' as const,
  borderRadius: '16px', padding: '12px 24px', textDecoration: 'none', display: 'inline-block', marginTop: '8px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }
