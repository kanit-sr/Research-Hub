/* ═══════════════════════════════════════════
   Research Hub — main.js

   APIs used:
   ① Wikipedia  — https://en.wikipedia.org/api/rest_v1  (no key)
   ② NASA APOD  — https://api.nasa.gov  (demo key bundled)
   ③ Open Library — https://openlibrary.org/search.json (no key)
   ④ The Guardian — https://content.guardianapis.com  (free key, user-provided)
═══════════════════════════════════════════ */

// ─────────────────────────────────────────
// CONFIG  ← only thing you might want to edit
// ─────────────────────────────────────────
const CONFIG = {
  // NASA's public demo key — works for low-traffic personal use.
  // Get your own free key at https://api.nasa.gov for higher limits.
  NASA_KEY: 'DEMO_KEY',
};


// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

function getQ() {
  return $('main-search').value;
}

function showLoading(id) {
  $(id).innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;
}

function showError(id, msg) {
  $(id).innerHTML = `<div class="error-msg">${msg}</div>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


// ─────────────────────────────────────────
// SEARCH LAUNCHERS (open external tabs)
// ─────────────────────────────────────────
const sources = {
  google:    q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  wikipedia: q => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  scholar:   q => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
  youtube:   q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  arxiv:     q => `https://arxiv.org/search/?searchtype=all&query=${encodeURIComponent(q)}`,
  news:      q => `https://news.google.com/search?q=${encodeURIComponent(q)}`,
  pubmed:    q => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
  maps:      q => `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
};

function launchSearch(q) {
  if (!q.trim()) return;
  window.open(sources.google(q), '_blank');
}

function searchSource(src, q) {
  if (!q.trim()) { alert('Enter something in the search bar first.'); return; }
  window.open(sources[src](q), '_blank');
}


// ─────────────────────────────────────────
// ① WIKIPEDIA LIVE SEARCH
//    Endpoint: /api/rest_v1/page/summary/{title}
//    Search:   /w/api.php?action=query&list=search
// ─────────────────────────────────────────
async function searchWikipedia() {
  const q = $('wiki-input').value.trim();
  if (!q) return;

  const el = $('wiki-results');
  showLoading('wiki-results');

  try {
    const url = `https://en.wikipedia.org/w/api.php?` +
      `action=query&list=search&srsearch=${encodeURIComponent(q)}` +
      `&srlimit=5&format=json&origin=*`;

    const res  = await fetch(url);
    const data = await res.json();
    const hits = data?.query?.search;

    if (!hits || hits.length === 0) {
      showError('wiki-results', `No Wikipedia results for "<strong>${q}</strong>"`);
      return;
    }

    el.innerHTML = hits.map((item, i) => {
      // Strip HTML tags from snippet
      const excerpt = item.snippet.replace(/<[^>]+>/g, '');
      const link    = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g,'_'))}`;
      return `
        <div class="wiki-item" style="animation-delay:${i * 0.05}s">
          <div class="wiki-title" onclick="window.open('${link}','_blank')">${item.title}</div>
          <div class="wiki-excerpt">${excerpt}…</div>
          <div class="wiki-footer">
            <span style="font-size:11px;color:var(--text3)">${item.wordcount?.toLocaleString() ?? '–'} words</span>
            <a class="wiki-link" href="${link}" target="_blank">Read on Wikipedia →</a>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    showError('wiki-results', 'Wikipedia request failed. Check your connection.');
    console.error('Wikipedia error:', err);
  }
}


// ─────────────────────────────────────────
// ② NASA ASTRONOMY PICTURE OF THE DAY
//    Endpoint: https://api.nasa.gov/planetary/apod
// ─────────────────────────────────────────
async function loadNASAApod() {
  const el = $('nasa-apod');

  try {
    const url  = `https://api.nasa.gov/planetary/apod?api_key=${CONFIG.NASA_KEY}`;
    const res  = await fetch(url);

    if (!res.ok) throw new Error(`NASA API ${res.status}`);

    const data = await res.json();

    // Could be an image or a video (YouTube)
    const mediaEl = data.media_type === 'video'
      ? `<iframe class="apod-iframe" src="${data.url}" frameborder="0" allowfullscreen title="${data.title}"></iframe>`
      : `<img class="apod-img" src="${data.url}" alt="${data.title}" loading="lazy">`;

    el.innerHTML = `
      ${mediaEl}
      <div class="apod-date">${formatDate(data.date)}</div>
      <div class="apod-title">${data.title}</div>
      <div class="apod-explanation">${data.explanation}</div>
      <a class="apod-more" href="https://apod.nasa.gov/apod/astropix.html" target="_blank">
        View on NASA APOD →
      </a>`;

  } catch (err) {
    showError('nasa-apod', 'Could not load NASA APOD. Try refreshing.');
    console.error('NASA APOD error:', err);
  }
}


// ─────────────────────────────────────────
// ③ OPEN LIBRARY BOOK SEARCH
//    Endpoint: https://openlibrary.org/search.json
// ─────────────────────────────────────────
async function searchBooks() {
  const q = $('books-input').value.trim();
  if (!q) return;

  showLoading('books-results');

  try {
    const url  = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=key,title,author_name,first_publish_year,cover_i,subject`;
    const res  = await fetch(url);
    const data = await res.json();
    const docs = data?.docs;

    if (!docs || docs.length === 0) {
      showError('books-results', `No books found for "<strong>${q}</strong>"`);
      return;
    }

    $('books-results').innerHTML = docs.map((book, i) => {
      const title   = book.title || 'Untitled';
      const authors = book.author_name?.slice(0, 2).join(', ') || 'Unknown author';
      const year    = book.first_publish_year || '';
      const olLink  = `https://openlibrary.org${book.key}`;
      const coverEl = book.cover_i
        ? `<img class="book-cover" src="https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg" alt="${title}" loading="lazy">`
        : `<div class="book-cover-placeholder">📖</div>`;

      return `
        <div class="book-item" style="animation-delay:${i * 0.05}s">
          ${coverEl}
          <div class="book-info">
            <div class="book-title" title="${title}">${title}</div>
            <div class="book-author">${authors}</div>
            ${year ? `<div class="book-year">First published: ${year}</div>` : ''}
            <a class="book-link" href="${olLink}" target="_blank">View on Open Library →</a>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    showError('books-results', 'Open Library request failed. Check your connection.');
    console.error('Open Library error:', err);
  }
}


// ─────────────────────────────────────────
// ④ THE GUARDIAN NEWS
//    Endpoint: https://content.guardianapis.com/search
//    Requires free API key from open-platform.theguardian.com
// ─────────────────────────────────────────

// Load saved key on startup
function loadGuardianKey() {
  const key = localStorage.getItem('rh_guardian_key');
  if (key) activateGuardianSearch(key);
}

function saveGuardianKey() {
  const key = $('guardian-key-input').value.trim();
  if (!key) { alert('Please paste a valid API key.'); return; }
  localStorage.setItem('rh_guardian_key', key);
  activateGuardianSearch(key);
}

function clearGuardianKey() {
  localStorage.removeItem('rh_guardian_key');
  $('guardian-setup').style.display  = 'block';
  $('guardian-search').style.display = 'none';
  $('guardian-key-input').value      = '';
  $('guardian-pill').textContent     = 'free key needed';
  $('guardian-pill').style.cssText   = 'background:rgba(184,92,58,0.15);color:var(--news);border-color:var(--news)';
}

function activateGuardianSearch(key) {
  $('guardian-setup').style.display  = 'none';
  $('guardian-search').style.display = 'block';
  $('guardian-pill').textContent     = '✓ connected';
  $('guardian-pill').style.cssText   = 'background:rgba(122,171,69,0.12);color:var(--accent2);border-color:var(--accent)';
  // Auto-load top news
  fetchGuardian(key, 'world');
}

async function searchGuardian() {
  const key = localStorage.getItem('rh_guardian_key');
  const q   = $('guardian-input').value.trim() || 'world';
  if (!key) return;
  fetchGuardian(key, q);
}

async function fetchGuardian(key, q) {
  showLoading('guardian-results');

  try {
    const url = `https://content.guardianapis.com/search?` +
      `q=${encodeURIComponent(q)}&show-fields=headline,trailText,thumbnail` +
      `&page-size=8&order-by=newest&api-key=${key}`;

    const res  = await fetch(url);

    if (res.status === 401 || res.status === 403) {
      showError('guardian-results', 'Invalid API key. <button onclick="clearGuardianKey()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-family:var(--font-mono);font-size:12px">Re-enter key →</button>');
      return;
    }

    if (!res.ok) throw new Error(`Guardian API ${res.status}`);

    const data    = await res.json();
    const results = data?.response?.results;

    if (!results || results.length === 0) {
      showError('guardian-results', `No Guardian results for "<strong>${q}</strong>"`);
      return;
    }

    $('guardian-results').innerHTML = results.map((item, i) => {
      const date    = formatDate(item.webPublicationDate);
      const section = item.sectionName || '';
      const title   = item.fields?.headline || item.webTitle;
      return `
        <div class="news-item" style="animation-delay:${i * 0.04}s">
          <div class="news-section">${section}</div>
          <div class="news-headline">${title}</div>
          <div class="news-meta">
            <span class="news-date">${date}</span>
            <a class="news-link" href="${item.webUrl}" target="_blank">Read →</a>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    showError('guardian-results', 'Guardian request failed. Check your connection.');
    console.error('Guardian error:', err);
  }
}


// ─────────────────────────────────────────
// DICTIONARY  (Free Dictionary API)
// ─────────────────────────────────────────
async function lookupWord() {
  const word = $('dict-input').value.trim();
  if (!word) return;

  const el = $('dict-result');
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Looking up…</div>`;

  try {
    const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error('not found');

    const data     = await res.json();
    const entry    = data[0];
    const phonetic = entry.phonetics?.find(p => p.text)?.text || '';

    let html = `<div class="word-title">${entry.word}</div>`;
    if (phonetic) html += `<div class="phonetic">${phonetic}</div>`;

    entry.meanings.slice(0, 3).forEach(m => {
      html += `<div class="pos">${m.partOfSpeech}</div>`;
      m.definitions.slice(0, 2).forEach(d => {
        html += `<div class="def">• ${d.definition}</div>`;
        if (d.example) html += `<div class="example">"${d.example}"</div>`;
      });
    });

    el.innerHTML = html;

  } catch {
    el.innerHTML = `<div class="placeholder">No definition found for "<strong style="color:var(--text)">${word}</strong>"</div>`;
  }
}


// ─────────────────────────────────────────
// TIMELINE (curated local data)
// ─────────────────────────────────────────
const timelines = {
  'space exploration': [
    { year: '1957', event: 'Sputnik 1 — first artificial satellite launched by the USSR' },
    { year: '1961', event: 'Yuri Gagarin becomes the first human in space' },
    { year: '1969', event: 'Apollo 11 — humans land on the Moon for the first time' },
    { year: '1971', event: 'Salyut 1: first space station launched into orbit' },
    { year: '1977', event: 'Voyager 1 & 2 launched toward the outer solar system' },
    { year: '1990', event: 'Hubble Space Telescope deployed from Space Shuttle Discovery' },
    { year: '1998', event: 'International Space Station assembly begins' },
    { year: '2004', event: 'Mars rovers Spirit & Opportunity land on the Martian surface' },
    { year: '2020', event: 'SpaceX Crew Dragon — first commercial crewed spaceflight' },
    { year: '2021', event: 'James Webb Space Telescope launched on Christmas Day' },
  ],
  'artificial intelligence': [
    { year: '1950', event: 'Alan Turing publishes "Computing Machinery and Intelligence"' },
    { year: '1956', event: 'Dartmouth Conference coins the term "Artificial Intelligence"' },
    { year: '1997', event: 'IBM Deep Blue defeats chess world champion Garry Kasparov' },
    { year: '2011', event: 'IBM Watson wins Jeopardy! against human champions' },
    { year: '2012', event: 'AlexNet wins ImageNet — the deep learning revolution begins' },
    { year: '2016', event: 'AlphaGo defeats Go world champion Lee Sedol 4-1' },
    { year: '2017', event: '"Attention Is All You Need" — the Transformer architecture introduced' },
    { year: '2020', event: 'GPT-3 released by OpenAI with 175 billion parameters' },
    { year: '2022', event: 'ChatGPT launches, bringing AI into mainstream consciousness' },
    { year: '2024', event: 'Multimodal AI models and AI agents become widespread' },
  ],
  'medicine': [
    { year: '1796', event: 'Edward Jenner develops the first smallpox vaccine' },
    { year: '1847', event: 'Ignaz Semmelweis discovers handwashing prevents disease spread' },
    { year: '1895', event: 'Wilhelm Röntgen discovers X-rays' },
    { year: '1928', event: 'Alexander Fleming discovers penicillin' },
    { year: '1953', event: 'Watson & Crick describe the double helix structure of DNA' },
    { year: '1967', event: 'First successful heart transplant by Christiaan Barnard' },
    { year: '1978', event: 'First IVF baby, Louise Brown, born in England' },
    { year: '1983', event: 'HIV (AIDS virus) identified and isolated' },
    { year: '2003', event: 'Human Genome Project completed, mapping all human genes' },
    { year: '2021', event: 'First mRNA vaccines approved and deployed globally' },
  ],
  'internet': [
    { year: '1969', event: 'ARPANET — first message sent between UCLA and Stanford' },
    { year: '1983', event: 'TCP/IP protocol adopted — the modern internet is born' },
    { year: '1991', event: 'Tim Berners-Lee publishes the World Wide Web' },
    { year: '1994', event: 'Netscape Navigator browser released to the public' },
    { year: '1998', event: 'Google founded by Brin and Page at Stanford' },
    { year: '2004', event: 'Facebook launches at Harvard; the Web 2.0 era begins' },
    { year: '2007', event: 'iPhone launches, starting the mobile internet revolution' },
    { year: '2010', event: 'Instagram launched; social media becomes culturally dominant' },
    { year: '2016', event: 'Over 3.4 billion people connected to the internet' },
    { year: '2023', event: 'Generative AI reshapes how people search and use the web' },
  ],
  'evolution': [
    { year: '1859', event: 'Charles Darwin publishes "On the Origin of Species"' },
    { year: '1865', event: 'Gregor Mendel establishes laws of hereditary genetics' },
    { year: '1953', event: 'DNA structure discovered — the mechanism of inheritance revealed' },
    { year: '1974', event: '"Lucy" fossil discovered — a 3.2 million year old hominid' },
    { year: '1987', event: 'Mitochondrial Eve hypothesis — all humans share a common ancestor' },
    { year: '2003', event: 'Human Genome Project reveals approximately 20,000 human genes' },
    { year: '2010', event: 'Neanderthal genome sequenced — evidence of interbreeding' },
    { year: '2015', event: 'CRISPR-Cas9 gene editing enables direct DNA modification' },
    { year: '2022', event: 'Svante Pääbo wins Nobel Prize for ancient DNA research' },
  ],
  'climate': [
    { year: '1824', event: 'Joseph Fourier first describes the greenhouse effect' },
    { year: '1896', event: 'Svante Arrhenius calculates CO₂\'s warming effect on Earth' },
    { year: '1958', event: 'Charles Keeling begins continuous CO₂ monitoring at Mauna Loa' },
    { year: '1988', event: 'NASA scientist James Hansen testifies on global warming to Congress' },
    { year: '1992', event: 'Earth Summit in Rio produces the UN Framework Convention on Climate Change' },
    { year: '1997', event: 'Kyoto Protocol adopted — first binding emissions reduction treaty' },
    { year: '2006', event: '"An Inconvenient Truth" brings climate change to mainstream attention' },
    { year: '2015', event: 'Paris Agreement adopted — 196 nations commit to limit warming' },
    { year: '2021', event: 'IPCC Sixth Assessment Report warns of "code red for humanity"' },
    { year: '2023', event: 'Hottest year on record; temperatures breach 1.5°C for first time' },
  ],
  'physics': [
    { year: '1687', event: 'Isaac Newton publishes Principia — laws of motion and gravity' },
    { year: '1865', event: 'James Clerk Maxwell unifies electricity, magnetism, and light' },
    { year: '1905', event: 'Einstein\'s miracle year — special relativity and E=mc²' },
    { year: '1915', event: 'Einstein publishes General Theory of Relativity' },
    { year: '1927', event: 'Heisenberg\'s Uncertainty Principle — quantum mechanics established' },
    { year: '1945', event: 'First nuclear bomb detonated at Trinity, New Mexico' },
    { year: '1964', event: 'Peter Higgs proposes the existence of the Higgs boson' },
    { year: '2012', event: 'Higgs boson discovered at CERN\'s Large Hadron Collider' },
    { year: '2015', event: 'LIGO detects gravitational waves for the first time' },
    { year: '2019', event: 'First photograph of a black hole captured by the Event Horizon Telescope' },
  ],
};

function loadTimeline() {
  const q  = $('tl-input').value.trim().toLowerCase();
  const el = $('tl-result');
  if (!q) return;

  let match = null;
  for (const key of Object.keys(timelines)) {
    if (key.includes(q) || q.includes(key) || key.split(' ').some(w => q.includes(w))) {
      match = key;
      break;
    }
  }

  if (match) {
    el.innerHTML = timelines[match].map((item, idx) => `
      <div class="tl-item" style="animation-delay:${idx * 0.045}s">
        <span class="tl-year">${item.year}</span>
        <span class="tl-event">${item.event}</span>
      </div>`).join('');
  } else {
    const list = Object.keys(timelines)
      .map(k => `<span style="color:var(--accent2)">${k}</span>`)
      .join(', ');
    el.innerHTML = `
      <div style="font-size:12px;color:var(--text3);padding:10px 0;line-height:1.8">
        No timeline for "<strong style="color:var(--text)">${q}</strong>".<br>Try: ${list}
      </div>`;
  }
}


// ─────────────────────────────────────────
// SAVED TOPICS
// ─────────────────────────────────────────
let topics = JSON.parse(localStorage.getItem('rh_topics') || '[]');

function renderTopics() {
  const list  = $('topics-list');
  const count = $('topics-count');
  count.textContent = `${topics.length} topic${topics.length !== 1 ? 's' : ''}`;

  if (topics.length === 0) {
    list.innerHTML = '<span style="font-size:12px;color:var(--text3)">No topics saved yet</span>';
    return;
  }

  list.innerHTML = topics.map((t, i) => {
    const safe = t.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="topic-chip">
        <span onclick="searchSource('google','${safe}');$('main-search').value='${safe}'">${t}</span>
        <button onclick="removeTopic(${i})" title="Remove">×</button>
      </div>`;
  }).join('');
}

function addTopic() {
  const input = $('topic-input');
  const val   = input.value.trim();
  if (!val || topics.includes(val)) { input.value = ''; return; }
  topics.unshift(val);
  localStorage.setItem('rh_topics', JSON.stringify(topics));
  renderTopics();
  input.value = '';
}

function removeTopic(i) {
  topics.splice(i, 1);
  localStorage.setItem('rh_topics', JSON.stringify(topics));
  renderTopics();
}


// ─────────────────────────────────────────
// NOTES (auto-save to localStorage)
// ─────────────────────────────────────────
function initNotes() {
  const notesEl     = $('notes-area');
  const notesStatus = $('notes-status');
  notesEl.value     = localStorage.getItem('rh_notes') || '';

  let saveTimer;
  notesEl.addEventListener('input', () => {
    notesStatus.textContent = 'unsaved…';
    notesStatus.className   = 'notes-status';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem('rh_notes', notesEl.value);
      notesStatus.textContent = '✓ saved';
      notesStatus.className   = 'notes-status saved';
      setTimeout(() => {
        notesStatus.textContent = '';
        notesStatus.className   = 'notes-status';
      }, 2200);
    }, 800);
  });
}

function clearNotes() {
  if (confirm('Clear all notes? This cannot be undone.')) {
    $('notes-area').value           = '';
    $('notes-status').textContent   = 'cleared';
    localStorage.removeItem('rh_notes');
  }
}


// ─────────────────────────────────────────
// NAV — tab active state & smooth scroll
// ─────────────────────────────────────────
function scrollToSection(id, evt) {
  const el = $(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  if (evt?.target) evt.target.classList.add('active');
}


// ─────────────────────────────────────────
// SCROLL TO TOP BUTTON
// ─────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = $('scroll-top');
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});


// ─────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    $('main-search')?.focus();
  }
});


// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved data
  renderTopics();
  initNotes();
  loadGuardianKey();

  // Load NASA APOD on page open
  loadNASAApod();

  // Enter keys
  $('topic-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addTopic(); });
  $('guardian-key-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveGuardianKey(); });
});