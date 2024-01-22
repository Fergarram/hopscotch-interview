export function get_image_dimensions(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            reject(new Error(`Failed to load image at ${url}`));
        };

        img.src = url;
    });
}

export function slugify(str: string) {
  str = str.replace(/^\s+|\s+$/g, "");

  // Make the string lowercase
  str = str.toLowerCase();

  str = str.replace("'", "");

  // Remove accents, swap ñ for n, etc
  const from =
    "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
  const to =
    "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  // Remove invalid chars
  str = str
    .replace(/[^a-z0-9 -]/g, "")
    // Collapse whitespace and replace by -
    .replace(/\s+/g, "-")
    // Collapse dashes
    .replace(/-+/g, "-");

  return str;
}

export function make_id(length = 8) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const characters_length = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters_length));
  }

  return result;
}

export function throttle(callback, delay) {
  let lastCallTime = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCallTime >= delay) {
      lastCallTime = now;
      callback.apply(this, args);
    }
  };
}

export function get_url_search_params(search_string: string): {
  [key: string]: string;
} {
  const search_params = new URLSearchParams(search_string);
  const search_object: { [key: string]: string } = {};

  for (const [key, value] of search_params.entries()) {
    search_object[key] = value;
  }

  return search_object;
}

export function set_url_search_params(
  search_string: string,
  params_to_update: { [key: string]: string }
): string {
  const search_params = new URLSearchParams(search_string);

  for (const [key, value] of Object.entries(params_to_update)) {
    search_params.set(key, value);
  }

  return `?${search_params.toString()}`;
}

export function repeat(length: number) {
  return Array.from({ length });
}

export function generate_random_colors(x: number): string[] {
  const colors = new Set<string>();

  while (colors.size < x) {
    let red = Math.floor(Math.random() * 120) + 50;
    let green = Math.floor(Math.random() * 80) + 20;
    let blue = Math.floor(Math.random() * 120) + 50;

    // Ensure at least one channel is closer to 255 for high saturation
    const high_channel = Math.floor(Math.random() * 3);
    if (high_channel === 0) {
      red = 255;
    } else if (high_channel === 1) {
      green = 255;
    } else {
      blue = 255;
    }

    // Convert to hex and check uniqueness
    const color =
      "#" +
      red.toString(16).padStart(2, "0") +
      green.toString(16).padStart(2, "0") +
      blue.toString(16).padStart(2, "0");
    colors.add(color);
  }

  return Array.from(colors);
}

export function hex_to_rgba(hex: string) {
  if ((hex.length !== 7 && hex.length !== 9) || hex[0] !== "#") {
    throw new Error(
      'Invalid HEX format. It should be either in the format "#FFFFFF" or "#FFFFFFFF".'
    );
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let a: number | null = null; // default alpha value

  if (hex.length === 9) {
    a = Number(parseInt(hex.slice(7, 9), 16) / 255);
  }

  return { r, g, b, a };
}
class SoundPlayer {
  audio_context: AudioContext | null;
  loaded_sounds: Map<any, any>;
  current_source: AudioBufferSourceNode | null;
  current_sound: string | null;
  playback_time: number;
  is_mute: boolean;

  constructor() {
    this.audio_context = null;
    this.loaded_sounds = new Map();
    this.current_source = null;
    this.playback_time = 0; // For maintaining playback position
    this.is_mute = false;
    this.current_sound = null;
  }

  initialize() {
    if (this.audio_context === null)
      this.audio_context = new (window.AudioContext ||
        window.webkitAudioContext)();
  }

  async load_files(files_array: { name: string; file: string }[]) {
    if (this.audio_context === null) return;
    for (const { name, file } of files_array) {
      try {
        const response = await fetch(file);
        const buffer = await response.arrayBuffer();
        const decoded_data = await this.audio_context.decodeAudioData(buffer);
        this.loaded_sounds.set(name, decoded_data);
      } catch (error: any) {
        console.error(`Failed to load sound "${name}": ${error.message}`);
      }
    }
  }

  stop_current_source() {
    if (this.current_source) {
      this.current_source.disconnect();
      this.current_source.stop();
      this.current_source = null;
    }
  }

  seek(position_ms: number) {
    if (!this.current_sound) {
      console.error("No sound has been played yet.");
      return;
    }
    this.playback_time = position_ms / 1000; // Convert ms to seconds
    this.play(this.current_sound, this.playback_time);
  }

  play(name: string, start_time_s = 0) {
    if (this.audio_context === null) return;
    if (this.is_mute) return;
    const sound = this.loaded_sounds.get(name);
    if (!sound) {
      console.error(`Sound "${name}" not found.`);
      return;
    }

    this.stop_current_source();

    const source = this.audio_context.createBufferSource();
    source.buffer = sound;
    source.connect(this.audio_context.destination);
    source.start(0, start_time_s);

    this.current_sound = name;
    this.current_source = source;
    this.playback_time = start_time_s;

    source.onended = () => {
      this.playback_time = 0;
    };
  }

  pause() {
    if (!this.current_source || !this.audio_context) {
      return;
    }
    this.playback_time +=
      this.audio_context.currentTime - this.current_source.startTime;
    this.stop_current_source();
  }

  stop() {
    this.playback_time = 0;
    this.stop_current_source();
  }
}

export const sound_player = new SoundPlayer();

export function set_caret_position(element: HTMLElement, position: number) {
  const range = document.createRange();
  const sel = window.getSelection();

  let char_count = 0;
  let target_node = null;
  let last_text_node = null;

  (function find_target_node(node) {
    if (char_count > position && position !== -1) {
      // Stop recursive function when position is found
      return;
    }

    if (node.nodeValue && node.nodeType === Node.TEXT_NODE) {
      const node_length = node.nodeValue.length;

      // Track the last text node found
      last_text_node = node;

      if (char_count + node_length >= position) {
        target_node = node;
      } else {
        char_count += node_length;
      }
    } else {
      // Dive into child nodes if it's not a text node
      for (let i = 0; i < node.childNodes.length; i++) {
        find_target_node(node.childNodes[i]);
      }
    }
  })(element);

  if (position === -1 && last_text_node) {
    target_node = last_text_node;
    position = target_node.nodeValue.length; // Move to the end of the last text node
  }

  if (target_node) {
    range.setStart(
      target_node,
      position !== -1 ? position - char_count : position
    );
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
  }
}
