import React, { useState, useEffect } from 'react';
import { Music, Video, RefreshCw, AlertTriangle, CheckCircle, FileText, Search, Folder, Volume2, Film, XCircle } from 'lucide-react';
import { validateServerSoundsApi } from '../../api/vpsApi';

const SkeletonSoundsTab = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {/* Summary Metric Cards Skeleton */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card" style={{ padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-box" style={{ width: '100px', height: '14px' }}></div>
          <div className="skeleton-box" style={{ width: '60px', height: '24px' }}></div>
        </div>
      ))}
    </div>

    {/* Filter & Search Controls Skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
      <div className="skeleton-box" style={{ width: '220px', height: '36px', borderRadius: '8px' }}></div>
      <div className="skeleton-box" style={{ width: '260px', height: '36px', borderRadius: '8px' }}></div>
    </div>

    {/* Table Skeleton */}
    <div className="glass-card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div className="skeleton-box" style={{ width: '100%', height: '20px' }}></div>
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton-box" style={{ width: '180px', height: '16px' }}></div>
            <div className="skeleton-box" style={{ width: '120px', height: '12px' }}></div>
          </div>
          <div className="skeleton-box" style={{ width: '90px', height: '24px', borderRadius: '20px' }}></div>
        </div>
      ))}
    </div>
  </div>
);

export default function SoundsTab({ serverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'missing' | 'valid' | 'extra'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (serverId) {
      loadValidationData();
    }
  }, [serverId]);

  const loadValidationData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await validateServerSoundsApi(serverId);
      setData(res);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memvalidasi data metadata sounds & videos.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonSoundsTab />;
  }

  if (errorMsg) {
    return (
      <div style={{
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        padding: '20px',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 700 }}>
          <AlertTriangle color="#ef4444" size={22} />
          <span>Gagal Memvalidasi Sound Metadata</span>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{errorMsg}</p>
        <button
          onClick={loadValidationData}
          className="btn-secondary"
          style={{ width: 'fit-content', padding: '6px 14px', marginTop: '4px' }}
        >
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    totalMetadataItems: 0,
    totalExpectedFiles: 0,
    totalMissingFiles: 0,
    totalValidFiles: 0,
    totalUnreferencedSounds: 0,
    totalUnreferencedVideos: 0,
    physicalSoundsCount: 0,
    physicalVideosCount: 0
  };

  const items = data?.items || [];
  const missingFiles = data?.missingFiles || [];
  const unreferencedSounds = data?.unreferencedSounds || [];
  const unreferencedVideos = data?.unreferencedVideos || [];

  // Filter items based on activeFilter & searchQuery
  const filteredItems = items.filter(item => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (item.display || item.description || '').toLowerCase().includes(q);
      const idMatch = String(item.id || '').toLowerCase().includes(q);
      const typeMatch = (item.type || '').toLowerCase().includes(q);
      const sessionMatch = (item.session || '').toLowerCase().includes(q);
      const fileMatch = (item.__files || []).some(f => f.filename.toLowerCase().includes(q));

      if (!titleMatch && !idMatch && !typeMatch && !sessionMatch && !fileMatch) {
        return false;
      }
    }

    if (activeFilter === 'missing') return item.__hasMissing;
    if (activeFilter === 'valid') return !item.__hasMissing && item.__files.length > 0;
    return true; // 'all'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Top Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Music color="#00f2fe" size={24} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Sound & Video Metadata Validator
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Memvalidasi keberadaan file audio (<code>/home/pod/sounds/</code>) & video (<code>/home/pod/videos/</code>) dari <code>metadata.json</code>
            </p>
          </div>
        </div>

        <button
          onClick={loadValidationData}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          title="Muat Ulang Validasi Metadata"
        >
          <RefreshCw size={15} />
          <span>Refresh Metadata</span>
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>

        {/* Card 1: Total Items in JSON */}
        <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} color="#00f2fe" /> Total Item Metadata
          </span>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {summary.totalMetadataItems} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>Item</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {summary.totalExpectedFiles} berkas terdaftar
          </div>
        </div>

        {/* Card 2: Missing Files (Red Alert) */}
        <div
          onClick={() => setActiveFilter('missing')}
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '14px',
            border: `1px solid ${summary.totalMissingFiles > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
            background: summary.totalMissingFiles > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: summary.totalMissingFiles > 0 ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <XCircle size={15} color={summary.totalMissingFiles > 0 ? '#ef4444' : '#94a3b8'} /> ❌ Missing Files (Hilang)
          </span>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.totalMissingFiles > 0 ? '#ef4444' : '#fff', marginTop: '6px' }}>
            {summary.totalMissingFiles} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>Berkas</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: summary.totalMissingFiles > 0 ? '#fca5a5' : 'var(--text-muted)', marginTop: '4px' }}>
            {summary.totalMissingFiles > 0 ? '⚠️ Memerlukan Upload File' : 'Semua file fisik lengkap'}
          </div>
        </div>

        {/* Card 3: Valid Files (Green) */}
        <div
          onClick={() => setActiveFilter('valid')}
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            background: 'rgba(16, 185, 129, 0.05)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <CheckCircle size={15} color="#10b981" /> ✅ Valid Files (Tersedia)
          </span>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            {summary.totalValidFiles} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>Berkas</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '4px' }}>
            Siap diputar di server POD
          </div>
        </div>

        {/* Card 4: Folder Extra Files */}
        <div
          onClick={() => setActiveFilter('extra')}
          className="glass-card"
          style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Folder size={15} color="#f59e0b" /> 📁 Extra Files (Di Server)
          </span>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '6px' }}>
            {summary.totalUnreferencedSounds + summary.totalUnreferencedVideos} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>Berkas</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            🔊 {summary.physicalSoundsCount} Sounds | 🎬 {summary.physicalVideosCount} Videos
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeFilter === 'all' ? '1px solid #00f2fe' : '1px solid var(--border-color)',
              background: activeFilter === 'all' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.03)',
              color: activeFilter === 'all' ? '#00f2fe' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            📋 Semua Metadata ({items.length})
          </button>

          <button
            onClick={() => setActiveFilter('missing')}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeFilter === 'missing' ? '1px solid #ef4444' : '1px solid var(--border-color)',
              background: activeFilter === 'missing' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
              color: activeFilter === 'missing' ? '#fca5a5' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            ❌ Missing Files ({summary.totalMissingFiles})
          </button>

          <button
            onClick={() => setActiveFilter('valid')}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeFilter === 'valid' ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: activeFilter === 'valid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
              color: activeFilter === 'valid' ? '#6ee7b7' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            ✅ Valid Files ({summary.totalValidFiles})
          </button>

          <button
            onClick={() => setActiveFilter('extra')}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeFilter === 'extra' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              background: activeFilter === 'extra' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
              color: activeFilter === 'extra' ? '#fcd34d' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            📂 Physical Files di Server
          </button>
        </div>

        {/* Search Input Box */}
        {activeFilter !== 'extra' && (
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari judul, ID, atau nama file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{
                paddingLeft: '34px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '0.82rem',
                borderRadius: '8px'
              }}
            />
          </div>
        )}

      </div>

      {/* Content Display Mode 1: Physical Files Mode */}
      {activeFilter === 'extra' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

          {/* Sounds Folder List */}
          <div className="glass-card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Volume2 color="#00f2fe" size={18} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                Folder Audio (<code>/home/pod/sounds/</code>)
              </h4>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Daftar file di folder sounds yang <strong>tidak terdaftar</strong> di <code>metadata.json</code>:
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {unreferencedSounds.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Tidak ada file audio ekstra (semua file audio terdaftar di JSON).
                </div>
              ) : (
                unreferencedSounds.map((file, idx) => (
                  <div key={idx} className="font-mono" style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', color: '#f59e0b' }}>
                    🎵 {file}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Videos Folder List */}
          <div className="glass-card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Film color="#c084fc" size={18} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                Folder Video (<code>/home/pod/videos/</code>)
              </h4>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Daftar file di folder videos yang <strong>tidak terdaftar</strong> di <code>metadata.json</code>:
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {unreferencedVideos.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Tidak ada file video ekstra (semua file video terdaftar di JSON).
                </div>
              ) : (
                unreferencedVideos.map((file, idx) => (
                  <div key={idx} className="font-mono" style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', color: '#c084fc' }}>
                    🎬 {file}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Content Display Mode 2: Metadata Items Table Mode */
        <div className="glass-card" style={{ padding: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px' }}>Item Metadata</th>
                  <th style={{ padding: '12px 14px' }}>Kategori / Session</th>
                  <th style={{ padding: '12px 14px' }}>File Terdaftar & Status Keberadaan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status Item</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ditemukan data metadata yang sesuai dengan filter/pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const itemTitle = item.display || item.description || item.id || `Item #${idx + 1}`;
                    const files = item.__files || [];
                    const hasMissing = item.__hasMissing;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: hasMissing ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>

                        {/* Title & ID */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{itemTitle}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }} className="font-mono">
                            ID: {item.id} {item.duration ? `| Duration: ${item.duration}ms` : ''}
                          </div>
                        </td>

                        {/* Type & Session */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>
                            {item.type || 'Standard'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.session || '-'}
                          </div>
                        </td>

                        {/* Listed File Statuses */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {files.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                (Tidak ada nama file pada item ini)
                              </span>
                            ) : (
                              files.map((fileObj, fIdx) => (
                                <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: fileObj.category === 'video' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                                    color: fileObj.category === 'video' ? '#c084fc' : '#00f2fe'
                                  }}>
                                    {fileObj.category === 'video' ? '🎬 VIDEO' : '🔊 AUDIO'}
                                  </span>

                                  <span className="font-mono" style={{ fontSize: '0.78rem', color: fileObj.exists ? '#f8fafc' : '#fca5a5' }}>
                                    {fileObj.filename}
                                  </span>

                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: fileObj.exists ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                                    color: fileObj.exists ? '#10b981' : '#ef4444',
                                    border: `1px solid ${fileObj.exists ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`
                                  }}>
                                    {fileObj.exists ? `✅ ADA (${fileObj.foundPath})` : `❌ MISSING in ${fileObj.targetFolder}`}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Overall Item Status */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: hasMissing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: hasMissing ? '#ef4444' : '#10b981',
                            border: `1px solid ${hasMissing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}>
                            {hasMissing ? '❌ File Incomplete' : '✅ Complete'}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
