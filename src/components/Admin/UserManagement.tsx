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
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Key
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserManagementRecord } from '../../types';
import {
  fetchUserManagementRecordsApi,
  saveUserManagementRecordsApi,
  deleteUserManagementRecordApi
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
  designation: string;
  addedOn: string;
  password?: string;
}

export const getEffectiveDesignation = (user: { designation?: string; role?: string }): string => {
  const d = (user.designation || '').trim();
  if (d && d !== '-') return d;
  if (user.role === 'Admin') return 'Lead - L&D Leadership';
  if (user.role === 'Associate') return 'Associate Trainee';
  return 'Graduate Trainee';
};

export const isValidEnterpriseEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith('@valuemomentum.com') || lower.endsWith('@owlsure.com');
};


export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Employee' | 'Admin' | 'Associate'>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');

  // Edit modal country code state
  const [editCountryCode, setEditCountryCode] = useState('+91');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Modal State with auto-preservation across reloads
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => {
    return sessionStorage.getItem('gt_admin_user_add_modal_open') === 'true';
  });
  const [formEntries, setFormEntries] = useState<FormCredentialEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem('gt_admin_user_form_entries');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  });

  useEffect(() => {
    if (isAddModalOpen && formEntries.length > 0) {
      sessionStorage.setItem('gt_admin_user_form_entries', JSON.stringify(formEntries));
      sessionStorage.setItem('gt_admin_user_add_modal_open', 'true');
    } else if (!isAddModalOpen) {
      sessionStorage.removeItem('gt_admin_user_form_entries');
      sessionStorage.removeItem('gt_admin_user_add_modal_open');
    }
  }, [formEntries, isAddModalOpen]);

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
        // Normalize any record missing designation so everything is standardized
        const normalized = records.map((u) => ({
          ...u,
          designation: getEffectiveDesignation(u)
        }));
        setUsers(normalized);
      } catch (e) {
        console.error('Failed to load user roster', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecords();
  }, []);

  // Dynamically extract every distinct designation present in the table records
  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const desig = getEffectiveDesignation(u);
      if (desig) set.add(desig);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  // Filtered and searched records
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const uDesignation = getEffectiveDesignation(u);
      const matchesDesignation =
        designationFilter === 'ALL' ||
        uDesignation.trim().toLowerCase() === designationFilter.trim().toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.vamId && u.vamId.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (uDesignation && uDesignation.toLowerCase().includes(q));

      return matchesRole && matchesDesignation && matchesSearch;
    });
  }, [users, roleFilter, designationFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, designationFilter, pageSize]);

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
        designation: 'Graduate Trainee',
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
        role: 'Employee',
        vamId: '',
        name: '',
        countryCode: '+91',
        phoneNumber: '',
        email: '',
        designation: 'Graduate Trainee',
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

      // Handle role change designation defaults
      if (field === 'role') {
        if (value === 'Associate') {
          if (!entry.designation || entry.designation === 'Graduate Trainee' || entry.designation === 'Lead - L&D Leadership') {
            entry.designation = 'Associate Trainee';
          }
        } else if (value === 'Admin') {
          if (!entry.designation || entry.designation === 'Graduate Trainee' || entry.designation === 'Associate Trainee') {
            entry.designation = 'Lead - L&D Leadership';
          }
        } else if (value === 'Employee') {
          if (!entry.designation || entry.designation === 'Associate Trainee' || entry.designation === 'Lead - L&D Leadership') {
            entry.designation = 'Graduate Trainee';
          }
        }
      }

      updated[index] = entry;
      return updated;
    });
  };

  // Save new credentials
  const handleSaveAddModal = async (e: React.FormEvent) => {
    e.preventDefault();

    const seenBatchPhones = new Set<string>();
    const seenBatchEmails = new Set<string>();
    const seenBatchVamIds = new Set<string>();

    // Validation
    for (let i = 0; i < formEntries.length; i++) {
      const entry = formEntries[i];
      const rowLabel = formEntries.length > 1 ? `Row ${i + 1}: ` : '';

      if (!entry.name.trim()) {
        addToast('error', `${rowLabel}Name is required.`);
        return;
      }

      const cleanPhone = entry.phoneNumber.replace(/\D/g, '').trim();
      if (!cleanPhone || cleanPhone.length < 10) {
        addToast('error', `${rowLabel}Valid 10-digit mobile number is required.`);
        return;
      }

      // Check if phone number already exists in registered roster
      const existingUserWithPhone = users.find(
        (u) => (u.phoneNumber || '').replace(/\D/g, '').trim() === cleanPhone
      );
      if (existingUserWithPhone) {
        addToast(
          'error',
          `${rowLabel}Phone number "${cleanPhone}" already exists for ${existingUserWithPhone.name} (${existingUserWithPhone.role}). Duplicate phone numbers are not allowed.`
        );
        return;
      }

      // Check if phone number is duplicated within the current add form entries
      if (seenBatchPhones.has(cleanPhone)) {
        addToast(
          'error',
          `${rowLabel}Phone number "${cleanPhone}" is entered more than once. Each user must have a unique phone number.`
        );
        return;
      }
      seenBatchPhones.add(cleanPhone);

      // Email & VAM validations for Employee / Admin / Associate roles
      const cleanEmail = entry.email ? entry.email.trim().toLowerCase() : '';
      if (entry.role !== 'Associate' || cleanEmail.length > 0) {
        if (!cleanEmail || !cleanEmail.includes('@')) {
          addToast('error', `${rowLabel}Valid enterprise email is required.`);
          return;
        }

        if (!isValidEnterpriseEmail(cleanEmail)) {
          addToast(
            'error',
            `${rowLabel}Invalid email domain. Only enterprise email domains (@valuemomentum.com and @owlsure.com) are allowed.`
          );
          return;
        }

        const existingUserWithEmail = users.find(
          (u) => u.email && u.email !== '-' && u.email.trim().toLowerCase() === cleanEmail
        );
        if (existingUserWithEmail) {
          addToast('error', `${rowLabel}Email ID "${cleanEmail}" is already registered for ${existingUserWithEmail.name}.`);
          return;
        }

        if (seenBatchEmails.has(cleanEmail)) {
          addToast('error', `${rowLabel}Email "${cleanEmail}" is duplicated in multiple rows.`);
          return;
        }
        seenBatchEmails.add(cleanEmail);

        if (entry.vamId && entry.vamId.trim() && entry.vamId.trim() !== '-') {
          const cleanVam = entry.vamId.trim();
          const existingUserWithVam = users.find(
            (u) => u.vamId && u.vamId !== '-' && u.vamId.trim().toLowerCase() === cleanVam.toLowerCase()
          );
          if (existingUserWithVam) {
            addToast('error', `${rowLabel}VAM ID "${cleanVam}" already exists for ${existingUserWithVam.name}.`);
            return;
          }
          if (seenBatchVamIds.has(cleanVam.toLowerCase())) {
            addToast('error', `${rowLabel}VAM ID "${cleanVam}" is duplicated in multiple rows.`);
            return;
          }
          seenBatchVamIds.add(cleanVam.toLowerCase());
        }
      }
    }

    const newRecords: UserManagementRecord[] = formEntries.map((entry, idx) => {
      const cleanEmail = (entry.email && entry.email.trim()) ? entry.email.trim() : '-';
      const cleanVam = (entry.vamId && entry.vamId.trim()) ? entry.vamId.trim() : '-';
      const defaultPw = cleanEmail !== '-' ? (entry.password || getDefaultPasswordForEmail(cleanEmail)) : undefined;
      const defaultDesig = entry.role === 'Admin' ? 'Lead - L&D Leadership' : entry.role === 'Associate' ? 'Associate Trainee' : 'Graduate Trainee';

      return {
        id: `usr-${Date.now()}-${idx}`,
        vamId: cleanVam,
        name: entry.name.trim(),
        phoneNumber: entry.phoneNumber.replace(/\D/g, '').trim(),
        email: cleanEmail,
        designation: entry.designation?.trim() || defaultDesig,
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

    setFormEntries([]);
    sessionStorage.removeItem('gt_admin_user_form_entries');
    sessionStorage.removeItem('gt_admin_user_add_modal_open');
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

    const cleanPhone = editingUser.phoneNumber.replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      addToast('error', 'Valid 10-digit mobile number is required.');
      return;
    }

    const cleanEmail = (editingUser.email || '').trim().toLowerCase();
    if (editingUser.role !== 'Associate' || (cleanEmail && cleanEmail !== '-')) {
      if (!cleanEmail || !cleanEmail.includes('@')) {
        addToast('error', 'Valid enterprise email is required.');
        return;
      }
      if (!isValidEnterpriseEmail(cleanEmail)) {
        addToast('error', 'Invalid email domain. Only @valuemomentum.com and @owlsure.com are allowed.');
        return;
      }
    }

    const defaultDesig = editingUser.role === 'Admin' ? 'Lead - L&D Leadership' : editingUser.role === 'Associate' ? 'Associate Trainee' : 'Graduate Trainee';

    const updatedUsers = users.map((u) => {
      if (u.id === editingUser.id) {
        const cleanEmail = (editingUser.email && editingUser.email.trim()) ? editingUser.email.trim() : '-';
        const cleanVam = (editingUser.vamId && editingUser.vamId.trim()) ? editingUser.vamId.trim() : '-';
        const defaultPw = cleanEmail !== '-' ? (editingUser.password || u.password || getDefaultPasswordForEmail(cleanEmail)) : undefined;

        return {
          ...editingUser,
          phoneNumber: cleanPhone,
          vamId: cleanVam,
          email: cleanEmail,
          designation: editingUser.designation?.trim() || defaultDesig,
          password: defaultPw
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    await saveUserManagementRecordsApi(updatedUsers);
    setEditingUser(null);
    addToast('success', `Credentials for ${editingUser.name} updated successfully.`);
  };

  // Delete User Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    const userToRemove = deletingUser;
    const updated = users.filter((u) => u.id !== userToRemove.id);
    setUsers(updated);
    setDeletingUser(null);
    await deleteUserManagementRecordApi(userToRemove.id);
    await saveUserManagementRecordsApi(updated);
    addToast('info', `Removed ${userToRemove.name} from roster.`);
  };

  // Export Excel (.xlsx) - Exports strictly the filtered table records currently visible
  const handleExportExcel = () => {
    if (filteredUsers.length === 0) {
      addToast('error', 'No matching records found to export.');
      return;
    }

    const dataToExport = filteredUsers.map((u, i) => ({
      'S.No.': i + 1,
      'VAM ID': u.vamId && u.vamId !== '-' ? u.vamId : '-',
      'Emp Name': u.name || '-',
      'Phone Number': u.phoneNumber || '-',
      'Mail ID': u.email && u.email !== '-' ? u.email : '-',
      'Added On': u.addedOn || '-',
      'Role': u.role || 'Employee',
      'Designation': u.designation || (u.role === 'Admin' ? 'Lead - L&D Leadership' : u.role === 'Associate' ? 'Associate Trainee' : 'Graduate Trainee')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit column widths for a clean Excel appearance
    const colWidths = [
      { wch: 8 },  // S.No.
      { wch: 14 }, // VAM ID
      { wch: 28 }, // Emp Name
      { wch: 16 }, // Phone Number
      { wch: 38 }, // Mail ID
      { wch: 14 }, // Added On
      { wch: 14 }, // Role
      { wch: 30 }  // Designation
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Roster');

    XLSX.writeFile(workbook, `User_Credentials_Roster_${getTodayFormatted()}.xlsx`);
    addToast('success', `${filteredUsers.length} filtered user record(s) exported to Excel successfully.`);
  };

  // Role Badge Styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Associate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Employee':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold uppercase tracking-wide">
              Directory & Authentication
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Total: {users.length} registered accounts
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            User Management
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Manage enterprise employee accounts, associate mobile access, L&D leadership credentials, and designations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Download Excel Workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Add Credential Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

          {/* Global Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, VAM ID, Phone, Email, Designation..."
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

          {/* Filters Row: Role Buttons + Designation Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['ALL', 'Employee', 'Associate', 'Admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${roleFilter === r
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {r === 'ALL' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            {/* Designation Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1 pl-2 text-slate-500">
                <span className="text-[11px] font-bold">Designation:</span>
              </div>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
              >
                <option value="ALL">All Designations ({uniqueDesignations.length})</option>
                {uniqueDesignations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button (If active) */}
            {(roleFilter !== 'ALL' || designationFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setRoleFilter('ALL');
                  setDesignationFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 underline transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header with Designation Column */}
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
              <tr>
                <th className="py-4 px-4 text-center w-12 text-slate-700">S.No.</th>
                <th className="py-4 px-4 text-slate-700">VAM ID</th>
                <th className="py-4 px-4 text-slate-700">Emp Name</th>
                <th className="py-4 px-4 text-slate-700">Phone Number</th>
                <th className="py-4 px-4 text-slate-700">Mail ID</th>
                <th className="py-4 px-4 text-slate-700">Added On</th>
                <th className="py-4 px-4 text-slate-700">Role</th>
                <th className="py-4 px-4 text-slate-700">Designation</th>
                <th className="py-4 px-4 text-right text-slate-700">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your filters or add new credentials.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  const displayDesignation = u.designation || (u.role === 'Admin' ? 'Lead - L&D Leadership' : u.role === 'Associate' ? 'Associate Trainee' : 'Graduate Trainee');

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

                      {/* Designation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-900 font-bold text-xs">
                          {displayDesignation}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser({ ...u, designation: displayDesignation })}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer"
                            title="Edit Credentials"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
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

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredUsers.length}</span> records
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
      {/* POPUP MODAL: ADD CREDENTIAL (CLEAN VERTICAL FORM LAYOUT)                  */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 my-8 animate-fadeIn max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Add User Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure role, enterprise credentials, phone verification, and designation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Body (Vertical Layout) */}
            <form onSubmit={handleSaveAddModal} className="flex-1 overflow-y-auto pr-1 space-y-6">
              {formEntries.map((entry, index) => {
                const isAssociate = entry.role === 'Associate';

                return (
                  <div
                    key={entry.id}
                    className="p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 relative shadow-xs"
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {index + 1}
                        </span>
                        <span className="font-black text-sm text-slate-800">
                          Credential Entry #{index + 1} ({entry.role})
                        </span>
                      </div>

                      {formEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Entry Vertical Fields Container */}
                    <div className="flex flex-col space-y-4 text-xs">

                      {/* 1. Role Dropdown */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Role *</label>
                        <select
                          value={entry.role}
                          onChange={(e) => handleUpdateEntry(index, 'role', e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-xs"
                        >
                          <option value="Employee">Employee (Enterprise Email Login)</option>
                          <option value="Associate">Associate (Mobile Number OTP Login)</option>
                          <option value="Admin">Admin (L&D Leadership Access)</option>
                        </select>
                      </div>

                      {/* 2. Emp Name */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Emp Name *</label>
                        <input
                          type="text"
                          required
                          value={entry.name}
                          onChange={(e) => handleUpdateEntry(index, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-xs"
                        />
                      </div>

                      {/* 3. VAM ID */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">
                          VAM ID {isAssociate && <span className="text-slate-400 font-normal">(Optional for Associate)</span>}
                        </label>
                        <input
                          type="text"
                          value={entry.vamId || ''}
                          onChange={(e) => handleUpdateEntry(index, 'vamId', e.target.value)}
                          placeholder={isAssociate ? 'VAM ID (Optional)' : 'VAM ID'}
                          className="w-full border rounded-xl px-3.5 py-2.5 font-medium focus:outline-none shadow-xs bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>

                      {/* 4. Phone Number with Country Code Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-slate-700 font-bold">Phone Number (10 Digits) *</label>
                          <span className="text-[10px] font-mono text-slate-400">
                            {entry.phoneNumber.length}/10
                          </span>
                        </div>
                        {(() => {
                          const cleanP = (entry.phoneNumber || '').replace(/\D/g, '');
                          const existingWithPhone = cleanP.length === 10 ? users.find((u) => (u.phoneNumber || '').replace(/\D/g, '') === cleanP) : null;
                          const isBatchDuplicate = cleanP.length === 10 && formEntries.some((other, oIdx) => oIdx !== index && (other.phoneNumber || '').replace(/\D/g, '') === cleanP);
                          const isPhoneError = Boolean(existingWithPhone || isBatchDuplicate);

                          return (
                            <div>
                              <div
                                className={`flex rounded-xl border bg-white overflow-hidden shadow-xs transition-colors ${isPhoneError
                                  ? 'border-rose-400 focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-500/20'
                                  : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/10'
                                  }`}
                              >
                                <select
                                  value={entry.countryCode || '+91'}
                                  onChange={(e) => handleUpdateEntry(index, 'countryCode', e.target.value)}
                                  className="bg-slate-100/90 px-3 py-2.5 text-xs font-bold text-slate-700 border-r border-slate-300 focus:outline-none cursor-pointer"
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
                                  placeholder="mobile number"
                                  className="w-full px-3.5 py-2.5 font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                                />
                              </div>

                              {existingWithPhone && (
                                <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                  <span>Number already exists for <strong>{existingWithPhone.name}</strong> ({existingWithPhone.role})</span>
                                </p>
                              )}

                              {isBatchDuplicate && !existingWithPhone && (
                                <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                  <span>Duplicate number entered in another row</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 5. Mail ID */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">
                          Mail ID {!isAssociate ? '*' : <span className="text-slate-400 font-normal">(Optional for Associate)</span>}
                        </label>
                        {(() => {
                          const cleanE = (entry.email || '').trim().toLowerCase();
                          const hasEmail = cleanE.length > 0;
                          const isInvalidDomain = hasEmail && !isValidEnterpriseEmail(cleanE);

                          return (
                            <div>
                              <input
                                type="email"
                                required={!isAssociate}
                                value={entry.email || ''}
                                onChange={(e) => handleUpdateEntry(index, 'email', e.target.value)}
                                placeholder={isAssociate ? 'name@valuemomentum.com (Optional)' : 'name@valuemomentum.com'}
                                className={`w-full border rounded-xl px-3.5 py-2.5 font-medium focus:outline-none shadow-xs bg-white text-slate-900 transition-colors ${
                                  isInvalidDomain
                                    ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                                    : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10'
                                }`}
                              />

                              {isInvalidDomain && (
                                <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                                  <span>Only <strong>@valuemomentum.com</strong> and <strong>@owlsure.com</strong> email domains are permitted.</span>
                                </p>
                              )}

                              {!isInvalidDomain && entry.email && entry.email.includes('@') && (
                                <p className="text-[11px] text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
                                  <Key className="w-3 h-3 shrink-0" />
                                  <span>Initial Login Password: <strong>{getDefaultPasswordForEmail(entry.email)}</strong></span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 6. Designation (ALWAYS ENABLED for all roles) */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={entry.designation || ''}
                          onChange={(e) => handleUpdateEntry(index, 'designation', e.target.value)}
                          placeholder="Graduate Trainee, Associate Software Engineer, Lead - L&D"
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-xs"
                        />
                      </div>

                      {/* 7. Added On (Timestamp, Fixed) */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Added On</label>
                        <input
                          type="text"
                          readOnly
                          value={entry.addedOn}
                          className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3.5 py-2.5 font-medium cursor-not-allowed"
                        />
                      </div>

                    </div>

                    {/* Default Password Hint */}
                    {!isAssociate && entry.email && entry.email.includes('@') && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Default login password will be auto-set to: <strong className="font-mono text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded border border-blue-300">{getDefaultPasswordForEmail(entry.email)}</strong>
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
                  <span>Add Another Credential</span>
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
      {/* POPUP MODAL: EDIT CREDENTIAL (VERTICAL FORM LAYOUT)                       */}
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
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs flex flex-col">
              {/* Role */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Role *</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-blue-600 shadow-xs"
                >
                  <option value="Employee">Employee (Enterprise)</option>
                  <option value="Associate">Associate (Mobile Only)</option>
                  <option value="Admin">Admin (L&D Leader)</option>
                </select>
              </div>

              {/* Emp Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Emp Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-medium shadow-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* VAM ID */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">VAM ID</label>
                <input
                  type="text"
                  value={editingUser.vamId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, vamId: e.target.value })}
                  placeholder="Enter VAM ID"
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 shadow-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Phone Number with Country Code Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Phone Number (10 Digits) *</label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(editingUser.phoneNumber || '').replace(/\D/g, '').length}/10
                  </span>
                </div>
                <div className="flex rounded-xl border bg-white overflow-hidden shadow-xs border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <select
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value)}
                    className="bg-slate-100/90 px-3 py-2.5 text-xs font-bold text-slate-700 border-r border-slate-300 focus:outline-none cursor-pointer"
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
                    placeholder="Enter Mobile Number"
                    className="w-full px-3.5 py-2.5 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Mail ID */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Mail ID</label>
                {(() => {
                  const cleanE = (editingUser.email || '').trim().toLowerCase();
                  const hasEmail = cleanE.length > 0 && cleanE !== '-';
                  const isInvalidDomain = hasEmail && !isValidEnterpriseEmail(cleanE);

                  return (
                    <div>
                      <input
                        type="email"
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        placeholder="name@valuemomentum.com"
                        className={`w-full bg-white border rounded-xl px-3.5 py-2.5 shadow-xs focus:outline-none text-slate-900 transition-colors ${
                          isInvalidDomain
                            ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:border-blue-600'
                        }`}
                      />

                      {isInvalidDomain && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                          <span>Only <strong>@valuemomentum.com</strong> and <strong>@owlsure.com</strong> email domains are permitted.</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Designation (ALWAYS ENABLED) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  value={editingUser.designation || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                  placeholder="Graduate Trainee, Associate Software Engineer, L&D Lead"
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 font-medium shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer"
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
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Datalist for dynamic autocomplete suggestions across modals */}
      <datalist id="designation-suggestions">
        {uniqueDesignations.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
    </div>
  );
};
