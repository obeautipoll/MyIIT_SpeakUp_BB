import Complaint from "../speakup-backend/models/Complaint.js";

export const submitComplaint = async (req, res) => {
  try {
    const complaint = new Complaint(req.body);
    await complaint.save();
    res.status(201).json({ message: "Complaint submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
