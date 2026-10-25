export type NativePushPayload = { title: string; body: string; url: string; tag: string }

export function nativePushPreference(template: string): string | null {
  if (template === 'capture-like') return 'notify_push_likes'
  if (template === 'capture-comment') return 'notify_push_comments'
  if (template === 'new-follower') return 'notify_push_follows'
  return null
}

export function nativeEmailPayload(template: string, data: Record<string, unknown>, locale: string, tag: string): NativePushPayload | null {
  const en = locale === 'en'
  const name = String(data.animalName ?? '')
  const messages: Record<string, [string, string, string]> = {
    'account-blocked': [en ? 'Account suspended' : 'Compte suspendu', en ? 'Your account has been suspended. Check your email for details.' : 'Ton compte a été suspendu. Consulte ton e-mail pour les détails.', '/auth'],
    'inactivity-email': ['Faunex 🌿', en ? 'Nature is waiting for you. Discover new animals!' : 'La nature t’attend. Pars découvrir de nouveaux animaux !', '/home'],
    'reengagement-j2': ['Faunex 🌿', en ? 'Your next discovery is waiting for you!' : 'Ta prochaine découverte t’attend !', '/home'],
    'no-capture-j7': ['Faunex 🌿', en ? 'Start your collection with your first animal photo.' : 'Commence ta collection avec ta première photo d’animal.', '/capture'],
    'premium-recap': [en ? 'Your Premium recap' : 'Ton récap Premium', en ? `${data.captures ?? 0} captures and ${data.species ?? 0} species during your Premium period. See your recap by email.` : `${data.captures ?? 0} captures et ${data.species ?? 0} espèces pendant ta période Premium. Retrouve ton récap par e-mail.`, '/home'],
  }
  if (template === 'capture-approved') return { title: en ? 'Capture approved 🎉' : 'Capture validée 🎉', body: en ? `${name} joins your bestiary!` : `${name} rejoint ton bestiaire !`, url: safeNativePath(data.captureUrl, '/home'), tag }
  if (template === 'capture-rejected') {
    const reasons: Record<string, [string, string]> = {
      duplicate: ['Tu possèdes déjà cette espèce dans ton bestiaire.', 'You already have this species in your bestiary.'],
      dead_animal: ['Les animaux morts ou cadavres ne sont pas acceptés sur Faunex.', 'Dead animals or carcasses are not accepted on Faunex.'],
      internet_image: ['Les images provenantant d’Internet ne sont pas acceptées. Partage tes propres photos.', 'Images from the Internet are not accepted. Share your own photos.'],
      captured_animal: ['Les animaux capturés ou pêchés par l’humain ne sont pas acceptés, même relâchés ensuite.', 'Animals caught or fished by humans are not accepted, even if released afterwards.'],
      human: ['Les photos d’humains ne sont pas acceptées sur Faunex.', 'Photos of humans are not accepted on Faunex.'],
      not_identifiable: [`${name} n’a pas pu être identifiée. Retente avec une photo plus nette.`, `${name} could not be identified. Try a clearer photo.`],
    }
    const message = reasons[String(data.reason)] ?? reasons.not_identifiable
    return { title: en ? 'Capture not approved' : 'Capture non validée', body: message[en ? 1 : 0], url: '/capture', tag }
  }
  const message = messages[template]
  return message ? { title: message[0], body: message[1], url: message[2], tag } : null
}

export function safeNativePath(value: unknown, fallback = '/notifications'): string {
  if (typeof value !== 'string') return fallback
  try {
    const url = new URL(value, 'https://faunex.fr')
    if (!['faunex.fr', 'www.faunex.fr', 'faunex.lovable.app'].includes(url.hostname)) return fallback
    const path = url.pathname + url.search
    return /^\/(home|capture|explorers|notifications|auth|bestiaire|premium|settings)(\/|\?|$)/.test(path) ? path : fallback
  } catch { return fallback }
}