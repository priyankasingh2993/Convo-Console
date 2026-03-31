"use client";

import Link from "next/link";

interface TrialBadgeProps {
  trialStartDate?: string;
  plan?: string;
}

export function TrialBadge({ trialStartDate, plan }: TrialBadgeProps) {
  if (plan !== "trial" || !trialStartDate) return null;

  const start = new Date(trialStartDate);
  if (Number.isNaN(start.getTime())) return null;

  const daysSince = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1
  );

  let color = "var(--amber)";
  let label = `Day ${daysSince} of 14 — Trial`;

  if (daysSince >= 14) {
    color = "var(--red)";
    label = "Trial expired";
  }

  const showUpgradeNudge = daysSince >= 11 && daysSince < 14;

  return (
    <Link
      href="/settings/billing"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 8,
        background: "var(--surface2)",
        border: "1px solid var(--border2)",
        color,
        fontSize: 11,
        fontWeight: 600,
        textDecoration: "none",
        marginBottom: 8,
      }}
    >
      <span>{label}</span>
      {showUpgradeNudge && (
        <span style={{ color: "var(--blue-light)", fontWeight: 700 }}>
          Upgrade →
        </span>
      )}
    </Link>
  );
}

