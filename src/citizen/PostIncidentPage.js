// src/citizen/PostIncidentPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostIncidentPage.css";
import defaultAvatar from "../assets/avatar.jpg";
import bg from "../assets/bg.jpg";

// ✅ FIXED: Use environment variable or Render URL
const API_BASE = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";

export default function PostIncidentPage({ posts, setPosts, currentUser, onPostCreated }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const getActualUserName = () => {
    let name =
      currentUser?.first_name ||
      currentUser?.name ||
      currentUser?.firstName ||
      currentUser?.fullName ||
      "Citizen";

    if (name === "Citizen" && currentUser?.email) {
      const emailName = currentUser.email.split("@")[0];
      name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return name;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) return alert("Please fill in the description!");
    if (!currentUser?.id) return alert("Missing user ID. Please login again.");

    setSubmitting(true);

    try {
      // ✅ FIXED: Use API_BASE instead of localhost
      console.log("📡 Calling ML prediction:", `${API_BASE}/predict`);
      
      const mlRes = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }) // ✅ Use 'text' not 'description'
      });

      const mlData = await mlRes.json();
      console.log("🤖 ML RESULT:", mlData);

      const actualUserName = getActualUserName();

      // ✅ FIXED: Use API_BASE
      const url = `${API_BASE}/api/reports`;
      console.log("🔗 SUBMIT URL:", url);
      console.log("👤 currentUser:", currentUser);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          incident_type: mlData.category || "Citizen Report", // ✅ Use ML category
          description: description,
          location: currentUser?.location || currentUser?.address || null,
          priority: mlData.risk || "Medium" // ✅ Use ML risk
        }),
      });

      const text = await res.text();
      console.log("📥 RAW RESPONSE:", res.status, text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        console.log("❌ SUBMIT FAILED:", res.status, data);
        alert(data.error || `Submit failed (${res.status}). Check console.`);
        return;
      }

      const dbReportId = data.reportId || data.report_id;

      // ✅ Create new post object
      const newPost = {
        id: Date.now(),
        reportId: dbReportId,
        report_id: dbReportId,
        userName: actualUserName,
        userId: currentUser.id,
        location: currentUser?.location || currentUser?.address || "Barangay",
        phoneNumber: currentUser?.phone || currentUser?.phoneNumber || "N/A",
        content: description,
        category: mlData.category || "Unknown",
        risk_level: mlData.risk_level || mlData.risk || "Unknown",
        date: new Date().toLocaleString(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avatar: defaultAvatar,
        postImage: imageFile ? URL.createObjectURL(imageFile) : null,
        alert: false,
        userType: "citizen",
      };

      // Save to localStorage (feed display)
      if (onPostCreated) onPostCreated(newPost);
      else if (setPosts) setPosts([newPost, ...(posts || [])]);

      // reset form
      setDescription("");
      setImageFile(null);

      alert(`✅ Report successfully submitted as ${actualUserName}! (Report ID: ${dbReportId})`);
      navigate("/citizenhomepage");
      
    } catch (err) {
      console.error("🌐 NETWORK ERROR:", err);
      alert(`Network error: ${err.message}. Make sure backend is running at ${API_BASE}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="post-incident-container"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div className="background-overlay" />
      <div className="post-incident-card">
        <h1>File a New Incident Report</h1>

        <div
          style={{
            background: "#e7f3ff",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
            borderLeft: "5px solid #007bff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>👤 Submitting as:</h3>
          <p>
            <strong>Name:</strong> {getActualUserName()}
          </p>
          <p>
            <strong>Location:</strong> {currentUser?.location || currentUser?.address || "Not specified"}
          </p>
          <p>
            <strong>Contact:</strong> {currentUser?.phone || currentUser?.phoneNumber || "Not specified"}
          </p>
          <p>
            <small>This report will be posted under your name</small>
          </p>
        </div>

        <form className="post-incident-form" onSubmit={handleSubmit}>
          <label htmlFor="description">Incident Details *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, when, and where..."
            required
            rows={6}
          />

          <label htmlFor="image">Attach Photo (Optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />

          <div className="post-incident-buttons">
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Submitting..." : "📄 Submit Report"}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/citizenhomepage")}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
