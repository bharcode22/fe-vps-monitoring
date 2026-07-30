import React, { useState, useEffect } from 'react';
import { X, Users, ShieldCheck, Clock, UserX, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchAllUsersApi, updateUserStatusApi } from '../../api/vpsApi';

export default function UserManagementModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchAllUsersApi();
      setUsers(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, newStatus, newRole) => {
    setActionSuccess('');
    setErrorMsg('');
    try {
      const res = await updateUserStatusApi(userId, newStatus, newRole);
      setActionSuccess(res.message || 'Status pengguna berhasil diperbarui.');
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui status pengguna.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-aos-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '1100px',
          padding: '34px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="#00f2fe" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
              Kelola Persetujuan Pengguna (User Approval)
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadUsers} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Memuat daftar pengguna...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Belum ada akun pengguna terdaftar.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>User / Email</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Aksi Approval</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSuperAdmin = u.email === 'zaqqwer758@gmail.com';
                  const isApproved = u.status === 'approved';
                  const isPending = u.status === 'pending';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.2)', color: '#00f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {u.email[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{u.name || u.email}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: u.role === 'super_admin' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(192, 132, 252, 0.2)',
                          color: u.role === 'super_admin' ? '#00f2fe' : '#c084fc'
                        }}>
                          {u.role === 'super_admin' ? '⭐ Super Admin' : 'Admin'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: isApproved ? 'rgba(16, 185, 129, 0.15)' : (isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                          color: isApproved ? '#10b981' : (isPending ? '#f59e0b' : '#ef4444')
                        }}>
                          {isApproved ? <ShieldCheck size={14} /> : (isPending ? <Clock size={14} /> : <UserX size={14} />)}
                          {isApproved ? 'Approved' : (isPending ? 'Pending' : 'Rejected')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        {isSuperAdmin ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>(Utama)</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {!isApproved && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'approved', 'admin')}
                                className="btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                title="Setujui Akun Ini"
                              >
                                <Check size={14} /> Setujui
                              </button>
                            )}
                            {u.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'rejected', 'admin')}
                                className="btn-danger"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                title="Tolak Akun Ini"
                              >
                                <UserX size={14} /> Tolak
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
