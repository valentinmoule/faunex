import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchLocalizedSpeciesFacts,
  loadSpeciesNames,
  localizedSpeciesName,
  subscribeSpeciesNames,
  type LocalizedSpeciesFacts,
} from '@/lib/speciesI18n';

/**
 * Résolution du nom d'espèce selon la langue de l'utilisateur.
 * En français, retourne le nom tel quel (aucun coût réseau).
 */
export const useSpeciesName = () => {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language?.toLowerCase().startsWith('en');
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!isEnglish) return;
    void loadSpeciesNames();
    const unsubscribe = subscribeSpeciesNames(() => setVersion((v) => v + 1));
    return () => {
      unsubscribe();
    };
  }, [isEnglish]);


  const speciesName = useCallback(
    (frName: string | null | undefined) => localizedSpeciesName(frName, i18n.language || 'fr'),
    // La version force la ré-évaluation quand la table arrive.
    [i18n.language, isEnglish],
  );

  return { speciesName, isEnglish };
};

interface FactsInput {
  name?: string | null;
  scientificName?: string | null;
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;
  funFact?: string | null;
}

/**
 * Fiche d'espèce localisée. En anglais : lit le cache serveur puis déclenche la
 * traduction à la demande. Repli sur le texte français pendant/après échec.
 */
export const useSpeciesFacts = (input: FactsInput | null | undefined) => {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language?.toLowerCase().startsWith('en');
  const [facts, setFacts] = useState<LocalizedSpeciesFacts | null>(null);
  const [loading, setLoading] = useState(false);

  const name = input?.name || '';

  useEffect(() => {
    setFacts(null);
    if (!isEnglish || !name) return;
    let cancelled = false;
    setLoading(true);
    fetchLocalizedSpeciesFacts({
      name,
      scientificName: input?.scientificName,
      description: input?.description,
      habitat: input?.habitat,
      diet: input?.diet,
      funFact: input?.funFact,
    })
      .then((res) => {
        if (!cancelled) setFacts(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnglish, name, input?.scientificName]);

  return {
    loading,
    description: (isEnglish && facts?.description) || input?.description || '',
    habitat: (isEnglish && facts?.habitat) || input?.habitat || '',
    diet: (isEnglish && facts?.diet) || input?.diet || '',
    funFact: (isEnglish && facts?.funFact) || input?.funFact || '',
  };
};
