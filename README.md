# 🔊 Deno Audio Duration

Get the **millisecond** duration of audio files in pure **Deno** flavoured JavaScript. Currently MP3 / M4A / M4B formats are supported.

## Usage

```javascript
import {duration} from 'jsr:@dbushell/audio-duration@0.2';

const ms = await duration('/path/to/audio.mp3');
```

The `duration` function will detect audio formats based on the file extension. Import and use `mp3Duration` and `m4aDuration` to bypass this detection.

## Other Solutions

If this module is insufficient use another tool with `Deno.Command`:

With [ffprobe](https://ffmpeg.org/ffprobe.html):

```sh
ffprobe -loglevel quiet -show_format -print_format json audio.mp3
```

With [exiftool](https://exiftool.org/):

```sh
exiftool -j -Duration audio.mp3
```

For example:

```typescript
const stat = await Deno.stat(entry.path);
const command = new Deno.Command('exiftool', {
  args: ['-j', '-Duration', `${entry.path}`]
});
const {stdout} = await command.output();
const json = JSON.parse(
  new TextDecoder().decode(stdout)
);
```

You'll need to parse the output.

## License

MIT License

* * *

[MIT License](/LICENSE) | Copyright © 2024 [David Bushell](https://dbushell.com) | [@dbushell](https://twitter.com/dbushell)
