/* ═══════════════════════════════════════════
   Research Hub — main.js  (shared across all pages)
═══════════════════════════════════════════ */

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

function showLoading(id) {
  const el = $(id); if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;
}
function showError(id, msg) {
  const el = $(id); if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

// ─────────────────────────────────────────
// NAV — highlight active page
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
});

// ─────────────────────────────────────────
// SCROLL TO TOP
// ─────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = $('scroll-top');
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});

// ─────────────────────────────────────────
// SHARED SUGGESTION ENGINE
// ─────────────────────────────────────────
const _suggestTimers = {};
const _suggestActive = {};

function attachSuggest(inputId, opts = {}) {
  const input = $(inputId);
  if (!input) return;

  const dropId   = `${inputId}-drop`;
  const onSelect = opts.onSelect || (v => { input.value = v; });
  const onEnter  = opts.onEnter  || null;
  const source   = opts.source   || 'wikipedia';

  const drop = document.createElement('div');
  drop.id = dropId;
  drop.className = 'suggest-drop';
  drop.setAttribute('role', 'listbox');

  const row = input.closest('.input-row, .search-bar, .setup-input-row') || input.parentElement;
  row.style.position = 'relative';
  row.parentElement.insertBefore(drop, row.nextSibling);

  function hideDrop() {
    drop.innerHTML = '';
    drop.classList.remove('open');
    _suggestActive[inputId] = -1;
  }

  function renderDrop(items) {
    if (!items.length) { hideDrop(); return; }
    _suggestActive[inputId] = -1;
    drop.innerHTML = items.map((item, i) =>
      `<div class="suggest-item" role="option" data-i="${i}" data-val="${item.replace(/"/g,'&quot;')}">${item}</div>`
    ).join('');
    drop.classList.add('open');
    drop.querySelectorAll('.suggest-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = el.dataset.val;
        hideDrop();
        onSelect(el.dataset.val);
      });
    });
  }

  async function fetchSuggestions(q) {
    if (!q || q.length < 2) { hideDrop(); return; }
    if (source === 'timeline') {
      const keys  = Object.keys(window.timelines || {});
      const ql    = q.toLowerCase();
      renderDrop(keys.filter(k => k.startsWith(ql) || k.includes(ql) || k.split(' ').some(w => w.startsWith(ql))));
      return;
    }
    const items = await fetchWikiSuggest(q);
    renderDrop(items);
  }

  input.addEventListener('input', () => {
    clearTimeout(_suggestTimers[inputId]);
    _suggestTimers[inputId] = setTimeout(() => fetchSuggestions(input.value.trim()), 280);
  });

  input.addEventListener('keydown', e => {
    const items = drop.querySelectorAll('.suggest-item');
    const cur   = _suggestActive[inputId] ?? -1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(items, Math.min(cur+1, items.length-1), inputId); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(items, Math.max(cur-1, -1), inputId); }
    else if (e.key === 'Enter') {
      const hi = drop.querySelector('.suggest-item.active');
      if (hi) { e.preventDefault(); input.value = hi.dataset.val; hideDrop(); onSelect(hi.dataset.val); }
      else { hideDrop(); if (onEnter) onEnter(); }
    } else if (e.key === 'Escape') hideDrop();
  });

  input.addEventListener('blur', () => setTimeout(hideDrop, 150));
}

function setActive(items, idx, inputId) {
  items.forEach(el => el.classList.remove('active'));
  _suggestActive[inputId] = idx;
  if (idx >= 0) { items[idx].classList.add('active'); items[idx].scrollIntoView({ block: 'nearest' }); }
}

async function fetchWikiSuggest(q) {
  try {
    const url  = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`;
    const res  = await fetch(url);
    const data = await res.json();
    return Array.isArray(data[1]) ? data[1] : [];
  } catch { return []; }
}

// ─────────────────────────────────────────
// INDEX — search launchers
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

function getQ()           { return ($('main-search') || {}).value || ''; }
function launchSearch(q)  { if (!q.trim()) return; window.open(sources.google(q), '_blank'); }
function searchSource(src, q) {
  if (!q.trim()) { alert('Enter something in the search bar first.'); return; }
  window.open(sources[src](q), '_blank');
}

// ─────────────────────────────────────────
// WIKIPEDIA
// ─────────────────────────────────────────
async function searchWikipedia() {
  const q = ($('wiki-input') || {}).value?.trim();
  if (!q) return;
  showLoading('wiki-results');
  try {
    const url  = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=7&format=json&origin=*`;
    const res  = await fetch(url);
    const data = await res.json();
    const hits = data?.query?.search;
    if (!hits?.length) { showError('wiki-results', `No results for "<strong>${q}</strong>"`); return; }
    $('wiki-results').innerHTML = hits.map((item, i) => {
      const excerpt = item.snippet.replace(/<[^>]+>/g, '');
      const link    = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g,'_'))}`;
      return `<div class="wiki-item" style="animation-delay:${i*.05}s">
        <div class="wiki-title" onclick="window.open('${link}','_blank')">${item.title}</div>
        <div class="wiki-excerpt">${excerpt}…</div>
        <div class="wiki-footer">
          <span style="font-size:11px;color:var(--text3)">${item.wordcount?.toLocaleString()??'–'} words</span>
          <a class="wiki-link" href="${link}" target="_blank">Read on Wikipedia →</a>
        </div>
      </div>`;
    }).join('');
  } catch { showError('wiki-results', 'Request failed. Check your connection.'); }
}

// ─────────────────────────────────────────
// BOOKS (Open Library)
// ─────────────────────────────────────────
async function searchBooks() {
  const q = ($('books-input') || {}).value?.trim();
  if (!q) return;
  showLoading('books-results');
  try {
    const fields = 'key,title,author_name,first_publish_year,cover_i,ia,has_fulltext,public_scan_b,lending_edition_s,lending_identifier_s';
    const url    = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=${fields}`;
    const res    = await fetch(url);
    const data   = await res.json();
    const docs   = data?.docs;
    if (!docs?.length) { showError('books-results', `No books found for "<strong>${q}</strong>"`); return; }

    $('books-results').innerHTML = docs.map((book, i) => {
      const title   = book.title || 'Untitled';
      const authors = book.author_name?.slice(0,2).join(', ') || 'Unknown author';
      const year    = book.first_publish_year || '';
      const olLink  = `https://openlibrary.org${book.key}`;
      const coverEl = book.cover_i
        ? `<img class="book-cover" src="https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg" alt="${title}" loading="lazy">`
        : `<div class="book-cover-placeholder">📖</div>`;

      const iaId    = Array.isArray(book.ia) ? book.ia[0] : book.ia;
      const lendId  = book.lending_identifier_s || book.lending_edition_s || iaId;
      let readBadge = '', readBtn = '';

      if (book.public_scan_b && iaId) {
        const url = `https://archive.org/details/${iaId}`;
        readBadge = `<span class="book-avail free">✦ Free to read</span>`;
        readBtn   = `<a class="book-read-btn free" href="${url}" target="_blank">Read Free →</a>`;
      } else if (book.has_fulltext && lendId) {
        const url = `https://openlibrary.org/borrow/${lendId}`;
        readBadge = `<span class="book-avail borrow">⟳ Borrow free</span>`;
        readBtn   = `<a class="book-read-btn borrow" href="${url}" target="_blank">Borrow →</a>`;
      } else if (iaId) {
        const url = `https://archive.org/details/${iaId}`;
        readBadge = `<span class="book-avail preview">◈ Preview</span>`;
        readBtn   = `<a class="book-read-btn preview" href="${url}" target="_blank">Preview →</a>`;
      }

      return `<div class="book-item" style="animation-delay:${i*.05}s">
        ${coverEl}
        <div class="book-info">
          <div class="book-title-row"><div class="book-title" title="${title}">${title}</div>${readBadge}</div>
          <div class="book-author">${authors}</div>
          ${year ? `<div class="book-year">First published: ${year}</div>` : ''}
          <div class="book-actions">
            <a class="book-link" href="${olLink}" target="_blank">Open Library →</a>
            ${readBtn}
          </div>
        </div>
      </div>`;
    }).join('');
  } catch { showError('books-results', 'Request failed. Check your connection.'); }
}

// ─────────────────────────────────────────
// GUARDIAN NEWS
// ─────────────────────────────────────────
function loadGuardianKey() {
  const key = localStorage.getItem('rh_guardian_key');
  if (key) activateGuardianSearch(key);
}

function saveGuardianKey() {
  const key = ($('guardian-key-input') || {}).value?.trim();
  if (!key) { alert('Please paste a valid API key.'); return; }
  localStorage.setItem('rh_guardian_key', key);
  activateGuardianSearch(key);
}

function clearGuardianKey() {
  localStorage.removeItem('rh_guardian_key');
  const setup  = $('guardian-setup');
  const search = $('guardian-search');
  const pill   = $('guardian-pill');
  if (setup)  setup.style.display  = 'block';
  if (search) search.style.display = 'none';
  if ($('guardian-key-input')) $('guardian-key-input').value = '';
  if (pill) { pill.textContent = 'free key needed'; pill.style.cssText = 'background:rgba(184,92,58,0.15);color:var(--news);border-color:var(--news)'; }
}

function activateGuardianSearch(key) {
  const setup  = $('guardian-setup');
  const search = $('guardian-search');
  const pill   = $('guardian-pill');
  if (setup)  setup.style.display  = 'none';
  if (search) { search.style.display = 'block'; fetchGuardian(key, 'world'); }
  if (pill) { pill.textContent = '✓ connected'; pill.style.cssText = 'background:rgba(122,171,69,0.12);color:var(--accent2);border-color:var(--accent)'; }
}

async function searchGuardian() {
  const key = localStorage.getItem('rh_guardian_key');
  const q   = ($('guardian-input') || {}).value?.trim() || 'world';
  if (!key) return;
  fetchGuardian(key, q);
}

async function fetchGuardian(key, q) {
  showLoading('guardian-results');
  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(q)}&show-fields=headline&page-size=10&order-by=newest&api-key=${key}`;
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) { showError('guardian-results', 'Invalid API key. <button onclick="clearGuardianKey()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-family:var(--font-mono);font-size:12px">Re-enter →</button>'); return; }
    if (!res.ok) throw new Error();
    const data    = await res.json();
    const results = data?.response?.results;
    if (!results?.length) { showError('guardian-results', `No results for "<strong>${q}</strong>"`); return; }
    $('guardian-results').innerHTML = results.map((item, i) => `
      <div class="news-item" style="animation-delay:${i*.04}s">
        <div class="news-section">${item.sectionName || ''}</div>
        <div class="news-headline">${item.fields?.headline || item.webTitle}</div>
        <div class="news-meta">
          <span class="news-date">${formatDate(item.webPublicationDate)}</span>
          <a class="news-link" href="${item.webUrl}" target="_blank">Read →</a>
        </div>
      </div>`).join('');
  } catch { showError('guardian-results', 'Request failed. Check your connection.'); }
}

// ─────────────────────────────────────────
// DICTIONARY
// ─────────────────────────────────────────
async function lookupWord() {
  const word = ($('dict-input') || {}).value?.trim();
  if (!word) return;
  await performDictLookup(word);
}

function dictSuggest(word) {
  if ($('dict-input')) $('dict-input').value = word;
  performDictLookup(word);
}

async function performDictLookup(word) {
  const el = $('dict-result');
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Looking up…</div>`;

  let entry = null;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (res.ok) entry = (await res.json())[0];
  } catch {}

  if (!entry) {
    const suggestions = await fetchSpellSuggestions(word);
    el.innerHTML = suggestions.length
      ? `<div class="dict-not-found">ไม่พบคำว่า "<strong>${word}</strong>" — Did you mean:</div>
         <div class="dict-suggest-row">${suggestions.map(s=>`<button class="dict-suggest-chip" onclick="dictSuggest('${s.replace(/'/g,"\\'")}')"><span>✦</span>${s}</button>`).join('')}</div>`
      : `<div class="placeholder">No results for "<strong style="color:var(--text)">${word}</strong>"</div>`;
    return;
  }

  const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
  const meanings = entry.meanings.slice(0, 3);
  const texts    = [entry.word];
  meanings.forEach(m => m.definitions.slice(0,2).forEach(d => { texts.push(d.definition); if (d.example) texts.push(d.example); }));

  let html = `<div class="dict-cols">`;
  html += `<div class="dict-col dict-col-en"><div class="dict-col-label">🇬🇧 English</div>`;
  html += `<div class="word-title">${entry.word}</div>`;
  if (phonetic) html += `<div class="phonetic">${phonetic}</div>`;
  meanings.forEach(m => {
    html += `<div class="pos">${m.partOfSpeech}</div>`;
    m.definitions.slice(0,2).forEach(d => {
      html += `<div class="def">• ${d.definition}</div>`;
      if (d.example) html += `<div class="example">"${d.example}"</div>`;
    });
  });
  html += `</div>`;
  html += `<div class="dict-col dict-col-th" id="thai-col">
    <div class="dict-col-label">🇹🇭 ภาษาไทย</div>
    <div class="thai-loading-block">
      <div class="loading" style="padding:10px 0;justify-content:flex-start;gap:8px"><div class="spinner"></div><span style="font-size:12px;color:var(--text3)">กำลังแปล…</span></div>
      <div class="thai-skeleton"></div><div class="thai-skeleton" style="width:80%"></div><div class="thai-skeleton" style="width:60%"></div>
    </div>
  </div>`;
  html += `</div>`;
  el.innerHTML = html;

  fetchThaiFullEntry(entry, meanings, texts);
}

async function fetchSpellSuggestions(word) {
  try {
    const url  = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(word)}&srinfo=suggestion&srprop=&srlimit=3&format=json&origin=*`;
    const data = await (await fetch(url)).json();
    const out  = [];
    const sug  = data?.query?.searchinfo?.suggestion;
    if (sug) out.push(sug);
    (data?.query?.search || []).forEach(h => { if (!out.map(s=>s.toLowerCase()).includes(h.title.toLowerCase()) && h.title.toLowerCase() !== word.toLowerCase()) out.push(h.title); });
    return out.slice(0, 4);
  } catch { return []; }
}

async function translateToThai(text) {
  try {
    const data = await (await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|th`)).json();
    const t    = data?.responseData?.translatedText;
    if (!t || t.trim().toLowerCase() === text.trim().toLowerCase()) return null;
    return { text: t, quality: data?.responseData?.match ?? 0 };
  } catch { return null; }
}

async function fetchThaiFullEntry(entry, meanings, texts) {
  const col = $('thai-col');
  if (!col) return;
  try {
    const results  = await Promise.all(texts.map(t => translateToThai(t)));
    const wordTh   = results[0]?.text || entry.word;
    const quality  = results[0]?.quality ?? 0;
    const posMap   = { noun:'คำนาม', verb:'คำกริยา', adjective:'คำคุณศัพท์', adverb:'คำกริยาวิเศษณ์', pronoun:'คำสรรพนาม', preposition:'คำบุพบท', conjunction:'คำสันธาน', interjection:'คำอุทาน', exclamation:'คำอุทาน' };

    let html = `<div class="dict-col-label">🇹🇭 ภาษาไทย</div>`;
    html += `<div class="word-title thai-word">${wordTh}</div>`;
    html += `<div class="thai-confidence-row"><span class="thai-confidence ${quality>=0.75?'high':'low'}">${quality>=0.75?'✓ แม่นยำ':'~ โดยประมาณ'}</span></div>`;

    let idx = 1;
    meanings.forEach(m => {
      html += `<div class="pos">${posMap[m.partOfSpeech.toLowerCase()] || m.partOfSpeech}</div>`;
      m.definitions.slice(0,2).forEach(d => {
        html += `<div class="def thai-def">• ${results[idx]?.text || '—'}</div>`; idx++;
        if (d.example) { if (results[idx]?.text) html += `<div class="example thai-example">"${results[idx].text}"</div>`; idx++; }
      });
    });
    col.innerHTML = html;
  } catch {
    col.innerHTML = `<div class="dict-col-label">🇹🇭 ภาษาไทย</div><div style="font-size:12px;color:var(--text3);padding:12px 0">ไม่สามารถแปลได้ในขณะนี้</div>`;
  }
}

// ─────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────
window.timelines = {
  'space exploration': [
    {year:'1957',event:'Sputnik 1 — first artificial satellite launched by the USSR'},
    {year:'1961',event:'Yuri Gagarin becomes the first human in space'},
    {year:'1969',event:'Apollo 11 — humans land on the Moon for the first time'},
    {year:'1971',event:'Salyut 1: first space station launched into orbit'},
    {year:'1977',event:'Voyager 1 & 2 launched toward the outer solar system'},
    {year:'1990',event:'Hubble Space Telescope deployed from Space Shuttle Discovery'},
    {year:'1998',event:'International Space Station assembly begins'},
    {year:'2004',event:'Mars rovers Spirit & Opportunity land on the Martian surface'},
    {year:'2020',event:'SpaceX Crew Dragon — first commercial crewed spaceflight'},
    {year:'2021',event:'James Webb Space Telescope launched on Christmas Day'},
  ],
  'artificial intelligence': [
    {year:'1950',event:'Alan Turing publishes "Computing Machinery and Intelligence"'},
    {year:'1956',event:'Dartmouth Conference coins the term "Artificial Intelligence"'},
    {year:'1997',event:'IBM Deep Blue defeats chess world champion Garry Kasparov'},
    {year:'2012',event:'AlexNet wins ImageNet — the deep learning revolution begins'},
    {year:'2016',event:'AlphaGo defeats Go world champion Lee Sedol 4–1'},
    {year:'2017',event:'"Attention Is All You Need" — the Transformer architecture introduced'},
    {year:'2020',event:'GPT-3 released by OpenAI with 175 billion parameters'},
    {year:'2022',event:'ChatGPT launches, bringing AI into mainstream consciousness'},
    {year:'2024',event:'Multimodal AI models and AI agents become widespread'},
  ],
  'medicine': [
    {year:'1796',event:'Edward Jenner develops the first smallpox vaccine'},
    {year:'1847',event:'Ignaz Semmelweis discovers handwashing prevents disease spread'},
    {year:'1895',event:'Wilhelm Röntgen discovers X-rays'},
    {year:'1928',event:'Alexander Fleming discovers penicillin'},
    {year:'1953',event:'Watson & Crick describe the double helix structure of DNA'},
    {year:'1967',event:'First successful heart transplant by Christiaan Barnard'},
    {year:'2003',event:'Human Genome Project completed, mapping all human genes'},
    {year:'2021',event:'First mRNA vaccines approved and deployed globally'},
  ],
  'internet': [
    {year:'1969',event:'ARPANET — first message sent between UCLA and Stanford'},
    {year:'1983',event:'TCP/IP protocol adopted — the modern internet is born'},
    {year:'1991',event:'Tim Berners-Lee publishes the World Wide Web'},
    {year:'1998',event:'Google founded by Brin and Page at Stanford'},
    {year:'2004',event:'Facebook launches; the Web 2.0 era begins'},
    {year:'2007',event:'iPhone launches, starting the mobile internet revolution'},
    {year:'2023',event:'Generative AI reshapes how people search and use the web'},
  ],
  'evolution': [
    {year:'1859',event:'Charles Darwin publishes "On the Origin of Species"'},
    {year:'1865',event:'Gregor Mendel establishes laws of hereditary genetics'},
    {year:'1953',event:'DNA structure discovered — mechanism of inheritance revealed'},
    {year:'1974',event:'"Lucy" fossil found — a 3.2 million year old hominid'},
    {year:'2003',event:'Human Genome Project reveals ~20,000 human genes'},
    {year:'2015',event:'CRISPR-Cas9 enables direct DNA modification'},
    {year:'2022',event:'Svante Pääbo wins Nobel Prize for ancient DNA research'},
  ],
  'climate': [
    {year:'1824',event:'Joseph Fourier first describes the greenhouse effect'},
    {year:'1958',event:'Charles Keeling begins CO₂ monitoring at Mauna Loa'},
    {year:'1988',event:'James Hansen testifies on global warming to US Congress'},
    {year:'1997',event:'Kyoto Protocol — first binding emissions reduction treaty'},
    {year:'2015',event:'Paris Agreement: 196 nations commit to limit warming'},
    {year:'2021',event:'IPCC Sixth Report warns of "code red for humanity"'},
    {year:'2023',event:'Hottest year on record; temperatures breach 1.5°C'},
  ],
  'physics': [
    {year:'1687',event:'Isaac Newton publishes Principia — laws of motion & gravity'},
    {year:'1865',event:'Maxwell unifies electricity, magnetism, and light'},
    {year:'1905',event:'Einstein\'s miracle year — special relativity and E=mc²'},
    {year:'1915',event:'Einstein publishes General Theory of Relativity'},
    {year:'1927',event:'Heisenberg\'s Uncertainty Principle established'},
    {year:'2012',event:'Higgs boson discovered at CERN\'s LHC'},
    {year:'2015',event:'LIGO detects gravitational waves for the first time'},
    {year:'2019',event:'First photograph of a black hole captured'},
  ],
};

function loadTimeline(topic) {
  const input = $('tl-input');
  const q     = topic || input?.value.trim().toLowerCase();
  const el    = $('tl-result');
  if (!q || !el) return;

  if (input) input.value = q;

  // Highlight active topic button
  document.querySelectorAll('.tl-topic-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.topic === q);
  });

  let match = null;
  for (const key of Object.keys(window.timelines)) {
    if (key === q || key.includes(q) || q.includes(key) || key.split(' ').some(w => q.includes(w))) { match = key; break; }
  }

  if (match) {
    el.innerHTML = window.timelines[match].map((item, i) => `
      <div class="tl-item" style="animation-delay:${i*.045}s">
        <span class="tl-year">${item.year}</span>
        <span class="tl-event">${item.event}</span>
      </div>`).join('');
  } else {
    el.innerHTML = `<div class="api-empty">No timeline for "<strong style="color:var(--text)">${q}</strong>". Try the topic buttons above.</div>`;
  }
}

// ─────────────────────────────────────────
// SAVED TOPICS
// ─────────────────────────────────────────
let topics = JSON.parse(localStorage.getItem('rh_topics') || '[]');

function renderTopics() {
  const list  = $('topics-list');
  const count = $('topics-count');
  if (count) count.textContent = `${topics.length} saved`;
  if (!list) return;
  if (!topics.length) { list.innerHTML = '<span style="font-size:12px;color:var(--text3)">No topics saved yet</span>'; return; }
  list.innerHTML = topics.map((t, i) => {
    const safe = t.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<div class="topic-chip">
      <span onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(t)}','_blank')">${t}</span>
      <button onclick="removeTopic(${i})" title="Remove">×</button>
    </div>`;
  }).join('');
}

function addTopic() {
  const input = $('topic-input');
  const val   = input?.value.trim();
  if (!val || topics.includes(val)) { if (input) input.value = ''; return; }
  topics.unshift(val);
  localStorage.setItem('rh_topics', JSON.stringify(topics));
  renderTopics();
  if (input) input.value = '';
}

function removeTopic(i) {
  topics.splice(i, 1);
  localStorage.setItem('rh_topics', JSON.stringify(topics));
  renderTopics();
}

// ─────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────
function initNotes() {
  const notesEl     = $('notes-area');
  const notesStatus = $('notes-status');
  if (!notesEl) return;
  notesEl.value = localStorage.getItem('rh_notes') || '';
  let saveTimer;
  notesEl.addEventListener('input', () => {
    if (notesStatus) { notesStatus.textContent = 'unsaved…'; notesStatus.className = 'notes-status'; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem('rh_notes', notesEl.value);
      if (notesStatus) { notesStatus.textContent = '✓ saved'; notesStatus.className = 'notes-status saved'; }
      setTimeout(() => { if (notesStatus) { notesStatus.textContent = ''; notesStatus.className = 'notes-status'; } }, 2200);
    }, 800);
  });
}

function clearNotes() {
  if (confirm('Clear all notes?')) {
    if ($('notes-area'))   $('notes-area').value         = '';
    if ($('notes-status')) $('notes-status').textContent = 'cleared';
    localStorage.removeItem('rh_notes');
  }
}