/*************************************************************
 * SE1FileReader — ArrayBuffer-based binary reader for .se1 files
 *
 * Replaces FILE*, fopen(), fread(), fseek(), fclose() from the C code.
 * All .se1 binary data is little-endian.
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

export class SE1FileReader {
  private view: DataView;
  private pos: number = 0;
  private le: boolean = true; // little-endian by default

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  /** Set endianness for all subsequent reads */
  setLittleEndian(littleEndian: boolean): void {
    this.le = littleEndian;
  }

  get isLittleEndian(): boolean {
    return this.le;
  }

  get length(): number {
    return this.view.byteLength;
  }

  get position(): number {
    return this.pos;
  }

  get eof(): boolean {
    return this.pos >= this.view.byteLength;
  }

  seekSet(offset: number): void {
    if (!Number.isFinite(offset) || offset < 0) {
      throw new RangeError(
        `seekSet: invalid offset ${offset} (buffer length ${this.view.byteLength})`,
      );
    }
    this.pos = offset;
  }

  seekCur(offset: number): void {
    const newPos = this.pos + offset;
    if (!Number.isFinite(newPos) || newPos < 0) {
      throw new RangeError(
        `seekCur: invalid resulting position ${newPos} (buffer length ${this.view.byteLength})`,
      );
    }
    this.pos = newPos;
  }

  readInt32(): number {
    const v = this.view.getInt32(this.pos, this.le);
    this.pos += 4;
    return v;
  }

  readUint32(): number {
    const v = this.view.getUint32(this.pos, this.le);
    this.pos += 4;
    return v;
  }

  readInt16(): number {
    const v = this.view.getInt16(this.pos, this.le);
    this.pos += 2;
    return v;
  }

  readUint16(): number {
    const v = this.view.getUint16(this.pos, this.le);
    this.pos += 2;
    return v;
  }

  readFloat64(): number {
    const v = this.view.getFloat64(this.pos, this.le);
    this.pos += 8;
    return v;
  }

  readUint8(): number {
    const v = this.view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }

  readInt8(): number {
    const v = this.view.getInt8(this.pos);
    this.pos += 1;
    return v;
  }

  readBytes(n: number): Uint8Array {
    const result = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, n);
    this.pos += n;
    return new Uint8Array(result); // return a copy
  }

  readCString(maxLen: number): string {
    const bytes = this.readBytes(maxLen);
    const end = bytes.indexOf(0);
    return new TextDecoder('ascii').decode(bytes.subarray(0, end === -1 ? bytes.length : end));
  }

  /** Read a text line terminated by \r\n (SE1 header format). Returns null if no \r\n found. */
  readLine(maxLen: number = 512): string | null {
    const startPos = this.pos;
    for (let i = 0; i < maxLen && this.pos < this.view.byteLength; i++) {
      const ch = this.view.getUint8(this.pos++);
      if (ch === 0x0A) { // \n
        const len = this.pos - startPos - 1;
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + startPos, len);
        let text = '';
        for (let j = 0; j < len; j++) text += String.fromCharCode(bytes[j]);
        if (text.endsWith('\r')) text = text.slice(0, -1);
        return text;
      }
    }
    this.pos = startPos; // rewind on failure
    return null;
  }

  /** Read an N-byte unsigned integer (1-4 bytes), using current endianness. */
  readUintN(bytes: number): number {
    const raw = this.readBytes(bytes);
    let value = 0;
    if (this.le) {
      for (let i = bytes - 1; i >= 0; i--) value = value * 256 + raw[i];
    } else {
      for (let i = 0; i < bytes; i++) value = value * 256 + raw[i];
    }
    return value >>> 0;
  }

  readInt32Array(count: number): Int32Array {
    const arr = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = this.readInt32();
    }
    return arr;
  }

  readFloat64Array(count: number): Float64Array {
    const arr = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = this.readFloat64();
    }
    return arr;
  }
}
