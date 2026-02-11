import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUpButton.css";
import bg from "../assets/bg.jpg";

function SignUpButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSelect = (role) => {
    setOpen(false);
    if (role === "admin") {
      navigate("/admin-login");
    } else {
      navigate("/citizen-login");
    }
  };

  return (
    <div className="signup-container" style={{ backgroundImage: `url(${bg})` }}>
      {/* Role dropdown */}
      <div className="role-dropdown">
        <div className="dropdown-icon" onClick={() => setOpen(!open)}>
          👤
        </div>
        {open && (
          <div className="dropdown-list">
            <div className="dropdown-item" onClick={() => handleSelect("citizen")}>
              Citizen
            </div>
            <div className="dropdown-item" onClick={() => handleSelect("admin")}>
              Admin
            </div>
          </div>
        )}
      </div>

      <div className="signup-card">
        <h1>Welcome to Smart Barangay</h1>
        <p>AI-Based Risk Assessment & Emergency Response</p>

        {/* Button Stack */}
        <div className="button-group">
          {/* SIGN IN (TOP / PRIMARY) */}
          <button
            className="signin-btn"
            onClick={() => navigate("/citizen-login")}
          >
            SIGN IN
          </button>

          {/* SIGN UP (BOTTOM / SECONDARY) */}
          <button
            className="signup-btn"
            onClick={() => navigate("/register")}
          >
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUpButton;
