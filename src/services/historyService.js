import { db } from "../firebase/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export const fetchComplaintHistory = async (userId) => {
  const q = query(collection(db, "complaintsHistory"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const complaints = [];
  querySnapshot.forEach((doc) => {
    complaints.push({ id: doc.id, ...doc.data() });
  });
  return complaints;
};
