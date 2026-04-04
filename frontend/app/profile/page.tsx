"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5000";

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
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login?message=Please log in to view your profile.");
      return;
    }

    fetch(`${API_URL}/profile`, {
      credentials: "include",
    })
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
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // proceed with client-side logout even if request fails
    }
    localStorage.removeItem("user");
    router.push("/login");
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
          <ProfileField label="Email" value={profile.email} />
          <ProfileField label="Phone" value={profile.phone} />
          <ProfileField label="Member Since" value={profile.memberSince} />
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Log Out
        </button>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
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
  },
  fieldLabel: {
    fontWeight: 600,
    color: "var(--foreground)",
    opacity: 0.8,
    fontSize: "0.95rem",
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
};
