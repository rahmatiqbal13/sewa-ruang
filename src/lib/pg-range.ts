// Parse PostgreSQL TSTZRANGE string: `["2026-06-30 00:00:00+00","2026-07-02 01:00:00+00")`
export function parseTstzrange(slot: string): { start: string; end: string } | null {
  const match = slot.match(/\["([^"]+)","([^"]+)"\)/)
  if (!match) return null
  // PostgreSQL format: "2026-06-30 00:00:00+00" -> convert space to T for ISO compatibility
  const start = match[1].replace(' ', 'T')
  const end = match[2].replace(' ', 'T')
  return { start, end }
}

// Safe date parser that handles both ISO and PostgreSQL formats
export function safeParseDate(dateStr: string): Date | null {
  const normalized = dateStr.replace(' ', 'T')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}
