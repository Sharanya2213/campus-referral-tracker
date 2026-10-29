import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  Info,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import {
  CAMPAIGN_BUDGET,
  CHANNELS,
  TARGET_REGISTRATIONS,
  formatDate,
  getAnalytics,
  getGrowthRecommendations,
  getLastSevenDays,
  normalizeCode,
} from './agents'
import './App.css'

const REGISTRATIONS_KEY = 'campus-referral-registrations'
const AMBASSADORS_KEY = 'campus-referral-ambassadors'
const SPENDING_KEY = 'campus-referral-spending'

const emptyRegistration = {
  name: '',
  email: '',
  college: '',
  source: CHANNELS[0],
  ambassadorCode: '',
}

const emptyAmbassador = { name: '', college: '', code: '' }

function readStorage(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(stored)
      ? stored.filter((item) => item && typeof item === 'object')
      : []
  } catch {
    return []
  }
}

function readSpending() {
  try {
    const value = Number(localStorage.getItem(SPENDING_KEY))
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [registrations, setRegistrations] = useState(() => readStorage(REGISTRATIONS_KEY))
  const [ambassadors, setAmbassadors] = useState(() => readStorage(AMBASSADORS_KEY))
  const [spending, setSpending] = useState(readSpending)
  const [registrationForm, setRegistrationForm] = useState(emptyRegistration)
  const [ambassadorForm, setAmbassadorForm] = useState(emptyAmbassador)
  const [registrationSearch, setRegistrationSearch] = useState('')
  const [notice, setNotice] = useState(null)

  const analytics = useMemo(
    () => getAnalytics(registrations, ambassadors),
    [registrations, ambassadors],
  )
  const recommendations = useMemo(
    () => getGrowthRecommendations(analytics),
    [analytics],
  )
  const progress = Math.min(100, Math.round((registrations.length / TARGET_REGISTRATIONS) * 100))
  const remainingBudget = Math.max(CAMPAIGN_BUDGET - spending, 0)
  const costPerRegistration =
    spending > 0 && registrations.length > 0 ? spending / registrations.length : null

  function showNotice(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }

  function saveRegistrations(next) {
    try {
      localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(next))
      setRegistrations(next)
      return true
    } catch {
      showNotice('Could not save registrations in this browser.', 'error')
      return false
    }
  }

  function saveAmbassadors(next) {
    try {
      localStorage.setItem(AMBASSADORS_KEY, JSON.stringify(next))
      setAmbassadors(next)
      return true
    } catch {
      showNotice('Could not save ambassadors in this browser.', 'error')
      return false
    }
  }

  function saveSpending(value) {
    const next = Number(value)
    if (!Number.isFinite(next) || next < 0) {
      showNotice('Enter a valid non-negative spending amount.', 'error')
      return
    }
    try {
      localStorage.setItem(SPENDING_KEY, String(next))
      setSpending(next)
      showNotice('Campaign spending saved.')
    } catch {
      showNotice('Could not save spending in this browser.', 'error')
    }
  }

  function handleRegistrationSubmit(event) {
    event.preventDefault()
    const form = registrationForm
    if (!form.name.trim() || !form.email.trim() || !form.college.trim()) {
      showNotice('Please complete the required fields.', 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showNotice('Enter a valid email address.', 'error')
      return
    }
    const normalizedEmail = form.email.trim().toLowerCase()
    if (registrations.some((item) => typeof item?.email === 'string' && item.email.trim().toLowerCase() === normalizedEmail)) {
      showNotice('A registration with this email already exists.', 'error')
      return
    }
    const matchedAmbassador = ambassadors.find(
      (item) => normalizeCode(item?.code) === normalizeCode(form.ambassadorCode),
    )
    if (form.ambassadorCode.trim() && !matchedAmbassador) {
      showNotice('That ambassador referral code is not recognised.', 'error')
      return
    }
    saveRegistrations([
      {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        college: form.college.trim(),
        ambassadorCode: matchedAmbassador?.code || '',
        id: createId(),
        createdAt: new Date().toISOString(),
      },
      ...registrations,
    ])
    setRegistrationForm(emptyRegistration)
    showNotice('Registration added successfully.')
  }

  function handleAmbassadorSubmit(event) {
    event.preventDefault()
    const form = ambassadorForm
    if (!form.name.trim() || !form.college.trim() || !form.code.trim()) {
      showNotice('Please complete all ambassador fields.', 'error')
      return
    }
    if (ambassadors.some((item) => normalizeCode(item?.code) === normalizeCode(form.code))) {
      showNotice('Referral codes must be unique.', 'error')
      return
    }
    saveAmbassadors([
      { ...form, name: form.name.trim(), college: form.college.trim(), code: form.code.trim() },
      ...ambassadors,
    ])
    setAmbassadorForm(emptyAmbassador)
    showNotice('Ambassador added to the leaderboard.')
  }

  function deleteRegistration(id) {
    const registration = registrations.find((item) => item.id === id)
    if (registration && window.confirm(`Delete the registration for ${registration.name}?`)) {
      saveRegistrations(registrations.filter((item) => item.id !== id))
      showNotice('Registration deleted.')
    }
  }

  function exportCsv() {
    const headings = ['Student name', 'Email', 'College', 'Referral source', 'Ambassador code', 'Registered on']
    const rows = registrations.map((item) => [
      item.name,
      item.email,
      item.college,
      item.source,
      item.ambassadorCode || '—',
      formatDate(item.createdAt),
    ])
    const csv = [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'campus-referral-registrations.csv'
    link.click()
    URL.revokeObjectURL(url)
    showNotice('CSV export downloaded.')
  }

  const filteredRegistrations = registrations.filter((item) =>
    [item?.name, item?.email, item?.college, item?.source]
      .join(' ')
      .toLowerCase()
      .includes(registrationSearch.toLowerCase()),
  )

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registrations', label: 'Registrations', icon: ClipboardList, count: registrations.length },
    { id: 'ambassadors', label: 'Ambassadors', icon: Users, count: ambassadors.length },
  ]

  return (
    <div className="app-shell">
      {isSidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={19} /></div>
          <div><strong>Campus<span>Pulse</span></strong><small>Growth Challenge</small></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <div className="campaign-card">
          <div className="campaign-label"><span className="live-dot" /> LIVE CAMPAIGN</div>
          <strong>AI Workshop</strong>
          <p>7-day registration sprint</p>
          <div className="mini-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="campaign-meta"><span>{registrations.length} registered</span><span>{TARGET_REGISTRATIONS} goal</span></div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-heading">Workspace</p>
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={`nav-item ${activeView === id ? 'active' : ''}`} onClick={() => { setActiveView(id); setSidebarOpen(false) }}>
              <Icon size={18} /><span>{label}</span>{count > 0 && <em>{count}</em>}
            </button>
          ))}
          <p className="nav-heading nav-heading-spaced">Resources</p>
          <a className="nav-item" href="#insights"><Sparkles size={18} /><span>Growth insights</span></a>
          <a className="nav-item" href="#about"><BookOpen size={18} /><span>How it works</span></a>
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={17} />
          <div><strong>Demo workspace</strong><small>Data stays in this browser</small></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{navItems.find((item) => item.id === activeView)?.label || 'Dashboard'}</strong></div>
          <div className="topbar-actions"><span className="privacy-chip"><ShieldCheck size={15} /> Local demo data</span><div className="avatar">NC</div></div>
        </header>

        <div className="page-content">
          {notice && <div className={`toast ${notice.type}`} role="status" aria-live="polite"><span>{notice.type === 'success' ? <Check size={16} /> : <Info size={16} />}</span>{notice.message}</div>}
          {activeView === 'dashboard' && <Dashboard analytics={analytics} progress={progress} registrations={registrations} recommendations={recommendations} onNavigate={setActiveView} spending={spending} remainingBudget={remainingBudget} costPerRegistration={costPerRegistration} onSaveSpending={saveSpending} />}
          {activeView === 'registrations' && <RegistrationsView form={registrationForm} setForm={setRegistrationForm} onSubmit={handleRegistrationSubmit} registrations={filteredRegistrations} search={registrationSearch} setSearch={setRegistrationSearch} onDelete={deleteRegistration} onExport={exportCsv} />}
          {activeView === 'ambassadors' && <AmbassadorsView form={ambassadorForm} setForm={setAmbassadorForm} onSubmit={handleAmbassadorSubmit} ambassadors={analytics.referralCounts} />}
        </div>
        <footer className="page-footer" id="about"><span>CampusPulse · NxtWave Growth Challenge</span><span><ShieldCheck size={14} /> Data is stored only on this device and does not sync across browsers.</span></footer>
      </main>
    </div>
  )
}

function Dashboard({ analytics, progress, registrations, recommendations, onNavigate, spending, remainingBudget, costPerRegistration, onSaveSpending }) {
  const chart = getLastSevenDays(registrations)
  const maxChart = Math.max(...chart.map((day) => day.count), 1)
  const recent = registrations.slice(0, 5)
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">OVERVIEW <span>•</span> 7-DAY CAMPAIGN</p><h1>Good morning, growth team <span>✦</span></h1><p className="subheading">Track momentum, spot opportunities, and keep your campus network moving.</p></div><button className="primary-button" onClick={() => onNavigate('registrations')}><Plus size={18} /> Add registration</button></section>
      <div className="metric-grid">
        <MetricCard label="Total registrations" value={analytics.total} note={`${progress}% of 500 goal`} icon={ClipboardList} accent="blue" progress={progress} />
        <MetricCard label="Remaining to goal" value={Math.max(TARGET_REGISTRATIONS - analytics.total, 0)} note="Registrations to reach target" icon={Target} accent="purple" />
        <MetricCard label="Ambassador referrals" value={analytics.referredRegistrations} note={analytics.total ? `${Math.round((analytics.referredRegistrations / analytics.total) * 100)}% of total` : 'No referrals yet'} icon={Users} accent="green" />
        <MetricCard label="Active ambassadors" value={analytics.referralCounts.length} note="Codes available to share" icon={Trophy} accent="amber" />
      </div>
      <BudgetPanel spending={spending} remainingBudget={remainingBudget} costPerRegistration={costPerRegistration} onSaveSpending={onSaveSpending} />
      <div className="content-grid dashboard-grid">
        <section className="panel trend-panel"><PanelHeader title="Registration momentum" subtitle="Daily registrations over the last 7 days" action={<span className="panel-stat"><strong>{analytics.total}</strong> total</span>} /><div className="chart-area">{chart.map((day) => <div className="chart-column" key={day.key}><span className="chart-value">{day.count || ''}</span><div className="chart-bar-track"><div className={`chart-bar ${day.count ? '' : 'empty'}`} style={{ height: `${Math.max((day.count / maxChart) * 100, day.count ? 12 : 5)}%` }} /></div><span className="chart-label">{day.label}</span></div>)}</div></section>
        <section className="panel channel-panel"><PanelHeader title="Channel performance" subtitle="Where registrations are coming from" /><div className="channel-list">{CHANNELS.map((channel, index) => { const count = analytics.channelCounts[channel]; const percentage = analytics.total ? Math.round((count / analytics.total) * 100) : 0; return <div className="channel-row" key={channel}><div className={`channel-icon channel-${index}`}><BarChart3 size={16} /></div><div className="channel-info"><div><strong>{channel}</strong><span>{count}</span></div><div className="bar-line"><span style={{ width: `${percentage}%` }} /></div></div></div> })}</div>{!analytics.total && <p className="empty-note">Channel data will appear after your first registration.</p>}</section>
      </div>
      <div className="content-grid lower-grid">
        <section className="panel recent-panel"><PanelHeader title="Recent registrations" subtitle="Latest students added to the campaign" action={<button className="text-button" onClick={() => onNavigate('registrations')}>View all <ArrowUpRight size={15} /></button>} />{recent.length ? <div className="recent-list">{recent.map((item) => <div className="recent-item" key={item.id}><div className="student-avatar">{item.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="recent-person"><strong>{item.name}</strong><span>{item.college}</span></div><span className="source-pill">{item.source.split(' / ')[0]}</span><time>{formatDate(item.createdAt)}</time></div>)}</div> : <EmptyState icon={ClipboardList} title="No registrations yet" detail="Add your first student registration to start tracking campaign momentum." action="Add registration" onClick={() => onNavigate('registrations')} />}</section>
        <Insights recommendations={recommendations} />
      </div>
    </>
  )
}

function BudgetPanel({ spending, remainingBudget, costPerRegistration, onSaveSpending }) {
  const [draftSpending, setDraftSpending] = useState(String(spending || ''))

  function handleSubmit(event) {
    event.preventDefault()
    onSaveSpending(draftSpending)
  }

  return (
    <section className="panel budget-panel">
      <PanelHeader title="Campaign budget" subtitle="Enter actual spending to unlock cost metrics" action={<span className="panel-stat"><strong>₹{CAMPAIGN_BUDGET.toLocaleString('en-IN')}</strong> budget</span>} />
      <div className="budget-content">
        <form className="budget-form" onSubmit={handleSubmit}>
          <label htmlFor="campaign-spending">Amount spent (₹)
            <div className="budget-input">
              <span>₹</span>
              <input id="campaign-spending" type="number" min="0" step="1" value={draftSpending} onChange={(event) => setDraftSpending(event.target.value)} placeholder="0" />
            </div>
          </label>
          <button className="secondary-button" type="submit">Save spending</button>
        </form>
        <div className="budget-stats">
          <div><span>Budget used</span><strong>₹{spending.toLocaleString('en-IN')}</strong></div>
          <div><span>Remaining</span><strong>₹{remainingBudget.toLocaleString('en-IN')}</strong></div>
          <div><span>Cost / registration</span><strong>{costPerRegistration === null ? '—' : `₹${costPerRegistration.toFixed(2)}`}</strong></div>
        </div>
      </div>
      <p className="budget-note"><Info size={14} /> Cost per registration appears only after both spending and registration data are recorded. Values are based only on what you enter.</p>
    </section>
  )
}

function MetricCard({ label, value, note, icon: Icon, accent, progress }) {
  return <article className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18} /></div></div><strong className="metric-value">{value.toLocaleString('en-IN')}</strong><span className="metric-note">{note}</span>{progress !== undefined && <div className="metric-progress"><span style={{ width: `${progress}%` }} /></div>}</article>
}

function PanelHeader({ title, subtitle, action }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>
}

function Insights({ recommendations }) {
  return <section className="panel insights-panel" id="insights"><PanelHeader title="Growth insights" subtitle="Rule-based recommendations from your actual data" action={<span className="agent-badge"><Sparkles size={14} /> Transparent agents</span>} /><div className="insight-list">{recommendations.map((item) => <div className={`insight-item insight-${item.tone}`} key={item.title}><div className="insight-bullet"><Sparkles size={15} /></div><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div><div className="agent-disclaimer"><Info size={15} /><span>These are rule-based recommendations, not autonomous AI decisions. No actions are executed automatically.</span></div></section>
}

function RegistrationForm({ form, setForm, onSubmit }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  return <form className="data-form" onSubmit={onSubmit}><div className="form-grid"><label>Student name *<input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Ananya Sharma" /></label><label>Email address *<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="student@college.edu" /></label><label>College / university *<input required value={form.college} onChange={(e) => update('college', e.target.value)} placeholder="e.g. Delhi University" /></label><label>Referral source *<select required value={form.source} onChange={(e) => update('source', e.target.value)}>{CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label><label>Ambassador code <input value={form.ambassadorCode} onChange={(e) => update('ambassadorCode', e.target.value)} placeholder="Optional code" /><small>Leave blank if not referred by an ambassador.</small></label></div><button className="primary-button" type="submit"><Plus size={17} /> Save registration</button></form>
}

function RegistrationsView({ form, setForm, onSubmit, registrations, search, setSearch, onDelete, onExport }) {
  return <><section className="page-heading compact"><div><p className="eyebrow">REGISTRATION MANAGEMENT</p><h1>Registrations</h1><p className="subheading">Capture and review students joining the AI workshop.</p></div><button className="secondary-button" onClick={onExport} disabled={!registrations.length}><Download size={17} /> Export CSV</button></section><section className="panel form-panel"><PanelHeader title="Add a registration" subtitle="Only collect the information needed for campaign tracking." /><RegistrationForm form={form} setForm={setForm} onSubmit={onSubmit} /></section><section className="panel table-panel"><div className="table-toolbar"><div><h2>All registrations</h2><p>{registrations.length} matching records</p></div><label className="search-field"><Search size={17} /><input aria-label="Search registrations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, college or source" /></label></div>{registrations.length ? <div className="table-wrap"><table><caption className="sr-only">Student registrations</caption><thead><tr><th>Student</th><th>College</th><th>Source</th><th>Ambassador</th><th>Registered</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{registrations.map((item) => <tr key={item.id}><td><strong>{item.name || 'Unknown student'}</strong><span>{item.email || 'No email recorded'}</span></td><td>{item.college || 'Unknown college'}</td><td><span className="source-pill">{item.source || 'Unknown source'}</span></td><td>{item.ambassadorCode || <span className="muted">—</span>}</td><td>{formatDate(item.createdAt)}</td><td><button className="icon-button danger" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name || 'registration'}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardList} title={search ? 'No matching registrations' : 'Your registration list is empty'} detail={search ? 'Try another search term.' : 'Use the form above to add your first record.'} />}</section></>
}

function AmbassadorForm({ form, setForm, onSubmit }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  return <form className="data-form" onSubmit={onSubmit}><div className="form-grid three-columns"><label>Ambassador name *<input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Rohan Mehta" /></label><label>College / university *<input required value={form.college} onChange={(e) => update('college', e.target.value)} placeholder="e.g. IIT Delhi" /></label><label>Unique referral code *<input required value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="e.g. ROHAN26" /><small>Codes are case-insensitive when used.</small></label></div><button className="primary-button" type="submit"><Plus size={17} /> Add ambassador</button></form>
}

function AmbassadorsView({ form, setForm, onSubmit, ambassadors }) {
  return <><section className="page-heading compact"><div><p className="eyebrow">NETWORK MANAGEMENT</p><h1>Ambassadors</h1><p className="subheading">Give campus champions a trackable referral code.</p></div></section><section className="panel form-panel"><PanelHeader title="Add an ambassador" subtitle="Ambassadors are ranked by verified registrations linked to their unique code." /><AmbassadorForm form={form} setForm={setForm} onSubmit={onSubmit} /></section><section className="panel leaderboard-panel"><PanelHeader title="Referral leaderboard" subtitle="Ranked by registrations with a valid ambassador code" action={<span className="panel-stat"><strong>{ambassadors.length}</strong> ambassadors</span>} />{ambassadors.length ? <div className="leaderboard">{ambassadors.map((item, index) => <div className="leader-row" key={item.code || `ambassador-${index}`}><div className={`rank rank-${index + 1}`}>{index + 1}</div><div className="student-avatar">{String(item.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="leader-person"><strong>{item.name || 'Unknown ambassador'}</strong><span>{item.college || 'Unknown college'} · Code: <b>{item.code || '—'}</b></span></div><strong className="leader-count">{item.registrations}<small>{item.registrations === 1 ? ' registration' : ' registrations'}</small></strong></div>)}</div> : <EmptyState icon={Trophy} title="No ambassadors yet" detail="Add campus ambassadors to start measuring referral performance." />}</section></>
}

function EmptyState({ icon: Icon, title, detail, action, onClick }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={23} /></div><strong>{title}</strong><p>{detail}</p>{action && <button className="text-button" onClick={onClick}>{action} <ArrowUpRight size={15} /></button>}</div>
}

export default App
