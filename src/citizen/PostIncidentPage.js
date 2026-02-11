// src/citizen/PostIncidentPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostIncidentPage.css";
import defaultAvatar from "../assets/avatar.jpg";
import bg from "../assets/bg.jpg";

const API_BASE = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";

export default function PostIncidentPage({ posts, setPosts, currentUser, onPostCreated }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIXED: Convert image to Base64 para hindi blob error
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Preview muna
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
      setImageFile(file);
    }
  };

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
      // ML Prediction
      console.log("📡 Calling ML prediction:", `${API_BASE}/predict`);
      
      const mlRes = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description })
      });

      const mlData = await mlRes.json();
      console.log("🤖 ML RESULT:", mlData);

      // ✅ Convert image to Base64 (kung may image)
      let imageBase64 = null;
      if (imageFile) {
        imageBase64 = await convertToBase64(imageFile);
        // Clean up blob URL after conversion
        if (previewImage) {
          URL.revokeObjectURL(previewImage);
        }
      }

      const actualUserName = getActualUserName();

      // Submit to database
      const url = `${API_BASE}/api/reports`;
      console.log("🔗 SUBMIT URL:", url);
      console.log("👤 currentUser:", currentUser);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          incident_type: mlData.category || "Citizen Report",
          description: description,
          location: currentUser?.location || currentUser?.address || null,
          priority: mlData.risk || "Medium"
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

      // ✅ Create new post object with Base64 image
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
        postImage: imageBase64, // ✅ Base64, hindi blob URL!
        alert: false,
        userType: "citizen",
      };

      // Save to localStorage (feed display)
      const existingPosts = JSON.parse(localStorage.getItem("posts")) || [];
      localStorage.setItem("posts", JSON.stringify([newPost, ...existingPosts]));

      // Reset form
      setDescription("");
      setImageFile(null);
      setPreviewImage(null);

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
            disabled={submitting}
          />

          <label htmlFor="image">Attach Photo (Optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={submitting}
          />

          {previewImage && (
            <div style={{ position: "relative", marginTop: "10px" }}>
              <img
                src={previewImage}
                alt="Preview"
                style={{
                  maxHeight: "200px",
                  borderRadius: "10px",
                  width: "100%",
                  objectFit: "contain"
                }}
              />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewImage);
                  setPreviewImage(null);
                  setImageFile(null);
                }}
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  background: "rgba(255,0,0,0.8)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          )}

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