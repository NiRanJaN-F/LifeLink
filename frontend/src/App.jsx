import DonorProfile from "./pages/DonorProfile";
import FindDonors from "./pages/FindDonors";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import BloodRequests from "./pages/BloodRequests";
import DonationHistory from "./pages/DonationHistory";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { motion } from "framer-motion";
import {
  Heart,
  Menu,
  Search,
  ArrowRight,
  ShieldCheck,
  Users,
  Droplet,
  Activity,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";

import "./App.css";

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// HOMEPAGE

function HomePage() {
  return (
    <div className="app">
      {/* NAVBAR */}

      <nav className="navbar">
        <a href="/" className="logo">
          <span className="logo-icon">
            <Heart fill="white" />
          </span>
          Life<span>Link</span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#donors">Find Donors</a>
          <a href="#how">How It Works</a>
        </div>

        <div className="nav-actions">
          <a href="/login" className="login-link">
            Login
          </a>

          <a href="/register" className="nav-button">
            Become a Donor
          </a>
        </div>

        <button className="mobile-menu" aria-label="Menu">
          <Menu />
        </button>
      </nav>

      {/* HERO */}

      <section className="hero" id="home">
        <div className="hero-content">
          <motion.div
            className="eyebrow"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Heart size={15} fill="currentColor" />
            EVERY DROP COUNTS
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Be someone's
            <br />
            <span>reason to</span> live.
          </motion.h1>

          <motion.p
            className="hero-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            A single donation can make an extraordinary difference. Connect with
            blood donors and help save lives in your community.
          </motion.p>

          <div className="hero-actions">
            <a href="#donors" className="primary-button">
              Find Blood Donors <ArrowRight size={18} />
            </a>

            <a href="/register" className="secondary-button">
              Become a Donor
            </a>
          </div>

          <div className="trust-line">
            <ShieldCheck size={18} />A community built on trust, care and hope.
          </div>
        </div>

        {/* HERO VISUAL */}

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="visual-circle"></div>

          <div className="blood-card">
            <div className="blood-drop">
              <Droplet size={76} fill="#e83d4b" stroke="#e83d4b" />
              <Heart size={29} fill="white" stroke="white" />
            </div>

            <div className="card-label">THE GIFT OF LIFE</div>

            <h2>
              Give Blood.
              <br />
              Give Hope.
            </h2>

            <p>Your kindness can change someone's tomorrow.</p>

            <div className="card-bottom">
              <span>
                <Heart size={15} fill="currentColor" />
                Be a lifesaver
              </span>
              <span>01 / 08</span>
            </div>
          </div>

          <div className="floating-note note-one">
            <HeartHandshake size={21} />
            <div>
              <strong>Make a difference</strong>
              <small>One donation at a time</small>
            </div>
          </div>

          <div className="floating-note note-two">
            <Activity size={21} />
            <div>
              <strong>Find a donor</strong>
              <small>Help starts here</small>
            </div>
          </div>
        </motion.div>
      </section>

      {/* STATS */}

      <section className="stats">
        <div className="stat">
          <Users />
          <div>
            <strong>Community</strong>
            <span>Connected donors</span>
          </div>
        </div>

        <div className="stat">
          <Heart />
          <div>
            <strong>Every Donation</strong>
            <span>Can make a difference</span>
          </div>
        </div>

        <div className="stat">
          <ShieldCheck />
          <div>
            <strong>Trusted Platform</strong>
            <span>Privacy-focused</span>
          </div>
        </div>
      </section>

      {/* BLOOD GROUPS */}

      <section className="blood-section" id="donors">
        <div className="section-heading">
          <div className="eyebrow">FIND YOUR MATCH</div>

          <h2>
            Find donors by <span>blood group.</span>
          </h2>

          <p>Choose a blood group to start searching for potential donors.</p>
        </div>

        <div className="blood-grid">
          {bloodGroups.map((group, index) => (
            <motion.button
              className="blood-group"
              key={group}
              whileHover={{ y: -7, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                alert(
                  `You selected ${group}. Donor search will be connected soon.`,
                )
              }
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
            >
              <Droplet size={25} />
              <strong>{group}</strong>
              <span>
                Find donors <ArrowRight size={13} />
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="how-section" id="how">
        <div className="section-heading">
          <div className="eyebrow">SIMPLE PROCESS</div>

          <h2>
            How <span>LifeLink</span> works.
          </h2>

          <p>Three simple steps to connect people and make a difference.</p>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <Search />
            <h3>Find a donor</h3>
            <p>Search potential donors by blood group and location.</p>
          </div>

          <div className="step">
            <div className="step-number">02</div>
            <HeartHandshake />
            <h3>Send a request</h3>
            <p>Submit a blood request and connect with potential donors.</p>
          </div>

          <div className="step">
            <div className="step-number">03</div>
            <Droplet />
            <h3>Make a difference</h3>
            <p>Coordinate with the donor and a licensed blood bank.</p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}

      <section className="cta" id="register">
        <div>
          <div className="eyebrow">BE THE REASON SOMEONE SMILES</div>

          <h2>
            Your one step can
            <br />
            save a life.
          </h2>

          <p>Join our donor community and help someone in need.</p>
        </div>

        <a href="/register" className="cta-button">
          Join LifeLink <ChevronRight size={19} />
        </a>
      </section>

      {/* FOOTER */}

      <footer className="footer" id="about">
        <a href="/" className="logo">
          <span className="logo-icon">
            <Heart fill="white" />
          </span>
          Life<span>Link</span>
        </a>

        <p>Connecting hearts. Supporting lives.</p>

        <span className="copyright">
          © 2026 LifeLink. College project demonstration.
        </span>
      </footer>
    </div>
  );
}

// MAIN APP ROUTING

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-donors"
          element={
            <ProtectedRoute>
              <FindDonors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donor-profile"
          element={
            <ProtectedRoute allowedRoles={["donor"]}>
              <DonorProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blood-requests"
          element={
            <ProtectedRoute>
              <BloodRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blood-request"
          element={<Navigate to="/blood-requests" replace />}
        />
        <Route
          path="/donation-history"
          element={
            <ProtectedRoute>
              <DonationHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
