import React, { useState, useEffect } from "react";
// Removed: import "../../styles/styles-student/student-complaintHistory.css";
import { useLocation } from "react-router-dom";
import SideBar from "./components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { db, auth } from "../../firebase/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";

const ComplaintHistory = () => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const location = useLocation();
  const hasAppliedRouteSelection = React.useRef(false);

  // Ref logic for real-time updates
  const selectedComplaintRef = React.useRef(selectedComplaint);

  useEffect(() => {
    selectedComplaintRef.current = selectedComplaint;
  }, [selectedComplaint]);

  // --- Helper Functions ---

  // Enhanced Status Badge Styles
  const getStatusClasses = (status) => {
    const s = (status || "pending").toLowerCase();
    switch (s) {
      case "resolved":
      case "completed":
        return "bg-green-100 text-green-800 border border-green-200";
      case "in-progress":
      case "processing":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "pending":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "filed":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case "closed":
      case "rejected":
      case "cancelled":
        return "bg-gray-100 text-gray-600 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

  // Load jsPDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Open specific complaint from route
  useEffect(() => {
    if (hasAppliedRouteSelection.current) return;
    const state = location?.state || {};
    const targetId = state.complaintId;
    const focusTab = state.focusTab;
    if (!targetId) return;

    const target = complaints.find((c) => c.id === targetId);
    if (target) {
      setSelectedComplaint(target);
      setActiveTab(focusTab === 'feedback' ? 'feedback' : 'details');
      hasAppliedRouteSelection.current = true;
    }
  }, [location?.state, complaints]);

  // Real-time Updates
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const setupRealtimeListener = (userId) => {
      const complaintsRef = collection(db, "complaints");
      const q = query(complaintsRef, where("userId", "==", userId));

      unsubscribeSnapshot = onSnapshot(
        q,
        (querySnapshot) => {
          if (querySnapshot.empty) {
            setComplaints([]);
            setLoading(false);
            return;
          }

          const complaintList = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            complaintList.push({
              id: docSnap.id,
              ...data,
            });
          });

          const sortedComplaints = complaintList.sort((a, b) => {
            const dateA = a.submissionDate ? a.submissionDate.toDate() : new Date(0);
            const dateB = b.submissionDate ? b.submissionDate.toDate() : new Date(0);
            return dateB - dateA;
          });

          setComplaints(sortedComplaints);

          if (selectedComplaintRef.current) {
            const updatedSelected = sortedComplaints.find(c => c.id === selectedComplaintRef.current.id);
            if (updatedSelected) {
              setSelectedComplaint(updatedSelected);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.error("Real-time listener error:", error);
          setLoading(false);
        }
      );
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setupRealtimeListener(user.uid);
      } else {
        setComplaints([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Constants & Formatters
  const CATEGORY_FIELD_CONFIG = {
    academic: [
      { key: "courseTitle", label: "Course / Subject Title" },
      { key: "instructor", label: "Instructor" },
      { key: "concernDescription", label: "Concern Description" },
      { key: "impactExperience", label: "Academic Impact" },
      { key: "gradingFairness", label: "Grading Fairness" },
      { key: "lessonSatisfaction", label: "Lesson Satisfaction" },
      { key: "workloadStress", label: "Workload Stress Frequency" },
    ],
    "faculty-conduct": [
      { key: "departmentOffice", label: "Department / Office" },
      { key: "incidentDescription", label: "Incident Description" },
      { key: "incidentDate", label: "Date of Occurrence", format: formatDateTime },
      { key: "incidentFrequency", label: "Frequency" },
      { key: "additionalContext", label: "Additional Context" },
      { key: "respectLevel", label: "Respect Level" },
      { key: "professionalism", label: "Professionalism" },
      { key: "similarBehavior", label: "Similar Behavior Frequency" },
    ],
    facilities: [
      { key: "facilityLocation", label: "Location / Room" },
      { key: "observedDateTime", label: "Observed On", format: formatDateTime },
      { key: "facilityDescription", label: "Facility Issue" },
      { key: "facilitySatisfaction", label: "Facility Satisfaction" },
      { key: "facilityFrequency", label: "Issue Frequency" },
      { key: "facilitySafety", label: "Safety Concern Level" },
    ],
    "administrative-student-services": [
      { key: "officeInvolved", label: "Office / Service" },
      { key: "transactionDate", label: "Transaction Date", format: formatDateTime },
      { key: "concernFeedback", label: "Concern / Feedback" },
      { key: "additionalNotes", label: "Additional Notes" },
      { key: "serviceEfficiency", label: "Service Efficiency" },
      { key: "communicationSatisfaction", label: "Communication Satisfaction" },
      { key: "serviceAccessibility", label: "Service Accessibility" },
    ],
    other: [
      { key: "otherDescription", label: "Concern Description" }
    ],
  };

  const getCategorySpecificDetails = (complaint) => {
    if (!complaint) return [];
    const fields = CATEGORY_FIELD_CONFIG[complaint.category] || [];
    return fields
      .map(({ key, label, format }) => {
        const rawValue = complaint[key];
        if (rawValue === undefined || rawValue === null || rawValue === "") return null;
        const value = format ? format(rawValue) : rawValue;
        return { label, value };
      })
      .filter(Boolean);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      academic: "Academic",
      "faculty-conduct": "Faculty Conduct",
      facilities: "Facilities",
      "administrative-student-services": "Admin/Student Services",
      other: "Other",
    };
    return labels[category] || "N/A";
  };

  const getDescription = (complaint) => {
    return (
      complaint.concernDescription ||
      complaint.otherDescription ||
      complaint.incidentDescription ||
      complaint.facilityDescription ||
      complaint.concernFeedback ||
      "No description provided"
    );
  };

  function formatDateTime(date) {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  }

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return date.toDate().toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const canDelete = (status) => (status || "").toLowerCase() === "pending";

  const handleDelete = async (complaintId) => {
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint || !canDelete(complaint.status)) return;

    if (window.confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "complaints", complaintId));
      } catch (error) {
        alert("Failed to delete complaint: " + error.message);
      }
    }
  };

  const getAttachments = (complaint) => {
    const attachments = [];
    if (Array.isArray(complaint.attachments) && complaint.attachments.length) attachments.push(...complaint.attachments);
    if (complaint.attachment) attachments.push(complaint.attachment);
    if (complaint.attachmentUrl) attachments.push(complaint.attachmentUrl);
    if (complaint.attachmentURL) attachments.push(complaint.attachmentURL);
    if (complaint.file) attachments.push(complaint.file);
    return attachments;
  };

  // --- PDF GENERATION (Matching the Image Format) ---
  const generatePDF = (complaint) => {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        alert('PDF library is loading. Please try again in a moment.');
        return null;
      }
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Header (Maroon-Primary: #800020 -> [128, 0, 32]) matches image_53915b.png
      doc.setFillColor(128, 0, 32);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MSU-IIT SpeakUp', pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Complaint Management System', pageWidth / 2, 25, { align: 'center' });

      // Document Title
      yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPLAINT REPORT', pageWidth / 2, yPos, { align: 'center' });

      // Info Grid Background
      yPos = 65;
      doc.setFillColor(249, 249, 249); // Light Gray
      doc.rect(margin, yPos, contentWidth, 60, 'F');
      doc.setDrawColor(221, 221, 221);
      doc.rect(margin, yPos, contentWidth, 60, 'S');

      // Info Grid Content
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32); 

      // Left Column
      doc.text('DOCUMENT ID', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(complaint.id, margin + 5, yPos + 5);

      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('COMPLAINT CATEGORY', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(getCategoryLabel(complaint.category), margin + 5, yPos + 5);

      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('CURRENT STATUS', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(complaint.status || 'Pending', margin + 5, yPos + 5);

      // Right Column
      yPos = 75;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE GENERATED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString(), pageWidth / 2 + 5, yPos + 5);

      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE FILED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(formatDate(complaint.submissionDate), pageWidth / 2 + 5, yPos + 5);

      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE RESOLVED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(formatDate(complaint.dateResolved) || '—', pageWidth / 2 + 5, yPos + 5);

      // Complaint Description Section
      yPos = 135;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('COMPLAINT DESCRIPTION', margin, yPos);

      doc.setDrawColor(128, 0, 32);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const description = getDescription(complaint);
      const splitDescription = doc.splitTextToSize(description, contentWidth - 10);
      doc.text(splitDescription, margin + 5, yPos);

      // Attachments (if any)
      const attachments = getAttachments(complaint);
      if (attachments.length > 0) {
        yPos += (splitDescription.length * 5) + 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(128, 0, 32);
        doc.text('ATTACHED DOCUMENTS', margin, yPos);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        attachments.forEach((attachment, index) => {
          const fileName = typeof attachment === 'string' ? attachment : attachment.name || `Attachment ${index + 1}`;
          doc.text(`${index + 1}. ${fileName}`, margin + 5, yPos);
          yPos += 6;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('This is an official document generated from MSU-IIT SpeakUp Complaint Management System.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

      return doc;
    } catch (error) {
      console.error('PDF error', error);
      return null;
    }
  };

  const handlePrint = () => {
    if (!selectedComplaint) return;
    const doc = generatePDF(selectedComplaint);
    if (doc) window.open(URL.createObjectURL(doc.output('blob'))).print();
  };

  const handleDownload = () => {
    if (!selectedComplaint) return;
    const doc = generatePDF(selectedComplaint);
    if (doc) doc.save(`complaint_${selectedComplaint.id}.pdf`);
  };

  // Render Functions
  const renderDetailsTab = () => {
    const categoryDetails = getCategorySpecificDetails(selectedComplaint);
    const attachments = getAttachments(selectedComplaint);

    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
            {getCategoryLabel(selectedComplaint.category)} Details
          </h4>
          {categoryDetails.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              {categoryDetails.map((info, index) => (
                <div className="flex flex-col gap-1" key={index}>
                  <span className="text-xs font-semibold text-gray-500 uppercase">{info.label}</span>
                  <span className="text-sm text-gray-900 font-medium">{info.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No specific details provided.</p>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
              Attachments ({attachments.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((file, index) => {
                const label = typeof file === "string" ? file : file?.name || `Attachment ${index + 1}`;
                const url = typeof file === "string" ? file : file?.url;
                return (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors" key={index}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-file-alt text-[#800020] text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
                    </div>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#800020] px-2">
                        <i className="fas fa-external-link-alt text-xs"></i>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFeedbackTab = () => {
    const feedbackHistory = selectedComplaint.feedbackHistory || [];
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Communication History</h4>
        {feedbackHistory.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-comments text-gray-400 text-lg"></i>
            </div>
            <p className="text-sm text-gray-500">No feedback received from administrators yet.</p>
          </div>
        ) : (
          feedbackHistory.map((item, index) => (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm" key={index}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#800020] text-white flex items-center justify-center text-xs font-bold">
                    AD
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-gray-900">Admin Response</span>
                    <span className="block text-xs text-gray-500">{item.date ? formatDateTime(item.date) : "Recently"}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">{item.feedback}</p>
              {item.files?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200">
                      <i className="fas fa-paperclip text-[10px]"></i> {typeof f === 'string' ? f : f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div id="historyPage" className="min-h-screen bg-gray-50 flex">
  <SideBar />

  <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
    <MainNavbar />
    
    {/* Scrollable Main Content - Existing Padding Top kept */}
    <div className="flex-1 overflow-y-auto p-4 md:p-24 pt-24 lg:pt-[120px]">
      <div className="max-w-7xl mx-auto">
        
        {/* Main Complaint History Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Card Header (No changes needed here) */}
          <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#800020]"></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Complaint History</h2>
              <p className="text-xs text-gray-500 mt-1">View and track the status of your submitted concerns.</p>
            </div>
          </div>

          {/* Enhanced Table - Font size decreased for mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {/* --- MODIFIED TABLE HEADERS --- */}
                  <th className="
                    px-3 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wider w-[40%]
                    sm:px-6 sm:py-4 sm:text-[12px] // Revert to larger size on sm/md screens
                  ">Complaint</th>
                  
                  <th className="
                    px-3 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wider w-[20%]
                    sm:px-6 sm:py-4 sm:text-[12px]
                  ">Category</th>
                  
                  <th className="
                    px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[15%]
                    sm:px-6 sm:py-4 sm:text-[11px]
                  ">Date Filed</th>
                  
                  <th className="
                    px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[15%]
                    sm:px-6 sm:py-4 sm:text-[11px]
                  ">Status</th>
                  
                  <th className="
                    px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right w-[10%]
                    sm:px-6 sm:py-4 sm:text-[11px]
                  ">Actions</th>
                  {/* ----------------------------- */}
                </tr>
              </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">Loading...</td></tr>
                    ) : complaints.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center">
                          <p className="text-gray-900 font-xs text-[12.5px]">No complaints found</p>
                        </td>
                      </tr>
                    ) : (
                      complaints.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-150 group">
                          <td className="px-6 py-4 align-middle">
                            {/* Changed text-xs to text-sm */}
                            <div className="text-[12.5px] font-medium text-gray-900 line-clamp-2 leading-relaxed max-w-md" title={getDescription(c)}>
                              {getDescription(c)}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            {/* Changed text-xs to text-sm */}
                            <span className="text-[12.5px] text-gray-700">{getCategoryLabel(c.category)}</span>
                          </td>
                          <td className="px-6 py-4 align-middle text-[12.5px] text-gray-600">
                            {formatDate(c.submissionDate)}
                          </td>
                          <td className="px-6 py-4 align-middle">
                            {/* Bumped badge size from 10px to text-xs (12px) */}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm ${getStatusClasses(c.status)}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
                              {c.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setSelectedComplaint(c); setActiveTab("details"); }}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#800020] hover:bg-red-50 bg-gray-70 transition-colors rounded"
                                title="View Details"
                              >
                                <i className="fas fa-eye text-sm text-gray-600"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={!canDelete(c.status)}
                                className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                                  canDelete(c.status) ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-200 cursor-not-allowed"
                                }`}
                                title={canDelete(c.status) ? "Delete" : "Locked"}
                              >
                                <i className="fas fa-trash-alt text-sm"></i>
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
          </div>
        </div>

        {/* Enhanced Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-[2000] p-4 animate-fadeIn"
            onClick={() => setSelectedComplaint(null)}>
            <div
              className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden transform transition-all scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Complaint Details</h2>
                  <p className="text-[9px] text-gray-500 mt-0.5">ID: {selectedComplaint.id}</p>
                </div>
                <div className="flex gap-2">
                   <div className="flex bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={handleDownload} 
                        className="px-3 py-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all flex items-center gap-2 text-xs font-medium"
                        title="Download PDF"
                      >
                        <i className="fas fa-download"></i> Download
                      </button>
                      <button 
                        onClick={handlePrint} 
                        className="px-3 py-2 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all flex items-center gap-2 text-xs font-medium"
                        title="Print"
                      >
                        <i className="fas fa-print"></i> Print
                      </button>
                   </div>
                   <button 
                    onClick={() => setSelectedComplaint(null)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-[#800020] hover:bg-[#800020] hover:text-white transition-colors ml-2"
                   >
                    <i className="fas fa-times"></i>
                   </button>
                </div>
              </div>

              {/* Modal Navigation */}
              <div className="flex border-b border-gray-200 bg-gray-50/50 px-6">
                <button
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === "details" ? "border-[#800020] text-[#800020]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("details")}
                >
                  Overview
                </button>
                <button
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === "feedback" ? "border-[#800020] text-[#800020]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("feedback")}
                >
                  Feedback
                  {selectedComplaint.feedbackHistory?.length > 0 && (
                    <span className="bg-[#800020] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {selectedComplaint.feedbackHistory.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto bg-gray-50/30 flex-1">
                {/* Status Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusClasses(selectedComplaint.status)}`}>
                       {selectedComplaint.status || "Pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Date Filed</span>
                    <span className="text-xs font-semibold text-gray-900">{formatDate(selectedComplaint.submissionDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Category</span>
                    <span className="text-xs font-semibold text-gray-900">{getCategoryLabel(selectedComplaint.category)}</span>
                  </div>
                   <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Resolved</span>
                    <span className="text-xs font-semibold text-gray-900">{formatDate(selectedComplaint.dateResolved) || "—"}</span>
                  </div>
                </div>

                {activeTab === "details" && renderDetailsTab()}
                {activeTab === "feedback" && renderFeedbackTab()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintHistory;