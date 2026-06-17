import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Submit Your Concern",
    desc: "Upload a photo of the affected crop, add your field notes, and pin your location. Free for everyone.",
  },
  {
    step: "02",
    title: "Validators Reach Consensus",
    desc: "Multiple independent AI validators analyze symptoms, crop stage, weather data, and local regulations — then agree on a diagnosis.",
  },
  {
    step: "03",
    title: "Get Evidence-Backed Solutions",
    desc: "Receive a clear treatment plan with differential diagnosis, confidence levels, safety warnings, and pre-harvest intervals.",
  },
];

const WHAT_YOU_GET = [
  { label: "Differential diagnosis", icon: "🔬" },
  { label: "Confidence & reasoning chain", icon: "📊" },
  { label: "Weather & season context", icon: "🌦️" },
  { label: "Pre-harvest interval warnings", icon: "⏱️" },
  { label: "Safety & regulatory notes", icon: "⚠️" },
  { label: "Treatment efficacy score", icon: "✅" },
];

export default function LandingPage() {
  return (
    <div style={{ color: "var(--al-text)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Logo size={34} />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: "var(--al-sec)" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-5 py-2 rounded-lg btn-accent"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div
          className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-6"
          style={{
            background: "rgba(80,80,129,0.2)",
            color: "var(--al-sec)",
            border: "1px solid var(--al-border)",
          }}
        >
          Free for every farmer &amp; agronomist
        </div>

        <h1
          className="text-5xl md:text-6xl font-bold leading-tight mb-6"
          style={{ letterSpacing: "-0.02em" }}
        >
          Diagnose crop disease
          <br />
          <span className="text-gradient">with trusted AI consensus</span>
        </h1>

        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "var(--al-sec)" }}>
          Submit your field photos and notes. Multiple AI validators independently analyze your case
          and reach consensus so you get treatment recommendations you can actually trust.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-semibold btn-accent"
          >
            Submit a Concern — Free
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-medium transition-colors"
            style={{
              color: "var(--al-sec)",
              border: "1px solid var(--al-border)",
              background: "transparent",
            }}
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Two paths */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free path */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "var(--al-card)",
              border: "1px solid var(--al-border)",
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-widest mb-4 px-2.5 py-1 rounded-full inline-block"
              style={{ background: "rgba(134,134,172,0.15)", color: "var(--al-sec)" }}
            >
              Free — Always
            </div>
            <h2 className="text-2xl font-bold mb-3">Community Diagnosis</h2>
            <p className="text-sm mb-6" style={{ color: "var(--al-sec)" }}>
              Submit your crop issue. AI validators reach consensus and publish a
              treatment plan. Your case becomes part of the community knowledge base —
              helping other farmers with the same problem find answers faster.
            </p>
            <ul className="space-y-2.5 text-sm" style={{ color: "var(--al-sec)" }}>
              <li className="flex items-center gap-2">
                <span style={{ color: "#505081" }}>✓</span> Full evidence-backed result
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: "#505081" }}>✓</span> Multi-validator AI consensus
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: "#505081" }}>✓</span> Result visible to the community
              </li>
            </ul>
            <Link
              href="/register"
              className="mt-8 w-full inline-flex items-center justify-center py-3 rounded-xl text-sm font-semibold btn-accent"
            >
              Start for Free
            </Link>
          </div>

          {/* Detailed Plan */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(39,39,87,0.6) 0%, rgba(80,80,129,0.3) 100%)",
              border: "1px solid #505081",
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-widest mb-4 px-2.5 py-1 rounded-full inline-block"
              style={{ background: "rgba(80,80,129,0.3)", color: "#8686AC" }}
            >
              Detailed Plan
            </div>
            <h2 className="text-2xl font-bold mb-3">Targeted &amp; Private</h2>
            <p className="text-sm mb-6" style={{ color: "var(--al-sec)" }}>
              Need a more precise plan for your specific conditions? Fill in your crop variety,
              soil type, farm size, and budget. Validators return a detailed, personalized
              treatment strategy — visible only to you.
            </p>
            <ul className="space-y-2.5 text-sm" style={{ color: "var(--al-sec)" }}>
              <li className="flex items-center gap-2">
                <span style={{ color: "#8686AC" }}>✓</span> Richer inputs, deeper analysis
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: "#8686AC" }}>✓</span> Private result — only you &amp; admin
              </li>
              <li className="flex items-center gap-2">
                <span style={{ color: "#8686AC" }}>✓</span> Available after free result
              </li>
            </ul>
            <div
              className="mt-8 w-full inline-flex items-center justify-center py-3 rounded-xl text-sm font-semibold"
              style={{ background: "#505081", color: "#F4F4FB" }}
            >
              Available after free diagnosis
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-14">How AgriLens works</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.step}>
              <span
                className="text-5xl font-black block mb-4"
                style={{ color: "var(--al-border)", lineHeight: 1 }}
              >
                {h.step}
              </span>
              <h3 className="text-lg font-semibold mb-2">{h.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--al-sec)" }}>
                {h.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div
          className="rounded-2xl p-10"
          style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}
        >
          <h2 className="text-2xl font-bold mb-2 text-center">Every result includes</h2>
          <p className="text-sm text-center mb-10" style={{ color: "var(--al-sec)" }}>
            No generic advice. Every diagnosis is grounded in real evidence.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHAT_YOU_GET.map((w) => (
              <div
                key={w.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "var(--al-bg)", border: "1px solid var(--al-border)" }}
              >
                <span className="text-xl">{w.icon}</span>
                <span className="text-sm font-medium">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center max-w-3xl mx-auto px-6 pb-28">
        <h2 className="text-3xl font-bold mb-4">Ready to protect your crops?</h2>
        <p className="mb-8" style={{ color: "var(--al-sec)" }}>
          Free, science-backed, community-powered. No credit card needed.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-10 py-4 rounded-xl text-base font-semibold btn-accent"
        >
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-8 text-xs"
        style={{ color: "var(--al-muted)", borderTop: "1px solid var(--al-border)" }}
      >
        © {new Date().getFullYear()} AgriLens — Trusted crop advisory powered by decentralised AI.
      </footer>
    </div>
  );
}
