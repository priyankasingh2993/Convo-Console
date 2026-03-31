export default function DashboardPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--midnight)",
      color: "var(--text)",
      fontFamily: "DM Sans, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 12,
        padding: 32,
        maxWidth: 480,
        textAlign: "center",
      }}>
        <div style={{
          width: 48,
          height: 48,
          background: "var(--blue)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontFamily: "Sora, sans-serif",
          fontWeight: 700,
          fontSize: 20,
        }}>
          C
        </div>
        <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
          Inbox, Broadcast, Contacts, and more will go here (Month 1 build order).
        </p>
        <a
          href="/onboarding"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            borderRadius: 8,
            background: "var(--blue)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to onboarding
        </a>
      </div>
    </div>
  );
}
