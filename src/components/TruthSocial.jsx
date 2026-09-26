"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { govDateTime } from "../lib/feed";
import { getMockTruth } from "../lib/mockData";
import { FilterSelect } from "../kit";
import { FetchStatus } from "./FetchStatus.jsx";
import { CATEGORY_LABEL, PostProperties } from "./Impact.jsx";

const MOCK = process.env.NEXT_PUBLIC_POTUS_MOCK === "1";

const IMPACT_FILTERS = [
  { value: "", label: "All" },
  { value: "high", label: "High impact" },
  { value: "medium", label: "Medium impact" },
  { value: "low", label: "Low impact" },
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

// A long post shows its first four lines until the reader asks for the rest, so one post cannot fill the screen.
const LONG_POST = 420;
const words = (text) => (text || "").trim().split(/\s+/).length;

// One post as a DWP timeline item: when it was posted, our AI note on why it matters as the heading (the timeline's
// brief overview), the post itself, and its properties (impact, topic, mentions, source) in one summary list.
// `asCard` renders the pinned post outside the timeline.
const TruthSocialPost = ({ post, asCard = false }) => {
  const media = isMediaOnly(post.text);
  const long = (post.text || "").length > LONG_POST;
  const Item = asCard ? "div" : "li";
  const [open, setOpen] = useState(false);
  const when = govDateTime(post.timestamp);
  return (
    <Item className={asCard ? "py-4" : "dwp-timeline__item"}>
      <p className="dwp-timeline__datetime" suppressHydrationWarning>
        {when}
      </p>
      <h2 className="dwp-timeline__heading">
        {post.why_it_matters || (media ? "Media post" : "Post on Truth Social")}
      </h2>
      {/* His words are the content, so they are never hidden: a long post shows its first lines and a button opens the
          rest in place (progressive disclosure). The full text is in the HTML either way. */}
      {media ? (
        <p className="dwp-timeline__content post-text text-[#505a5f]">Media only. It can be viewed on Truth Social.</p>
      ) : (
        <div className="dwp-timeline__content post-text">
          <div id={`post-${post.id}`} className={`whitespace-pre-wrap break-words ${long && !open ? "line-clamp-4" : ""}`}>
            {renderTextWithLinks(post.text)}
          </div>
          {long && (
            <button type="button" className="gov-button-secondary" aria-expanded={open} aria-controls={`post-${post.id}`} onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : `Show the full post (${words(post.text)} words)`}
            </button>
          )}
        </div>
      )}
      <PostProperties post={post} />
    </Item>
  );
};

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  const go = (p) => {
    setCurrentPage(p);
    document.getElementById("truthSocialContent")?.scrollTo(0, 0);
  };
  return (
    <div className="py-5 flex items-center justify-center gap-3 border-t border-[#b1b4b6]">
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
// Two GOV.UK selects side by side, as the UKHSA dashboard filters its charts. They replace a segmented button row and
// a small select that used two different control styles for the same job.
const FilterBar = ({ signal, setSignal, category, setCategory }) => (
  <div className="flex flex-wrap gap-x-8 mb-4">
    <FilterSelect label="Impact" value={signal} options={IMPACT_FILTERS.map((f) => [f.value, f.value ? f.label : "All posts"])} onChange={setSignal} />
    <FilterSelect
      label="Topic"
      value={category}
      options={[["", "All topics"], ...Object.entries(CATEGORY_LABEL)]}
      onChange={setCategory}
    />
  </div>
);

export function TruthSocial({ initial, postId }) {
  const itemsPerPage = 10;
  // The post a dashboard "View post" link points at, pinned above the feed.
  // Rendered as its own card rather than scrolled to, because the post may sit
  // pages deep in the feed once newer low-impact posts pile on top of it.
  const pinned = MOCK && postId ? getMockTruth().find((p) => String(p.id) === String(postId)) : initial?.pinned;
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

  // The linked post is usually also near the top of the feed; showing it twice
  // in a row reads as a bug, so the pinned id is dropped from the list.
  const rawView = MOCK ? mockView.data : data;
  const viewData = pinned && rawView ? rawView.filter((p) => String(p.id) !== String(pinned.id)) : rawView;
  const viewPages = MOCK ? mockView.totalPages : totalPages;
  const viewLoading = MOCK ? false : loading;

  return (
    <main>
      <div className="mb-8">
        <h1 className="dk-h1">Trump&apos;s Truth Social Posts</h1>
        <p className="text-[19px] text-[#505a5f] m-0">Every post, with an AI summary of why it matters and its likely impact.</p>
      </div>
      {pinned && (
        <div className="bg-white border-b border-[#e5e6e7]">
          <div className="border-l-4 border-[#1d70b8] pl-4">
            <p className="dk-hint text-[13px] pt-3">Linked post</p>
            <TruthSocialPost post={pinned} asCard />
          </div>
        </div>
      )}
      <FilterBar signal={signal} setSignal={setSignal} category={category} setCategory={setCategory} />
      <div id="truthSocialContent">
        {!viewData || viewLoading ? (
          <FetchStatus loading={viewLoading} error={error} />
        ) : viewData.length === 0 ? (
          <div className="dk-empty">No posts match these filters.</div>
        ) : (
          <div className="dwp-timeline">
            <ol className="dwp-timeline__items">
              {viewData.map((post) => (
                <TruthSocialPost key={post.id} post={post} />
              ))}
            </ol>
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={viewPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
