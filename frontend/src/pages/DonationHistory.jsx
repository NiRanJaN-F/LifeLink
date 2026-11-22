import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Droplet,
  ArrowLeft,
  Calendar,
  Award,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import api from "../services/api";
import "./DonationHistory.css";

function DonationHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDonorInfo = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (isMounted && response.data?.user) {
          setProfile(response.data.user);
        }
      } catch (err) {
        console.error("Error fetching profile in DonationHistory:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDonorInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDonor = profile?.role === "donor";
  const lastDonation = profile?.donor?.last_donation_date;

  return (
    <div className="history-page">
      {/* HEADER */}
      <header className="history-header">
        <a href="/" className="history-logo">
          <span className="history-logo-icon">
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
      <main className="history-container">
        <div className="history-heading">
          <div className="history-eyebrow">
            <Heart size={14} fill="currentColor" />
            LIFESAVING JOURNEY
          </div>
          <h1>Donation History</h1>
          <p>
            Track your verified donation records, upcoming eligibility dates,
            and personal impact milestones.
          </p>
        </div>

        {/* IMPACT METRICS */}
        <section className="history-stats">
          <div className="history-stat-card">
            <div className="stat-icon red">
              <Droplet />
            </div>
            <div>
              <span>Total Donations</span>
              <h2>{lastDonation ? "1" : "0"} Units</h2>
              <small>Verified donations</small>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="stat-icon orange">
              <Heart />
            </div>
            <div>
              <span>Lives Impacted</span>
              <h2>{lastDonation ? "Up to 3" : "0"} Lives</h2>
              <small>1 unit can save 3 lives</small>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="stat-icon blue">
              <Calendar />
            </div>
            <div>
              <span>Last Donated</span>
              <h2>
                {lastDonation
                  ? new Date(lastDonation).toLocaleDateString()
                  : "None recorded"}
              </h2>
              <small>
                {lastDonation ? "Official donation record" : "No previous record"}
              </small>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="stat-icon green">
              <ShieldCheck />
            </div>
            <div>
              <span>Eligibility Status</span>
              <h2 className="status-eligible">
                {isDonor ? "Eligible" : "Pending Donor Reg"}
              </h2>
              <small>
                {isDonor ? "Ready to donate" : "Register as donor"}
              </small>
            </div>
          </div>
        </section>

        {/* MILESTONE SHOWCASE */}
        <section className="milestones-card">
          <div className="milestones-header">
            <div>
              <h2>Donor Badges & Milestones</h2>
              <p>Earn badges and verified certificates each time you give blood.</p>
            </div>
            <span className="badge-highlight">
              <Sparkles size={15} /> 4 Tier Recognition
            </span>
          </div>

          <div className="badges-grid">
            <div className={`badge-box ${lastDonation ? "unlocked" : "locked"}`}>
              <div className="badge-icon">
                <Droplet size={24} />
              </div>
              <h4>First Drop</h4>
              <span>1st Donation</span>
            </div>

            <div className="badge-box locked">
              <div className="badge-icon">
                <Award size={24} />
              </div>
              <h4>Bronze Lifesaver</h4>
              <span>3 Donations</span>
            </div>

            <div className="badge-box locked">
              <div className="badge-icon">
                <Award size={24} />
              </div>
              <h4>Silver Champion</h4>
              <span>5 Donations</span>
            </div>

            <div className="badge-box locked">
              <div className="badge-icon">
                <Heart size={24} />
              </div>
              <h4>Community Hero</h4>
              <span>10+ Donations</span>
            </div>
          </div>
        </section>

        {/* ACTIVITY LOG / EMPTY STATE */}
        <section className="history-log-card">
          <div className="log-card-header">
            <h2>Recent Donation Records</h2>
            <p>Verified certificates and blood drive hospital records.</p>
          </div>

          {loading ? (
            <div className="history-loading">
              <Clock size={24} className="spin-icon" />
              <p>Loading donation records...</p>
            </div>
          ) : lastDonation ? (
            <div className="records-list">
              <div className="record-item">
                <div className="record-left">
                  <div className="record-icon">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4>Whole Blood Donation</h4>
                    <p>
                      Recorded donation:{" "}
                      {new Date(lastDonation).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="record-right">
                  <span className="record-status-pill">Verified Record</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-history">
              <div className="empty-icon-circle">
                <Droplet size={38} />
              </div>
              <h3>No past donations logged yet</h3>
              <p>
                When you participate in blood donation camps or donate for a
                patient request through LifeLink, your official digital certificate
                and donation timeline will be registered here.
              </p>

              <div className="empty-history-actions">
                {isDonor ? (
                  <button
                    className="history-primary-btn"
                    onClick={() => navigate("/find-donors")}
                  >
                    Explore Blood Drives <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="history-primary-btn"
                    onClick={() => navigate("/register")}
                  >
                    Join as a Blood Donor <ArrowRight size={16} />
                  </button>
                )}

                <button
                  className="history-secondary-btn"
                  onClick={() => navigate("/dashboard")}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DonationHistory;
