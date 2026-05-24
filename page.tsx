"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ReservationDetails } from "@/types";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const urgent = secondsLeft < 60;
  const expired = secondsLeft === 0;

  return (
    <div
      style={{
        background: expired
          ? "rgba(239,68,68,0.08)"
          : urgent
          ? "rgba(245,158,11,0.08)"
          : "rgba(34,197,94,0.06)",
        border: `1px solid ${
          expired
            ? "rgba(239,68,68,0.3)"
            : urgent
            ? "rgba(245,158,11,0.3)"
            : "rgba(34,197,94,0.2)"
        }`,
        borderRadius: "12px",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: expired ? "#ef4444" : urgent ? "#f59e0b" : "var(--text-muted)",
          marginBottom: "0.5rem",
        }}
      >
        {expired ? "Reservation Expired" : "Time Remaining"}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "3rem",
          fontWeight: 600,
          color: expired ? "#ef4444" : urgent ? "#f59e0b" : "#22c55e",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {expired
          ? "00:00"
          : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
      </div>
      {!expired && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "0.5rem",
          }}
        >
          Your unit is held until{" "}
          {new Date(expiresAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

export default function ReservationPage({
  params,
}: {
  params: { id: string };
}) {
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "confirm" | "cancel" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`);
      if (!res.ok) {
        setError("Reservation not found.");
        return;
      }
      const data = await res.json();
      setReservation(data);
    } catch {
      setError("Failed to load reservation.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReservation();
    // Poll every 5s to pick up expiry status
    const id = setInterval(fetchReservation, 5000);
    return () => clearInterval(id);
  }, [fetchReservation]);

  async function handleConfirm() {
    setError(null);
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${params.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setError("Your reservation expired before payment was confirmed.");
        } else {
          setError(data.error ?? "Failed to confirm");
        }
        await fetchReservation();
        return;
      }
      setReservation((r) => (r ? { ...r, status: "CONFIRMED" } : r));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    setError(null);
    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${params.id}/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel");
        return;
      }
      setReservation((r) => (r ? { ...r, status: "RELEASED" } : r));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          loading reservation...
        </span>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p style={{ color: "#ef4444" }}>{error ?? "Reservation not found."}</p>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          Back to products
        </button>
      </div>
    );
  }

  const isExpired =
    reservation.status === "PENDING" &&
    new Date() > new Date(reservation.expiresAt);
  const isPending = reservation.status === "PENDING" && !isExpired;

  return (
    <div className="max-w-lg mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.85rem",
          padding: 0,
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        ← Back to products
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            marginBottom: "0.25rem",
          }}
        >
          Checkout
        </h1>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
          }}
        >
          Reservation ID:{" "}
          <span style={{ color: "var(--text)" }}>{reservation.id}</span>
        </div>
      </div>

      {/* Status banner */}
      {reservation.status === "CONFIRMED" && (
        <div
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            color: "#22c55e",
            fontWeight: 600,
            marginBottom: "1.25rem",
            fontSize: "0.9rem",
          }}
        >
          ✓ Order confirmed! Your unit has been secured.
        </div>
      )}
      {reservation.status === "RELEASED" && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            color: "#ef4444",
            fontWeight: 600,
            marginBottom: "1.25rem",
            fontSize: "0.9rem",
          }}
        >
          ✕ Reservation released. The unit is back in stock.
        </div>
      )}
      {(isExpired) && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            color: "#ef4444",
            fontWeight: 600,
            marginBottom: "1.25rem",
            fontSize: "0.9rem",
          }}
        >
          ⏱ Reservation expired. Please start a new checkout.
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#ef4444",
            marginBottom: "1rem",
            fontSize: "0.85rem",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Countdown (only for pending) */}
      {isPending && (
        <div className="mb-5">
          <Countdown expiresAt={reservation.expiresAt} />
        </div>
      )}

      {/* Order summary */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          Order Summary
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "-0.02em",
                marginBottom: "2px",
              }}
            >
              {reservation.product.name}
            </div>
            <div
              style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
            >
              {reservation.product.description}
            </div>
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              color: "var(--green)",
              fontSize: "1rem",
              whiteSpace: "nowrap",
              marginLeft: "1rem",
            }}
          >
            {formatINR(reservation.product.price)}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {[
            ["Warehouse", reservation.warehouse.name],
            ["Location", reservation.warehouse.location],
            ["Units", String(reservation.units)],
            [
              "Status",
              reservation.status === "CONFIRMED"
                ? "✓ Confirmed"
                : reservation.status === "RELEASED"
                ? "✕ Released"
                : isPending
                ? "⏳ Pending"
                : "⏱ Expired",
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span
                style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "var(--text)",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={actionLoading !== null}
            style={{
              flex: 1,
              background:
                actionLoading !== null ? "var(--surface-2)" : "var(--green)",
              color: actionLoading !== null ? "var(--text-muted)" : "#000",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: actionLoading !== null ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {actionLoading === "confirm" ? "Confirming…" : "✓ Confirm Purchase"}
          </button>
          <button
            onClick={handleCancel}
            disabled={actionLoading !== null}
            style={{
              flex: 1,
              background: "transparent",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "10px",
              padding: "14px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: actionLoading !== null ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {actionLoading === "cancel" ? "Cancelling…" : "✕ Cancel"}
          </button>
        </div>
      )}

      {(reservation.status !== "PENDING" || isExpired) && (
        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          ← Back to products
        </button>
      )}
    </div>
  );
}
