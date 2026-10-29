// Rating dua arah. Server memastikan rating hanya bisa diberikan setelah pekerjaan bersama selesai.
const Rating=(()=>{
  const stars=n=>'\u2605'.repeat(Math.round(n))+'\u2606'.repeat(5-Math.round(n));
  const fmt=n=>Number(n).toFixed(1).replace('.',',');
  async function open(userId,title){
    let d;try{d=await api('rating/daftar&user='+userId)}catch(e){return toast(e.message)}
    let h=`<p class="note" style="margin:0 0 8px">${d.count?`\u2605 ${fmt(d.avg)} dari ${d.count} ulasan`:'Belum ada rating.'}</p>`
      +d.items.map(x=>`<div class="rv"><b>${esc(x.dari)}</b> ${stars(x.bintang)}<br>${esc(x.ulasan||'(tanpa ulasan)')}</div>`).join('');
    if(d.boleh)h+=`<div class="rv"><b>${d.mine?'Ubah rating kamu':'Beri rating'}</b><div class="stars" id="rt-st">${[1,2,3,4,5].map(i=>`<button type="button" data-s="${i}" aria-label="${i} bintang">\u2606</button>`).join('')}</div><textarea id="rt-c" rows="2" placeholder="Tulis ulasan (opsional)" style="width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);font:inherit"></textarea><button class="btn" id="rt-go" type="button" style="margin-top:8px">Kirim rating</button></div>`;
    else if(d.alasan)h+=`<p class="note" style="margin:10px 0 0">${esc(d.alasan)}</p>`;
    const b=sheet(title,h);
    if(!d.boleh)return;
    let s=d.mine?d.mine.bintang:0;const paint=()=>b.querySelectorAll('#rt-st button').forEach(x=>x.textContent=+x.dataset.s<=s?'\u2605':'\u2606');
    if(d.mine)$('rt-c').value=d.mine.ulasan||'';paint();
    $('rt-st').addEventListener('click',e=>{const x=e.target.closest('button');if(x){s=+x.dataset.s;paint()}});
    $('rt-go').addEventListener('click',async()=>{
      if(!s)return toast('Pilih jumlah bintang dulu');
      try{await api('rating/kirim',{kerja_id:d.kerja_id,bintang:s,ulasan:$('rt-c').value.trim()})}catch(e){return toast(e.message)}
      toast('Rating terkirim');await refresh();open(userId,title);
    });
  }
  // kartu "Rating saya" di Beranda
  const el=document.createElement('div');el.className='card';el.style.cssText='max-width:520px;margin-top:16px';el.innerHTML='<h2>Rating saya</h2><div class="pad"></div>';
  $('v-beranda').appendChild(el);
  function cardPaint(){
    const r=D.rating;
    el.querySelector('.pad').innerHTML=`<b style="font-size:22px">${r.count?'\u2605 '+fmt(r.avg):'-'}</b> <span class="note">${r.count?r.count+' ulasan dari '+(ROLE==='bos'?'petani':'bos tani'):'Belum ada rating'}</span><br><button class="sm" id="rs-go" type="button" style="margin-top:8px">Lihat ulasan</button>`;
    $('rs-go').addEventListener('click',()=>open(D.me.id,'Rating saya'));
  }
  onData(cardPaint);cardPaint();
  return{open};
})();
