import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ========== EMAIL + PASSWORD (optional, can keep or disable later) ==========
export const doCreateUserWithEmailAndPassword = async (email, password, role = "student") => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        role,
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// ========== EMAIL LOGIN ==========
export const doSignInWithEmailAndPassword = async (email, password, expectedRole) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Optional: role validation for login page
      if (expectedRole && userData.role !== expectedRole) {
        throw new Error(`Please log in from the correct ${expectedRole} login page.`);
      }

      return { ...user, role: userData.role };
    } else {
      throw new Error("User not found in the database");
    }
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};


// ========== GOOGLE LOGIN (with IIT restriction) ==========
export const doSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    hd: "g.msuiit.edu.ph",
    prompt: "select_account",
  });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  if (!user.email.endsWith("@g.msuiit.edu.ph")) {
    await auth.signOut();
    throw new Error("Please use your official MSU-IIT email (g.msuiit.edu.ph).");
  }

  const db = getFirestore();
  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  let role = "student";
  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      email: user.email,
      role,
      createdAt: new Date(),
    });
  } else {
    const userData = userDoc.data();
    if (userData?.role) role = userData.role;
  }

  return { ...user, role };
};

// ========== OTHER FUNCTIONS ==========

export const doSignOut = () => auth.signOut();

export const doPasswordReset = (email) => sendPasswordResetEmail(auth, email);

export const doPasswordChange = (password) => updatePassword(auth.currentUser, password);

export const doSendEmailVerification = () =>
  sendEmailVerification(auth.currentUser, {
    url: `${window.location.origin}/dashboard`,
  });
