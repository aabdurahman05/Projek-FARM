// Pekerjaan (kerja sama), laporan progres sesuai tahapan buatan bos tani, dan bagi hasil.
const Kerja=(()=>{
  const get=id=>D.kerja.find(k=>k.id==id);
  const nT=k=>k.tahapan.length;
  const stage=k=>k.laporan.length?Math.max(...k.laporan.map(r=>r.tahap)):-1;
  const pct=k=>nT(k)?Math.round((stage(k)+1)*100/nT(k)):0;
  const curStage=k=>Math.max(0,stage(k));
  const tname=(k,i)=>k.tahapan[i]||('Tahap '+(i+1));
  const lastDone=k=>nT(k)>0&&stage(k)===nT(k)-1;
  const other=k=>ROLE==='petani'?{id:k.bos_id,nama:k.owner}:{id:k.petani_id,nama:k.petani};
  const shown=()=>D.kerja.filter(k=>k.status!=='selesai'||!k.rated);   // yang selesai hilang setelah dinilai
  const rate=k=>{const o=other(k);Rating.open(o.id,'Rating '+o.nama)};
  const rhtml=k=>k.laporan.length?[...k.laporan].reverse().map(r=>`<div class="rpt"><div class="rh"><b>Tahap ${esc(tname(k,r.tahap))}</b><small>${dt(r.t)}</small></div><p>${r.catatan?esc(r.catatan):'<i>Tanpa catatan</i>'}</p><div class="imgs">${r.fotos.map(i=>`<img src="${esc(i)}" alt="Foto laporan" data-big>`).join('')}</div></div>`).join(''):'<p class="note" style="margin:0">Belum ada laporan.</p>';
  const tl=k=>'<div class="tl">'+k.tahapan.map((s,i)=>`<div class="${i<=stage(k)?'ok':''}"><b>${i<=stage(k)?'&#10003;':i+1}</b>${esc(s)}<small>${Math.round((i+1)*100/nT(k))}%</small></div>`).join('')+'</div>';
  const badge=k=>k.status==='selesai'?'<span class="bd">Selesai</span>':k.status==='menunggu'?'<span class="bd w">Menunggu konfirmasi</span>':'<span class="bd w">Berjalan</span>';
  function card(k){
    const pr=pct(k),P=ROLE==='petani';
    const pic=P?`<img src="${esc(k.foto)}" alt="">`:(k.petani_foto?`<img src="${esc(k.petani_foto)}" alt="Foto ${esc(k.petani)}">`:`<div class="ava" style="width:108px;height:144px;border-radius:5px;font-size:44px">${esc((k.petani[0]||'?').toUpperCase())}</div>`);
    const todo=P?(k.status==='berjalan'?`Tugas: laporkan progres tahap ${esc(tname(k,curStage(k)))} dan kirim foto pengerjaan.`:k.status==='menunggu'?'Semua tahapan sudah dilaporkan. Menunggu konfirmasi bos tani.':'Pekerjaan selesai. Kamu sekarang bisa memberi rating.')
      :(k.status==='berjalan'?`${k.laporan.length} laporan masuk dari petani.`:k.status==='menunggu'?'Petani sudah melaporkan tahap terakhir. Periksa laporan lalu tandai pekerjaan selesai.':'Pekerjaan selesai. Kamu sekarang bisa memberi rating.');
    const sub=P?`<p style="display:flex;align-items:center;gap:6px;color:var(--mut)">${avatar(k.bos_foto,k.owner,'xs')}Bos tani: ${esc(k.owner)}</p>`:`<p style="color:var(--mut)">${esc(k.job_nama)}</p>`;
    return `<div class="prog" data-id="${k.id}">${pic}<div class="in"><b style="font-size:15px">${esc(P?k.job_nama:k.petani)}</b> ${badge(k)}${sub}
      <p><b>Mulai bekerja</b> : ${tgl(k.mulai)}</p><p><b>Lokasi kerja</b> : ${esc(k.lokasi)}</p>
      <div class="todo">${todo}</div>
      <p style="display:flex;justify-content:space-between;margin-top:6px"><span>Tahap ${esc(tname(k,curStage(k)))}</span><b style="color:#f5a000;font-size:16px">${pr}%</b></p><div class="pb"><i style="width:${pr}%"></i></div></div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><button class="sm" data-lihat type="button">Lihat Detail</button><button class="chat" data-kchat type="button">Chat</button>${k.status==='selesai'?'<button class="sm" data-rate type="button">Beri rating</button>':''}</div></div>`;
  }
  function paint(){
    const l=shown(),P=ROLE==='petani';
    $('kj-t').textContent=P?'Tugas yang harus dikerjakan':'Progres pekerjaan';
    $('kj').innerHTML=l.length?l.map(card).join(''):`<p class="note" style="padding:14px;margin:0">${P?'Belum ada tugas. Apply lowongan dulu, tugas muncul setelah bos tani menerimamu.':'Belum ada pekerja. Terima pelamar dulu, progres kerjanya muncul di sini.'}</p>`;
    if(P&&$('bn')){const a=D.kerja.filter(k=>k.status==='berjalan').length;
      $('bn').textContent=a?`Ada ${a} tugas yang perlu kamu laporkan`:D.kerja.some(k=>k.status==='menunggu')?'Laporan terakhir terkirim, menunggu konfirmasi bos tani':D.kerja.length?'Semua pekerjaan sudah selesai. Terima kasih!':'Belum ada tugas. Cari lowongan dulu ya'}
  }
  $('kj').addEventListener('click',e=>{
    const b=e.target.closest('button'),c=e.target.closest('.prog');if(!b||!c)return;const k=get(c.dataset.id);if(!k)return;
    if(b.hasAttribute('data-lihat'))window.openKerja&&window.openKerja(k.id);
    else if(b.hasAttribute('data-kchat')){const o=other(k);Chat.openWith({id:o.id,nama:o.nama,foto:ROLE==='petani'?k.bos_foto:k.petani_foto})}
    else if(b.hasAttribute('data-rate'))rate(k);
  });
  document.addEventListener('click',e=>{const i=e.target.closest('img[data-big]');if(i&&!i.closest('#cm'))sheet('Foto','<img src="'+esc(i.src)+'" alt="Foto" style="max-width:100%;border-radius:8px">')});
  return{get,stage,pct,curStage,tname,lastDone,other,rate,rhtml,tl,badge,paint};
})();

// ---- Bagi hasil: dicatat oleh bos tani (pemilik lahan), petani hanya melihat.
// Persentase baru tampil setelah bos tani menyimpan hasil ke riwayat.
const Bagi=(()=>{
  let showAll=false;
  const T=(id,t)=>{if($(id))$(id).textContent=t};
  const dot=(id,foto,nama)=>{if($(id))$(id).innerHTML=foto?`<img src="${esc(foto)}" alt="">`:(nama?esc((nama.trim()[0]||'?').toUpperCase()):'')};
  function paint(){
    const v=D.bagi,e=v[0];
    const pp=e?e.persen_petani:0,bp=e?100-pp:0,bos=e?rp(e.bersih*bp/100):'Rp 0',pet=e?rp(e.bersih*pp/100):'Rp 0';
    // Ringkasan di Beranda: 0% sampai ada hasil yang disimpan
    T('s-ton',e?e.ton+' ton':'-');T('s-bl','Bos tani '+bp+'%');T('s-pl','Petani '+pp+'%');T('s-bos',bos);T('s-pet',pet);T('s-net',e?rp(e.bersih):'Rp 0');
    // Halaman Bagi hasil: persentase disembunyikan sampai ada riwayat
    T('pc-bos',e?bp+'%':'\u2013');T('pc-pet',e?pp+'%':'\u2013');T('p-bos',e?bos:'');T('p-pet',e?pet:'');
    dot('dot-bos',e&&e.bos_foto,e&&e.bos);dot('dot-pet',e&&e.petani_foto,e&&e.petani);
    if($('bar-a')){$('bar-a').parentNode.hidden=!e;if(e){$('bar-a').textContent=bp+'%';$('bar-a').style.width=bp+'%';$('bar-b').textContent=pp+'%';$('bar-b').style.width=pp+'%'}}
    if($('p-note'))$('p-note').textContent=e?'Pembagian dilakukan berdasarkan persentase dari pendapatan bersih.':'Persentase dan nominal pembagian muncul setelah bos tani menyimpan hasil panen ke riwayat.';
    if(ROLE==='petani'){T('r1',e?e.ton+' ton':'\u2013');T('r2',e?rp(e.kotor):'\u2013');T('r3',e?rp(e.modal):'\u2013');T('r4',e?rp(e.bersih):'\u2013')}
    const rows=showAll?v:v.slice(0,2);
    $('rb').innerHTML=rows.length?rows.map(h=>`<tr><td>${tgl(h.tanggal)}</td><td>${esc(h.job)}</td><td>${h.ton} ton</td><td>${rp(h.bersih)}</td><td>${rp(h.bersih*(100-h.persen_petani)/100)} (${100-h.persen_petani}%)</td><td>${rp(h.bersih*h.persen_petani/100)} (${h.persen_petani}%)</td><td><span class="ok">Selesai</span></td></tr>`).join(''):'<tr><td colspan="7">Belum ada riwayat bagi hasil.</td></tr>';
    $('more').hidden=v.length<=2;$('more').textContent=showAll?'Sembunyikan \u2303':'Lihat semua riwayat \u2304';
  }
  $('more').addEventListener('click',()=>{showAll=!showAll;paint()});
  return{paint};
})();

onData(()=>{Kerja.paint();Bagi.paint();window.refreshKerja&&window.refreshKerja()});
Kerja.paint();Bagi.paint();
