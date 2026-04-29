export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers, HTTPS)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  
  // Fallback for older browsers and HTTP
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    return Array.from(bytes).map((b, i) => {
      const hex = b.toString(16).padStart(2, '0')
      return [4, 6, 8, 10].includes(i) ? `-${hex}` : hex
    }).join('')
  }

  // Final fallback using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const HEATMAP_ZONES = [
  'pass_line', 'dont_pass',
  'come', 'dont_come',
  'field',
  'place_2', 'place_3', 'place_4', 'place_5', 'place_6',
  'place_8', 'place_9', 'place_10', 'place_11', 'place_12',
  'buy_4', 'buy_5', 'buy_6', 'buy_8', 'buy_9', 'buy_10',
  'hard_4', 'hard_6', 'hard_8', 'hard_10',
  'any_seven', 'horn', 'any_craps', 'ce'
] as const

export type HeatmapZone = typeof HEATMAP_ZONES[number]

export interface HeatmapSuggestion {
  id: string
  table_code: string
  participant_id: string
  zone: HeatmapZone
  signal: 'bet' | 'pull'
  updated_at: string
}

export interface ZoneHeatmap {
  betPercent: number
  pullPercent: number
  totalVoters: number
}
