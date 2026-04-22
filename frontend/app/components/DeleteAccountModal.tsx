"use client";

import { useState } from "react";
import styles from "./DeleteAccountModal.module.css";

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

type ModalStep = "password" | "confirmation" | "loading" | "error";

export default function DeleteAccountModal({
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<ModalStep>("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Password verification failed");
        setLoading(false);
        return;
      }

      setStep("confirmation");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/delete-account", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete account");
        setLoading(false);
        return;
      }

      onConfirm();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    setStep("password");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {step === "password" && (
          <>
            <h2 className={styles.title}>Delete Account</h2>
            <p className={styles.description}>
              To delete your account, please enter your password for confirmation.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                disabled={loading}
                required
              />
              {error && <p className={styles.errorMessage}>{error}</p>}
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={styles.cancelBtn}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || !password}
                >
                  {loading ? "Verifying..." : "Next"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "confirmation" && (
          <>
            <h2 className={styles.title}>Confirm Account Deletion</h2>
            <p className={styles.description}>
              Are you sure you want to delete your account? This action cannot be undone.
              All your data will be permanently removed.
            </p>
            {error && <p className={styles.errorMessage}>{error}</p>}
            <div className={styles.buttonGroup}>
              <button
                onClick={() => {
                  setStep("password");
                  setPassword("");
                  setError("");
                }}
                className={styles.cancelBtn}
                disabled={loading}
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={styles.deleteBtn}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
