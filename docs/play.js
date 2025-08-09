async function loadCards(){ const r=await fetch('./cards.json'); return r.json(); }
function imgUrl(c){ const code=c.set&&c.set.code, num=c.set&&c.set.number; return code&&num?`https://www.uvsultra.online/images/extensions/${code}/${String(num).padStart(3,'0')}-preview.jpg`:''; }
function cardEl(c){ const d=document.createElement('div'); d.className='row'; const i=document.createElement('img'); i.src=imgUrl(c); const n=document.createElement('div'); n.className='name'; n.textContent=c.name; d.append(i,n); d.dataset.id=c.id; return d; }
function draw(hand, pool){ const c=pool[Math.floor(Math.random()*pool.length)]; hand.appendChild(cardEl(c)); }

(async function(){
  const all=await loadCards();
  const p1=document.getElementById('hand1');
  const p2=document.getElementById('hand2');
  const board=document.getElementById('board');
  document.getElementById('drawP1').onclick=()=>draw(p1, all);
  document.getElementById('drawP2').onclick=()=>draw(p2, all);
  [p1,p2].forEach(hand=>{
    hand.addEventListener('click', (e)=>{
      const row=e.target.closest('.row'); if(!row) return;
      board.appendChild(row);
    });
  });
})();