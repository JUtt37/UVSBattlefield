async function loadCards(){
  const res = await fetch('../card_db/cards.json');
  if(!res.ok) throw new Error('Failed to load cards.json');
  return await res.json();
}

function unique(values){ return Array.from(new Set(values.filter(Boolean))).sort(); }

function renderFilters(cards){
  const typeSel = document.getElementById('typeFilter');
  const raritySel = document.getElementById('rarityFilter');
  const setSel = document.getElementById('setFilter');
  for(const v of unique(cards.map(c=>c.type))){
    const o=document.createElement('option'); o.value=o.textContent=v; typeSel.appendChild(o);
  }
  for(const v of unique(cards.map(c=>c.rarity))){
    const o=document.createElement('option'); o.value=o.textContent=v; raritySel.appendChild(o);
  }
  for(const v of unique(cards.map(c=>c.set && c.set.name))){
    const o=document.createElement('option'); o.value=o.textContent=v; setSel.appendChild(o);
  }
}

function cardMatches(c, q, filters){
  if(filters.type && c.type !== filters.type) return false;
  if(filters.rarity && c.rarity !== filters.rarity) return false;
  if(filters.set && (!c.set || c.set.name !== filters.set)) return false;
  if(q){
    const hay = `${c.name || ''}\n${c.text || ''}`.toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function renderCards(cards){
  const grid = document.getElementById('grid');
  const tpl = document.getElementById('cardTpl');
  grid.innerHTML='';
  const frag = document.createDocumentFragment();
  for(const c of cards){
    const el = tpl.content.firstElementChild.cloneNode(true);
    const img = el.querySelector('img');
    const name = el.querySelector('.name');
    const sub = el.querySelector('.sub');
    name.textContent = c.name || '';
    sub.textContent = [c.type, c.rarity, c.set && c.set.name, c.set && c.set.number].filter(Boolean).join(' • ');
    const imgUrl = c.image && c.image.url;
    if(imgUrl){ img.src = imgUrl.startsWith('http') ? imgUrl : `../${imgUrl}`; }
    frag.appendChild(el);
  }
  grid.appendChild(frag);
  document.getElementById('count').textContent = `${cards.length} cards`;
}

(async function(){
  const all = await loadCards();
  renderFilters(all);
  const search = document.getElementById('search');
  const typeSel = document.getElementById('typeFilter');
  const raritySel = document.getElementById('rarityFilter');
  const setSel = document.getElementById('setFilter');

  function update(){
    const q = search.value.trim().toLowerCase();
    const filters = { type: typeSel.value, rarity: raritySel.value, set: setSel.value };
    const filtered = all.filter(c => cardMatches(c, q, filters));
    renderCards(filtered);
  }

  [search, typeSel, raritySel, setSel].forEach(el => el.addEventListener('input', update));
  update();
})();