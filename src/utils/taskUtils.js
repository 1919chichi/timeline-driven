export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getStatus(start, end) {
  const today = getToday();
  if (start && today < start) return "upcoming";
  if (end && today > end) return "finished";
  return "ongoing";
}

export function isDoneToday(task) {
  const today = getToday();
  const log = task.logs[today];
  if (!log) return false;
  if (log === true) return true;
  
  const tags = (task.tags || []).map(t => typeof t === 'string' ? { name: t, max: 1 } : t);
  if (tags.length === 0) {
      return Object.keys(log).length > 0;
  }
  
  return tags.every(tag => (log[tag.name] || 0) >= tag.max);
}
