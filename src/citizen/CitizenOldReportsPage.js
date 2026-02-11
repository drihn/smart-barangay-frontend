// src/citizen/CitizenOldReportsPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CitizenOldReportsPage.css";
import bg from "../assets/bg.jpg";
import BurgerMenu from "../components/BurgerMenu";

const API_BASE = "http://localhost:5000";

export default function CitizenOldReportsPage({ posts, currentUser }) {
  const navigate = useNavigate();

  const [dbReports, setDbReports] = useState([]); // DB reports (has response_status/admin_notes)
  const [loading, setLoading] = useState(false);

  // ✅ edit state per reportId
  const [editingId, setEditingId] = useState(null); // reportId currently being edited
  const [editForm, setEditForm] = useState({
    incident_type: "Citizen Report",
    description: "",
    location: "",
  });

  const userId = currentUser?.id;

  // Helper: match DB report to local post
  const getReportId = (post) => post.report_id || post.reportId || post.reportID || null;

  // ✅ Use ID-based filtering (correct)
  const userPosts = useMemo(() => {
    if (!currentUser) return posts || [];
    const uid = currentUser.id;
    return (posts || []).filter((p) => (p.userId ?? p.user_id) === uid);
  }, [posts, currentUser]);

  // Load my reports from DB (includes response_status/admin_notes + incident_type/description/location)
  const loadMyDbReports = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/my/${userId}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("Fetch my reports failed:", data);
        setDbReports([]);
        return;
      }

      setDbReports(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Network error loading reports:", e);
      setDbReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyDbReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Map DB reports by id for quick lookup
  const dbMap = useMemo(() => {
    const m = {};
    (dbReports || []).forEach((r) => {
      m[r.id] = r;
    });
    return m;
  }, [dbReports]);

  const prettyStatus = (s) => {
    if (!s) return "pending";
    return String(s).replace(/_/g, " ");
  };

  // ✅ EDIT: open editor (prefill from DB if exists, else fallback to local post)
  const startEdit = (post) => {
    const reportId = getReportId(post);
    if (!reportId) return alert("This report is not linked to database yet (missing reportId).");

    const db = dbMap[reportId];

    setEditingId(reportId);
    setEditForm({
      incident_type: db?.incident_type || "Citizen Report",
      description: db?.description || post.content || "",
      location: db?.location || post.location || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ incident_type: "Citizen Report", description: "", location: "" });
  };

  // ✅ EDIT: save to DB
  const saveEdit = async () => {
    if (!editingId) return;
    if (!userId) return alert("Missing user_id. Please login again.");
    if (!editForm.description.trim()) return alert("Description is required.");

    try {
      const res = await fetch(`${API_BASE}/api/reports/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          incident_type: editForm.incident_type || "Citizen Report",
          description: editForm.description,
          location: editForm.location || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update report");
        return;
      }

      alert("✅ Report updated!");
      cancelEdit();
      await loadMyDbReports(); // refresh statuses + updated content
    } catch (err) {
      console.error(err);
      alert("Network error while updating report.");
    }
  };

  // ✅ DELETE: delete from DB + remove from localStorage
  const deleteReport = async (post) => {
    const reportId = getReportId(post);
    if (!reportId) return alert("This report is not linked to database yet (missing reportId).");
    if (!userId) return alert("Missing user_id. Please login again.");

    const ok = window.confirm("Delete this report permanently?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }), // required by backend owner-check
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete report");
        return;
      }

      // remove from localStorage feed (so it won’t re-appear)
      const existing = JSON.parse(localStorage.getItem("posts")) || [];
      const cleaned = existing.filter(
        (p) => (p.report_id || p.reportId || p.reportID) !== reportId
      );
      localStorage.setItem("posts", JSON.stringify(cleaned));

      alert("✅ Report deleted!");
      if (editingId === reportId) cancelEdit();
      await loadMyDbReports();
      // optional refresh display list quickly
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Network error while deleting report.");
    }
  };

  return (
    <div className="Citizen-home-container" style={{ backgroundImage: `url(${bg})` }}>
      <div className="background-overlay" />
      <BurgerMenu currentUser={currentUser} />

      <div className="content-wrapper">
        <div className="panel">
          <div className="reports-header">
            <h2 className="recent-posts-label">Old Reports</h2>

            <button className="refresh-btn" onClick={loadMyDbReports} disabled={loading || !userId}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="latest-posts">
            {!currentUser ? (
              <p className="no-posts">Please login first.</p>
            ) : userPosts.length === 0 ? (
              <p className="no-posts">No old reports yet.</p>
            ) : (
              userPosts.map((post) => {
                const reportId = getReportId(post);
                const db = reportId ? dbMap[reportId] : null;

                const status = db?.response_status || "pending";
                const notes = db?.admin_notes || "";

                const isEditing = editingId && reportId && editingId === reportId;

                return (
                  <div key={post.id} className={`post-card ${post.alert ? "alert" : ""}`}>
                    <img
                      src={post.avatar || "https://via.placeholder.com/80"}
                      alt="Avatar"
                      className="post-image"
                    />

                    <div className="post-content">
                      <div className="name-date">
                        <p className="post-name">
                          {post.userName || "Citizen"}
                          <span className="hover-details">
                            Location: {post.location || "-"} | Phone: {post.phoneNumber || "-"}
                            {post.alert && " ⚠️ ALERT"}
                          </span>
                        </p>
                        <span className="post-date">{post.date || "-"}</span>
                      </div>

                      {/* ✅ EDIT MODE */}
                      {isEditing ? (
                        <div className="edit-box">
                          <label className="field-label">Incident Type</label>
                          <input
                            className="edit-input"
                            value={editForm.incident_type}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, incident_type: e.target.value }))
                            }
                            placeholder="e.g. Citizen Report"
                          />

                          <label className="field-label">Description *</label>
                          <textarea
                            className="edit-textarea"
                            rows={4}
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, description: e.target.value }))
                            }
                          />

                          <label className="field-label">Location</label>
                          <input
                            className="edit-input"
                            value={editForm.location}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, location: e.target.value }))
                            }
                            placeholder="Optional location"
                          />

                          <div className="edit-actions">
                            <button className="save-btn" onClick={saveEdit}>
                              💾 Save
                            </button>
                            <button className="cancel-btn" onClick={cancelEdit}>
                              ✖ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{post.content}</p>

                          {post.postImage && (
                            <img
                              src={post.postImage}
                              alt="Post attachment"
                              className="post-attachment"
                            />
                          )}

                          {/* ✅ ACTION BUTTONS (Citizen) */}
                          <div className="post-actions">
                            <button
                              className="edit-btn"
                              onClick={() => startEdit(post)}
                              disabled={!reportId}
                              title={!reportId ? "Missing DB link (reportId)" : "Edit this report"}
                            >
                              ✏️ Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() => deleteReport(post)}
                              disabled={!reportId}
                              title={!reportId ? "Missing DB link (reportId)" : "Delete this report"}
                            >
                              🗑 Delete
                            </button>
                          </div>

                          {/* ✅ Emergency response status */}
                          <div className="citizen-response-box">
                            <div className="citizen-response-top">
                              <p className="citizen-response-title">Emergency Response Status</p>
                              <span className={`status-badge ${status}`}>
                                {prettyStatus(status)}
                              </span>
                            </div>

                            {notes ? (
                              <p className="citizen-notes">
                                <strong>Admin Notes:</strong> {notes}
                              </p>
                            ) : (
                              <p className="citizen-notes">
                                <strong>Admin Notes:</strong> (none yet)
                              </p>
                            )}

                            {!reportId && (
                              <p className="citizen-warning">
                                ⚠️ This report is not linked to the database yet (missing reportId).
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button className="main-btn" onClick={() => navigate("/citizen-home")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
