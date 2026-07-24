"use client";

import { useEffect, useRef, useState } from "react";
import { Tag } from "../kit";
import { apiUrl } from "../lib/basePath";
import { FetchStatus } from "./FetchStatus.jsx";
import { RelativeTime } from "./RelativeTime.jsx";

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

const SourceLink = ({ item }) => {
  const sourceName = getSourceName(item);
  return item.link ? (
    <a href={item.link} target="_blank" rel="noreferrer" className="dk-link">
      {sourceName}
    </a>
  ) : (
    sourceName
  );
};

const FeedItem = ({ item }) => (
  <div className="grid auto-rows-min gap-1 p-4 md:px-6 bg-white">
    <div className="flex flex-col md:flex-row md:items-baseline gap-1 justify-between">
      <div className="font-semibold leading-snug">{item.title}</div>
      <span className="whitespace-nowrap">
        <Tag>{item.category || "News"}</Tag>
      </span>
    </div>
    <div className="dk-hint flex items-center gap-1">
      <SourceLink item={item} /> &middot; <RelativeTime iso={item.timestamp} />
    </div>
    <div className="mt-1 line-clamp-6 leading-relaxed">{item.summary}</div>
    {/* Make it unambiguous the body is our AI summary, and link straight to the
        original release so readers can verify the source. */}
    <div className="mt-2 flex items-center gap-1.5 text-[13px]">
      <span className="dk-hint italic">AI summary</span>
      {item.link && (
        <>
          <span className="dk-hint">&middot;</span>
          <a href={item.link} target="_blank" rel="noreferrer" className="dk-link inline-flex items-center gap-1">
            Read full article
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </>
      )}
    </div>
  </div>
);

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    document.getElementById("feedContent")?.scrollTo(0, 0);
  };

  return (
    <div className="p-3 bg-white flex items-center justify-center gap-3">
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
      <div className="dk-section-head p-4 mb-0!">
        <div>
          <h2>White House News</h2>
          <p className="dk-hint text-[13px] mt-0.5">
            Concise AI summaries of official releases. Each links to the full article.
          </p>
        </div>
      </div>
      <hr />
      <div id="feedContent" className="scrollarea">
        {data.length === 0 ? (
          <div className="dk-empty bg-white">No news articles found</div>
        ) : (
          data.map((item) => <FeedItem key={item.id} item={item} />)
        )}
        <div className="flex-1 bg-white"></div>
      </div>
      <hr />
      <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
