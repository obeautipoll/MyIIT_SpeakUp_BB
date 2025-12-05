import React, { useState, useEffect } from "react";
import "../../styles-admin/monitor-admin.css";
import SideBar from "./components/SideBar";
import AdminNavbar from "./components/NavBar";
import { db } from "../../firebase/firebase";
import { collection, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../contexts/authContext";

const AdminMonitorComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");

  // Filter states
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    search: "",
  });

  

  // Form states
  const [feedback, setFeedback] = useState("");
  const [feedbackFiles, setFeedbackFiles] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [noteModalComplaint, setNoteModalComplaint] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [staffRole, setStaffRole] = useState(null);
  const { currentUser } = useAuth();
  const VIEW_TABS = ["details", "feedback"];
  const MANAGE_TABS = ["details", "feedback", "notes", "status"];
  const TAB_LABELS = {
    details: "Details",
    feedback: "Feedback",
    notes: "Notes",
    status: "Status",
  };

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const normalizedRole = storedUser?.role?.toLowerCase() || "";
      if (normalizedRole === "staff" || normalizedRole === "kasama") {
        setStaffRole(normalizedRole);
      } else {
        setStaffRole("");
      }
    } catch (error) {
      console.error("Error determining staff role:", error);
      setStaffRole("");
    }
  }, []);

  // 🔥 Fetch complaints from Firestore
  useEffect(() => {
    if (staffRole === null) return;
    const fetchComplaints = async () => {
      try {
        const q = query(collection(db, "complaints"), orderBy("submissionDate", "desc"));
        const snapshot = await getDocs(q);

        const fetchedComplaints = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let scopedComplaints = fetchedComplaints;
        if (staffRole) {
          scopedComplaints = fetchedComplaints.filter(
            (complaint) => (complaint.assignedRole || "").toLowerCase() === staffRole
          );
        }

        setComplaints(scopedComplaints);
        setFilteredComplaints(scopedComplaints);
      } catch (error) {
        console.error("❌ Error fetching complaints:", error);
      }
    };

    fetchComplaints();
  }, [staffRole]);

  // 🔎 Filtering logic
  useEffect(() => {
    let filtered = complaints;

    if (filters.category !== "all") {
      filtered = filtered.filter((c) => c.category === filters.category);
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.search) {
      filtered = filtered.filter(
        (c) =>
          (c.id && c.id.toLowerCase().includes(filters.search.toLowerCase())) ||
          (c.category && c.category.toLowerCase().includes(filters.search.toLowerCase())) ||
          (c.college && c.college.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    setFilteredComplaints(filtered);
  }, [filters, complaints]);

  useEffect(() => {
    const allowedTabs = modalMode === "view" ? VIEW_TABS : MANAGE_TABS;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [modalMode, activeTab]);

  // 📄 Modal logic
  const openModal = (complaint, mode = "view", defaultTab = "details") => {
    setSelectedComplaint(complaint);
    setShowModal(true);
    setModalMode(mode);
    setActiveTab(defaultTab);
    setFeedback("");
    setFeedbackFiles([]);
    setAssignTo(complaint.assignedTo || "");
    setAssignMessage("");
    setNewStatus(complaint.status || "pending");
  };

  const switchToManageMode = (defaultTab = "details") => {
    setModalMode("manage");
    setActiveTab(defaultTab);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
    setActiveTab("details");
    setModalMode("view");
  };

  

  // 💬 Feedback & Admin actions (same as before)
  const getAdminIdentifier = () => currentUser?.uid || currentUser?.email || "admin-user";

  const getAdminDisplayName = () =>
    currentUser?.displayName || currentUser?.email || "Admin User";

  const getSharedNote = (complaint) =>
    (complaint?.adminNotes && complaint.adminNotes[0]) || null;

  const openNoteModal = (complaint) => {
    if (!currentUser) {
      alert("You must be logged in to manage notes.");
      return;
    }

    if (!staffRole) {
      alert("We cannot determine your role yet. Please try again shortly.");
      return;
    }

    const existingNote = getSharedNote(complaint);
    setNoteModalComplaint(complaint);
    setNoteInput(existingNote?.note || "");
    setNoteError("");
  };

  const closeNoteModal = () => {
    setNoteModalComplaint(null);
    setNoteInput("");
    setNoteError("");
    setIsSavingNote(false);
  };

  const handleSaveAdminNote = async () => {
    if (!noteModalComplaint || !currentUser) return;
    if (!staffRole) {
      setNoteError("Your staff role is not set. Please reload and try again.");
      return;
    }

    if (!noteInput.trim()) {
      setNoteError("Please enter a note before saving.");
      return;
    }

    setIsSavingNote(true);
    setNoteError("");

    try {
      const adminId = getAdminIdentifier();
      const adminName = getAdminDisplayName();

      const updatedNote = {
        adminId,
        adminName,
        adminRole: staffRole || "staff",
        note: noteInput.trim(),
        updatedAt: new Date().toISOString(),
      };

      const updatedNotes = [updatedNote];

      const complaintRef = doc(db, "complaints", noteModalComplaint.id);
      await updateDoc(complaintRef, { adminNotes: updatedNotes });

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === noteModalComplaint.id
            ? { ...complaint, adminNotes: updatedNotes }
            : complaint
        )
      );

      if (selectedComplaint?.id === noteModalComplaint.id) {
        setSelectedComplaint((prev) =>
          prev ? { ...prev, adminNotes: updatedNotes } : prev
        );
      }

      closeNoteModal();
    } catch (error) {
      console.error("Error saving admin note:", error);
      setNoteError("Unable to save note right now. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSendFeedback = () => {
    if (!selectedComplaint) return;
    if (!feedback.trim()) {
      alert("Please enter feedback");
      return;
    }

    const newFeedback = {
      feedback,
      admin: "Current Admin",
      date: new Date().toISOString(),
      files: feedbackFiles.map((f) => f.name),
    };

    const updated = complaints.map((c) =>
      c.id === selectedComplaint.id
        ? { ...c, feedbackHistory: [...(c.feedbackHistory || []), newFeedback] }
        : c
    );

    setComplaints(updated);
    setSelectedComplaint({
      ...selectedComplaint,
      feedbackHistory: [...(selectedComplaint.feedbackHistory || []), newFeedback],
    });

    setFeedback("");
    setFeedbackFiles([]);
  };

  const handleFeedbackFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setFeedbackFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFeedbackFile = (indexToRemove) => {
    setFeedbackFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const openModalForStatusChange = (complaint) => {
    openModal(complaint, "manage", "status");
  };
  const handleAssignComplaint = () => {
    if (!assignTo) {
      alert("Please select who to assign to");
      return;
    }

    const updated = complaints.map((c) =>
      c.id === selectedComplaint.id
        ? { ...c, assignedTo: assignTo }
        : c
    );

    setComplaints(updated);
    setSelectedComplaint({ ...selectedComplaint, assignedTo: assignTo });
  };

const handleUpdateStatus = async (newStatus) => {
  if (!selectedComplaint || !newStatus || newStatus === selectedComplaint.status) return;

  // Add confirmation before update
  const confirmed = window.confirm(
    `Are you sure you want to change the status to "${newStatus}"?`
  );
  if (!confirmed) return; // If not confirmed, do nothing

  try {
    // Update the status in Firestore
    const complaintRef = doc(db, "complaints", selectedComplaint.id);
    await updateDoc(complaintRef, { status: newStatus });

    // Update the status in the UI (locally)
    const updatedComplaints = complaints.map((complaint) =>
      complaint.id === selectedComplaint.id
        ? { ...complaint, status: newStatus }
        : complaint
    );

    setComplaints(updatedComplaints);
    setSelectedComplaint({ ...selectedComplaint, status: newStatus });
    setNewStatus(newStatus);

  } catch (error) {
    console.error("❌ Error updating complaint status:", error);
  }
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "status-pending"; // CSS class for Pending status color
    case "in progress":
      return "status-in-progress"; // CSS class for In Progress status color
    case "resolved":
      return "status-resolved"; // CSS class for Resolved status color
    case "closed":
      return "status-closed"; // CSS class for Closed status color
    default:
      return "status-pending"; // Default to pending if no status is available
  }
};

  // 🧹 Utility helpers
  const formatDateTime = (date) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
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
    other: [{ key: "otherDescription", label: "Concern Description" }],
  };

  const getCategorySpecificDetails = (complaint) => {
    if (!complaint) return [];

    const fields = CATEGORY_FIELD_CONFIG[complaint.category] || [];
    return fields
      .map(({ key, label, format }) => {
        const rawValue = complaint[key];
        if (rawValue === undefined || rawValue === null || rawValue === "") {
          return null;
        }
        const value = format ? format(rawValue) : rawValue;
        return { label, value };
      })
      .filter(Boolean);
  };

  const renderComplaintDetails = () => {
    if (!selectedComplaint) return null;

    const categoryDetails = getCategorySpecificDetails(selectedComplaint);

    const attachmentCandidates = [];
    if (Array.isArray(selectedComplaint.attachments) && selectedComplaint.attachments.length) {
      attachmentCandidates.push(...selectedComplaint.attachments);
    }
    if (selectedComplaint.attachment) {
      attachmentCandidates.push(selectedComplaint.attachment);
    }
    if (selectedComplaint.attachmentUrl) {
      attachmentCandidates.push(selectedComplaint.attachmentUrl);
    }
    if (selectedComplaint.attachmentURL) {
      attachmentCandidates.push(selectedComplaint.attachmentURL);
    }

    return (
      <>
        <div className="detail-section">
          <h4>{`${getCategoryLabel(selectedComplaint.category)} Details`}</h4>
          {categoryDetails.length > 0 ? (
            <div className="detail-grid">
              {categoryDetails.map((info) => (
                <div className="detail-item" key={info.label}>
                  <strong>{info.label}:</strong>
                  <span>{info.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No specific details were provided for this category.</p>
          )}
        </div>

        {attachmentCandidates.length > 0 && (
          <div className="detail-section">
            <h4>Attachments</h4>
            {attachmentCandidates.map((file, index) => {
              const label =
                typeof file === "string"
                  ? file
                  : file?.name || file?.fileName || `Attachment ${index + 1}`;
              const url = typeof file === "string" ? file : file?.url || file?.downloadURL;

              return (
                <div className="attachment-item" key={`${label}-${index}`}>
                  <span>dY"Z {label}</span>
                  {url && (
                    <a className="btn-link" href={url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const formatNoteTimestamp = (value) => {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString();
  };

  const visibleTabs = modalMode === "view" ? VIEW_TABS : MANAGE_TABS;

  return (
    <div className="monitor-complaints-page">
      <SideBar />
      <AdminNavbar />

      <div className="main-content">
        <div className="page-header">
          <div>
            <h2>Monitor Student Complaints</h2>
            <p>View and manage all student complaints</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by ID or College..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">All</option>
              <option value="academic">Academic</option>
              <option value="faculty-conduct">Faculty Conduct</option>
              <option value="facilities">Facilities</option>
              <option value="administrative-student-services">Admin/Student Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="filter-group">
           <p><strong>Status:</strong> 
            <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </p>
          </div>
        </div>

       {/* Table */} 
          <div className="table-container">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>College</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No complaints found
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.college || "—"}</td>
                      <td>{getCategoryLabel(c.category)}</td>
                      <td>
                      <span 
                        className={`status-badge ${getStatusClass(c.status)}`}
                        onClick={() => openModalForStatusChange(c)}  // Open modal to change status
                        style={{ cursor: "pointer" }}  // Show pointer cursor on hover
                      >
                        {c.status || "Pending"}
                      </span>
                    </td>
                      <td>{formatDateTime(c.submissionDate)}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-view"
                          onClick={() => openModal(c, "manage")}
                          title="View the full complaint details"
                        >
                          View
                        </button>
                        <button
                          className="btn-note"
                          onClick={() => openNoteModal(c)}
                          disabled={!currentUser}
                          title={
                            getSharedNote(c)
                              ? "Update the note for this assignment"
                              : "Add a note for this assignment"
                          }
                        >
                          {getSharedNote(c) ? "Update Note" : "Add Note"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showModal && selectedComplaint && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h3>Complaint #{selectedComplaint.id}</h3>
                    <p>
                      {(selectedComplaint.college || "No college specified") +
                        " - " +
                        getCategoryLabel(selectedComplaint.category)}
                    </p>
                  </div>
                  <button className="btn-close" onClick={closeModal}>
                    X
                  </button>
                </div>

                <div className="modal-tabs">
                  {visibleTabs.map((tabKey) => (
                    <button
                      key={tabKey}
                      className={`tab-btn ${activeTab === tabKey ? "active" : ""}`}
                      onClick={() => setActiveTab(tabKey)}
                    >
                      {TAB_LABELS[tabKey]}
                    </button>
                  ))}
                  {modalMode === "view" && (
                    <button className="btn-secondary manage-switch" onClick={() => switchToManageMode("details")}>
                      Manage Complaint
                    </button>
                  )}
                </div>

                <div className="modal-body">
                  {visibleTabs.includes("details") && activeTab === "details" && (
                    <div className="tab-content">{renderComplaintDetails()}</div>
                  )}

                  {visibleTabs.includes("feedback") && activeTab === "feedback" && (
                    <div className="tab-content">
                      <h4>Feedback History</h4>
                      {!selectedComplaint.feedbackHistory ||
                      selectedComplaint.feedbackHistory.length === 0 ? (
                        <p className="empty-state">No feedback shared yet.</p>
                      ) : (
                        <div className="feedback-history">
                          {selectedComplaint.feedbackHistory.map((item, index) => (
                            <div className="feedback-item" key={`${item.date || index}-${index}`}>
                              <div className="feedback-header">
                                <strong>{item.admin || "Admin"}</strong>
                                <span className="feedback-date">
                                  {item.date ? formatDateTime(item.date) : "Just now"}
                                </span>
                              </div>
                              <p>{item.feedback}</p>
                              {item.files && item.files.length > 0 && (
                                <div className="feedback-files">
                                  {item.files.map((file, fileIndex) => (
                                    <span className="file-tag" key={`${file}-${fileIndex}`}>
                                      {file.name || file}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="feedback-form">
                        <h4>Send New Feedback</h4>
                        <textarea
                          rows="4"
                          placeholder="Write your feedback to the student..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        ></textarea>

                        <div className="file-upload-section">
                          <label className="file-upload-label">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={handleFeedbackFileChange}
                            />
                            dY"Z Attach Files
                          </label>
                          {feedbackFiles.length > 0 && (
                            <div className="selected-files">
                              {feedbackFiles.map((file, index) => (
                                <div className="file-chip" key={`${file.name || "file"}-${index}`}>
                                  <span>{file.name || "Attachment"}</span>
                                  <button type="button" onClick={() => handleRemoveFeedbackFile(index)}>
                                    A-
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button className="btn-primary" onClick={handleSendFeedback}>
                          Send Feedback
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleTabs.includes("notes") && activeTab === "notes" && (
                    <div className="tab-content">
                      <h4>Shared Notes</h4>
                      {!selectedComplaint.adminNotes || selectedComplaint.adminNotes.length === 0 ? (
                        <p className="empty-state">No notes have been added.</p>
                      ) : (
                        <div className="notes-history">
                          {selectedComplaint.adminNotes.map((note, index) => (
                            <div className="note-card" key={`${note.adminId || "note"}-${index}`}>
                              <div className="note-card-header">
                                <span className="note-author">
                                  {note.adminName || "Unknown"} -{" "}
                                  {note.adminRole ? note.adminRole.toUpperCase() : "STAFF"}
                                </span>
                                <span className="note-timestamp">
                                  {formatNoteTimestamp(note.updatedAt || note.createdAt)}
                                </span>
                              </div>
                              <p className="note-text">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn-secondary" onClick={() => openNoteModal(selectedComplaint)}>
                        {getSharedNote(selectedComplaint) ? "Update Note" : "Add Note"}
                      </button>
                    </div>
                  )}

                  {visibleTabs.includes("status") && activeTab === "status" && (
                    <div className="tab-content">
                      <h4>Status Management</h4>

                      <div className="current-status-display">
                        <p>
                          <strong>Current Status:</strong>
                        </p>
                        <span className={`status-badge ${getStatusClass(selectedComplaint.status)}`}>
                          {selectedComplaint.status || "Pending"}
                        </span>
                      </div>

                      <div className="status-form">
                        <div className="form-group">
                          <label>New Status:</label>
                          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <button className="btn-primary" onClick={() => handleUpdateStatus(newStatus)}>
                          Update Status
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {noteModalComplaint && (
          <div className="modal-overlay" onClick={closeNoteModal}>
            <div className="modal-container note-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {getSharedNote(noteModalComplaint) ? "Update" : "Add"} Note - {noteModalComplaint.id}
                </h3>
                <button className="btn-close" onClick={closeNoteModal}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <textarea
                  className="note-textarea"
                  placeholder="Write a quick update for this complaint..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
                {noteError && <p className="error-text">{noteError}</p>}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeNoteModal} disabled={isSavingNote}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveAdminNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote
                    ? "Saving..."
                    : getSharedNote(noteModalComplaint)
                    ? "Update Note"
                    : "Add Note"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default AdminMonitorComplaints;
