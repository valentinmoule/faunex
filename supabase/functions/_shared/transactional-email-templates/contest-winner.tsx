import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { recipientName?: string; animalName?: string; captureUrl?: string; locale?: string }
const WinnerEmail = ({ recipientName = 'Explorateur', animalName = '', captureUrl = 'https://faunex.fr/explorers', locale }: Props) => {
  const en = locale === 'en'
  const title = en ? 'You won Capture of the week! 🏆' : 'Tu as remporté la Capture de la semaine ! 🏆'
  return <Html lang={en ? 'en' : 'fr'} dir="ltr"><Head /><Preview>{title}</Preview>
    <Body style={main}><Container style={container}>
      <Text style={brand}>Faunex</Text><Heading style={heading}>{title}</Heading>
      <Text style={text}>{en ? 'Congratulations' : 'Bravo'} {recipientName} !</Text>
      <Text style={text}>{en ? `Your ${animalName} capture won this week’s vote. Your card now has its collector ✦ W edition.` : `Ta capture de ${animalName} a remporté le vote de la semaine. Ta carte bénéficie maintenant de son édition collector ✦ W.`}</Text>
      <Text style={text}>{en ? 'Your Capture of the week badge is ready to claim in your profile.' : 'Ton badge Capture de la semaine est prêt à être récupéré sur ton profil.'}</Text>
      <Button href={captureUrl} style={button}>{en ? 'View my winning card' : 'Voir ma carte primée'}</Button>
    </Container></Body></Html>
}
export const template = {
  component: WinnerEmail,
  subject: (data: Props) => data.locale === 'en' ? 'You won Capture of the week! 🏆' : 'Tu as remporté la Capture de la semaine ! 🏆',
  displayName: 'Capture de la semaine — gagnant',
  previewData: { recipientName: 'Sam', animalName: 'Cochon vietnamien', locale: 'fr', captureUrl: 'https://faunex.fr/home' },
} satisfies TemplateEntry
const main = { backgroundColor: '#ffffff', fontFamily: 'Manrope, Arial, sans-serif' }
const container = { maxWidth: '520px', padding: '32px 24px' }
const brand = { color: 'hsl(155, 68%, 36%)', fontSize: '18px', fontWeight: '700' }
const heading = { color: 'hsl(165, 25%, 11%)', fontSize: '24px', lineHeight: '1.4' }
const text = { color: 'hsl(165, 25%, 11%)', fontSize: '15px', lineHeight: '1.7' }
const button = { backgroundColor: 'hsl(155, 68%, 36%)', color: '#ffffff', borderRadius: '8px', padding: '14px 22px', fontWeight: '700', textDecoration: 'none' }