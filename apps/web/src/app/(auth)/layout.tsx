import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LeafBackground } from "@/components/ui/LeafBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--al-bg)" }}>
      {/* Left panel — branding with leaf bg */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{ borderRight: "1px solid var(--al-border)" }}
      >
        <LeafBackground />
        <div className="relative z-10">
          <Link href="/">
            <Logo size={34} />
          </Link>
        </div>

        <div className="relative z-10">
          <h2
            className="text-3xl font-bold mb-3 leading-tight"
            style={{ color: "var(--al-text)" }}
          >
            Trusted crop advisory
            <br />
            <span className="text-gradient">powered by consensus</span>
          </h2>
          <p className="text-sm max-w-sm" style={{ color: "var(--al-sec)" }}>
            Decentralized AI validators analyze farmer evidence — photos, notes, and weather —
            to recommend treatments that fit real-world conditions.
          </p>
        </div>

        <p className="text-xs relative z-10" style={{ color: "var(--al-muted)" }}>
          Built on Genlayer StudioNet
        </p>
      </div>

      {/* Right panel — form */}
      <div
        className="flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{ background: "var(--al-card)" }}
      >
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
