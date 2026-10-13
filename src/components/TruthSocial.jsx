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
const External = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);
const MEDIA_TAG = { video: "Video", image: "Image" };

// One post as a DWP timeline item with its content in a simple card: when it was posted and its impact sit on the
// timeline, and the card holds our AI note on why it matters as the title, the post itself, and a one-line footer with
// its topic, mentions and source. No shadow: the card is not a link, and a shadow would say it is.
// `pinned` marks the post a dashboard link points at, shown on its own above the timeline.
const TruthSocialPost = ({ post, parsed, label, pinned = false }) => {
  const long = parsed.text.length > LONG_POST;
  const [open, setOpen] = useState(false);
  const when = govDateTime(post.timestamp);
  return (
    <>
      <p className="post-timeline__when" suppressHydrationWarning>
        {pinned && <strong>Linked post · </strong>}
        {when}
        <ImpactMeter signal={post.signal} full />
      </p>
      <article className={`post-card${pinned ? " post-card--pinned" : ""}`} aria-labelledby={`post-title-${post.id}`}>
        <h2 className="post-card__title" id={`post-title-${post.id}`}>
          {parsed.mediaOnly ? (
            label
          ) : (
            <>
              <span className="dk-visually-hidden">AI summary: </span>
              {post.why_it_matters || "Post on Truth Social"}
            </>
          )}
        </h2>
        {/* His words are the content, so they are never hidden: a long post shows its first lines and a button opens
            the rest in place (progressive disclosure). The full text is in the HTML either way. */}
        {!parsed.mediaOnly && (
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
        {!parsed.mediaOnly && parsed.media.length > 0 && (
          <p className="post-card__media">
            {parsed.media.map((m) => (
              <span key={m} className="gov-tag gov-tag--grey">
                {MEDIA_TAG[m]}
              </span>
            ))}
          </p>
        )}
        <PostProperties post={post} />
      </article>
    </>
  );
};

// A post with no words of his own (a video, an image, a repost) as one line on the timeline instead of a card: there is
// nothing to read, and the AI note on it only said so at length. It is always low impact, so the tag is left off.
const MediaLine = ({ post, label, withDate = true }) => (
  <p className="post-timeline__when post-timeline__media" suppressHydrationWarning>
    <span>{withDate ? govDateTime(post.timestamp) : timeOf(post.timestamp)}</span>
    <span className="post-timeline__label">{label}</span>
    {post.original_post_link && (
      <a href={post.original_post_link} target="_blank" rel="noreferrer" className="dk-link post-card__source">
        View on Truth Social
        <span className="dk-visually-hidden"> (opens in a new tab)</span>
        <External />
      </a>
    )}
  </p>
);

// Three or more media posts in a row fold into one line, with a button to list them.
const MediaGroup = ({ items }) => {
  const [open, setOpen] = useState(false);
  const newest = items[0].post, oldest = items.at(-1).post;
  const date = govDateTime(newest.timestamp).split(" at ")[0];
  const span = timeOf(oldest.timestamp) === timeOf(newest.timestamp) ? timeOf(newest.timestamp) : `${timeOf(oldest.timestamp)} to ${timeOf(newest.timestamp)}`;
  const id = `media-${newest.id}`;
  return (
    <>
      <p className="post-timeline__when post-timeline__media" suppressHydrationWarning>
        <span>{date}, {span}</span>
        <span className="post-timeline__label">{items.length} media posts</span>
        <button type="button" className="text-button dk-link post-card__source" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide them" : "Show them"}
        </button>
      </p>
      {open && (
        <ul id={id} className="post-timeline__group">
          {items.map(({ post, label }) => (
            <li key={post.id}>
              <MediaLine post={post} label={label} withDate={false} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

// Each post parsed once, with its plain label when it is media only; a repost is named after the post it repeats when
// that post is on the same page. Then runs of three or more media posts become one group.
const statusId = (link) => (link || "").split("/").pop();
function timelineEntries(posts) {
  const parsed = posts.map((post) => ({ post, parsed: parsePost(post.text) }));
  const byId = new Map(parsed.map((e) => [statusId(e.post.original_post_link), e]));
  const items = parsed.map((e) => {
    const original = e.parsed.repostOf && byId.get(e.parsed.repostOf);
    const label = mediaLabel(e.parsed, original && { media: original.parsed.media, time: timeOf(original.post.timestamp) });
    return { ...e, label };
  });
  const out = [];
  for (let i = 0; i < items.length; ) {
    let j = i;
    while (j < items.length && items[j].parsed.mediaOnly) j++;
    if (j - i >= 3) {
      out.push({ key: `group-${items[i].post.id}`, group: items.slice(i, j) });
      i = j;
    } else {
      out.push({ key: items[i].post.id, ...items[i] });
      i++;
    }
  }
  return out;
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
              <li key={e.key} className={`post-timeline__item${e.group || e.parsed.mediaOnly ? " post-timeline__item--line" : ""}`}>
                {e.group ? (
                  <MediaGroup items={e.group} />
                ) : e.parsed.mediaOnly ? (
                  <MediaLine post={e.post} label={e.label} />
                ) : (
                  <TruthSocialPost post={e.post} parsed={e.parsed} label={e.label} />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={viewPages} setCurrentPage={setCurrentPage} />
    </main>
  );
}
