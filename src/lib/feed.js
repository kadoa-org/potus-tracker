// Dates for the feeds, in Washington time: a post at 11 PM ET belongs to that evening, not to the next UTC day.
// White House releases carry a date only (midnight, +00:00), so their date part is used as it is.
const ET = "America/New_York";
export const dateOnly = (iso) => String(iso).slice(0, 10);

// Date and time written out: "26 September 2026 at 11:58am", in Washington time.
export function govDateTime(iso) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: ET, day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(d).replace(" ", "").toLowerCase();
  return `${date} at ${time}`;
}
// A date-only release: "25 September 2026".
export function govDate(iso) {
  const [y, m, d] = dateOnly(iso).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// trumpstruth.org, the aggregator we read Truth Social through, leaves its media link labels in the post text ("View
// image", "View video", "Quoted Donald J. Trump") and writes a repost as "RT: <url of the original>". This splits those
// out so the page can show his words alone and say plainly what a media post is.
const MEDIA_LABEL = /View (image|video)/g;
const REPOST = /^RT:\s*https?:\/\/truthsocial\.com\/(?:users\/[^/\s]+\/statuses|@[^/\s]+)\/(\d+)/;
const URL_ONLY = /^(?:https?:\/\/\S+\s*)+$/;

export function parsePost(raw) {
  let text = String(raw ?? "").trim();
  const media = [];
  text = text.replace(MEDIA_LABEL, (_, kind) => {
    if (!media.includes(kind)) media.push(kind);
    return " ";
  });
  const rt = text.match(REPOST);
  const repostOf = rt ? rt[1] : null;
  if (rt) text = text.slice(rt[0].length);
  // The quote label only ever follows the media labels, so it is stripped only when a post had some.
  let quoted = null;
  if (media.length || repostOf) {
    text = text.replace(/(?:^|\s)Quoted ([A-Z][^\n]{1,60}?)\s*$/, (_, name) => {
      quoted = name.trim();
      return "";
    });
  }
  text = text.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  const link = URL_ONLY.test(text);
  return { text, media, repostOf, quoted, mediaOnly: !text || link || text.length < 4, link };
}

// What a post with no words of his own is, in plain words: "Shared a video", "Reposted his video from 7:22am".
export function mediaLabel({ media, repostOf, link }, original) {
  const what = (m) => (m.includes("video") ? "video" : m.includes("image") ? "image" : null);
  if (repostOf) {
    if (!original) return "Reposted an earlier post";
    const kind = what(original.media) ?? "post";
    return `Reposted his ${kind} from ${original.time}`;
  }
  if (media.includes("video") && media.includes("image")) return "Shared a video and an image";
  if (media.includes("video")) return "Shared a video";
  if (media.includes("image")) return "Shared an image";
  return link ? "Shared a link" : "Media post";
}
