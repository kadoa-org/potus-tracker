"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { govDateTime, mediaLabel, parsePost } from "../lib/feed";
import { getMockTruth } from "../lib/mockData";
import { FilterSelect } from "../kit";
import { FetchStatus } from "./FetchStatus.jsx";
import { CATEGORY_LABEL, ImpactMeter, PostProperties } from "./Impact.jsx";

const MOCK = process.env.NEXT_PUBLIC_POTUS_MOCK === "1";

const IMPACT_FILTERS = [
  { value: "", label: "All" },
  { value: "high", label: "High impact" },
  { value: "medium", label: "Medium impact" },
  { value: "low", label: "Low impact" },
];

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

const timeOf = (iso) => govDateTime(iso).split(" at ")[1];
const MEDIA_TAG = { video: "Video", image: "Image" };
const mediaNoun = (kinds) => (kinds.length > 1 ? "media" : kinds[0]);

// One post as a timeline item holding a summary card. The tick carries when it was posted and its impact; the
// card's grey title bar carries our AI note on why it matters (the summary card's title names what the card is about),
// and the content is the post: his words as body text, then for an image or a video what it shows, as the pipeline's
// model described it, and a footer line with topic, mentions and the link to the original.
// `pinned` marks the post a dashboard link points at, shown on its own above the timeline.
const TruthSocialPost = ({ post, parsed, label, pinned = false }) => {
  const long = parsed.text.length > LONG_POST;
  const [open, setOpen] = useState(false);
  const when = govDateTime(post.timestamp);
  const note = realNote(post) ? post.why_it_matters : null;
  // The pipeline's media list is exact; the text's link labels also name a quoted post's media, so they are the fallback.
  const kinds = Array.isArray(post.media) ? [...new Set(post.media.map((m) => m.type))] : parsed.media;
  return (
    <>
      <p className="post-timeline__when" suppressHydrationWarning>
        {pinned && <strong>Linked post · </strong>}
        {when}
        <ImpactMeter signal={post.signal} full />
        {/* What the post carries, in a blue tag so it never reads as a level of impact. */}
        {kinds.map((m) => (
          <strong key={m} className="gov-tag gov-tag--blue">
            {MEDIA_TAG[m]}
          </strong>
        ))}
      </p>
      <article className={`post-card${pinned ? " post-card--pinned" : ""}`} aria-labelledby={`post-title-${post.id}`}>
        <div className="post-card__title-wrapper">
          <h2 className="post-card__title" id={`post-title-${post.id}`}>
            {note ? (
              <>
                <span className="dk-visually-hidden">AI summary: </span>
                {note}
              </>
            ) : (
              label
            )}
          </h2>
        </div>
        <div className="post-card__content">
          {/* His words are the content, so they are never hidden: a long post shows its first lines and a button opens
              the rest in place (progressive disclosure). The full text is in the HTML either way. */}
          {parsed.mediaOnly ? (
            note && parsed.repostOf && <p className="post-card__text">{label}.</p>
          ) : (
            <blockquote className="post-card__text" cite={post.original_post_link || undefined}>
              <div id={`post-${post.id}`} className={`whitespace-pre-wrap break-words ${long && !open ? "line-clamp-4" : ""}`}>
                {renderTextWithLinks(parsed.text)}
              </div>
              {long && (
                <button type="button" className="gov-button-secondary" aria-expanded={open} aria-controls={`post-${post.id}`} onClick={() => setOpen((o) => !o)}>
                  {open ? "Show less" : `Show the full post (${words(parsed.text)} words)`}
                </button>
              )}
            </blockquote>
          )}
          {kinds.length > 0 && post.media_description && (
            // What the image or the video's first frame shows, as Gemini described it in the pipeline. With no words of
            // his own it is the post's content, so it reads as body text; under his words it is a quieter note.
            <p className={`post-card__media-text${parsed.mediaOnly ? " post-card__media-text--main" : ""}`}>
              <span className="dk-visually-hidden">AI description of the {mediaNoun(kinds)}: </span>
              {post.media_description}
            </p>
          )}
          <PostProperties post={post} />
        </div>
      </article>
    </>
  );
};

// The pipeline's canned note for a post it never sent to the model is not a note.
const realNote = (post) => Boolean(post.why_it_matters) && !post.why_it_matters.startsWith("Media-only or very short post");

// Each post parsed once, with a plain label for a post without words ("Shared a video"); a repost is named after the
// post it repeats when that post is on the same page.
const statusId = (link) => (link || "").split("/").pop();
function timelineEntries(posts) {
  const parsed = posts.map((post) => ({ post, parsed: parsePost(post.text) }));
  const byId = new Map(parsed.map((e) => [statusId(e.post.original_post_link), e]));
  return parsed.map((e) => {
    const original = e.parsed.repostOf && byId.get(e.parsed.repostOf);
    const label = mediaLabel(e.parsed, original && { media: original.parsed.media, time: timeOf(original.post.timestamp) });
    return { key: e.post.id, ...e, label };
  });
}

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  const go = (p) => {
    setCurrentPage(p);
    document.getElementById("truthSocialContent")?.scrollTo(0, 0);
  };
  return (
    <div className="mt-6 py-5 flex items-center justify-center gap-3 border-t border-[#b1b4b6]">
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
// Two selects side by side to filter the feed. They replace a segmented button row and
// a small select that used two different control styles for the same job.
const FilterBar = ({ signal, setSignal, category, setCategory }) => (
  <div className="dk-filter-bar">
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
      <div className="mb-10">
        <h1 className="dk-h1">Trump&apos;s Truth Social Posts</h1>
        <p className="lede">Every post, with an AI summary of why it matters and its likely impact.</p>
      </div>
      {pinned && (
        <div className="mb-10 max-w-[760px]">
          {(() => {
            const [e] = timelineEntries([pinned]);
            return <TruthSocialPost post={pinned} parsed={e.parsed} label={e.label} pinned />;
          })()}
        </div>
      )}
      <FilterBar signal={signal} setSignal={setSignal} category={category} setCategory={setCategory} />
      <div id="truthSocialContent">
        {!viewData || viewLoading ? (
          <FetchStatus loading={viewLoading} error={error} />
        ) : viewData.length === 0 ? (
          <div className="dk-empty">No posts match these filters.</div>
        ) : (
          <ol className="post-timeline">
            {timelineEntries(viewData).map((e) => (
              <li key={e.key} className="post-timeline__item">
                <TruthSocialPost post={e.post} parsed={e.parsed} label={e.label} />
              </li>
            ))}
          </ol>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={viewPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
