"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { TrialBadge } from "./TrialBadge";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
  tooltip?: string;
}

const core: NavItem[] = [
  { href: "/inbox", label: "Inbox", icon: "💬" },
  { href: "/broadcast", label: "Broadcast", icon: "📢" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
];

const tools: NavItem[] = [
  { href: "/playbooks", label: "Playbooks", icon: "🤖" },
  {
    href: "/flows",
    label: "Flow Builder",
    icon: "⚡",
    disabled: true,
    tooltip: "Coming in Month 2",
  },
];

const analytics: NavItem[] = [
  { href: "/analytics/fas", label: "FAS Score", icon: "📊" },
  {
    href: "/analytics/campaigns",
    label: "Campaign Analytics",
    icon: "📈",
    disabled: true,
    tooltip: "Coming in Month 2",
  },
];

const pipeline: NavItem[] = [
  {
    href: "/pipeline",
    label: "Lead Pipeline",
    icon: "🏠",
    disabled: true,
    tooltip: "Coming in Month 3",
  },
];

const settings: NavItem[] = [
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "var(--text3)",
        padding: "12px 8px 5px",
      }}
    >
      {children}
    </div>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = !item.disabled && pathname.startsWith(item.href);

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 9px",
    borderRadius: 8,
    cursor: item.disabled ? "not-allowed" : "pointer",
    marginBottom: 1,
    textDecoration: "none",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 12,
    color: "var(--text2)",
    opacity: item.disabled ? 0.4 : 1,
    background: active ? "var(--blue-dim)" : "transparent",
  };

  const content = (
    <div style={baseStyle}>
      <span
        style={{
          fontSize: 15,
          width: 18,
          textAlign: "center",
        }}
      >
        {item.icon}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: active ? "var(--blue-light)" : "var(--text2)",
        }}
      >
        {item.label}
      </span>
    </div>
  );

  if (item.disabled) {
    return (
      <div title={item.tooltip}>
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href}>{content}</Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sessionClaims } = useAuth() as any;
  const { user } = useUser();

  const orgMeta = (sessionClaims?.org_metadata ?? {}) as any;
  const orgName: string = orgMeta?.name ?? "Workspace";
  const plan: string = orgMeta?.plan ?? "trial";
  const trialStartDate: string | undefined = orgMeta?.trialStartDate;

  const orgInitials = orgName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const userName = user?.fullName ?? user?.username ?? "User";
  const role = orgMeta?.role ?? "Admin";

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "18px 14px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "var(--blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 16,
          }}
        >
          💬
        </div>
        <span
          style={{
            fontFamily: "Sora, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.3px",
          }}
        >
          Convo
        </span>
      </div>

      {/* Workspace switcher */}
      <div
        style={{
          margin: "10px 9px",
          padding: "7px 9px",
          borderRadius: 8,
          background: "var(--surface2)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background:
              "linear-gradient(135deg, var(--blue), #7B5EA7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {orgInitials}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {orgName}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "var(--text3)",
          }}
        >
          ▾
        </span>
      </div>

      {/* Nav */}
      <div
        style={{
          flex: 1,
          padding: "6px 9px",
          overflowY: "auto",
        }}
      >
        <SectionLabel>Core</SectionLabel>
        {core.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <SectionLabel>Tools</SectionLabel>
        {tools.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <SectionLabel>Analytics</SectionLabel>
        {analytics.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <SectionLabel>Pipeline</SectionLabel>
        {pipeline.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <SectionLabel>Settings</SectionLabel>
        {settings.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Bottom: trial + user */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 9px",
        }}
      >
        <TrialBadge trialStartDate={trialStartDate} plan={plan} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 9px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--blue), #9B59B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {userName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text3)",
              }}
            >
              {role}
            </div>
          </div>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--green)",
              border: "2px solid var(--surface)",
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}

