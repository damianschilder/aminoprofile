// Reads entries from a .zip file (also .xlsx, which is a zip) without any dependency: the central
// directory, ZIP64 sizes and offsets, stored and deflated entries. Enough for the source files
// of the food dataset, which are read whole into memory.

import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06])
const ZIP64_LOCATOR = Buffer.from([0x50, 0x4b, 0x06, 0x07])

export function openZip(path) {
  const buf = readFileSync(path)
  const eocd = buf.lastIndexOf(EOCD)
  if (eocd < 0) throw new Error(`${path} is not a zip file`)
  let count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  if (count === 0xffff || p === 0xffffffff) {
    const locator = buf.lastIndexOf(ZIP64_LOCATOR)
    const end64 = Number(buf.readBigUInt64LE(locator + 8))
    count = Number(buf.readBigUInt64LE(end64 + 32))
    p = Number(buf.readBigUInt64LE(end64 + 48))
  }
  const entries = new Map()
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    let csize = buf.readUInt32LE(p + 20)
    let usize = buf.readUInt32LE(p + 24)
    const nameLength = buf.readUInt16LE(p + 28)
    const extraLength = buf.readUInt16LE(p + 30)
    const commentLength = buf.readUInt16LE(p + 32)
    let offset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLength)
    for (let e = p + 46 + nameLength; e < p + 46 + nameLength + extraLength;) {
      const id = buf.readUInt16LE(e)
      const size = buf.readUInt16LE(e + 2)
      if (id === 1) {
        let q = e + 4
        if (usize === 0xffffffff) { usize = Number(buf.readBigUInt64LE(q)); q += 8 }
        if (csize === 0xffffffff) { csize = Number(buf.readBigUInt64LE(q)); q += 8 }
        if (offset === 0xffffffff) offset = Number(buf.readBigUInt64LE(q))
      }
      e += 4 + size
    }
    entries.set(name, { method, csize, offset })
    p += 46 + nameLength + extraLength + commentLength
  }
  return {
    names: () => [...entries.keys()],
    /** The entry's bytes, or null when the zip has no such entry. */
    read(name) {
      const entry = entries.get(name)
      if (!entry) return null
      const start = entry.offset + 30 + buf.readUInt16LE(entry.offset + 26) + buf.readUInt16LE(entry.offset + 28)
      const data = buf.subarray(start, start + entry.csize)
      if (entry.method === 0) return Buffer.from(data)
      if (entry.method === 8) return inflateRawSync(data)
      throw new Error(`${name}: unsupported compression method ${entry.method}`)
    },
  }
}
