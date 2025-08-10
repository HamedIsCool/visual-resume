// ===== Dynamic Resume (Supabase, ESM) =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://xdyakuhwzgxvqcwtfxbb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWFrdWh3emd4dnFjd3RmeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDUwMjMsImV4cCI6MjA3MDM4MTAyM30.2oNQ3Y5bBc9Il2mcVDTUZ4DATGaQBFw9c3EpfOG0C_Y'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $  = (sel) => document.querySelector(sel)
const esc = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const fmt = (d) => new Date(d).toLocaleString('en', { month: 'short', year: 'numeric' })

;(() => {
  const els = document.querySelectorAll('.card, header.hero, section')
  els.forEach((el,i)=>{
    el.style.opacity = 0
    el.style.transform = 'translateY(8px)'
    setTimeout(() => {
      el.style.transition = 'opacity .4s ease, transform .4s ease'
      el.style.opacity = 1
      el.style.transform = 'none'
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

async function loadProfile() {
  const { data, error } = await sb.from('profile').select('*').limit(1).single()
  if (error) { console.error('[profile]', error); return }

  $('.name')?.(name => name.textContent = data.full_name || 'Your Name') ?? null
  const roleEl = $('.role'); if (roleEl) roleEl.textContent = data.role || ''

  const contact = $('#contact')
  if (contact) {
    const parts = [
      esc(data.location || ''),
      data.email ? `<a href="mailto:${esc(data.email)}">${esc(data.email)}</a>` : '',
      data.phone ? `<a href="tel:${esc(data.phone)}">${esc(data.phone)}</a>` : '',
      data.linkedin ? `<a href="${esc(data.linkedin)}" rel="noopener">LinkedIn</a>` : '',
      data.website ? `<a href="${esc(data.website)}" rel="noopener">Website</a>` : ''
    ].filter(Boolean)
    contact.innerHTML = parts.join(' • ')
  }

  const av = $('#avatar-initials'); if (av) av.textContent = (data.initials || 'HN').slice(0,3).toUpperCase()
}

async function loadImpact() {
  const { data, error } = await sb
    .from('impact_stats').select('*').eq('published', true).order('order_index', { ascending: true })
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

async function loadExperiences() {
  const { data, error } = await sb
    .from('experiences').select('*').eq('published', true)
    .order('start_date', { ascending: false }).order('order_index', { ascending: true })
  if (error) { console.error('[experiences]', error); return }
  const tl = $('#timeline-list')
  const html = (data || []).map(x => {
    const where = [x.city, x.country].filter(Boolean).join(', ')
    const start = fmt(x.start_date)
    const end = x.end_date ? fmt(x.end_date) : 'Present'
    const bullets = (x.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')
    return `
      <article class="tl-item" role="listitem">
        <div class="tl-head">
          <div>
            <div class="tl-role"><strong>${esc(x.title)}</strong></div>
            <div class="tl-org">${esc(x.organization)} ${where ? '— ' + esc(where) : ''}</div>
          </div>
          <div class="tl-meta">${start} – ${end}</div>
        </div>
        ${bullets ? `<div class="tl-body"><ul>${bullets}</ul></div>` : ''}
      </article>
    `
  }).join('')
  if (tl) tl.innerHTML = html || '<div class="tl-item"><div class="tl-body">No experience yet.</div></div>'
}

async function loadSkills() {
  const { data: groups, error } = await sb
    .from('skill_groups').select('id, group_name').eq('published', true).order('order_index', { ascending: true })
  if (error) { console.error('[skill_groups]', error); return }
  const blocks = []
  for (const g of (groups || [])) {
    const { data: items, error: e2 } = await sb
      .from('skills').select('label').eq('group_id', g.id).eq('published', true).order('order_index', { ascending: true })
    if (e2) { console.error('[skills]', e2); continue }
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

;(async () => {
  await Promise.allSettled([
    loadProfile(),
    loadImpact(),
    loadExperiences(),
    loadSkills(),
    loadProjects(),
    loadEducation()
  ])
})()
