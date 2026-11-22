import { useState, useEffect, useRef } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import api from "../services/api";
import {
  Heart,
  LayoutDashboard,
  Search,
  Droplet,
  ClipboardList,
  History,
  User,
  LogOut,
  Bell,
  PlusCircle,
  Users,
  Activity,
  ArrowRight,
  CheckCheck,
  Check,
  Clock,
  Inbox,
} from "lucide-react";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("lifelink_user") ||
      sessionStorage.getItem("lifelink_user") ||
      "{}",
  );

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifDropdownRef = useRef(null);

  // Initial notifications load
  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const res = await api.get("/notifications");
        if (isMounted && res.data?.success) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(Number(res.data.unread_count || 0));
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch notifications:", err);
        }
      } finally {
        if (isMounted) {
          setLoadingNotifications(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  // Click outside listener for notifications popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.patch(`/notifications/${notifId}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notifId ? { ...n, is_read: 1 } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.patch("/notifications/read-all");
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Relative timestamp formatter
  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleLogout = () => {
    localStorage.removeItem("lifelink_token");
    localStorage.removeItem("lifelink_user");
    sessionStorage.removeItem("lifelink_token");
    sessionStorage.removeItem("lifelink_user");

    navigate("/login");
  };

  return (
    <div className="dashboard">
      {/* SIDEBAR */}

      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <span>
            <Heart fill="white" />
          </span>
          LifeLink
        </div>

        <p className="sidebar-heading">MAIN MENU</p>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <LayoutDashboard /> Dashboard
          </NavLink>

          <NavLink
            to="/find-donors"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Search /> Find Blood Donors
          </NavLink>

          <NavLink
            to="/blood-requests"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Droplet /> Blood Requests
          </NavLink>

          <NavLink
            to="/donation-history"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <History /> Donation History
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <User /> My Profile
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout}>
            <LogOut /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="dashboard-main">
        {/* TOP BAR */}

        <header className="dashboard-topbar">
          <div>
            <h2>Dashboard</h2>
            <p>LifeLink Blood Donation Management</p>
          </div>

          <div className="dashboard-user">
            <div className="notification-wrapper" ref={notifDropdownRef}>
              <button
                className={`notification-button ${showNotifications ? "active" : ""}`}
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-dropdown-header">
                    <div className="notif-header-title">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="notif-unread-pill">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        className="notif-mark-all-btn"
                        onClick={handleMarkAllAsRead}
                        title="Mark all as read"
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notifications-list">
                    {loadingNotifications && notifications.length === 0 ? (
                      <div className="notif-loading">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Inbox size={32} color="#a0aec0" />
                        <p>No notifications yet</p>
                        <small>You'll be notified when donors respond to your requests</small>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.notification_id}
                          className={`notification-item ${notif.is_read ? "read" : "unread"}`}
                          onClick={() => {
                            if (!notif.is_read) {
                              handleMarkAsRead(notif.notification_id);
                            }
                          }}
                        >
                          {!notif.is_read && <span className="unread-dot" />}
                          <div className="notif-content">
                            <p className="notif-message">{notif.message}</p>
                            <span className="notif-time">
                              <Clock size={12} />
                              {formatNotificationTime(notif.created_at)}
                            </span>
                          </div>
                          {!notif.is_read && (
                            <button
                              className="notif-single-read-btn"
                              onClick={(e) => handleMarkAsRead(notif.notification_id, e)}
                              title="Mark as read"
                              aria-label="Mark notification as read"
                            >
                              <Check size={13} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-avatar">
              <User />
            </div>

            <div>
              <strong>{user.full_name || "LifeLink User"}</strong>
              <span>{user.role || "user"}</span>
            </div>
          </div>
        </header>

        {/* WELCOME */}

        <section className="welcome-card" id="overview">
          <div>
            <span className="welcome-label">WELCOME TO LIFELINK</span>

            <h1>Hello, {user.full_name || "there"}!</h1>

            <p>Every drop counts. Together, we can help save lives.</p>

            <button onClick={() => navigate("/register")}>
              Explore LifeLink <ArrowRight size={17} />
            </button>
          </div>

          <div className="welcome-icon">
            <Heart fill="white" />
          </div>
        </section>

        {/* STATISTICS */}

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="stat-icon red">
              <Users />
            </div>
            <div>
              <span>Available Donors</span>
              <h2>--</h2>
              <small>Donor search coming soon</small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon orange">
              <Droplet />
            </div>
            <div>
              <span>Blood Requests</span>
              <h2>0</h2>
              <small>Your requests</small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon green">
              <Heart />
            </div>
            <div>
              <span>Successful Donations</span>
              <h2>0</h2>
              <small>Your donation records</small>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon blue">
              <Activity />
            </div>
            <div>
              <span>Account Status</span>
              <h2 className="status-active">Active</h2>
              <small>Your account is active</small>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section className="quick-actions">
          <div className="dashboard-section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>What would you like to do today?</p>
            </div>
          </div>

          <div className="action-grid">
            <button
              className="action-card"
              onClick={() => navigate("/find-donors")}
            >
              <div className="action-icon">
                <Search />
              </div>
              <h3>Find Blood Donors</h3>
              <p>Search donors by blood group and location.</p>
              <span>
                Explore <ArrowRight />
              </span>
            </button>

            <button
              className="action-card"
              onClick={() => navigate("/blood-requests")}
            >
              <div className="action-icon">
                <PlusCircle />
              </div>
              <h3>Request Blood</h3>
              <p>Create a new blood request when needed.</p>
              <span>
                Create request <ArrowRight />
              </span>
            </button>
            {user.role === "donor" && (
              <button
                className="action-card"
                onClick={() => navigate("/donor-profile")}
              >
                <div className="action-icon">
                  <Heart />
                </div>

                <h3>Create Donor Profile</h3>

                <p>
                  Complete your blood group, age and location to become a donor.
                </p>

                <span>
                  Create Profile <ArrowRight />
                </span>
              </button>
            )}

            <button
              className="action-card"
              onClick={() => navigate("/profile")}
            >
              <div className="action-icon">
                <User />
              </div>
              <h3>My Profile</h3>
              <p>View and manage your account information.</p>
              <span>
                View profile <ArrowRight />
              </span>
            </button>
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="recent-activity">
          <div className="dashboard-section-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Your latest blood donation activities.</p>
            </div>
          </div>

          <div className="empty-activity">
            <div>
              <ClipboardList />
            </div>
            <h3>No activity yet</h3>
            <p>Your blood requests and donation history will appear here.</p>
          </div>
        </section>

        <footer className="dashboard-footer">
          © 2026 LifeLink. Connecting hearts. Supporting lives.
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
