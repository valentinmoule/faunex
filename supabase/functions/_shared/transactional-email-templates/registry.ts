import { template as newFollower } from './new-follower.tsx'
import { template as captureLike } from './capture-like.tsx'
import { template as captureComment } from './capture-comment.tsx'
import { template as captureApproved } from './capture-approved.tsx'
import { template as captureRejected } from './capture-rejected.tsx'
import { template as reengagementJ2 } from './reengagement-j2.tsx'
import { template as noCaptureJ7 } from './no-capture-j7.tsx'
import { template as inactivityEmail } from './inactivity-email.tsx'

export interface TemplateEntry {
  component: any
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-follower': newFollower,
  'capture-like': captureLike,
  'capture-comment': captureComment,
  'capture-approved': captureApproved,
  'capture-rejected': captureRejected,
  'reengagement-j2': reengagementJ2,
  'no-capture-j7': noCaptureJ7,
  'inactivity-email': inactivityEmail,
}
