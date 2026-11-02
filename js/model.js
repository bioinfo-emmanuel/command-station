// Turns raw data (sample or from the Apps Script link) into one tidy model the cards render.
const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY);
const dateKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
const num = (v, dflt = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : dflt);

/* ---------- sample data (clearly labelled in the UI) ---------- */
export function sampleModel(now = new Date()) {
  const at = (h, m) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d; };
  const ago = (n) => new Date(startOfDay(now).getTime() - n * DAY);
  const ahead = (n) => new Date(startOfDay(now).getTime() + n * DAY);
  return {
    source: 'sample',
    events: [
      { title: 'Gradebook sync', sub: 'Biology · Pampanga StateU', start: at(8, 0), end: at(9, 0) },
      { title: 'Advising check-in', sub: 'Ovitrap team · 45 min', start: at(10, 30), end: at(11, 15) },
      { title: 'Research Ethics Committee', sub: 'Protocol review meeting', start: at(13, 0), end: at(14, 30) },
      { title: 'ADM technical call', sub: 'Poultry nutrition', start: at(15, 30), end: at(16, 15) },
    ],
    tasks: [
      { title: 'Post midterm grades', tag: 'Biology', done: true },
      { title: 'Send consent forms to committee', tag: 'REC', done: true },
      { title: 'Draft methods for the review', tag: 'Writing', done: false },
      { title: 'Review 3 protocol submissions', tag: 'REC', done: false },
      { title: 'Reply to ovitrap team on field plan', tag: 'Advising', done: false },
      { title: 'Order filament for the A1 Mini', tag: 'Printer', done: false },
    ],
    writing: { project: 'AI in vector biology review', wordsWeek: 840, lastTouched: ago(0), touched: [0, 1, 2, 4, 5, 8, 9, 10, 11, 12].map((n) => dateKey(ago(n))), sectionsTotal: 5, sectionsDone: 2.5 },
    focus: { todayMin: 200, week: [70, 110, 90, 140, 50, 30, 200] },
    research: [
      { title: 'Aedes ovitrap surveillance', role: 'Adviser', group: 'Students', steps: ['Site selection', 'Ovitrap setting', 'Egg collection & rearing', 'Species identification', 'Analysis', 'Manuscript'], current: 2, milestone: 'Field check', milestoneDate: ahead(2), lastUpdate: ago(1) },
      { title: 'UHI & mosquito morphometrics', role: 'Adviser', group: 'Students', steps: ['Proposal', 'Collection', 'Rearing', 'Imaging', 'Analysis', 'Manuscript'], current: 3, milestone: 'Draft Ch. 3', milestoneDate: ahead(6), lastUpdate: ago(3) },
      { title: 'Larvicidal plant extract', role: 'Adviser', group: 'Students', steps: ['Proposal', 'Extraction', 'Bioassay', 'Analysis', 'Defense', 'Manuscript'], current: 4, milestone: 'Panel', milestoneDate: ahead(12), lastUpdate: ago(5) },
      { title: 'AI in vector biology review', role: 'Lead', group: 'Faculty', steps: ['Protocol', 'Screening', 'Extraction', 'Synthesis', 'Manuscript'], current: 2, milestone: 'Protocol', milestoneDate: ahead(9), lastUpdate: ago(6) },
      { title: 'Rapid test validation', role: 'Co-lead', group: 'Faculty', steps: ['Protocol', 'Ethics', 'Field', 'Analysis', 'Manuscript'], current: 2, milestone: 'Ethics clearance', milestoneDate: ahead(20), lastUpdate: ago(18) },
    ],
    researchTotal: 14,
  };
}

// "2026-10-30, 2026-11-01" (or one per line) -> set of day keys; falls back to the last-touched day
export function parseDates(v, fallback) {
  const out = String(v || '').split(/[,;\s]+/).map((x) => toDate(x)).filter(Boolean).map(dateKey);
  if (fallback) out.push(dateKey(fallback));
  return out;
}
export { dateKey };

/* ---------- normalize the Apps Script feed ---------- */
export function fromBackend(data, now = new Date()) {
  const today = startOfDay(now);
  const events = (data.events || [])
    .map((e) => ({ title: e.title || '(no title)', sub: e.location || e.calendar || '', start: toDate(e.start), end: toDate(e.end), allDay: !!e.allDay }))
    .filter((e) => e.start && dayDiff(e.start, now) === 0)
    .sort((a, b) => a.start - b.start);

  const tasks = (data.tasks || [])
    .map((t) => ({ title: t.title, tag: t.list || '', done: false, due: toDate(t.due) }))
    .sort((a, b) => (a.due ? +a.due : Infinity) - (b.due ? +b.due : Infinity));

  const w = (data.writing || [])[0];
  const writing = w ? {
    project: w.project || 'Writing',
    wordsWeek: num(w.words_this_week),
    lastTouched: toDate(w.last_touched),
    touched: parseDates(w.touched_dates, toDate(w.last_touched)),
    sectionsTotal: Math.max(1, num(w.sections_total, 5)),
    sectionsDone: num(w.sections_done),
  } : null;

  const byDay = {};
  (data.focus || []).forEach((r) => { const d = toDate(r.date); if (d) byDay[dateKey(d)] = (byDay[dateKey(d)] || 0) + num(r.minutes); });
  const week = Array.from({ length: 7 }, (_, i) => byDay[dateKey(new Date(+today - (6 - i) * DAY))] || 0);
  const focus = { todayMin: week[6], week };

  const research = (data.research || []).filter((r) => r.title).map((r) => {
    const steps = String(r.steps || '').split('>').map((s) => s.trim()).filter(Boolean);
    let current = num(r.current_step, 0);
    if (!current && r.current_step) current = steps.findIndex((s) => s.toLowerCase() === String(r.current_step).toLowerCase()) + 1;
    return {
      title: r.title, role: r.role || '', group: r.group || '',
      steps, current: Math.min(Math.max(current, 1), Math.max(steps.length, 1)),
      milestone: r.next_milestone || '', milestoneDate: toDate(r.milestone_date), lastUpdate: toDate(r.last_update),
    };
  });

  return { source: 'live', events, tasks, writing, focus, research, researchTotal: research.length };
}

/* ---------- research helpers ---------- */
export const QUIET_DAYS = 14;
export function researchSummary(list, now = new Date()) {
  const dueMonth = list.filter((p) => p.milestoneDate && dayDiff(p.milestoneDate, now) >= 0 && dayDiff(p.milestoneDate, now) <= 30).length;
  const quiet = list.filter((p) => p.lastUpdate && dayDiff(now, p.lastUpdate) > QUIET_DAYS).length;
  const ethics = list.filter((p) => /ethic/i.test(p.steps[p.current - 1] || '')).length;
  return { dueMonth, quiet, ethics };
}
