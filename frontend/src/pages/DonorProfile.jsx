import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./DonorProfile.css";

function DonorProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    blood_group_id: "",
    age: "",
    city: "",
    state: "",
    last_donation_date: "",
    is_available: true,
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const token =
        localStorage.getItem("lifelink_token") ||
        sessionStorage.getItem("lifelink_token");

      if (!token) {
        setMessageType("error");
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      const response = await api.post("/donors/profile", formData);

      setMessageType("success");
      setMessage(response.data.message);

      setFormData({
        blood_group_id: "",
        age: "",
        city: "",
        state: "",
        last_donation_date: "",
        is_available: true,
      });
    } catch (error) {
      setMessageType("error");

      setMessage(
        error.response?.data?.message ||
          "Unable to save donor profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donor-profile-container">
      <div className="donor-profile-card">
        <h1>Create Donor Profile</h1>
        <p>Complete your details to become a blood donor.</p>

        {message && <div className={`message ${messageType}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <label>Blood Group</label>
          <select
            name="blood_group_id"
            value={formData.blood_group_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Blood Group</option>
            <option value="1">A+</option>
            <option value="2">A-</option>
            <option value="3">B+</option>
            <option value="4">B-</option>
            <option value="5">O+</option>
            <option value="6">O-</option>
            <option value="7">AB+</option>
            <option value="8">AB-</option>
          </select>

          <label>Age</label>
          <input
            type="number"
            name="age"
            placeholder="Enter your age"
            min="18"
            max="65"
            value={formData.age}
            onChange={handleChange}
            required
          />

          <label>City</label>
          <input
            type="text"
            name="city"
            placeholder="Enter your city"
            value={formData.city}
            onChange={handleChange}
            required
          />

          <label>State</label>
          <input
            type="text"
            name="state"
            placeholder="Enter your state"
            value={formData.state}
            onChange={handleChange}
            required
          />

          <label>Last Donation Date (Optional)</label>
          <input
            type="date"
            name="last_donation_date"
            value={formData.last_donation_date}
            onChange={handleChange}
          />

          <div className="availability-option">
            <input
              type="checkbox"
              name="is_available"
              checked={formData.is_available}
              onChange={handleChange}
            />
            <label>I am available to donate blood</label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Donor Profile"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="back-button"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default DonorProfile;
