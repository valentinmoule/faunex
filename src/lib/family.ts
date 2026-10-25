export interface FamilyInfo {
  id: string;
  owner_id: string;
  active: boolean;
  environment: 'live' | 'sandbox';
  members: Array<{user_id:string; name:string; username:string | null}>;
  invitations: Array<{id:string; expires_at:string}>;
}
export function readFamily(value:unknown):FamilyInfo | null {
  if (!value || typeof value!=='object' || !('id' in value) || !('members' in value) || !Array.isArray(value.members)) return null;
  return value as FamilyInfo;
}