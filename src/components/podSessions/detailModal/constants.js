export const DEFAULT_DETAIL = {
  sound_scape: '',
  title: '',
  artist: 'Regenesis',
  album: 'Regenesis',
  cover_album: 'cover_album.png',
  song: '',
  lamp: '',
  video: '',
  filepath: '',
  duration: 20,
  order: 1,
  label: '',
  label_tag: '',
  caption: '',
  description: '',
  stroboscopic_light: 50,
  led_intensity: 30,
  led_color: 0,
  audio_surround_sound: 50,
  vibro_acoustics: 50,
  infra_red_nea_ir: 30,
  infra_red_far_ir: 30,
  uva: 0,
  uvb: 0,
  uvc: 0,
  pemf_therapy: false,
  pemf_value: 0,
  olfactory_engagement: true,
  scent: 'Lavender',
  binaural_beats_isochronic_tones: false,
  direct_neutral_stimulation: false,
  wave_shape: 'wave',
  burst_time: [],
  generator_frequency: [],
  nir_value: []
};

export function getMediaCoverUrl(itemOrUrl) {
  if (!itemOrUrl) return null;
  const url = typeof itemOrUrl === 'string' ? itemOrUrl : (itemOrUrl.coverAlbumUrl || itemOrUrl.cover_album);
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://developerfile-084897310273.s3.ap-southeast-1.amazonaws.com${url.startsWith('/') ? '' : '/'}${url}`;
}

export const WAVE_SHAPES = [
  { value: 'wave', label: 'Wave' },
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'schumann', label: 'Schumann Resonance' },
  { value: 'False', label: 'Disabled (False)' }
];
