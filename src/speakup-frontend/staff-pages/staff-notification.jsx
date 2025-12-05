import React, { useEffect, useMemo, useRef, useState } from "react";
import SideBar from "./components/StaffSideBar";
import AdminNavbar from "./components/StaffNavBar";
import { useStaffNotifications } from "../../hooks/useStaffNotifications";
import { useNavigate } from "react-router-dom";

const LS_KEY = "staff_notifications_last_seen";

const getLastSeen = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const setLastSeen = (ms) => {
  try {
    const prev = getLastSeen();
    const next = Math.max(prev || 0, Number(ms) || 0);
    localStorage.setItem(LS_KEY, String(next));
  } catch {}
};

const StaffNotifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { notifications: items, lastSeenAt, markAllSeen: markAllAsRead, markSeenUpTo: markItemRead, loading } = useStaffNotifications();

  // Persistently dismissed list
  const DISMISSED_KEY = "staff_notifications_dismissed";
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)); } catch {}
  }, [dismissed]);
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);
  const [lastDeleted, setLastDeleted] = useState([]);
  const undoTimerRef = useRef(null);
  const handleUndoDelete = () => {
    if (!lastDeleted.length) return;
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    setDismissed((prev) => prev.filter((id) => !lastDeleted.includes(id)));
    setLastDeleted([]);
  };
  useEffect(() => {
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    if (lastDeleted.length > 0) {
      undoTimerRef.current = setTimeout(() => {
        setLastDeleted([]);
        undoTimerRef.current = null;
      }, 10000);
    }
    return () => {
      if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    };
  }, [lastDeleted]);

  const filtered = useMemo(() => (activeTab === "unread" ? items.filter((n)=> n.date > lastSeenAt) : items), [items, activeTab, lastSeenAt]);
  const shown = useMemo(() => filtered.filter((n)=> !dismissedSet.has(n.id)), [filtered, dismissedSet]);

  const handleDeleteOne = (id) => {
    if (!window.confirm("Delete this notification?")) return;
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setLastDeleted([id]);
  };
  const handleDeleteAll = () => {
    if (!window.confirm("Delete all notifications? This cannot be undone.")) return;
    const allIds = items.map((n)=> n.id);
    const toAdd = allIds.filter((id) => !dismissedSet.has(id));
    setDismissed((prev) => Array.from(new Set([...prev, ...allIds])));
    setLastDeleted(toAdd);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      <SideBar />

      <div className="flex-1 p-4 mt-16 lg:mt-[90px] md:p-6 lg:p-12 transition-all duration-300">
        <AdminNavbar />

        {/* Header Section with Tabs and Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-6 md:mt-6 lg:mt-0">
            {/* Tabs - Full Width on Mobile */}
          <div className="flex gap-1.5 
                          bg-gradient-to-r from-white to-gray-50 
                          p-1.5 rounded-xl lg:rounded-2xl shadow-lg border border-gray-200/80 backdrop-blur-sm 
                          w-full md:w-auto"> {/* w-full on mobile, auto width on MD+ */}            <button
              className={`flex-1 px-4 md:px-6 lg:px-8 py-2.5 rounded-lg lg:rounded-xl font-semibold text-xs md:text-sm cursor-pointer transition-all duration-300 relative overflow-hidden ${
                activeTab === "all"
                  ? "bg-gradient-to-br from-[#8B0000] via-[#a01010] to-[#DC143C] text-white shadow-[0_4px_12px_rgba(139,0,0,0.3)] scale-[1.02]"
                  : "text-gray-600 hover:text-red-700 hover:bg-red-50/50 hover:scale-[1.01]"
              }`}
              onClick={() => setActiveTab("all")}
            >
              {activeTab === "all" && (
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
              )}
              <span className="relative flex items-center justify-center gap-1.5 md:gap-2">
                <i className="fas fa-list text-xs"></i>
                <span className="hidden xs:inline">All</span>
              </span>
            </button>
            <button
              className={`flex-1 px-4 md:px-6 lg:px-8 py-2.5 rounded-lg lg:rounded-xl font-semibold text-xs md:text-sm cursor-pointer transition-all duration-300 relative overflow-hidden ${
                activeTab === "unread"
                  ? "bg-gradient-to-br from-[#8B0000] via-[#a01010] to-[#DC143C] text-white shadow-[0_4px_12px_rgba(139,0,0,0.3)] scale-[1.02]"
                  : "text-gray-600 hover:text-red-700 hover:bg-red-50/50 hover:scale-[1.01]"
              }`}
              onClick={() => setActiveTab("unread")}
            >
              {activeTab === "unread" && (
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
              )}
              <span className="relative flex items-center justify-center gap-1.5 md:gap-2">
                <i className="fas fa-bell text-xs"></i>
                <span className="hidden xs:inline">Unread</span>
              </span>
            </button>
          </div>

          {/* Action Buttons - Stack on Mobile */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center w-full md:w-auto">
            {/* Undo Message - Full Width on Mobile */}
            {lastDeleted.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 md:px-4 py-2 flex items-center gap-2 animate-slideIn w-full sm:flex-1 text-xs md:text-sm">
                <i className="fas fa-info-circle text-blue-600 text-xs flex-shrink-0"></i>
                <span className="flex-1 min-w-0 truncate">Deleted {lastDeleted.length} notification{lastDeleted.length > 1 ? 's' : ''}</span>
                <button 
                  onClick={handleUndoDelete} 
                  className="text-blue-700 bg-blue-100 hover:bg-blue-200 border-none px-2.5 md:px-3 py-1 rounded-md cursor-pointer font-semibold text-xs transition-all duration-200 hover:scale-105 whitespace-nowrap flex-shrink-0"
                >
                  <i className="fas fa-undo text-xs mr-1"></i>
                  Undo
                </button>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#800000] to-[#a00000] hover:from-[#a00000] hover:to-[#c00000] text-white border-none px-3 md:px-4 lg:px-5 py-2.5 rounded-lg lg:rounded-xl cursor-pointer font-medium text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 group"
                onClick={markAllAsRead}
              >
                <i className="fas fa-check-double text-xs group-hover:scale-110 transition-transform"></i>
                <span className="whitespace-nowrap hidden sm:inline">Mark all as read</span>
                <span className="whitespace-nowrap sm:hidden">Mark read</span>
              </button>

              <button
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#b91c1c] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ef4444] text-white border-none px-3 md:px-4 lg:px-5 py-2.5 rounded-lg lg:rounded-xl cursor-pointer font-medium text-xs md:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 md:gap-2 group"
                onClick={handleDeleteAll}
                disabled={loading || items.length === 0}
              >
                <i className="fas fa-trash-alt text-xs group-hover:scale-110 transition-transform"></i>
                <span className="whitespace-nowrap hidden sm:inline">Delete all</span>
                <span className="whitespace-nowrap sm:hidden">Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex flex-col gap-3 md:gap-4">
          {loading && (
            <div className="relative bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 border-l-4 border-gray-300 shadow-lg transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
              <p className="relative m-0 text-sm md:text-base text-gray-600 font-medium leading-relaxed flex items-center gap-2 md:gap-3">
                <i className="fas fa-spinner fa-spin text-gray-400"></i>
                Loading notifications…
              </p>
            </div>
          )}
          
          {!loading && shown.length === 0 && (
            <div className="text-center py-12 md:py-16 lg:py-20 px-4 md:px-6 lg:px-8">
              <div className="inline-block p-4 md:p-5 lg:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl md:rounded-2xl shadow-md border border-gray-200">
                <i className="fas fa-inbox text-3xl md:text-4xl lg:text-5xl text-gray-300 mb-3 md:mb-4"></i>
                <p className="text-gray-400 text-sm md:text-base lg:text-lg font-medium">No notifications to display</p>
                <p className="text-gray-400 text-xs md:text-sm mt-2">You're all caught up!</p>
              </div>
            </div>
          )}
          
          {!loading && shown.map((n, idx) => (
            <div
              key={n.id}
              className={`group relative bg-white rounded-xl md:rounded-2xl p-3.5 md:p-5 lg:p-6 border-l-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:translate-x-1 md:hover:translate-x-2 lg:hover:translate-x-3 hover:-translate-y-0.5 animate-[slideIn_0.4s_ease_forwards] ${
                n.date > lastSeenAt
                  ? "bg-gradient-to-br from-[#FFFAF0] via-white to-[#FFF8F0] border-l-[#FFD700] shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:shadow-[0_8px_30px_rgba(255,215,0,0.3)]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              style={{ 
                animationDelay: `${idx * 0.1}s`,
                borderLeftColor: n.date > lastSeenAt ? '#FFD700' : undefined
              }}
              onClick={() => {
                markItemRead(n.date);
                const focusTab = n.type === 'feedback' ? 'feedback' : (n.type === 'status' ? 'status' : 'details');
                navigate('/smonitorcomplaints', { state: { complaintId: n.complaintId, focusTab } });
              }}
            >
              {/* Unread indicator dot */}
              {n.date > lastSeenAt && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 lg:top-6 lg:right-6">
                  <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC143C] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-gradient-to-br from-[#DC143C] to-[#FF4444] shadow-lg"></span>
                  </span>
                </div>
              )}
              
              {/* Delete button - Always visible on mobile */}
              <button
                aria-label="Delete notification"
                onClick={(e) => { e.stopPropagation(); handleDeleteOne(n.id); }}
                className="absolute top-2 right-2 md:top-2 md:right-2 border-none bg-gray-100 hover:bg-red-100 p-1.5 md:p-2 rounded-lg cursor-pointer text-gray-400 hover:text-red-600 transition-all duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-110 z-10"
              >
                <i className="fas fa-trash text-[10px] md:text-xs"></i>
              </button>
              
              {/* Content icon - Vertical line */}
              <div className={`absolute left-2 md:left-3 top-4 md:top-5 lg:top-6 w-1 h-10 md:h-12 rounded-full ${
                n.date > lastSeenAt ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500]' : 'bg-gradient-to-b from-gray-300 to-gray-200'
              }`}></div>
              
              {/* Title and content */}
              <div className="pr-8 md:pr-10">
                <p className={`m-0 mb-2 md:mb-3 text-xs md:text-sm lg:text-base font-semibold leading-relaxed flex items-start gap-1.5 md:gap-2 ${
                  n.date > lastSeenAt ? "text-[#8B0000]" : "text-gray-700"
                }`}>
                  <i className={`fas ${n.type === 'feedback' ? 'fa-comment-dots' : n.type === 'status' ? 'fa-info-circle' : 'fa-bell'} text-[10px] md:text-xs lg:text-sm mt-0.5 flex-shrink-0 ${
                    n.date > lastSeenAt ? 'text-[#DC143C]' : 'text-gray-400'
                  }`}></i>
                  <span className="flex-1">
                    {n.title || "Notification"}
                    {n.category && (
                      <span className="ml-2 md:ml-3 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 text-[10px] md:text-xs font-medium inline-flex items-center gap-1 md:gap-1.5 mt-1">
                        <i className="fas fa-tag text-[8px] md:text-[10px]"></i>
                        {n.category}
                      </span>
                    )}
                  </span>
                </p>
                
                <small className={`flex items-center gap-1.5 md:gap-2 text-[0.7rem] md:text-xs lg:text-[0.85rem] font-medium ${
                  n.date > lastSeenAt ? "text-[#DC143C]" : "text-gray-500"
                }`}>
                  <i className="far fa-clock text-[10px] md:text-xs"></i>
                  {new Date(n.date).toLocaleString()}
                </small>
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl md:rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', sans-serif;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Custom breakpoint for very small screens */
        @media (min-width: 480px) {
          .xs\:inline {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffNotifications;