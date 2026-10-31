// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { requiresHumanSpeciesReview } from '../../supabase/functions/_shared/strict-moderation';
import { CatalogueLookupError, matchCatalogueSpecies, matchCatalogueWithIdentityRecheck } from '../../supabase/functions/_shared/species-matching';
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
 it('preserves deterministic conflict details', async () => {
  const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'P0001',message:'SPECIES_IDENTITY_CONFLICT'}});
  await expect(matchCatalogueSpecies({rpc},'Criquet des ajoncs','Omocestus viridulus')).rejects.toMatchObject({identityConflict:true});
 });
 it('distinguishes a successful empty result', async () => expect(await matchCatalogueSpecies({rpc:vi.fn().mockResolvedValue({data:[],error:null})},'Gypaète barbu',null)).toBeNull());
 it('throws on a non-timeout failure', async () => { const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'42702'}}); await expect(matchCatalogueSpecies({rpc},'Gypaète barbu',null)).rejects.toThrow('42702'); expect(rpc).toHaveBeenCalledTimes(1); });
 it('retries timeouts and returns the canonical entry', async () => { vi.useFakeTimers(); try { const rpc=vi.fn().mockResolvedValueOnce({data:null,error:{code:'57014'}}).mockResolvedValue({data:[{name:'Gypaète barbu'}],error:null}); const promise=matchCatalogueSpecies({rpc},'Gypaete barbu',null); await vi.runAllTimersAsync(); expect(await promise).toEqual({name:'Gypaète barbu'}); expect(rpc).toHaveBeenCalledTimes(2); } finally {vi.useRealTimers();} });
 it('fails closed after exhausted retries', async () => { vi.useFakeTimers(); try { const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'57014'}}); const assertion=expect(matchCatalogueSpecies({rpc},'Gypaète barbu',null)).rejects.toThrow('57014'); await vi.runAllTimersAsync(); await assertion; expect(rpc).toHaveBeenCalledTimes(5); } finally {vi.useRealTimers();} });
 it('propagates a transport failure', async () => { await expect(matchCatalogueSpecies({rpc:vi.fn().mockRejectedValue(new Error('offline'))},'Gypaète barbu',null)).rejects.toThrow('offline'); });
});

describe('Photo-based identity correction', () => {
 const conflict = {data:null,error:{code:'P0001',message:'SPECIES_IDENTITY_CONFLICT'}};
 it('rechecks once and validates the corrected pair without merging distinct species', async () => {
  let identity={name:'Criquet des ajoncs',scientific:'Omocestus viridulus'};
  const rpc=vi.fn().mockResolvedValueOnce(conflict).mockResolvedValueOnce({data:[{name:'Criquet verdelet',scientific_name:'Omocestus viridulus'}],error:null});
  const recheck=vi.fn(async()=>{identity={name:'Criquet verdelet',scientific:'Omocestus viridulus'};return true});
  expect(await matchCatalogueWithIdentityRecheck({rpc},()=>identity,recheck)).toEqual({name:'Criquet verdelet',scientific_name:'Omocestus viridulus'});
  expect(rpc).toHaveBeenLastCalledWith('match_animal',{p_name:'Criquet verdelet',p_scientific:'Omocestus viridulus'});
  expect(recheck).toHaveBeenCalledTimes(1);
 });
 it('does not accept a conflict that persists after the photo recheck', async () => {
  const rpc=vi.fn().mockResolvedValue(conflict); const recheck=vi.fn().mockResolvedValue(true);
  await expect(matchCatalogueWithIdentityRecheck({rpc},()=>({name:'Criquet des ajoncs',scientific:'Omocestus viridulus'}),recheck)).rejects.toBeInstanceOf(CatalogueLookupError);
  expect(recheck).toHaveBeenCalledTimes(1); expect(rpc).toHaveBeenCalledTimes(2);
 });
 it('does not retry an inconclusive correction or drop the scientific name', async () => {
  const rpc=vi.fn().mockResolvedValue(conflict);const recheck=vi.fn().mockResolvedValue(false);
  await expect(matchCatalogueWithIdentityRecheck({rpc},()=>({name:'Labrador',scientific:'Canis lupus familiaris'}),recheck)).rejects.toMatchObject({identityConflict:true});
  expect(rpc).toHaveBeenCalledTimes(1);
 });
 it('does not mistake an outage for an identity contradiction', async () => {
  const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'42702'}});const recheck=vi.fn();
  await expect(matchCatalogueWithIdentityRecheck({rpc},()=>({name:'Gypaète barbu',scientific:null}),recheck)).rejects.toThrow('42702');
  expect(recheck).not.toHaveBeenCalled();
 });
 it('still rechecks after a transient database retry', async () => {
  vi.useFakeTimers();try {
   const rpc=vi.fn().mockResolvedValueOnce({data:null,error:{code:'57014'}}).mockResolvedValueOnce(conflict).mockResolvedValueOnce({data:[{name:'Criquet verdelet'}],error:null});
   const recheck=vi.fn().mockResolvedValue(true);
   const promise=matchCatalogueWithIdentityRecheck({rpc},()=>({name:'Criquet verdelet',scientific:'Omocestus viridulus'}),recheck);
   await vi.runAllTimersAsync();expect(await promise).toEqual({name:'Criquet verdelet'});expect(recheck).toHaveBeenCalledTimes(1);
  } finally {vi.useRealTimers()}
 });
});