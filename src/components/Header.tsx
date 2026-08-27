import React, { useState, useRef, useEffect, useMemo } from 'react';
import ProfileImage from './ProfileImage';
import { User } from '../types';
import { getUserManagementRecords } from '../services/authCredentials';
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
  LogOut,
  BookOpen,
  Key
} from 'lucide-react';

interface HeaderProps {
  isAuthenticated: boolean;
  currentUser: User;
  activePortal: 'Landing' | 'GT' | 'Admin';
  setActivePortal: (portal: 'Landing' | 'GT' | 'Admin') => void;
  inspectModeActive: boolean;
  setInspectModeActive: (active: boolean) => void;
  onOpenLogin: (role?: 'GT' | 'Admin') => void;
  onOpenChangePassword?: () => void;
  onLogout: () => void;
  onOpenPlayground: () => void;
  onOpenUserGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  currentUser,
  activePortal,
  setActivePortal,
  onOpenLogin,
  onOpenChangePassword,
  onLogout,
  onOpenUserGuide
}) => {
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfilePopover(false);
      }
    };

    if (showProfilePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfilePopover]);

  const handleLogout = () => {
    setShowProfilePopover(false);
    onLogout();
  };

  const isAdminRole =
    currentUser.role === 'Admin' ||
    (typeof currentUser.role === 'string' && currentUser.role.toLowerCase().includes('admin'));

  // Dynamically fetch exact Role and Designation from the User Management table records
  const userManagementRecord = useMemo(() => {
    try {
      const records = getUserManagementRecords();
      if (!records || !Array.isArray(records)) return null;

      if (currentUser.email && currentUser.email !== '-') {
        const cleanEmail = currentUser.email.trim().toLowerCase();
        const matches = records.filter((r) => r.email && r.email.trim().toLowerCase() === cleanEmail);
        if (matches.length > 0) {
          const roleMatch = matches.find((r) => {
            const rRole = (r.role || 'Employee').trim().toLowerCase();
            if (isAdminRole) return rRole === 'admin';
            return rRole === 'employee' || rRole === 'gt' || rRole === 'associate';
          });
          if (roleMatch) return roleMatch;
          return matches[0];
        }
      }

      if (currentUser.name) {
        const cleanName = currentUser.name.trim().toLowerCase();
        const matches = records.filter((r) => r.name && r.name.trim().toLowerCase() === cleanName);
        if (matches.length > 0) {
          const roleMatch = matches.find((r) => {
            const rRole = (r.role || 'Employee').trim().toLowerCase();
            if (isAdminRole) return rRole === 'admin';
            return rRole === 'employee' || rRole === 'gt' || rRole === 'associate';
          });
          if (roleMatch) return roleMatch;
          return matches[0];
        }
      }
    } catch {
      // Fallback
    }
    return null;
  }, [currentUser.email, currentUser.name, isAdminRole, showProfilePopover]);

  const displayDesignation =
    userManagementRecord?.designation ||
    currentUser.designation ||
    (isAdminRole ? 'Lead - L&D Leadership' : 'Graduate Trainee');

  const displayRole =
    userManagementRecord?.role ||
    (isAdminRole ? 'Admin' : currentUser.role === 'GT' ? 'Employee' : currentUser.role || 'Employee');

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 text-slate-900 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Brand & Title Box */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              if (isAuthenticated) {
                if (isAdminRole) {
                  setActivePortal('Admin');
                } else {
                  setActivePortal('GT');
                }
              } else {
                setActivePortal('Landing');
              }
            }}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
            data-inspect-id="PrimaryButton"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 bg-clip-text text-transparent">
                GT Companion
              </span>
              <span className="block text-[10px] font-mono tracking-wider uppercase font-bold text-blue-700">
                Built by GTs, for GTs
              </span>
            </div>
          </button>

          {/* Current Active Portal Title Badge */}
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {activePortal === 'Admin' ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 tracking-tight">Admin Portal</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 shadow-xs">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 tracking-tight">
                    {isAdminRole ? 'GT View (Admin)' : 'GT Portal'}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Unauthenticated Landing Navigation Links */}
          {!isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            </nav>
          )}
        </div>
        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* User Guide Secondary CTA Button */}
          <button
            onClick={onOpenUserGuide}
            className="h-[42px] px-5 rounded-xl text-xs font-bold bg-white text-[#2563EB] border border-[#D7E7FF] hover:bg-[#F3F8FF] hover:border-[#2563EB] active:bg-[#2563EB] active:text-white transition-all duration-200 shadow-sm flex items-center gap-2 -translate-y-0 hover:-translate-y-0.5 cursor-pointer group select-none"
            title="Open User Guide (Shortcut: Shift + ?)"
          >
            <BookOpen className="w-4 h-4 text-[#2563EB] group-active:text-white transition-colors" />
            <span>User Guide</span>
          </button>

          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenLogin('GT')}
                className="h-[42px] px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all flex items-center justify-center cursor-pointer"
              >
                Login
              </button>
            </div>
          )}

          {isAuthenticated && (
            /* Authenticated Header Tools */
            <div className="flex items-center gap-3">

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfilePopover((prev) => !prev)}
                  aria-label="Open profile menu"
                  title="Open profile menu"
                  className={`relative p-0.5 rounded-xl bg-white border ${
                    isAdminRole
                      ? 'border-emerald-300 hover:border-emerald-500 focus:ring-emerald-500/40'
                      : 'border-slate-200 hover:border-blue-500/50 focus:ring-blue-500/40'
                  } transition-all focus:outline-none focus:ring-2 shadow-sm`}
                >
                  <ProfileImage
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    defaultSrc={isAdminRole ? '/Assets/default-avatar-admin.svg' : '/Assets/default-avatar.svg'}
                    className={`w-8 h-8 rounded-lg object-cover ring-2 ${
                      isAdminRole ? 'ring-emerald-500' : 'ring-blue-500/40'
                    }`}
                  />
                </button>

                {showProfilePopover && (
                  <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3 animate-fadeIn text-slate-900">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <ProfileImage
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        defaultSrc={isAdminRole ? '/Assets/default-avatar-admin.svg' : '/Assets/default-avatar.svg'}
                        className={`w-11 h-11 rounded-xl object-cover ring-2 ${
                          isAdminRole ? 'ring-emerald-500' : 'ring-blue-500/50'
                        }`}
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-900 block leading-snug">{currentUser.name}</span>
                        <span className={`text-[11px] font-medium block ${isAdminRole ? 'text-emerald-600 font-semibold' : 'text-blue-600'}`}>
                          {displayDesignation}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                          Role: {displayRole}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      {onOpenChangePassword && (
                        <button
                          onClick={() => {
                            setShowProfilePopover(false);
                            onOpenChangePassword();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            <span>Change Password</span>
                          </span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-between font-semibold cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Logout</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </header>
  );
};

