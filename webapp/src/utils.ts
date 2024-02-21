function formatPastTime(date: Date): string {
  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - date.getTime()) / 60000);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);
  if (minutesAgo < 1) return "just now";
  if (hoursAgo < 1) return `${minutesAgo} min${minutesAgo > 1 ? "s" : ""} ago`;
  if (daysAgo < 1) return `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`;
  if (daysAgo <= 10) return `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
  return date.toDateString();
}

export { formatPastTime };
