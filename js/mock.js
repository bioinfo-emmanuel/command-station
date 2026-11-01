// Sample data. Real sources replace these one at a time (Sheet, Calendar, weather, local agent).
export const mock = {
  owner: 'Emmanuel',
  nextEvent: { title: 'Advising check-in', time: '10:30' },
  tasksLeft: 4,
  // Hourly air temperature (°C) and relative humidity (%), 12 AM to 11 PM.
  hourly: {
    temp: [26.5, 26.2, 26, 25.9, 25.8, 26, 26.8, 28.2, 29.6, 30.8, 31.8, 32.6, 33.2, 33.6, 33.4, 32.8, 31.6, 30.2, 29.0, 28.2, 27.6, 27.2, 26.9, 26.7],
    rh:   [88, 89, 90, 91, 91, 90, 87, 82, 77, 73, 70, 67, 64, 62, 63, 66, 71, 77, 82, 85, 86, 87, 88, 88],
  },
  links: {
    laptop: 'online',   // 'online' | 'asleep'
    camera: 'linked',   // 'linked' | 'resting'
    printer: 'printing',// 'printing' | 'idle'
    flood: 'normal',    // 'normal' | 'watch' | 'warning'
  },
};
