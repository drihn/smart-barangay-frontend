// src/citizen/CitizenLoginPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CitizenLoginPage.css";

export default function CitizenLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Please enter email and password");
    return;
  }

  setLoading(true);

  try {
    const API_URL = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";
    console.log("🔍 Using API URL:", API_URL);
    
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: email.trim(), 
        password: password.trim() 
      }),
    });

    const data = await response.json();
    console.log("🔍 Full API response:", data);

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Login failed");
    }

    if (!data.user) {
      throw new Error("No user data received from server");
    }

    const user = data.user;
    console.log("🔍 User role:", user.role);

    // ✅ Check if citizen
    if (user.role !== "citizen") {
      throw new Error(`This account is ${user.role}, not citizen. Please use correct login.`);
    }

    // ✅ Check if approved
    if (user.status !== "approve") {
      throw new Error("Your account is still pending approval");
    }

    // ✅ Save to localStorage
    localStorage.setItem("currentUser", JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      email: user.email,
      role: "citizen"
    }));
    
    localStorage.setItem("isLoggedIn", "true");

    alert(`Welcome ${user.first_name}! Login successful.`);
    navigate("/citizenhomepage");

  } catch (err) {
    console.error("❌ Login error:", err);
    setError(err.message);
    alert(`Login failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="citizen-login-container">
      <div className="citizen-login-card">
        <h2>Citizen Login</h2>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form className="citizen-login-form" onSubmit={handleLogin}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <button
            type="submit"
            className="citizen-login-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-links">
          
          <p>
            Admin user?{" "}
            <span 
              onClick={() => navigate("/admin-login")} 
              className="link"
              style={{cursor: 'pointer', color: '#2196F3', textDecoration: 'underline'}}
            >
              Admin Login
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