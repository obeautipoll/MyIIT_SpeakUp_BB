import React from "react";

const ComplaintConfirmationModal = ({ isOpen, onClose, onConfirm, complaintData }) => {
  // 1. Add local state for the checkbox
  const [isAgreed, setIsAgreed] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div 
        className="modal-container" 
        role="dialog" // 3. Accessibility role
        aria-modal="true" // 3. Accessibility attribute
      >
        <h2 className="modal-title">Before You Submit</h2>
        <p className="modal-text">
          Please review your complaint carefully before submitting. Once submitted, you will not be able to edit it.
        </p>

        {/* Optional Summary */}
        {complaintData && (
          <div className="complaint-summary">
            <h4>Complaint Summary</h4>
            <ul>
              {/* Other summary items remain the same */}
              {complaintData.category && <li><strong>Category:</strong> {complaintData.category}</li>}
              {complaintData.description && <li><strong>Description:</strong> {complaintData.description}</li>}
              {complaintData.frequency && <li><strong>Frequency:</strong> {complaintData.frequency}</li>}
              {complaintData.impact && <li><strong>Impact:</strong> {complaintData.impact}</li>}
              
              {/* 4. Improved Submission Type check */}
              {Object.prototype.hasOwnProperty.call(complaintData, 'anonymous') && (
                <li>
                  <strong>Submission Type:</strong>{" "}
                  {complaintData.anonymous ? "Anonymous" : "With Personal Details"}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="agreement-box">
          <input 
            type="checkbox" 
            id="agree" 
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)} // 1. Link state
            // Removed 'required' attribute
          />
          <label htmlFor="agree">
            I confirm that this information is accurate to the best of my knowledge. 
            I understand that this complaint will be reviewed by university staff, 
            and I have the option to remain anonymous.
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Review Complaint
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm}
            disabled={!isAgreed} // 1. Disable until agreed
          >
            Confirm and Submit {/* 2. Clearer button label */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintConfirmationModal;