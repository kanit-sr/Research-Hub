/* ═══════════════════════════════════════════
   Research Hub — main.js
═══════════════════════════════════════════ */

// ── Search Sources ────────────────────────────────────────────────────────────

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
  if (!q.trim()) {
    alert('Enter something in the search bar first.');
    return;
  }
  window.open(sources[src](q), '_blank');
}


// ── Dictionary (Free Dictionary API) ─────────────────────────────────────────

async function lookupWord() {
  const word = document.getElementById('dict-input').value.trim();
  if (!word) return;

  const el = document.getElementById('dict-result');
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Looking up...</div>';

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) throw new Error('not found');

    const data  = await res.json();
    const entry = data[0];
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
    el.innerHTML = `
      <div class="placeholder">
        No definition found for "<strong style="color:var(--text)">${word}</strong>"
      </div>`;
  }
}


// ── Timeline Data & Renderer ──────────────────────────────────────────────────

const timelines = {
  'space exploration': [
    { year: '1957', event: 'Sputnik 1 — first artificial satellite launched by the USSR' },
    { year: '1961', event: 'Yuri Gagarin becomes the first human in space' },
    { year: '1969', event: 'Apollo 11 — humans land on the Moon for the first time' },
    { year: '1971', event: 'Salyut 1: first space station launched into orbit' },
    { year: '1977', event: 'Voyager 1 & 2 launched to explore the outer solar system' },
    { year: '1990', event: 'Hubble Space Telescope deployed from Space Shuttle Discovery' },
    { year: '1998', event: 'International Space Station assembly begins' },
    { year: '2004', event: 'Mars rovers Spirit & Opportunity land on the surface of Mars' },
    { year: '2020', event: 'SpaceX Crew Dragon — first commercial crewed spaceflight' },
    { year: '2021', event: 'James Webb Space Telescope launched on Christmas Day' },
  ],
  'artificial intelligence': [
    { year: '1950', event: 'Alan Turing publishes "Computing Machinery and Intelligence"' },
    { year: '1956', event: 'Dartmouth Conference coins the term "Artificial Intelligence"' },
    { year: '1997', event: 'IBM Deep Blue defeats chess world champion Garry Kasparov' },
    { year: '2011', event: 'IBM Watson wins Jeopardy! against human champions' },
    { year: '2012', event: 'AlexNet wins ImageNet — the deep learning revolution begins' },
    { year: '2016', event: 'AlphaGo defeats Go world champion Lee Sedol' },
    { year: '2017', event: '"Attention Is All You Need" — the Transformer architecture introduced' },
    { year: '2020', event: 'GPT-3 released by OpenAI with 175 billion parameters' },
    { year: '2022', event: 'ChatGPT launches, bringing AI into mainstream consciousness' },
    { year: '2024', event: 'Multimodal AI models become widespread across industries' },
  ],
  'medicine': [
    { year: '1796', event: 'Edward Jenner develops the first smallpox vaccine' },
    { year: '1847', event: 'Ignaz Semmelweis discovers handwashing prevents disease spread' },
    { year: '1895', event: 'Wilhelm Röntgen discovers X-rays, revolutionising diagnostics' },
    { year: '1928', event: 'Alexander Fleming discovers penicillin by accident' },
    { year: '1953', event: 'Watson & Crick describe the double helix structure of DNA' },
    { year: '1967', event: 'First successful heart transplant by Christiaan Barnard in Cape Town' },
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
    { year: '1998', event: 'Google founded by Brin and Page at Stanford University' },
    { year: '2004', event: 'Facebook launches at Harvard; the Web 2.0 era begins' },
    { year: '2007', event: 'iPhone launches, starting the mobile internet revolution' },
    { year: '2010', event: 'Instagram launched; social media becomes culturally dominant' },
    { year: '2016', event: 'Over 3.4 billion people now connected to the internet' },
    { year: '2023', event: 'Generative AI reshapes how people search and use the web' },
  ],
  'evolution': [
    { year: '1859', event: 'Charles Darwin publishes "On the Origin of Species"' },
    { year: '1865', event: 'Gregor Mendel establishes laws of hereditary genetics' },
    { year: '1953', event: 'DNA structure discovered — the mechanism of inheritance revealed' },
    { year: '1974', event: '"Lucy" fossil discovered — a 3.2 million year old hominid' },
    { year: '1987', event: 'Mitochondrial Eve hypothesis — all humans share a common ancestor' },
    { year: '2003', event: 'Human Genome Project reveals approximately 20,000 human genes' },
    { year: '2010', event: 'Neanderthal genome sequenced — evidence of interbreeding with humans' },
    { year: '2015', event: 'CRISPR-Cas9 gene editing enables precise, direct DNA modification' },
    { year: '2022', event: 'Svante Pääbo wins Nobel Prize for ancient DNA research' },
  ],
  'climate': [
    { year: '1824', event: 'Joseph Fourier first describes the greenhouse effect' },
    { year: '1896', event: 'Svante Arrhenius calculates CO₂\'s warming effect on Earth' },
    { year: '1958', event: 'Charles Keeling begins continuous CO₂ monitoring at Mauna Loa' },
    { year: '1988', event: 'NASA scientist James Hansen testifies on global warming to Congress' },
    { year: '1992', event: 'Earth Summit in Rio produces UN Framework Convention on Climate Change' },
    { year: '1997', event: 'Kyoto Protocol adopted — first binding emissions reduction treaty' },
    { year: '2006', event: '"An Inconvenient Truth" brings climate change to mainstream attention' },
    { year: '2015', event: 'Paris Agreement adopted — 196 nations commit to limit warming' },
    { year: '2021', event: 'IPCC Sixth Assessment Report warns of "code red for humanity"' },
    { year: '2023', event: 'Hottest year on record globally, with temperatures above 1.5°C' },
  ],
  'physics': [
    { year: '1687', event: 'Isaac Newton publishes Principia Mathematica — laws of motion & gravity' },
    { year: '1865', event: 'James Clerk Maxwell unifies electricity, magnetism and light' },
    { year: '1905', event: 'Einstein\'s "miracle year" — special relativity and E=mc²' },
    { year: '1915', event: 'Einstein publishes General Theory of Relativity' },
    { year: '1927', event: 'Heisenberg\'s Uncertainty Principle — quantum mechanics formulated' },
    { year: '1945', event: 'First nuclear bomb detonated at Trinity, New Mexico' },
    { year: '1964', event: 'Peter Higgs proposes the existence of the Higgs boson' },
    { year: '2012', event: 'Higgs boson discovered at CERN\'s Large Hadron Collider' },
    { year: '2015', event: 'LIGO detects gravitational waves for the first time' },
    { year: '2019', event: 'First photograph of a black hole captured by Event Horizon Telescope' },
  ],
};

function loadTimeline() {
  const q  = document.getElementById('tl-input').value.trim().toLowerCase();
  const el = document.getElementById('tl-result');
  if (!q) return;

  let match = null;
  for (const key of Object.keys(timelines)) {
    if (
      key.includes(q) ||
      q.includes(key) ||
      key.split(' ').some(w => q.includes(w))
    ) {
      match = key;
      break;
    }
  }

  if (match) {
    const items = timelines[match];
    el.innerHTML = items.map((item, idx) => `
      <div class="tl-item" style="animation-delay:${idx * 0.045}s">
        <span class="tl-year">${item.year}</span>
        <span class="tl-event">${item.event}</span>
      </div>
    `).join('');

  } else {
    const available = Object.keys(timelines)
      .map(k => `<span style="color:var(--accent2)">${k}</span>`)
      .join(', ');

    el.innerHTML = `
      <div style="font-size:12px;color:var(--text3);padding:10px 0;line-height:1.8">
        No timeline for "<strong style="color:var(--text)">${q}</strong>".<br>
        Try: ${available}
      </div>`;
  }
}


// ── Saved Topics ──────────────────────────────────────────────────────────────

let topics = JSON.parse(localStorage.getItem('rh_topics') || '[]');

function renderTopics() {
  const list  = document.getElementById('topics-list');
  const count = document.getElementById('topics-count');

  count.textContent = `${topics.length} topic${topics.length !== 1 ? 's' : ''}`;

  if (topics.length === 0) {
    list.innerHTML = '<span style="font-size:12px;color:var(--text3)">No topics saved yet</span>';
    return;
  }

  list.innerHTML = topics.map((t, i) => {
    const safe = t.replace(/'/g, "\\'");
    return `
      <div class="topic-chip">
        <span onclick="searchSource('google','${safe}');
          document.getElementById('main-search').value='${safe}'">${t}</span>
        <button onclick="removeTopic(${i})" title="Remove">×</button>
      </div>`;
  }).join('');
}

function addTopic() {
  const input = document.getElementById('topic-input');
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


// ── Notes (auto-save to localStorage) ────────────────────────────────────────

function initNotes() {
  const notesEl     = document.getElementById('notes-area');
  const notesStatus = document.getElementById('notes-status');

  notesEl.value = localStorage.getItem('rh_notes') || '';

  let saveTimer;
  notesEl.addEventListener('input', () => {
    notesStatus.textContent  = 'unsaved...';
    notesStatus.className    = 'notes-status';
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
    document.getElementById('notes-area').value = '';
    localStorage.removeItem('rh_notes');
    document.getElementById('notes-status').textContent = 'cleared';
  }
}


// ── Navigation — category tab active state ────────────────────────────────────

function scrollToSection(id, evt) {
  const el = document.getElementById(id) || document.getElementById(id + '-card');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  if (evt && evt.target) evt.target.classList.add('active');
}


// ── Scroll-to-top button ──────────────────────────────────────────────────────

window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});


// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Cmd/Ctrl + K → focus search bar
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('main-search')?.focus();
  }
});


// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderTopics();
  initNotes();

  // Enter key on topic input
  document.getElementById('topic-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTopic();
  });
});