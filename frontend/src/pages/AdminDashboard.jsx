import { useState, useEffect, useCallback } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import api from "../services/api";
import {
  Heart,
  ShieldCheck,
  Users,
  UserCheck,
  Clock,
  Droplet,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  // Admin user state (lazy initialization)
  const [currentUser] = useState(() => {
    try {
      const stored =
        localStorage.getItem("lifelink_user") ||
        sessionStorage.getItem("lifelink_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Stats state
  const [stats, setStats] = useState({
    total_users: 0,
    total_donors: 0,
    pending_donors: 0,
    verified_donors: 0,
    rejected_donors: 0,
    total_requests: 0,
  });

  // Donors state & filter
  const [donors, setDonors] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "verified", "rejected", "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    donor: null,
    action: "", // "verify" or "reject"
    adminNotes: "",
  });

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get("/admin/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    }
  }, []);

  // Fetch Donors by tab
  const fetchDonors = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeTab !== "all") {
        params.status = activeTab;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await api.get("/admin/donors", { params });
      if (response.data.success) {
        setDonors(response.data.donors || []);
      }
    } catch (err) {
      console.error("Failed to load donors:", err);
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to load donors list.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Initial and reactive load
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const params = {};
        if (activeTab !== "all") {
          params.status = activeTab;
        }
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const [statsRes, donorsRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/donors", { params }),
        ]);

        if (isMounted) {
          if (statsRes.data.success) {
            setStats(statsRes.data.stats);
          }
          if (donorsRes.data.success) {
            setDonors(donorsRes.data.donors || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load admin data:", err);
          setFeedback({
            type: "error",
            message: err.response?.data?.message || "Failed to load admin data.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, searchQuery]);

  // Open confirmation modal
  const handleOpenConfirm = (donor, action) => {
    setConfirmModal({
      isOpen: true,
      donor,
      action,
      adminNotes: "",
    });
  };

  // Close confirmation modal
  const handleCloseConfirm = () => {
    setConfirmModal({
      isOpen: false,
      donor: null,
      action: "",
      adminNotes: "",
    });
  };

  // Execute verification update
  const handleExecuteVerification = async () => {
    if (!confirmModal.donor || !confirmModal.action) return;

    try {
      setActionLoading(true);
      const donorId = confirmModal.donor.donor_id;
      const status = confirmModal.action === "verify" ? "verified" : "rejected";

      const response = await api.patch(`/admin/donors/${donorId}/verify`, {
        status,
        admin_notes: confirmModal.adminNotes.trim(),
      });

      if (response.data.success) {
        setFeedback({
          type: "success",
          message: `Donor "${confirmModal.donor.full_name}" has been successfully ${status === "verified" ? "approved" : "rejected"}.`,
        });
        handleCloseConfirm();
        // Immediately refresh list and stats
        await Promise.all([fetchStats(), fetchDonors()]);
      }
    } catch (err) {
      console.error("Verification update error:", err);
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update donor status.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("lifelink_token");
    localStorage.removeItem("lifelink_user");
    sessionStorage.removeItem("lifelink_token");
    sessionStorage.removeItem("lifelink_user");
    navigate("/login");
  };

  return (
    <div className="admin-page">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>
            <Heart fill="white" />
          </span>
          <div className="admin-logo-text">
            LifeLink
            <small>Admin Portal</small>
          </div>
        </div>

        <p className="sidebar-heading">ADMIN MENU</p>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <Clock size={19} />
            Pending Donors
            {stats.pending_donors > 0 && (
              <span className="admin-nav-badge">{stats.pending_donors}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "verified" ? "active" : ""}`}
            onClick={() => setActiveTab("verified")}
          >
            <UserCheck size={19} />
            Verified Donors
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "rejected" ? "active" : ""}`}
            onClick={() => setActiveTab("rejected")}
          >
            <XCircle size={19} />
            Rejected Donors
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <Users size={19} />
            All Donors
          </button>
        </nav>

        <p className="sidebar-heading" style={{ marginTop: "24px" }}>
          COMMUNITY VIEWS
        </p>
        <nav className="sidebar-nav">
          <NavLink to="/find-donors" className="admin-nav-item">
            <Search size={19} />
            Public Donor Search
          </NavLink>
          <NavLink to="/blood-requests" className="admin-nav-item">
            <Droplet size={19} />
            Blood Requests
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout} className="admin-logout-btn">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main">
        {/* TOP BAR */}
        <header className="admin-topbar">
          <div>
            <h1>LifeLink Administration</h1>
            <p className="admin-subhead">
              Verify donor registrations, ensure community safety, and manage records.
            </p>
          </div>

          <div className="admin-user-pill">
            <div className="admin-user-avatar">
              <ShieldCheck size={22} color="#fa465b" />
            </div>
            <div className="admin-user-details">
              <strong>{currentUser?.full_name || "Administrator"}</strong>
              <span className="admin-role-badge">System Admin</span>
            </div>
          </div>
        </header>

        {/* FEEDBACK TOAST BANNER */}
        {feedback.message && (
          <div className={`admin-feedback-banner ${feedback.type}`}>
            {feedback.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback({ type: "", message: "" })}
              aria-label="Dismiss feedback"
              className="admin-feedback-dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* METRICS / STATS CARDS */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="stat-card-icon icon-users">
              <Users size={24} />
            </div>
            <div className="stat-card-data">
              <span className="stat-number">{stats.total_users}</span>
              <span className="stat-title">Total Users</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon icon-donors">
              <UserCheck size={24} />
            </div>
            <div className="stat-card-data">
              <span className="stat-number">{stats.total_donors}</span>
              <span className="stat-title">Registered Donors</span>
            </div>
          </div>

          <div className="admin-stat-card stat-pending-highlight">
            <div className="stat-card-icon icon-pending">
              <Clock size={24} />
            </div>
            <div className="stat-card-data">
              <span className="stat-number">{stats.pending_donors}</span>
              <span className="stat-title">Pending Approvals</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon icon-verified">
              <ShieldCheck size={24} />
            </div>
            <div className="stat-card-data">
              <span className="stat-number">{stats.verified_donors}</span>
              <span className="stat-title">Verified Donors</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon icon-requests">
              <Droplet size={24} />
            </div>
            <div className="stat-card-data">
              <span className="stat-number">{stats.total_requests}</span>
              <span className="stat-title">Blood Requests</span>
            </div>
          </div>
        </section>

        {/* DONOR MANAGEMENT CONTROLS */}
        <section className="admin-management-card">
          <div className="management-card-header">
            <div className="tab-buttons-container">
              <button
                className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending Review
                {stats.pending_donors > 0 && (
                  <span className="tab-badge">{stats.pending_donors}</span>
                )}
              </button>
              <button
                className={`tab-btn ${activeTab === "verified" ? "active" : ""}`}
                onClick={() => setActiveTab("verified")}
              >
                Verified Donors
              </button>
              <button
                className={`tab-btn ${activeTab === "rejected" ? "active" : ""}`}
                onClick={() => setActiveTab("rejected")}
              >
                Rejected
              </button>
              <button
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Donors ({stats.total_donors})
              </button>
            </div>

            <div className="management-actions-container">
              <div className="search-input-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search by name, city, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                onClick={() => {
                  fetchStats();
                  fetchDonors();
                }}
                className="admin-refresh-btn"
                title="Refresh donor list"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* DONOR LIST CONTENT */}
          <div className="donor-list-container">
            {loading ? (
              <div className="admin-loading-state">
                <div className="admin-spinner"></div>
                <p>Loading donor profiles from database...</p>
              </div>
            ) : donors.length === 0 ? (
              <div className="admin-empty-state">
                <FileText size={48} strokeWidth={1.5} color="#9aa0b4" />
                <h3>No donors found</h3>
                <p>
                  {activeTab === "pending"
                    ? "Great news! There are no donor profiles pending review right now."
                    : activeTab === "rejected"
                    ? "No rejected donor profiles found."
                    : "No donors match your selected filter criteria."}
                </p>
              </div>
            ) : (
              <div className="donor-cards-grid">
                {donors.map((donor) => {
                  const statusClass =
                    donor.verification_status === "verified"
                      ? "badge-verified"
                      : donor.verification_status === "rejected"
                      ? "badge-rejected"
                      : "badge-pending";

                  const birthDate = donor.date_of_birth ? new Date(donor.date_of_birth) : null;
                  const calculatedAge = birthDate
                    ? Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
                    : donor.age || "N/A";

                  return (
                    <div key={donor.donor_id} className="admin-donor-card">
                      <div className="card-donor-top">
                        <div className="donor-avatar-blood">
                          <span className="blood-badge-lg">{donor.blood_group}</span>
                        </div>
                        <div className="donor-identity">
                          <h3>{donor.full_name}</h3>
                          <span className="donor-user-id">
                            User ID: #{donor.user_id} · Donor ID: #{donor.donor_id}
                          </span>
                        </div>
                        <span className={`verification-status-pill ${statusClass}`}>
                          {donor.verification_status.toUpperCase()}
                        </span>
                      </div>

                      <div className="card-donor-details">
                        <div className="donor-detail-item">
                          <MapPin size={16} />
                          <span>
                            {donor.city}, {donor.state}
                          </span>
                        </div>

                        <div className="donor-detail-item">
                          <Mail size={16} />
                          <span>{donor.email}</span>
                        </div>

                        <div className="donor-detail-item">
                          <Phone size={16} />
                          <span>{donor.phone || "Not provided"}</span>
                        </div>

                        <div className="donor-detail-item">
                          <Calendar size={16} />
                          <span>Age: {calculatedAge} years</span>
                        </div>

                        <div className="donor-detail-item">
                          <Clock size={16} />
                          <span>
                            Last Donated:{" "}
                            {donor.last_donation_date
                              ? new Date(donor.last_donation_date).toLocaleDateString()
                              : "Never / First Time"}
                          </span>
                        </div>

                        <div className="donor-detail-item">
                          <ShieldCheck size={16} />
                          <span>
                            Availability:{" "}
                            <strong
                              style={{
                                color: donor.is_available ? "#10b981" : "#fa465b",
                              }}
                            >
                              {donor.is_available ? "Available" : "Unavailable"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="card-donor-actions">
                        {donor.verification_status === "pending" && (
                          <>
                            <button
                              className="btn-admin-action btn-approve"
                              onClick={() => handleOpenConfirm(donor, "verify")}
                            >
                              <Check size={17} /> Approve
                            </button>
                            <button
                              className="btn-admin-action btn-reject"
                              onClick={() => handleOpenConfirm(donor, "reject")}
                            >
                              <X size={17} /> Reject
                            </button>
                          </>
                        )}

                        {donor.verification_status === "rejected" && (
                          <button
                            className="btn-admin-action btn-reconsider"
                            onClick={() => handleOpenConfirm(donor, "verify")}
                          >
                            <RotateCcw size={17} /> Re-evaluate & Approve
                          </button>
                        )}

                        {donor.verification_status === "verified" && (
                          <button
                            className="btn-admin-action btn-revoke"
                            onClick={() => handleOpenConfirm(donor, "reject")}
                          >
                            <AlertTriangle size={17} /> Revoke / Reject
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <div className="modal-header">
              <div
                className={`modal-icon-circle ${confirmModal.action === "verify" ? "icon-approve" : "icon-reject"}`}
              >
                {confirmModal.action === "verify" ? (
                  <CheckCircle size={28} />
                ) : (
                  <AlertTriangle size={28} />
                )}
              </div>
              <div>
                <h2>
                  {confirmModal.action === "verify"
                    ? "Confirm Donor Approval"
                    : "Confirm Donor Rejection"}
                </h2>
                <p>
                  {confirmModal.action === "verify"
                    ? "Approving this donor will allow them to appear in public searches and respond to emergency blood requests."
                    : "Rejecting this donor will restrict their profile from matching public blood requests."}
                </p>
              </div>
            </div>

            <div className="modal-donor-summary">
              <div className="modal-donor-row">
                <span>Donor Name:</span>
                <strong>{confirmModal.donor?.full_name}</strong>
              </div>
              <div className="modal-donor-row">
                <span>Blood Group:</span>
                <span className="blood-tag">{confirmModal.donor?.blood_group}</span>
              </div>
              <div className="modal-donor-row">
                <span>Location:</span>
                <span>
                  {confirmModal.donor?.city}, {confirmModal.donor?.state}
                </span>
              </div>
              <div className="modal-donor-row">
                <span>Email:</span>
                <span>{confirmModal.donor?.email}</span>
              </div>
            </div>

            <div className="modal-notes-field">
              <label htmlFor="adminNotes">Administrative Notes / Reason (Optional):</label>
              <textarea
                id="adminNotes"
                rows="3"
                placeholder={
                  confirmModal.action === "verify"
                    ? "Verified through standard criteria..."
                    : "Reason for rejection (e.g. invalid contact, incomplete eligibility)..."
                }
                value={confirmModal.adminNotes}
                onChange={(e) =>
                  setConfirmModal({
                    ...confirmModal,
                    adminNotes: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCloseConfirm}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-modal-confirm ${confirmModal.action === "verify" ? "btn-confirm-approve" : "btn-confirm-reject"}`}
                onClick={handleExecuteVerification}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  "Processing..."
                ) : confirmModal.action === "verify" ? (
                  <>
                    <Check size={18} /> Confirm Approval
                  </>
                ) : (
                  <>
                    <X size={18} /> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
