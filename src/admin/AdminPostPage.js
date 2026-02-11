// src/admin/AdminPostPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../citizen/PostIncidentPage.css";
import bg from "../assets/bg.jpg";

const API_BASE = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";

export default function AdminPostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Convert image to Base64 para hindi blob ang i-store
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
      
      // Clean up preview URL on unmount
      return () => URL.revokeObjectURL(previewUrl);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      alert("Please write something before posting!");
      return;
    }

    setLoading(true);

    try {
      // ✅ ML PREDICTION
      const mlRes = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
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

      // ✅ Get existing posts
      const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];

      // ✅ Create new post (with Base64 image)
      const newPost = {
        id: Date.now(),
        userName: "Barangay Admin OFFICIAL",
        userType: "admin",
        avatar: "/assets/admin-avatar.png",
        location: "Admin Office",
        phoneNumber: "N/A",
        content,
        category: mlData.category || "General",
        risk_level: mlData.risk_level || "Medium",
        postImage: imageBase64, // ✅ Base64, hindi blob URL!
        date: new Date().toLocaleString(),
        alert: mlData.risk_level === "High" || mlData.risk_level === "Extreme",
      };

      // ✅ Save to localStorage
      localStorage.setItem("posts", JSON.stringify([newPost, ...storedPosts]));

      // ✅ Clear form
      setContent("");
      setImageFile(null);
      setPreviewImage(null);

      alert(`✅ Announcement Posted!\n\nCategory: ${mlData.category}\nRisk Level: ${mlData.risk_level}`);
      navigate("/admin-home");

    } catch (err) {
      console.error("❌ Error:", err);
      alert("Failed to post announcement. Please try again.");
    } finally {
      setLoading(false);
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
            disabled={loading}
          />

          <label htmlFor="image">Attach Image (optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
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
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Posting..." : "Post Announcement"}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/admin-home")}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}