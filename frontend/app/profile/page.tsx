"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteAccountModal from "@/app/components/DeleteAccountModal";

const API_URL = "/api";

interface ProfileData {
  username: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  memberSince: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Email edit state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  // Password edit state
const [editingPassword, setEditingPassword] = useState(false);
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
const [passwordSaving, setPasswordSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login?message=Please log in to view your profile.");
      return;
    }

    fetch(`${API_URL}/profile`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("user");
          router.push("/login?message=Please log in to view your profile.");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {
        setError("Unable to load profile. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" });
    } catch {
      // proceed with client-side logout even if request fails
    }
    localStorage.removeItem("user");
    router.push("/login");
  };
  

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleEmailEdit = () => {
    setNewEmail("");
    setEmailError("");
    setEmailSuccess("");
    setEditingEmail(true);
  };

  const handleEmailCancel = () => {
    setEditingEmail(false);
    setNewEmail("");
    setEmailError("");
  };

  const handleEmailSave = async () => {
    const trimmed = newEmail.trim();

    if (!trimmed) {
      setEmailError("Email cannot be empty.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (trimmed.toLowerCase() === profile?.email?.toLowerCase()) {
      setEmailError("New email must be different from your current email.");
      return;
    }

    setEmailSaving(true);
    setEmailError("");

    try {
      const res = await fetch(`${API_URL}/profile/email`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 401) {
        localStorage.removeItem("user");
        router.push("/login?message=Please log in to view your profile.");
        return;
      }

      if (res.status === 409) {
        setEmailError("This email is already in use by another account.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEmailError(body?.message || "Failed to update email. Please try again.");
        return;
      }

      setProfile((prev) => prev ? { ...prev, email: trimmed } : prev);
      setEditingEmail(false);
      setNewEmail("");
      setEmailSuccess("Email updated successfully.");
      setTimeout(() => setEmailSuccess(""), 4000);
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailSaving(false);
    }
  };
  const handlePasswordEdit = () => {
  setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  setPasswordError(""); setPasswordSuccess("");
  setEditingPassword(true);
};

const handlePasswordCancel = () => {
  setEditingPassword(false);
  setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  setPasswordError("");
};

const handlePasswordSave = async () => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    setPasswordError("All fields are required."); return;
  }
  if (newPassword.length < 6) {
    setPasswordError("New password must be at least 6 characters."); return;
  }
  if (newPassword !== confirmPassword) {
    setPasswordError("Passwords do not match."); return;
  }

  setPasswordSaving(true);
  setPasswordError("");

  try {
    const res = await fetch(`${API_URL}/profile/password`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      // distinguish session expiry vs wrong password
      if (body?.error === "Current password is incorrect") {
        setPasswordError("Current password is incorrect."); return;
      }
      localStorage.removeItem("user");
      router.push("/login?message=Please log in to view your profile.");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPasswordError(body?.error || "Failed to update password."); return;
    }

    setEditingPassword(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
    setTimeout(() => setPasswordSuccess(""), 4000);
  } catch {
    setPasswordError("Network error. Please try again.");
  } finally {
    setPasswordSaving(false);
  }
};

  const handleDeleteConfirmed = () => {
    localStorage.removeItem("user");
    router.push("/login?message=Account deleted successfully.");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }


  if (!profile) return null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Profile Overview</h1>

        <div style={styles.infoSection}>
          <ProfileField label="Username" value={profile.username} />
          <ProfileField label="Full Name" value={profile.fullName} />

          {/* Email row with inline editing */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Email</span>

            {editingEmail ? (
              <div style={styles.emailEditGroup}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEmailSave();
                    if (e.key === "Escape") handleEmailCancel();
                  }}
                  placeholder="Enter new email"
                  style={{
                    ...styles.emailInput,
                    ...(emailError ? styles.emailInputError : {}),
                  }}
                  autoFocus
                  disabled={emailSaving}
                />
                <div style={styles.emailActions}>
                  <button
                    onClick={handleEmailSave}
                    disabled={emailSaving}
                    style={styles.saveBtn}
                  >
                    {emailSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleEmailCancel}
                    disabled={emailSaving}
                    style={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
                {emailError && <p style={styles.emailErrorText}>{emailError}</p>}
              </div>
            ) : (
              <div style={styles.emailDisplay}>
                <span style={profile.email ? styles.fieldValue : styles.fieldPlaceholder}>
                  {profile.email || "Not provided"}
                </span>
                <button onClick={handleEmailEdit} style={styles.editBtn}>
                  Edit
                </button>
              </div>
            )}
          </div>

          {emailSuccess && (<p style={styles.emailSuccessText}>✓ {emailSuccess}</p>)}

          {/* Password row */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Password</span>

            {editingPassword ? (
              <div style={styles.emailEditGroup}>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                  placeholder="Current password"
                  style={styles.emailInput}
                  autoFocus
                  disabled={passwordSaving}
                />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
        placeholder="New password (min 6 chars)"
        style={{ ...styles.emailInput, ...(passwordError ? styles.emailInputError : {}) }}
        disabled={passwordSaving}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
        onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSave(); if (e.key === "Escape") handlePasswordCancel(); }}
        placeholder="Confirm new password"
        style={{ ...styles.emailInput, ...(passwordError ? styles.emailInputError : {}) }}
        disabled={passwordSaving}
      />
      <div style={styles.emailActions}>
        <button onClick={handlePasswordSave} disabled={passwordSaving} style={styles.saveBtn}>
          {passwordSaving ? "Saving..." : "Save"}
        </button>
        <button onClick={handlePasswordCancel} disabled={passwordSaving} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
      {passwordError && <p style={styles.emailErrorText}>{passwordError}</p>}
    </div>
  ) : (
    <div style={styles.emailDisplay}>
      <span style={styles.fieldValue}>••••••••</span>
      <button onClick={handlePasswordEdit} style={styles.editBtn}>Edit</button>
    </div>
  )}
</div>

{passwordSuccess && (
  <p style={styles.emailSuccessText}>✓ {passwordSuccess}</p>
)}

          <ProfileField label="Phone" value={profile.phone} />
          <ProfileField label="Member Since" value={profile.memberSince} />
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Log Out
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          style={styles.deleteBtn}
        >
          Delete Account
        </button>

        {showDeleteModal && (
          <DeleteAccountModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConfirmed}
          />
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <span style={value ? styles.fieldValue : styles.fieldPlaceholder}>
        {value || "Not provided"}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 16px",
    minHeight: "calc(100vh - 56px)",
  },
  card: {
    background: "var(--background)",
    borderRadius: "12px",
    padding: "40px 48px",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center" as const,
  },
  heading: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "var(--foreground)",
    marginBottom: "24px",
    padding: "8px 24px",
    border: "1px solid rgba(128,128,128,0.3)",
    borderRadius: "6px",
    display: "inline-block",
  },
  infoSection: {
    textAlign: "left" as const,
    marginBottom: "28px",
  },
  field: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid rgba(128,128,128,0.3)",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  fieldLabel: {
    fontWeight: 600,
    color: "var(--foreground)",
    opacity: 0.8,
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  fieldValue: {
    color: "var(--foreground)",
    fontSize: "0.95rem",
  },
  fieldPlaceholder: {
    color: "#9ca3af",
    fontStyle: "italic",
    fontSize: "0.95rem",
  },
  // Email display (read mode)
  emailDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  editBtn: {
    padding: "3px 10px",
    fontSize: "0.8rem",
    fontWeight: 600,
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    borderRadius: "4px",
    cursor: "pointer",
    lineHeight: 1.4,
  },
  // (edit mode)
  emailEditGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  emailInput: {
    width: "100%",
    padding: "7px 10px",
    fontSize: "0.9rem",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(128,128,128,0.4)",
    borderRadius: "5px",
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  emailInputError: {
    borderColor: "#dc2626",
  },
  emailActions: {
    display: "flex",
    gap: "8px",
  },
  saveBtn: {
    padding: "6px 16px",
    fontSize: "0.85rem",
    fontWeight: 600,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 14px",
    fontSize: "0.85rem",
    fontWeight: 500,
    backgroundColor: "transparent",
    color: "var(--foreground)",
    border: "1px solid rgba(128,128,128,0.4)",
    borderRadius: "5px",
    cursor: "pointer",
  },
  emailErrorText: {
    color: "#dc2626",
    fontSize: "0.82rem",
    margin: 0,
  },
  emailSuccessText: {
    color: "#16a34a",
    fontSize: "0.85rem",
    margin: "4px 0 0 0",
    textAlign: "left" as const,
  },
  // General
  loadingText: {
    color: "#6b7280",
    fontSize: "1rem",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "1rem",
  },
  logoutBtn: {
    padding: "10px 32px",
    fontSize: "0.95rem",
    fontWeight: 600,
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteBtn: {
    marginLeft: "12px",
    padding: "10px 32px",
    fontSize: "0.95rem",
    fontWeight: 600,
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "1px solid #dc2626",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
