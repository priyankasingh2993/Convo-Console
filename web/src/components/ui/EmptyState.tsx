interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  const content = (
    <button
      type="button"
      onClick={cta?.onClick}
      style={{
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
      {cta?.label}
    </button>
  );

  const maybeWrapped =
    cta?.href && !cta.onClick ? (
      <a
        href={cta.href}
        style={{ textDecoration: "none" }}
      >
        {content}
      </a>
    ) : (
      content
    );

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 420,
          padding: 24,
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--border2)",
        }}
      >
        <div
          style={{
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          {icon}
        </div>
        <h2
          style={{
            fontFamily: "Sora, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text2)",
            marginBottom: cta ? 16 : 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
        {cta && maybeWrapped}
      </div>
    </div>
  );
}

