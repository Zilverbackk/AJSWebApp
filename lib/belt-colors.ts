import type { BeltRank } from './types'

export const beltColors: Record<BeltRank, string> = {
  white: 'bg-gray-100 text-gray-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  brown: 'bg-amber-100 text-amber-800',
  black: 'bg-gray-900 text-white',
}

export function getBeltColor(rank: BeltRank | null | undefined): string {
  if (!rank) return 'bg-gray-100 text-gray-500'
  return beltColors[rank] ?? 'bg-gray-100 text-gray-500'
}
