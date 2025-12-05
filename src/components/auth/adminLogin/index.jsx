import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { doSignInWithEmailAndPassword } from "../../../firebase/auth"; // Firebase email login
import { useAuth } from "../../../contexts/authContext";

const ROLE_ROUTE_MAP = {
  admin: "/adashboard",
  staff: "/sdashboard",
  kasama: "/sdashboard",
};

const resolveRouteByRole = (role) => ROLE_ROUTE_MAP[role?.toLowerCase()] || "/adminlogin";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { userLoggedIn } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if already logged in
  if (userLoggedIn) {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    return <Navigate to={resolveRouteByRole(storedUser?.role)} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSigningIn(true);

    try {
      const user = await doSignInWithEmailAndPassword(formData.email, formData.password);

      // Prevent students from logging in here
      if (user.role.toLowerCase() === "student") {
        setErrorMessage("Students must log in from the student login page.");
        setIsSigningIn(false);
        return;
      }

      // Store user info and token
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", "mockToken123"); // Replace with actual token if needed

      navigate(resolveRouteByRole(user.role));
    } catch (err) {
      console.error("Admin login error:", err);
      setErrorMessage("Invalid email or password.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-8 font-inter">
      <div className="flex flex-col md:flex-row max-w-4xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden">

        {/* Left Side */}
        <div className="md:w-1/2 p-8 md:p-12 text-white bg-[#8B0000] flex flex-col justify-center">
          <h2 className="text-4xl font-extrabold mb-4">Admin / Staff Login</h2>
          <p className="text-sm opacity-90">
            Use your admin or staff credentials to access the dashboard.
          </p>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <form className="w-full max-w-sm mx-auto" onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition duration-150"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition duration-150"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600 font-semibold mb-4">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={isSigningIn}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200
                ${isSigningIn
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#8B0000] text-white hover:bg-red-800 shadow-md"
                }`}
            >
              {isSigningIn ? "Signing In..." : "Login"}
            </button>

            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm">
                Need student login?{" "}
                <Link
                  to="/login"
                  className="text-sm font-semibold ml-1 hover:underline"
                  style={{ color: "#8B0000" }}
                >
                  Login Here
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
