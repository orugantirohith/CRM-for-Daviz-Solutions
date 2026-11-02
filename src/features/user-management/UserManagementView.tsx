import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UserX,
  Mail,
  Phone,
  Search,
  Calendar,
  Lock,
  X,
  Clock,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ActionColumn } from '../../components/ui/ActionColumn';
import { formatDubaiDateTime, formatWhatsAppLink } from '../../lib/dates/dubaiDate';

interface UserManagementViewProps {
  currentUser: UserProfile;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToToggle, setUserToToggle] = useState<UserProfile | null>(null);
  const [toggleAction, setToggleAction] = useState<'deactivate' | 'activate'>('deactivate');

  // Create Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+971 50 ');
  const [roleId, setRoleId] = useState('sales_agent');
  const [tempPassword, setTempPassword] = useState('Welcome@2026');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Form states
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'suspended' | 'invited'>('active');
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  const roles = crmService.getRoles();
  const allUsers = useMemo(() => crmService.getUsers(), [refreshKey, currentUser]);

  // Filtered users list
  const users = useMemo(() => {
    return allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role_id !== roleFilter) return false;
      if (statusFilter !== 'all' && u.account_status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.display_name.toLowerCase().includes(q);
        const matchUsername = u.username.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchRole = (u.role_name || u.role_id).toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchEmail && !matchPhone && !matchRole) {
          return false;
        }
      }
      return true;
    });
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      crmService.createUser({
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role_id: roleId,
        password: tempPassword.trim() || 'Admin@123',
      });

      setIsCreateModalOpen(false);
      setUsername('');
      setDisplayName('');
      setEmail('');
      setPhone('+971 50 ');
      setTempPassword('Welcome@2026');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user account.');
    }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setEditDisplayName(user.display_name);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRoleId(user.role_id);
    setEditStatus(user.account_status);
    setEditEmailVerified(user.email_verified);
    setEditErrorMsg(null);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setEditErrorMsg(null);

    try {
      crmService.adminUpdateUser(selectedUserForEdit.id, {
        display_name: editDisplayName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role_id: editRoleId,
        account_status: editStatus,
        email_verified: editEmailVerified,
      });

      setSelectedUserForEdit(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Failed to update user account.');
    }
  };

  const handleConfirmToggle = () => {
    if (!userToToggle) return;
    try {
      const nextStatus = toggleAction === 'deactivate' ? 'inactive' : 'active';
      crmService.setUserStatus(userToToggle.id, nextStatus);
      setUserToToggle(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
      setUserToToggle(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    try {
      crmService.deleteUser(userToDelete.id);
      setUserToDelete(null);
      if (selectedUserForDetail?.id === userToDelete.id) {
        setSelectedUserForDetail(null);
      }
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500">
            Provision employee credentials, inspect profiles, update roles, toggle access, and delete accounts
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Employee Account</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees by name, username, email, phone or role..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:border-cyan-500"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:border-cyan-500"
          >
            <option value="all">All States</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card Stack (Small screens < 768px) */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
            No employee accounts found matching your query.
          </div>
        ) : (
          users.map((u) => {
            const isAdmin = u.role_id === 'admin';
            const adminCount = allUsers.filter((x) => x.role_id === 'admin').length;
            const isSelf = u.id === currentUser.id;
            const canDeleteUser = !isSelf && (!isAdmin || adminCount > 1);

            return (
              <div
                key={u.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* Card Top: Avatar, Name, Role & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs shrink-0">
                      {u.display_name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForDetail(u)}
                        className="font-bold text-slate-900 hover:text-cyan-700 text-left text-sm block truncate"
                      >
                        {u.display_name}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-500">@{u.username}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {u.role_name || u.role_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      u.account_status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : u.account_status === 'suspended'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {u.account_status}
                  </span>
                </div>

                {/* Contact & Verification Summary */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px] shrink-0">Email:</span>
                    <span className="font-medium text-slate-800 truncate text-right">{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[11px] shrink-0">Phone:</span>
                      <span className="font-mono text-slate-700 text-right">{u.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-200/50">
                    <span className="text-slate-400 text-[11px]">Verification:</span>
                    {u.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> OTP Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                        <AlertCircle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {!isSelf ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserToToggle(u);
                        setToggleAction(u.account_status === 'active' ? 'deactivate' : 'activate');
                      }}
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        u.account_status === 'active'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {u.account_status === 'active' ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Current User</span>
                  )}

                  <ActionColumn
                    phoneNumber={u.phone}
                    recordTitle={u.display_name}
                    onView={() => setSelectedUserForDetail(u)}
                    onEdit={() => openEditModal(u)}
                    onDelete={canDeleteUser ? () => setUserToDelete(u) : undefined}
                    canEdit={true}
                    canDelete={canDeleteUser}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Users Table (Screens >= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Email & Verification</th>
                <th className="py-3 px-4">Profile Status</th>
                <th className="py-3 px-4">Account State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employee accounts found matching your query.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isAdmin = u.role_id === 'admin';
                  const adminCount = allUsers.filter((x) => x.role_id === 'admin').length;
                  const isSelf = u.id === currentUser.id;
                  const canDeleteUser = !isSelf && (!isAdmin || adminCount > 1);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {u.display_name.slice(0, 2)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDetail(u)}
                              className="font-bold text-slate-900 hover:text-cyan-700 text-left transition-colors block"
                            >
                              {u.display_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">{u.phone || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-600">@{u.username}</td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {u.role_name || u.role_id}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800 block truncate max-w-[170px]">{u.email}</span>
                        {u.email_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> OTP Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                            <AlertCircle className="w-3 h-3" /> Unverified (Needs Setup)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.profile_completed ? (
                          <span className="text-[11px] text-emerald-700 font-medium">Completed</span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-medium">First Login Pending</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            u.account_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.account_status === 'suspended'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {u.account_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Deactivate/Reactivate toggle */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToToggle(u);
                                setToggleAction(u.account_status === 'active' ? 'deactivate' : 'activate');
                              }}
                              title={u.account_status === 'active' ? 'Deactivate Access' : 'Reactivate Access'}
                              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                                u.account_status === 'active'
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.account_status === 'active' ? (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span className="hidden xl:inline">Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span className="hidden xl:inline">Reactivate</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Reusable Action Column for View (Read), Edit, and Delete */}
                          <ActionColumn
                            phoneNumber={u.phone}
                            recordTitle={u.display_name}
                            onView={() => setSelectedUserForDetail(u)}
                            onEdit={() => openEditModal(u)}
                            onDelete={canDeleteUser ? () => setUserToDelete(u) : undefined}
                            canEdit={true}
                            canDelete={canDeleteUser}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* READ / VIEW USER DETAILS MODAL */}
      {selectedUserForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Employee Profile & Identity</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForDetail(null)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs overflow-y-auto flex-1">
              {/* Header profile summary */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-base shadow-sm uppercase">
                  {selectedUserForDetail.display_name.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedUserForDetail.display_name}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">@{selectedUserForDetail.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {selectedUserForDetail.role_name || selectedUserForDetail.role_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        selectedUserForDetail.account_status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {selectedUserForDetail.account_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Items */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Company Email</span>
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedUserForDetail.email}</span>
                  </div>
                  {selectedUserForDetail.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> OTP Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Unverified (Setup Required)
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">UAE Contact Phone</span>
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedUserForDetail.phone || 'Not provided'}</span>
                  </div>
                  {selectedUserForDetail.phone && (
                    <a
                      href={formatWhatsAppLink(selectedUserForDetail.phone, `Hello ${selectedUserForDetail.display_name}, DAVIZ Solutions CRM admin notification.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline font-semibold"
                    >
                      <MessageCircle className="w-3 h-3" /> Chat on WhatsApp
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Profile Setup State</span>
                  <span className="text-slate-800 font-medium block">
                    {selectedUserForDetail.profile_completed ? 'Completed' : 'First-login onboarding pending'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Password Security</span>
                  <span className="text-slate-800 font-medium block">
                    {selectedUserForDetail.must_change_password ? 'Must change on next login' : 'Permanent password active'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Account Created (Dubai)</span>
                  <span className="text-slate-600 font-mono text-[11px] block">
                    {formatDubaiDateTime(selectedUserForDetail.created_at)}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Last Modified (Dubai)</span>
                  <span className="text-slate-600 font-mono text-[11px] block">
                    {formatDubaiDateTime(selectedUserForDetail.updated_at)}
                  </span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {selectedUserForDetail.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedUserForDetail;
                        setSelectedUserForDetail(null);
                        setUserToDelete(target);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Delete Account
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedUserForDetail;
                      setSelectedUserForDetail(null);
                      openEditModal(target);
                    }}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
                  >
                    Edit Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForDetail(null)}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER ACCOUNT MODAL */}
      {selectedUserForEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Edit Employee Account: @{selectedUserForEdit.username}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {editErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {editErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username (Fixed)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedUserForEdit.username}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account State</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">UAE Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Email OTP Verification Status</span>
                  <span className="text-[11px] text-slate-500">
                    {editEmailVerified ? 'Marked as verified.' : 'Currently unverified (OTP setup required).'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEmailVerified}
                    onChange={(e) => setEditEmailVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROVISION ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Provision Employee Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mansoor.a"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Mansoor Al-Ketbi"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mansoor@daviz.ae"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Employee will verify ownership of this email via a 6-digit OTP during first login.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assign Role</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">UAE Mobile</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Initial Temporary Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Employee will be prompted to set a permanent password upon first login.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR ACTIVATION / DEACTIVATION */}
      {userToToggle && (
        <ConfirmDialog
          isOpen={Boolean(userToToggle)}
          title={`${toggleAction === 'deactivate' ? 'Deactivate' : 'Reactivate'} Account`}
          message={`Are you sure you want to ${toggleAction} account access for ${userToToggle.display_name} (@${userToToggle.username})? Historical lead ownership, visits, and logged activities will remain preserved.`}
          confirmLabel={toggleAction === 'deactivate' ? 'Deactivate Access' : 'Reactivate'}
          isDestructive={toggleAction === 'deactivate'}
          onConfirm={handleConfirmToggle}
          onCancel={() => setUserToToggle(null)}
        />
      )}

      {/* CONFIRMATION DIALOG FOR USER DELETION */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={Boolean(userToDelete)}
          title="Delete Employee Account"
          message={`Are you sure you want to permanently delete employee account "${userToDelete.display_name}" (@${userToDelete.username})? This action will permanently remove their credentials and cannot be undone.`}
          confirmLabel="Delete Permanently"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};
