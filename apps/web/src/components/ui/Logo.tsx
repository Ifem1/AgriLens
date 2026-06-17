"use client";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 36, className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AgriLens logo"
      >
        <defs>
          <linearGradient id="alCircle" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6B4226" />
            <stop offset="100%" stopColor="#8B5E3C" />
          </linearGradient>
          <linearGradient id="alLeaf1" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>
          <linearGradient id="alLeaf2" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#66BB6A" />
            <stop offset="100%" stopColor="#388E3C" />
          </linearGradient>
          <linearGradient id="alLeaf3" x1="1" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#81C784" />
            <stop offset="100%" stopColor="#4CAF50" />
          </linearGradient>
          <linearGradient id="alHand" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#8B5E3C" />
            <stop offset="100%" stopColor="#6B4226" />
          </linearGradient>
        </defs>

        {/* Outer circle ring */}
        <circle cx="32" cy="32" r="30" stroke="#FFFFFF" strokeWidth="3.5" fill="none" />

        {/* Swoosh / soil arc at bottom — wrapping hand/earth feel */}
        <path
          d="M10 40 Q16 52 32 54 Q48 52 54 40"
          stroke="url(#alHand)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Hand / cupping shape */}
        <path
          d="M18 42 Q20 48 28 49 Q32 49.5 36 49 Q44 48 46 42
             Q44 46 38 47.5 Q32 48.5 26 47.5 Q20 46 18 42 Z"
          fill="url(#alHand)"
          opacity="0.9"
        />

        {/* Soil / earth mound */}
        <ellipse cx="32" cy="42" rx="12" ry="4" fill="#6B4226" opacity="0.7" />

        {/* Main stem */}
        <path
          d="M32 42 Q31 34 32 22"
          stroke="#2E7D32"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right leaf — large, bottom */}
        <path
          d="M32 36 C34 34 42 28 44 22 C38 24 33 30 32 36 Z"
          fill="url(#alLeaf1)"
        />
        {/* Right leaf vein */}
        <path d="M32 36 Q38 29 43 23" stroke="#1B5E20" strokeWidth="0.6" fill="none" opacity="0.5" />

        {/* Left leaf — medium, middle */}
        <path
          d="M32 30 C30 28 22 22 18 18 C22 22 28 26 32 30 Z"
          fill="url(#alLeaf2)"
        />
        <path
          d="M32 30 C30 28 21 21 18 18 C24 19 29 24 32 30 Z"
          fill="url(#alLeaf2)"
        />
        {/* Left leaf vein */}
        <path d="M32 30 Q25 24 19 19" stroke="#1B5E20" strokeWidth="0.6" fill="none" opacity="0.5" />

        {/* Top leaf — small, pointing up-right */}
        <path
          d="M32 24 C33 22 38 16 40 12 C36 15 32 20 32 24 Z"
          fill="url(#alLeaf3)"
        />
        {/* Top leaf vein */}
        <path d="M32 24 Q36 18 39 13" stroke="#1B5E20" strokeWidth="0.5" fill="none" opacity="0.5" />

        {/* Small accent leaf — left top */}
        <path
          d="M31 22 C29 20 24 17 22 15 C25 17 30 20 31 22 Z"
          fill="#81C784"
          opacity="0.8"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontSize: size * 0.5,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #8686AC 0%, var(--al-text) 60%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AgriLens
        </span>
      )}
    </div>
  );
}
