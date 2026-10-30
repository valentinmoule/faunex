import { isTransientDbError } from '../_shared/species-matching.ts';

export function moderationDatabaseFailure(error: { code?: string; message?: string }) {
  if (!isTransientDbError(error.code, error.message)) return null;
  return {
    code: 'database_busy',
    error: 'Le traitement a pris trop de temps. Aucune modification enregistrée. Réessaie dans quelques instants.',
  };
}