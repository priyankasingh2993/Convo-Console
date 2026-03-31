"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const INDUSTRIES = [
  { id: "real_estate", name: "Real Estate", sub: "Brokers & developers", icon: "🏠" },
  { id: "d2c", name: "D2C / E-commerce", sub: "Product & retail brands", icon: "📦" },
  { id: "education", name: "Education & Coaching", sub: "Institutes & online coaches", icon: "🎓" },
  { id: "healthcare", name: "Healthcare", sub: "Clinics & wellness", icon: "🏥" },
  { id: "fb", name: "F&B", sub: "Restaurants & cloud kitchens", icon: "🍽️" },
  { id: "financial", name: "Financial Services", sub: "Banks & NBFCs", icon: "🏦" },
  { id: "travel", name: "Travel", sub: "Tours & hospitality", icon: "✈️" },
  { id: "other", name: "Other", sub: "Finance, travel & more", icon: "🏢" },
] as const;

const GOALS = [
  { id: "sales", name: "Generate & convert more leads", sub: "Sales mode — lead qualification, follow-ups, pipeline tracking", icon: "🎯" },
  { id: "marketing", name: "Market to existing customers", sub: "Marketing mode — broadcasts, drip campaigns, re-engagement", icon: "📣" },
  { id: "support", name: "Provide faster customer support", sub: "Support mode — shared inbox, auto-replies, agent routing", icon: "💬" },
  { id: "commerce", name: "Take orders & collect payments", sub: "Commerce mode — catalogue, UPI links, order management", icon: "💳" },
  { id: "all", name: "All of the above", sub: "Full platform — we'll activate everything, Sales first", icon: "✨" },
] as const;

const TEAM_SIZES = [
  { id: "solo", name: "Just me", sub: "Solo founder or agent", icon: "🧑" },
  { id: "2_5", name: "2 – 5", sub: "Small team", icon: "👥" },
  { id: "6_20", name: "6 – 20", sub: "Growing team", icon: "🏢" },
  { id: "20_plus", name: "20+", sub: "Large or enterprise", icon: "🏗️" },
] as const;

const SWITCH_TOOLS = [
  { id: "wati", name: "Wati" },
  { id: "interakt", name: "Interakt" },
  { id: "aisensy", name: "AiSensy" },
  { id: "gallabox", name: "Gallabox" },
  { id: "other", name: "Other" },
] as const;

const COACH_CONTENT: Record<string, { title: string; steps: { title: string; desc: string; cta: string }[] }> = {
  sales: {
    title: "Qualify 47 waiting leads in 5 min",
    steps: [
      { title: "Send your first broadcast", desc: "A lead follow-up template is ready. Review and send to 47 contacts in one click.", cta: "Send broadcast →" },
      { title: "Activate AI lead qualifier", desc: "When leads reply, AI qualifies them automatically in Hinglish.", cta: "Activate AI →" },
      { title: "Connect your WhatsApp number", desc: "Takes 2 minutes. Direct Meta Cloud API — no BSP needed.", cta: "Connect number →" },
    ],
  },
  marketing: {
    title: "Send your first campaign in 2 min",
    steps: [
      { title: "Launch pre-filled promo template", desc: "Send to your contacts with one click.", cta: "Launch campaign →" },
      { title: "Set up a drip sequence", desc: "Automate follow-ups for non-responders.", cta: "Set up drip →" },
      { title: "Review campaign analytics", desc: "See opens, clicks, and replies in real time.", cta: "View analytics →" },
    ],
  },
  support: {
    title: "Activate AI auto-reply in 60 sec",
    steps: [
      { title: "Turn on AI out-of-hours responder", desc: "AI answers FAQs when your team is offline.", cta: "Turn on AI →" },
      { title: "Set keyword-based routing rules", desc: "Route conversations to the right agent.", cta: "Set routing →" },
      { title: "Invite your team members", desc: "Share the inbox and assign conversations.", cta: "Invite team →" },
    ],
  },
  commerce: {
    title: "Collect your first payment in WA",
    steps: [
      { title: "Send a UPI payment link to a contact", desc: "Request payment directly in chat.", cta: "Send link →" },
      { title: "Add products to catalogue", desc: "Let customers browse and order in WhatsApp.", cta: "Add products →" },
      { title: "Set up order confirmation flow", desc: "Auto-confirm orders and send updates.", cta: "Set up flow →" },
    ],
  },
  all: {
    title: "Your full platform is ready 🚀",
    steps: [
      { title: "Send your first broadcast", desc: "Sales mode active first. Template ready.", cta: "Send broadcast →" },
      { title: "Activate AI auto-reply", desc: "Qualify leads and answer FAQs automatically.", cta: "Activate AI →" },
      { title: "Set up a payment link", desc: "Collect payments in-chat with UPI.", cta: "Set up payment →" },
    ],
  },
};

type IndustryId = (typeof INDUSTRIES)[number]["id"];
type GoalId = (typeof GOALS)[number]["id"];
type TeamId = (typeof TEAM_SIZES)[number]["id"];
type ToolId = (typeof SWITCH_TOOLS)[number]["id"];

const INDUSTRY_LABELS: Record<IndustryId, string> = {
  real_estate: "Real Estate",
  d2c: "D2C / E-commerce",
  education: "Education & Coaching",
  healthcare: "Healthcare",
  fb: "F&B",
  financial: "Financial Services",
  travel: "Travel",
  other: "Other",
};

const GOAL_LABELS: Record<GoalId, string> = {
  sales: "Sales",
  marketing: "Marketing",
  support: "Support",
  commerce: "Commerce",
  all: "Full platform",
};

export default function OnboardingClient() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [teamSize, setTeamSize] = useState<TeamId | null>(null);
  const [isSwitching, setIsSwitching] = useState<boolean | null>(null);
  const [switchingTool, setSwitchingTool] = useState<ToolId | null>(null);
  const [ownerPhone, setOwnerPhone] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [showCoach, setShowCoach] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const phoneDigits = ownerPhone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;
  const phoneAllowNext = ownerPhone === "" || phoneValid;

  const canNext =
    (step === 1 && industry) ||
    (step === 2 && goal) ||
    (step === 3 && teamSize) ||
    (step === 4 && isSwitching !== null && (isSwitching === false || switchingTool)) ||
    (step === 5 && phoneAllowNext);

  const startLoading = () => {
    setStep(0);
    setLoadingStep(1);
    const t2 = setTimeout(() => setLoadingStep(2), 1200);
    const t3 = setTimeout(() => setLoadingStep(3), 2400);
    const t4 = setTimeout(() => setLoadingStep(4), 3600);
    const t5 = setTimeout(() => {
      setShowCoach(true);
    }, 5200);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
      if (step === 4 && isSwitching) setSwitchingTool(null);
      return;
    }
    startLoading();
  };

  const handleSkipPhone = () => {
    setOwnerPhone("");
    startLoading();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  const industryPayloadMap: Record<IndustryId, string> = {
    real_estate: "realestate",
    d2c: "d2c",
    education: "education",
    healthcare: "healthcare",
    fb: "fnb",
    financial: "financial",
    travel: "travel",
    other: "other",
  };

  const teamSizePayloadMap: Record<TeamId, string> = {
    solo: "solo",
    "2_5": "2-5",
    "6_20": "6-20",
    "20_plus": "20+",
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      if (apiBase) {
        await fetch(`${apiBase}/api/onboarding/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            industry: industry ? industryPayloadMap[industry] : null,
            goal: goal ?? null,
            teamSize: teamSize ? teamSizePayloadMap[teamSize] : null,
            tool: isSwitching ? switchingTool ?? "other" : "fresh",
            switcherTool: isSwitching ? switchingTool ?? null : null,
            ownerPhone: phoneValid ? `+91${phoneDigits}` : null,
          }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      router.push("/inbox");
    }
  };

  if (showCoach) {
    const coach = COACH_CONTENT[goal || "all"];
    return (
      <div className="ob" style={styles.ob}>
        <div className="ob-bg" style={styles.obBg}>
          <div className="blob blob1" style={{ ...styles.blob, ...styles.blob1 }} />
          <div className="blob blob2" style={{ ...styles.blob, ...styles.blob2 }} />
        </div>
        <div className="ob-logo" style={styles.obLogo}>
          <div className="ob-logo-mark" style={styles.obLogoMark}>C</div>
          <span>Convo</span>
        </div>
        <div className="ob-card" style={styles.obCard}>
          <div className="coach-header" style={styles.coachHeader}>
            <div className="ob-tag" style={styles.obTag}>Your first win in 5 minutes 🚀</div>
            <h1 className="coach-title" style={styles.coachTitle}>{coach.title}</h1>
            <p className="coach-sub" style={styles.coachSub}>
              {goal === "sales" && "You have 47 uncontacted leads from last week. Here's how to reach them in 5 minutes."}
              {goal === "marketing" && "Launch your first campaign and see opens and replies in minutes."}
              {goal === "support" && "Turn on AI so customers get instant answers even when you're offline."}
              {goal === "commerce" && "Send a payment link and collect your first in-chat payment today."}
              {(goal === "all" || !goal) && "Your full platform is ready. Start with a broadcast, then AI and payments."}
            </p>
          </div>
          <div className="coach-steps" style={styles.coachSteps}>
            {coach.steps.map((s, i) => (
              <div key={i} className="coach-step" style={styles.coachStep}>
                <div className="coach-step-num" style={styles.coachStepNum}>{i + 1}</div>
                <div className="coach-step-info" style={styles.coachStepInfo}>
                  <div className="coach-step-title" style={styles.coachStepTitle}>{s.title}</div>
                  <div className="coach-step-desc" style={styles.coachStepDesc}>{s.desc}</div>
                  <div className="coach-step-action" style={styles.coachStepAction}>{s.cta}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="coach-start-btn"
            style={styles.coachStartBtn}
            onClick={handleComplete}
            disabled={submitting}
          >
            {submitting ? "Finishing setup…" : "Go to my dashboard →"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 0 && loadingStep > 0) {
    const step1Text = `Activating ${INDUSTRY_LABELS[industry || "other"]} playbook`;
    const step2Text = `Loading ${GOAL_LABELS[goal || "all"]}-specific templates`;
    const step3Text = isSwitching
      ? `Preparing your migration from ${SWITCH_TOOLS.find((t) => t.id === switchingTool)?.name || "your tool"}`
      : "Configuring AI tone for your team";
    const steps = [
      { icon: "🏠", text: step1Text, show: loadingStep >= 1, done: loadingStep > 1 },
      { icon: "🤖", text: step2Text, show: loadingStep >= 2, done: loadingStep > 2 },
      { icon: "📋", text: step3Text, show: loadingStep >= 3, done: loadingStep > 3 },
      { icon: "✅", text: "Workspace ready!", show: loadingStep >= 4, done: true },
    ];
    return (
      <div className="ob" style={styles.ob}>
        <div className="ob-bg" style={styles.obBg}>
          <div className="blob blob1" style={{ ...styles.blob, ...styles.blob1 }} />
          <div className="blob blob2" style={{ ...styles.blob, ...styles.blob2 }} />
        </div>
        <div className="ob-logo" style={styles.obLogo}>
          <div className="ob-logo-mark" style={styles.obLogoMark}>C</div>
          <span>Convo</span>
        </div>
        <div className="ob-card" style={styles.obCard}>
          <div id="ob-load" className="on" style={styles.load}>
            <div className="load-ring" style={styles.loadRing} />
            <div className="load-title" style={styles.loadTitle}>Setting up your workspace…</div>
            <div className="load-sub" style={styles.loadSub}>Personalising everything for you</div>
            <div className="load-steps" style={styles.loadSteps}>
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`load-step ${s.show ? "show" : ""} ${s.done ? "done" : ""}`}
                  style={{
                    ...styles.loadStep,
                    opacity: s.show ? 1 : 0,
                    transform: s.show ? "translateX(0)" : "translateX(-6px)",
                    color: s.done ? "var(--green)" : "var(--text2)",
                  }}
                >
                  <span className="load-step-ico">{s.icon}</span>
                  {s.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayStep = step <= 0 ? 4 : step > 4 ? 4 : step;

  return (
    <div className="ob" style={styles.ob}>
      <div className="ob-bg" style={styles.obBg}>
        <div className="blob blob1" style={{ ...styles.blob, ...styles.blob1 }} />
        <div className="blob blob2" style={{ ...styles.blob, ...styles.blob2 }} />
      </div>
      <div className="ob-logo" style={styles.obLogo}>
        <div className="ob-logo-mark" style={styles.obLogoMark}>C</div>
        <span>Convo</span>
      </div>
        <div className="ob-card" style={styles.obCard}>
          <div className="ob-prog" style={styles.obProg}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`ob-dot ${displayStep >= s ? (displayStep > s ? "done" : "active") : ""}`}
                style={{
                  ...styles.obDot,
                  background:
                    displayStep > s ? "var(--green)" : displayStep === s ? "var(--blue)" : "var(--surface3)",
                }}
              />
            ))}
          </div>

        {step === 1 && (
          <div className="ob-step on" style={styles.obStep}>
            <div className="ob-tag" style={styles.obTag}>Step 1 of 4</div>
            <h2 className="ob-q" style={styles.obQ}>What industry are you in?</h2>
            <p className="ob-hint" style={styles.obHint}>
              We&apos;ll load the right playbook, templates, and flows for your business.
            </p>
            <div className="ob-opts" style={styles.obOpts}>
              {INDUSTRIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ob-opt ${industry === opt.id ? "sel" : ""}`}
                  style={{
                    ...styles.obOpt,
                    borderColor: industry === opt.id ? "var(--blue)" : "var(--border2)",
                    background: industry === opt.id ? "var(--blue-dim)" : "var(--surface2)",
                    color: industry === opt.id ? "var(--text)" : "var(--text2)",
                  }}
                  onClick={() => setIndustry(opt.id)}
                >
                  <span className="ob-opt-ico">{opt.icon}</span>
                  <div>
                    <div className="ob-opt-name" style={styles.obOptName}>{opt.name}</div>
                    <div className="ob-opt-sub" style={styles.obOptSub}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step on" style={styles.obStep}>
            <div className="ob-tag" style={styles.obTag}>Step 2 of 4</div>
            <h2 className="ob-q" style={styles.obQ}>What do you want from WhatsApp?</h2>
            <p className="ob-hint" style={styles.obHint}>
              This sets your primary workspace mode and activates the most relevant features from day one.
            </p>
            <div className="ob-opts single" style={{ ...styles.obOpts, gridTemplateColumns: "1fr" }}>
              {GOALS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ob-opt ${goal === opt.id ? "sel" : ""}`}
                  style={{
                    ...styles.obOpt,
                    borderColor: goal === opt.id ? "var(--blue)" : "var(--border2)",
                    background: goal === opt.id ? "var(--blue-dim)" : "var(--surface2)",
                    color: goal === opt.id ? "var(--text)" : "var(--text2)",
                  }}
                  onClick={() => setGoal(opt.id)}
                >
                  <span className="ob-opt-ico">{opt.icon}</span>
                  <div>
                    <div className="ob-opt-name" style={styles.obOptName}>{opt.name}</div>
                    <div className="ob-opt-sub" style={styles.obOptSub}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="ob-step on" style={styles.obStep}>
            <div className="ob-tag" style={styles.obTag}>Step 3 of 4</div>
            <h2 className="ob-q" style={styles.obQ}>How many people will use Convo?</h2>
            <p className="ob-hint" style={styles.obHint}>
              We&apos;ll recommend the right plan and pre-configure your agent seats.
            </p>
            <div className="ob-opts" style={styles.obOpts}>
              {TEAM_SIZES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ob-opt ${teamSize === opt.id ? "sel" : ""}`}
                  style={{
                    ...styles.obOpt,
                    borderColor: teamSize === opt.id ? "var(--blue)" : "var(--border2)",
                    background: teamSize === opt.id ? "var(--blue-dim)" : "var(--surface2)",
                    color: teamSize === opt.id ? "var(--text)" : "var(--text2)",
                  }}
                  onClick={() => setTeamSize(opt.id)}
                >
                  <span className="ob-opt-ico">{opt.icon}</span>
                  <div>
                    <div className="ob-opt-name" style={styles.obOptName}>{opt.name}</div>
                    <div className="ob-opt-sub" style={styles.obOptSub}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ob-step on" style={styles.obStep}>
            <div className="ob-tag" style={styles.obTag}>Step 4 of 4</div>
            <h2 className="ob-q" style={styles.obQ}>Are you currently using any WhatsApp tool?</h2>
            <p className="ob-hint" style={styles.obHint}>
              If you&apos;re switching, we&apos;ll migrate your contacts, templates, and flows for free.
            </p>
            <div className="ob-opts single" style={{ ...styles.obOpts, gridTemplateColumns: "1fr" }}>
              <button
                type="button"
                className={`ob-opt ${isSwitching === false ? "sel" : ""}`}
                style={{
                  ...styles.obOpt,
                  borderColor: isSwitching === false ? "var(--blue)" : "var(--border2)",
                  background: isSwitching === false ? "var(--blue-dim)" : "var(--surface2)",
                  color: isSwitching === false ? "var(--text)" : "var(--text2)",
                }}
                onClick={() => { setIsSwitching(false); setSwitchingTool(null); }}
              >
                <span className="ob-opt-ico">✨</span>
                <div>
                  <div className="ob-opt-name" style={styles.obOptName}>No, starting fresh</div>
                  <div className="ob-opt-sub" style={styles.obOptSub}>First time using WhatsApp API</div>
                </div>
              </button>
              <button
                type="button"
                className={`ob-opt ${isSwitching === true ? "sel" : ""}`}
                style={{
                  ...styles.obOpt,
                  borderColor: isSwitching === true ? "var(--blue)" : "var(--border2)",
                  background: isSwitching === true ? "var(--blue-dim)" : "var(--surface2)",
                  color: isSwitching === true ? "var(--text)" : "var(--text2)",
                }}
                onClick={() => setIsSwitching(true)}
              >
                <span className="ob-opt-ico">🔄</span>
                <div>
                  <div className="ob-opt-name" style={styles.obOptName}>Yes, I&apos;m switching</div>
                  <div className="ob-opt-sub" style={styles.obOptSub}>Wati · Interakt · AiSensy · Gallabox · Other — free migration</div>
                </div>
              </button>
            </div>
            {isSwitching && (
              <>
                <p className="ob-hint" style={{ ...styles.obHint, marginTop: 16 }}>Which tool are you switching from?</p>
                <div className="ob-opts" style={styles.obOpts}>
                  {SWITCH_TOOLS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`ob-opt ${switchingTool === opt.id ? "sel" : ""}`}
                      style={{
                        ...styles.obOpt,
                        borderColor: switchingTool === opt.id ? "var(--blue)" : "var(--border2)",
                        background: switchingTool === opt.id ? "var(--blue-dim)" : "var(--surface2)",
                        color: switchingTool === opt.id ? "var(--text)" : "var(--text2)",
                      }}
                      onClick={() => setSwitchingTool(opt.id)}
                    >
                      <span className="ob-opt-name" style={styles.obOptName}>{opt.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="ob-step on" style={styles.obStep}>
            <div className="ob-tag" style={styles.obTag}>
              One last thing
            </div>
            <h2 className="ob-q" style={styles.obQ}>
              What&apos;s your personal WhatsApp number?
            </h2>
            <p className="ob-hint" style={styles.obHint}>
              We&apos;ll send your trial progress updates here.
            </p>
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border2)",
                    background: "var(--surface2)",
                    fontSize: 13,
                    color: "var(--text2)",
                    flexShrink: 0,
                  }}
                >
                  +91
                </div>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="10-digit number"
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border2)",
                    background: "var(--surface2)",
                    fontSize: 13,
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>
              {ownerPhone !== "" && !phoneValid && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--red)" }}>
                  Please enter a valid 10-digit number or skip for now.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSkipPhone}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text3)",
                fontSize: 12,
                textDecoration: "underline",
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
                alignSelf: "flex-end",
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        <div className="ob-row" style={styles.obRow}>
          <span className="ob-cnt" style={styles.obCnt}>
            {displayStep} / 4
          </span>
          <div className="ob-btns" style={styles.obBtns}>
            {step > 1 && step !== 0 && (
              <button type="button" className="btn-back" style={styles.btnBack} onClick={handleBack}>
                ← Back
              </button>
            )}
            <button
              type="button"
              className={`btn-next ${canNext ? "on" : ""}`}
              style={{
                ...styles.btnNext,
                opacity: canNext ? 1 : 0.35,
                pointerEvents: canNext ? "auto" : "none",
              }}
              onClick={handleNext}
              disabled={!canNext}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  ob: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "var(--midnight)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  obBg: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  blob: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(120px)",
    opacity: 0.16,
  },
  blob1: {
    width: 500,
    height: 500,
    background: "var(--blue)",
    top: -150,
    right: -80,
    animation: "blobFloat 9s ease-in-out infinite",
  },
  blob2: {
    width: 380,
    height: 380,
    background: "var(--green)",
    bottom: -80,
    left: -60,
    animation: "blobFloat 11s ease-in-out infinite reverse",
  },
  obLogo: {
    position: "absolute",
    top: 28,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontFamily: "Sora, sans-serif",
    fontWeight: 700,
    fontSize: 19,
    letterSpacing: "-0.3px",
  },
  obLogoMark: {
    width: 34,
    height: 34,
    background: "var(--blue)",
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  obCard: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 580,
    background: "var(--surface)",
    border: "1px solid var(--border2)",
    borderRadius: 20,
    padding: "44px 48px 38px",
    boxShadow: "0 40px 100px rgba(0,0,0,.55)",
  },
  obProg: {
    display: "flex",
    gap: 6,
    marginBottom: 38,
  },
  obDot: {
    height: 3,
    flex: 1,
    borderRadius: 99,
    transition: "background .35s",
  },
  obStep: {
    animation: "slideIn .38s ease",
  },
  obTag: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    color: "var(--blue-light)",
    marginBottom: 10,
  },
  obQ: {
    fontFamily: "Sora, sans-serif",
    fontSize: 25,
    fontWeight: 600,
    lineHeight: 1.22,
    marginBottom: 7,
    letterSpacing: "-0.45px",
  },
  obHint: {
    fontSize: 13,
    color: "var(--text2)",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  obOpts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
    marginBottom: 28,
  },
  obOpt: {
    padding: "13px 15px",
    borderRadius: 8,
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all .18s",
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    textAlign: "left",
    font: "inherit",
  },
  obOptName: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 2,
  },
  obOptSub: {
    fontSize: 11,
    color: "var(--text3)",
  },
  obRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  obCnt: {
    fontSize: 12,
    color: "var(--text3)",
  },
  obBtns: {
    display: "flex",
    gap: 9,
  },
  btnBack: {
    padding: "9px 18px",
    borderRadius: 8,
    border: "1px solid var(--border2)",
    background: "transparent",
    color: "var(--text2)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  btnNext: {
    padding: "9px 26px",
    borderRadius: 8,
    border: "none",
    background: "var(--blue)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    transition: "all .18s",
  },
  load: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "52px 48px",
    textAlign: "center",
  },
  loadRing: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    border: "3px solid var(--surface3)",
    borderTopColor: "var(--blue)",
    animation: "spin .75s linear infinite",
    marginBottom: 20,
  },
  loadTitle: {
    fontFamily: "Sora, sans-serif",
    fontSize: 19,
    fontWeight: 600,
    marginBottom: 6,
  },
  loadSub: {
    fontSize: 13,
    color: "var(--text2)",
    marginBottom: 20,
  },
  loadSteps: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  loadStep: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "9px 14px",
    borderRadius: 8,
    background: "var(--surface2)",
    fontSize: 12,
    transition: "all .35s ease",
  },
  coachHeader: {
    marginBottom: 24,
  },
  coachTitle: {
    fontFamily: "Sora, sans-serif",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },
  coachSub: {
    fontSize: 13,
    color: "var(--text2)",
    lineHeight: 1.5,
  },
  coachSteps: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  coachStep: {
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    padding: "14px 16px",
    borderRadius: 8,
    border: "1px solid var(--border2)",
    background: "var(--surface2)",
    cursor: "pointer",
    transition: "all .18s",
  },
  coachStepNum: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--blue)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  coachStepInfo: {
    flex: 1,
  },
  coachStepTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 3,
  },
  coachStepDesc: {
    fontSize: 12,
    color: "var(--text2)",
  },
  coachStepAction: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--blue-light)",
    marginTop: 6,
    cursor: "pointer",
  },
  coachStartBtn: {
    marginTop: 20,
    width: "100%",
    padding: 12,
    borderRadius: 8,
    background: "var(--blue)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    transition: "all .18s",
    textAlign: "center",
    textDecoration: "none",
    display: "block",
  },
};
