import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AgriLens — Crop Disease Early Warning",
  description: "AI-powered crop disease detection and treatment recommendation with decentralized consensus validation.",
  openGraph: {
    title: "AgriLens",
    description: "Trusted crop advisory for smallholders and agribusinesses.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('al-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--al-card)",
              border: "1px solid var(--al-border)",
              color: "var(--al-text)",
            },
          }}
        />
      </body>
    </html>
  );
}
