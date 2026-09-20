export const BUS_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16h-1.05a2.25 2.25 0 0 1-4.4 0h-3.1a2.25 2.25 0 0 1-4.4 0H5V6.5ZM7 7v4h10V7H7Zm1.25 10.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>'

export function occupancyColor(raw?: string) {
  switch (raw) {
    case 'EMPTY':
    case 'MANY_SEATS_AVAILABLE':
      return '#2f9e44'
    case 'FEW_SEATS_AVAILABLE':
      return '#f08c00'
    case 'STANDING_ROOM_ONLY':
    case 'CRUSHED_STANDING_ROOM_ONLY':
      return '#e8590c'
    case 'FULL':
      return '#e03131'
    default:
      return '#495057'
  }
}

export function occupancyBucket(raw?: string) {
  switch (raw) {
    case 'EMPTY':
    case 'MANY_SEATS_AVAILABLE':
      return 'available'
    case 'FEW_SEATS_AVAILABLE':
      return 'few'
    case 'STANDING_ROOM_ONLY':
    case 'CRUSHED_STANDING_ROOM_ONLY':
      return 'crowded'
    case 'FULL':
      return 'full'
    default:
      return ''
  }
}

export function occupancyLabel(raw?: string) {
  if (!raw) return 'Unknown'
  return raw.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export const occupancyOpts = [
  { id: 'available', label: 'Available', color: occupancyColor('EMPTY') },
  { id: 'few', label: 'Few seats', color: occupancyColor('FEW_SEATS_AVAILABLE') },
  { id: 'crowded', label: 'Crowded', color: occupancyColor('STANDING_ROOM_ONLY') },
  { id: 'full', label: 'Full', color: occupancyColor('FULL') },
]

export const motionOpts = [
  { id: 'moving', label: 'Moving' },
  { id: 'stopped', label: 'Stopped' },
]
