import { template as newFollower } from './new-follower.tsx'
import { template as captureLike } from './capture-like.tsx'
import { template as captureComment } from './capture-comment.tsx'

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
}
