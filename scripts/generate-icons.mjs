/**
 * Generates the PWA icon set with zero dependencies.
 *
 * The icons are committed to the repo, so this only needs re-running when the
 * artwork changes: `npm run icons`.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

/* ----------------------------- tiny PNG writer ---------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = -1
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ------------------------------ tiny canvas ------------------------------ */

function createCanvas(size) {
  const data = Buffer.alloc(size * size * 4)

  const setPixel = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    // Simple source-over blend so soft edges look right.
    const alpha = a / 255
    data[i] = Math.round(data[i] * (1 - alpha) + r * alpha)
    data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + g * alpha)
    data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + b * alpha)
    data[i + 3] = Math.max(data[i + 3], a)
  }

  const fillRect = (x, y, w, h, color) => {
    for (let py = Math.round(y); py < Math.round(y + h); py += 1) {
      for (let px = Math.round(x); px < Math.round(x + w); px += 1) setPixel(px, py, color)
    }
  }

  const fillRoundedRect = (x, y, w, h, radius, color) => {
    for (let py = Math.round(y); py < Math.round(y + h); py += 1) {
      for (let px = Math.round(x); px < Math.round(x + w); px += 1) {
        const dx = Math.min(px - x, x + w - 1 - px)
        const dy = Math.min(py - y, y + h - 1 - py)
        if (dx < radius && dy < radius) {
          const dist = Math.hypot(radius - dx, radius - dy)
          if (dist > radius) continue
        }
        setPixel(px, py, color)
      }
    }
  }

  return { data, size, fillRect, fillRoundedRect }
}

const HEX = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  255
]

const RAINBOW = ['#fbbf24', '#a3e635', '#22d3ee', '#f472b6', '#c084fc', '#2dd4bf', '#facc15']

/**
 * Draws the chalkboard almanac mark: a wooden frame, the rainbow ALMANAC bars,
 * two chalk lines and the chalk tray.
 */
function drawIcon(size, { padding = 0 } = {}) {
  const canvas = createCanvas(size)
  const u = size / 100 // one "unit" = 1% of the icon
  const pad = padding * size

  // Maskable icons must paint edge to edge; the padding is safe-zone, not margin.
  if (pad > 0) canvas.fillRect(0, 0, size, size, HEX('#0b1928'))

  const boardX = pad
  const boardY = pad
  const boardSize = size - pad * 2
  const radius = boardSize * 0.2

  // Wooden frame
  canvas.fillRoundedRect(boardX, boardY, boardSize, boardSize, radius, HEX('#78350f'))
  // Chalkboard
  const inset = boardSize * 0.07
  canvas.fillRoundedRect(
    boardX + inset,
    boardY + inset,
    boardSize - inset * 2,
    boardSize - inset * 2,
    radius * 0.72,
    HEX('#0b1928')
  )

  // ALMANAC rainbow blocks
  const barTop = boardY + boardSize * 0.26
  const barH = boardSize * 0.13
  const gutter = boardSize * 0.02
  const usable = boardSize - inset * 2 - boardSize * 0.14
  const barW = (usable - gutter * (RAINBOW.length - 1)) / RAINBOW.length
  let x = boardX + inset + boardSize * 0.07
  for (const color of RAINBOW) {
    canvas.fillRoundedRect(x, barTop, barW, barH, Math.max(1, barW * 0.25), HEX(color))
    x += barW + gutter
  }

  // Two chalk lines standing in for the homework rows
  const lineX = boardX + inset + boardSize * 0.09
  const lineW = boardSize - inset * 2 - boardSize * 0.18
  canvas.fillRoundedRect(lineX, barTop + barH + 7 * u, lineW, 5 * u, 2.5 * u, [226, 232, 240, 235])
  canvas.fillRoundedRect(
    lineX,
    barTop + barH + 15 * u,
    lineW * 0.66,
    5 * u,
    2.5 * u,
    [148, 163, 184, 220]
  )

  // Chalk tray
  canvas.fillRoundedRect(
    boardX + inset,
    boardY + boardSize - inset - 9 * u,
    boardSize - inset * 2,
    7 * u,
    3 * u,
    HEX('#b45309')
  )

  return encodePng(size, size, canvas.data)
}

mkdirSync(OUT_DIR, { recursive: true })

const outputs = [
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],
  ['apple-touch-icon.png', drawIcon(180)],
  // Maskable icons need ~10% safe padding on every side.
  ['maskable-512.png', drawIcon(512, { padding: 0.11 })]
]

for (const [name, buffer] of outputs) {
  writeFileSync(join(OUT_DIR, name), buffer)
  console.log(`wrote public/icons/${name} (${buffer.length} bytes)`)
}
