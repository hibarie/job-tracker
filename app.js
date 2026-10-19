// 転職活動トラッカー
// データはブラウザの localStorage に保存します（サーバー不要）。

const STORAGE_KEY = 'job-tracker:applications';

const STATUSES = [
  { v: '応募済み', bg: 'var(--rule)', fg: 'var(--ink-soft)' },
  { v: '書類選考中', bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  { v: '面接調整中', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  { v: '面接済み・結果待ち', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  { v: '内定', bg: 'var(--success-soft)', fg: 'var(--success)' },
  { v: '不採用', bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  { v: '辞退', bg: 'var(--rule)', fg: 'var(--ink-faint)' },
];

const ACTIVE_STATUSES = ['書類選考中', '面接調整中', '面接済み・結果待ち'];

const SAMPLE_DATA = [
  { id: 'demo1', company: 'サンプル株式会社', position: 'Webエンジニア', appliedDate: '2026-09-20', status: '面接済み・結果待ち', salary: '年収400万円〜', url: '', nextAction: '結果連絡待ち', notes: '一次面接は技術的な質問が中心でした。' },
  { id: 'demo2', company: 'デモ商事', position: 'PHPエンジニア(未経験可)', appliedDate: '2026-09-25', status: '書類選考中', salary: '', url: '', nextAction: '選考結果待ち', notes: '' },
  { id: 'demo3', company: 'example Inc.', position: 'Laravelエンジニア', appliedDate: '2026-10-01', status: '内定', salary: '年収420万円', url: '', nextAction: '条件確認', notes: '内定連絡あり。条件面を確認中。' },
  { id: 'demo4', company: 'テスト工業', position: '社内SE', appliedDate: '2026-09-10', status: '不採用', salary: '', url: '', nextAction: '', notes: '' },
];

let rows = load();

// ---------- 保存・読み込み ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 保存できない環境ではサンプルで表示 */ }
  return structuredClone(SAMPLE_DATA);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (e) { /* 保存できなくても画面は動かす */ }
}

// ---------- 表示用ヘルパー ----------
function statusStyle(v) {
  return STATUSES.find(s => s.v === v) || STATUSES[0];
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return (dt.getMonth() + 1) + '/' + dt.getDate();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function safeUrl(u) {
  return /^https?:\/\//i.test(u) ? u : '';
}

// ---------- 描画 ----------
function renderStats() {
  const active = rows.filter(r => ACTIVE_STATUSES.includes(r.status)).length;
  const offers = rows.filter(r => r.status === '内定').length;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="n">${rows.length}</div><div class="l">応募総数</div></div>
    <div class="stat"><div class="n">${active}</div><div class="l">選考中</div></div>
    <div class="stat"><div class="n">${offers}</div><div class="l">内定</div></div>
  `;
}

function renderCard(r) {
  const card = document.createElement('div');
  card.className = 'card';
  const st = statusStyle(r.status);
  const options = STATUSES.map(s => `<option value="${s.v}" ${s.v === r.status ? 'selected' : ''}>${s.v}</option>`).join('');
  const url = safeUrl(r.url || '');
  card.innerHTML = `
    <div class="card-top">
      <span class="card-company">${escapeHtml(r.company || '(会社名未入力)')}</span>
      <span class="card-position">${escapeHtml(r.position || '')}</span>
      <select class="badge" aria-label="選考ステータス" style="background:${st.bg};color:${st.fg};">${options}</select>
    </div>
    <div class="card-meta">
      ${r.appliedDate ? `<span>応募日 ${fmtDate(r.appliedDate)}</span>` : ''}
      ${r.salary ? `<span>${escapeHtml(r.salary)}</span>` : ''}
      ${r.nextAction ? `<span>次: ${escapeHtml(r.nextAction)}</span>` : ''}
      ${url ? `<span><a href="${escapeHtml(url)}" target="_blank" rel="noopener">求人を見る</a></span>` : ''}
    </div>
    <div class="card-notes" contenteditable="true" data-placeholder="メモを入力...">${escapeHtml(r.notes || '')}</div>
    <div class="card-actions">
      <button class="iconbtn" type="button">削除</button>
    </div>
  `;

  card.querySelector('.badge').addEventListener('change', e => updateRow(r.id, { status: e.target.value }));

  const notesEl = card.querySelector('.card-notes');
  notesEl.addEventListener('blur', () => {
    const v = notesEl.textContent.trim();
    if (v !== (r.notes || '')) updateRow(r.id, { notes: v });
  });

  card.querySelector('.iconbtn').addEventListener('click', () => {
    if (!confirm(`「${r.company}」を削除しますか？`)) return;
    rows = rows.filter(x => x.id !== r.id);
    save();
    render();
  });

  return card;
}

function render() {
  renderStats();
  const listEl = document.getElementById('list');
  listEl.innerHTML = '';
  if (rows.length === 0) {
    listEl.innerHTML = '<div class="empty">まだ応募先が登録されていません。上のフォームから追加してください。</div>';
    return;
  }
  [...rows]
    .sort((a, b) => (b.appliedDate || '').localeCompare(a.appliedDate || ''))
    .forEach(r => listEl.appendChild(renderCard(r)));
}

// ---------- 更新 ----------
function updateRow(id, patch) {
  const idx = rows.findIndex(r => r.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], ...patch };
  save();
  render();
}

function addRow() {
  const companyEl = document.getElementById('in-company');
  const company = companyEl.value.trim();
  if (!company) { companyEl.focus(); return; }

  const val = id => document.getElementById(id).value.trim();
  rows.push({
    id: 'app_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    company,
    position: val('in-position'),
    appliedDate: val('in-date') || new Date().toISOString().slice(0, 10),
    status: val('in-status'),
    salary: val('in-salary'),
    url: val('in-url'),
    nextAction: val('in-next'),
    notes: '',
  });
  save();
  render();

  ['in-company', 'in-position', 'in-date', 'in-salary', 'in-url', 'in-next']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('in-status').selectedIndex = 0;
}

// ---------- 初期化 ----------
const statusSel = document.getElementById('in-status');
STATUSES.forEach(s => {
  const o = document.createElement('option');
  o.value = s.v;
  o.textContent = s.v;
  statusSel.appendChild(o);
});

document.getElementById('btn-add').addEventListener('click', addRow);
document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('入力内容を消して、サンプルデータに戻しますか？')) return;
  rows = structuredClone(SAMPLE_DATA);
  save();
  render();
});

render();
