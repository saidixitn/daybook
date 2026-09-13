// Daybook store — one JSON blob in localStorage, seeded on first run.
(() => {
  const KEY = 'daybook:v1';
  const h = (hh, mm = 0) => hh * 60 + mm;

  // Weekday template: 0 = Mon … 6 = Sun. kind: plan | focus | body
  const WEEK = [
    [ [h(7), 45, 'Morning run', 'body', 'Health'], [h(9), 60, 'Design crit', 'plan', 'Team'], [h(10,30), 120, 'Deep work', 'focus', 'Focus'], [h(13), 45, 'Lunch', 'body', 'Break'], [h(14), 30, 'Team stand-up', 'plan', 'Team'], [h(15,30), 90, 'Portfolio pass', 'focus', 'Focus'], [h(19), 60, 'Workout', 'body', 'Health'] ],
    [ [h(7,30), 30, 'Stretch', 'body', 'Health'], [h(9), 150, 'Deep work', 'focus', 'Focus'], [h(12,30), 45, 'Lunch', 'body', 'Break'], [h(14), 60, 'Client call', 'plan', 'Work'], [h(16), 60, 'Writing', 'focus', 'Focus'], [h(20), 45, 'Read', 'body', 'Rest'] ],
    [ [h(8), 30, 'Walk', 'body', 'Health'], [h(9,30), 60, 'Planning', 'plan', 'Team'], [h(11), 120, 'Deep work', 'focus', 'Focus'], [h(13), 45, 'Lunch', 'body', 'Break'], [h(15), 90, 'Design review', 'plan', 'Team'], [h(18,30), 60, 'Gym', 'body', 'Health'] ],
    [ [h(7), 45, 'Morning run', 'body', 'Health'], [h(9), 60, 'Stand-up', 'plan', 'Team'], [h(10,30), 150, 'Deep work', 'focus', 'Focus'], [h(13,30), 45, 'Lunch', 'body', 'Break'], [h(15), 60, '1:1 with Maya', 'plan', 'Team'], [h(16,30), 60, 'Research', 'focus', 'Focus'] ],
    [ [h(8), 30, 'Stretch', 'body', 'Health'], [h(9,30), 90, 'Deep work', 'focus', 'Focus'], [h(12), 60, 'Lunch', 'body', 'Break'], [h(14), 60, 'Demo day', 'plan', 'Team'], [h(15,30), 60, 'Weekly review', 'focus', 'Focus'], [h(19), 90, 'Dinner out', 'body', 'Rest'] ],
    [ [h(9), 60, 'Long run', 'body', 'Health'], [h(11), 90, 'Side project', 'focus', 'Focus'], [h(13), 60, 'Lunch', 'body', 'Break'], [h(16), 120, 'Friends', 'plan', 'Social'] ],
    [ [h(9,30), 45, 'Yoga', 'body', 'Health'], [h(11), 60, 'Plan the week', 'focus', 'Focus'], [h(13), 60, 'Lunch', 'body', 'Break'], [h(17), 60, 'Groceries', 'plan', 'Home'] ],
  ];

  function seedEvents() {
    const out = [];
    let id = 1;
    WEEK.forEach((day, d) => day.forEach(([t, dur, title, kind, tag]) => out.push({ id: id++, day: d, t, d: dur, title, kind, tag })));
    return out;
  }

  function seedTasks() {
    const today = (new Date().getDay() + 6) % 7;
    const mk = (id, title, time, status, list, day = today, flag = false, notes = '') => ({ id, title, time, status, list, day, flag, notes });
    return [
      mk(1, 'Reply to emails', h(9), 'todo', 'work', today, false, 'Inbox zero before stand-up.'),
      mk(2, 'Prepare presentation', h(11,30), 'doing', 'work', today, true, 'Slides 4–9 need the new numbers.'),
      mk(3, 'Book dentist', h(13), 'todo', 'personal'),
      mk(4, 'Review report', h(15,30), 'todo', 'work'),
      mk(5, 'Morning run', h(7), 'done', 'personal'),
      mk(6, 'Renew passport', null, 'todo', 'personal', (today + 1) % 7),
      mk(7, 'Write launch notes', h(10), 'todo', 'work', (today + 1) % 7),
      mk(8, 'Call Mum', h(18), 'todo', 'personal', (today + 2) % 7),
      mk(9, 'Sketch onboarding flow', null, 'todo', 'inbox'),
      mk(10, 'Pay electricity bill', h(20), 'todo', 'inbox', today),
    ];
  }

  const defaults = () => ({
    user: null,                       // { name, email }
    prefs: { theme: 'system', dayStart: 6, dayEnd: 23, notifyMorning: true, notifyNudges: true, notifyWeekly: false, interests: ['focus', 'sleep'] },
    events: seedEvents(),
    tasks: seedTasks(),
    focus: [3.5, 4.2, 2.8, 5.1, 3.9, 1.5, 0],   // hours Mon..Sun
    sleep: ['Good', 'Okay', 'Great', 'Good', 'Rough', 'Good', null], // Mon..Sun
    streak: [1, 1, 1, 1, 1, 1, 0],
    nextId: 100,
    onboarded: false,
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return defaults();
  }

  const Store = {
    state: load(),
    save() { try { localStorage.setItem(KEY, JSON.stringify(Store.state)); } catch (e) { /* ignore */ } },
    reset() { Store.state = defaults(); Store.save(); },
    nextId() { const id = Store.state.nextId++; Store.save(); return id; },
    today() { return (new Date().getDay() + 6) % 7; },
    // theme helpers
    setTheme(t) { Store.state.prefs.theme = t; Store.save(); Store.applyTheme(); },
    applyTheme() {
      const t = Store.state.prefs.theme;
      const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      try { localStorage.setItem('daybook:theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    },
    signIn(name, email) { Store.state.user = { name, email }; Store.save(); },
    signOut() { Store.state.user = null; Store.save(); },
  };
  window.Store = Store;
  Store.applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Store.applyTheme());
})();
