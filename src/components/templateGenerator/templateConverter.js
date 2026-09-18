/**
 * Template Converter & Adapter between:
 * 1. Simulator Native JSON (as defined in Pod Session Simulator.html)
 * 2. POD Sessions / Master API standard payload (detail_experience format)
 */

export const DEFAULT_SIMULATOR_SESSION = {
  name: "New Simulator Session",
  audioFile: { path: "", duration: "0" },
  strobeFile: { path: "", duration: "0" },
  videoFile: { path: "", duration: "0" },
  olfactoryEvents: [],
  pemfEvents: [],
  nirEvents: [],
  nirBox: { freq: "10", duration: "-1" },
  nirWimHof: {
    wimhofFreq: "40",
    holdFreq: "1",
    wimhofPeriod: "30000",
    holdPeriod: "15000",
    recoveryPeriod: "17000",
    iteration: "2"
  },
  nirSendOff: { duration: "3000" },
  pemfBox: { freq: "10", duration: "-1" },
  pemfWimHof: {
    rampFromFreq: "14",
    rampToFreq: "40",
    rampPeriod: "30000",
    holdFreq: "7.83",
    holdPeriod: "15000",
    recoveryFreq: "13",
    recoveryPeriod: "17000",
    iteration: "2"
  },
  pemfSendOff: { duration: "3000" }
};

/**
 * Parses time strings like "01:30" or "01:30.500" into seconds.
 */
export function parseTimeStrToSeconds(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 1000;
  return Number(str) || 0;
}

/**
 * Formats seconds into MM:SS format (e.g. 90 -> "01:30")
 */
export function formatSecondsToTimeStr(seconds) {
  const totalSec = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Convert Simulator JSON Session into Master API / POD detail_experience format
 */
export function convertSimulatorToMasterPayload(sessionData, targetSessionName = 'RECHARGE') {
  const data = sessionData || DEFAULT_SIMULATOR_SESSION;

  // 1. Burst time from olfactoryEvents
  // Event format: ["00:05", "1" or "Lavender", "3000"]
  const burstTime = (data.olfactoryEvents || []).map((ev) => {
    const startTimeSec = parseTimeStrToSeconds(ev[0]);
    const durationMs = ev[2] ? String(ev[2]) : '3000';
    const scentName = ev[1] || 'Lavender';
    return {
      start_time: (startTimeSec / 60).toFixed(2), // in minutes
      duration: durationMs,
      scent: scentName
    };
  });

  // 2. Generator frequency from pemfEvents
  // Event format: ["00:01", "1" (1:Box, 2:WimHof, 3:SendOff)]
  const generatorFrequency = (data.pemfEvents || []).map((ev) => {
    const startTimeSec = parseTimeStrToSeconds(ev[0]);
    const modeId = parseInt(ev[1]) || 1;
    let freq = 40;
    let durationMs = 5000;
    let waveShape = 'wave';

    if (modeId === 1 && data.pemfBox) {
      freq = Number(data.pemfBox.freq) || 40;
      durationMs = data.pemfBox.duration && Number(data.pemfBox.duration) > 0 ? Number(data.pemfBox.duration) : 5000;
      waveShape = 'square';
    } else if (modeId === 2 && data.pemfWimHof) {
      freq = Number(data.pemfWimHof.rampToFreq) || 40;
      durationMs = Number(data.pemfWimHof.rampPeriod) || 30000;
      waveShape = 'schumann';
    } else if (modeId === 3 && data.pemfSendOff) {
      freq = 10;
      durationMs = Number(data.pemfSendOff.duration) || 3000;
      waveShape = 'sine';
    }

    return {
      frequency: freq,
      start_time: String((startTimeSec / 60).toFixed(2)),
      duration: String(durationMs),
      wave_shape: waveShape
    };
  });

  // 3. NIR value from nirEvents
  // Event format: ["00:05", "1"]
  const nirValue = (data.nirEvents || []).map((ev) => {
    const startTimeSec = parseTimeStrToSeconds(ev[0]);
    const modeId = parseInt(ev[1]) || 1;
    let nirIntensity = 2.5;
    let freqStr = '40Hz';
    let durationSec = 10;

    if (modeId === 1 && data.nirBox) {
      freqStr = `${data.nirBox.freq || 10}Hz`;
      nirIntensity = 3.0;
      durationSec = data.nirBox.duration && Number(data.nirBox.duration) > 0 ? Number(data.nirBox.duration) / 1000 : 30;
    } else if (modeId === 2 && data.nirWimHof) {
      freqStr = `${data.nirWimHof.wimhofFreq || 40}Hz`;
      nirIntensity = 4.0;
      const wp = Number(data.nirWimHof.wimhofPeriod) || 30000;
      const hp = Number(data.nirWimHof.holdPeriod) || 15000;
      const rp = Number(data.nirWimHof.recoveryPeriod) || 17000;
      const it = Number(data.nirWimHof.iteration) || 1;
      durationSec = (it * (wp + hp + rp)) / 1000;
    }

    const startStr = formatSecondsToTimeStr(startTimeSec);
    const endStr = formatSecondsToTimeStr(startTimeSec + durationSec);
    const durStr = formatSecondsToTimeStr(durationSec);

    return {
      start_time: startStr,
      end_time: endStr,
      duration: durStr,
      nir_value: nirIntensity,
      frequency: freqStr
    };
  });

  const rawDurationMs = data.audioFile?.duration || data.videoFile?.duration || '1200000';
  const durationMinutes = Math.max(1, Math.round(Number(rawDurationMs) / 60000)) || 20;

  return {
    template_version: '1.0',
    template_name: data.name || 'Simulator Session',
    target_session: targetSessionName,
    created_at: new Date().toISOString(),
    detail_experience: {
      title: data.name || 'Simulator Session',
      artist: 'Regenesis',
      album: 'Regenesis',
      duration: durationMinutes,
      order: 1,
      sound_scape: '',
      song: data.audioFile?.path ? data.audioFile.path.split('/').pop() : '',
      lamp: data.strobeFile?.path ? data.strobeFile.path.split('/').pop() : '',
      video: data.videoFile?.path ? data.videoFile.path.split('/').pop() : '',
      cover_album: 'cover_album.png',
      stroboscopic_light: 50,
      led_intensity: 30,
      audio_surround_sound: 50,
      vibro_acoustics: 50,
      infra_red_nea_ir: 30,
      infra_red_far_ir: 30,
      uva: 0,
      uvb: 0,
      uvc: 0,
      pemf_therapy: generatorFrequency.length > 0,
      pemf_value: 0,
      olfactory_engagement: burstTime.length > 0,
      scent: burstTime[0]?.scent || 'Lavender',
      binaural_beats_isochronic_tones: false,
      direct_neutral_stimulation: false,
      wave_shape: 'wave',
      burst_time: burstTime,
      generator_frequency: generatorFrequency,
      nir_value: nirValue
    }
  };
}

/**
 * Convert Master API / Template Library format back into Simulator format
 */
export function convertMasterPayloadToSimulator(masterData) {
  const detail = masterData.detail_experience || masterData;
  const name = masterData.template_name || detail.title || 'Imported Template';

  const olfactoryEvents = (detail.burst_time || []).map((b) => {
    const min = parseFloat(b.start_time) || 0;
    const sec = Math.floor(min * 60);
    const timeStr = formatSecondsToTimeStr(sec);
    return [timeStr, b.scent || 'Lavender', String(b.duration || '3000')];
  });

  const pemfEvents = (detail.generator_frequency || []).map((g) => {
    const min = parseFloat(g.start_time) || 0;
    const sec = Math.floor(min * 60);
    const timeStr = formatSecondsToTimeStr(sec);
    const mode = g.wave_shape === 'schumann' ? '2' : (g.wave_shape === 'sine' ? '3' : '1');
    return [timeStr, mode];
  });

  const nirEvents = (detail.nir_detail_exp || detail.nir_value || []).map((n) => {
    const timeStr = n.start_time && n.start_time.includes(':') ? n.start_time : '00:10';
    return [timeStr, '1'];
  });

  const durMinutes = Number(detail.duration) || 20;
  const durMs = String(durMinutes * 60 * 1000);

  return {
    name,
    detail_experience: detail,
    audioFile: { path: detail.song || '', duration: durMs },
    strobeFile: { path: detail.lamp || '', duration: durMs },
    videoFile: { path: detail.video || '', duration: durMs },
    olfactoryEvents: olfactoryEvents,
    pemfEvents: pemfEvents,
    nirEvents: nirEvents,
    nirBox: { freq: '10', duration: '-1' },
    nirWimHof: { ...DEFAULT_SIMULATOR_SESSION.nirWimHof },
    nirSendOff: { duration: '3000' },
    pemfBox: { freq: '10', duration: '-1' },
    pemfWimHof: { ...DEFAULT_SIMULATOR_SESSION.pemfWimHof },
    pemfSendOff: { duration: '3000' }
  };
}
