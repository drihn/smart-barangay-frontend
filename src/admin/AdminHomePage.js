// src/admin/AdminHomePage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminHomePage.css";
import bg from "../assets/bg.jpg";
import BurgerMenu from "../components/BurgerMenu";
import alertAvatar from "../assets/alert.jpg";

export default function AdminHomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  /* ===============================
     FETCH PENDING APPROVAL COUNT
     (COUNT ONLY – NO LIST HERE)
  =============================== */
  const fetchPendingCount = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/pending-users");
      const data = await res.json();

      if (res.ok && data.success) {
        setPendingCount(data.users?.length || 0);
      } else {
        setPendingCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch pending count:", err);
      setPendingCount(0);
    }
  };

  /* ===============================
     FETCH POSTS (LOCAL ONLY FOR NOW)
  =============================== */
  const fetchPosts = () => {
    try {
      const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
      setPosts(storedPosts);
    } catch (err) {
      console.error("Error loading posts:", err);
      setPosts([]);
    }
  };

  /* ===============================
     INITIAL LOAD
  =============================== */
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");

    if (!storedUser) {
      navigate("/admin-login");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);

      fetchPosts();
      fetchPendingCount();
    } catch (err) {
      console.error("Invalid user data:", err);
      navigate("/admin-login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===============================
     LOGOUT
  =============================== */
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "/";
  };

  /* ===============================
     DISPLAY NAME HELPER
  =============================== */
  const getDisplayName = (post) => {
    if (post.userType === "admin") return "🏛️ Barangay Admin";
    return post.userName || "👤 Anonymous";
  };

  /* ===============================
     LOADING STATE
  =============================== */
  if (!currentUser) {
    return (
      <div
        className="admin-home-container"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="background-overlay" />
        <div className="loading-state">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div
      className="admin-home-container"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="background-overlay" />

      {/* Burger Menu */}
      <BurgerMenu currentUser={currentUser} onLogout={handleLogout} />

      <div className="content-wrapper">
        <div className="panel">
          {/* Welcome */}
          <div className="welcome-section">
            <h1>Welcome, {currentUser.first_name}!</h1>
            <p className="welcome-subtitle">
              Barangay Administration Dashboard
            </p>
          </div>

          {/* Action Buttons */}
          <div className="top-buttons">
            <button
              className="main-btn"
              onClick={() => navigate("/admin-post-page")}
            >
              📢 Post Announcement
            </button>

            <button
              className="main-btn"
              onClick={() => navigate("/admin-old-reports")}
            >
              📋 View Reports
            </button>

            {/* ✅ CLEAN LABEL */}
            <button
              className="main-btn pending-btn"
              onClick={() => navigate("/pending-accounts-page")}
            >
              ⏳ Pending Approvals
              {pendingCount > 0 && (
                <span className="pending-count">
                  ({pendingCount})
                </span>
              )}
            </button>
          </div>

          {/* Recent Posts */}
          <h2 className="recent-posts-label">
            📢 Recent Announcements & Reports
          </h2>

          <div className="latest-posts">
            {posts.length === 0 ? (
              <div className="no-posts-message">
                <p>No reports or announcements yet.</p>
              </div>
            ) : (
              posts.slice(0, 5).map((post, index) => {
                const isAdminPost = post.userType === "admin";
                const displayName = getDisplayName(post);

                return (
                  <div
                    key={index}
                    className={`post-card ${
                      post.alert || isAdminPost ? "alert" : ""
                    }`}
                  >
                    <img
                      src={
                        isAdminPost
                          ? alertAvatar
                          : post.avatar || "https://via.placeholder.com/80"
                      }
                      alt="Avatar"
                      className="post-image"
                    />

                    <div className="post-content">
                      <div className="name-date">
                        <p className="post-name">
                          {displayName}
                          {isAdminPost && (
                            <span className="official-badge"> OFFICIAL</span>
                          )}
                          {post.alert && (
                            <span className="alert-badge"> URGENT</span>
                          )}
                        </p>
                        <span className="post-date">
                          {post.date || "-"}
                        </span>
                      </div>

                      <p className="post-text">{post.content}</p>

{post.location && (
  <p className="post-location">
    📍 {post.location}
  </p>
)}

{/* 🤖 ML RESULT (same as citizen) */}
{post.category && post.risk_level && (
  <div className="ml-prediction-box">
    <p className="ml-category">
      📂 Category: <strong>{post.category}</strong>
    </p>
    <p className={`ml-risk ${post.risk_level.toLowerCase()}`}>
      ⚠ Risk Level: <strong>{post.risk_level}</strong>
    </p>
  </div>
)}


                      {post.postImage && (
                        <img
                          src={post.postImage}
                          alt="Attachment"
                          className="post-attachment"
                        />
                      )}

                      <div className="post-footer">
                        <span className="post-type">
                          {isAdminPost
                            ? "📢 Barangay Announcement"
                            : "📝 Citizen Report"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* View All */}
          {posts.length > 5 && (
            <div className="view-all-posts">
              <button onClick={() => navigate("/admin-old-reports")}>
                View All Posts ({posts.length}) →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
