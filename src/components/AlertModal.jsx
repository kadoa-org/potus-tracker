"use client";

import { useRef, useState } from "react";

// Header CTA + accessible modal (native <dialog>: focus trap, Escape, backdrop
// for free). Keeps the alert form out of the content flow entirely, so tab
// content is full-width and there is no side-rail to flip while data loads.
export function AlertModal() {
  const dialogRef = useRef(null);
  const [alertText, setAlertText] = useState("");

  const suggestedTopics = [
    "tariffs",
    "inflation",
    "supreme court",
    "AI regulation",
    "economic policy",
    "foreign policy",
    "healthcare reform",
    "Iran",
    "golf outings",
  ];

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" onClick={open} aria-label="Create alert" className="dk-btn">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">Create alert</span>
      </button>

      <dialog
        ref={dialogRef}
        className="dk-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="dk-dialog-head">
          <h2>Create Real-Time Alert</h2>
          <button type="button" onClick={close} aria-label="Close" className="dk-dialog-close">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <hr />
        <div className="p-4 md:p-5">
          <div className="space-y-6">
            <div>
              <label className="block text-[13px] font-semibold mb-2">What would you like to be alerted about?</label>
              <textarea
                rows={3}
                className="dk-textarea"
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                placeholder="Enter keywords, topics, or describe what interests you..."
              />
            </div>

            <div>
              <p className="dk-hint mb-2">Popular topics:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setAlertText(topic)}
                    className="dk-tag dk-tag--grey cursor-pointer hover:bg-[#dcdddd]"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <a
              href="https://kadoa.com/contact/sales"
              target="_blank"
              rel="noreferrer"
              className="dk-btn dk-btn--primary w-full justify-center"
            >
              Create Alert
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
