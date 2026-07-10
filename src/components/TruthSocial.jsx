"use client";

import { apiUrl } from "../lib/basePath";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { Tag } from "../kit";
import { FetchStatus } from "./FetchStatus.jsx";

const TruthSocialPost = ({ post }) => {
  // Check if the post is primarily media (no text, or very short text with just a link)
  const hasText = post.text && post.text.trim().length > 0;
  const isMediaPost =
    !hasText ||
    (post.text.trim().length < 100 &&
      (post.text.includes("http") ||
        post.text.includes("https") ||
        post.text.includes("rumble.com")));

  // Get sentiment color and emoji
  const getSentimentDisplay = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return { color: 'text-green-600 bg-green-50' };
      case 'negative':
        return { color: 'text-red-600 bg-red-50' };
      case 'neutral':
        return { color: 'text-gray-600 bg-gray-50' };
      default:
        return { color: 'text-gray-600 bg-gray-50' };
    }
  };

  // Function to make links clickable
  const renderTextWithLinks = (text) => {
    if (!text) return null;
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="dk-link"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="p-4 md:p-6 bg-white">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <img
            src="/potus/truth-trump.png"
            alt="Donald J. Trump"
            className="w-12 h-12 rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">Donald J. Trump</span>
            <span className="dk-hint">@realDonaldTrump</span>
            <span className="dk-hint">·</span>
            <span className="dk-hint">
              {formatDistanceToNow(new Date(post.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {renderTextWithLinks(post.text)}
          </div>

          {isMediaPost && (
            <div className="mt-2">
              <div className="bg-[#f3f2f1] border border-[#e5e6e7] p-3">
                <p className="dk-hint italic">
                  This post contains media content that can only be displayed on
                  Truth Social.
                </p>
              </div>
            </div>
          )}

          {/* Sentiment and Topics */}
          <div className="mt-3 flex flex-wrap gap-2">
            
            {post.topics && post.topics.length > 0 && (
              <>
                {post.topics.map((topic, index) => (
                  <Tag key={index} tone="blue">
                    {topic}
                  </Tag>
                ))}
              </>
            )}
          </div>

          {post.original_post_link && (
            <div className="mt-3">
              <a
                href={post.original_post_link}
                target="_blank"
                rel="noreferrer"
                className="dk-link inline-flex items-center gap-1 text-[13px]"
              >
                <span>View on Truth Social</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    document.getElementById("truthSocialContent")?.scrollTo(0, 0);
  };

  return (
    <div className="p-3 bg-white flex items-center justify-center gap-3">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="dk-btn"
      >
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

export function TruthSocial() {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          type: "truth_social",
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

  if (loading || !data) {
    return <FetchStatus loading={loading} error={error} />;
  }

  return (
    <main>
      <div className="dk-section-head p-4 mb-0!">
        <h2>Truth Social Timeline</h2>
      </div>
      <hr />
      <div id="truthSocialContent" className="scrollarea">
        {data.length === 0 ? (
          <div className="dk-empty bg-white">
            No Truth Social posts found
          </div>
        ) : (
          <>
            {data.map((post) => (
              <div key={post.id}>
                <TruthSocialPost post={post} />
              </div>
            ))}
          </>
        )}
      </div>
      <hr />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </main>
  );
}
