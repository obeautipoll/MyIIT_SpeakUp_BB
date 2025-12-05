
import React, { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { Link } from 'react-router-dom';
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase/firebase"; // Correct path


const requiredDomain = "@g.msuiit.edu.ph";


const Register = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  //const [userId, setUserId] = useState(null); 
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const navigate = (path) => {
    console.log("Navigation triggered to:", path);
    // Replace with actual router navigate(path) in production
  };

  const handleGoogleSignIn = async () => {
    if (!isAuthReady || isRegistering) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsRegistering(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Domain check
      if (!user.email || !user.email.endsWith(requiredDomain)) {
        await signOut(auth);
        setErrorMessage(`You must use an institutional email ending with ${requiredDomain}.`);
        return;
      }

      // Firestore write: users collection
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "Student User",
          role: "student",
          registeredAt: new Date().toISOString(),
        },
        { merge: true } // Prevent overwriting if user logs in again
      );

      setSuccessMessage("Registration successful! Redirecting to dashboard...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign-in process cancelled.");
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 md:p-8">
      <div className="flex flex-col md:flex-row max-w-4xl w-full bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Left Side */}
        <div className="md:w-1/2 p-8 md:p-12 text-white bg-[#8B0000] flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold mb-4">SpeakUp</div>
            <div className="text-xl font-light mb-8 opacity-90">
              MSU-IIT Student-Centered Digital Complaint Resolution System
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              Ensures efficient, transparent, and fair handling of student complaints.
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-white border-opacity-30">
            <h3 className="text-2xl font-semibold mb-2">Your Voice Matters!</h3>
            <p className="text-sm opacity-90">
              Registration is exclusive to MSU-IIT students. Use your official Google email.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-center mb-8 text-[#8B0000]">
              Sign Up with Google
            </h2>
            <p className="text-gray-600 mb-6 font-medium">
              Institutional Email Required:{" "}
              <span className="text-[#8B0000] font-bold">{requiredDomain}</span>
            </p>

            {errorMessage && <p className="text-sm text-red-600 font-semibold mb-4">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-green-600 font-semibold mb-4">{successMessage}</p>}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isRegistering || !isAuthReady}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 flex items-center justify-center space-x-3 border-2 border-gray-300
                ${isRegistering || !isAuthReady
                  ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50 text-gray-800 shadow-md"
                }`}
            >
              {/* Google Icon */}
              <svg
                className="w-5 h-5"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M43.611 20.083H42V20H24V28H35.844C34.789 31.42 32.22 34.025 28.71 35.107L28.98 35.341L35.253 40.098L35.485 40.237C39.696 36.657 42.417 31.023 43.611 24.083V20.083Z"
                  fill="#4285F4"
                />
                <path
                  d="M24 44C31.571 44 38.082 41.523 43.611 36.083L35.485 40.237C33.28 41.742 30.638 42.667 27.79 42.667C22.028 42.667 17.067 38.648 15.342 33.723L15.027 33.829L8.68 38.52L8.53 38.654C12.352 42.484 17.886 44 24 44Z"
                  fill="#34A853"
                />
                <path
                  d="M8.53 38.654C7.792 36.568 7.333 34.305 7.333 32C7.333 29.695 7.792 27.432 8.53 25.346L8.583 25.266L2.31 20.575L2.213 20.732C0.77 23.714 0 26.839 0 30C0 33.161 0.77 36.286 2.213 39.268L8.53 38.654Z"
                  fill="#FBBC04"
                />
                <path
                  d="M24 11.333C27.067 11.333 30.077 12.378 32.553 14.654L38.401 8.805C35.035 5.568 29.878 4 24 4C17.886 4 12.352 5.516 8.53 9.346L15.342 14.277C17.067 19.202 22.028 23.221 27.79 23.221C29.695 23.221 31.621 22.84 33.398 22.12L33.684 22.007L35.844 28H43.611C41.765 24.646 38.381 21.905 34.464 20.083H24V11.333Z"
                  fill="#EA4335"
                />
              </svg>
              {isRegistering ? "Connecting..." : "Sign Up with Google"}
            </button>

            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-[#8B0000] font-semibold hover:text-red-700 underline ml-1"
                >
                  Login Here
                </Link>
              </p>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
