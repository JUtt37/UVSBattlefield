const STORAGE_KEY = 'uvs_deck_v1';

async function loadCards(){
  const res = await fetch('./cards.json');
  return res.json();
}

function loadDeck(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch{ return []; }
}
function saveDeck(deck){ localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); }

function unique(values){ return Array.from(new Set(values.filter(Boolean))).sort(); }

function addRow(container, card, onAdd){
  const row = document.createElement('div');
  row.className = 'row';
  const img = document.createElement('img');
  const name = document.createElement('div'); name.className='name';
  const add = document.createElement('button'); add.textContent='Add';
  name.textContent = card.name;
  const code = card.set && card.set.code, num = card.set && card.set.number;
  img.src = code && num ? `https://www.uvsultra.online/images/extensions/${code}/${String(num).padStart(3,'0')}-preview.jpg` : '';
  add.onclick = ()=> onAdd(card);
  row.append(img, name, add);
  container.appendChild(row);
}

function addDeckRow(container, entry, onRemove){
  const row = document.createElement('div');
  row.className = 'row';
  const qty = document.createElement('input'); qty.type='number'; qty.min='1'; qty.value=entry.qty;
  const name = document.createElement('div'); name.className='name'; name.textContent = entry.card.name;
  const rm = document.createElement('button'); rm.textContent='Remove';
  qty.onchange = ()=> { entry.qty = Math.max(1, parseInt(qty.value)||1); onRemove(null); };
  rm.onclick = ()=> onRemove(entry);
  row.append(qty, name, rm);
  container.appendChild(row);
}

(async function(){
  const all = await loadCards();
  const typeSel = document.getElementById('typeFilter');
  const setSel = document.getElementById('setFilter');
  for(const v of unique(all.map(c=>c.type))){ const o=document.createElement('option'); o.value=o.textContent=v; typeSel.appendChild(o); }
  for(const v of unique(all.map(c=>c.set && c.set.name))){ const o=document.createElement('option'); o.value=o.textContent=v; setSel.appendChild(o); }

  const results = document.getElementById('results');
  const deckEl = document.getElementById('deck');
  const deckCount = document.getElementById('deckCount');
  const search = document.getElementById('search');
  let deck = loadDeck();

  function renderDeck(){
    deckEl.innerHTML='';
    for(const entry of deck){ addDeckRow(deckEl, entry, (e)=>{ if(e) deck = deck.filter(x=>x!==entry); saveDeck(deck); renderDeck(); }); }
    const total = deck.reduce((s,e)=> s+e.qty, 0);
    deckCount.textContent = `${total} cards`;
  }

  function update(){
    const q = search.value.trim().toLowerCase();
    const t = typeSel.value; const s = setSel.value;
    const filtered = all.filter(c=>{
      if(t && c.type!==t) return false;
      if(s && (!c.set || c.set.name!==s)) return false;
      if(q){ const hay=(c.name+'\n'+(c.text||'')).toLowerCase(); if(!hay.includes(q)) return false; }
      return true;
    }).slice(0,200);
    results.innerHTML='';
    for(const c of filtered){ addRow(results, c, (card)=>{ const found = deck.find(e=>e.card.id===card.id); if(found) found.qty++; else deck.push({card, qty:1}); saveDeck(deck); renderDeck(); }); }
  }

  [search, typeSel, setSel].forEach(el=> el.addEventListener('input', update));
  renderDeck();
  update();

  document.getElementById('exportDeck').addEventListener('click', (e)=>{
    e.preventDefault();
    const data = deck.map(e=>({ id:e.card.id, name:e.card.name, set:e.card.set, qty:e.qty }));
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='deck.json'; a.click(); URL.revokeObjectURL(url);
  });
})();