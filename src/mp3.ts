// Based on these implementations:
// https://github.com/eric-gilbertson/fast-mp3-duration
// https://github.com/ddsol/mp3-duration

import {Buffer} from 'https://deno.land/std@0.216.0/io/buffer.ts';

const versions = ['2.5', 'x', '2', '1'];

const layers = ['x', '3', '2', '1'];

const bitRates: {
  [key: string]: number[];
} = {
  V1Lx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  V1L1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  V1L2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  V1L3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  V2Lx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  V2L1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  V2L2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  V2L3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  VxLx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  VxL1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  VxL2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  VxL3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const sampleRates: {[key: string]: number[]} = {
  x: [0, 0, 0],
  '1': [44100, 48000, 32000],
  '2': [22050, 24000, 16000],
  '2.5': [11025, 12000, 8000]
};

const samples: {[key: string | number]: {[key: string | number]: number}} = {
  x: {
    x: 0,
    1: 0,
    2: 0,
    3: 0
  },
  1: {
    x: 0,
    1: 384,
    2: 1152,
    3: 1152
  },
  2: {
    x: 0,
    1: 384,
    2: 1152,
    3: 576
  }
};

const skipId3 = (buffer: Uint8Array) => {
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    const id3v2Flags = buffer[5];
    const footerSize = id3v2Flags & 0x10 ? 10 : 0;
    const z0 = buffer[6];
    const z1 = buffer[7];
    const z2 = buffer[8];
    const z3 = buffer[9];
    if (
      (z0 & 0x80) === 0 &&
      (z1 & 0x80) === 0 &&
      (z2 & 0x80) === 0 &&
      (z3 & 0x80) === 0
    ) {
      const tagSize =
        (z0 & 0x7f) * 2097152 +
        (z1 & 0x7f) * 16384 +
        (z2 & 0x7f) * 128 +
        (z3 & 0x7f);
      return 10 + tagSize + footerSize;
    }
  }
  return 0;
};

const frameSize = (
  samples: number,
  layer: string,
  bitRate: number,
  sampleRate: number,
  paddingBit: number
) => {
  if (layer === '1') {
    return ((samples * bitRate * 125) / sampleRate + paddingBit * 4) | 0;
  } else {
    return ((samples * bitRate * 125) / sampleRate + paddingBit) | 0;
  }
};

const parseFrameHeader = (header: Uint8Array) => {
  const b1 = header[1];
  const b2 = header[2];
  const versionBits = (b1 & 0x18) >> 3;
  const version = versions[versionBits];
  const simpleVersion = version === '2.5' ? 2 : version;
  const layerBits = (b1 & 0x06) >> 1;
  const layer = layers[layerBits];
  const bitRateKey = 'V' + simpleVersion + 'L' + layer;
  const bitRateIndex = (b2 & 0xf0) >> 4;
  const bitRate = bitRates[bitRateKey][bitRateIndex] || 0;
  const sampleRateIdx = (b2 & 0x0c) >> 2;
  const sampleRate = sampleRates[version][sampleRateIdx] || 0;
  const sample = samples[simpleVersion][layer];
  const paddingBit = (b2 & 0x02) >> 1;
  return {
    bitRate: bitRate,
    sampleRate: sampleRate,
    frameSize: frameSize(sample, layer, bitRate, sampleRate, paddingBit),
    samples: sample
  };
};

export const mp3Duration = async (path: string): Promise<number> => {
  let duration = 0;
  const file = await Deno.open(path);
  try {
    const stat = await Deno.stat(path);
    const buffer = new Buffer();
    await buffer.readFrom(file);
    const header = new Uint8Array(10);
    await buffer.read(header);
    let offset = skipId3(header);
    let lastOffset = 0;
    while (offset < stat.size) {
      if (offset - lastOffset > 0) {
        await buffer.read(new Uint8Array(offset - lastOffset));
      }
      lastOffset = offset + 10;
      const read = await buffer.read(header);
      if (!read || read < 10) break;
      if (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) {
        const info = parseFrameHeader(header);
        if (info.frameSize && info.samples) {
          offset += info.frameSize;
          duration += info.samples / info.sampleRate;
        } else {
          offset++;
        }
      } else if (
        header[0] === 0x54 &&
        header[1] === 0x41 &&
        header[2] === 0x47
      ) {
        offset += 128;
      } else {
        offset++;
      }
    }
  } finally {
    file.close();
  }
  return Math.round(duration * 1000);
};
