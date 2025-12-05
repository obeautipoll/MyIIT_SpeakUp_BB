import { db, storage, auth } from "../firebase/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


const COMPLAINTS_COLLECTION = "complaints";

/**
 * Generate a random 8-digit number (for unique IDs)
 */
const generateRandomId = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * Uploads an attachment file to Firebase Storage (if any)
 */
const uploadAttachment = async (file) => {
  if (!file) return null;
  const storageRef = ref(storage, `complaint_attachments/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

/**
 * Submit complaint document to Firestore
 */


export const submitComplaint = async (complaintData, file = null) => {
  try {
    const user = auth.currentUser;
    const fileUrl = await uploadAttachment(file);

    // Basic structure shared across all categories
    let baseComplaint = {
      userId: user ? user.uid : "anonymous",
      userEmail: user ? user.email : "guest",
      category: complaintData.category,
      status: "Pending",
      submissionDate: serverTimestamp(),
    };

    let customIdPrefix = "";
    let complaintDoc = {};

    // 🧩 CATEGORY 1 — Academic
    if (complaintData.category === "academic") {
  customIdPrefix = "Academic";
  complaintDoc = {
    ...baseComplaint,
    courseTitle: complaintData.courseTitle || "",
    instructor: complaintData.instructor || "",
    concernDescription: complaintData.concernDescription || "",
    impactExperience: complaintData.impactExperience || "",
    gradingFairness: complaintData.gradingFairness || "",
    lessonSatisfaction: complaintData.lessonSatisfaction || "",
    workloadStress: complaintData.workloadStress || "",
    attachmentURL: fileUrl || null,  // ✅ THIS LINE stores the uploaded proof file link
    agreement: complaintData.agreement || true,
  };
}

    // 🧩 CATEGORY 2 — Faculty Conduct
    else if (complaintData.category === "faculty-conduct") {
      customIdPrefix = "Faculty";
      complaintDoc = {
        ...baseComplaint,
        departmentOffice: complaintData.departmentOffice || "",
        incidentDescription: complaintData.incidentDescription || "",
        incidentDate: complaintData.incidentDate || null,
        incidentFrequency: complaintData.incidentFrequency || "",
        additionalContext: complaintData.additionalContext || "",
        respectLevel: complaintData.respectLevel || "",
        professionalism: complaintData.professionalism || "",
        similarBehavior: complaintData.similarBehavior || "",
        attachmentURL: fileUrl || null,
        agreement: complaintData.agreement || true,
      };
    }

    // 🧩 CATEGORY 3 — Facilities
    else if (complaintData.category === "facilities") {
      customIdPrefix = "Facilities";
      complaintDoc = {
        ...baseComplaint,
        facilityLocation: complaintData.facilityLocation || "",
        observedDateTime: complaintData.observedDateTime || null,
        facilityDescription: complaintData.facilityDescription || "",
        facilitySatisfaction: complaintData.facilitySatisfaction || "",
        facilityFrequency: complaintData.facilityFrequency || "",
        facilitySafety: complaintData.facilitySafety || "",
        attachmentURL: fileUrl || null,
        agreement: complaintData.agreement || true,
      };
    }

    // 🧩 CATEGORY 4 — Administrative / Student Services
    else if (complaintData.category === "administrative-student-services") {
      customIdPrefix = "AdminServices";
      complaintDoc = {
        ...baseComplaint,
        officeInvolved: complaintData.officeInvolved || "",
        transactionDate: complaintData.transactionDate || null,
        concernFeedback: complaintData.concernFeedback || "",
        additionalNotes: complaintData.additionalNotes || "",
        serviceEfficiency: complaintData.serviceEfficiency || "",
        communicationSatisfaction: complaintData.communicationSatisfaction || "",
        serviceAccessibility: complaintData.serviceAccessibility || "",
        confirmation: complaintData.confirmation || false,
      };
    }

    // 🧩 CATEGORY 5 — Other
    else if (complaintData.category === "other") {
      customIdPrefix = "Other";
      complaintDoc = {
        ...baseComplaint,
        otherDescription: complaintData.otherDescription || "",
        agreement: complaintData.agreement || true,
        attachmentURL: fileUrl || null,
      };
    }

    // Fallback in case of unrecognized category
    else {
      const docRef = await addDoc(collection(db, COMPLAINTS_COLLECTION), {
        ...baseComplaint,
        attachmentURL: fileUrl || null,
      });
      console.log("⚠️ Unknown category. Saved with auto ID:", docRef.id);
      return { success: true, id: docRef.id };
    }

    // ✅ Create custom ID and upload document
    const customId = `${customIdPrefix}${generateRandomId()}`;
    const docRef = doc(db, COMPLAINTS_COLLECTION, customId);
    await setDoc(docRef, complaintDoc);

    //add
    await setDoc(doc(db, "complaintsHistory", customId), {
        ...complaintDoc,
        originalComplaintId: customId,
        historyCreated: serverTimestamp(),
        });


    console.log(`✅ Complaint (${complaintData.category}) submitted with ID:`, customId);
    return { success: true, id: customId };

  } catch (error) {
    console.error("❌ Error submitting complaint:", error);
    throw new Error("Failed to submit complaint");
  }
};

//


