import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Droplet,
  ArrowLeft,
  PlusCircle,
  MapPin,
  Clock,
  AlertTriangle,
  Building,
  CheckCircle2,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  Check,
  Phone,
  User,
  Users,
  RotateCcw,
  Ban,
  Layers,
} from "lucide-react";
import api from "../services/api";
import "./BloodRequests.css";

const BLOOD_GROUPS = [
  { id: 1, name: "A+" },
  { id: 2, name: "A-" },
  { id: 3, name: "B+" },
  { id: 4, name: "B-" },
  { id: 5, name: "O+" },
  { id: 6, name: "O-" },
  { id: 7, name: "AB+" },
  { id: 8, name: "AB-" },
];

const TODAY_STR = new Date().toISOString().split("T")[0];

function BloodRequests() {
  const navigate = useNavigate();

  // Active view: "community" (all active requests) vs "my-requests"
  const [activeTab, setActiveTab] = useState("community");

  // Filters for community requests
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");

  // Data states
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [isDonor, setIsDonor] = useState(false);
  const [donorDetails, setDonorDetails] = useState(null);

  // Async UI states
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Create Request Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [formData, setFormData] = useState({
    patient_name: "",
    blood_group_id: "",
    units_required: 1,
    hospital_name: "",
    city: "",
    urgency: "urgent",
    required_date: "",
    contact_phone: "",
  });

  // View Donor Responses Modal State (Owner Only)
  const [selectedRequestForResponses, setSelectedRequestForResponses] = useState(null);
  const [responsesModalData, setResponsesModalData] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [responsesError, setResponsesError] = useState("");

  const handleOpenResponsesModal = async (req) => {
    setSelectedRequestForResponses(req);
    setLoadingResponses(true);
    setResponsesError("");
    setResponsesModalData(null);

    try {
      const response = await api.get(`/requests/${req.request_id}/responses`);
      if (response.data && response.data.success) {
        setResponsesModalData(response.data);
      }
    } catch (err) {
      console.error("Error fetching donor responses:", err);
      setResponsesError(
        err.response?.data?.message || "Failed to load donor responses. Please try again."
      );
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleCloseResponsesModal = () => {
    setSelectedRequestForResponses(null);
    setResponsesModalData(null);
    setResponsesError("");
  };

  // Fetch Community Blood Requests
  const fetchCommunityRequests = useCallback(async () => {
    try {
      setError("");

      const params = {};
      if (urgencyFilter !== "all") params.urgency = urgencyFilter;
      if (bloodGroupFilter !== "all") params.blood_group = bloodGroupFilter;
      if (cityFilter.trim()) params.city = cityFilter.trim();

      const response = await api.get("/requests", { params });
      if (response.data && response.data.success) {
        setRequests(response.data.requests || []);
        setIsDonor(Boolean(response.data.isDonor));
        setDonorDetails(response.data.donorDetails || null);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load blood requests. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [urgencyFilter, bloodGroupFilter, cityFilter]);

  // Fetch My Requests
  const fetchMyRequests = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/requests/my-requests");
      if (response.data && response.data.success) {
        setMyRequests(response.data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching my requests:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load your requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Main data loader based on activeTab
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (activeTab === "community") {
        await fetchCommunityRequests();
      } else {
        await fetchMyRequests();
      }
    };
    if (!ignore) {
      load();
    }
    return () => {
      ignore = true;
    };
  }, [activeTab, fetchCommunityRequests, fetchMyRequests]);

  // Form input change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setModalError("");
  };

  // Submit new Blood Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.patient_name.trim() || formData.patient_name.trim().length < 2) {
      setModalError("Please enter a valid patient name (min 2 characters).");
      return;
    }

    if (!formData.hospital_name.trim() || formData.hospital_name.trim().length < 3) {
      setModalError("Please enter a valid hospital name (min 3 characters).");
      return;
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      setModalError("Please enter a valid city name.");
      return;
    }

    if (!formData.blood_group_id) {
      setModalError("Please select the required blood group.");
      return;
    }

    const units = Number(formData.units_required);
    if (!Number.isInteger(units) || units < 1 || units > 20) {
      setModalError("Units required must be between 1 and 20.");
      return;
    }

    if (!formData.required_date) {
      setModalError("Please specify the date when blood is required.");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(formData.contact_phone.trim())) {
      setModalError("Please enter a valid 10-15 digit contact phone number.");
      return;
    }

    try {
      setModalSubmitting(true);
      const response = await api.post("/requests", {
        ...formData,
        patient_name: formData.patient_name.trim(),
        hospital_name: formData.hospital_name.trim(),
        city: formData.city.trim(),
        units_required: units,
        contact_phone: formData.contact_phone.trim(),
      });

      if (response.data && response.data.success) {
        setShowModal(false);
        setFormData({
          patient_name: "",
          blood_group_id: "",
          units_required: 1,
          hospital_name: "",
          city: "",
          urgency: "urgent",
          required_date: "",
          contact_phone: "",
        });
        setFeedback({
          type: "success",
          text: "Blood request submitted successfully! Verified donors are being alerted.",
        });

        // Refresh list
        if (activeTab === "community") {
          fetchCommunityRequests();
        } else {
          fetchMyRequests();
        }
      }
    } catch (err) {
      setModalError(
        err.response?.data?.message ||
          "Failed to create blood request. Please verify all details and try again."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  // Donor Accept / Reject action
  const handleDonorResponse = async (requestId, responseStatus) => {
    try {
      setActionLoadingId(requestId);
      setFeedback({ type: "", text: "" });

      const response = await api.post(`/requests/${requestId}/respond`, {
        response_status: responseStatus,
      });

      if (response.data && response.data.success) {
        setFeedback({
          type: "success",
          text: response.data.message,
        });
        // Refresh community feed to reflect updated response state
        fetchCommunityRequests();
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err.response?.data?.message ||
          "Unable to record your response. Please try again.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Owner Update Request Status (Fulfilled / Cancelled)
  const handleOwnerStatusUpdate = async (requestId, newStatus) => {
    try {
      setActionLoadingId(requestId);
      setFeedback({ type: "", text: "" });

      const response = await api.patch(`/requests/${requestId}/status`, {
        request_status: newStatus,
      });

      if (response.data && response.data.success) {
        setFeedback({
          type: "success",
          text: response.data.message,
        });
        fetchMyRequests();
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err.response?.data?.message ||
          "Failed to update request status. Please try again.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Format posted date relative or localized
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="requests-page">
      {/* HEADER */}
      <header className="requests-header">
        <a href="/" className="requests-logo">
          <span className="requests-logo-icon">
            <Heart fill="white" size={20} />
          </span>
          Life<span>Link</span>
        </a>

        <button
          className="back-dashboard-btn"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="requests-container">
        <div className="requests-heading">
          <div className="requests-eyebrow">
            <Heart size={14} fill="currentColor" />
            EMERGENCY BLOOD SUPPORT
          </div>
          <h1>Blood Requests</h1>
          <p>
            Create emergency blood requests or respond to urgent patient needs
            in your community.
          </p>
        </div>

        {/* HERO BANNER */}
        <section className="requests-banner">
          <div>
            <h2>Need Blood for an Emergency?</h2>
            <p>
              Submit patient requirements to alert nearby verified blood donors
              and hospital volunteers instantly.
            </p>
          </div>
          <button
            className="create-request-btn"
            onClick={() => {
              setShowModal(true);
              setModalError("");
            }}
          >
            <PlusCircle size={18} />
            Create Blood Request
          </button>
        </section>

        {/* FEEDBACK TOAST / BANNER */}
        {feedback.text && (
          <motion.div
            className={`requests-feedback ${feedback.type}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{feedback.text}</span>
            <button
              className="feedback-dismiss"
              onClick={() => setFeedback({ type: "", text: "" })}
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* MAIN VIEW TABS: Community Requests vs My Requests */}
        <div className="view-mode-tabs">
          <button
            className={activeTab === "community" ? "view-tab active" : "view-tab"}
            onClick={() => {
              setActiveTab("community");
              setFeedback({ type: "", text: "" });
            }}
          >
            <Droplet size={16} />
            Community Requests ({requests.length})
          </button>

          <button
            className={activeTab === "my-requests" ? "view-tab active" : "view-tab"}
            onClick={() => {
              setActiveTab("my-requests");
              setFeedback({ type: "", text: "" });
            }}
          >
            <Layers size={16} />
            My Requests {myRequests.length > 0 && `(${myRequests.length})`}
          </button>
        </div>

        {/* SECTION TOOLBAR & FILTERS (Only in Community View) */}
        {activeTab === "community" && (
          <section className="community-filters-bar">
            {/* Urgency Filter Tabs */}
            <div className="filter-tabs">
              <button
                className={urgencyFilter === "all" ? "tab active" : "tab"}
                onClick={() => setUrgencyFilter("all")}
              >
                All Urgencies
              </button>
              <button
                className={urgencyFilter === "emergency" ? "tab active" : "tab"}
                onClick={() => setUrgencyFilter("emergency")}
              >
                Emergency
              </button>
              <button
                className={urgencyFilter === "urgent" ? "tab active" : "tab"}
                onClick={() => setUrgencyFilter("urgent")}
              >
                Urgent
              </button>
              <button
                className={urgencyFilter === "normal" ? "tab active" : "tab"}
                onClick={() => setUrgencyFilter("normal")}
              >
                Normal
              </button>
            </div>

            {/* Quick Dropdown & City Search */}
            <div className="secondary-filters">
              <select
                className="filter-select"
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
              >
                <option value="all">All Blood Groups</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg.id} value={bg.name}>
                    {bg.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="filter-city-input"
                placeholder="Filter by city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />

              {(bloodGroupFilter !== "all" || cityFilter || urgencyFilter !== "all") && (
                <button
                  className="filter-clear-btn"
                  onClick={() => {
                    setBloodGroupFilter("all");
                    setCityFilter("");
                    setUrgencyFilter("all");
                  }}
                  title="Reset filters"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>
          </section>
        )}

        {/* CONTENT STATES */}
        {loading ? (
          <div className="requests-loading-state">
            <Loader2 size={36} className="spinner icon-red" />
            <h3>Loading Blood Requests...</h3>
            <p>Fetching active requests from the LifeLink network.</p>
          </div>
        ) : error ? (
          <div className="requests-error-state">
            <AlertCircle size={36} />
            <h3>Unable to Load Requests</h3>
            <p>{error}</p>
            <button
              className="retry-btn"
              onClick={activeTab === "community" ? fetchCommunityRequests : fetchMyRequests}
            >
              Retry
            </button>
          </div>
        ) : activeTab === "community" ? (
          /* COMMUNITY REQUESTS VIEW */
          requests.length === 0 ? (
            <div className="requests-empty-state">
              <div className="empty-icon-box">
                <Droplet size={38} />
              </div>
              <h3>No Active Blood Requests</h3>
              <p>
                There are currently no active blood requests matching your filters.
                <br />
                If someone in your family or hospital requires blood, create a request above.
              </p>
              <button
                className="btn-create-empty"
                onClick={() => setShowModal(true)}
              >
                <PlusCircle size={17} /> Create Blood Request
              </button>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((req) => (
                <motion.div
                  key={req.request_id}
                  className={`request-card ${req.urgency}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="request-card-header">
                    <div className="blood-badge">
                      <Droplet size={18} fill="currentColor" />
                      <span>{req.blood_group}</span>
                    </div>

                    <div className="header-status-group">
                      <span className={`urgency-pill ${req.urgency}`}>
                        {req.urgency === "emergency" && <AlertTriangle size={12} />}
                        {req.urgency.toUpperCase()}
                      </span>

                      {!!req.is_my_request && (
                        <span className="my-request-chip">Your Request</span>
                      )}
                    </div>
                  </div>

                  <div className="request-card-body">
                    <span className="req-id">REQ-#{req.request_id}</span>
                    <h3>{req.patient_name}</h3>

                    <div className="request-info-row">
                      <Building size={14} />
                      <span>{req.hospital_name}</span>
                    </div>

                    <div className="request-info-row">
                      <MapPin size={14} />
                      <span>{req.city}</span>
                    </div>

                    <div className="request-info-row">
                      <Calendar size={14} />
                      <span>
                        Required by:{" "}
                        <strong>
                          {new Date(req.required_date).toLocaleDateString()}
                        </strong>
                      </span>
                    </div>

                    <div className="request-info-row text-muted">
                      <Clock size={13} />
                      <span>Posted {formatTime(req.created_at)}</span>
                    </div>

                    <div className="request-info-row text-muted">
                      <User size={13} />
                      <span>Requester: {req.requester_name}</span>
                    </div>
                  </div>

                  <div className="request-card-footer">
                    <div className="units-info">
                      <span className="units-count">
                        <strong>{req.units_required}</strong>{" "}
                        {req.units_required === 1 ? "Unit" : "Units"}
                      </span>
                      {Number(req.accepted_count) > 0 && (
                        <span className="volunteers-responded">
                          • {req.accepted_count} donor{req.accepted_count > 1 ? "s" : ""} responded
                        </span>
                      )}
                    </div>

                    {/* DONOR RESPONSE ACTIONS */}
                    <div className="donor-card-actions">
                      {req.is_my_request ? (
                        <span className="owner-badge-note">You posted this</span>
                      ) : req.my_response_status === "accepted" ? (
                        <span className="response-status-badge accepted">
                          <Check size={14} /> You Accepted
                        </span>
                      ) : req.my_response_status === "rejected" ? (
                        <span className="response-status-badge rejected">
                          <X size={14} /> You Declined
                        </span>
                      ) : isDonor && donorDetails?.verification_status === "verified" && donorDetails?.is_available ? (
                        <div className="action-buttons-group">
                          <button
                            className="btn-help-accept"
                            disabled={actionLoadingId === req.request_id}
                            onClick={() => handleDonorResponse(req.request_id, "accepted")}
                          >
                            {actionLoadingId === req.request_id ? (
                              <Loader2 size={13} className="spinner" />
                            ) : (
                              <Check size={13} />
                            )}
                            I Can Help
                          </button>
                          <button
                            className="btn-help-decline"
                            disabled={actionLoadingId === req.request_id}
                            onClick={() => handleDonorResponse(req.request_id, "rejected")}
                          >
                            Decline
                          </button>
                        </div>
                      ) : isDonor && (!donorDetails?.is_available || donorDetails?.verification_status !== "verified") ? (
                        <span className="donor-disabled-note" title="Update donor profile to respond">
                          Unavailable to donate
                        </span>
                      ) : (
                        <span className="public-monitoring-tag">
                          Open Request
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* MY REQUESTS VIEW */
          myRequests.length === 0 ? (
            <div className="requests-empty-state">
              <div className="empty-icon-box">
                <PlusCircle size={38} />
              </div>
              <h3>You Have Not Created Any Blood Requests</h3>
              <p>
                When you post an emergency blood request, you can monitor donor
                responses and manage status updates here.
              </p>
              <button
                className="btn-create-empty"
                onClick={() => setShowModal(true)}
              >
                <PlusCircle size={17} /> Create Your First Request
              </button>
            </div>
          ) : (
            <div className="requests-grid">
              {myRequests.map((req) => (
                <div key={req.request_id} className="request-card my-request-card">
                  <div className="request-card-header">
                    <div className="blood-badge">
                      <Droplet size={18} fill="currentColor" />
                      <span>{req.blood_group}</span>
                    </div>

                    <span className={`status-badge ${req.request_status}`}>
                      {req.request_status.toUpperCase()}
                    </span>
                  </div>

                  <div className="request-card-body">
                    <span className="req-id">REQ-#{req.request_id}</span>
                    <h3>{req.patient_name}</h3>

                    <div className="request-info-row">
                      <Building size={14} />
                      <span>{req.hospital_name}</span>
                    </div>

                    <div className="request-info-row">
                      <MapPin size={14} />
                      <span>{req.city}</span>
                    </div>

                    <div className="request-info-row">
                      <Phone size={14} />
                      <span>
                        Contact Phone: <strong>{req.contact_phone}</strong>
                      </span>
                    </div>

                    <div className="request-info-row">
                      <Calendar size={14} />
                      <span>
                        Required by:{" "}
                        {new Date(req.required_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="request-info-row text-muted">
                      <Clock size={13} />
                      <span>Created {formatTime(req.created_at)}</span>
                    </div>

                    {/* Donor Responses Stat Box */}
                    <div className="donor-response-statbox">
                      <div>
                        <strong>{req.accepted_count}</strong>
                        <span>Accepted Donors</span>
                      </div>
                      <div>
                        <strong>{req.rejected_count}</strong>
                        <span>Declined</span>
                      </div>
                    </div>

                    {/* View Individual Donor Responses Button */}
                    <button
                      type="button"
                      className="btn-view-donor-responses"
                      onClick={() => handleOpenResponsesModal(req)}
                    >
                      <Users size={14} />
                      View Donor Responses
                      {Number(req.accepted_count) > 0 && (
                        <span className="badge-accepted-pill">
                          {req.accepted_count} accepted
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Owner Status Management Actions */}
                  {req.request_status !== "fulfilled" && req.request_status !== "cancelled" ? (
                    <div className="my-request-actions">
                      <button
                        className="btn-mark-fulfilled"
                        disabled={actionLoadingId === req.request_id}
                        onClick={() =>
                          handleOwnerStatusUpdate(req.request_id, "fulfilled")
                        }
                      >
                        {actionLoadingId === req.request_id ? (
                          <Loader2 size={13} className="spinner" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Mark as Fulfilled
                      </button>

                      <button
                        className="btn-mark-cancelled"
                        disabled={actionLoadingId === req.request_id}
                        onClick={() =>
                          handleOwnerStatusUpdate(req.request_id, "cancelled")
                        }
                      >
                        <Ban size={14} />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="closed-request-note">
                      <span>Request closed ({req.request_status})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        <div className="system-note">
          <CheckCircle2 size={16} />
          <span>
            All emergency blood requests are broadcast across the LifeLink
            community network to verified eligible donors.
          </span>
        </div>
      </main>

      {/* CREATE BLOOD REQUEST MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="modal-header">
                <h3>Create Emergency Blood Request</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                  disabled={modalSubmitting}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="modal-desc">
                Provide patient requirement details to alert eligible verified
                donors in your city immediately.
              </p>

              {modalError && (
                <div className="modal-error-banner">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRequest} className="modal-real-form">
                {/* Patient Name */}
                <div className="form-field">
                  <label htmlFor="patient_name">Patient / Case Name *</label>
                  <input
                    id="patient_name"
                    name="patient_name"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.patient_name}
                    onChange={handleFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                {/* Blood Group & Units */}
                <div className="form-field-row">
                  <div className="form-field">
                    <label htmlFor="blood_group_id">Blood Group *</label>
                    <select
                      id="blood_group_id"
                      name="blood_group_id"
                      value={formData.blood_group_id}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg.id} value={bg.id}>
                          {bg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="units_required">Units Needed *</label>
                    <input
                      id="units_required"
                      name="units_required"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.units_required}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>

                {/* Hospital Name */}
                <div className="form-field">
                  <label htmlFor="hospital_name">Hospital Name *</label>
                  <input
                    id="hospital_name"
                    name="hospital_name"
                    type="text"
                    placeholder="e.g. City General Hospital"
                    value={formData.hospital_name}
                    onChange={handleFormChange}
                    maxLength={150}
                    required
                  />
                </div>

                {/* City & Urgency */}
                <div className="form-field-row">
                  <div className="form-field">
                    <label htmlFor="city">City / Location *</label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={handleFormChange}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="urgency">Urgency Level *</label>
                    <select
                      id="urgency"
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleFormChange}
                    >
                      <option value="emergency">Emergency (Immediate)</option>
                      <option value="urgent">Urgent (Within 24 Hours)</option>
                      <option value="normal">Normal (Standard)</option>
                    </select>
                  </div>
                </div>

                {/* Required Date & Contact Phone */}
                <div className="form-field-row">
                  <div className="form-field">
                    <label htmlFor="required_date">Required By Date *</label>
                    <input
                      id="required_date"
                      name="required_date"
                      type="date"
                      min={TODAY_STR}
                      value={formData.required_date}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="contact_phone">Contact Phone *</label>
                    <input
                      id="contact_phone"
                      name="contact_phone"
                      type="tel"
                      placeholder="10-15 digit phone"
                      maxLength={15}
                      value={formData.contact_phone}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={modalSubmitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Blood Request"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* DONOR RESPONSES MODAL (Owner Only) */}
        {selectedRequestForResponses && (
          <div
            className="modal-backdrop"
            onClick={handleCloseResponsesModal}
          >
            <motion.div
              className="modal-content responses-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="modal-header">
                <div>
                  <span className="modal-category">
                    REQ-#{selectedRequestForResponses.request_id} · DONOR RESPONSES
                  </span>
                  <h2>{selectedRequestForResponses.patient_name}</h2>
                  <p className="modal-subtitle">
                    {selectedRequestForResponses.units_required}{" "}
                    {selectedRequestForResponses.units_required === 1 ? "Unit" : "Units"} of{" "}
                    <strong>{selectedRequestForResponses.blood_group}</strong> needed at{" "}
                    {selectedRequestForResponses.hospital_name}, {selectedRequestForResponses.city}
                  </p>
                </div>
                <button
                  className="modal-close"
                  onClick={handleCloseResponsesModal}
                  aria-label="Close responses modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* STATS OVERVIEW BAR */}
              {responsesModalData && (
                <div className="responses-summary-bar">
                  <div className="summary-pill total">
                    <span>Total Responded:</span>
                    <strong>{responsesModalData.total_responses}</strong>
                  </div>
                  <div className="summary-pill accepted">
                    <Check size={14} />
                    <span>Accepted:</span>
                    <strong>{responsesModalData.accepted_count}</strong>
                  </div>
                  <div className="summary-pill declined">
                    <X size={14} />
                    <span>Declined:</span>
                    <strong>{responsesModalData.declined_count}</strong>
                  </div>
                </div>
              )}

              {/* MODAL BODY */}
              <div className="responses-modal-body">
                {loadingResponses ? (
                  <div className="responses-loading-state">
                    <Loader2 size={32} className="spinner" />
                    <p>Loading donor response details...</p>
                  </div>
                ) : responsesError ? (
                  <div className="responses-error-state">
                    <AlertCircle size={24} color="#fa465b" />
                    <p>{responsesError}</p>
                    <button
                      className="btn-retry"
                      onClick={() => handleOpenResponsesModal(selectedRequestForResponses)}
                    >
                      <RotateCcw size={14} /> Try Again
                    </button>
                  </div>
                ) : !responsesModalData || responsesModalData.responses.length === 0 ? (
                  <div className="responses-empty-state">
                    <Users size={40} color="#94a3b8" />
                    <h4>No Donor Responses Yet</h4>
                    <p>
                      Volunteers have not responded to this blood request yet. As soon as a donor clicks
                      &quot;I Can Help&quot;, their verified profile and contact details will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="donor-responses-list">
                    {responsesModalData.responses.map((resp) => {
                      const isAccepted = resp.response_status === "accepted";
                      return (
                        <div
                          key={resp.response_id}
                          className={`donor-response-card ${isAccepted ? "accepted-card" : "declined-card"}`}
                        >
                          <div className="donor-resp-top">
                            <div className="donor-resp-avatar-blood">
                              <span>{resp.blood_group}</span>
                            </div>

                            <div className="donor-resp-info">
                              <h4>{resp.donor_name}</h4>
                              <span className="donor-resp-meta">
                                Donor #{resp.donor_id} · Age {resp.age || "N/A"} · {resp.city}, {resp.state}
                              </span>
                            </div>

                            <span
                              className={`donor-resp-badge ${isAccepted ? "badge-accepted" : "badge-declined"}`}
                            >
                              {isAccepted ? (
                                <>
                                  <Check size={13} /> Accepted
                                </>
                              ) : (
                                <>
                                  <X size={13} /> Declined
                                </>
                              )}
                            </span>
                          </div>

                          <div className="donor-resp-bottom">
                            <div className="resp-timestamp">
                              <Clock size={12} />
                              <span>Responded {formatTime(resp.responded_at)}</span>
                            </div>

                            {/* Contact Action only for Accepted Donors */}
                            {isAccepted && resp.phone ? (
                              <div className="donor-contact-action">
                                <span className="donor-phone-text">
                                  <Phone size={13} /> {resp.phone}
                                </span>
                                <a
                                  href={`tel:${resp.phone}`}
                                  className="btn-call-donor"
                                  title={`Call ${resp.donor_name}`}
                                >
                                  <Phone size={13} /> Contact Donor
                                </a>
                              </div>
                            ) : (
                              <span className="declined-note">
                                Contact phone withheld (Declined)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseResponsesModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleOpenResponsesModal(selectedRequestForResponses)}
                  disabled={loadingResponses}
                >
                  <RotateCcw size={14} /> Refresh Responses
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BloodRequests;
