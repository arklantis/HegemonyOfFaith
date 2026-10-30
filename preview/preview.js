// Preview-only BGA adapter. Card markup and text come from the real Game module.
const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'zh' ? 'zh' : 'en';
const type = query.get('type');
document.body.classList.add(`hof-lang-${lang}`);
document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
const missing = new Set();
const read = async path => { const r = await fetch(path, {cache:'no-store'}); if (!r.ok) throw Error(`${path}: ${r.status}`); return r.text(); };
try {
  const [translations, material, source] = await Promise.all([
    read('../BGA_TRANSLATIONS_ZH_TW.md'), read('../material.inc.php'), read('../modules/js/Game.js'),
  ]);
  const dictionary = new Map();
  for (const block of translations.replace(/\r/g,'').split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    if (lines.length === 2 && /[\u3400-\u9fff]/.test(lines[1])) dictionary.set(lines[0].trim(), lines[1].trim());
  }
  window._ = text => {
    if (lang === 'en') return text;
    if (dictionary.has(text)) return dictionary.get(text);
    missing.add(text); return text;
  };
  window.importDojoLibs = async () => [{
    string: {substitute: (text, data) => text.replace(/\$\{(\w+)\}/g, (_, name) => data[name] ?? '')},
    place: (html, node) => node.insertAdjacentHTML('beforeend', html),
  }, (_name, _base, members) => {function Adapter() {} Adapter.prototype = members; return Adapter;}, class {}, class {}, class {}];
  const {Game} = await import('../modules/js/Game.js');
  const game = new Game();
  game.gamedatas = {const:{skill_labels:{}}};
  const labelSource = material.slice(material.indexOf('$this->skill_labels'));
  for (const match of labelSource.matchAll(/(\d+)\s*=>\s*array\(\s*'name'\s*=>\s*clienttranslate\("([^"]+)"\)/g)) game.gamedatas.const.skill_labels[match[1]] = {name:_(match[2])};
  game.believerTypeNames = {};
  const namesSource = source.match(/this\.believerTypeNames\s*=\s*\{([\s\S]*?)\};/)[1];
  for (const match of namesSource.matchAll(/(\d+):\s*_\("([^"]+)"\)/g)) game.believerTypeNames[match[1]] = _(match[2]);
  const plain = html => {const node=document.createElement('div');node.innerHTML=html;return node.textContent;};
  const candidates = [];
  for (let id=1;id<=(type==='skill'?16:type==='action'?15:5);id++) {
    const key = type==='action'?game.getActionCardKeyName(id):id;
    if (type==='action' && !key) continue;
    const overlay = type==='skill'?game.buildSkillCardTextOverlayHtml(id):type==='action'?game.buildActionCardTextOverlayHtml(id):game.buildBelieverCardTextOverlayHtml(id);
    const probe=document.createElement('div');probe.innerHTML=overlay;
    const content=type==='skill'?game.getSkillCardFaceText(id):type==='action'?game.getActionCardFaceText(key):[...probe.querySelectorAll('.hof-bel-row')].map(n=>n.textContent).join('');
    candidates.push({id,key,overlay,length:[...plain(content)].length});
  }
  candidates.sort((a,b)=>b.length-a.length||a.id-b.id);
  const longest = candidates[0];
  const cardName = card => type==='skill'?game.getSkillName(card.id):type==='action'?game.getActionCardDisplayName(card.key):game.getBelieverTypeName(card.id);
  const selector = document.getElementById('card-select');
  const auto = document.createElement('option');
  auto.value = 'longest';
  auto.textContent = `最長文案：${cardName(longest)}`;
  selector.append(auto);
  for (const card of [...candidates].sort((a,b)=>a.id-b.id)) {
    const option = document.createElement('option');
    option.value = String(card.id);
    option.textContent = `${cardName(card)}（${card.length} 字元）`;
    selector.append(option);
  }
  let measureCurrent = () => {};
  function renderCard() {
  const selected = selector.value === 'longest' ? longest : candidates.find(card=>String(card.id)===selector.value);
  document.getElementById('comparison')?.remove();
  missing.clear();
  document.getElementById('error').textContent = '';
  const tip = document.getElementById('tip');
  if (query.get('mode')==='mobile') tip.classList.add('mobile-card-tooltip-content');
  tip.innerHTML=type==='skill'?game.getSkillTooltipHtml(selected.id,null):type==='action'?game.getActionCardTooltipHtml(selected.key):game.getBelieverTooltipHtml(selected.id);
  game.decorateSkillCardFaces();
  const comparison = document.createElement('section');
  comparison.id = 'comparison';
  const original = tip.querySelector('.hof-tooltip-card');
  for (const [label, width, height] of [['桌機中型牌（90 × 125）', 'var(--tier-m-w)', 'var(--tier-m-h)'], ['手機手牌', 'var(--mobile-card-w)', 'var(--mobile-card-h)']]) {
    const item = document.createElement('div');
    const caption = document.createElement('p');
    caption.textContent = label;
    caption.dataset.label = label;
    const card = original.cloneNode(true);
    card.classList.remove('hof-tooltip-card');
    card.removeAttribute('id');
    // Each preview iframe also activates mobile CSS. Explicit comparison
    // dimensions must outrank its generic !important card size rule.
    card.style.setProperty('width', width, 'important');
    card.style.setProperty('height', height, 'important');
    card.style.position = 'relative';
    item.append(caption, card);
    comparison.append(item);
  }
  let pair = document.getElementById('pair');
  if (!pair) {pair=document.createElement('div');pair.id='pair';tip.before(pair);pair.append(tip);}
  pair.append(comparison);
  const measureComparisons = () => {
    for (const item of comparison.children) {
      const caption = item.querySelector('p');
      const rect = item.querySelector('.card').getBoundingClientRect();
      caption.textContent = `${caption.dataset.label} · 實測 ${rect.width.toFixed(0)} × ${rect.height.toFixed(0)}px`;
    }
  };
  measureComparisons();

  const name = type==='skill'?game.getSkillName(selected.id):type==='action'?game.getActionCardDisplayName(selected.key):game.getBelieverTypeName(selected.id);
  document.getElementById('meta').textContent=`${name} · 效果文字 ${selected.length} 字元 · 共 ${candidates.length} 張`;
  const measure=()=>{const card=tip.querySelector('.hof-tooltip-card');const body=card.querySelector('.hof-sct-body,.hof-act-body,.hof-bel-row');const css=getComputedStyle(body);document.getElementById('measure').textContent=`卡寬 ${card.getBoundingClientRect().width.toFixed(1)}px · 內文 ${css.fontSize} · 行高 ${css.lineHeight}${body.scrollHeight>body.clientHeight+1?' · ⚠ 內文超出文字區高度':''}${body.scrollWidth>body.clientWidth+1?' · ⚠ 內文超出文字區寬度':''}`;};
  measureCurrent = () => {measure();measureComparisons();};
  measureCurrent();
  document.fonts.ready.then(()=>measureCurrent());
  if(missing.size)document.getElementById('error').textContent='對照檔缺少翻譯，以下內容暫顯示英文：'+[...missing].join(' / ');
  }
  selector.addEventListener('change', renderCard);
  window.addEventListener('resize', ()=>measureCurrent());
  document.getElementById('game-css').addEventListener('load', ()=>measureCurrent());
  renderCard();
  if (window.parent !== window && typeof window.parent.registerCardPreview === 'function') {
    selector.parentElement.hidden = true;
    selector.parentElement.style.display = 'none';
    window.parent.registerCardPreview(type, lang, {
      cards: candidates.map(card => ({id: card.id, name: cardName(card)})),
      longest: longest.id,
      select(id) {selector.value=String(id);renderCard();},
    });
  }
  // Always apply the first fetched version too: the original <link> may have
  // come from cache, even when the polling fetch already sees the latest file.
  let previous = null;
  let syncing = false;
  const syncCss = async () => {
    if (syncing) return;
    syncing = true;
    const status = document.getElementById('css-status');
    try {
      const current = await read('../hegemonyoffaith.css');
      if (current !== previous) {
        status.textContent = '正在套用最新 CSS…';
        const link = document.getElementById('game-css');
        await new Promise((resolve, reject) => {
          link.onload = resolve;
          link.onerror = () => reject(new Error('CSS 載入失敗'));
          link.href = '../hegemonyoffaith.css?t=' + Date.now();
        });
        previous = current;
        measureCurrent();
        status.textContent = 'CSS 已同步：' + new Date().toLocaleTimeString() + ' · hegemonyoffaith.css';
      }
    } catch (error) {
      status.textContent = 'CSS 同步失敗：' + error.message;
    } finally {
      syncing = false;
    }
  };
  await syncCss();
  setInterval(syncCss, 1000);
}catch(error){document.getElementById('error').textContent=error.stack;document.getElementById('meta').textContent='預覽載入失敗';}
