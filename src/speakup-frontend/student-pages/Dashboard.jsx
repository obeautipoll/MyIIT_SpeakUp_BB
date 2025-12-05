import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SideBar from "../student-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useAuth } from "../../contexts/authContext";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
 
  const [complaints, setComplaints] = useState([]);
  const [complaintsCount, setComplaintsCount] = useState({
    filed: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    closed: 0,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
  };

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in");
          return;
        }

        const complaintsRef = collection(db, "complaints");
        const querySnapshot = await getDocs(complaintsRef);
        
        const complaintList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(complaint => complaint.userId === user.uid)
          .sort((a, b) => {
            if (!a.submissionDate) return 1;
            if (!b.submissionDate) return -1;
            return b.submissionDate.toDate() - a.submissionDate.toDate();
          });

        setComplaints(complaintList);

        const statusCounts = {
          filed: 0,
          pending: 0,
          resolved: 0,
          inProgress: 0,
          closed: 0,
        };

        complaintList.forEach((complaint) => {
          // FIX: Default to "pending" if status is missing to match the visual table
          const rawStatus = complaint.status || "pending"; 
          const status = rawStatus.toLowerCase().trim();

          if (status === "filed") statusCounts.filed++;
          else if (status === "closed") statusCounts.closed++;
          else if (status === "resolved") statusCounts.resolved++;
          else if (status === "in-progress") statusCounts.inProgress++;
          else statusCounts.pending++; // Counts "pending" and any other unknown status
        });

        setComplaintsCount(statusCounts);
      } catch (error) {
        console.error("Error fetching complaints:", error);
      }
    };

    fetchComplaints();
  }, [currentUser]);

  const getResolutionRate = () => {
    if (complaints.length === 0) return 0;
    const resolved = complaintsCount.resolved + complaintsCount.closed;
    return Math.round((resolved / complaints.length) * 100);
  };

  const getCategoryBreakdown = () => {
    const categories = {};
    complaints.forEach(complaint => {
      const cat = complaint.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  };

  const getAverageResolutionDays = () => {
    const resolvedComplaints = complaints.filter(
      c => (c.status?.toLowerCase() === 'resolved' || c.status?.toLowerCase() === 'closed')
      && c.submissionDate && c.dateResolved
    );
   
    if (resolvedComplaints.length === 0) return null;
   
    const totalDays = resolvedComplaints.reduce((sum, complaint) => {
      const startDate = complaint.submissionDate?.toDate();
      const endDate = complaint.dateResolved?.toDate();
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
   
    return Math.round(totalDays / resolvedComplaints.length);
  };

  const categoryBreakdown = getCategoryBreakdown();
  const avgDays = getAverageResolutionDays();
  const resolutionRate = getResolutionRate();

  const getGradientColors = (index) => {
    const gradients = [
      "from-[#8B0000] to-[#A52A2A]",
      "from-[#FF6B35] to-[#F7931E]",
      "from-[#10B981] to-[#059669]",
      "from-[#6366F1] to-[#8B5CF6]"
    ];
    return gradients[index] || gradients[0];
  };

  const getStatusStyles = (status) => {
    // FIX: Handle missing status gracefully in styles
    const statusLower = (status || 'pending').toLowerCase();
    switch(statusLower) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'filed':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="flex min-h-screen font-['Inter']">
      <SideBar />

      <div className="flex-1 mt-[90px] p-[30px_50px] overflow-y-auto bg-white">
        <MainNavbar />

        {/* Welcome Section */}
        <div className="mb-5">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">
            Track your complaints and stay updated on their progress
          </h3>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-5">
          {/* Total Complaints */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#8B0000] to-[#A52A2A]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              Total Complaints
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaints.length}
            </div>
            <div className="text-xs opacity-80">
              {complaints.length === 0 ? "No complaints filed" :
               complaints.length === 1 ? "1 complaint filed" :
               `${complaints.length} complaints filed`}
            </div>
          </div>

          {/* In Progress */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#FF6B35] to-[#F7931E]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              In Progress
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaintsCount.inProgress + complaintsCount.pending + complaintsCount.filed}
            </div>
            <div className="text-xs opacity-80">Currently being reviewed</div>
          </div>

          {/* Resolved */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#10B981] to-[#059669]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              Resolved
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaintsCount.resolved + complaintsCount.closed}
            </div>
            <div className="text-xs opacity-80">{resolutionRate}% success rate</div>
          </div>
        </div>

        {/* Recent Complaints Section */}
        <div className="bg-white rounded-xl p-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] mb-5">
          <div className="flex justify-between items-center mb-5 pb-4 border-b-2 border-[#f5f5f5]">
            <h2 className="text-xl font-semibold text-[#1a1a1a] m-0">
              Recent Complaints
            </h2>
            {complaints.length > 3 && (
              <button
                onClick={() => navigate('/history')}
                className="px-4 py-2 bg-transparent text-[#8B0000] border border-[#8B0000] rounded-md text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-[#8B0000] hover:text-white"
              >
                View Entire History
              </button>
            )}
          </div>

          {complaints.length === 0 ? (
            // Empty State
            <div className="text-center py-[50px_20px] bg-[#f9fafb] rounded-lg border-2 border-dashed border-[#e0e0e0]">
              <div className="w-[60px] h-[60px] mx-auto mb-4 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <i className="fas fa-inbox text-2xl text-[#bbb]"></i>
              </div>
              <h3 className="m-9 mb-1.5 font-semibold text-base text-[#333]">
                No complaints yet
              </h3>
              <p className="m-0 text-xs text-[#999]">
                Your submitted complaints will appear here
              </p>
            </div>
          ) : (
            // Complaints Table
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#f0f0f0]">
                    <th className="text-left p-[12px_16px] text-[13px] font-semibold text-[#666] uppercase tracking-wider">
                      Complaint
                    </th>
                    <th className="text-left p-[12px_16px] text-[13px] font-semibold text-[#666] uppercase tracking-wider w-[150px]">
                      Category
                    </th>
                    <th className="text-left p-[12px_16px] text-[13px] font-semibold text-[#666] uppercase tracking-wider w-[120px]">
                      Date Filed
                    </th>
                    <th className="text-center p-[12px_16px] text-[13px] font-semibold text-[#666] uppercase tracking-wider w-[100px]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.slice(0, 3).map((complaint) => (
                    <tr
                      key={complaint.id}
                      onClick={() => handleComplaintClick(complaint)}
                      className="cursor-pointer transition-colors duration-200 border-b border-[#f5f5f5] last:border-b-0 hover:bg-[#f9f9f9]"
                    >
                      <td className="p-4 text-[#666] font-medium max-w-[400px]">
                        <div className="overflow-hidden text-ellipsis line-clamp-2 leading-[1.5] text-[11.5px]">
                          {complaint.concernDescription ||
                            complaint.otherDescription ||
                            complaint.incidentDescription ||
                            complaint.facilityDescription ||
                            complaint.concernFeedback ||
                            "No description provided"}
                        </div>
                      
                      </td>
                      <td className="p-4 text-[11px] text-[#666]">
                        {complaint.category || "Uncategorized"}
                      </td>
                      <td className="p-4 text-[11px] text-[#666]">
                        {complaint.submissionDate?.toDate().toLocaleDateString() || "—"}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1.5 rounded-[15px] text-[11px] font-semibold inline-block tracking-wide uppercase ${getStatusStyles(complaint.status)}`}>
                          {complaint.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Secondary Info Grid */}
        {complaints.length > 0 && (
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <h3 className="text-base font-semibold text-[#1a1a1a] m-0 mb-4">
                  Complaints by Category
                </h3>
                <div className="flex flex-col gap-3">
                  {categoryBreakdown.map(([category, count], index) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[13px] text-[#333] font-medium">
                          {category}
                        </span>
                        <span className="text-xs text-[#666] font-semibold">
                          {count} ({Math.round((count / complaints.length) * 100)}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f0f0f0] rounded overflow-hidden">
                        <div 
                          className={`h-full rounded transition-all duration-500 bg-gradient-to-r ${getGradientColors(index)}`}
                          style={{ width: `${(count / complaints.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h3 className="text-base font-semibold text-[#1a1a1a] m-0 mb-4">
                Quick Stats
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[11px] text-[#999] mb-1">
                    Avg. Resolution Time
                  </div>
                  <div className="text-xl font-bold text-[#333]">
                    {avgDays !== null ? `${avgDays} days` : "N/A"}
                  </div>
                </div>
                <div className="h-px bg-[#f0f0f0]"></div>
                <div>
                  <div className="text-[11px] text-[#999] mb-1">
                    Success Rate
                  </div>
                  <div className={`text-xl font-bold ${
                    resolutionRate >= 70 ? 'text-[#10B981]' : 
                    resolutionRate >= 40 ? 'text-[#F7931E]' : 'text-[#EF4444]'
                  }`}>
                    {resolutionRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-5 animate-[fadeIn_0.2s_ease]"
          onClick={closeModal}
        >
          <div 
            className="bg-gradient-to-br from-white to-[#f8f9fa] rounded-2xl max-w-[650px] w-full max-h-[85vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-[slideUp_0.3s_ease] border border-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#8B0000] to-[#6d0000] p-[18px_24px] flex justify-between items-center">
              <div>
                <h2 className="m-0 mb-0.5 text-sm font-bold text-white tracking-wide">
                  Complaint Details
                </h2>
                <p className="m-0 text-[9px] text-white/80 font-medium">
                  ID: {selectedComplaint.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button 
                className="bg-white/15 border border-white/20 text-lg cursor-pointer text-white p-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 font-light hover:bg-white/25 hover:rotate-90"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-[20px_24px_24px] overflow-y-auto max-h-[calc(85vh-120px)]">
              {/* Status & Category Badges */}
              <div className="flex gap-2.5 mb-[18px] flex-wrap">
                <span className={`px-3 py-1.5 rounded-[15px] text-[11px] font-semibold inline-block tracking-wide uppercase ${getStatusStyles(selectedComplaint.status)}`}>
                  {selectedComplaint.status || "Pending"}
                </span>
                <span className="text-[9px] px-3 py-[5px] bg-[#f0f0f0] text-[#555] rounded-[20px] font-semibold tracking-wide">
                  {selectedComplaint.category || "Uncategorized"}
                </span>
              </div>

              {/* Description */}
              <div className="bg-white p-[14px_16px] rounded-[10px] mb-[14px] border border-[#e8e8e8] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="text-[8px] text-[#999] uppercase tracking-[0.8px] mb-2 font-bold">
                  Description
                </div>
                <div className="text-[10px] text-[#2a2a2a] leading-[1.7]">
                  {selectedComplaint.concernDescription ||
                    selectedComplaint.otherDescription ||
                    selectedComplaint.incidentDescription ||
                    selectedComplaint.facilityDescription ||
                    selectedComplaint.concernFeedback ||
                    "No description provided"}
                </div>
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-[14px]">
                {/* Date Filed */}
                <div className="bg-white p-[12px_14px] rounded-[10px] border border-[#e8e8e8]">
                  <div className="text-[8px] text-[#999] uppercase tracking-[0.8px] mb-1.5 font-bold">
                    Date Filed
                  </div>
                  <div className="text-[9px] text-[#2a2a2a] font-semibold">
                    {selectedComplaint.submissionDate?.toDate().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) || "—"}
                  </div>
                  <div className="text-[8px] text-[#777] mt-0.5">
                    {selectedComplaint.submissionDate?.toDate().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Status Card */}
                {(selectedComplaint.status?.toLowerCase() === 'resolved' || selectedComplaint.dateResolved) ? (
                  <div className="p-[12px_14px] rounded-[10px] text-white bg-gradient-to-br from-[#10B981] to-[#059669]">
                    <div className="text-[8px] opacity-90 uppercase tracking-[0.8px] mb-1.5 font-bold">
                      ✓ Resolved
                    </div>
                    <div className="text-[9px] font-semibold">
                      {selectedComplaint.dateResolved ? 
                        selectedComplaint.dateResolved.toDate().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : "Date Not Available"
                      }
                    </div>
                    <div className="text-[8px] opacity-90 mt-0.5">
                      {selectedComplaint.dateResolved ? 
                        selectedComplaint.dateResolved.toDate().toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : "Details Missing"
                      }
                    </div>
                  </div>
                ) : (
                  <div className="p-[12px_14px] rounded-[10px] text-white bg-gradient-to-br from-[#FF6B35] to-[#F7931E]">
                    <div className="text-[8px] opacity-90 uppercase tracking-[0.8px] mb-1.5 font-bold">
                      Status
                    </div>
                    {/* Shows actual status like "Pending", "Filed" etc */}
                    <div className="text-[9px] font-semibold capitalize">
                      {selectedComplaint.status || "Pending"}
                    </div>
                    <div className="text-[8px] opacity-90 mt-0.5">
                      {selectedComplaint.status === 'In Progress' ? "Being reviewed" : "Current Status"}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              {selectedComplaint.additionalNotes && (
                <div className="bg-white p-[14px_16px] rounded-[10px] mb-[14px] border border-[#e8e8e8] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <div className="text-[8px] text-[#999] uppercase tracking-[0.8px] mb-2 font-bold">
                    Additional Notes
                  </div>
                  <div className="text-[10px] text-[#2a2a2a] leading-[1.7]">
                    {selectedComplaint.additionalNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-[14px_24px] border-t border-[#e8e8e8] bg-white flex justify-end">
              <button 
                className="px-5 py-2 bg-gradient-to-br from-[#8B0000] to-[#6d0000] text-white border-none rounded-lg text-[9px] font-bold cursor-pointer transition-all duration-200 tracking-wider uppercase shadow-[0_2px_8px_rgba(139,0,0,0.2)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(139,0,0,0.3)]"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;