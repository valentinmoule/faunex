/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Html, Head, Body, Container, Heading, Text, Button, Preview } from 'npm:@react-email/components@0.0.22'
import { pick, resolveLocale } from '../i18n.ts'
import type { TemplateEntry } from './registry.ts'
interface Props { ownerName?: string; invitationUrl?: string; locale?: string }
const FamilyInvitation = ({ownerName='Faunex',invitationUrl='https://faunex.fr/family/invite',locale}:Props) => {
  const l=resolveLocale(locale)
  return <Html lang={l}><Head/><Preview>{pick({fr:'Tu es invité à rejoindre Faunex Premium Famille',en:'You are invited to Faunex Premium Family'},l)}</Preview><Body><Container><Heading>Faunex Premium Famille</Heading><Text>{pick({fr:`${ownerName} t’invite à rejoindre sa famille Faunex.`,en:`${ownerName} invites you to their Faunex family.`},l)}</Text><Text>{pick({fr:'Crée ton compte ou connecte-toi avec l’adresse qui a reçu cet e-mail pour rejoindre la famille. Chacun conserve ses captures, ses badges et sa progression.',en:'Create an account or sign in with the address that received this email to join the family. Everyone keeps their captures, badges and progress.'},l)}</Text><Button href={invitationUrl}>{pick({fr:'Rejoindre la famille',en:'Join the family'},l)}</Button><Text>{pick({fr:'Invitation valable 7 jours, pour une seule personne. Premium reste actif tant que l’abonnement familial est valide.',en:'Valid for 7 days and one person only. Premium remains active while the family subscription is valid.'},l)}</Text></Container></Body></Html>
}
export const template={component:FamilyInvitation,subject:(data:Props)=>pick({fr:'Ton invitation Faunex Premium Famille',en:'Your Faunex Premium Family invitation'},data.locale),displayName:'Invitation Premium Famille',previewData:{ownerName:'Alex',invitationUrl:'https://faunex.fr/family/invite',locale:'fr'}} satisfies TemplateEntry