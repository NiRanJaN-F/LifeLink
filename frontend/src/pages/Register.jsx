import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { motion } from "framer-motion";
import {
  Heart,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Droplet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

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

    if (formData.password.length < 8) {
      setMessage({
        type: "error",
        text: "Password must contain at least 8 characters.",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    if (!/^[0-9]{10,15}$/.test(formData.phone)) {
      setMessage({
        type: "error",
        text: "Enter a valid phone number (10–15 digits).",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });

      setMessage({
        type: "success",
        text: response.data.message || "Registration successful!",
      });

      setFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "user",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* LEFT SIDE */}

      <motion.section
        className="register-left"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="register-brand">
          <div className="brand-icon">
            <Heart fill="white" size={23} />
          </div>
          <span>
            Life<span>Link</span>
          </span>
        </div>

        <div className="left-content">
          <motion.div
            className="donation-icon"
            animate={{
              y: [0, -12, 0],
              rotate: [0, 4, -4, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
          >
            <Droplet size={85} fill="#ef4050" color="#ef4050" />
            <Heart
              className="heart-overlay"
              size={34}
              fill="white"
              color="white"
            />
          </motion.div>

          <p className="left-label">
            <Heart size={14} fill="currentColor" />
            EVERY DROP COUNTS
          </p>

          <h1>
            Be someone's
            <br />
            <span>reason to live.</span>
          </h1>

          <p className="left-description">
            Join our community of lifesavers. Connect with blood donors, help
            people in emergencies, and make a difference in someone's life.
          </p>

          <div className="left-features">
            <div>
              <ShieldCheck size={21} />
              <span>Safe & Secure Community</span>
            </div>

            <div>
              <Heart size={21} />
              <span>Every Donation Matters</span>
            </div>

            <div>
              <Droplet size={21} />
              <span>One Community. Many Lives.</span>
            </div>
          </div>
        </div>

        <div className="left-footer">
          <span>© 2026 LifeLink</span>
          <span>Made with ♥ for humanity</span>
        </div>
      </motion.section>

      {/* RIGHT SIDE */}

      <motion.section
        className="register-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <div className="register-form-container">
          <div className="form-heading">
            <span className="form-small-title">JOIN THE COMMUNITY</span>

            <h2>Create your account</h2>

            <p>Enter your details to get started with LifeLink.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* FULL NAME */}

            <div className="form-group">
              <label>Full Name</label>

              <div className="input-wrapper">
                <User size={19} />

                <input
                  type="text"
                  name="full_name"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={handleChange}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}

            <div className="form-group">
              <label>Email Address</label>

              <div className="input-wrapper">
                <Mail size={19} />

                <input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* PHONE */}

            <div className="form-group">
              <label>Phone Number</label>

              <div className="input-wrapper">
                <Phone size={19} />

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={15}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            {/* ACCOUNT TYPE */}

            <div className="form-group">
              <label>Choose Account Type</label>

              <div className="role-options">
                <button
                  type="button"
                  className={
                    formData.role === "user"
                      ? "role-option active"
                      : "role-option"
                  }
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      role: "user",
                    }))
                  }
                >
                  <User size={19} />
                  <span>User</span>
                </button>

                <button
                  type="button"
                  className={
                    formData.role === "donor"
                      ? "role-option active"
                      : "role-option"
                  }
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      role: "donor",
                    }))
                  }
                >
                  <Heart size={19} />
                  <span>Donor</span>
                </button>
              </div>
            </div>

            {/* PASSWORD */}

            <div className="form-group">
              <label>Password</label>

              <div className="input-wrapper">
                <Lock size={19} />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <span className="input-hint">Minimum 8 characters.</span>
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="form-group">
              <label>Confirm Password</label>

              <div className="input-wrapper">
                <Lock size={19} />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* API MESSAGE */}

            {message.text && (
              <motion.div
                className={`form-message ${message.type}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {message.type === "success" ? (
                  <CheckCircle size={19} />
                ) : (
                  <AlertCircle size={19} />
                )}

                <span>{message.text}</span>
              </motion.div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  Create Account
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="register-bottom">
            <p>
              Already have an account?
              <Link to="/login"> Sign In</Link>
            </p>

            <div className="secure-note">
              <ShieldCheck size={16} />
              Your information is protected and secure.
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export default Register;
