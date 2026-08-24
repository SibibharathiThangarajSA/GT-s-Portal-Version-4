import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SessionTrackerRecord, Session } from '../../types';
import { mockSessionTrackerRecords } from '../../data/mockData';
import {
  fetchSessionTrackerApi,
  saveSessionTrackerRecordApi,
  deleteSessionTrackerRecordApi,
  saveAllSessionTrackerRecordsApi
} from '../../services/api';
import { 
  Table, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Video, 
  FileText, 
  Calendar, 
  UserCheck, 
  BarChart3, 
  X, 
  Save, 
  Sparkles, 
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

interface SessionTrackerProps {
  sessions?: Session[];
  records?: SessionTrackerRecord[];
  onSaveRecord?: (record: SessionTrackerRecord) => void;
  onDeleteRecord?: (id: string) => void;
}

const TRACKER_STORAGE_KEY = 'gt_session_tracker_records_manual_v1';

export const generateSessionCode = (trainerName: string, category: string, scheduleDate: string): string => {
  const cleanTrainer = (trainerName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  let trainerCode = cleanTrainer.slice(0, 3);
  if (trainerCode.length === 0) {
    trainerCode = 'TRA';
  } else if (trainerCode.length < 3) {
    trainerCode = trainerCode.padEnd(3, 'X');
  }

  const cleanCategory = (category || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  let catCode = cleanCategory.slice(0, 3);
  if (catCode.length === 0) {
    catCode = 'CAT';
  } else if (catCode.length < 3) {
    catCode = catCode.padEnd(3, 'X');
  }

  let dateCode = '0101';
  if (scheduleDate && scheduleDate.includes('-')) {
    const parts = scheduleDate.split('-');
    if (parts.length === 3) {
      const monthStr = parts[1].padStart(2, '0');
      const dayStr = parts[2].padStart(2, '0');
      dateCode = `${monthStr}${dayStr}`;
    }
  } else {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    dateCode = `${mm}${dd}`;
  }

  return `${trainerCode}-${catCode}-${dateCode}`;
};

export const format12Hour = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const formattedH = h < 10 ? `0${h}` : `${h}`;
  return `${formattedH}:${mStr || '00'} ${period}`;
};

export const parse12HourTo24Hour = (str12: string): string => {
  if (!str12) return '';
  const match = str12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '';
  let [_, hStr, mStr, period] = match;
  let h = parseInt(hStr, 10);
  if (period) {
    const p = period.toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
  }
  const formattedH = h < 10 ? `0${h}` : `${h}`;
  return `${formattedH}:${mStr}`;
};

export const calculateHoursFromTimes = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return null;

  let startMinutes = sH * 60 + sM;
  let endMinutes = eH * 60 + eM;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const diffMinutes = endMinutes - startMinutes;
  const hours = Math.round((diffMinutes / 60) * 10) / 10;
  return hours > 0 ? hours : null;
};

export const calculateDurationFormatted = (start: string, end: string): string => {
  if (!start || !end) return '';
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return '';

  let startMinutes = sH * 60 + sM;
  let endMinutes = eH * 60 + eM;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const diffMinutes = endMinutes - startMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} mins`;
  } else if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} 00 mins`;
  } else if (mins > 0) {
    return `${mins} mins`;
  }
  return '0 hr 00 mins';
};

const AnalogueClockModal: React.FC<{
  target: 'start' | 'end';
  currentTime24: string;
  onApply: (time24: string) => void;
  onClose: () => void;
}> = ({ target, currentTime24, onApply, onClose }) => {
  const parseTime = (t24: string) => {
    let [hStr, mStr] = (t24 || '09:00').split(':');
    let h = parseInt(hStr, 10) || 9;
    let m = parseInt(mStr, 10) || 0;
    let period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12 || 12;
    return { h12, m, period };
  };

  const initial = parseTime(currentTime24);
  const [hour12, setHour12] = useState<number>(initial.h12);
  const [minute, setMinute] = useState<number>(initial.m);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);
  const [pickerMode, setPickerMode] = useState<'hours' | 'minutes'>('hours');

  const getTime24 = (h: number, m: number, p: 'AM' | 'PM'): string => {
    let h24 = h;
    if (p === 'PM' && h < 12) h24 += 12;
    if (p === 'AM' && h === 12) h24 = 0;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${hStr}:${mStr}`;
  };

  const current24Str = getTime24(hour12, minute, period);

  const handleUpdate = (h: number, m: number, p: 'AM' | 'PM') => {
    const t24 = getTime24(h, m, p);
    onApply(t24);
  };

  const CENTER = 120;
  const RADIUS = 82;

  const handleClockDialClick = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - CENTER;
    const y = clientY - rect.top - CENTER;

    let rad = Math.atan2(y, x);
    let deg = (rad * (180 / Math.PI) + 90 + 360) % 360;

    if (pickerMode === 'hours') {
      let h = Math.round(deg / 30) % 12;
      if (h === 0) h = 12;
      setHour12(h);
      handleUpdate(h, minute, period);
      setPickerMode('minutes');
    } else {
      let m = Math.round(deg / 6) % 60;
      setMinute(m);
      handleUpdate(hour12, m, period);
    }
  };

  const hourAngle = ((hour12 % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;

  const activeAngle = pickerMode === 'hours' ? (hour12 % 12) * 30 : minute * 6;
  const activeRad = (activeAngle - 90) * (Math.PI / 180);
  const pointerX = CENTER + RADIUS * Math.cos(activeRad);
  const pointerY = CENTER + RADIUS * Math.sin(activeRad);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full space-y-4 animate-fadeIn text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Select {target === 'start' ? 'Start Time' : 'End Time'} (Analogue Clock)
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Time Header & AM/PM Switch */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPickerMode('hours')}
              className={`px-3 py-1.5 rounded-xl font-mono text-3xl font-extrabold transition-all ${
                pickerMode === 'hours' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-white/20'
              }`}
            >
              {String(hour12).padStart(2, '0')}
            </button>
            <span className="text-2xl font-bold font-mono text-blue-200">:</span>
            <button
              type="button"
              onClick={() => setPickerMode('minutes')}
              className={`px-3 py-1.5 rounded-xl font-mono text-3xl font-extrabold transition-all ${
                pickerMode === 'minutes' ? 'bg-white text-blue-700 shadow-md scale-105' : 'text-blue-100 hover:bg-white/20'
              }`}
            >
              {String(minute).padStart(2, '0')}
            </button>
          </div>

          {/* AM / PM Toggle */}
          <div className="flex flex-col gap-1 bg-blue-800/60 p-1 rounded-xl border border-blue-400/30">
            <button
              type="button"
              onClick={() => {
                setPeriod('AM');
                handleUpdate(hour12, minute, 'AM');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                period === 'AM' ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod('PM');
                handleUpdate(hour12, minute, 'PM');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                period === 'PM' ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Mode Selector Sub-Header */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-600 uppercase font-mono tracking-wider text-[11px]">
            {pickerMode === 'hours' ? 'Touch Dial / Needle for Hours' : 'Touch Dial / Needle for Minutes'}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPickerMode('hours')}
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                pickerMode === 'hours' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-400 border-transparent'
              }`}
            >
              HH
            </button>
            <button
              type="button"
              onClick={() => setPickerMode('minutes')}
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                pickerMode === 'minutes' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-400 border-transparent'
              }`}
            >
              MM
            </button>
          </div>
        </div>

        {/* Interactive Analogue Clock SVG Dial */}
        <div className="flex items-center justify-center py-1">
          <div className="relative w-[240px] h-[240px] select-none cursor-pointer">
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
              onClick={handleClockDialClick}
              className="w-full h-full touch-none"
            >
              {/* Outer Clock Circle */}
              <circle cx="120" cy="120" r="110" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="120" cy="120" r="102" fill="none" stroke="#f1f5f9" strokeWidth="1" />

              {/* Minute Ticks around outer ring */}
              {Array.from({ length: 60 }).map((_, idx) => {
                const tickRad = (idx * 6 - 90) * (Math.PI / 180);
                const isMajor = idx % 5 === 0;
                const rInner = isMajor ? 97 : 100;
                const x1 = 120 + rInner * Math.cos(tickRad);
                const y1 = 120 + rInner * Math.sin(tickRad);
                const x2 = 120 + 104 * Math.cos(tickRad);
                const y2 = 120 + 104 * Math.sin(tickRad);
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
                    strokeWidth={isMajor ? 2 : 1}
                  />
                );
              })}

              {/* Selection Hand Line to Pointer */}
              <line
                x1="120"
                y1="120"
                x2={pointerX}
                y2={pointerY}
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
              <circle cx={pointerX} cy={pointerY} r="18" fill="#2563eb" opacity="0.2" />

              {/* Hour Numbers (1-12) */}
              {pickerMode === 'hours' && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                const numRad = (num * 30 - 90) * (Math.PI / 180);
                const nx = 120 + RADIUS * Math.cos(numRad);
                const ny = 120 + RADIUS * Math.sin(numRad);
                const isSelected = hour12 === num;
                return (
                  <g key={num} className="cursor-pointer">
                    {isSelected && (
                      <circle cx={nx} cy={ny} r="15" fill="#2563eb" />
                    )}
                    <text
                      x={nx}
                      y={ny + 4}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isSelected ? '#ffffff' : '#1e293b'}
                      className="font-mono font-bold text-xs pointer-events-none"
                      style={{ fontSize: '13px' }}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

              {/* Minute Numbers (00, 05, 10 ... 55) */}
              {pickerMode === 'minutes' && [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mVal) => {
                const numRad = (mVal * 6 - 90) * (Math.PI / 180);
                const nx = 120 + RADIUS * Math.cos(numRad);
                const ny = 120 + RADIUS * Math.sin(numRad);
                const isSelected = Math.abs(minute - mVal) < 3 || (minute >= 58 && mVal === 0);
                return (
                  <g key={mVal} className="cursor-pointer">
                    {isSelected && (
                      <circle cx={nx} cy={ny} r="15" fill="#2563eb" />
                    )}
                    <text
                      x={nx}
                      y={ny + 4}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isSelected ? '#ffffff' : '#1e293b'}
                      className="font-mono font-bold text-[11px] pointer-events-none"
                    >
                      {String(mVal).padStart(2, '0')}
                    </text>
                  </g>
                );
              })}

              {/* Hour Hand (Short Needle / Mull) */}
              <line
                x1="120"
                y1="120"
                x2="120"
                y2="66"
                stroke="#1e3a8a"
                strokeWidth="5"
                strokeLinecap="round"
                transform={`rotate(${hourAngle}, 120, 120)`}
              />
              {/* Minute Hand (Long Needle / Mull) */}
              <line
                x1="120"
                y1="120"
                x2="120"
                y2="42"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${minuteAngle}, 120, 120)`}
              />

              {/* Center Pin */}
              <circle cx="120" cy="120" r="6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Selected Time Display & Apply Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono font-semibold">
            Time: <span className="text-slate-900 font-bold">{format12Hour(current24Str)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            Apply Time
          </button>
        </div>

      </div>
    </div>
  );
};

export const SessionTracker: React.FC<SessionTrackerProps> = ({
  sessions = [],
  records: initialRecords,
  onSaveRecord,
  onDeleteRecord
}) => {
  // Initialize state with manual records only (Never auto-populate from curriculum sessions)
  const [trackerRecords, setTrackerRecords] = useState<SessionTrackerRecord[]>(() => {
    if (initialRecords && initialRecords.length > 0) return initialRecords;
    try {
      const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse tracker records from storage', e);
    }
    return mockSessionTrackerRecords;
  });

  // Fetch persistent records from backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetchSessionTrackerApi().then(data => {
      if (isMounted && Array.isArray(data)) {
        setTrackerRecords(data);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [codeFilter, setCodeFilter] = useState<string>('ALL');
  const [nameFilter, setNameFilter] = useState<string>('ALL');
  const [trainerFilter, setTrainerFilter] = useState<string>('ALL');
  const [scheduleDateFilter, setScheduleDateFilter] = useState<string>('ALL');
  const [scheduleTimeFilter, setScheduleTimeFilter] = useState<string>('ALL');

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<SessionTrackerRecord> | null>(null);
  const [selectedRecordForNotes, setSelectedRecordForNotes] = useState<SessionTrackerRecord | null>(null);
  const [startTimeVal, setStartTimeVal] = useState('09:00');
  const [endTimeVal, setEndTimeVal] = useState('11:00');
  const [activeClockPickerTarget, setActiveClockPickerTarget] = useState<'start' | 'end' | null>(null);
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);

  // Dynamic available categories derived strictly from created sessions + tracker records
  const availableCategories = React.useMemo(() => {
    const fromSessions = (sessions || []).map(s => s.category).filter((c): c is string => Boolean(c) && c.trim().length > 0);
    const fromTracker = (trackerRecords || []).map(r => r.category).filter((c): c is string => Boolean(c) && c.trim().length > 0);
    const existing = Array.from(new Set([...fromSessions, ...fromTracker]));

    if (existing.length > 0) {
      return existing;
    }

    return [
      '.NET with C#',
      'Insurance',
      'SQL & Database Modelling',
      'Frontend (React & Tailwind)',
      'Campus to Corporate (C2C)'
    ];
  }, [sessions, trackerRecords]);

  // Dynamic available trainers derived strictly from created sessions + tracker records
  const availableTrainers = React.useMemo(() => {
    const fromSessions = (sessions || []).map(s => s.trainerName).filter((t): t is string => Boolean(t) && t.trim().length > 0);
    const fromTracker = (trackerRecords || []).map(r => r.trainerName).filter((t): t is string => Boolean(t) && t.trim().length > 0);
    const existing = Array.from(new Set([...fromSessions, ...fromTracker]));

    if (existing.length > 0) {
      return existing;
    }

    return ['Unassigned'];
  }, [sessions, trackerRecords]);

  // Filter logic
  const filteredRecords = trackerRecords.filter(r => {
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesCode = codeFilter === 'ALL' || r.sessionCode === codeFilter;
    const matchesName = nameFilter === 'ALL' || r.sessionName === nameFilter;
    const matchesTrainer = trainerFilter === 'ALL' || r.trainerName === trainerFilter;
    const matchesDate = scheduleDateFilter === 'ALL' || r.scheduleDate === scheduleDateFilter;
    const matchesTime = scheduleTimeFilter === 'ALL' || r.scheduleTime === scheduleTimeFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      r.sessionName.toLowerCase().includes(q) ||
      r.sessionCode.toLowerCase().includes(q) ||
      r.trainerName.toLowerCase().includes(q) ||
      (typeof r.category === 'string' && r.category.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q));

    return matchesCategory && matchesCode && matchesName && matchesTrainer && matchesDate && matchesTime && matchesQuery;
  });

  // Unique lists for filter options
  const sessionCodes = Array.from(new Set(trackerRecords.map(r => r.sessionCode).filter(Boolean)));
  const sessionNames = Array.from(new Set(trackerRecords.map(r => r.sessionName).filter(Boolean)));
  const trainers = Array.from(new Set(trackerRecords.map(r => r.trainerName).filter(Boolean)));
  const scheduleDates = Array.from(new Set(trackerRecords.map(r => r.scheduleDate).filter(Boolean)));
  const scheduleTimes = Array.from(new Set(trackerRecords.map(r => r.scheduleTime).filter(Boolean)));
  const categories = Array.from(new Set(trackerRecords.map(r => r.category).filter(Boolean)));

  const handleResetFilters = () => {
    setCategoryFilter('ALL');
    setCodeFilter('ALL');
    setNameFilter('ALL');
    setTrainerFilter('ALL');
    setScheduleDateFilter('ALL');
    setScheduleTimeFilter('ALL');
    setSearchQuery('');
  };

  // Handlers
  const handleOpenAdd = () => {
    const defaultDate = new Date().toISOString().split('T')[0];
    const defaultTrainer = availableTrainers[0] || 'Unassigned';
    const defaultCategory = availableCategories[0] || '.NET with C#';
    const defaultCode = generateSessionCode(defaultTrainer, defaultCategory, defaultDate);
    setStartTimeVal('09:00');
    setEndTimeVal('11:00');
    setEditingRecord({
      id: `track-${Date.now()}`,
      sessionCode: defaultCode,
      sessionName: '',
      category: availableCategories[0] || '.NET with C#',
      trainerName: defaultTrainer,
      scheduleDate: defaultDate,
      scheduleTime: '09:00 AM - 11:00 AM',
      durationHours: 2,
      status: 'Scheduled',
      enrolledCount: 30,
      maxCapacity: 40,
      completionRatePercent: 0,
      materialsLink: '',
      recordingLink: '',
      notes: ''
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (record: SessionTrackerRecord) => {
    setEditingRecord({ ...record });
    if (record.scheduleTime) {
      const parts = record.scheduleTime.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const s24 = parse12HourTo24Hour(parts[0]);
        const e24 = parse12HourTo24Hour(parts[1]);
        if (s24) setStartTimeVal(s24);
        if (e24) setEndTimeVal(e24);
      }
    }
    setIsAddEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setTrackerRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    await deleteSessionTrackerRecordApi(id);
    if (onDeleteRecord) onDeleteRecord(id);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.sessionName) return;

    const fullRecord: SessionTrackerRecord = {
      id: editingRecord.id || `track-${Date.now()}`,
      sessionCode: editingRecord.sessionCode || 'SESS-001',
      sessionName: editingRecord.sessionName,
      category: editingRecord.category || '.NET with C#',
      trainerName: editingRecord.trainerName || 'Unassigned',
      scheduleDate: editingRecord.scheduleDate || new Date().toISOString().split('T')[0],
      scheduleTime: editingRecord.scheduleTime || '09:00 AM - 12:00 PM',
      durationHours: Number(editingRecord.durationHours) || 0,
      status: (editingRecord.status as any) || 'Scheduled',
      enrolledCount: Number(editingRecord.enrolledCount) || 0,
      maxCapacity: Number(editingRecord.maxCapacity) || 40,
      completionRatePercent: Number(editingRecord.completionRatePercent) || 0,
      materialsLink: editingRecord.materialsLink || '',
      recordingLink: editingRecord.recordingLink || '',
      notes: editingRecord.notes || '',
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setTrackerRecords(prev => {
      const exists = prev.some(r => r.id === fullRecord.id);
      const updated = exists ? prev.map(r => r.id === fullRecord.id ? fullRecord : r) : [fullRecord, ...prev];
      try {
        localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await saveSessionTrackerRecordApi(fullRecord);
    if (onSaveRecord) onSaveRecord(fullRecord);
    setIsAddEditModalOpen(false);
    setEditingRecord(null);
  };

  // Excel Export (.xlsx)
  const handleExportExcel = () => {
    if (trackerRecords.length === 0) {
      return;
    }

    const dataToExport = trackerRecords.map((r, index) => ({
      'S.No.': index + 1,
      'Session Code': r.sessionCode || '-',
      'Session Name': r.sessionName || '-',
      'Category': r.category || '-',
      'Trainer': r.trainerName || '-',
      'Schedule Date': r.scheduleDate || '-',
      'Schedule Time': r.scheduleTime || '-',
      'Duration (Hrs)': r.durationHours || 0,
      'Session Remarks': r.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const colWidths = [
      { wch: 8 },  // S.No.
      { wch: 16 }, // Session Code
      { wch: 32 }, // Session Name
      { wch: 20 }, // Category
      { wch: 24 }, // Trainer
      { wch: 14 }, // Schedule Date
      { wch: 16 }, // Schedule Time
      { wch: 16 }, // Duration (Hrs)
      { wch: 32 }  // Session Remarks
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Session Tracker');

    XLSX.writeFile(workbook, `GT_Session_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Top Bar with Actions - Content kept in place without card container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">Session Tracker</h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredRecords.length}</span> of {trackerRecords.length} total records
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleOpenAdd}
            style={{
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 45%, #BFDBFE 100%)',
              border: '1px solid #BFDBFE',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
            }}
            className="px-4 py-2.5 rounded-xl text-blue-800 hover:text-blue-900 font-extrabold text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400 flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Add Record</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Filters Bar - Styled like SessionManager search/filter box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Session Tracker Records</span>
          </div>
          {(categoryFilter !== 'ALL' || codeFilter !== 'ALL' || nameFilter !== 'ALL' || trainerFilter !== 'ALL' || scheduleDateFilter !== 'ALL' || scheduleTimeFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Filters Grid - All Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Filter 1: Session Code */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Session Code</label>
            <select
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Session Codes</option>
              {sessionCodes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Session Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Session Name</label>
            <select
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Session Names</option>
              {sessionNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Trainer Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Trainer Name</label>
            <select
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Trainers</option>
              {trainers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filter 4: Schedule Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Schedule Date</label>
            <select
              value={scheduleDateFilter}
              onChange={(e) => setScheduleDateFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Schedule Dates</option>
              {scheduleDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Filter 5: Schedule Time */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Schedule Time</label>
            <select
              value={scheduleTimeFilter}
              onChange={(e) => setScheduleTimeFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Schedule Times</option>
              {scheduleTimes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filter 6: Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter 7: Global Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Global Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-2.5 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, links..."
                className="w-full rounded-xl pl-8 pr-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-500 border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm transition-all duration-200"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Table of Fields */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead className="bg-blue-50/80 border-b border-slate-200 text-blue-900 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-4 px-4 font-bold text-center w-12 text-blue-900">S.No.</th>
                <th className="py-4 px-4 font-bold text-blue-900">Session Code & Title</th>
                <th className="py-4 px-4 font-bold text-blue-900">Category</th>
                <th className="py-4 px-4 font-bold text-blue-900">Trainer / Instructor</th>
                <th className="py-4 px-4 font-bold text-blue-900">Schedule & Time</th>
                <th className="py-4 px-4 font-bold text-blue-900">Session Remarks</th>
                <th className="py-4 px-4 font-bold text-right text-blue-900">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Table className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No session tracking records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting filters or add a new session record above.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr 
                    key={record.id}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    {/* S.No. Auto-Increment */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600 text-[11px]">
                      {index + 1}
                    </td>

                    {/* Session Code & Title */}
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200">
                          {record.sessionCode}
                        </span>
                        <p className="font-extrabold text-slate-900 line-clamp-1">
                          {record.sessionName}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {record.category}
                      </span>
                    </td>

                    {/* Trainer */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                      {record.trainerName || 'Unassigned'}
                    </td>

                    {/* Schedule & Duration */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{record.scheduleDate}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {record.scheduleTime} ({calculateDurationFormatted(parse12HourTo24Hour(record.scheduleTime.split(' - ')[0] || ''), parse12HourTo24Hour(record.scheduleTime.split(' - ')[1] || '')) || `${record.durationHours} hrs`})
                        </p>
                      </div>
                    </td>

                    {/* Session Remarks */}
                    <td className="py-3.5 px-4 min-w-[200px] max-w-[320px]">
                      <div className="text-slate-700 text-xs leading-relaxed">
                        {record.notes ? (
                          <span className="line-clamp-2">{record.notes}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">— No remarks —</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(record)}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                          title="Edit Session Fields"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Record Modal Form */}
      {isAddEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 my-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Table className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingRecord.id && trackerRecords.some(r => r.id === editingRecord.id) ? 'Edit Session Fields' : 'Upload New Session Details'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Trainer Name Dropdown */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trainer / Instructor *</label>
                  <select
                    value={editingRecord.trainerName || availableTrainers[0] || 'Sarah Jenkins'}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      const autoCode = generateSessionCode(nameVal, editingRecord.category || '', editingRecord.scheduleDate || '');
                      setEditingRecord(prev => prev ? ({
                        ...prev,
                        trainerName: nameVal,
                        sessionCode: autoCode
                      }) : null);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-semibold cursor-pointer"
                  >
                    {availableTrainers.map((tr) => (
                      <option key={tr} value={tr}>
                        {tr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Schedule Date */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Schedule Date *</label>
                  <div className="relative flex items-center">
                    <input
                      ref={dateInputRef}
                      type="date"
                      required
                      value={editingRecord.scheduleDate || ''}
                      onChange={(e) => {
                        const dateVal = e.target.value;
                        const autoCode = generateSessionCode(editingRecord.trainerName || '', editingRecord.category || '', dateVal);
                        setEditingRecord(prev => prev ? ({
                          ...prev,
                          scheduleDate: dateVal,
                          sessionCode: autoCode
                        }) : null);
                      }}
                      className="w-full pl-3.5 pr-10 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-semibold cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                          try { dateInputRef.current.showPicker(); } catch {}
                        }
                      }}
                      className="absolute right-2.5 top-2.5 p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                      title="Open Calendar Picker"
                    >
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Session Code (Auto Generated) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Session Code / ID*</label>
                  <input
                    type="text"
                    disabled
                    value={editingRecord.sessionCode || ''}
                    placeholder="Auto generated (e.g. JAN-NET-0922)"
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-slate-700 font-mono font-bold shadow-sm cursor-not-allowed opacity-90"
                  />
                  {/* <p className="text-[10px] text-slate-500 mt-1 font-mono">Format: [Trainer (3)]-[Category (3)]-[MMDD] (e.g. JAN-NET-0922)</p> */}
                </div>

                {/* Category / Track */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category / Learning Track *</label>
                  <select
                    value={editingRecord.category || availableCategories[0] || '.NET with C#'}
                    onChange={(e) => {
                      const catVal = e.target.value;
                      const autoCode = generateSessionCode(editingRecord.trainerName || '', catVal, editingRecord.scheduleDate || '');
                      setEditingRecord(prev => prev ? ({
                        ...prev,
                        category: catVal,
                        sessionCode: autoCode
                      }) : null);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-semibold cursor-pointer"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Name */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Session Name / Title *</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.sessionName || ''}
                    onChange={(e) => setEditingRecord(prev => prev ? ({ ...prev, sessionName: e.target.value }) : null)}
                    placeholder="Session Name"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 font-bold shadow-sm"
                  />
                </div>

                {/* Start Time & End Time */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Time *</label>
                  <div className="relative flex items-center">
                    <input
                      type="time"
                      required
                      value={startTimeVal}
                      onChange={(e) => {
                        const s = e.target.value;
                        setStartTimeVal(s);
                        const start12 = format12Hour(s);
                        const end12 = format12Hour(endTimeVal);
                        const schedTime = start12 && end12 ? `${start12} - ${end12}` : (start12 || end12);
                        const hrs = calculateHoursFromTimes(s, endTimeVal);
                        setEditingRecord(prev => prev ? ({
                          ...prev,
                          scheduleTime: schedTime,
                          durationHours: hrs !== null && hrs > 0 ? hrs : (prev.durationHours || 1)
                        }) : null);
                      }}
                      className="w-full pl-3.5 pr-10 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-semibold cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveClockPickerTarget('start')}
                      className="absolute right-2.5 top-2.5 p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                      title="Open Clock Time Picker"
                    >
                      <Clock className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Time *</label>
                  <div className="relative flex items-center">
                    <input
                      type="time"
                      required
                      value={endTimeVal}
                      onChange={(e) => {
                        const en = e.target.value;
                        setEndTimeVal(en);
                        const start12 = format12Hour(startTimeVal);
                        const end12 = format12Hour(en);
                        const schedTime = start12 && end12 ? `${start12} - ${end12}` : (start12 || end12);
                        const hrs = calculateHoursFromTimes(startTimeVal, en);
                        setEditingRecord(prev => prev ? ({
                          ...prev,
                          scheduleTime: schedTime,
                          durationHours: hrs !== null && hrs > 0 ? hrs : (prev.durationHours || 1)
                        }) : null);
                      }}
                      className="w-full pl-3.5 pr-10 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm font-semibold cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveClockPickerTarget('end')}
                      className="absolute right-2.5 top-2.5 p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                      title="Open Clock Time Picker"
                    >
                      <Clock className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Formatted Schedule Time (Disabled Auto Computed) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Schedule Time (Auto Computed) *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      disabled
                      value={editingRecord.scheduleTime || ''}
                      placeholder="Auto computed from Start & End time"
                      className="w-full pl-9 pr-3 bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-slate-700 font-semibold cursor-not-allowed opacity-90"
                    />
                  </div>
                </div>

                {/* Duration (Hrs : Mins Auto Computed) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Hrs : Mins Auto Computed) *</label>
                  <input
                    type="text"
                    disabled
                    value={calculateDurationFormatted(startTimeVal, endTimeVal) || (editingRecord.durationHours ? `${editingRecord.durationHours} hrs` : '2 hrs 00 mins')}
                    placeholder="Auto computed from Start & End time"
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-slate-700 font-mono font-bold shadow-sm cursor-not-allowed opacity-90"
                  />
                  {/* <p className="text-[10px] text-slate-500 mt-1 font-mono">Calculated automatically from Start & End time (hrs:mins)</p> */}
                </div>

                {/* Notes / Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Session Remarks / Additional Notes</label>
                  <textarea
                    rows={3}
                    value={editingRecord.notes || ''}
                    onChange={(e) => setEditingRecord(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                    placeholder="Enter any feedback, special prerequisites, or curriculum observations..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 shadow-sm"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 45%, #BFDBFE 100%)',
                    border: '1px solid #BFDBFE',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
                  }}
                  className="px-6 py-2.5 rounded-xl text-blue-800 hover:text-blue-900 font-extrabold flex items-center gap-2 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400"
                >
                  <Save className="w-4 h-4 text-blue-700" />
                  <span className="text-blue-800 font-extrabold">Save Record Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Remarks / Notes Detail Modal */}
      {selectedRecordForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm">Session Description</h3>
              </div>
              <button
                onClick={() => setSelectedRecordForNotes(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">{selectedRecordForNotes.sessionCode}</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedRecordForNotes.sessionName}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {selectedRecordForNotes.notes}
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setSelectedRecordForNotes(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Analogue Clock Time Picker Modal */}
      {activeClockPickerTarget && (
        <AnalogueClockModal
          target={activeClockPickerTarget}
          currentTime24={activeClockPickerTarget === 'start' ? startTimeVal : endTimeVal}
          onApply={(time24) => {
            if (activeClockPickerTarget === 'start') {
              setStartTimeVal(time24);
              const start12 = format12Hour(time24);
              const end12 = format12Hour(endTimeVal);
              const schedTime = start12 && end12 ? `${start12} - ${end12}` : (start12 || end12);
              const hrs = calculateHoursFromTimes(time24, endTimeVal);
              setEditingRecord(prev => prev ? ({
                ...prev,
                scheduleTime: schedTime,
                durationHours: hrs !== null && hrs > 0 ? hrs : (prev.durationHours || 1)
              }) : null);
            } else {
              setEndTimeVal(time24);
              const start12 = format12Hour(startTimeVal);
              const end12 = format12Hour(time24);
              const schedTime = start12 && end12 ? `${start12} - ${end12}` : (start12 || end12);
              const hrs = calculateHoursFromTimes(startTimeVal, time24);
              setEditingRecord(prev => prev ? ({
                ...prev,
                scheduleTime: schedTime,
                durationHours: hrs !== null && hrs > 0 ? hrs : (prev.durationHours || 1)
              }) : null);
            }
          }}
          onClose={() => setActiveClockPickerTarget(null)}
        />
      )}

    </div>
  );
};
