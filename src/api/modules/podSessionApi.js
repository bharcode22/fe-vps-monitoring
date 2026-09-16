import { BACKEND_URL, getAuthHeaders } from './client';
import { fetchMasterTokenApi } from './multimediaSyncApi';

const DEFAULT_MASTER_API_BASE = 'https://be-api.regenesispod.com/admin-api';

/**
 * Format Authorization header for Master API
 * Master API expects the raw JWT token string directly without "Bearer " prefix
 */
function formatMasterAuthHeader(token) {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Fetch all registered POD units from Master DB via backend
 */
export async function fetchMasterPodsApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/pod-sessions/pods`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengambil daftar unit POD');
  }
  return data.pods || [];
}

/**
 * Fetch all Signature experiences for a POD from Master DB via backend
 */
export async function fetchPodExperiencesFromDbApi(podId) {
  const res = await fetch(`${BACKEND_URL}/api/vps/pod-sessions/experiences/${podId}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengambil sesi Signature POD');
  }
  return data.experiences || [];
}

/**
 * Fetch POD Setting & Signature Experiences List directly from Master API
 * GET /admin-api/pod-setting/detail/:podSettingId
 */
export async function fetchPodSignatureListApi(
  podSettingId,
  masterToken = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
) {
  let token = masterToken;
  if (!token) {
    const authData = await fetchMasterTokenApi();
    token = authData.token;
  }

  const cleanBase = (masterApiBase || DEFAULT_MASTER_API_BASE).replace(/\/+$/, '');
  const res = await fetch(`${cleanBase}/pod-setting/detail/${podSettingId}`, {
    headers: {
      Authorization: formatMasterAuthHeader(token)
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Gagal mengambil data POD setting (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch specific Signature Experience detail with all detail_experience tracks
 * GET /admin-api/pod-setting/detail/:podSettingId/:signatureId
 */
export async function fetchSignatureDetailApi(
  podSettingId,
  signatureId,
  masterToken = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
) {
  let token = masterToken;
  if (!token) {
    const authData = await fetchMasterTokenApi();
    token = authData.token;
  }

  const cleanBase = (masterApiBase || DEFAULT_MASTER_API_BASE).replace(/\/+$/, '');
  const res = await fetch(`${cleanBase}/pod-setting/detail/${podSettingId}/${signatureId}`, {
    headers: {
      Authorization: formatMasterAuthHeader(token)
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Gagal mengambil detail pengalaman Signature (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Sanitize detail_experience item to strictly conform with Master API / Prisma schema.
 * Prevents "Unknown argument" Prisma errors (such as group_ids, nir_detail_exp, created_at).
 */
export function sanitizeDetailExperiencePayload(item, isEdit = false) {
  if (!item) return {};

  const rawNir = Array.isArray(item.nir_value) && item.nir_value.length > 0
    ? item.nir_value
    : (Array.isArray(item.nir_detail_exp) ? item.nir_detail_exp : []);

  const clean = {
    sound_scape: Number(item.sound_scape) || 0,
    title: item.title || '',
    artist: item.artist || 'Regenesis',
    album: item.album || 'Regenesis',
    cover_album: item.cover_album || 'cover_album.png',
    song: item.song || '',
    lamp: item.lamp || '',
    video: item.video || '',
    filepath: item.filepath || item.song || '',
    duration: typeof item.duration === 'string' ? parseFloat(item.duration) || 0 : (Number(item.duration) || 0),
    order: Number(item.order) || 1,
    label: item.label || '',
    label_tag: item.label_tag || item.label || '',
    caption: item.caption || item.title || '',
    description: item.description || item.title || '',
    stroboscopic_light: Number(item.stroboscopic_light) || 0,
    led_intensity: Number(item.led_intensity) || 0,
    led_color: Number(item.led_color) || 0,
    audio_surround_sound: Number(item.audio_surround_sound) || 0,
    vibro_acoustics: Number(item.vibro_acoustics) || 0,
    infra_red_nea_ir: Number(item.infra_red_nea_ir) || 0,
    infra_red_far_ir: Number(item.infra_red_far_ir) || 0,
    uva: Number(item.uva) || 0,
    uvb: Number(item.uvb) || 0,
    uvc: Number(item.uvc) || 0,
    pemf_therapy: Boolean(item.pemf_therapy),
    pemf_value: Number(item.pemf_value) || 0,
    olfactory_engagement: Boolean(item.olfactory_engagement),
    scent: item.scent || null,
    binaural_beats_isochronic_tones: Boolean(item.binaural_beats_isochronic_tones),
    direct_neutral_stimulation: Boolean(item.direct_neutral_stimulation),
    wave_shape: item.wave_shape || 'wave',

    burst_time: Array.isArray(item.burst_time) ? item.burst_time.map(b => ({
      ...(b.id ? { id: b.id } : {}),
      start_time: String(b.start_time ?? '0'),
      duration: String(b.duration ?? '10000'),
      scent: b.scent || 'Lavender'
    })) : [],

    generator_frequency: Array.isArray(item.generator_frequency) ? item.generator_frequency.map(g => ({
      ...(g.id ? { id: g.id } : {}),
      frequency: Number(g.frequency) || 40,
      start_time: String(g.start_time ?? '1.0'),
      duration: String(g.duration ?? '5000'),
      wave_shape: g.wave_shape || 'wave'
    })) : [],

    nir_value: rawNir.map(n => ({
      ...(n.id ? { id: n.id } : {}),
      start_time: String(n.start_time ?? '0.0167'),
      end_time: n.end_time ?? null,
      duration: String(n.duration ?? '460000'),
      nir_value: Number(n.nir_value) || 100,
      frequency: String(n.frequency ?? '10')
    }))
  };

  if (isEdit && item.id) {
    clean.id = item.id;
  }

  // Explicit safety removals of non-column properties
  delete clean.group_ids;
  delete clean.nir_detail_exp;
  delete clean.created_at;
  delete clean.updated_at;
  delete clean.deleted_at;
  delete clean.experience_id;
  delete clean.fk_experience_id;
  delete clean.experiences;
  delete clean.order_experience;

  return clean;
}

/**
 * Add Detail Experience into a Signature Session
 * POST /admin-api/pod-setting/detail/:podSettingId/:signatureId
 */
export async function addDetailExperienceApi(
  podSettingId,
  signatureId,
  payload,
  masterToken = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
) {
  let token = masterToken;
  if (!token) {
    const authData = await fetchMasterTokenApi();
    token = authData.token;
  }

  // Sanitize payload
  const cleanPayload = {
    group_ids: Array.isArray(payload?.group_ids) ? payload.group_ids : [],
    detail_experience: Array.isArray(payload?.detail_experience)
      ? payload.detail_experience.map(item => sanitizeDetailExperiencePayload(item, false))
      : []
  };

  const cleanBase = (masterApiBase || DEFAULT_MASTER_API_BASE).replace(/\/+$/, '');
  const res = await fetch(`${cleanBase}/pod-setting/detail/${podSettingId}/${signatureId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: formatMasterAuthHeader(token)
    },
    body: JSON.stringify(cleanPayload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Gagal menambahkan detail experience (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Update Detail Experience in a Signature Session
 * PUT /admin-api/pod-setting/detail/:podSettingId/:signatureId
 */
export async function updateDetailExperienceApi(
  podSettingId,
  signatureId,
  payload,
  masterToken = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
) {
  let token = masterToken;
  if (!token) {
    const authData = await fetchMasterTokenApi();
    token = authData.token;
  }

  // Sanitize payload
  const cleanPayload = {
    group_ids: Array.isArray(payload?.group_ids) ? payload.group_ids : [],
    detail_experience: Array.isArray(payload?.detail_experience)
      ? payload.detail_experience.map(item => sanitizeDetailExperiencePayload(item, true))
      : []
  };

  const cleanBase = (masterApiBase || DEFAULT_MASTER_API_BASE).replace(/\/+$/, '');
  const res = await fetch(`${cleanBase}/pod-setting/detail/${podSettingId}/${signatureId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: formatMasterAuthHeader(token)
    },
    body: JSON.stringify(cleanPayload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Gagal memperbarui detail experience (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch saved JSON templates from backend library
 */
export async function fetchSavedTemplatesApi() {
  const res = await fetch(`${BACKEND_URL}/api/vps/pod-sessions/templates`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal mengambil library template');
  }
  return data.templates || [];
}

/**
 * Save new JSON template to backend library
 */
export async function saveTemplateApi(templatePayload) {
  const res = await fetch(`${BACKEND_URL}/api/vps/pod-sessions/templates`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templatePayload)
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal menyimpan template');
  }
  return data.template;
}

/**
 * Delete a template from backend library
 */
export async function deleteTemplateApi(filename) {
  const res = await fetch(`${BACKEND_URL}/api/vps/pod-sessions/templates/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Gagal menghapus template');
  }
  return data;
}

/**
 * Fetch Multimedia Catalog for SoundScape selection and auto-fill
 */
export async function fetchMultimediaCatalogApi() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vps/content/multimedia-list`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.data || data.multimedia || [];
  } catch (err) {
    console.warn('Failed to fetch multimedia catalog:', err.message);
    return [];
  }
}

/**
 * Batch Apply a Template (detail_experience) to Multiple PODs
 * Automatically resolves the corresponding signature session for each target POD
 */
export async function batchApplyTemplateApi({
  targetPods,
  targetSessionName,
  detailExperience,
  onProgress = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
}) {
  const results = [];
  const authData = await fetchMasterTokenApi();
  const masterToken = authData.token;

  // Clean template detail: remove local IDs so Master API assigns a fresh entry
  const cleanItem = { ...detailExperience };
  delete cleanItem.id;
  delete cleanItem.experience_id;

  for (let i = 0; i < targetPods.length; i++) {
    const pod = targetPods[i];
    const podName = pod.name || `POD ${pod.code || ''}`;

    if (onProgress) {
      onProgress({
        index: i,
        total: targetPods.length,
        pod,
        status: 'processing',
        message: `Mencari sesi ${targetSessionName} di ${podName}...`
      });
    }

    try {
      // 1. Fetch experiences list for this target POD
      let targetExperienceId = null;

      try {
        const podData = await fetchPodSignatureListApi(pod.id, masterToken, masterApiBase);
        const exps = podData?.data?.pod?.experiences || [];
        const match = exps.find(e =>
          (e.menu_name && e.menu_name.toUpperCase() === targetSessionName.toUpperCase()) ||
          (e.link_class && e.link_class.toUpperCase() === targetSessionName.toUpperCase())
        );
        if (match) targetExperienceId = match.id;
      } catch (e1) {
        // Fallback query via backend DB
        const dbExps = await fetchPodExperiencesFromDbApi(pod.id);
        const match = dbExps.find(e =>
          (e.menu_name && e.menu_name.toUpperCase() === targetSessionName.toUpperCase()) ||
          (e.link_class && e.link_class.toUpperCase() === targetSessionName.toUpperCase())
        );
        if (match) targetExperienceId = match.id;
      }

      if (!targetExperienceId) {
        throw new Error(`Sesi ${targetSessionName} tidak ditemukan di unit ${podName}`);
      }

      // 2. Dispatch POST add detail experience to target POD
      const payload = {
        detail_experience: [cleanItem],
        group_ids: []
      };

      await addDetailExperienceApi(pod.id, targetExperienceId, payload, masterToken, masterApiBase);

      const resObj = {
        pod,
        success: true,
        experienceId: targetExperienceId,
        message: `Berhasil diterapkan ke ${podName}`
      };
      results.push(resObj);

      if (onProgress) {
        onProgress({
          index: i,
          total: targetPods.length,
          pod,
          status: 'success',
          message: `Berhasil diterapkan ke ${podName}`
        });
      }
    } catch (err) {
      const resObj = {
        pod,
        success: false,
        error: err.message
      };
      results.push(resObj);

      if (onProgress) {
        onProgress({
          index: i,
          total: targetPods.length,
          pod,
          status: 'error',
          message: `Gagal pada ${podName}: ${err.message}`
        });
      }
    }
  }

  return results;
}

/**
 * Delete Detail Experience Track directly from Master API
 * DELETE /admin-api/pod-setting/detail/:detailId
 * Note: Master API controller requires `group_ids` in request body even on DELETE.
 */
export async function deleteDetailExperienceApi(
  detailId,
  groupIds = [],
  masterToken = null,
  masterApiBase = DEFAULT_MASTER_API_BASE
) {
  let token = masterToken;
  if (!token) {
    const authData = await fetchMasterTokenApi();
    token = authData.token;
  }

  const cleanBase = (masterApiBase || DEFAULT_MASTER_API_BASE).replace(/\/+$/, '');
  const res = await fetch(`${cleanBase}/pod-setting/detail/${detailId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: formatMasterAuthHeader(token)
    },
    body: JSON.stringify({
      group_ids: Array.isArray(groupIds) ? groupIds : []
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Gagal menghapus detail experience (HTTP ${res.status})`);
  }
  return data;
}

