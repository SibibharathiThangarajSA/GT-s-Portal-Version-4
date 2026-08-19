import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  Key
} from 'lucide-react';
import { UserManagementRecord } from '../../types';
import {
  fetchUserManagementRecordsApi,
  saveUserManagementRecordsApi
} from '../../services/api';
import { getDefaultPasswordForEmail } from '../../services/authCredentials';
import { useToast } from '../../context/ToastContext';

export const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+61', label: '+61 (AU)' },
  { code: '+49', label: '🇩🇪 +49 (DE)' },
  { code: '+81', label: '🇯🇵 +81 (JP)' }
];

interface FormCredentialEntry {
  id: string;
  role: 'Employee' | 'Admin' | 'Associate';
  vamId: string;
  name: string;
  countryCode?: string;
  phoneNumber: string;
  email: string;
  addedOn: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Employee' | 'Admin' | 'Associate'>('ALL');

  // Edit modal country code state
  const [editCountryCode, setEditCountryCode] = useState('+91');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEntries, setFormEntries] = useState<FormCredentialEntry[]>([]);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserManagementRecord | null>(null);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<UserManagementRecord | null>(null);

  const { addToast } = useToast();

  const getTodayFormatted = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Load records
  useEffect(() => {
    const loadRecords = async () => {
      setIsLoading(true);
      try {
        const records = await fetchUserManagementRecordsApi();
        setUsers(records);
      } catch (e) {
        console.error('Failed to load user roster', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecords();
  }, []);

  // Filtered and searched records
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.vamId && u.vamId.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q));

      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, pageSize]);

  // Open Add Modal with 1 fresh row
  const handleOpenAddModal = () => {
    setFormEntries([
      {
        id: `entry-${Date.now()}-0`,
        role: 'Employee',
        vamId: '',
        name: '',
        countryCode: '+91',
        phoneNumber: '',
        email: '',
        addedOn: getTodayFormatted()
      }
    ]);
    setIsAddModalOpen(true);
  };

  // Add another row in modal
  const handleAddAnotherRow = () => {
    setFormEntries((prev) => [
      ...prev,
      {
        id: `entry-${Date.now()}-${prev.length}`,
        role: 'Associate',
        vamId: '',
        name: '',
        countryCode: '+91',
        phoneNumber: '',
        email: '',
        addedOn: getTodayFormatted()
      }
    ]);
  };

  // Remove row in modal
  const handleRemoveRow = (index: number) => {
    if (formEntries.length <= 1) return;
    setFormEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // Update entry field in modal
  const handleUpdateEntry = (index: number, field: keyof FormCredentialEntry, value: any) => {
    setFormEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index], [field]: value };

      // If switching to Associate: blank out VAM ID and Mail ID
      if (field === 'role' && value === 'Associate') {
        entry.vamId = '';
        entry.email = '';
      }

      updated[index] = entry;
      return updated;
    });
  };

  // Save new credentials
  const handleSaveAddModal = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (let i = 0; i < formEntries.length; i++) {
      const entry = formEntries[i];
      if (!entry.name.trim()) {
        addToast('error', `Row ${i + 1}: Name is required.`);
        return;
      }
      if (!entry.phoneNumber.trim() || entry.phoneNumber.replace(/\D/g, '').length < 10) {
        addToast('error', `Row ${i + 1}: Valid 10-digit mobile number is required.`);
        return;
      }
      if (entry.role !== 'Associate' && (!entry.email.trim() || !entry.email.includes('@'))) {
        addToast('error', `Row ${i + 1}: Valid enterprise email is required for ${entry.role}.`);
        return;
      }
    }

    const newRecords: UserManagementRecord[] = formEntries.map((entry, idx) => {
      const cleanEmail = entry.role === 'Associate' ? '-' : entry.email.trim();
      const cleanVam = entry.role === 'Associate' ? '-' : (entry.vamId.trim() || '-');
      const defaultPw = cleanEmail !== '-' ? getDefaultPasswordForEmail(cleanEmail) : undefined;

      return {
        id: `usr-${Date.now()}-${idx}`,
        vamId: cleanVam,
        name: entry.name.trim(),
        phoneNumber: entry.phoneNumber.replace(/\D/g, '').trim(),
        email: cleanEmail,
        addedOn: entry.addedOn || getTodayFormatted(),
        role: entry.role,
        status: 'Active',
        access: 'Enabled',
        addedBy: 'Admin',
        password: defaultPw,
        batch: 'GT-2026-Batch-01'
      };
    });

    const combined = [...newRecords, ...users];
    setUsers(combined);
    await saveUserManagementRecordsApi(combined);

    setIsAddModalOpen(false);
    addToast('success', `${newRecords.length} credential record(s) added successfully.`);
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editingUser.name.trim()) {
      addToast('error', 'Name is required.');
      return;
    }
    if (!editingUser.phoneNumber.trim() || editingUser.phoneNumber.replace(/\D/g, '').length < 10) {
      addToast('error', 'Valid 10-digit mobile number is required.');
      return;
    }
    if (editingUser.role !== 'Associate' && (!editingUser.email || !editingUser.email.includes('@'))) {
      addToast('error', `Valid enterprise email is required for ${editingUser.role}.`);
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.id === editingUser.id) {
        const cleanEmail = editingUser.role === 'Associate' ? '-' : editingUser.email;
        const cleanVam = editingUser.role === 'Associate' ? '-' : (editingUser.vamId || '-');
        const defaultPw = cleanEmail !== '-' ? getDefaultPasswordForEmail(cleanEmail!) : undefined;

        return {
          ...editingUser,
          vamId: cleanVam,
          email: cleanEmail,
          password: u.password || defaultPw
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    await saveUserManagementRecordsApi(updatedUsers);
    setEditingUser(null);
    addToast('success', `Credentials for ${editingUser.name} updated successfully.`);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    const updated = users.filter((u) => u.id !== deletingUser.id);
    setUsers(updated);
    await saveUserManagementRecordsApi(updated);
    addToast('info', `Removed credentials for ${deletingUser.name}.`);
    setDeletingUser(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Employee':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Associate':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">User Management</h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredUsers.length}</span> of {users.length} total trainees
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

          {/* Global Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, VAM ID, Phone, Email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Buttons / Dropdown */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['ALL', 'Employee', 'Associate', 'Admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === r
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {r === 'ALL' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header matching the screenshot */}
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
              <tr>
                <th className="py-4 px-4 text-center w-12 text-slate-700">S.No.</th>
                <th className="py-4 px-4 text-slate-700">VAM ID</th>
                <th className="py-4 px-4 text-slate-700">Emp Name</th>
                <th className="py-4 px-4 text-slate-700">Phone Number</th>
                <th className="py-4 px-4 text-slate-700">Mail ID</th>
                <th className="py-4 px-4 text-slate-700">Added On</th>
                <th className="py-4 px-4 text-slate-700">Role</th>
                <th className="py-4 px-4 text-right text-slate-700">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your filters or add new credentials.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* S.No */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500 text-[11px]">
                        {sNo}
                      </td>

                      {/* VAM ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {u.vamId && u.vamId !== '-' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                            {u.vamId}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Emp Name */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {u.phoneNumber && u.phoneNumber !== '-' ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Mail ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {u.email && u.email !== '-' ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-blue-500" />
                            <span>{u.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Added On */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{u.addedOn || '20-Jan-2025'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Edit Credentials"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination matching screenshot */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredUsers.length}</span> trainees
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
              </select>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage === page
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: ADD CREDENTIAL (WITH MULTI-ROW "+ ADD ANOTHER")              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 my-8 animate-fadeIn max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Add User Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign roles, enter enterprise details, and configure auto-passwords.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Body */}
            <form onSubmit={handleSaveAddModal} className="flex-1 overflow-y-auto pr-1 space-y-6">
              {formEntries.map((entry, index) => {
                const isAssociate = entry.role === 'Associate';

                return (
                  <div
                    key={entry.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4 relative"
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-extrabold text-xs text-slate-800">
                          Credential #{index + 1} ({entry.role})
                        </span>
                      </div>

                      {formEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Entry Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">

                      {/* Role Dropdown */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Role *</label>
                        <select
                          value={entry.role}
                          onChange={(e) => handleUpdateEntry(index, 'role', e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-xs"
                        >
                          <option value="Employee">Employee (Enterprise)</option>
                          <option value="Associate">Associate (Mobile Only)</option>
                          <option value="Admin">Admin (L&D Leader)</option>
                        </select>
                      </div>

                      {/* VAM ID (Blocked for Associate) */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          VAM ID {isAssociate && <span className="text-slate-400 font-normal">(Blocked for Associate)</span>}
                        </label>
                        <input
                          type="text"
                          disabled={isAssociate}
                          value={isAssociate ? '' : entry.vamId}
                          onChange={(e) => handleUpdateEntry(index, 'vamId', e.target.value)}
                          placeholder={isAssociate ? '— Disabled for Associate —' : 'e.g. 105527'}
                          className={`w-full border rounded-xl px-3 py-2 font-medium focus:outline-none shadow-xs ${isAssociate
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed italic'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10'
                            }`}
                        />
                      </div>

                      {/* Emp Name */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Emp Name *</label>
                        <input
                          type="text"
                          required
                          value={entry.name}
                          onChange={(e) => handleUpdateEntry(index, 'name', e.target.value)}
                          placeholder="e.g. Sibibharathi Thangaraj"
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-xs"
                        />
                      </div>

                      {/* Phone Number with Country Code Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-700 font-bold">Phone Number (10 Digits) *</label>
                          <span className="text-[10px] font-mono text-slate-400">
                            {entry.phoneNumber.length}/10
                          </span>
                        </div>
                        <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/10">
                          <select
                            value={entry.countryCode || '+91'}
                            onChange={(e) => handleUpdateEntry(index, 'countryCode', e.target.value)}
                            className="bg-slate-100/90 px-2.5 py-2 text-xs font-bold text-slate-700 border-r border-slate-300 focus:outline-none cursor-pointer"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={entry.phoneNumber}
                            onChange={(e) => handleUpdateEntry(index, 'phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9345766068"
                            className="w-full px-3 py-2 font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Mail ID (Blocked for Associate) */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Mail ID {!isAssociate ? '*' : <span className="text-slate-400 font-normal">(Blocked for Associate)</span>}
                        </label>
                        <input
                          type="email"
                          disabled={isAssociate}
                          required={!isAssociate}
                          value={isAssociate ? '' : entry.email}
                          onChange={(e) => handleUpdateEntry(index, 'email', e.target.value)}
                          placeholder={isAssociate ? '— Disabled for Associate —' : 'e.g. name@valuemomentum.com'}
                          className={`w-full border rounded-xl px-3 py-2 font-medium focus:outline-none shadow-xs ${isAssociate
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed italic'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10'
                            }`}
                        />
                      </div>

                      {/* Added On (Timestamp, Fixed) */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Added On (Timestamp)</label>
                        <input
                          type="text"
                          readOnly
                          value={entry.addedOn}
                          className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3 py-2 font-medium cursor-not-allowed"
                        />
                      </div>

                    </div>

                    {/* Default Password Hint */}
                    {!isAssociate && entry.email && entry.email.includes('@') && (
                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-800 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          Default login password will be auto-set to: <strong className="font-mono text-blue-900">{getDefaultPasswordForEmail(entry.email)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Another Row Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddAnotherRow}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add Another</span>
                </button>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Credentials ({formEntries.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL: EDIT CREDENTIAL                                              */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 my-8 animate-fadeIn">

            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Edit User Credentials</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Role *</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-600"
                >
                  <option value="Employee">Employee</option>
                  <option value="Associate">Associate</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">VAM ID</label>
                <input
                  type="text"
                  disabled={editingUser.role === 'Associate'}
                  value={editingUser.role === 'Associate' ? '' : (editingUser.vamId || '')}
                  onChange={(e) => setEditingUser({ ...editingUser, vamId: e.target.value })}
                  placeholder={editingUser.role === 'Associate' ? '— Disabled for Associate —' : 'e.g. 105527'}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Emp Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              {/* Phone Number with Country Code Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Phone Number (10 Digits) *</label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(editingUser.phoneNumber || '').replace(/\D/g, '').length}/10
                  </span>
                </div>
                <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <select
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value)}
                    className="bg-slate-100/90 px-2.5 py-2 text-xs font-bold text-slate-700 border-r border-slate-300 focus:outline-none cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editingUser.phoneNumber}
                    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9345766068"
                    className="w-full px-3 py-2 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mail ID</label>
                <input
                  type="email"
                  disabled={editingUser.role === 'Associate'}
                  value={editingUser.role === 'Associate' ? '' : (editingUser.email || '')}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder={editingUser.role === 'Associate' ? '— Disabled for Associate —' : 'e.g. name@valuemomentum.com'}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  Update Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL: DELETE CONFIRMATION                                          */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-slate-900">Delete User Credentials</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.role})?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
