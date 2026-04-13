import { Task, Tag } from "../types";

export function getCurrentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatDateInTimeZone(date: Date = new Date(), timeZone: string = getCurrentTimeZone()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  const now = new Date();
  now.setHours(now.getHours() - 2);
  return formatDateInTimeZone(now);
}

export function normalizeTags(tags?: (Tag | string)[]): Tag[] {
  return (tags || []).map(t => typeof t === 'string' ? { name: t, max: 1 } : t);
}

export function getStatus(start?: string, end?: string): "upcoming" | "finished" | "ongoing" {
  const today = getToday();
  if (start && today < start) return "upcoming";
  if (end && today > end) return "finished";
  return "ongoing";
}

export function isDoneToday(task: Task): boolean {
  const today = getToday();
  const log = task.logs[today];
  if (!log) return false;
  if (log === true) return true;
  
  const tags = normalizeTags(task.tags);
  if (tags.length === 0) {
      return Object.keys(log).length > 0;
  }
  
  return tags.every(tag => (log[tag.name] || 0) >= tag.max);
}

export function hasAnyProgressToday(task: Task): boolean {
  const today = getToday();
  const log = task.logs[today];
  if (!log) return false;
  if (log === true) return true;
  
  const tags = normalizeTags(task.tags);
  if (tags.length === 0) {
      return Object.keys(log).length > 0;
  }
  
  return tags.every(tag => (log[tag.name] || 0) > 0);
}

export function getCompletionRate(task: Task): number {
  const today = getToday();
  const log = task.logs[today];
  if (!log) return 0;
  if (log === true) return 1;
  
  const tags = normalizeTags(task.tags);
  if (tags.length === 0) {
      return Object.keys(log).length > 0 ? 1 : 0;
  }
  
  let totalMax = 0;
  let totalProgress = 0;
  tags.forEach(tag => {
    totalMax += tag.max;
    totalProgress += Math.min(log[tag.name] || 0, tag.max);
  });
  
  return totalMax === 0 ? 0 : totalProgress / totalMax;
}

export function getDaysUntilEnd(end?: string): number | null {
  if (!end) return null;
  const todayObj = new Date(getToday());
  const endObj = new Date(end);
  const diffTime = endObj.getTime() - todayObj.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
