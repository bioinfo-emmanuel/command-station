/**
 * Command Station data endpoint.
 * Paste into a Google Apps Script project bound to your dashboard Google Sheet
 * (Sheet > Extensions > Apps Script), then Deploy > New deployment > Web app.
 * Setup steps are in apps-script/README.md.
 *
 * Returns JSON: { updatedAt, events[], tasks[], writing[], focus[], research[] }
 * Protected by a token stored in Script Properties (key: TOKEN).
 */

var DAYS_AHEAD = 7;

function doGet(e) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    var given = e && e.parameter ? e.parameter.token : '';
    if (!token || given !== token) return json_({ error: 'unauthorized' });

    return json_({
      updatedAt: new Date().toISOString(),
      events: events_(),
      tasks: tasks_(),
      writing: tab_('Writing'),
      focus: tab_('Focus'),
      research: tab_('Research'),
    });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Events from all calendars you own or subscribe to, from the start of today for DAYS_AHEAD days.
function events_() {
  var start = new Date();
  start.setHours(0, 0, 0, 0);
  var end = new Date(start.getTime() + DAYS_AHEAD * 24 * 3600 * 1000);
  var out = [];
  CalendarApp.getAllCalendars().forEach(function (cal) {
    if (cal.isHidden && cal.isHidden()) return;
    cal.getEvents(start, end).forEach(function (ev) {
      out.push({
        title: ev.getTitle(),
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        allDay: ev.isAllDayEvent(),
        location: ev.getLocation() || '',
        calendar: cal.getName(),
      });
    });
  });
  out.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  return out;
}

// Open Google Tasks. Needs the Tasks advanced service (Services > + > Google Tasks API).
function tasks_() {
  var out = [];
  try {
    var lists = Tasks.Tasklists.list().items || [];
    lists.forEach(function (list) {
      var items = Tasks.Tasks.list(list.id, { showCompleted: false, maxResults: 100 }).items || [];
      items.forEach(function (t) {
        if (!t.title) return;
        out.push({ title: t.title, due: t.due || '', list: list.title, done: false });
      });
    });
  } catch (err) {
    // Tasks service not enabled yet: the dashboard simply shows no tasks.
  }
  return out;
}

// Reads a sheet tab as an array of objects keyed by the header row (lowercased, spaces to underscores).
function tab_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  var head = rows[0].map(function (h) { return String(h).trim().toLowerCase().replace(/\s+/g, '_'); });
  return rows.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) {
        var v = r[i];
        o[h] = v instanceof Date ? v.toISOString() : v;
      });
      return o;
    });
}
