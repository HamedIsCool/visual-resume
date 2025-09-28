// ===== Dynamic Resume + Simple Router (Supabase, ESM) =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ---- Supabase (public anon) ----
const SUPABASE_URL = 'https://xdyakuhwzgxvqcwtfxbb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWFrdWh3emd4dnFjd3RmeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDUwMjMsImV4cCI6MjA3MDM4MTAyM30.2oNQ3Y5bBc9Il2mcVDTUZ4DATGaQBFw9c3EpfOG0C_Y'
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---- Helpers ----
const $  = (sel) => document.querySelector(sel)
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const fmt = (d) => new Date(d).toLocaleString('en', { month: 'short', year: 'numeric' })
const addHttps = (u='') => !u ? '' : (/^https?:\/\//i.test(u) ? u : `https://${u}`)
const telHref  = (p='') => p ? `tel:${String(p).replace(/[^\d+]/g,'')}` : ''

function displayUrl(u='') {
  if (!u) return ''
  try {
    const url = new URL(addHttps(u))
    const host = url.hostname.replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/,'')
    const parts = path.split('/').filter(Boolean).slice(0,2)
    const tail = parts.length ? `/${parts.join('/')}${path.split('/').filter(Boolean).length>2 ? '/…' : ''}` : ''
    return `${host}${tail}`
  } catch {
    return u.replace(/^https?:\/\//i,'').replace(/\/+$/,'')
  }
}

// Pretty location + work format
function placeWithFormat(x){
  const loc = [x.city, x.country].filter(Boolean).join(', ')
  const f = (x.format || '').toString().trim().toLowerCase()
  if (!f && !loc) return ''
  if (f === 'remote') return loc ? `Remote — based in ${loc}` : 'Remote'
  if (f === 'hybrid') return loc ? `${loc} (Hybrid)` : 'Hybrid'
  if (f === 'onsite') return loc ? `${loc} (Onsite)` : 'Onsite'
  if (f === 'contract') return loc ? `${loc} (Contract)` : 'Contract'
  return f ? (loc ? `${loc} (${x.format})` : x.format) : loc
}

// ---- Reveal animation ----
function reveal() {
  const els = document.querySelectorAll('.card, header.hero, section')
  els.forEach((el,i)=>{
    el.style.opacity = 0; el.style.transform = 'translateY(8px)'
    setTimeout(() => {
      el.style.transition = 'opacity .4s ease, transform .4s ease'
      el.style.opacity = 1; el.style.transform = 'none'
    }, 60 * i)
  })
}

// ---------- RESUME LOADERS ----------
async function loadSummary() {
  const { data, error } = await sb
    .from('summary').select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1).single()
  if (error) { console.error('[summary]', error); return }
  const card = $('#summary-card')
  if (card) {
    card.innerHTML = data?.summary
      ? `<p>${esc(data.summary)}</p>`
      : '<p>No summary available.</p>'
  }
}

async function loadProfile() {
  const { data, error } = await sb.from('profile').select('*').limit(1).single()
  if (error) { console.error('[profile]', error); return }
  const nameEl = $('.name'); if (nameEl) nameEl.textContent = data.full_name || 'Your Name'
  const roleEl = $('.role'); if (roleEl) roleEl.textContent = data.role || ''
  const contactEl = $('#contact')
  if (contactEl) {
    const parts = []
    if (data.location) parts.push(`<span class="contact-item">${esc(data.location)}</span>`)
    if (data.email)    parts.push(`<a class="contact-item" href="mailto:${esc(data.email)}" target="_blank" rel="noopener">${esc(data.email)}</a>`)
    if (data.phone)    parts.push(`<a class="contact-item" href="${telHref(data.phone)}">${esc(data.phone)}</a>`)
    if (data.linkedin) {
      const href = addHttps(data.linkedin)
      parts.push(`<a class="contact-item" href="${esc(href)}" target="_blank" rel="noopener">${esc(displayUrl(href))}</a>`)
    }
    if (data.website) {
      const href = addHttps(data.website)
      parts.push(`<a class="contact-item" href="${esc(href)}" target="_blank" rel="noopener">${esc(displayUrl(href))}</a>`)
    }
    contactEl.innerHTML = parts.join('<span class="sep">•</span>')
  }
  const av = $('#avatar-initials')
  if (av) {
    const fallback = (data.full_name || 'HN').split(' ').map(w=>w[0]).join('')
    av.textContent = (data.initials || fallback).slice(0,3).toUpperCase()
  }
}

async function loadImpact() {
  const { data, error } = await sb.from('impact_stats')
    .select('*').eq('published', true)
    .order('order_index', { ascending: true })
  if (error) { console.error('[impact_stats]', error); return }
  const box = $('#impact-stats')
  const html = (data || []).map(d => `
    <div class="card stat">
      <div class="icon" aria-hidden="true">${iconFor(d.icon)}</div>
      <div><h3>${esc(d.headline)}</h3><p>${esc(d.subline || '')}</p></div>
    </div>
  `).join('')
  if (box) box.innerHTML = html || '<div class="card">No impact stats yet.</div>'
}
function iconFor(key){
  const icons = {
    growth: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21V10m0 0l5 5 5-7 6 6 2-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    automation: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M4 12h4m8 0h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    mic: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm-7 9a7 7 0 0014 0m-7 7v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  }
  return icons[key] || icons.growth
}

async function loadExperiences() {
  const { data, error } = await sb
    .from('experiences').select('*')
    .eq('published', true)
    .order('start_date', { ascending: false })
    .order('order_index', { ascending: true })
  if (error) { console.error('[experiences]', error); return }
  const tl = $('#timeline-list')
  const html = (data || []).map(x => {
    const start   = x.start_date ? fmt(x.start_date) : ''
    const the_end = x.end_date ? fmt(x.end_date) : 'Present'
    const where   = placeWithFormat(x)
    const bullets = (x.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')
    return `
      <article class="tl-item" role="listitem">
        <div class="tl-head">
          <div>
            <div class="tl-role"><strong>${esc(x.title)}</strong></div>
            <div class="tl-org">${esc(x.organization)} ${where ? '— ' + esc(where) : ''}</div>
          </div>
          <div class="tl-meta">${[start, the_end].filter(Boolean).join(' – ')}</div>
        </div>
        ${bullets ? `<div class="tl-body"><ul>${bullets}</ul></div>` : ''}
      </article>
    `
  }).join('')
  if (tl) tl.innerHTML = html || '<div class="tl-item"><div class="tl-body">No experience yet.</div></div>'
}

async function loadSkills() {
  const { data: groups, error } = await sb
    .from('skill_groups').select('id, group_name')
    .eq('published', true).order('order_index', { ascending: true })
  if (error) { console.error('[skill_groups]', error); return }
  const blocks = []
  for (const g of (groups || [])) {
    const { data: items } = await sb
      .from('skills').select('label')
      .eq('group_id', g.id).eq('published', true)
      .order('order_index', { ascending: true })
    const pillRow = (items || []).map(s => `<span class="pill">${esc(s.label)}</span>`).join('')
    blocks.push(`
      <div class="card skill-line">
        <div class="skill-line-head">${esc(g.group_name)}:</div>
        <div class="skill-line-pills">${pillRow}</div>
      </div>
    `)
  }
  const grid = $('#skills-grid')
  if (grid) grid.innerHTML = blocks.join('') || '<div class="card">No skills yet.</div>'
}

const ICONS = {
  demo: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16v12H4zM8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.19-3.37-1.19-.45-1.15-1.11-1.46-1.11-1.46-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.26-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.03A9.56 9.56 0 0112 6.8c.85 0 1.71.12 2.51.34 1.9-1.3 2.74-1.03 2.74-1.03.55 1.41.2 2.45.1 2.71.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.43-.01 2.76 0 .26.18.58.69.48A10 10 0 0012 2z" stroke="currentColor" stroke-width="1.5"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16l6-3 6 3V8l-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

async function loadProjects() {
  const { data, error } = await sb
    .from('projects').select('*')
    .eq('published', true)
    .order('order_index', { ascending: true })
  if (error) { console.error('[projects]', error); return }
  const grid = $('#projects-grid')
  const html = (data || []).map(p => {
    const tags = (p.tags || []).map(t => `<span class="tag chip"><span class="dot"></span>${esc(t)}</span>`).join('')
    const title = p.link || p.demo_url
      ? `<a href="${esc(addHttps(p.link || p.demo_url))}" target="_blank" rel="noopener">${esc(p.name)}</a>`
      : esc(p.name)
    const links = [
      p.demo_url ? `<a class="btn-link" href="${esc(addHttps(p.demo_url))}" target="_blank" rel="noopener">${ICONS.demo}<span>Live demo</span></a>` : '',
      p.repo_url ? `<a class="btn-link" href="${esc(addHttps(p.repo_url))}" target="_blank" rel="noopener">${ICONS.github}<span>GitHub</span></a>` : '',
      p.case_study_url ? `<a class="btn-link" href="${esc(addHttps(p.case_study_url))}" target="_blank" rel="noopener">${ICONS.doc}<span>Case study</span></a>` : ''
    ].filter(Boolean).join('')
    return `
      <article class="card">
        ${p.image_url ? `<img class="project-thumb" src="${esc(p.image_url)}" alt="${esc(p.name)} thumbnail">` : ''}
        <h3 class="project-title">${title}</h3>
        <div class="tag-row">${tags}</div>
        ${p.summary ? `<p class="project-summary">${esc(p.summary)}</p>` : ''}
        ${links ? `<div class="project-links">${links}</div>` : ''}
      </article>
    `
  }).join('')
  if (grid) grid.innerHTML = html || '<div class="card">No projects yet.</div>'
}

async function loadEducation() {
  const { data, error } = await sb
    .from('education').select('*').eq('published', true)
    .order('order_index', { ascending: true })
  if (error) { console.error('[education]', error); return }
  const card = $('#education-card')
  const html = (data || []).map(e => {
    const loc = [e.city, e.country].filter(Boolean).join(', ')
    const years = `${e.start_year ?? ''} – ${e.end_year ?? 'Present'}`
    const notes = (e.notes || []).map(n => `<li>${esc(n)}</li>`).join('')
    return `
      <div class="tl-head">
        <div>
          <div class="tl-role"><strong>${esc(e.degree)}</strong></div>
          <div class="tl-org">${esc(e.institution)} ${loc ? '— ' + esc(loc) : ''}</div>
        </div>
        <div class="tl-meta">${years}</div>
      </div>
      ${notes ? `<div class="tl-body"><ul>${notes}</ul></div>` : ''}
    `
  }).join('')
  if (card) card.innerHTML = html || '<div class="card">No education yet.</div>'
}

// ---------- BLOG (internal) ----------
async function loadBlogIndex() {
  const list = $('#blog-list'); if (!list) return
  list.textContent = 'Loading posts…'
  const { data, error } = await sb
    .from('blog_posts')
    .select('slug, title, excerpt, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(50)
  if (error) { console.error('[blog_posts]', error); list.textContent = 'Failed to load posts.'; return }
  if (!data?.length) { list.innerHTML = '<p>No posts yet.</p>'; return }
  list.innerHTML = data.map(p => `
    <article class="card" style="margin-bottom:10px">
      <h3 style="margin:0 0 6px"><a href="#/blog/${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h3>
      <p class="muted" style="margin:0 0 8px">${p.published_at ? new Date(p.published_at).toLocaleDateString() : ''}${p.tags?.length ? ' • ' + p.tags.join(' · ') : ''}</p>
      ${p.excerpt ? `<p style="margin:0">${esc(p.excerpt)}</p>` : ''}
    </article>
  `).join('')
}

function mdToHtml(md='') {
  let h = esc(md)
  h = h.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
       .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
       .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
       .replace(/^### (.*)$/gm, '<h3>$1</h3>')
       .replace(/^## (.*)$/gm, '<h2>$1</h2>')
       .replace(/^# (.*)$/gm, '<h1>$1</h1>')
       .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
       .replace(/\*(.+?)\*/g, '<em>$1</em>')
       .replace(/`(.+?)`/g, '<code>$1</code>')
       .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${addHttps(u)}" target="_blank" rel="noopener">${t}</a>`)
  h = h.split(/\n{2,}/).map(p => /^<h\d|^<ul|^<ol|^<pre|^<blockquote/.test(p) ? p : `<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n')
  return h
}

async function loadBlogPost(slug) {
  const postBox = $('#blog-post')
  const listBox = $('#blog-list')
  const mediumCard = $('#medium-card')
  if (!postBox || !listBox) return

  if (mediumCard) mediumCard.setAttribute('hidden','')   // hide Medium on single-post
  listBox.hidden = true
  postBox.hidden = false
  postBox.innerHTML = 'Loading post…'

  const { data, error } = await sb
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .limit(1).single()

  if (error || !data) {
    console.error('[blog_posts one]', error)
    postBox.innerHTML = '<p>Post not found.</p>'
    return
  }

  const when = data.published_at ? new Date(data.published_at).toLocaleDateString() : ''
  const tags = (data.tags || []).join(' · ')
  postBox.innerHTML = `
    <article>
      <a href="#/blog" class="btn btn-back" style="margin-bottom:12px">← Back to posts</a>
      <h1 style="margin:6px 0 4px">${esc(data.title)}</h1>
      <p class="muted" style="margin:0 0 14px">${when}${tags ? ' • ' + tags : ''}</p>
      <div class="post-body">${mdToHtml(data.content_md || '')}</div>
    </article>
  `
}

// ---------- MEDIUM (fast render + background image upgrade) ----------
let mediumCache = null; // { items, ts }
const MEDIUM_PLACEHOLDER = 'public/medium-placeholder.png';
const LS_KEY = 'mediumItems_v1';
const CACHE_MS = 30 * 60 * 1000;

function renderMediumList(box, items) {
  if (!items?.length) { box.innerHTML = '<p class="muted">No Medium posts yet.</p>'; return; }
  box.innerHTML = items.map(it => {
    const date = it.pubDate ? new Date(it.pubDate).toLocaleDateString() : '';
    const imgSrc = it.image ? esc(it.image) : MEDIUM_PLACEHOLDER;
    return `
      <article class="card" style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px">
        <div style="position:relative;width:120px;height:80px;border-radius:8px;overflow:hidden;flex:0 0 auto;background:linear-gradient(135deg,#eee,#ddd)">
          <img src="${imgSrc}" alt="" loading="lazy"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="if(!this.dataset.fallback){this.dataset.fallback=1; this.src='${MEDIUM_PLACEHOLDER}';} else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }">
          <div style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;font-size:28px">📄</div>
        </div>
        <div>
        <h3><a style="color:#080808" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title || 'Untitled')}</a></h3>
          <p class="muted" style="margin:0 0 4px">${date}</p>
          ${it.preview ? `<p style="margin:6px 0 8px">${esc(it.preview)}…</p>` : ''}
          <p style="margin:0"><a class="btn-link" href="${esc(it.url)}" target="_blank" rel="noopener">Read on Medium →</a></p>
        </div>
      </article>`;
  }).join('');
}

function loadMediumFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.items?.length) return null;
    if ((Date.now() - data.ts) > CACHE_MS) return null;
    return data;
  } catch { return null; }
}

function saveMediumToStorage(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ items, ts: Date.now() })); } catch {}
}

async function loadFeaturedMediumFromFeed() {
  const box = document.getElementById('medium-card');
  if (!box) return;

  // 1) Instant paint from localStorage (if warm)
  const stored = loadMediumFromStorage();
  if (stored) {
    mediumCache = stored;
    renderMediumList(box, stored.items);
  } else {
    box.innerHTML = '<p class="muted">Loading Medium…</p>';
  }

  // 2) Fast fetch (no OG images) for fresh data
  try {
    const fastUrl = 'https://xdyakuhwzgxvqcwtfxbb.supabase.co/functions/v1/medium-latest?handle=hamednoroozi&limit=10&fast=1';
    const res = await fetch(fastUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length) {
        mediumCache = { items: data.items, ts: Date.now() };
        saveMediumToStorage(data.items);
        renderMediumList(box, data.items);
      }
    }
  } catch (e) {
    console.error('[medium fast]', e);
  }

  // 3) Background "image upgrade" (few OG lookups, short timeout)
  try {
    const upgradeUrl = 'https://xdyakuhwzgxvqcwtfxbb.supabase.co/functions/v1/medium-latest?handle=hamednoroozi&limit=10&fast=0&og_limit=3&timeout=900';
    const res2 = await fetch(upgradeUrl, { cache: 'no-store' });
    if (res2.ok) {
      const upd = await res2.json();
      if (Array.isArray(upd?.items) && upd.items.length) {
        // Only re-render if at least one image improved
        let improved = false;
        if (mediumCache?.items?.length === upd.items.length) {
          for (let i = 0; i < upd.items.length; i++) {
            if (!mediumCache.items[i].image && upd.items[i].image) { improved = true; break; }
          }
        } else {
          improved = true;
        }
        mediumCache = { items: upd.items, ts: Date.now() };
        saveMediumToStorage(upd.items);
        if (improved) renderMediumList(box, upd.items);
      }
    }
  } catch (e) {
    console.error('[medium upgrade]', e);
  }
}
// ---------- ROUTER ----------
const routes = ['#/home', '#/resume', '#/blog', '#/portfolio']
function showRoute(hash) {
  const h = hash || location.hash || '#/home'
  document.querySelectorAll('.route').forEach(el => el.classList.remove('active'))

  if (h.startsWith('#/blog/')) {
    $('#route-blog')?.classList.add('active')
    loadBlogPost(decodeURIComponent(h.split('/').slice(2).join('/')))
  } else if (h === '#/blog') {
    $('#route-blog')?.classList.add('active')
    $('#blog-post')?.setAttribute('hidden','')
    $('#blog-list')?.removeAttribute('hidden')
    $('#medium-card')?.removeAttribute('hidden')  // show embed on list
    loadFeaturedMediumFromFeed()
    loadBlogIndex()
  } else if (h === '#/resume') {
    $('#route-resume')?.classList.add('active')
  } else if (h === '#/portfolio') {
    $('#route-portfolio')?.classList.add('active')
  } else {
    $('#route-home')?.classList.add('active')
  }
  reveal()
}

window.addEventListener('hashchange', () => showRoute(location.hash))

// ---- Boot ----
;(async () => {
  await Promise.allSettled([
    loadProfile(),
    loadSummary(),
    loadImpact(),
    loadExperiences(),
    loadSkills(),
    loadProjects(),
    loadEducation()
  ])
  if (!location.hash) location.hash = '#/home'
  showRoute(location.hash)
})()
