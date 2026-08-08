export interface DecodedPixel {
  x: number
  y: number
  colorIndex: number
}

/** Decode on-chain Stroke.data — 3 bytes per pixel (x, y, palette index). */
export function decodeStrokeData(hex: string): DecodedPixel[] {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex
  const pixels: DecodedPixel[] = []
  for (let i = 0; i + 6 <= raw.length; i += 6) {
    pixels.push({
      x: parseInt(raw.slice(i, i + 2), 16),
      y: parseInt(raw.slice(i + 2, i + 4), 16),
      colorIndex: parseInt(raw.slice(i + 4, i + 6), 16),
    })
  }
  return pixels
}

export interface StrokeReplayFrame {
  strokeIndex: number
  pixels: DecodedPixel[]
}

/** Expand stroke list into sequential replay frames. */
export function buildStrokeReplayFrames(strokeDataList: string[]): StrokeReplayFrame[] {
  return strokeDataList.map((data, strokeIndex) => ({
    strokeIndex,
    pixels: decodeStrokeData(data),
  }))
}
