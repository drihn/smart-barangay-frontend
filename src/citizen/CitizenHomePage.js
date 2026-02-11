import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CitizenHomePage.css";
import bg from "../assets/bg.jpg";
import defaultAvatar from "../assets/avatar.jpg";
import alertAvatar from "../assets/alert.jpg";
import BurgerMenu from "../components/BurgerMenu";

const API_BASE = "http://localhost:5000";

export default function CitizenHomePage({ posts = [], currentUser: propUser, onLogout }) {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [filteredPosts, setFilteredPosts] = useState([]);

  // ✅ edit state for homepage
  const [editingReportId, setEditingReportId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ✅ load combined posts from localStorage (so deletions reflect)
  const loadPostsFromStorage = () => {
    const citizenPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const adminPosts = JSON.parse(localStorage.getItem("adminPosts")) || [];
    const combined = [...citizenPosts, ...adminPosts];

    combined.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(a.id || 0);
      const db = b.date ? new Date(b.date) : new Date(b.id || 0);
      return db - da;
    });

    return combined;
  };

  // Get current user
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const userRole = parsed.role || parsed.userType || "citizen";

        if (userRole === "admin") {
          navigate("/admin-home");
          return;
        }

        const citizenUser = {
          name: parsed.first_name || parsed.name || "Citizen",
          first_name: parsed.first_name || parsed.name || "Citizen",
          fullName: parsed.full_name || parsed.first_name || parsed.name || "Citizen",
          email: parsed.email || "",
          location: parsed.location || parsed.address || "",
          phone: parsed.phone || parsed.phoneNumber || "",
          avatar: parsed.avatar || defaultAvatar,
          role: userRole,
          id: parsed.id,
          ...parsed,
        };

        setLoggedInUser(citizenUser);
        setDebugInfo(`✅ Logged in as: ${citizenUser.first_name}`);
      } catch (error) {
        console.error("Error parsing user:", error);
        navigate("/citizen-login");
      }
    } else if (propUser) {
      setLoggedInUser(propUser);
      setDebugInfo(`✅ Using prop user: ${propUser.first_name}`);
    } else {
      navigate("/citizen-login");
    }
  }, [navigate, propUser]);

  // ✅ build UI list from storage, not props
  const rebuildFeed = () => {
    const combined = loadPostsFromStorage();

    const postsWithoutIds = combined.map((post, index) => ({
      ...post,
      displayId: `post-${index + 1}`,
      cleanUserName: post.userName
        ? post.userName.replace(/\(ID: \d+\)/, "").trim()
        : post.userName,
    }));

    setFilteredPosts(postsWithoutIds);
  };

  useEffect(() => {
    rebuildFeed();

    const handler = () => rebuildFeed();
    window.addEventListener("postsUpdated", handler);

    const storageHandler = () => rebuildFeed();
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener("postsUpdated", handler);
      window.removeEventListener("storage", storageHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getReportId = (post) => post.report_id || post.reportId || post.reportID || null;

  // ✅ detect if this post is mine
  const isMyPost = (post) => {
    if (!loggedInUser?.id) return false;
    const uid = loggedInUser.id;
    return (post.userId ?? post.user_id) === uid;
  };

  // Function to get display name
  const getPostDisplayName = (post) => {
    if (post.userType === "admin" || post.userName === "Admin") return "🏛️ Barangay Admin";

    if (!post.userName || post.userName === "No Name") {
      return isMyPost(post) ? "👤 You" : "👤 Anonymous";
    }

    const cleanUserName = post.cleanUserName || post.userName;
    return isMyPost(post) ? "👤 You" : `👤 ${cleanUserName}`;
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("isLoggedIn");
      window.location.href = "/";
    }
  };

  // ✅ WORKING DELETE (DB + localStorage + refresh)
  const handleDeleteFromHome = async (post) => {
    const reportId = getReportId(post);
    if (!reportId) return alert("Missing reportId (not linked to DB).");
    if (!loggedInUser?.id) return alert("Missing user ID. Login again.");

    if (!window.confirm("Delete your report?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: loggedInUser.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete report");
        return;
      }

      // remove from localStorage
      const existing = JSON.parse(localStorage.getItem("posts")) || [];
      const cleaned = existing.filter(
        (p) => Number(p.report_id || p.reportId || p.reportID) !== Number(reportId)
      );
      localStorage.setItem("posts", JSON.stringify(cleaned));

      // exit edit mode if deleting same
      if (editingReportId === reportId) {
        setEditingReportId(null);
        setEditText("");
        setEditLocation("");
      }

      window.dispatchEvent(new Event("postsUpdated"));
      rebuildFeed();
      alert("✅ Deleted!");
    } catch (err) {
      console.error(err);
      alert("Network error while deleting.");
    }
  };

  // ✅ start edit on homepage
  const startEditFromHome = (post) => {
    const reportId = getReportId(post);
    if (!reportId) return alert("Missing reportId. Not linked to DB yet.");

    setEditingReportId(reportId);
    setEditText(post.content || "");
    setEditLocation(post.location || "");
  };

  const cancelEditFromHome = () => {
    setEditingReportId(null);
    setEditText("");
    setEditLocation("");
  };

  // ✅ save edit on homepage (DB + localStorage + refresh)
  const saveEditFromHome = async () => {
    if (!editingReportId) return;
    if (!loggedInUser?.id) return alert("Missing user ID. Login again.");
    if (!editText.trim()) return alert("Description is required.");

    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${editingReportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loggedInUser.id,
          incident_type: "Citizen Report",
          description: editText,
          location: editLocation || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update report");
        return;
      }

      // update localStorage post content + location
      const existing = JSON.parse(localStorage.getItem("posts")) || [];
      const updated = existing.map((p) => {
        const rid = p.report_id || p.reportId || p.reportID;
        if (Number(rid) === Number(editingReportId)) {
          return { ...p, content: editText, location: editLocation || p.location };
        }
        return p;
      });
      localStorage.setItem("posts", JSON.stringify(updated));

      alert("✅ Updated!");
      cancelEditFromHome();
      window.dispatchEvent(new Event("postsUpdated"));
      rebuildFeed();
    } catch (err) {
      console.error(err);
      alert("Network error while saving edit.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (!loggedInUser) {
    return (
      <div className="Citizen-home-container" style={{ backgroundImage: `url(${bg})` }}>
        <div className="background-overlay" />
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  const adminPosts = filteredPosts.filter((p) => p.userType === "admin" || p.userName === "Admin");
  const citizenPosts = filteredPosts.filter((p) => !(p.userType === "admin" || p.userName === "Admin"));

  return (
    <div className="Citizen-home-container" style={{ backgroundImage: `url(${bg})` }}>
      <div className="background-overlay" />

      <BurgerMenu currentUser={loggedInUser} onProfileClick={() => setShowProfileModal(true)} />

      <div className="content-wrapper">
        <div className="panel">
          <div className="welcome-section">
            <h1>Welcome, {loggedInUser.first_name}!</h1>
            <p className="welcome-subtitle">Barangay reporting and announcement system</p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div
              style={{
                background: "#e9ecef",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "2px solid #6c757d",
                fontFamily: "monospace",
              }}
            >
              <h4 style={{ marginTop: 0 }}>🔍 DEBUG INFORMATION</h4>
              <p><strong>Current User:</strong> {loggedInUser.first_name}</p>
              <p>
                <strong>Posts Count:</strong> Total: {filteredPosts.length} | Admin: {adminPosts.length} | Citizen:{" "}
                {citizenPosts.length}
              </p>
              <p><strong>Status:</strong> {debugInfo}</p>
            </div>
          )}

          <div className="top-buttons">
            <button className="main-btn" onClick={() => navigate("/post-incident")}>
              📄 FILE A REPORT
            </button>
            <button className="main-btn" onClick={() => navigate("/citizen-old-reports")}>
              📋 MY REPORTS
            </button>
          </div>

          <h2 className="recent-posts-label">📢 Recent Announcements & Reports</h2>

          {filteredPosts.length === 0 ? (
            <div className="empty-posts">
              <p>📭 No reports or announcements yet.</p>
              <p><small>Be the first to post a report!</small></p>
            </div>
          ) : (
            <div className="latest-posts">
              {filteredPosts.map((post, index) => {
                const isAdminPost = post.userType === "admin" || post.userName === "Admin";
                const displayName = getPostDisplayName(post);
                const reportId = getReportId(post);
                const mine = !isAdminPost && isMyPost(post);
                const editingThis = editingReportId && reportId && editingReportId === reportId;

                return (
                  <div key={post.id || index} className={`post-card ${post.alert || isAdminPost ? "alert" : ""}`}>
                    <img
                      src={isAdminPost ? alertAvatar : post.avatar || defaultAvatar}
                      alt="Avatar"
                      className="post-image"
                    />
                    <div className="post-content">
                      <div className="name-date">
                        <p className="post-name">
                          {displayName}
                          {isAdminPost && <span className="official-badge"> OFFICIAL</span>}
                          {post.alert && <span className="alert-badge"> URGENT</span>}
                        </p>
                        <span className="post-date">{post.date || "Recently"}</span>
                      </div>

                      {post.title && <h4 className="post-title">{post.title}</h4>}

                      {/* ✅ EDIT MODE ON HOMEPAGE */}
                      {editingThis ? (
                        <div className="edit-box">
                          <label className="field-label">Description *</label>
                          <textarea
                            className="edit-textarea"
                            rows={4}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />

                          <label className="field-label">Location</label>
                          <input
                            className="edit-input"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                          />

                          <div className="edit-actions">
                            <button className="save-btn" onClick={saveEditFromHome} disabled={savingEdit}>
                              {savingEdit ? "Saving..." : "💾 Save"}
                            </button>
                            <button className="cancel-btn" onClick={cancelEditFromHome} disabled={savingEdit}>
                              ✖ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="post-content-text">{post.content || ""}</p>
{post.location && <p className="post-location">📍 {post.location}</p>}

{/* 🤖 ML PREDICTION RESULT */}
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
                            <img src={post.postImage} alt="Post attachment" className="post-attachment" />
                          )}
                        </>
                      )}

                      <div className="post-footer">
                        <span className="post-type">
                          {isAdminPost ? "📢 Barangay Announcement" : "📝 Citizen Report"}
                        </span>

                        {/* ✅ show Edit/Delete ONLY for my own citizen posts */}
                        {mine && !editingThis && (
                          <div className="post-actions">
                            <button className="edit-btn" onClick={() => startEditFromHome(post)} disabled={!reportId}>
                              ✏️ Edit
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteFromHome(post)} disabled={!reportId}>
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-container">
              <img src={loggedInUser.avatar} alt="Avatar" className="profile-avatar" />
            </div>

            <div className="profile-info">
              <h3>{loggedInUser.fullName}</h3>
              <p><strong>Account Type:</strong> Citizen</p>
              <p><strong>Email:</strong> {loggedInUser.email}</p>
              <p><strong>Location:</strong> {loggedInUser.location}</p>
              <p><strong>Contact:</strong> {loggedInUser.phone}</p>

              <div className="profile-buttons">
                <button onClick={() => navigate("/edit-profile")}>✏️ Edit Profile</button>
                <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
