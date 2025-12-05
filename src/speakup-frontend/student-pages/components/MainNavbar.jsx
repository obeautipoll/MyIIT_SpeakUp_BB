import React from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import { useNotifications } from '../../../contexts/notificationsContext';

const MainNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userRole } = useAuth();

    // Extract first name for greeting message
    const firstName = currentUser?.displayName?.split(" ")[0] || 
                      currentUser?.email?.split("@")[0] || 
                      "User";

    // Extract full name or default to email prefix
    const userName = currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : "Guest";
    
    const getUserInitials = () => {
        if (!currentUser) return "GU";
        
        if (currentUser.displayName) {
            const nameParts = currentUser.displayName.trim().split(" ");
            
            if (nameParts.length === 1) {
                return nameParts[0].charAt(0).toUpperCase();
            }
            
            const firstInitial = nameParts[0].charAt(0).toUpperCase();
            const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
            
            return firstInitial + lastInitial;
        }
        
        const emailPrefix = currentUser.email.split('@')[0];
        return emailPrefix.substring(0, 2).toUpperCase();
    };
    
    const { unreadCount } = useNotifications();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const getPageTitle = (path) => {
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "dashboard":
                return "Dashboard";
            case "file-complaint":
                return "File Complaint";
            case "history":
                return "Complaint History";
            case "notifications":
                return "Notifications";
            case "student/login":
            case "login":
                return "Login";
            default:
                if (normalizedPath.startsWith('history/')) {
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    const handleFileComplaint = () => navigate("/file-complaint"); 
    const handleNotifications = () => navigate("/notifications"); 

    return (
        <nav className="
            student-main-navbar fixed top-0 right-0 z-[999] 
            lg:left-[260px] 
            md:left-[240px] 
            
            // Mobile/Small Screens (Sidebar is typically hidden/collapsed, so the navbar should span full width):
            sm:left-0 // Set left offset to 0 for small screens
            left-0    // Set left offset to 0 for extra-small/mobile screens
            
            h-20 lg:h-[90px]
            bg-gradient-to-br from-white/95 to-[#fffaf0]/95 backdrop-blur-xl
            border-b-2 border-[#8B0000]/10 shadow-lg shadow-[#8B0000]/5
            transition-all duration-300 hover:shadow-xl hover:shadow-[#8B0000]/10
            font-['Poppins']
        ">
            <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
            
                {/* Left: Page Title Group */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wide
                        transition-colors duration-300 -mb-1">
                        {getGreeting()}, {firstName}.
                        <span className="hidden md:inline ml-1 font-light">
                            It's great to see you back on SpeakUp.
                        </span>
                    </p>
                    <h1 className="text-xl sm:text-2xl lg:text-[1.875rem] font-extrabold 
                        bg-gradient-to-r from-[#8B0000] via-[#DC143C] to-[#8B0000] 
                        bg-clip-text text-transparent tracking-tight truncate
                        drop-shadow-sm leading-tight">
                        {getPageTitle(location.pathname)}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
                    
                    {/* Notification Bell */}
                    <button 
                        onClick={handleNotifications}
                        className="relative w-11 h-11 sm:w-12 sm:h-12 lg:w-[50px] lg:h-[50px] rounded-full 
                            bg-gradient-to-br from-[#8B0000]/8 to-[#8B0000]/6
                            border-[1.5px] border-[#8B0000]/15 
                            flex items-center justify-center
                            text-[#8B0000] text-lg sm:text-xl lg:text-[1.3rem]
                            transition-all duration-300 
                            hover:bg-[#8B0000]/15 hover:border-[#8B0000]/30 
                            hover:scale-110 hover:-translate-y-0.5
                            active:scale-95 active:translate-y-0
                            shadow-sm hover:shadow-md hover:shadow-[#8B0000]/20
                            group"
                        aria-label={`You have ${unreadCount} unread notifications`}>
                        <i className="fas fa-bell transition-transform duration-300 
                            group-hover:scale-110 group-hover:animate-[bellRing_0.5s_ease]"></i>
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 
                                bg-gradient-to-br from-[#DC143C] via-[#8B0000] to-[#8B0000]
                                text-white text-[0.67rem] font-semibold
                                min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center
                                shadow-lg shadow-[#DC143C]/50
                                animate-[pulseGlow_2s_ease-in-out_infinite]
                                ring-1 ring-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* File Complaint Button */}
                    <button 
                        onClick={handleFileComplaint}
                        className="flex items-center justify-center gap-2
                            h-11 sm:h-12 lg:h-[50px]
                            px-4 sm:px-5 lg:px-6
                            bg-gradient-to-r from-[#8B0000] via-[#DC143C] to-[#8B0000]
                            text-white font-semibold 
                            text-xs sm:text-sm lg:text-[0.95rem]
                            rounded-full
                            shadow-lg shadow-[#8B0000]/30
                            transition-all duration-300
                            hover:shadow-xl hover:shadow-[#8B0000]/40
                            hover:-translate-y-1 hover:scale-105
                            active:translate-y-0 active:scale-100
                            relative overflow-hidden group
                            whitespace-nowrap">
                        <span className="relative z-10 flex items-center gap-2">
                            <i className="fas fa-plus-circle text-sm sm:text-base lg:text-lg"></i>
                            <span className="hidden sm:inline">File New Complaint</span>
                            <span className="sm:hidden">File</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#A00000] to-[#FF1744]
                            transform translate-y-full group-hover:translate-y-0
                            transition-transform duration-300"></div>
                    </button>

                    {/* User Profile Pill */}
                    <div className="flex items-center gap-2 lg:gap-3.5 
                        px-3 lg:px-5 py-2 lg:py-2.5 rounded-full
                        bg-gradient-to-br from-[#8B0000]/6 to-[#8B0000]/4
                        border-[1.5px] border-[#8B0000]/12
                        transition-all duration-300 cursor-pointer
                        hover:bg-[#8B0000]/12 hover:border-[#8B0000]/25
                        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#8B0000]/15
                        active:translate-y-0 active:scale-[0.98]
                        relative group shadow-sm">
                        
                        <div className="hidden sm:flex flex-col items-end gap-0 min-w-0">
                            <span className="text-sm lg:text-[0.975rem] font-semibold text-slate-800 
                                truncate max-w-[100px] lg:max-w-[150px] leading-tight
                                transition-colors duration-300 group-hover:text-[#8B0000]">
                                {userName}
                            </span>
                            <span className="text-xs lg:text-[0.75rem] font-medium text-slate-500
                                transition-colors duration-300 group-hover:text-[#8B0000]">
                                {userRole || "Student"}
                            </span>
                        </div>
                        
                        <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-[46px] lg:h-[46px] rounded-full
                            bg-gradient-to-br from-[#8B0000] to-[#DC143C]
                            text-white font-extrabold text-xs sm:text-sm lg:text-[1.05rem]
                            flex items-center justify-center
                            border-[3px] border-white shadow-lg shadow-[#8B0000]/30
                            transition-all duration-300
                            group-hover:scale-110 group-hover:rotate-[5deg]
                            relative overflow-hidden">
                            <span className="relative z-10">{getUserInitials()}</span>
                            <div className="absolute inset-[-3px] bg-gradient-to-br from-[#DC143C] to-[#8B0000] 
                                rounded-full opacity-0 group-hover:opacity-15 transition-opacity duration-300 -z-10"></div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes bellRing {
                    0%, 100% { transform: rotate(0deg); }
                    10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
                    20%, 40%, 60%, 80% { transform: rotate(10deg); }
                }

                @keyframes pulseGlow {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 2px 12px rgba(220, 20, 60, 0.5);
                    }
                    50% {
                        transform: scale(1.15);
                        box-shadow: 0 4px 20px rgba(220, 20, 60, 0.7);
                    }
                }
            `}</style>
        </nav>
    );
}

export default MainNavbar;