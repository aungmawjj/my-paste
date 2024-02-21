import { formatPastTime } from "./utils";

describe("formatPastTime", () => {
  let nowMs: number;
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;

  beforeEach(() => {
    nowMs = new Date().getTime();
  });

  test("less than one minute ago", () => {
    const date = new Date(nowMs - 30 * second);
    expect(formatPastTime(date)).toBe("just now");
  });

  test("one minute ago", () => {
    const date = new Date(nowMs - (1 * minute + 30 * second));
    expect(formatPastTime(date)).toBe("1 min ago");
  });

  test("minutes ago", () => {
    const date = new Date(nowMs - 30 * minute);
    expect(formatPastTime(date)).toMatch(/\d{1,2} mins ago/);
  });

  test("one hour ago", () => {
    const date = new Date(nowMs - (1 * hour + 30 * minute));
    expect(formatPastTime(date)).toBe("1 hour ago");
  });

  test("hours ago", () => {
    const date = new Date(nowMs - 10 * hour);
    expect(formatPastTime(date)).toMatch(/\d{1,2} hours ago/);
  });

  test("one day ago", () => {
    const date = new Date(nowMs - (1 * day + 10 * hour));
    expect(formatPastTime(date)).toBe("1 day ago");
  });

  test("days ago", () => {
    const date = new Date(nowMs - (10 * day + 10 * hour));
    expect(formatPastTime(date)).toMatch(/\d{1,2} days ago/);
  });

  test("more than ten days ago", () => {
    const date = new Date(nowMs - (11 * day + 10 * hour));
    expect(formatPastTime(date)).toBe(date.toDateString());
  });
});
