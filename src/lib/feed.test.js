import { describe, expect, test } from "bun:test";
import { govDate, govDateTime, mediaLabel, parsePost } from "./feed";

describe("Written-out dates", () => {
  test("date and time in Washington, lowercase am and pm", () => {
    expect(govDateTime("2026-09-26T15:58:00Z")).toBe("26 September 2026 at 11:58am");
    expect(govDateTime("2026-09-26T02:05:00Z")).toBe("25 September 2026 at 10:05pm");
  });
  test("a date-only release keeps its date", () => {
    expect(govDate("2026-09-25T00:00:00+00:00")).toBe("25 September 2026");
  });
});

describe("parsePost", () => {
  test("a video with no words is media only", () => {
    expect(parsePost("View video")).toMatchObject({ text: "", media: ["video"], mediaOnly: true });
  });
  test("a repost of his own post keeps the original's id and drops the labels", () => {
    const p = parsePost("RT: https://truthsocial.com/users/realDonaldTrump/statuses/117433339316911783View imageQuoted Donald J. TrumpView video");
    expect(p).toMatchObject({ text: "", repostOf: "117433339316911783", quoted: "Donald J. Trump", mediaOnly: true });
    expect(p.media).toEqual(["image", "video"]);
  });
  test("a text post keeps its words and loses the trailing label", () => {
    const p = parsePost("It's The Golden Age of America! President DONALD J. TRUMPView image");
    expect(p).toMatchObject({ text: "It's The Golden Age of America! President DONALD J. TRUMP", media: ["image"], mediaOnly: false });
  });
  test("a post that is only a link is media only", () => {
    expect(parsePost("https://rumble.com/v123")).toMatchObject({ mediaOnly: true, link: true });
  });
  test("plain text is left alone, even when it ends with the word Quoted", () => {
    expect(parsePost("They were Quoted Wrong")).toMatchObject({ text: "They were Quoted Wrong", quoted: null, mediaOnly: false });
  });
});

describe("mediaLabel", () => {
  test("names the media and the reposted post", () => {
    expect(mediaLabel(parsePost("View video"))).toBe("Shared a video");
    expect(mediaLabel(parsePost("View image"))).toBe("Shared an image");
    const rt = parsePost("RT: https://truthsocial.com/users/realDonaldTrump/statuses/1View video");
    expect(mediaLabel(rt, { media: ["video"], time: "7:22am" })).toBe("Reposted his video from 7:22am");
    expect(mediaLabel(rt)).toBe("Reposted an earlier post");
  });
});
