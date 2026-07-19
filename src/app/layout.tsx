import { Navigation } from "@/components/Navigation";
import "@fontsource-variable/inter";
import type { Metadata } from "next";
import "../kit/kit.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kadoa.com/potus"),
  title: "POTUS Tracker - Real-Time Presidential News",
  description:
    "Track the President's location, schedule, Truth Social posts, and White House news in real-time. Get instant alerts on presidential activities.",
  authors: [{ name: "Kadoa.com" }],
  creator: "Kadoa.com",
  publisher: "Kadoa.com",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.kadoa.com/potus",
    siteName: "POTUS Tracker",
    title: "POTUS Tracker - Real-Time Presidential News",
    description: "Track the President's location, schedule, Truth Social posts, and White House news in real-time.",
    images: [
      {
        url: "https://www.kadoa.com/potus/og-image.png",
        width: 1200,
        height: 630,
        alt: "POTUS Tracker - Real-Time Presidential News",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "POTUS Tracker - Real-Time Presidential News",
    description: "Track the President's location, schedule, Truth Social posts, and White House news in real-time.",
    images: ["https://www.kadoa.com/potus/og-image.png"],
    creator: "@kadoa",
  },
  alternates: {
    canonical: "https://www.kadoa.com/potus",
  },
  icons: {
    icon: "/potus/favicon.svg",
    shortcut: "/potus/favicon.svg",
    apple: "/potus/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "POTUS Tracker",
    description: "Real-time tracking of Presidential activities, location, schedule, and social media posts",
    url: "https://www.kadoa.com/potus",
    applicationCategory: "NewsApplication",
    operatingSystem: "Web",
    publisher: {
      "@type": "Organization",
      name: "Kadoa.com",
      url: "https://www.kadoa.com",
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/potus/favicon.svg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <div className="w-full min-h-[100dvh] flex flex-col bg-[#f3f2f1]">
          <Navigation />
          <div className="w-full md:flex-1 flex flex-col">
            <div className="dk-container py-4">{children}</div>
          </div>
          <footer className="w-full bg-white border-t border-[#b1b4b6] py-3 px-4 mt-auto">
            <div className="dk-container text-center">
              <p className="dk-hint">
                Open data project by{" "}
                <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-link">
                  Kadoa
                </a>
                . For enterprise access,{" "}
                <a href="mailto:hello@kadoa.com" className="dk-link">
                  contact us
                </a>
                .
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
