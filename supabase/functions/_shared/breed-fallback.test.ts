import { assertEquals } from "jsr:@std/assert";
import { breedFallbackName as f } from "./visual-identification-policy.ts";
Deno.test("uncertain horse breed falls back to species", () => assertEquals(f("Cheval de trait breton", "Equus caballus", 60), "Cheval domestique"));
Deno.test("confident horse breed kept", () => assertEquals(f("Cheval de trait breton", "Equus caballus", 90), null));
Deno.test("uncertain dog breed falls back", () => assertEquals(f("Berger australien", "Canis familiaris", 70), "Chien domestique"));
Deno.test("wild species untouched", () => assertEquals(f("Loup gris", "Canis lupus", 50), null));
Deno.test("chicken rule still applies", () => assertEquals(f("Poule Sussex", "Gallus gallus domesticus", 60), "Poule domestique"));
