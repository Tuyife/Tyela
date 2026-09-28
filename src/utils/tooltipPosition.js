// Smart tooltip positioning: tries bottom, then top, then right, then left,
// then falls back to the middle of the screen. Clamps so the card never
// goes off-screen and keeps a consistent gap from the spotlight.
export const TOOLTIP_GAP = 18
export const TOOLTIP_DEFAULT = { width: 320, height: 380 }

export function getTooltipPosition(rect, tooltipWidth, tooltipHeight) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const clamp = (left, top) => ({
    left: Math.min(Math.max(TOOLTIP_GAP, left), Math.max(TOOLTIP_GAP, vw - tooltipWidth - TOOLTIP_GAP)),
    top: Math.min(Math.max(TOOLTIP_GAP, top), Math.max(TOOLTIP_GAP, vh - tooltipHeight - TOOLTIP_GAP))
  })

  const cx = rect.left + rect.width / 2 - tooltipWidth / 2
  const cy = rect.top + rect.height / 2 - tooltipHeight / 2

  if (rect.bottom + tooltipHeight + TOOLTIP_GAP <= vh) {
    return { ...clamp(cx, rect.bottom + TOOLTIP_GAP), side: 'bottom' }
  }
  if (rect.top - tooltipHeight - TOOLTIP_GAP >= 0) {
    return { ...clamp(cx, rect.top - tooltipHeight - TOOLTIP_GAP), side: 'top' }
  }
  if (rect.right + tooltipWidth + TOOLTIP_GAP <= vw) {
    return { ...clamp(rect.right + TOOLTIP_GAP, cy), side: 'right' }
  }
  if (rect.left - tooltipWidth - TOOLTIP_GAP >= 0) {
    return { ...clamp(rect.left - tooltipWidth - TOOLTIP_GAP, cy), side: 'left' }
  }
  return { left: vw / 2 - tooltipWidth / 2, top: vh / 2 - tooltipHeight / 2, side: 'center' }
}

// Center position used when there is no element to spotlight.
export function getCenteredPosition(tooltipWidth, tooltipHeight) {
  return {
    left: window.innerWidth / 2 - tooltipWidth / 2,
    top: window.innerHeight / 2 - tooltipHeight / 2,
    side: 'center'
  }
}