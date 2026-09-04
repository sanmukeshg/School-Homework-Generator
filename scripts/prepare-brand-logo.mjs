/**
 * Prepares `public/brand/factory-ai.png` from the master artwork in `brand/`.
 *
 * The master is a 1254px RGB export whose rounded corners are filled with
 * black. Shipping it unchanged would put four dark wedges on the brand card and
 * add ~660KB to the precached bundle, so this script:
 *
 *   1. makes the corner fill transparent, by flooding inwards from the border
 *      over near-black pixels only — the artwork's navy is nowhere near it, and
 *      the flood cannot reach the interior because the white card encloses it;
 *   2. resamples to 384px with an area-average filter, matching the size the
 *      previous asset shipped at;
 *   3. re-encodes as RGBA.
 *
 * Zero dependencies, in the same spirit as `generate-icons.mjs`.
 * Re-run with `npm run brand` whenever the master artwork changes.
 */
import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'brand', 'Brand Logo.PNG')
const TARGET = join(ROOT, 'public', 'brand', 'factory-ai.png')
const SIZE = 384
/** A pixel this dark is corner fill, never artwork. */
const DARK = 40

/* --------------------------------- decode -------------------------------- */

function decodePng(buf) {
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]
  const interlace = buf[28]

  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG: depth ${bitDepth}, colour ${colorType}, interlace ${interlace}`)
  }

  const parts = []
  let offset = 8
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset)
    if (buf.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      parts.push(buf.subarray(offset + 8, offset + 8 + length))
    }
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(parts))
  const bpp = colorType === 6 ? 4 : 3
  const stride = width * bpp
  const px = Buffer.alloc(height * stride)

  // Undo the per-scanline filters (PNG spec 9.2).
  let read = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[read]
    read += 1
    const line = raw.subarray(read, read + stride)
    read += stride

    const cur = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = x >= bpp && prev ? prev[x - bpp] : 0
      let value = line[x]

      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = value & 0xff
    }
  }

  // Normalise to RGBA so the rest of the script has one shape to think about.
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0, j = 0; i < width * height; i += 1, j += bpp) {
    rgba[i * 4] = px[j]
    rgba[i * 4 + 1] = px[j + 1]
    rgba[i * 4 + 2] = px[j + 2]
    rgba[i * 4 + 3] = bpp === 4 ? px[j + 3] : 255
  }
  return { width, height, rgba }
}

/* ------------------------- corner fill -> transparent --------------------- */

/**
 * Flood fill inwards from every border pixel, crossing only near-black pixels.
 * Anything reached is background and becomes fully transparent.
 */
function clearCornerFill({ width, height, rgba }) {
  const seen = new Uint8Array(width * height)
  const stack = []

  const isDark = (i) => rgba[i * 4] < DARK && rgba[i * 4 + 1] < DARK && rgba[i * 4 + 2] < DARK

  const push = (x, y) => {
    const i = y * width + x
    if (seen[i] || !isDark(i)) return
    seen[i] = 1
    stack.push(i)
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y)
    push(width - 1, y)
  }

  let cleared = 0
  while (stack.length > 0) {
    const i = stack.pop()
    const x = i % width
    const y = (i - x) / width
    rgba[i * 4 + 3] = 0
    cleared += 1
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }
  return cleared
}

/* --------------------------------- resize -------------------------------- */

/**
 * Area-average resample. Alpha is premultiplied while averaging so the pixels
 * that were just cleared cannot bleed black into the rounded edge.
 */
function resize({ width, height, rgba }, size) {
  const out = Buffer.alloc(size * size * 4)
  const scaleX = width / size
  const scaleY = height / size

  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor(y * scaleY)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scaleY))

    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor(x * scaleX)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scaleX))

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0

      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * width + sx) * 4
          const alpha = rgba[i + 3] / 255
          r += rgba[i] * alpha
          g += rgba[i + 1] * alpha
          b += rgba[i + 2] * alpha
          a += rgba[i + 3]
          n += 1
        }
      }

      const o = (y * size + x) * 4
      // Un-premultiply: the sums are of colour*alpha over n samples, so
      // dividing by the alpha sum (not by n) recovers the flat colour.
      const k = a > 0 ? 255 / a : 0
      out[o] = Math.round(Math.min(255, r * k))
      out[o + 1] = Math.round(Math.min(255, g * k))
      out[o + 2] = Math.round(Math.min(255, b * k))
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

/* --------------------------------- encode -------------------------------- */

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
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function encodePng(rgba, size) {
  const stride = size * 4
  // Filter 1 (Sub) beats None on this artwork's long flat runs.
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y += 1) {
    const at = y * (stride + 1)
    raw[at] = 1
    for (let x = 0; x < stride; x += 1) {
      const value = rgba[y * stride + x]
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0
      raw[at + 1 + x] = (value - left) & 0xff
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------------------------------- run ---------------------------------- */

const source = decodePng(readFileSync(SOURCE))
const cleared = clearCornerFill(source)
const resized = resize(source, SIZE)
const png = encodePng(resized, SIZE)
writeFileSync(TARGET, png)

console.log(
  `${source.width}x${source.height} -> ${SIZE}x${SIZE}, ` +
    `${cleared} corner pixels cleared, ${(png.length / 1024).toFixed(0)}KB written`
)
