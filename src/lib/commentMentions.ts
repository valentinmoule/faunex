export function activeMention(value: string, cursor = value.length) {
  const match = value.slice(0, cursor).match(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_.-]*)$/u);
  if (!match) return null;
  return { query: match[1], start: cursor - match[1].length - 1, end: cursor };
}

export function insertMention(value: string, range: { start: number; end: number }, username: string) {
  return value.slice(0, range.start) + '@' + username.replace(/^@+/, '') + ' ' + value.slice(range.end);
}