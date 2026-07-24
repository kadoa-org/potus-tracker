"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { getMockTruth } from "../lib/mockData";
import { FetchStatus } from "./FetchStatus.jsx";
import { CATEGORY_LABEL, EntityTags, ImpactBadge } from "./Impact.jsx";
import { RelativeTime } from "./RelativeTime.jsx";

const MOCK = process.env.NEXT_PUBLIC_POTUS_MOCK === "1";

const IMPACT_FILTERS = [
  { value: "", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// A post is "media-only" when it has no meaningful text (just a link/repost).
// These are the low-signal noise the impact score is meant to push down.
const isMediaOnly = (text) => {
  const t = (text || "").trim();
  if (!t) return true;
  return t.length < 100 && /https?:\/\/|rumble\.com/.test(t);
};

const renderTextWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    part.match(urlRegex) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="dk-link">
        {part}
      </a>
    ) : (
      part
    ),
  );
};

const TruthSocialPost = ({ post }) => {
  const media = isMediaOnly(post.text);
  return (
    <article className="p-4 md:p-6 bg-white">
      <div className="flex gap-3">
        <img src="/potus/truth-trump.png" alt="Donald J. Trump" className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">Donald J. Trump</span>
            <span className="dk-hint">@realDonaldTrump</span>
            <span className="dk-hint">·</span>
            <span className="dk-hint">
              <RelativeTime iso={post.timestamp} />
            </span>
          </div>

          {post.signal && (
            <div className="mb-2">
              <ImpactBadge signal={post.signal} category={post.category} />
            </div>
          )}

          <div className="whitespace-pre-wrap break-words leading-relaxed">{renderTextWithLinks(post.text)}</div>

          {media && (
            <div className="mt-2 bg-[#f3f2f1] border border-[#e5e6e7] p-3">
              <p className="dk-hint italic">This post contains media that can only be displayed on Truth Social.</p>
            </div>
          )}

          {post.why_it_matters && (
            <p className="mt-2 text-[14px] text-[#505a5f] leading-relaxed">
              {/* On a low-impact post the sentence explains why it's noise, not
                  a consequence, so "Why it matters" would be self-contradictory. */}
              <span className="font-semibold text-[#0b0c0c]">
                {post.signal === "low" ? "Why it's low impact:" : "Why it matters:"}
              </span>{" "}
              {post.why_it_matters}
            </p>
          )}

          <EntityTags entities={post.entities} />

          {post.original_post_link && (
            <div className="mt-3">
              <a
                href={post.original_post_link}
                target="_blank"
                rel="noreferrer"
                className="dk-link inline-flex items-center gap-1 text-[13px]"
              >
                <span>View on Truth Social</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  const go = (p) => {
    setCurrentPage(p);
    document.getElementById("truthSocialContent")?.scrollTo(0, 0);
  };
  return (
    <div className="p-3 bg-white flex items-center justify-center gap-3">
      <button onClick={() => go(currentPage - 1)} disabled={currentPage === 1} className="dk-btn">
        Previous
      </button>
      <span className="dk-hint">
        Page {currentPage} of {totalPages}
      </span>
      <button onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages} className="dk-btn">
        Next
      </button>
    </div>
  );
};

// Filters live in one row above the feed and drive server-side queries, so a
// selection narrows the whole dataset with correct pagination (not just the
// visible page).
const FilterBar = ({ signal, setSignal, category, setCategory }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 md:px-6 bg-white border-b border-[#e5e6e7]">
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-[#505a5f]">Impact</span>
      <div className="inline-flex border border-[#b1b4b6] rounded-sm overflow-hidden">
        {IMPACT_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setSignal(f.value)}
            aria-pressed={signal === f.value}
            className={`px-3 py-1 text-[13px] border-l first:border-l-0 border-[#b1b4b6] ${
              signal === f.value
                ? "bg-[#1d70b8] text-white font-semibold"
                : "bg-white text-[#0b0c0c] hover:bg-[#f3f2f1]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <label htmlFor="category-filter" className="text-[13px] font-semibold text-[#505a5f]">
        Category
      </label>
      <select
        id="category-filter"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="dk-select text-[13px] border border-[#b1b4b6] rounded-sm px-2 py-1 bg-white"
      >
        <option value="">All categories</option>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export function TruthSocial({ initial }) {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [signal, setSignalState] = useState("");
  const [category, setCategoryState] = useState("");
  const [data, setData] = useState(initial?.data ?? null);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(initial?.totalPages ?? 1);
  const [loading, setLoading] = useState(!initial);
  // The server passed page-1, unfiltered data in `initial`; skip the first
  // client fetch so we don't double-load it.
  const skipInitialFetch = useRef(Boolean(initial));

  // Changing a filter always returns to page 1.
  const setSignal = (v) => {
    setSignalState(v);
    setCurrentPage(1);
  };
  const setCategory = (v) => {
    setCategoryState(v);
    setCurrentPage(1);
  };

  // Mock path (local review): filter + paginate the mock posts client-side so
  // the impact UX and filters are exercisable without the live API/DB.
  const mockView = useMemo(() => {
    if (!MOCK) return null;
    const all = getMockTruth().filter(
      (p) => (!signal || p.signal === signal) && (!category || p.category === category),
    );
    const pages = Math.max(1, Math.ceil(all.length / itemsPerPage));
    const start = (currentPage - 1) * itemsPerPage;
    return { data: all.slice(start, start + itemsPerPage), totalPages: pages };
  }, [signal, category, currentPage]);

  useEffect(() => {
    if (MOCK) return;
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
          type: "truth_social",
        });
        if (signal) params.set("signal", signal);
        if (category) params.set("category", category);

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
  }, [currentPage, signal, category]);

  const viewData = MOCK ? mockView.data : data;
  const viewPages = MOCK ? mockView.totalPages : totalPages;
  const viewLoading = MOCK ? false : loading;

  return (
    <main>
      <div className="dk-section-head p-4 md:px-6 mb-0!">
        <h2>Truth Social</h2>
        <p className="dk-hint text-[13px] mt-0.5">Every post, ranked by real-world impact.</p>
      </div>
      <FilterBar signal={signal} setSignal={setSignal} category={category} setCategory={setCategory} />
      <div id="truthSocialContent" className="scrollarea">
        {!viewData || viewLoading ? (
          <FetchStatus loading={viewLoading} error={error} />
        ) : viewData.length === 0 ? (
          <div className="dk-empty bg-white">No posts match these filters.</div>
        ) : (
          viewData.map((post) => (
            <div key={post.id} className="border-b border-[#f0efed] last:border-0">
              <TruthSocialPost post={post} />
            </div>
          ))
        )}
      </div>
      <hr />
      <Pagination currentPage={currentPage} totalPages={viewPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
