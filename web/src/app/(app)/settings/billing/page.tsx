export default function SettingsBillingPage() {
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 720,
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
        Billing & plans
      </h1>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        No message limits. Upgrade when you&apos;re ready.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { name: "Starter", price: "₹999/mo", desc: "1 number, 3 agents" },
          { name: "Growth ⭐", price: "₹2,499/mo", desc: "3 numbers, 10 agents" },
          { name: "Scale", price: "₹5,999/mo", desc: "Unlimited numbers" },
          { name: "Enterprise", price: "Custom", desc: "Dedicated support" },
        ].map((plan) => (
          <div
            key={plan.name}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 600, marginBottom: 4 }}>
              {plan.name}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--blue-light)", marginBottom: 4 }}>
              {plan.price}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{plan.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "var(--surface2)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--text2)",
        }}
      >
        <strong style={{ color: "var(--text)" }}>Current plan:</strong> Trial (14 days). Upgrade before expiry to keep access.
      </div>
    </div>
  );
}
