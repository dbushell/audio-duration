/**
 * Get the millisecond duration of an audio file.
 * MP3 and MP4 formats are supported.
 *
 * ```js
 * import {duration} from 'jsr:@dbushell/audio-duration@0.2';
 * const ms = await duration('/path/to/audio.mp3');
 * ```
 *
 * @module
 */
import {extname} from 'jsr:@std/path@0.216';

import {mp3Duration} from './src/mp3.ts';
import {m4aDuration} from './src/m4a.ts';

export {mp3Duration, m4aDuration};

/**
 * Get the duration of an audio file (`mp3`, `mp4`, `m4a`, `m4b`)
 * @param {string} path - Path to file
 * @returns {number} Duration in milliseconds
 */
export const duration = (path: string): Promise<number> => {
  switch (extname(path)) {
    case '.mp3':
      return mp3Duration(path);
    case '.mp4':
    case '.m4a':
    case '.m4b':
      return m4aDuration(path);
    default:
      throw new Error(`Unsupported content type`);
  }
};
