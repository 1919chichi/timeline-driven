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

/** 「今天」的日历日：先减 2 小时再按本地时区取日期，避免接近午夜时算成前一天/后一天。 */
export function getToday(): string {
  const now = new Date();
  now.setHours(now.getHours() - 2);
  return formatDateInTimeZone(now);
}

export function normalizeTags(tags?: (Tag | string)[]): Tag[] {
  return (tags || []).map(t => typeof t === 'string' ? { name: t, max: 1 } : t);
}

/** 关键词为空时视为匹配；否则在任务名称、备注或任一任务标签名称中子串匹配（不区分大小写）。 */
export function taskMatchesSearch(task: Task, rawKeyword: string): boolean {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return true;
  if (task.name.toLowerCase().includes(keyword)) return true;
  if (task.note?.toLowerCase().includes(keyword)) return true;
  return normalizeTags(task.tags).some((tag) => tag.name.toLowerCase().includes(keyword));
}

export function getStatus(start?: string, end?: string): "upcoming" | "finished" | "ongoing" {
  const today = getToday();
  if (start && today < start) return "upcoming";
  if (end && today > end) return "finished";
  return "ongoing";
}

/**
 * 今日是否算「已完成」：无多标签时 log 为 true 或存在任意键即完成；
 * 有多标签时需每个标签当日计数 ≥ max。
 */
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
