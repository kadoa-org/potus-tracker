"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { govDate } from "../lib/feed";
import { FetchStatus } from "./FetchStatus.jsx";

const getSourceName = (item) => {
  if (item.source && item.source !== "Unknown") return item.source;
  if (item.link) {
    try {
      return new URL(item.link).hostname;
    } catch {
      return "Unknown";
    }
  }
  return "Unknown";
};

// White House categories arrive plural ("Executive Orders"); one release reads as one.
const singular = (c) => {
  const raw = c || "News";
  // Only a one-kind category is made singular; "Nominations & Appointments" stays as it is.
  const one = raw.includes("&") ? raw : raw.replace(/ies$/, "y").replace(/s$/, "");
  // Sentence case, as GOV.UK writes labels: "Executive order".
  return one.charAt(0).toUpperCase() + one.slice(1).toLowerCase();
};

const External = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// One release as a DWP timeline item: the date, the title, what kind of action it is, our AI summary, and the
// link to the original so a reader can verify it. Releases carry a date only, so there is no time.
const FeedItem = ({ item }) => (
  <li className="dwp-timeline__item">
    <p className="dwp-timeline__datetime">{govDate(item.timestamp)}</p>
    <h2 className="dwp-timeline__heading">{item.title}</h2>
    <p className="dwp-timeline__by-line">
      {singular(item.category)} from {getSourceName(item)}
    </p>
    <p className="dwp-timeline__content line-clamp-4">
      <span className="dk-visually-hidden">AI summary: </span>
      {item.summary}
    </p>
    {item.link && (
      <a href={item.link} target="_blank" rel="noreferrer" className="dwp-timeline__link inline-flex items-center gap-1">
        Read the full release
        <span className="dk-visually-hidden"> of {item.title}</span>
        <External />
      </a>
    )}
  </li>
);

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    document.getElementById("feedContent")?.scrollTo(0, 0);
  };

  return (
    <div className="py-5 flex items-center justify-center gap-3 border-t border-[#b1b4b6]">
      <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="dk-btn">
        Previous
      </button>
      <span className="dk-hint">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="dk-btn"
      >
        Next
      </button>
    </div>
  );
};

export function Feed({ initial }) {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(initial?.data ?? null);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(initial?.totalPages ?? 1);
  const [loading, setLoading] = useState(!initial);
  // Skip the redundant refetch on mount when the server already sent page 1.
  const skipInitialFetch = useRef(Boolean(initial));

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          type: "news", // Only fetch news
        });

        const response = await fetch(apiUrl(`/api/feed?${params}`));
        if (!response.ok) throw new Error("Failed to fetch data");

        const result = await response.json();
        setData(result.data);
        setTotalPages(result.totalPages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  if (!data) {
    return <FetchStatus loading={loading} error={error} />;
  }

  return (
    <main>
      <div className="mb-8">
        <h1 className="dk-h1">White House News Today</h1>
        <p className="text-[19px] text-[#505a5f] m-0">Official releases, newest first. Each summary is written by AI and links to the full release.</p>
      </div>
      <div id="feedContent">
        {data.length === 0 ? (
          <div className="dk-empty">No news articles found</div>
        ) : (
          <div className="dwp-timeline">
            <ol className="dwp-timeline__items">
              {data.map((item) => (
                <FeedItem key={item.id} item={item} />
              ))}
            </ol>
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
