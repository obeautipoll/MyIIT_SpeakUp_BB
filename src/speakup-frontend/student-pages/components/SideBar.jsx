import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doSignOut } from "../../../firebase/auth";

const SideBar = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const handleLogout = async () => {
    try {
      await doSignOut();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  const handleNavigation = (page) => {
    if (window.innerWidth < 1024) setIsOpen(false);

    switch (page) {
      case "dashboard":
        navigate("/dashboard");
        break;
      case "file-complaint":
        navigate("/file-complaint");
        break;
      case "history":
        navigate("/history");
        break;
      case "notifications":
        navigate("/notifications");
        break;
      case "logout":
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) handleLogout();
        break;
    }
  };

  const isActive = (path) =>
    window.location.pathname === path ? "active" : "";

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden mt-3 fixed top-24 left-4 z-[100] p-2 rounded-md bg-black/60 text-white"
      >
        <i
          className={`fa-solid ${
            isOpen ? "fa-times" : "fa-bars"
          } text-xl`}
        ></i>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-[90]"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 h-full 
          w-[220px] lg:w-[280px]
          bg-gradient-to-br from-[#800000] to-[#A0222D]
          text-white z-[1000]
          shadow-2xl border-r border-[rgba(255,215,0,0.2)]
          backdrop-blur-xl
          transform transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full py-6 lg:py-8 px-2 overflow-y-auto custom-scroll">

          {/* LOGO */}
          <div className="flex flex-col items-center text-center px-4 pb-4 mb-4 border-b border-white/10">
            <img
              src="/speakup_logo.png"
              alt="SpeakUp Logo"
              className="w-16 h-16 lg:w-20 lg:h-20 object-contain mb-2"
              onError={(e) => {
                if (e.target.src.endsWith(".png"))
                  e.target.src = "/speakup_logo.svg";
                else if (e.target.src.endsWith(".svg"))
                  e.target.src = "/speakup_logo.jpg";
              }}
            />
            <h1 className="text-2xl lg:text-[28px] font-semibold text-[#FFD700] leading-tight">
              SpeakUp
            </h1>
            <p className="text-[10px] lg:text-[12px] opacity-80 tracking-wide">
              My.IIT Complaint System
            </p>
          </div>

          {/* LINKS */}
          <ul className="flex flex-col space-y-2">
            {/* DASHBOARD */}
            <li
              onClick={() => handleNavigation("dashboard")}
              className={`
                group relative flex items-center gap-2 lg:gap-3 cursor-pointer 
                px-3 py-2 lg:px-5 lg:py-2.5 mx-2 rounded-xl font-medium text-xs lg:text-sm
                transition-all duration-300
                border border-transparent
                text-white/90
                hover:text-white hover:translate-x-1
                hover:bg-[rgba(255,215,0,0.15)]
                hover:shadow-md hover:border-[rgba(255,215,0,0.3)]
                ${isActive("/dashboard") &&
                "bg-[rgba(255,215,0,0.25)] shadow-lg border-l-4 border-[#FFD700] text-white font-semibold"}
              `}
            >
              <i
                className={`
                  fa-solid fa-home text-base lg:text-lg transition-all
                  ${isActive("/dashboard") ? "text-[#FFD700] scale-110" : "text-[rgba(255,215,0,0.9)]"}
                `}
              ></i>
              Dashboard
            </li>

            {/* FILE COMPLAINT */}
            <li
              onClick={() => handleNavigation("file-complaint")}
              className={`
                group relative flex items-center gap-2 lg:gap-3 cursor-pointer 
                px-3 py-2 lg:px-5 lg:py-2.5 mx-2 rounded-xl font-medium text-xs lg:text-sm
                transition-all duration-300
                border border-transparent
                text-white/90
                hover:text-white hover:translate-x-1
                hover:bg-[rgba(255,215,0,0.15)]
                hover:shadow-md hover:border-[rgba(255,215,0,0.3)]
                ${isActive("/file-complaint") &&
                "bg-[rgba(255,215,0,0.25)] shadow-lg border-l-4 border-[#FFD700] text-white font-semibold"}
              `}
            >
              <i
                className={`
                  fa-solid fa-pen-to-square text-base lg:text-lg transition-all
                  ${isActive("/file-complaint") ? "text-[#FFD700] scale-110" : "text-[rgba(255,215,0,0.9)]"}
                `}
              ></i>
              File Complaint
            </li>

            {/* HISTORY */}
            <li
              onClick={() => handleNavigation("history")}
              className={`
                group relative flex items-center gap-2 lg:gap-3 cursor-pointer 
                px-3 py-2 lg:px-5 lg:py-2.5 mx-2 rounded-xl font-medium text-xs lg:text-sm
                transition-all duration-300
                border border-transparent
                text-white/90
                hover:text-white hover:translate-x-1
                hover:bg-[rgba(255,215,0,0.15)]
                hover:shadow-md hover:border-[rgba(255,215,0,0.3)]
                ${isActive("/history") &&
                "bg-[rgba(255,215,0,0.25)] shadow-lg border-l-4 border-[#FFD700] text-white font-semibold"}
              `}
            >
              <i
                className={`
                  fa-solid fa-clock-rotate-left text-base lg:text-lg transition-all
                  ${isActive("/history") ? "text-[#FFD700] scale-110" : "text-[rgba(255,215,0,0.9)]"}
                `}
              ></i>
              Complaint History
            </li>

            {/* NOTIFICATIONS */}
            <li
              onClick={() => handleNavigation("notifications")}
              className={`
                group relative flex items-center gap-2 lg:gap-3 cursor-pointer 
                px-3 py-2 lg:px-5 lg:py-2.5 mx-2 rounded-xl font-medium text-xs lg:text-sm
                transition-all duration-300
                border border-transparent
                text-white/90
                hover:text-white hover:translate-x-1
                hover:bg-[rgba(255,215,0,0.15)]
                hover:shadow-md hover:border-[rgba(255,215,0,0.3)]
                ${isActive("/notifications") &&
                "bg-[rgba(255,215,0,0.25)] shadow-lg border-l-4 border-[#FFD700] text-white font-semibold"}
              `}
            >
              <i
                className={`
                  fa-solid fa-bell text-base lg:text-lg transition-all
                  ${isActive("/notifications") ? "text-[#FFD700] scale-110" : "text-[rgba(255,215,0,0.9)]"}
                `}
              ></i>
              Notifications
            </li>
          </ul>

          {/* LOGOUT - Now separate at bottom */}
          <div className="mt-auto pt-4 border-t border-white/10">
            <div
              onClick={() => handleNavigation("logout")}
              className="
                group flex items-center gap-2 lg:gap-3 cursor-pointer 
                px-3 py-2 lg:px-5 lg:py-2.5 mx-2 rounded-xl font-medium text-xs lg:text-sm
                transition-all duration-300
                text-white/95
                bg-black/20 border border-[rgba(255,215,0,0.4)]
                hover:bg-[rgba(255,69,0,0.2)]
                hover:border-[rgba(255,69,0,0.6)]
                hover:shadow-lg hover:text-white
              "
            >
              <i className="fa-solid fa-right-from-bracket text-base lg:text-lg text-[rgba(255,160,122,0.9)] group-hover:text-[#FFA07A] transition-all"></i>
              Logout
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Spacer */}
      <div className="hidden lg:block lg:w-[280px]"></div>
    </>
  );
};

export default SideBar;