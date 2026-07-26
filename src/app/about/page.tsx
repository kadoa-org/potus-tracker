import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About the Data | POTUS Tracker",
  description:
    "A live view of the presidency: White House actions, Truth Social posts scored by impact, and the president's public schedule. Collected with Kadoa, open source on GitHub.",
  alternates: { canonical: "https://www.kadoa.com/potus/about" },
};

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="dk-link">
      {children}
    </a>
  );
}

export default function AboutPage() {
  return (
    <div className="pt-4 pb-16">
      <div className="max-w-3xl">
        <h1 className="dk-h1">About the data</h1>
        <p className="text-[15px] leading-[1.5] text-[#505a5f]">
          A live view of the presidency: official White House actions and executive orders, Trump&apos;s Truth Social
          posts scored by impact, and the president&apos;s public schedule, updated in real time with{" "}
          <ExtLink href="https://kadoa.com">kadoa.com</ExtLink>. Every item links to its official source. The code is
          open source on <ExtLink href="https://github.com/kadoa-org/potus-tracker">GitHub</ExtLink>.
        </p>
      </div>

      <div className="mt-8 max-w-5xl">
        <div className="border border-[#b1b4b6] bg-white p-5">
          <p className="text-[14px] leading-[1.5] text-[#26282a]">
            <ExtLink href="https://kadoa.com">Kadoa</ExtLink> is the web data layer for finance, providing the most
            reliable datasets for investors.
          </p>
        </div>
      </div>

      <div className="mt-16 max-w-3xl text-[13px] text-[#505a5f]">
        <p>For informational purposes. News summaries are AI-generated; every item links to its official source.</p>
      </div>
    </div>
  );
}
