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
  // Labels in sentence case: "Executive order".
  return one.charAt(0).toUpperCase() + one.slice(1).toLowerCase();
};

const External = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// One release in the same timeline and card as a Truth Social post: the date and what kind of action it is on the tick,
// the release's title in the card's grey bar, our AI summary as the body, and a footer link to the original so a reader
// can verify it. Releases carry a date only, so there is no time.
const FeedItem = ({ item }) => (
  <li className="post-timeline__item">
    <p className="post-timeline__when">
      {govDate(item.timestamp)}
      <span className="gov-tag gov-tag--grey">{singular(item.category)}</span>
    </p>
    <article className="post-card" aria-labelledby={`release-${item.id}`}>
      <div className="post-card__title-wrapper">
        <h2 className="post-card__title" id={`release-${item.id}`}>{item.title}</h2>
      </div>
      <div className="post-card__content">
        <p className="post-card__text line-clamp-4">
          <span className="dk-visually-hidden">AI summary: </span>
          {item.summary}
        </p>
        <div className="post-card__footer">
          <span>From {getSourceName(item)}</span>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" className="post-card__source dk-link">
              Read the full release
              <span className="dk-visually-hidden"> of {item.title}</span>
              <External />
            </a>
          )}
        </div>
      </div>
    </article>
  </li>
);

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    document.getElementById("feedContent")?.scrollTo(0, 0);
  };

  return (
    <div className="mt-6 max-w-[720px] py-5 flex items-center justify-center gap-3 border-t border-[#b1b4b6]">
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
      <div className="mb-10">
        <h1 className="dk-h1">White House News Today</h1>
        <p className="lede">Official releases, newest first. Each summary is written by AI and links to the full release.</p>
      </div>
      <div id="feedContent">
        {data.length === 0 ? (
          <div className="dk-empty">No news articles found</div>
        ) : (
          <ol className="post-timeline">
            {data.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </ol>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
