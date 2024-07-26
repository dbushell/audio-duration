// Based on this research:
// https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html
// https://github.com/Borewit/music-metadata/blob/master/lib/mp4/MP4Parser.ts

import {equals} from 'jsr:@std/bytes@1.0';

// Movie header atom signature
const mvhd: Uint8Array = new Uint8Array([109, 118, 104, 100]);

// Search for the duration
const search = async (
  path: string,
  signal: AbortSignal,
  backwards = false
): Promise<number> => {
  let duration = 0;
  const file = await Deno.open(path);
  try {
    const stat = await Deno.stat(path);
    const buffer = new Uint8Array(1024 * 32);
    let offset = 0;
    while (!duration && offset < stat.size) {
      if (signal.aborted) break;
      const seek = backwards ? stat.size - (offset + 32) : offset;
      await file.seek(Math.max(0, seek), Deno.SeekMode.Start);
      const read = await file.read(buffer);
      if (!read || read < 5) break;
      for (let i = 0; i < read - 4; i++) {
        if (signal.aborted) break;
        if (!equals(buffer.subarray(i, i + 4), mvhd)) {
          continue;
        }
        await file.seek(seek + i, Deno.SeekMode.Start);
        const header = new Uint8Array(32);
        const read = await file.read(header);
        if (read !== 32) continue;
        const view = new DataView(header.buffer);
        const i1 = view.getInt32(16);
        const i2 = view.getInt32(20);
        if (i1 && i2 && i2 > i1) {
          duration = i2 / i1;
          break;
        }
      }
      // Back up in case the header straddles the buffer
      offset += read - 4;
    }
  } finally {
    file.close();
  }
  return Math.round(duration * 1000);
};

/**
 * Get the duration of an `mp4`, `m4a`, or `m4b` audio file
 * @param {string} path - Path to audio file
 * @returns {number} Duration in milliseconds
 */
export const m4aDuration = async (path: string): Promise<number> => {
  // Because the header is seemingly anywhere search backwards and forwards simultaneously
  const controller = new AbortController();
  const duration = await Promise.race([
    search(path, controller.signal),
    search(path, controller.signal, true)
  ]);
  controller.abort();
  return duration;
};
