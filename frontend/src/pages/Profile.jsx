import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  User,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Droplet,
  Save,
  Activity,
  MapPin,
} from "lucide-react";
import api from "../services/api";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  // Fetch logged-in user profile from backend on component mount
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (isMounted && response.data?.user) {
          const userData = response.data.user;
          setUser(userData);
          setFormData({
            full_name: userData.full_name || "",
            phone: userData.phone || "",
          });
        }
      } catch (error) {
        if (isMounted) {
          setMessage({
            type: "error",
            text:
              error.response?.data?.message ||
              "Unable to load profile. Please try again.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      setMessage({
        type: "error",
        text: "Full name must be at least 2 characters.",
      });
      return;
    }

    if (!/^[0-9]{10,15}$/.test(formData.phone.trim())) {
      setMessage({
        type: "error",
        text: "Please enter a valid phone number (10–15 digits).",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/auth/profile", {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
      });

      if (response.data && response.data.user) {
        setUser(response.data.user);
        setFormData({
          full_name: response.data.user.full_name,
          phone: response.data.user.phone,
        });

        // Sync updated user data with storage for Dashboard header display
        const storage = localStorage.getItem("lifelink_token")
          ? localStorage
          : sessionStorage;
        const currentStored = JSON.parse(
          storage.getItem("lifelink_user") || "{}",
        );
        const updatedStored = {
          ...currentStored,
          full_name: response.data.user.full_name,
          phone: response.data.user.phone,
        };
        storage.setItem("lifelink_user", JSON.stringify(updatedStored));

        setMessage({
          type: "success",
          text: response.data.message || "Profile updated successfully!",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      {/* HEADER */}
      <header className="profile-header">
        <a href="/" className="profile-logo">
          <span className="profile-logo-icon">
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
      <main className="profile-container">
        <div className="profile-heading">
          <div className="profile-eyebrow">
            <Heart size={14} fill="currentColor" />
            ACCOUNT SETTINGS
          </div>
          <h1>My Profile</h1>
          <p>View and manage your LifeLink personal and account details.</p>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="profile-loading-card">
            <div className="profile-spinner"></div>
            <p>Loading your profile details...</p>
          </div>
        ) : (
          <div className="profile-layout">
            {/* LEFT: SUMMARY CARD */}
            <motion.section
              className="profile-summary-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {user?.role === "donor" ? (
                    <Droplet size={38} className="avatar-icon-donor" />
                  ) : (
                    <User size={38} className="avatar-icon-user" />
                  )}
                </div>
                <div className="profile-name-tag">
                  <h2>{user?.full_name || "LifeLink User"}</h2>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="profile-badges">
                <span className={`badge-role ${user?.role}`}>
                  {user?.role === "donor" ? (
                    <>
                      <Droplet size={13} fill="currentColor" /> Donor Account
                    </>
                  ) : (
                    <>
                      <User size={13} /> User Account
                    </>
                  )}
                </span>

                <span className={`badge-status ${user?.status}`}>
                  <span className="status-indicator"></span>
                  {user?.status === "active" ? "Active" : user?.status}
                </span>
              </div>

              <div className="profile-summary-details">
                <div className="summary-item">
                  <span className="summary-label">Account Role</span>
                  <span className="summary-value capitalize">
                    {user?.role || "user"}
                  </span>
                </div>

                <div className="summary-item">
                  <span className="summary-label">Phone Number</span>
                  <span className="summary-value">
                    {user?.phone || "Not set"}
                  </span>
                </div>

                <div className="summary-item">
                  <span className="summary-label">Account Security</span>
                  <span className="summary-value text-green">
                    <ShieldCheck size={14} /> Password Protected
                  </span>
                </div>

                {user?.role === "donor" && user?.donor && (
                  <>
                    <div className="summary-divider"></div>
                    <div className="summary-item">
                      <span className="summary-label">Blood Group</span>
                      <span className="summary-value blood-group-highlight">
                        {user.donor.blood_group || "Registered"}
                      </span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">Location</span>
                      <span className="summary-value">
                        <MapPin size={13} /> {user.donor.city},{" "}
                        {user.donor.state}
                      </span>
                    </div>

                    <div className="summary-item">
                      <span className="summary-label">Availability</span>
                      <span
                        className={`summary-value ${user.donor.is_available ? "text-green" : "text-gray"}`}
                      >
                        <Activity size={13} />
                        {user.donor.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {user?.role === "donor" && !user?.donor && (
                <div className="donor-profile-prompt">
                  <p>Complete your donor profile to appear in donor searches.</p>
                  <button
                    type="button"
                    onClick={() => navigate("/donor-profile")}
                    className="complete-donor-btn"
                  >
                    Complete Donor Profile
                  </button>
                </div>
              )}
            </motion.section>

            {/* RIGHT: EDIT PROFILE FORM CARD */}
            <motion.section
              className="profile-form-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="card-header">
                <h2>Personal Information</h2>
                <p>Update your display name and contact phone number.</p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* FULL NAME */}
                <div className="profile-form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <div className="profile-input-wrapper">
                    <User size={18} />
                    <input
                      id="full_name"
                      type="text"
                      name="full_name"
                      placeholder="Enter full name"
                      value={formData.full_name}
                      onChange={handleChange}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                {/* EMAIL (READ ONLY) */}
                <div className="profile-form-group">
                  <label htmlFor="email">
                    Email Address <small>(Primary login account ID)</small>
                  </label>
                  <div className="profile-input-wrapper readonly">
                    <Mail size={18} />
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      disabled
                    />
                  </div>
                  <span className="input-hint">
                    Email address cannot be changed directly.
                  </span>
                </div>

                {/* PHONE */}
                <div className="profile-form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="profile-input-wrapper">
                    <Phone size={18} />
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      placeholder="Enter 10-15 digit phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={15}
                      required
                    />
                  </div>
                </div>

                {/* ACCOUNT ROLE & STATUS (READ ONLY DISPLAY) */}
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>Account Role</label>
                    <div className="profile-input-wrapper readonly">
                      <ShieldCheck size={18} />
                      <input
                        type="text"
                        value={
                          user?.role === "donor"
                            ? "Blood Donor"
                            : "Standard User"
                        }
                        readOnly
                        disabled
                      />
                    </div>
                  </div>

                  <div className="profile-form-group">
                    <label>Account Status</label>
                    <div className="profile-input-wrapper readonly">
                      <Activity size={18} />
                      <input
                        type="text"
                        value={
                          user?.status === "active" ? "Active Account" : user?.status
                        }
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* FEEDBACK MESSAGE */}
                {message.text && (
                  <motion.div
                    className={`profile-feedback ${message.type}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {message.type === "success" ? (
                      <CheckCircle size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                    <span>{message.text}</span>
                  </motion.div>
                )}

                {/* FORM ACTIONS */}
                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-save-btn"
                    disabled={saving}
                  >
                    {saving ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save size={17} />
                        Save Profile
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={() => {
                      setFormData({
                        full_name: user?.full_name || "",
                        phone: user?.phone || "",
                      });
                      setMessage({ type: "", text: "" });
                    }}
                    disabled={saving}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </motion.section>
          </div>
        )}
      </main>
    </div>
  );
}

export default Profile;
