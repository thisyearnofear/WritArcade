import type { ComicBookFinalePanelData } from './comic-book-finale'

/**
 * Composites all comic panels into a single downloadable PNG using canvas.
 *
 * Extracted from ComicBookFinale to isolate the imperative canvas drawing logic
 * (polyfills, text wrapping, image loading) from the React component tree.
 */
export function downloadComicAsImage(
  panels: ComicBookFinalePanelData[],
  gameTitle: string,
  genre: string,
  primaryColor: string,
): void {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Add roundRect polyfill if not available
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, width: number, height: number, radius: number) {
      if (width < 2 * radius) radius = width / 2;
      if (height < 2 * radius) radius = height / 2;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + width, y, x + width, y + height, radius);
      this.arcTo(x + width, y + height, x, y + height, radius);
      this.arcTo(x, y + height, x, y, radius);
      this.arcTo(x, y, x + width, y, radius);
      this.closePath();
      return this;
    };
  }

  const totalPanels = panels.length
  const canvasWidth = 800
  const canvasHeight = totalPanels > 0 ? 600 + (totalPanels * 500) : 800
  const padding = 40
  const headerHeight = 120

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  // Fill background with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  gradient.addColorStop(0, '#1a1a1a')
  gradient.addColorStop(1, '#000000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Add title header
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 36px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(gameTitle, canvasWidth / 2, 60)

  ctx.fillStyle = '#AAAAAA'
  ctx.font = '18px Arial'
  ctx.fillText(`${genre} • ${totalPanels} Panels • writersarcade`, canvasWidth / 2, 100)

  // Center line separator
  ctx.strokeStyle = `${primaryColor}40`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padding, headerHeight)
  ctx.lineTo(canvasWidth - padding, headerHeight)
  ctx.stroke()

  let loadedImages = 0
  const totalImages = panels.filter(p => p.imageUrl).length

  const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ')
    let line = ''
    let currentY = y

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY)
        line = words[n] + ' '
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
    return currentY
  }

  const drawPanel = (panel: ComicBookFinalePanelData, idx: number, yPosition: number) => {
    const drawTextBlock = () => {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '16px Arial'
      ctx.textAlign = 'left'

      const maxWidth = 700
      const lineHeight = 20
      const textX = (canvasWidth - maxWidth) / 2
      const textY = panel.imageUrl ? yPosition + 320 + 20 : yPosition + 20

      const finalY = wrapText(panel.narrativeText, textX, textY, maxWidth, lineHeight)

      // Add separator between panels
      if (idx < totalPanels - 1) {
        ctx.strokeStyle = '#444444'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(padding, finalY + 60)
        ctx.lineTo(canvasWidth - padding, finalY + 60)
        ctx.stroke()
      }

      loadedImages++
      if (loadedImages === totalImages || totalImages === 0) {
        const link = document.createElement('a')
        link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    }

    if (panel.imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const imageWidth = 640
        const imageHeight = 320
        const imageX = (canvasWidth - imageWidth) / 2
        const imageY = yPosition

        ctx.save()
        ctx.beginPath()
        ctx.roundRect(imageX, imageY, imageWidth, imageHeight, 12)
        ctx.clip()
        ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight)
        ctx.restore()

        drawTextBlock()
      }
      img.src = panel.imageUrl
    } else {
      drawTextBlock()
    }
  }

  panels.forEach((panel, idx) => {
    const yPosition = headerHeight + padding + (idx * 500)
    drawPanel(panel, idx, yPosition)
  })

  // If no panels, just download the text version
  if (totalPanels === 0) {
    const link = document.createElement('a')
    link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
}
