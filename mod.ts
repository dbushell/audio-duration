import {extname} from 'jsr:@std/path@0.216';

import {mp3Duration} from './src/mp3.ts';
import {m4aDuration} from './src/m4a.ts';

export {mp3Duration, m4aDuration};

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
