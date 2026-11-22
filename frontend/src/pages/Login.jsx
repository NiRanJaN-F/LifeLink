import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import { motion } from "framer-motion";
import {
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Droplet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setMessage({ type: "", text: "" });
  };

  // LOGIN FUNCTION

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const response = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      const { token, user } = response.data;

      // Store login session

      // Clear previous login sessions

      localStorage.removeItem("lifelink_token");
      localStorage.removeItem("lifelink_user");

      sessionStorage.removeItem("lifelink_token");
      sessionStorage.removeItem("lifelink_user");

      // Store the current logged-in user

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("lifelink_token", token);
      storage.setItem("lifelink_user", JSON.stringify(user));

      // Show success message

      setMessage({
        type: "success",
        text: `Welcome back, ${user.full_name}! Login successful.`,
      });

      // Clear form

      setFormData({
        email: "",
        password: "",
      });

      // Navigate to appropriate dashboard after 1 second

      setTimeout(() => {
        if (user?.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to connect. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT PANEL */}

      <motion.section
        className="login-left"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <a href="/" className="login-brand">
          <span className="login-brand-icon">
            <Heart fill="white" size={23} />
          </span>
          Life<span>Link</span>
        </a>

        <div className="login-left-content">
          <motion.div
            className="login-donation-icon"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Droplet size={85} fill="#ef4050" color="#ef4050" />
            <Heart
              className="login-heart-overlay"
              size={34}
              fill="white"
              color="white"
            />
          </motion.div>

          <div className="login-eyebrow">
            <Heart size={14} fill="currentColor" />
            WELCOME TO LIFELINK
          </div>

          <h1>
            Together, we can
            <br />
            <span>save lives.</span>
          </h1>

          <p>
            Every connection matters. Sign in to continue your journey of
            helping people and making a difference in your community.
          </p>

          <div className="login-features">
            <div>
              <ShieldCheck size={21} />
              <span>Secure account access</span>
            </div>

            <div>
              <Heart size={21} />
              <span>Connected donor community</span>
            </div>

            <div>
              <Droplet size={21} />
              <span>Be someone's hope</span>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          <span>© 2026 LifeLink</span>
          <span>Made with ♥ for humanity</span>
        </div>
      </motion.section>

      {/* RIGHT PANEL */}

      <motion.section
        className="login-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <div className="login-form-container">
          <div className="login-heading">
            <span className="login-small-title">YOUR JOURNEY CONTINUES</span>

            <h2>Welcome back!</h2>

            <p>Enter your account details to sign in to LifeLink.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* EMAIL */}

            <div className="login-form-group">
              <label>Email Address</label>

              <div className="login-input-wrapper">
                <Mail size={19} />

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div className="login-form-group">
              <label>Password</label>

              <div className="login-input-wrapper">
                <Lock size={19} />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* REMEMBER ME */}

            <div className="login-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>

              <span className="forgot-password">Forgot password?</span>
            </div>

            {/* RESPONSE MESSAGE */}

            {message.text && (
              <motion.div
                className={`login-message ${message.type}`}
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

            {/* LOGIN BUTTON */}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="login-register-link">
            <p>
              Don't have an account?
              <Link to="/register"> Create Account</Link>
            </p>
          </div>

          <div className="login-secure-note">
            <ShieldCheck size={16} />
            Your information is protected and secure.
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export default Login;
