/** Only explicitly entered common names may override a scientific-only correction. */
export function scientificOnlyOverride(body: {
  force_name?: unknown;
  scientific_name?: unknown;
  animal_name?: unknown;
  common_name_supplied?: unknown;
}) {
  return body.force_name === true &&
    typeof body.scientific_name === 'string' && body.scientific_name.trim().length > 0 &&
    (body.common_name_supplied === false ||
      (body.common_name_supplied === undefined && !String(body.animal_name ?? '').trim()));
}