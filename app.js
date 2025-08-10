// ===== Dynamic Resume (Supabase, ESM) =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ---- Supabase (public anon) ----
const SUPABASE_URL = 'https://xdyakuhwzgxvqcwtfxbb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWFrdWh3emd4dnFjd3RmeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDUwMjMsImV4cCI6MjA3MDM4MTAyM30.2oNQ3Y5bBc9Il2mcVDTUZ4DATGaQBFw9c3EpfOG0C_Y'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

// ---- Reveal ----
;(() => {
  const els = document.querySelectorAll('.card, header.hero, section')
  els.forEach((el,i)=>{
    el.style.opacity = 0; el.style.transform = 'translateY(8px)'
    setTimeout(() => {
      el.style.transition = 'opacity .4s ease, transform .4s ease'
      el.style.opacity = 1; el.style.transform = 'none'
    }, 60 * i)
  })
})()

function iconFor(key){
  const icons = {
    growth: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21V10m0 0l5 5 5-7 6 6 2-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    automation: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v4M12 17v4M4 12h4m8 0h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    mic: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm-7 9a7 7 0 0014 0m-7 7v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  }
  return icons[key] || icons.growth
}

// ========== SUMMARY ==========
async function loadSummary() {
  const { data, error } = await sb
    .from('summary')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) { console.error('[summary]', error); return }
  const card = $('#summary-card')
  if (card) {
    card.innerHTML = data?.summary
      ? `<p>${esc(data.summary)}</p>`
      : '<p>No summary available.</p>'
  }
}

// ========== PROFILE ==========
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

// ========== IMPACT ==========
async function loadImpact() {
  const { data, error } = await sb.from('impact_stats').select('*').eq('published', true).order('order_index', { ascending: true })
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

// ========== EXPERIENCE ==========
async function loadExperiences() {
  const { data, error } = await sb
    .from('experiences').select('*').eq('published', true)
    .order('start_date', { ascending: false }).order('order_index', { ascending: true })
  if (error) { console.error('[experiences]', error); return }
  const tl = $('#timeline-list')
  const html = (data || []).map(x => {
    const where  = [x.city, x.country].filter(Boolean).join(', ')
    const start  = x.start_date ? fmt(x.start_date) : ''
    const end    = x.end_date ? fmt(x.end_date) : 'Present'
    const bullets = (x.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')
    return `
      <article class="tl-item" role="listitem">
        <div class="tl-head">
          <div>
            <div class="tl-role"><strong>${esc(x.title)}</strong></div>
            <div class="tl-org">${esc(x.organization)} ${where ? '— ' + esc(where) : ''}</div>
          </div>
          <div class="tl-meta">${[start, end].filter(Boolean).join(' – ')}</div>
        </div>
        ${bullets ? `<div class="tl-body"><ul>${bullets}</ul></div>` : ''}
      </article>
    `
  }).join('')
  if (tl) tl.innerHTML = html || '<div class="tl-item"><div class="tl-body">No experience yet.</div></div>'
}

// ========== SKILLS ==========
async function loadSkills() {
  const { data: groups, error } = await sb
    .from('skill_groups').select('id, group_name').eq('published', true).order('order_index', { ascending: true })
  if (error) { console.error('[skill_groups]', error); return }
  const blocks = []
  for (const g of (groups || [])) {
    const { data: items } = await sb
      .from('skills').select('label').eq('group_id', g.id).eq('published', true).order('order_index', { ascending: true })
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

// ========== PROJECTS ==========
async function loadProjects() {
  const { data, error } = await sb
    .from('projects').select('*').eq('published', true).order('order_index', { ascending: true })
  if (error) { console.error('[projects]', error); return }
  const grid = $('#projects-grid')
  const html = (data || []).map(p => `
    <article class="card">
      <h3 class="project-title">${esc(p.name)}</h3>
      <div class="tag-row">
        ${(p.tags || []).map(t => `<span class="tag chip"><span class="dot"></span>${esc(t)}</span>`).join('')}
      </div>
      ${p.summary ? `<p class="project-summary">${esc(p.summary)}</p>` : ''}
    </article>
  `).join('')
  if (grid) grid.innerHTML = html || '<div class="card">No projects yet.</div>'
}

// ========== EDUCATION ==========
async function loadEducation() {
  const { data, error } = await sb
    .from('education').select('*').eq('published', true).order('order_index', { ascending: true })
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

// ---- Boot ----
;(async () => {
  await Promise.allSettled([
    loadProfile(),
    loadSummary(),   // 👈 added
    loadImpact(),
    loadExperiences(),
    loadSkills(),
    loadProjects(),
    loadEducation()
  ])
})()
