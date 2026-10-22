import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bookmark, BriefcaseBusiness, Building2, CheckCircle2,
  ChevronDown, Clock3, Compass, Search, SlidersHorizontal, Sparkles,
  MapPin, X, LogIn, UserPlus, LogOut, LayoutDashboard, ExternalLink
} from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

function normalizeJobs(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
function money(min, max, currency = 'INR') {
  if (!min && !max) return 'Salary not listed';
  const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  const unit = currency === 'INR' ? '₹' : `${currency} `;
  if (min && max) return `${unit}${fmt(min)} – ${unit}${fmt(max)}`;
  return `${unit}${fmt(min || max)}`;
}
function getError(payload, fallback) {
  return payload?.error || payload?.message || fallback;
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedJob, setSelectedJob] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('hirestream_token') || '');
  const [user, setUser] = useState(() => localStorage.getItem('hirestream_user') || '');
  const [authMode, setAuthMode] = useState('');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notice, setNotice] = useState('');

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const raw = await response.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { message: raw }; }
    if (!response.ok) throw new Error(getError(payload, `Request failed (${response.status})`));
    return payload;
  }

  async function loadJobs(nextPage = page) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (location.trim()) params.set('location', location.trim());
      if (employment) params.set('employment_type', employment);
      const payload = await api(`/api/jobs?${params.toString()}`);
      const rows = normalizeJobs(payload);
      setJobs(rows);
      const count = payload?.total ?? payload?.pagination?.total ?? payload?.meta?.total;
      setTotal(typeof count === 'number' ? count : null);
      setPage(nextPage);
    } catch (e) {
      setError(`${e.message}. Check that the backend is running and VITE_API_BASE_URL is correct.`);
      setJobs([]);
    } finally { setLoading(false); }
  }

  async function loadAccountData() {
    if (!token) { setSavedJobs([]); setApplications([]); setSavedIds(new Set()); return; }
    try {
      const [saved, apps] = await Promise.all([
        api('/api/saved-jobs').catch(() => []),
        api('/api/applications').catch(() => [])
      ]);
      const savedRows = normalizeJobs(saved);
      setSavedJobs(savedRows);
      setSavedIds(new Set(savedRows.map(j => String(j.id))));
      setApplications(Array.isArray(apps) ? apps : (apps?.applications || apps?.data || []));
    } catch { /* The discovery page still works if account-only endpoints fail. */ }
  }

  useEffect(() => { loadJobs(1); }, []);
  useEffect(() => { loadAccountData(); }, [token]);

  const visibleJobs = useMemo(() => jobs, [jobs]);

  async function submitAuth(e) {
    e.preventDefault(); setAuthError(''); setAuthBusy(true);
    try {
      const route = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = await api(route, {
        method: 'POST',
        body: JSON.stringify(authMode === 'register'
          ? authForm : { email: authForm.email, password: authForm.password })
      });
      const newToken = payload.token || payload.data?.token;
      if (!newToken) throw new Error('The API did not return a token. Check the auth response format.');
      const displayName = payload.user?.name || payload.data?.user?.name || authForm.name || authForm.email;
      localStorage.setItem('hirestream_token', newToken);
      localStorage.setItem('hirestream_user', displayName);
      setToken(newToken); setUser(displayName); setAuthMode('');
      setNotice('You are signed in.'); setTimeout(() => setNotice(''), 3000);
    } catch (e) { setAuthError(e.message); }
    finally { setAuthBusy(false); }
  }

  async function toggleSave(job) {
    if (!token) { setAuthMode('login'); setNotice('Sign in to save jobs.'); return; }
    const id = String(job.id);
    const isSaved = savedIds.has(id);
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}/save`, { method: isSaved ? 'DELETE' : 'POST' });
      const next = new Set(savedIds);
      if (isSaved) next.delete(id); else next.add(id);
      setSavedIds(next);
      await loadAccountData();
      setNotice(isSaved ? 'Job removed from saved jobs.' : 'Job saved successfully.');
      setTimeout(() => setNotice(''), 2500);
    } catch (e) { setNotice(e.message); setTimeout(() => setNotice(''), 4000); }
  }

  async function trackApplication(job) {
    if (!token) { setAuthMode('login'); setNotice('Sign in to track applications.'); return; }
    try {
      await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ job_id: job.id, notes: 'Tracked from HireStream' })
      });
      await loadAccountData();
      setNotice('Application added to your tracker.');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) { setNotice(e.message); setTimeout(() => setNotice(''), 4000); }
  }

  function logout() {
    localStorage.removeItem('hirestream_token'); localStorage.removeItem('hirestream_user');
    setToken(''); setUser(''); setActiveTab('discover');
    setNotice('You have signed out.'); setTimeout(() => setNotice(''), 2500);
  }

  const jobTitle = j => j.title || j.job_title || 'Untitled role';
  const company = j => j.company || j.company_name || 'Company not listed';
  const locationOf = j => j.location || j.city || 'Location not listed';
  const workplace = j => j.workplace_type || j.workplaceType || '';
  const type = j => j.employment_type || j.employmentType || 'Full-time';
  const skills = j => Array.isArray(j.skills) ? j.skills : (typeof j.skills === 'string' ? j.skills.split(/[,;]/).map(s => s.trim()).filter(Boolean) : []);
  const description = j => j.description || 'Explore the role details and follow the application link for the full description.';
  const applyUrl = j => j.apply_url || j.applyUrl || j.url || '';

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setActiveTab('discover'); }}>
        <span className="brand-mark"><BriefcaseBusiness size={20} /></span>
        <span>hire<span className="brand-accent">stream</span><small>CAREERS, IN MOTION</small></span>
      </a>
      <nav className="main-nav">
        <button className={activeTab === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => setActiveTab('discover')}><Compass size={16}/> Discover jobs</button>
        <button className={activeTab === 'saved' ? 'nav-link active' : 'nav-link'} onClick={() => { setActiveTab('saved'); loadAccountData(); }}><Bookmark size={16}/> Saved</button>
        <button className={activeTab === 'applications' ? 'nav-link active' : 'nav-link'} onClick={() => { setActiveTab('applications'); loadAccountData(); }}><LayoutDashboard size={16}/> My applications</button>
      </nav>
      <div className="account-actions">
        {token ? <><span className="user-chip">{(user || 'User').slice(0, 1).toUpperCase()}</span><span className="user-name">{user}</span><button className="btn btn-ghost btn-small" onClick={logout}><LogOut size={15}/> Sign out</button></>
          : <><button className="btn btn-ghost btn-small" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign in</button><button className="btn btn-dark btn-small" onClick={() => { setAuthMode('register'); setAuthError(''); }}>Get started <ArrowUpRight size={15}/></button></>}
      </div>
    </header>

    <main>
      {activeTab === 'discover' && <>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</div>
            <h1>Find work that<br/><span>moves you forward.</span></h1>
            <p>Thoughtful search. Better opportunities. Your next big move starts with one search.</p>
            <div className="hero-proof"><span><CheckCircle2 size={15}/> Search across roles</span><span><CheckCircle2 size={15}/> Keep your search organized</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
            <div className="floating-card card-a"><span className="mini-icon mint"><Building2 size={18}/></span><span><b>Good work</b><small>Starts with a search</small></span><CheckCircle2 className="check" size={18}/></div>
            <div className="floating-card card-b"><span className="mini-icon peach"><BriefcaseBusiness size={18}/></span><span><b>New opportunity</b><small>One click closer</small></span></div>
            <div className="art-center"><Search size={38}/></div>
            <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div>
          </div>
        </section>
        <section className="search-panel">
          <label className="search-field"><Search size={19}/><span className="sr-only">Search jobs</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadJobs(1)} placeholder="Job title, skill, or keyword"/></label>
          <label className="search-field location-field"><MapPin size={19}/><span className="sr-only">Location</span><input value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadJobs(1)} placeholder="City or location"/></label>
          <label className="select-field"><SlidersHorizontal size={17}/><select value={employment} onChange={e => setEmployment(e.target.value)} aria-label="Employment type"><option value="">All job types</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select><ChevronDown size={15}/></label>
          <button className="btn btn-accent search-button" onClick={() => loadJobs(1)}><Search size={17}/> Search jobs</button>
        </section>
        <section className="results-section">
          <div className="section-heading"><div><div className="eyebrow muted">OPPORTUNITIES FOR YOU</div><h2>Explore open roles</h2><p>Find a role that fits where you want to go next.</p></div><span className="result-count">{total !== null ? `${total.toLocaleString()} roles` : `${jobs.length} shown`}</span></div>
          {error && <div className="error-banner"><strong>Couldn't load jobs.</strong><span>{error}</span><button className="btn btn-ghost btn-small" onClick={() => loadJobs(1)}>Retry</button></div>}
          {loading ? <div className="loading-grid">{[1,2,3,4,5,6].map(n => <div className="skeleton" key={n}/>)}</div>
            : visibleJobs.length ? <div className="job-grid">{visibleJobs.map((job, i) => <article className="job-card" key={job.id ?? `${company(job)}-${i}`}>
              <div className="job-card-top"><div className={`company-logo logo-${i % 5}`}>{company(job).slice(0,1).toUpperCase()}</div><button className={savedIds.has(String(job.id)) ? 'icon-btn saved' : 'icon-btn'} onClick={() => toggleSave(job)} aria-label="Save job"><Bookmark size={18} fill={savedIds.has(String(job.id)) ? 'currentColor' : 'none'}/></button></div>
              <div className="job-tags"><span>{type(job)}</span>{workplace(job) && <span>{workplace(job)}</span>}</div>
              <h3>{jobTitle(job)}</h3><div className="company-name"><Building2 size={15}/>{company(job)}</div>
              <div className="job-meta"><span><MapPin size={14}/>{locationOf(job)}</span><span><Clock3 size={14}/>{job.posted_at ? new Date(job.posted_at).toLocaleDateString() : 'Recently posted'}</span></div>
              <p className="job-description">{description(job)}</p>
              <div className="skill-list">{skills(job).slice(0,3).map(s => <span key={s}>{s}</span>)}</div>
              <div className="job-card-footer"><span className="salary">{money(job.salary_min, job.salary_max, job.currency)}</span><button className="text-button" onClick={() => setSelectedJob(job)}>View role <ArrowUpRight size={15}/></button></div>
            </article>)}</div>
            : !error && <div className="empty-state"><div className="empty-icon"><Search size={24}/></div><h3>No roles found</h3><p>Try another keyword or location, or clear the filters.</p><button className="btn btn-dark" onClick={() => { setSearch(''); setLocation(''); setEmployment(''); loadJobs(1); }}>Clear filters</button></div>}
          {!loading && visibleJobs.length > 0 && <div className="pagination"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => loadJobs(page - 1)}>Previous</button><span>Page {page}</span><button className="btn btn-ghost" disabled={jobs.length < 12} onClick={() => loadJobs(page + 1)}>Next</button></div>}
        </section>
      </>}

      {activeTab === 'saved' && <section className="account-page"><div className="eyebrow muted">YOUR SHORTLIST</div><h2>Saved jobs</h2><p className="page-subtitle">Keep the roles you want to come back to in one place.</p>{!token ? <SignInPrompt onClick={() => setAuthMode('login')}/> : savedJobs.length ? <div className="job-grid">{savedJobs.map((job,i)=><article className="job-card" key={job.id ?? i}><div className="job-card-top"><div className="company-logo">{company(job).slice(0,1).toUpperCase()}</div><button className="icon-btn saved" onClick={() => toggleSave(job)}><Bookmark size={18} fill="currentColor"/></button></div><div className="job-tags"><span>{type(job)}</span></div><h3>{jobTitle(job)}</h3><div className="company-name"><Building2 size={15}/>{company(job)}</div><div className="job-meta"><span><MapPin size={14}/>{locationOf(job)}</span></div><div className="job-card-footer"><span className="salary">{money(job.salary_min, job.salary_max, job.currency)}</span><button className="text-button" onClick={() => setSelectedJob(job)}>View role <ArrowUpRight size={15}/></button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Bookmark size={24}/></div><h3>No saved jobs yet</h3><p>Browse open roles and tap the bookmark to save one.</p><button className="btn btn-dark" onClick={() => setActiveTab('discover')}>Explore jobs</button></div>}</section>}

      {activeTab === 'applications' && <section className="account-page"><div className="eyebrow muted">STAY ON TRACK</div><h2>My applications</h2><p className="page-subtitle">A simple view of the opportunities you're pursuing.</p>{!token ? <SignInPrompt onClick={() => setAuthMode('login')}/> : applications.length ? <div className="application-list">{applications.map((a,i)=><div className="application-row" key={a.id ?? i}><div className="company-logo">{String(a.company || a.company_name || a.job?.company || 'J').slice(0,1).toUpperCase()}</div><div className="application-main"><b>{a.title || a.job_title || a.job?.title || `Application #${a.id || i+1}`}</b><span>{a.company || a.company_name || a.job?.company || 'Company not listed'}</span></div><span className={`status status-${String(a.status || 'applied').toLowerCase().replace(/[^a-z]/g,'-')}`}>{String(a.status || 'applied').replace('_',' ')}</span><span className="application-date">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span></div>)}</div> : <div className="empty-state"><div className="empty-icon"><LayoutDashboard size={24}/></div><h3>Your tracker is ready</h3><p>Open a job and choose “Track application” to add it here.</p><button className="btn btn-dark" onClick={() => setActiveTab('discover')}>Explore jobs</button></div>}</section>}
    </main>

    <footer className="footer"><a className="brand footer-brand" href="#" onClick={e => {e.preventDefault();setActiveTab('discover')}}><span className="brand-mark"><BriefcaseBusiness size={17}/></span><span>hire<span className="brand-accent">stream</span></span></a><span>Make your next move count.</span><span className="footer-note">Built to help you find your next opportunity.</span></footer>

    {notice && <div className="toast" role="status"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

    {authMode && <div className="modal-backdrop" onClick={() => setAuthMode('')}><section className="auth-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAuthMode('')} aria-label="Close"><X size={19}/></button><div className="modal-mark"><BriefcaseBusiness size={23}/></div><div className="eyebrow muted">{authMode === 'register' ? 'START YOUR SEARCH' : 'WELCOME BACK'}</div><h2>{authMode === 'register' ? 'Create your account' : 'Sign in to HireStream'}</h2><p>{authMode === 'register' ? 'Save roles and keep your applications organized.' : 'Your saved roles and applications are waiting.'}</p><form onSubmit={submitAuth} className="auth-form">{authMode === 'register' && <label>Full name<input required value={authForm.name} onChange={e => setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={8} value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})} placeholder="At least 8 characters"/></label>{authError && <div className="form-error">{authError}</div>}<button className="btn btn-accent auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'register' ? <><UserPlus size={17}/> Create account</> : <><LogIn size={17}/> Sign in</>}</button></form><p className="switch-auth">{authMode === 'register' ? 'Already have an account?' : "Don't have an account?"} <button onClick={() => {setAuthMode(authMode === 'register' ? 'login' : 'register');setAuthError('')}}>{authMode === 'register' ? 'Sign in' : 'Create one'}</button></p></section></div>}

    {selectedJob && <div className="modal-backdrop" onClick={() => setSelectedJob(null)}><section className="job-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedJob(null)} aria-label="Close"><X size={19}/></button><div className="job-card-top"><div className="company-logo large-logo">{company(selectedJob).slice(0,1).toUpperCase()}</div><div className="job-tags"><span>{type(selectedJob)}</span>{workplace(selectedJob) && <span>{workplace(selectedJob)}</span>}</div></div><h2>{jobTitle(selectedJob)}</h2><div className="company-name"><Building2 size={16}/>{company(selectedJob)}</div><div className="job-meta modal-meta"><span><MapPin size={15}/>{locationOf(selectedJob)}</span><span><BriefcaseBusiness size={15}/>{money(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}</span></div><div className="modal-divider"/><h3>About the role</h3><p className="full-description">{description(selectedJob)}</p>{skills(selectedJob).length > 0 && <><h3>Skills</h3><div className="skill-list modal-skills">{skills(selectedJob).map(s=><span key={s}>{s}</span>)}</div></>}<div className="modal-actions"><button className="btn btn-ghost" onClick={() => toggleSave(selectedJob)}><Bookmark size={17}/> Save job</button><button className="btn btn-dark" onClick={() => trackApplication(selectedJob)}>Track application <ArrowUpRight size={16}/></button>{applyUrl(selectedJob) && <a className="btn btn-accent" href={applyUrl(selectedJob)} target="_blank" rel="noreferrer">Apply externally <ExternalLink size={15}/></a>}</div><p className="modal-hint">Demo listings may contain fictional sample data. Verify details before applying.</p></section></div>}
  </div>;
}

function SignInPrompt({ onClick }) {
  return <div className="empty-state"><div className="empty-icon"><LogIn size={24}/></div><h3>Sign in to see your workspace</h3><p>Create an account or sign in to save roles and track applications.</p><button className="btn btn-dark" onClick={onClick}>Sign in</button></div>;
}