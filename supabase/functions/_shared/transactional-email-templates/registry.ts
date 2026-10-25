import { template as newFollower } from './new-follower.tsx'
import { template as captureLike } from './capture-like.tsx'
import { template as captureComment } from './capture-comment.tsx'
import { template as captureApproved } from './capture-approved.tsx'
import { template as captureRejected } from './capture-rejected.tsx'
import { template as reengagementJ2 } from './reengagement-j2.tsx'
import { template as noCaptureJ7 } from './no-capture-j7.tsx'
import { template as inactivityEmail } from './inactivity-email.tsx'
import { template as accountBlocked } from './account-blocked.tsx'
import { template as premiumRecap } from './premium-recap.tsx'
import { template as familyInvitation } from './family-invitation.tsx'

export interface TemplateEntry {
  component: any
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'family-invitation': familyInvitation,
  'new-follower': newFollower,
  'capture-like': captureLike,
  'capture-comment': captureComment,
  'capture-approved': captureApproved,
  'capture-rejected': captureRejected,
  // Variantes de motifs de rejet — aperçu uniquement : l'envoi réel passe toujours
  // par la clé 'capture-rejected', le motif étant transmis via templateData.
  'capture-rejected-duplicate': {
    component: captureRejected.component,
    subject: captureRejected.subject,
    displayName: 'Capture rejetée — déjà dans ton bestiaire',
    previewData: {
      recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr',
      reason: 'duplicate', duplicateName: 'Renard roux', duplicateScientific: 'Vulpes vulpes',
    },
  },
  'capture-rejected-dead-animal': {
    component: captureRejected.component,
    subject: captureRejected.subject,
    displayName: 'Capture rejetée — animal mort ou cadavre',
    previewData: {
      recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr',
      reason: 'dead_animal',
    },
  },
  'capture-rejected-internet-image': {
    component: captureRejected.component,
    subject: captureRejected.subject,
    displayName: 'Capture rejetée — image provenant d\'Internet',
    previewData: {
      recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr',
      reason: 'internet_image',
    },
  },
  'capture-rejected-captured-animal': {
    component: captureRejected.component,
    subject: captureRejected.subject,
    displayName: 'Capture rejetée — animal capturé ou pêché',
    previewData: {
      recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr',
      reason: 'captured_animal',
    },
  },
  'capture-rejected-human': {
    component: captureRejected.component,
    subject: captureRejected.subject,
    displayName: 'Capture rejetée — humain sur la photo',
    previewData: {
      recipientName: 'Sam', animalName: 'Renard roux', captureUrl: 'https://faunex.lovable.app', locale: 'fr',
      reason: 'human',
    },
  },
  'reengagement-j2': reengagementJ2,
  'no-capture-j7': noCaptureJ7,
  'inactivity-email': inactivityEmail,
  'account-blocked': accountBlocked,
  'premium-recap': premiumRecap,
}
