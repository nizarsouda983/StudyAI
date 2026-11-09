
/* StudyAI multipage workspace — works with the original script.js without replacing its AI logic. */
(() => {
  'use strict';

  // Remove only the unwanted sidebar links.
  // My Notes stays.
  document.querySelectorAll(
    '.sidebar-nav a[href="#quizzes"], .sidebar-nav a[href="#flashcards"]'
  ).forEach(link => link.remove());

  const names = {
    dashboard: 'Dashboard',
    tutor: 'AI Tutor',
    'study-center': 'Study Center',
    notes: 'My Notes',
    history: 'Study History',
    analytics: 'Analytics',
    goals: 'Study Goals',
    streak: 'Study Streak'
  };

  const $ = id => document.getElementById(id);
  const root = document.querySelector('.page-content');
  const workspace = $('studyWorkspace');
  const results = $('resultsSection');
  const overview = document.querySelector('.overview-section');
  const tools = $('studyTools');
  const welcome = document.querySelector('.welcome-section');
  const footer = document.querySelector('.app-footer');

  if (!root || !workspace || !results) return;

  const sections = {};

  for (const [key, title] of Object.entries(names)) {
    const section = document.createElement('section');

    section.className = 'studyai-page';
    section.dataset.page = key;
    section.id = 'page-' + key;
    section.hidden = true;

    if (key !== 'dashboard') {
      section.innerHTML = `
        <div class="page-hero">
          <div class="eyebrow">
            STUDYAI / ${title.toUpperCase()}
          </div>
          <h1>${title}</h1>
          <p>${
            ({
              tutor: 'Learn a topic, then ask your AI tutor follow-up questions.',
              'study-center': 'Upload your PDF or notes and turn them into a lesson.',
              notes: 'Save, search, edit, and export your study notes.',
              history: 'See the sessions you have completed.',
              analytics: 'Explore scores, progress, and learning patterns.',
              goals: 'Set a target and track your progress.',
              streak: 'See your consistency over time.'
            })[key] || ''
          }</p>
        </div>
      `;
    }

    root.insertBefore(section, footer);
    sections[key] = section;
  }

  sections.dashboard.append(welcome, overview, tools);

  const studyIntro = document.createElement('div');
  studyIntro.className = 'studyai-hint';
  sections.dashboard.append(studyIntro);

  studyIntro.innerHTML = `
    <strong>Ready to learn?</strong>
    Choose Study Center or AI Tutor in the sidebar to get started.
    <a href="#study-center">Open Study Center →</a>
  `;

  // MY NOTES — KEEP ALL FUNCTIONALITY
  const noteStore = 'studyai.personalNotes.v1';

  const read = (key, fallback = []) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const notes = () => {
    const v = read(noteStore);
    return Array.isArray(v) ? v : [];
  };

  const saveNotes = data => {
    localStorage.setItem(noteStore, JSON.stringify(data));
    renderNotes();
  };

  const escape = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);

  const notesArea = document.createElement('div');
  notesArea.className = 'feature-panel';
  sections.notes.append(notesArea);

  function renderNotes() {
    const all = notes();

    notesArea.innerHTML = `
      <div class="feature-heading">
        <div>
          <h2>Your notebook</h2>
          <p>
            ${all.length} saved note${all.length === 1 ? '' : 's'}
            · Stored in this browser
          </p>
        </div>
        <button type="button" id="exportNotes" class="secondary-action">
          Export JSON
        </button>
      </div>

      <form id="noteForm" class="note-form">
        <input type="hidden" name="noteId">

        <label>
          Title
          <input
            name="title"
            maxlength="120"
            required
            placeholder="e.g. Chapter 3 — Biology"
          >
        </label>

        <label>
          Notes
          <textarea
            name="body"
            rows="6"
            required
            placeholder="Write your summary, definitions, or key ideas..."
          ></textarea>
        </label>

        <div class="action-row">
          <button type="submit" class="primary-action">
            Save note
          </button>
          <button type="reset" class="secondary-action">
            Clear
          </button>
        </div>
      </form>

      <label class="search-label">
        Search your notes
        <input
          id="noteSearch"
          placeholder="Search titles and content..."
          autocomplete="off"
        >
      </label>

      <div id="noteList" class="note-list"></div>
    `;

    const form = $('noteForm');
    const list = $('noteList');
    const search = $('noteSearch');

    function filter() {
      const q = search.value.toLowerCase().trim();

      const found = all.filter(n =>
        (n.title + ' ' + n.body).toLowerCase().includes(q)
      );

      list.innerHTML = found.length
        ? found.map(n => `
          <article class="note-item">
            <div>
              <h3>${escape(n.title)}</h3>
              <small>
                Updated ${escape(new Date(n.updated).toLocaleDateString())}
              </small>
              <p>${escape(n.body.slice(0, 350))}</p>
            </div>

            <div class="action-row">
              <button class="secondary-action" data-edit="${escape(n.id)}">
                Edit
              </button>
              <button
                class="secondary-action danger"
                data-delete="${escape(n.id)}"
              >
                Delete
              </button>
            </div>
          </article>
        `).join('')
        : '<p class="muted">No matching notes yet. Create your first note above.</p>';
    }

    search.addEventListener('input', filter);
    filter();

    form.addEventListener('submit', e => {
      e.preventDefault();

      const id = form.elements.noteId.value ||
        (crypto.randomUUID?.() || String(Date.now()));

      const item = {
        id,
        title: form.elements.title.value.trim(),
        body: form.elements.body.value.trim(),
        updated: new Date().toISOString()
      };

      if (!item.title || !item.body) return;

      saveNotes([
        item,
        ...all.filter(n => n.id !== id)
      ]);
    });

    list.addEventListener('click', e => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-delete]');

      if (edit) {
        const n = all.find(n => n.id === edit.dataset.edit);
        if (!n) return;

        form.elements.noteId.value = n.id;
        form.elements.title.value = n.title;
        form.elements.body.value = n.body;

        form.scrollIntoView({ behavior: 'smooth' });
        form.elements.title.focus();
      }

      if (del && confirm('Delete this note?')) {
        saveNotes(all.filter(n => n.id !== del.dataset.delete));
      }
    });

    $('exportNotes').addEventListener('click', () => {
      download(
        'studyai-notes.json',
        JSON.stringify(all, null, 2),
        'application/json'
      );
    });
  }

  function download(filename, contents, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  renderNotes();

  // ANALYTICS BACKUP
  const utility = document.createElement('div');
  utility.className = 'feature-panel';

  utility.innerHTML = `
    <div class="feature-heading">
      <div>
        <h2>Study data backup</h2>
        <p>Export your local progress and notes. No account required.</p>
      </div>
      <button id="exportData" class="secondary-action">
        Export my data
      </button>
    </div>

    <div class="feature-grid">
      <div class="feature-stat">
        <span>Privacy</span>
        <strong>Local-first</strong>
        <small>Progress and notes live in this browser.</small>
      </div>

      <div class="feature-stat">
        <span>Learning</span>
        <strong>AI-powered</strong>
        <small>
          Lessons, quizzes, and flashcards use your existing server.
        </small>
      </div>
    </div>
  `;

  sections.analytics.append(utility);

  $('exportData').addEventListener('click', () => {
    const keys = [
      'studyHistory',
      'studySessions',
      'studyGoal',
      'studyStreak',
      'lastStudyDate',
      'quizResults',
      'mistakeHistory',
      noteStore
    ];

    const obj = {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: Object.fromEntries(
        keys.map(k => [k, localStorage.getItem(k)])
      )
    };

    download(
      'studyai-backup.json',
      JSON.stringify(obj, null, 2),
      'application/json'
    );
  });

  // DASHBOARD QUICK START
  const mini = document.createElement('div');
  mini.className = 'feature-panel quick-start';

  mini.innerHTML = `
    <h2>Quick start</h2>
    <p>
      Choose a topic or upload a document,
      then use the action that matches your study goal.
    </p>
    <p class="muted">
      Your AI tools share the same topic and uploaded document
      while this tab is open.
    </p>
  `;

  const quick = document.createElement('div');
  quick.className = 'action-row quick-actions';

  quick.innerHTML = `
    <button class="secondary-action" data-go="study-center">
      Start studying
    </button>
  `;

  mini.append(quick);
  sections.dashboard.append(mini);

  quick.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) location.hash = b.dataset.go;
  });

  // SIDEBAR NAVIGATION
  const links = [
    ...document.querySelectorAll('.sidebar-nav .nav-link')
  ];

  const actions = {
    history: 'historyButton',
    analytics: 'progressButton',
    goals: 'goalButton',
    streak: 'streakButton'
  };

  let current = '';

  function showPage() {
    const requested = location.hash.slice(1);

    const page = Object.hasOwn(names, requested)
      ? requested
      : 'dashboard';

    if (page === current) return;

    current = page;

    for (const [key, section] of Object.entries(sections)) {
      section.hidden = key !== page;
    }

    links.forEach(a => {
      const active = a.getAttribute('href') === '#' + page;

      a.classList.toggle('active', active);

      if (active) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    const breadcrumb = document.querySelector('.breadcrumb');

    if (breadcrumb) {
      breadcrumb.textContent = 'Workspace / ' + names[page];
    }

    document.title = 'Study AI | ' + names[page];

    // Keep original AI Tutor, Quiz, and Flashcards functionality.
    if (page === 'tutor' || page === 'study-center') {
      sections[page].append(workspace, results);

      workspace.hidden = false;

      const description = workspace.querySelector(
        '.workspace-header p'
      );

      if (description) {
        description.textContent = page === 'tutor'
          ? 'Start a lesson, then ask your AI tutor questions.'
          : 'Enter a topic or upload your notes.';
      }

      const heading = workspace.querySelector(
        '.section-heading h2'
      );

      if (heading) {
        heading.textContent = page === 'tutor'
          ? 'Start a lesson to chat with your tutor'
          : 'Study a topic or document';
      }

      [
        'studyButton',
        'quizButton',
        'flashcardButton'
      ].forEach(id => {
        const b = $(id);

        if (b) {
          b.classList.toggle(
            'mode-primary',
            id === 'studyButton'
          );
        }
      });

    } else if (actions[page]) {
      sections[page].append(results);

      $(actions[page])?.click();

      results.classList.add('has-results');

    } else {
      sections.dashboard.append(workspace, results);

      workspace.hidden = true;
      results.classList.remove('has-results');
    }

    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }

  // ANALYTICS SIDEBAR FIX
  const analyticsLink = $('analyticsNav');

  if (analyticsLink) {
    analyticsLink.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (location.hash !== '#analytics') {
        location.hash = 'analytics';
      } else {
        current = '';
        showPage();
      }
    }, true);
  }

  window.addEventListener('hashchange', showPage);

  if (!Object.hasOwn(names, location.hash.slice(1))) {
    history.replaceState(
      null,
      '',
      location.pathname + location.search + '#dashboard'
    );
  }

  // DASHBOARD CARDS
  for (const [id, page] of Object.entries({
    historyButton: 'history',
    progressButton: 'analytics',
    goalButton: 'goals',
    streakButton: 'streak'
  })) {
    $(id)?.addEventListener('click', e => {
      if (current === 'dashboard') {
        e.stopImmediatePropagation();
        location.hash = page;
      }
    }, true);
  }

  // MOBILE NAVIGATION
  const mobileToggle = $('mobileMenuToggle');
  const sidebar = document.querySelector('.sidebar');
  const mobileNav = $('mobileNavItems');

  if (mobileToggle && sidebar && mobileNav) {
    const setMenuOpen = open => {
      sidebar.classList.toggle('mobile-nav-open', open);

      mobileToggle.setAttribute(
        'aria-expanded',
        String(open)
      );

      mobileToggle.setAttribute(
        'aria-label',
        open ? 'Close navigation menu' : 'Open navigation menu'
      );

      mobileToggle
        .querySelector('span[aria-hidden]')
        ?.replaceChildren(
          document.createTextNode(open ? '✕' : '☰')
        );
    };

    mobileToggle.addEventListener('click', () => {
      setMenuOpen(
        !sidebar.classList.contains('mobile-nav-open')
      );
    });

    mobileNav.addEventListener('click', event => {
      if (event.target.closest('.nav-link')) {
        setMenuOpen(false);
      }
    });

    window.addEventListener('hashchange', () => {
      setMenuOpen(false);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    });

    window.matchMedia('(min-width: 851px)')
      .addEventListener('change', event => {
        if (event.matches) setMenuOpen(false);
      });
  }

  showPage();

  // KEYBOARD SHORTCUT
  document.addEventListener('keydown', e => {
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key.toLowerCase() === 'k'
    ) {
      e.preventDefault();
      location.hash = 'study-center';
      $('topicInput')?.focus();
    }
  });
})();
