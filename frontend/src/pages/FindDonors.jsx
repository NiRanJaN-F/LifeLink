import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Search,
  MapPin,
  Droplet,
  ArrowLeft,
  UserRound,
  Filter,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import api from "../services/api";
import "./FindDonors.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function FindDonors() {
  const navigate = useNavigate();

  // Search filter states
  const [bloodGroup, setBloodGroup] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Result and async states
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch donors with current filters
  const fetchDonors = useCallback(
    async (overrideFilters = {}) => {
      try {
        setLoading(true);
        setError("");

        const params = {};
        const bg =
          overrideFilters.bloodGroup !== undefined
            ? overrideFilters.bloodGroup
            : bloodGroup;
        const c =
          overrideFilters.city !== undefined ? overrideFilters.city : city;
        const s =
          overrideFilters.state !== undefined ? overrideFilters.state : state;
        const avail =
          overrideFilters.availableOnly !== undefined
            ? overrideFilters.availableOnly
            : availableOnly;

        if (bg) params.blood_group = bg;
        if (c.trim()) params.city = c.trim();
        if (s.trim()) params.state = s.trim();
        if (avail) params.is_available = "true";

        const response = await api.get("/donors/search", { params });

        if (response.data && response.data.success) {
          setDonors(response.data.donors || []);
        } else {
          setDonors([]);
        }
      } catch (err) {
        console.error("Error fetching donors:", err);
        setError(
          err.response?.data?.message ||
            "Unable to connect to the donor database. Please try again.",
        );
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    },
    [bloodGroup, city, state, availableOnly],
  );

  // Load all verified donors on initial mount
  useEffect(() => {
    fetchDonors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDonors();
  };

  const handleReset = () => {
    setBloodGroup("");
    setCity("");
    setState("");
    setAvailableOnly(false);
    fetchDonors({
      bloodGroup: "",
      city: "",
      state: "",
      availableOnly: false,
    });
  };

  return (
    <div className="find-donors-page">
      {/* HEADER */}
      <header className="donor-header">
        <div className="donor-logo">
          <Heart fill="white" />
          LifeLink
        </div>

        <button onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="donor-container">
        <div className="donor-heading">
          <span>FIND YOUR MATCH</span>
          <h1>Find Blood Donors</h1>
          <p>
            Search verified, active blood donors in your community by blood
            group and location.
          </p>
        </div>

        {/* SEARCH FORM */}
        <section className="donor-search-card">
          <h2>
            <Search size={21} />
            Search Donors
          </h2>

          <form onSubmit={handleSearchSubmit}>
            <div className="donor-form-grid">
              {/* Blood Group */}
              <div className="donor-field">
                <label htmlFor="bloodGroupSelect">Blood Group</label>
                <div className="donor-input">
                  <Droplet size={19} />
                  <select
                    id="bloodGroupSelect"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                  >
                    <option value="">All Blood Groups</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City */}
              <div className="donor-field">
                <label htmlFor="cityInput">City</label>
                <div className="donor-input">
                  <MapPin size={19} />
                  <input
                    id="cityInput"
                    type="text"
                    placeholder="Enter city (e.g. Mumbai, Bangalore)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* State */}
              <div className="donor-field">
                <label htmlFor="stateInput">State / Region</label>
                <div className="donor-input">
                  <MapPin size={19} />
                  <input
                    id="stateInput"
                    type="text"
                    placeholder="Enter state (e.g. Maharashtra)"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Availability Filter Toggle */}
              <div className="donor-field availability-field">
                <label>Donor Availability</label>
                <div className="availability-checkbox-wrapper">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      Show Available Donors Only
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="donor-filter-actions">
              <button
                type="submit"
                className="donor-search-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search Donors
                  </>
                )}
              </button>

              <button
                type="button"
                className="donor-reset-button"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw size={16} />
                Reset Filters
              </button>
            </div>
          </form>
        </section>

        {/* RESULTS SECTION */}
        <section className="donor-results">
          <div className="donor-results-heading">
            <div>
              <h2>Verified Donors</h2>
              <p>
                {loading
                  ? "Searching database..."
                  : `${donors.length} ${donors.length === 1 ? "donor" : "donors"} found`}
              </p>
            </div>

            <span className="active-filter-indicator">
              <Filter size={16} />
              {bloodGroup || city || state || availableOnly
                ? "Filters Active"
                : "All Verified Donors"}
            </span>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="donor-loading-card">
              <Loader2 size={36} className="spinner icon-red" />
              <h3>Searching Blood Donors...</h3>
              <p>Fetching verified donor records from the database.</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="donor-error-card">
              <AlertCircle size={36} />
              <h3>Unable to Load Donors</h3>
              <p>{error}</p>
              <button
                type="button"
                className="retry-button"
                onClick={() => fetchDonors()}
              >
                Retry Search
              </button>
            </div>
          )}

          {/* EMPTY RESULTS STATE */}
          {!loading && !error && donors.length === 0 && hasSearched && (
            <div className="donor-empty">
              <div className="donor-empty-icon">
                <UserRound size={35} />
              </div>

              <h3>No Verified Donors Found</h3>

              <p>
                We couldn't find any verified blood donors matching your
                criteria.
                <br />
                Try broadening your location search or selecting "All Blood
                Groups".
              </p>

              <button
                type="button"
                className="clear-filter-btn"
                onClick={handleReset}
              >
                Show All Donors
              </button>
            </div>
          )}

          {/* SUCCESSFUL RESULTS GRID */}
          {!loading && !error && donors.length > 0 && (
            <div className="donor-cards-grid">
              {donors.map((donor) => (
                <div key={donor.donor_id} className="donor-card">
                  <div className="donor-card-top">
                    {/* Blood Group Badge */}
                    <div className="donor-blood-badge">
                      <Droplet size={18} fill="currentColor" />
                      <span>{donor.blood_group}</span>
                    </div>

                    {/* Status Pill */}
                    <div className="donor-status-tags">
                      <span
                        className={`status-pill ${donor.is_available ? "available" : "unavailable"}`}
                      >
                        <span className="dot"></span>
                        {donor.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  <div className="donor-card-body">
                    <h3 className="donor-name">{donor.full_name}</h3>

                    <div className="donor-meta-row">
                      <MapPin size={15} />
                      <span>
                        {donor.city}, {donor.state}
                      </span>
                    </div>

                    <div className="donor-meta-row">
                      <span className="donor-age-tag">
                        Age: <strong>{donor.age}</strong> yrs
                      </span>
                      <span className="verified-badge">
                        <ShieldCheck size={14} />
                        Verified
                      </span>
                    </div>

                    {donor.last_donation_date && (
                      <div className="donor-meta-row muted">
                        <Calendar size={14} />
                        <span>
                          Last donated:{" "}
                          {new Date(
                            donor.last_donation_date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="donor-card-footer">
                    <button
                      type="button"
                      className="donor-contact-btn"
                      onClick={() => navigate("/blood-requests")}
                      title={`Request blood from ${donor.full_name}`}
                    >
                      <Heart size={15} fill="white" />
                      Request Blood
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="donor-footer">
          <Heart size={15} fill="currentColor" />
          LifeLink – Connecting hearts. Supporting lives.
        </footer>
      </main>
    </div>
  );
}

export default FindDonors;
