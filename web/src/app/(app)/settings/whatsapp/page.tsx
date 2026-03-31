export default function SettingsWhatsAppPage() {
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 640,
        color: "var(--text)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "Sora, sans-serif",
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        WhatsApp connection
      </h1>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        Connect your WhatsApp Business number. Meta Cloud API — direct, no BSP, no markup.
      </p>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Status
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          No number connected yet.
        </div>
        <button
          type="button"
          style={{
            marginTop: 12,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--blue)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Connect WhatsApp →
        </button>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Business profile
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)" }}>
          Set display name, description, hours, and profile photo after connecting.
        </p>
      </div>
    </div>
  );
}
