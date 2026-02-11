// src/citizen/RegistrationAuth.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./RegistrationAuth.css";
import bg from "../assets/bg.jpg";

function RegistrationAuth() {
  const navigate = useNavigate();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle registration
  const handleRegistration = async (e) => {
    e.preventDefault();

    // Check passwords match
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ✅ FIX 1: Use correct endpoint (/api/signup)
      // ✅ FIX 2: Use correct field name (first_name, not full_name)
      const res = await api.post("/api/signup", {
        first_name: fullName,  // ✅ Changed from full_name to first_name
        email: email,
        password: password
      });

      console.log("Registration response:", res.data);
      
      // ✅ Show success message
      alert(res.data.message || "Registration successful! Please wait for admin approval.");
      
      // ✅ Redirect to citizen login
      navigate("/citizen-login");

    } catch (err) {
      console.error("Registration error:", err);
      
      // ✅ Better error handling
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          "Cannot connect to server or registration failed";
      
      setError(errorMessage);
      alert(`Registration failed: ${errorMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ backgroundImage: `url(${bg})` }}>
      <div className="auth-card">
        <h2>REGISTER</h2>
        
        {error && (
          <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>
            ⚠️ {error}
          </div>
        )}

        <form className="registration-form" onSubmit={handleRegistration}>
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Enter your full name"
            disabled={loading}
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Create a password"
            disabled={loading}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your password"
            disabled={loading}
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Already have an account?{" "}
            <span 
              onClick={() => navigate("/citizen-login")} 
              className="link"
              style={{cursor: 'pointer', color: '#2196F3', textDecoration: 'underline'}}
            >
              Login
            </span>
          </p>
          
          <p>
            <span 
              onClick={() => navigate("/")} 
              className="link"
              style={{cursor: 'pointer', color: '#666', fontSize: '14px'}}
            >
              ← Back to Home
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegistrationAuth;