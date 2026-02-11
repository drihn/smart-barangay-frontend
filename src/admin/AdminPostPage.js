// src/admin/AdminPostPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../citizen/PostIncidentPage.css"; // reuse same CSS
import bg from "../assets/bg.jpg";

// ✅ FIXED: Use environment variable or Render URL
const API_BASE = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";

export default function AdminPostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };
  
  const handlePost = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      alert("Please write something before posting!");
      return;
    }

    try {
      // ✅ FIXED: Use API_BASE instead of localhost
      console.log("📡 Calling ML prediction:", `${API_BASE}/predict`);
      
      const mlRes = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content, // ✅ Use 'text' not 'description'
        }),
      });

      const mlData = await mlRes.json();
      console.log("🤖 ADMIN ML RESULT:", mlData);

      if (!mlRes.ok) {
        alert("ML prediction failed");
        return;
      }

      const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];

      const newPost = {
        id: Date.now(),
        userName: "Barangay Admin OFFICIAL",
        userType: "admin",
        avatar: "/assets/admin-avatar.png",
        location: "Admin Office",
        phoneNumber: "N/A",
        content,
        category: mlData.category,
        risk_level: mlData.risk_level,
        postImage: imageFile ? URL.createObjectURL(imageFile) : null,
        date: new Date().toLocaleString(),
        alert: mlData.risk_level === "High" || mlData.risk_level === "Extreme",
      };

      localStorage.setItem("posts", JSON.stringify([newPost, ...storedPosts]));

      alert(`✅ Announcement Posted!\n\nCategory: ${mlData.category}\nRisk Level: ${mlData.risk_level}`);
      navigate("/admin-home");

    } catch (err) {
      console.error("❌ ML error:", err);
      alert("Backend not reachable. Make sure backend is running at " + API_BASE);
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
        <h1>Post Announcement</h1>
        <form className="post-incident-form" onSubmit={handlePost}>
          <label htmlFor="description">Announcement Content</label>
          <textarea
            id="description"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter announcement details"
            rows={5}
            required
          />

          <label htmlFor="image">Attach Image (optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
          />

          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              style={{
                marginTop: "10px",
                maxHeight: "200px",
                borderRadius: "10px",
                width: "100%",
                objectFit: "contain"
              }}
            />
          )}

          <div className="post-incident-buttons">
            <button type="submit" className="submit-btn">Post Announcement</button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/admin-home")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}