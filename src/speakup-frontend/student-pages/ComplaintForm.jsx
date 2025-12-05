import React, { useState } from "react";
import "../../styles/styles-student/complaintForm.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import SideBar from "../student-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";

import { submitComplaint } from "../../services/complaintServices";
import { ProfanityFilter } from "../../services/profanityFilter";



const FileComplaint = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showProfanityAlert, setShowProfanityAlert] = useState(false);
  const [profanityIssues, setProfanityIssues] = useState([]);
  const [complaintData, setComplaintData] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    
    // Check for profanity in form data
    const profanityCheck = ProfanityFilter.checkFormData(data);
    
    if (profanityCheck.hasIssues) {
      // Show profanity alert instead of proceeding
      setProfanityIssues(profanityCheck.issues);
      setShowProfanityAlert(true);
      return;
    }
    
    // If no profanity, proceed to confirmation modal
    setComplaintData(data);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    try {
      // Check if there's an uploaded file (if any)
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0] || null;

      await submitComplaint(
        { ...complaintData, category }, // all form data
        file // optional file
      );

      setShowModal(false);
      alert("✓ Your complaint has been submitted successfully!");

      // Reset form and category
      setCategory("");
      document.getElementById("complaintForm").reset();

    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("✖ An error occurred. Please try again.");
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const handleCloseProfanityAlert = () => {
    setShowProfanityAlert(false);
    setProfanityIssues([]);
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      academic: "Academic",
      "faculty-conduct": "Faculty Conduct",
      facilities: "Facilities",
      "administrative-student-services": "Administrative/Student Services",
      other: "Other"
    };
    return labels[cat] || cat;
  };

  const formatFieldName = (name) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/-/g, ' ');
  };

  // Define category-specific questions
  const categoryQuestions = {
    academic: (
      <>
        <div className="form-row">
          <div className="form-group">
            <label>Course / Subject Title *</label>
            <input
              type="text"
              name="courseTitle"
              placeholder="e.g., ITE184 - Social, Legal, and Professional Issues"
              required
            />
          </div>

          <div className="form-group">
            <label>Instructor (Optional)</label>
            <input
              type="text"
              name="instructor"
              placeholder="e.g., Prof. Santos"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Describe your Concern *</label>
          <textarea
            name="concernDescription"
            placeholder="Please describe your concern in detail..."
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label>How has this issue affected your academic experience? *</label>
          <textarea
            name="impactExperience"
            placeholder="Explain how this concern has impacted your studies, performance, or motivation..."
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>How fair or transparent is the grading/evaluation process? *</label>
            <div className="radio-group">
              {["Very Fair", "Fair", "Unfair", "Very Unfair"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="gradingFairness"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Satisfaction with clarity of lessons/course materials? *</label>
            <div className="radio-group">
              {["Very Satisfied", "Satisfied", "Unsatisfied", "Very Unsatisfied"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="lessonSatisfaction"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>How often do you experience academic workload stress? *</label>
          <div className="radio-group-inline">
            {["Rarely", "Sometimes", "Often", "Always"].map((item) => (
              <label className="radio-label" key={item}>
                <input
                  type="radio"
                  name="workloadStress"
                  value={item}
                  required
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I agree to submit this complaint respectfully and understand it will be reviewed by university staff. *</span>
          </label>
        </div>
      </>
    ),

    "faculty-conduct": (
      <>
        <div className="form-group">
          <label>Department / Office Involved *</label>
          <input
            type="text"
            name="departmentOffice"
            placeholder="e.g., College of Engineering / Registrar's Office"
            required
          />
        </div>

        <div className="form-group">
          <label>Describe the incident in detail *</label>
          <textarea
            name="incidentDescription"
            placeholder="Please provide details about the incident..."
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date of Occurrence *</label>
            <input type="date" name="incidentDate" required />
          </div>

          <div className="form-group">
            <label>Frequency of Occurrence *</label>
            <select name="incidentFrequency" required>
              <option value="">Select Frequency</option>
              <option value="once">Once</option>
              <option value="rarely">Rarely</option>
              <option value="sometimes">Sometimes</option>
              <option value="often">Often</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Additional context or witnesses (optional)</label>
          <textarea
            name="additionalContext"
            placeholder="Include any names of witnesses or relevant details (optional)"
            rows="3"
          ></textarea>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>How respectful was the faculty/staff member's behavior? *</label>
            <div className="radio-group">
              {["Very Respectful", "Respectful", "Disrespectful", "Very Disrespectful"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="respectLevel"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>How professionally was your concern handled? *</label>
            <div className="radio-group">
              {["Very Professional", "Professional", "Unprofessional", "Very Unprofessional"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="professionalism"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>How often have you or others experienced similar behavior? *</label>
          <div className="radio-group-inline">
            {["Never", "Rarely", "Sometimes", "Often"].map((item) => (
              <label className="radio-label" key={item}>
                <input
                  type="radio"
                  name="similarBehavior"
                  value={item}
                  required
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I agree to submit this complaint respectfully and understand it will be reviewed by university staff. *</span>
          </label>
        </div>
      </>
    ),

    facilities: (
      <>
        <div className="form-row">
          <div className="form-group">
            <label>Location / Building / Room Number *</label>
            <input
              type="text"
              name="facilityLocation"
              placeholder="e.g., CSM Building, Room 102"
              required
            />
          </div>

          <div className="form-group">
            <label>When was this observed? *</label>
            <input type="datetime-local" name="observedDateTime" required />
          </div>
        </div>

        <div className="form-group">
          <label>Describe the facility issue *</label>
          <textarea
            name="facilityDescription"
            placeholder="Please describe the problem in detail..."
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Satisfaction with facility condition? *</label>
            <div className="radio-group">
              {["Very Satisfied", "Satisfied", "Unsatisfied", "Very Unsatisfied"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="facilitySatisfaction"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>How often do facility issues occur? *</label>
            <div className="radio-group">
              {["Rarely", "Occasionally", "Frequently", "Always"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="facilityFrequency"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>How safe do you feel in this environment? *</label>
          <div className="radio-group-inline">
            {["Very Safe", "Safe", "Unsafe", "Very Unsafe"].map((item) => (
              <label className="radio-label" key={item}>
                <input
                  type="radio"
                  name="facilitySafety"
                  value={item}
                  required
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>


        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I agree to submit this complaint respectfully and understand it will be reviewed by university staff. *</span>
          </label>
        </div>
      </>
    ),

    "administrative-student-services": (
      <>
        <div className="form-row">
          <div className="form-group">
            <label>Office / Service involved *</label>
            <input
              type="text"
              name="officeInvolved"
              placeholder="e.g., Registrar's Office, Guidance Center"
              required
            />
          </div>

          <div className="form-group">
            <label>Date of transaction or encounter *</label>
            <input type="date" name="transactionDate" required />
          </div>
        </div>

        <div className="form-group">
          <label>Describe your concern or feedback *</label>
          <textarea
            name="concernFeedback"
            placeholder="Please describe the issue or feedback in detail..."
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label>Additional notes (optional)</label>
          <textarea
            name="additionalNotes"
            placeholder="Include any other relevant information..."
            rows="3"
          ></textarea>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>How efficient was the service/response? *</label>
            <div className="radio-group">
              {["Very Efficient", "Efficient", "Inefficient", "Very Inefficient"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="serviceEfficiency"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Satisfaction with communication clarity? *</label>
            <div className="radio-group">
              {["Very Satisfied", "Satisfied", "Unsatisfied", "Very Unsatisfied"].map((item) => (
                <label className="radio-label" key={item}>
                  <input
                    type="radio"
                    name="communicationSatisfaction"
                    value={item}
                    required
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>How easy was it to access the service? *</label>
          <div className="radio-group-inline">
            {["Very Easy", "Easy", "Difficult", "Very Difficult"].map((item) => (
              <label className="radio-label" key={item}>
                <input
                  type="radio"
                  name="serviceAccessibility"
                  value={item}
                  required
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I confirm that the information provided is accurate to the best of my knowledge. *</span>
          </label>
        </div>
      </>
    ),

    other: (
      <>
        <div className="form-group">
          <label>Please describe your concern in detail *</label>
          <textarea
            name="otherDescription"
            placeholder="Describe your concern..."
            rows="6"
            required
          ></textarea>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I agree to submit this complaint respectfully and understand it will be reviewed by university staff. *</span>
          </label>
        </div>
      </>
    ),
  };

  return (
    <div id="complaintPage" className="container">
      <SideBar />

      <div className="main-content">
        <MainNavbar />

        <div className="complaint-card">
          <div className="card-header">
            <h2>Do you have a Concern?</h2>
            <p>Please provide detailed information about your complaint.</p>
          </div>

          <div className="alert-warning">
            <strong>Important:</strong> Please be respectful and constructive. Offensive language will be filtered and your submission will be rejected.
          </div>

          <form id="complaintForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Complaint Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select Category</option>
                <option value="academic">Academic</option>
                <option value="faculty-conduct">Faculty Conduct</option>
                <option value="facilities">Facilities</option>
                <option value="administrative-student-services">Administrative/Student Services</option>
                <option value="other">Other</option>
              </select>
            </div>

            {category && categoryQuestions[category]}

            {category && (
              <button type="submit" className="btn-submit">
                Submit Complaint
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Profanity Alert Modal */}
      {showProfanityAlert && (
        <div className="modal-overlay">
          <div className="modal-content profanity-modal">
            <div className="modal-header profanity-header">
              <h3>⚠️ Inappropriate Language Detected</h3>
            </div>

            <div className="modal-body">
              <div className="profanity-message">
                <p>Your submission contains inappropriate or offensive language that violates our community guidelines. Please review and edit the following fields:</p>
              </div>

              <div className="profanity-issues">
                {profanityIssues.map((issue, index) => (
                  <div key={index} className="profanity-item">
                    <strong>{formatFieldName(issue.field)}:</strong>
                    <span className="flagged-words">
                      Contains inappropriate language
                    </span>
                  </div>
                ))}
              </div>

              <div className="profanity-notice">
                <p><strong>Remember:</strong> All complaints should be submitted respectfully and constructively. Offensive language, insults, and vulgar terms are not permitted.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-confirm" onClick={handleCloseProfanityAlert}>
                Edit My Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Review Your Complaint</h3>
            </div>

            <div className="modal-body">
              <div className="summary-section">
                <h4>Complaint Summary</h4>
                <div className="summary-item">
                  <strong>Category:</strong>
                  <span>{getCategoryLabel(complaintData.category || category)}</span>
                </div>
                
                {Object.entries(complaintData).map(([key, value]) => {
                  if (key === 'category' || !value || value === 'on') return null;
                  return (
                    <div className="summary-item" key={key}>
                      <strong>{formatFieldName(key)}:</strong>
                      <span>{value instanceof File ? value.name : value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="warning-message">
                <strong>⚠️ Important Notice:</strong>
                <p>Once you submit this complaint, you will <strong>not be able to modify or delete it</strong>. Please review all information carefully before confirming.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancel}>
                Cancel & Review
              </button>
              <button className="btn-confirm" onClick={handleConfirm}>
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileComplaint;