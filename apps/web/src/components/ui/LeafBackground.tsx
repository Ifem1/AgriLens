"use client";

const LEAF_SVG = (color: string, size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 50 Q18 35 20 22 Q22 10 20 2" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M20 40 C20 40 33 31 34 18 C25 22 18 31 20 40 Z" fill="${color}"/>
  <path d="M20 26 C20 26 7 17 6 4 C15 8 22 17 20 26 Z" fill="${color}" opacity="0.7"/>
</svg>
`;

const leaves = [
  { left: "5%",   delay: "0s",    duration: "14s", drift: "60px",  spin: "150deg", size: 28, sway: "2.8s" },
  { left: "12%",  delay: "2.5s",  duration: "18s", drift: "-40px", spin: "200deg", size: 22, sway: "3.5s" },
  { left: "22%",  delay: "5s",    duration: "13s", drift: "50px",  spin: "120deg", size: 32, sway: "2.2s" },
  { left: "35%",  delay: "1s",    duration: "16s", drift: "-55px", spin: "180deg", size: 24, sway: "4s"   },
  { left: "48%",  delay: "7s",    duration: "15s", drift: "45px",  spin: "160deg", size: 30, sway: "3.2s" },
  { left: "60%",  delay: "3.5s",  duration: "19s", drift: "-35px", spin: "210deg", size: 20, sway: "2.5s" },
  { left: "72%",  delay: "9s",    duration: "12s", drift: "65px",  spin: "130deg", size: 26, sway: "3.8s" },
  { left: "83%",  delay: "4s",    duration: "17s", drift: "-50px", spin: "190deg", size: 34, sway: "2.9s" },
  { left: "92%",  delay: "6.5s",  duration: "14s", drift: "40px",  spin: "145deg", size: 22, sway: "3.3s" },
  { left: "18%",  delay: "11s",   duration: "20s", drift: "-30px", spin: "170deg", size: 28, sway: "4.2s" },
  { left: "55%",  delay: "8s",    duration: "16s", drift: "55px",  spin: "220deg", size: 18, sway: "2.6s" },
  { left: "75%",  delay: "13s",   duration: "11s", drift: "-45px", spin: "135deg", size: 30, sway: "3.1s" },
];

const LEAF_COLOR = "#4a7c59"; // botanical green, separate from brand palette

export function LeafBackground() {
  return (
    <div className="leaf-bg" aria-hidden="true">
      {leaves.map((l, i) => (
        <div
          key={i}
          className="leaf"
          style={{
            left: l.left,
            ["--duration" as string]: l.duration,
            ["--delay" as string]: l.delay,
            ["--drift" as string]: l.drift,
            ["--spin" as string]: l.spin,
            ["--sway" as string]: l.sway,
          }}
          dangerouslySetInnerHTML={{
            __html: LEAF_SVG(LEAF_COLOR, l.size),
          }}
        />
      ))}
    </div>
  );
}
