import { LeafBackground } from "@/components/ui/LeafBackground";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: "var(--al-bg)" }}>
      <LeafBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
