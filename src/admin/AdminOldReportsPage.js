// src/admin/AdminOldReportsPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminOldReportsPage.css";
import bg from "../assets/bg.jpg";
import BurgerMenu from "../components/BurgerMenu";

// ✅ ADD THIS LINE - API URL Configuration
const API_URL = process.env.REACT_APP_API_URL || "https://ml-backend-8sz5.onrender.com";

export default function AdminOldReportsPage({ posts, currentUser }) {
  const navigate = useNavigate();

  // Admin sees all posts (citizen + admin)
  const allPosts = posts || [];

  // For emergency response status (from DB)
  const adminId = currentUser?.id || 1;
  const [dbReports, setDbReports] = useState({}); // { [reportId]: { response_status, admin_notes, responded_at } }
  const [statusInputs, setStatusInputs] = useState({}); // { [reportId]: { status, notes } }
  const [loadingReports, setLoadingReports] = useState(false);

  // IMPORTANT:
  // For this to work correctly, each citizen report post should have a DB id like:
  // post.report_id (or post.reportId). If not present, it will fallback to post.id.
  const getReportId = (post) => post.report_id || post.reportId || post.id;

  const loadDbReports = async () => {
    setLoadingReports(true);
    try {
      // ✅ FIXED: Use API_URL instead of localhost
      console.log("📡 Loading reports from:", `${API_URL}/api/admin/reports?admin_id=${adminId}`);
      
      const res = await fetch(
        `${API_URL}/api/admin/reports?admin_id=${adminId}`
      );

      // Read as text first (safe even if backend returns HTML on error)
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        console.log("❌ LOAD DB REPORTS FAILED:", res.status, data);
        setDbReports({});
        return;
      }

      const map = {};
      (data || []).forEach((r) => {
        map[r.id] = {
          response_status: r.response_status,
          admin_notes: r.admin_notes,
          responded_at: r.responded_at,
        };
      });

      setDbReports(map);
      console.log("✅ Reports loaded:", Object.keys(map).length);
    } catch (e) {
      console.error("❌ NETWORK ERROR (loadDbReports):", e);
      setDbReports({});
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadDbReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setReportInput = (reportId, patch) => {
    setStatusInputs((prev) => ({
      ...prev,
      [reportId]: {
        status:
          prev[reportId]?.status ??
          dbReports[reportId]?.response_status ??
          "pending",
        notes:
          prev[reportId]?.notes ??
          dbReports[reportId]?.admin_notes ??
          "",
        ...patch,
      },
    }));
  };

  // FULL UPDATED FUNCTION (shows real error instead of generic "not reachable")
  const updateEmergencyStatus = async (reportId) => {
    const status =
      statusInputs[reportId]?.status ??
      dbReports[reportId]?.response_status ??
      "pending";

    const notes =
      statusInputs[reportId]?.notes ??
      dbReports[reportId]?.admin_notes ??
      "";

    try {
      // ✅ FIXED: Use API_URL instead of localhost
      console.log("📡 Updating report:", `${API_URL}/api/admin/reports/${reportId}/status`);
      
      const res = await fetch(
        `${API_URL}/api/admin/reports/${reportId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: adminId,
            response_status: status,
            admin_notes: notes,
          }),
        }
      );

      // Read as text first so even HTML error pages won't crash JSON parsing
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        console.log("❌ UPDATE FAILED:", res.status, data);
        alert(data.error || `Update failed (${res.status}). Check console.`);
        return;
      }

      // Update local DB map immediately
      setDbReports((prev) => ({
        ...prev,
        [reportId]: {
          response_status: status,
          admin_notes: notes,
          responded_at: new Date().toISOString(),
        },
      }));

      alert("✅ Emergency response updated!");
    } catch (e) {
      console.error("❌ NETWORK ERROR (updateEmergencyStatus):", e);
      alert(`Network error: ${e.message}`);
    }
  };

  const getStatus = (reportId) =>
    statusInputs[reportId]?.status ??
    dbReports[reportId]?.response_status ??
    "pending";

  const getNotes = (reportId) =>
    statusInputs[reportId]?.notes ??
    dbReports[reportId]?.admin_notes ??
    "";

  return (
    <div
      className="admin-home-container"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="background-overlay" />
      {currentUser && <BurgerMenu currentUser={currentUser} />}

      <div className="content-wrapper">
        <div className="panel">
          <div className="reports-header">
            <h2 className="recent-posts-label">Old Reports & Announcements</h2>

            <button
              className="refresh-btn"
              onClick={loadDbReports}
              disabled={loadingReports}
              title="Refresh DB reports"
            >
              {loadingReports ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>

          <div className="latest-posts">
            {allPosts.length === 0 ? (
              <p className="no-posts">No reports or announcements yet.</p>
            ) : (
              allPosts.map((post) => {
                const isAdminPost = post.userType === "admin";
                const isCitizenReport = !isAdminPost; // treat non-admin as citizen report
                const reportId = getReportId(post);

                return (
                  <div
                    key={post.id}
                    className={`post-card ${
                      post.alert || isAdminPost ? "alert" : ""
                    }`}
                  >
                    <img
                      src={
                        isAdminPost
                          ? "/assets/alert.png"
                          : post.avatar || "https://via.placeholder.com/80"
                      }
                      alt="Avatar"
                      className="post-image"
                    />

                    <div className="post-content">
                      <div className="name-date">
                        <p className="post-name">
                          {post.userName ||
                            (isAdminPost ? "Admin" : "Anonymous")}
                          <span className="hover-details">
                            Location: {post.location || "-"} | Phone:{" "}
                            {post.phoneNumber || "-"}
                            {post.alert && " ⚠️ ALERT"}
                            {isAdminPost && " 🔔 ADMIN"}
                          </span>
                        </p>
                        <span className="post-date">{post.date || "-"}</span>
                      </div>

                      <p>{post.content}</p>

                      {post.postImage && (
                        <img
                          src={post.postImage}
                          alt="Post attachment"
                          className="post-attachment"
                        />
                      )}

                      {/* ===============================
                          Emergency response (ADMIN ONLY)
                          Show ONLY for Citizen Reports
                         =============================== */}
                      {isCitizenReport && (
                        <div className="response-box">
                          <div className="response-top">
                            <p className="response-title">Emergency Response</p>
                            <span
                              className={`status-badge ${getStatus(reportId)}`}
                            >
                              {getStatus(reportId)}
                            </span>
                          </div>

                          <label className="field-label">Set Status</label>
                          <select
                            className="admin-select"
                            value={getStatus(reportId)}
                            onChange={(e) =>
                              setReportInput(reportId, {
                                status: e.target.value,
                              })
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="responded">Responded</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>

                          <label className="field-label">Admin Notes</label>
                          <textarea
                            className="admin-textarea"
                            rows={3}
                            placeholder="Type emergency response update..."
                            value={getNotes(reportId)}
                            onChange={(e) =>
                              setReportInput(reportId, { notes: e.target.value })
                            }
                          />

                          <button
                            className="update-response-btn"
                            onClick={() => updateEmergencyStatus(reportId)}
                          >
                            Update Response
                          </button>

                          <p className="privacy-note">
                            *Response status is visible only to the citizen who
                            submitted this report.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button className="main-btn" onClick={() => navigate("/admin-home")}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}