export interface FamilyInfo {
  id: string;
  owner_id: string;
  active: boolean;
  environment: 'live' | 'sandbox';
  renews_at?: string | null;
  cancel_at_period_end?: boolean;
  members: Array<{user_id:string; name:string; username:string | null}>;
  invitations: Array<{id:string; expires_at:string; recipient_email?:string | null}>;
}
export function canManageFamily(family:FamilyInfo|null,userId?:string):boolean {
  return Boolean(userId && family?.owner_id===userId);
}
export function hasActiveFamily(family: FamilyInfo | null): boolean {
  return family?.active === true;
}
export function readFamily(value:unknown):FamilyInfo | null {
  if (!value || typeof value!=='object' || !('id' in value) || !('members' in value) || !Array.isArray(value.members)) return null;
  return value as FamilyInfo;
}