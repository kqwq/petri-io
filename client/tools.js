const tools = {
  randColor: () => {
    return (
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')
    )
  },
  /**
   *
   * @returns {string} Hex color
   */
  randFullSaturationColor: () => {
    const h = Math.floor(Math.random() * 360)
    const s = 1
    const l = 0.5
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r, g, b
    if (h < 60) {
      ;[r, g, b] = [c, x, 0]
    } else if (h < 120) {
      ;[r, g, b] = [x, c, 0]
    } else if (h < 180) {
      ;[r, g, b] = [0, c, x]
    } else if (h < 240) {
      ;[r, g, b] = [0, x, c]
    } else if (h < 300) {
      ;[r, g, b] = [x, 0, c]
    } else {
      ;[r, g, b] = [c, 0, x]
    }
    r = Math.floor((r + m) * 255)
      .toString(16)
      .padStart(2, '0')
    g = Math.floor((g + m) * 255)
      .toString(16)
      .padStart(2, '0')
    b = Math.floor((b + m) * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${r}${g}${b}`
  },
  lerpColor: (aIn, bIn, amount) => {
    const aHex = parseInt(aIn.slice(1), 16)
    const bHex = parseInt(bIn.slice(1), 16)
    const r1 = aHex >> 16
    const g1 = (aHex >> 8) & 0xff
    const b1 = aHex & 0xff
    const r2 = bHex >> 16
    const g2 = (bHex >> 8) & 0xff
    const b2 = bHex & 0xff
    const r = Math.round(r1 + (r2 - r1) * amount)
    const g = Math.round(g1 + (g2 - g1) * amount)
    const b = Math.round(b1 + (b2 - b1) * amount)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  },
  rantInt: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  /**
   * Get font color based on background color
   */
  getFontColor: (isDarkMode) => {
    return isDarkMode ? '#ffffff' : '#000000'
  },
}

export { tools }
