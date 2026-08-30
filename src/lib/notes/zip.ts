/**
 * A minimal ZIP writer, stored (uncompressed).
 *
 * Exporting a library one file at a time is not an export — nobody clicks
 * download forty times — so the whole thing has to come out as one archive.
 * That needs a zip, and the options were a dependency or about seventy lines
 * of a format that has not changed since 1993.
 *
 * Seventy lines won. A zip library is a large amount of trusted code for one
 * button, and STORED entries need no compressor at all: the format is a local
 * header per file, then a central directory, then a twenty-two byte end
 * record. Markdown compresses well, but a student exporting their notes cares
 * that the file opens, not that it is 200KB instead of 600KB.
 *
 * Deliberately not streaming and not zip64: the whole archive is built in
 * memory, which is correct for a few hundred text files and would be wrong for
 * gigabytes of media. If this ever has to carry attachments, replace it.
 *
 * Pure apart from the Blob at the end, and the parts that matter — the CRC and
 * the byte layout — are tested against known values.
 */

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) {
      // 0xEDB88320 is the reversed polynomial every zip implementation uses.
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  /** UTF-8 text. This writer carries no binary payloads by design. */
  text: string;
}

/**
 * MS-DOS date and time, which is what the format stores.
 *
 * Two seconds of resolution and an epoch of 1980, both of which are the
 * format's problem rather than ours. Anything before 1980 is clamped, because
 * a negative year field produces an archive some tools refuse to open.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

class ByteWriter {
  private parts: number[] = [];

  u16(value: number): void {
    this.parts.push(value & 0xff, (value >>> 8) & 0xff);
  }

  u32(value: number): void {
    this.parts.push(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff,
    );
  }

  bytes(data: Uint8Array): void {
    for (const byte of data) this.parts.push(byte);
  }

  get length(): number {
    return this.parts.length;
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.parts);
  }
}

/** Builds the archive. Returns the raw bytes so callers can Blob or hash them. */
export function buildZip(entries: ZipEntry[], now: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);

  const local = new ByteWriter();
  const central = new ByteWriter();
  const offsets: number[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.text);
    const crc = crc32(dataBytes);

    offsets.push(local.length);

    // Local file header.
    local.u32(0x04034b50);
    local.u16(20); // version needed
    // Bit 11 marks the name as UTF-8. Without it, anything outside ASCII —
    // "Tuón", any Filipino title with an ñ — unzips as mojibake on Windows.
    local.u16(0x0800);
    local.u16(0); // stored, no compression
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(dataBytes.length); // compressed size == uncompressed
    local.u32(dataBytes.length);
    local.u16(nameBytes.length);
    local.u16(0); // extra field length
    local.bytes(nameBytes);
    local.bytes(dataBytes);

    // Central directory entry, written as we go.
    central.u32(0x02014b50);
    central.u16(20); // version made by
    central.u16(20); // version needed
    central.u16(0x0800);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(dataBytes.length);
    central.u32(dataBytes.length);
    central.u16(nameBytes.length);
    central.u16(0); // extra
    central.u16(0); // comment
    central.u16(0); // disk number
    central.u16(0); // internal attributes
    central.u32(0); // external attributes
    central.u32(offsets[offsets.length - 1]);
    central.bytes(nameBytes);
  }

  const out = new ByteWriter();
  out.bytes(local.toUint8Array());
  out.bytes(central.toUint8Array());

  // End of central directory.
  out.u32(0x06054b50);
  out.u16(0); // this disk
  out.u16(0); // disk with central directory
  out.u16(entries.length);
  out.u16(entries.length);
  out.u32(central.length);
  out.u32(local.length);
  out.u16(0); // comment length

  return out.toUint8Array();
}

/** Triggers the download. The only part of this file that touches the DOM. */
export function downloadZip(filename: string, entries: ZipEntry[]): void {
  const bytes = buildZip(entries);
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
