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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-[92vw] max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-black/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Users className="text-cyan-400 w-6 h-6" />
            <h2 className="text-xl font-bold text-white">
              Kelola Persetujuan Pengguna (User Approval)
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={loadUsers} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <Check size={16} className="text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2 font-medium">
            <RefreshCw className="animate-spin text-cyan-400" size={18} />
            <span>Memuat data akun pengguna...</span>
          </div>
        ) : (
          <div className="overflow-x-auto bg-black/40 border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">User Profile</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Status Persetujuan</th>
                  <th className="p-3.5">Hak Akses Role</th>
                  <th className="p-3.5 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuperAdmin = u.role === 'superadmin';
                  const isApproved = u.status === 'approved';
                  const isPending = u.status === 'pending';

                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      {/* Name & Picture */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} className="w-7 h-7 rounded-full" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 font-bold flex items-center justify-center text-xs">
                              {u.name ? u.name[0] : 'U'}
                            </div>
                          )}
                          <div className="font-semibold text-white">{u.name || 'User'}</div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 text-slate-300 font-mono">
                        {u.email}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isApproved
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isPending
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}>
                          {isApproved && <ShieldCheck size={13} />}
                          {isPending && <Clock size={13} />}
                          {!isApproved && !isPending && <UserX size={13} />}
                          <span className="uppercase">{u.status}</span>
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <span className={`font-bold ${isSuperAdmin ? 'text-cyan-400' : 'text-purple-400'}`}>
                          {isSuperAdmin ? '⭐ Super Admin' : 'Admin'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        {!isSuperAdmin && (
                          <div className="flex gap-2 justify-end">
                            {isPending && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'approved', 'admin')}
                                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Setujui Akun Admin"
                              >
                                <Check size={14} /> Setujui
                              </button>
                            )}

                            {isApproved && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'rejected', 'admin')}
                                className="px-3 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Tolak / Nonaktifkan Akun"
                              >
                                <UserX size={14} /> Nonaktifkan
                              </button>
                            )}

                            {!isApproved && !isPending && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'approved', 'admin')}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                Aktifkan Kembali
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
