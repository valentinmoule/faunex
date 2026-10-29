// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { requiresHumanSpeciesReview } from '../../supabase/functions/_shared/strict-moderation';
import { matchCatalogueSpecies } from '../../supabase/functions/_shared/species-matching';
const certain = { confidence: 0.99, nameMatches: true, disagreement: false, unknown: false, notRealPhoto: false, scientific: 'Gypaetus barbatus' };
describe('Strict species moderation', () => {
 it('accepts an exact high-confidence species', () => expect(requiresHumanSpeciesReview(certain)).toBe(false));
 it('defers doubtful identification', () => expect(requiresHumanSpeciesReview({...certain,confidence:0.7})).toBe(true));
 it('defers scientific or species disagreement even at high confidence', () => expect(requiresHumanSpeciesReview({...certain,disagreement:true})).toBe(true));
 it('does not approve a family or genus as a confirmed species', () => expect(requiresHumanSpeciesReview({...certain,scientific:'Accipitridae'})).toBe(true));
 it('requires explicit positive confirmation', () => expect(requiresHumanSpeciesReview({...certain,nameMatches:undefined})).toBe(true));
 it('defers an invalid photo', () => expect(requiresHumanSpeciesReview({...certain,notRealPhoto:true})).toBe(true));
});
describe('Catalogue lookup failures', () => {
 it('distinguishes a successful empty result', async () => expect(await matchCatalogueSpecies({rpc:vi.fn().mockResolvedValue({data:[],error:null})},'Gypaète barbu',null)).toBeNull());
 it('throws on a non-timeout failure', async () => { const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'42702'}}); await expect(matchCatalogueSpecies({rpc},'Gypaète barbu',null)).rejects.toThrow('42702'); expect(rpc).toHaveBeenCalledTimes(1); });
 it('retries timeouts and returns the canonical entry', async () => { vi.useFakeTimers(); try { const rpc=vi.fn().mockResolvedValueOnce({data:null,error:{code:'57014'}}).mockResolvedValue({data:[{name:'Gypaète barbu'}],error:null}); const promise=matchCatalogueSpecies({rpc},'Gypaete barbu',null); await vi.runAllTimersAsync(); expect(await promise).toEqual({name:'Gypaète barbu'}); expect(rpc).toHaveBeenCalledTimes(2); } finally {vi.useRealTimers();} });
 it('fails closed after exhausted retries', async () => { vi.useFakeTimers(); try { const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'57014'}}); const assertion=expect(matchCatalogueSpecies({rpc},'Gypaète barbu',null)).rejects.toThrow('57014'); await vi.runAllTimersAsync(); await assertion; expect(rpc).toHaveBeenCalledTimes(3); } finally {vi.useRealTimers();} });
 it('propagates a transport failure', async () => { await expect(matchCatalogueSpecies({rpc:vi.fn().mockRejectedValue(new Error('offline'))},'Gypaète barbu',null)).rejects.toThrow('offline'); });
});