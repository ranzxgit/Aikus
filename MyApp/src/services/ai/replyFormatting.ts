export function stripMarkdown(reply: string): string {
  return reply
    .replace(/[*#`]/g, '')
    .replace(/^\s*-\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .trim();
}
