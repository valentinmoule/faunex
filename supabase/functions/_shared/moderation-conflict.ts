/** Retry an AI-generated contradiction, never override an explicit forced pair. */
export function shouldRecheckModerationIdentity(forceName: boolean, error: { message?: string } | null, alreadyRechecked: boolean) {
  return !forceName && !alreadyRechecked && /SPECIES_IDENTITY_CONFLICT/.test(error?.message ?? '');
}