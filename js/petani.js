// Lowongan -> Detail kerja -> Apply -> Tugas/laporan (dashboard petani)
let cur=null;
function jobs(){
  const q=$('q').value.toLowerCase();
  const l=D.lowongan.filter(j=>(j.nama+j.lokasi+j.jenis+j.sistem+j.owner).toLowerCase().includes(q));
  $('jobs').innerHTML=l.map(j=>`<div class="card job"><img src="${esc(j.foto)}" alt=""><div class="t"><h3>${esc(j.nama)}</h3><p>${esc(j.lokasi)}</p><p>Jenis&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(j.jenis)}<br>Sistem&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(j.sistem)}<br>Estimasi : ${esc(j.estimasi)}</p></div><button class="det" data-id="${j.id}">Lihat detail</button></div>`).join('');
  $('nojob').hidden=l.length>0;
}
$('jobs').addEventListener('click',e=>{const b=e.target.closest('.det');if(b)openDetail(b.dataset.id)});
$('q').addEventListener('input',jobs);
$('qx').addEventListener('click',()=>{$('q').value='';jobs()});

function info(j,chat){
  return `<div class="jh"><div><h3>${esc(j.nama)}</h3><small>${esc(j.lokasi)}</small></div>${chat?'<button class="chat" data-chat type="button">Chat</button>':''}</div>`
   +row('jenis','Jenis pekerjaan',j.jenis)+row('sistem','Sistem',j.sistem)+row('waktu','Estimasi waktu',j.estimasi)+row('jenis','Tahapan pekerjaan',(j.tahapan||[]).join(' \u2192 '))+row('desk','Deskripsi',j.deskripsi)
   +row('bagi','Persentase bagi hasil','Petani '+j.persen_petani+'% | Bos tani '+(100-j.persen_petani)+'%');
}
const myLam=()=>cur&&D.lamaran.find(l=>l.lowongan_id==cur.id);
function btnState(){const a=myLam();$('d-apply').disabled=!!a;$('d-apply').textContent=a?'Sudah dilamar \u00b7 '+a.status:'Apply pekerjaan'}
function openDetail(id){
  cur=D.lowongan.find(j=>j.id==id);if(!cur)return;
  $('d-card').innerHTML=info(cur,true);$('d-img').src=cur.foto;$('d-img').alt=cur.nama;btnState();go('detail');
}
$('d-rate').addEventListener('click',()=>cur&&Rating.open(cur.bos_id,'Rating '+cur.owner));
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-chat]')||!cur)return;
  if(!$('v-detail').hidden||!$('v-apply').hidden)Chat.openWith({id:cur.bos_id,nama:cur.owner,foto:cur.bos_foto});
});
$('d-apply').addEventListener('click',()=>{
  if(!cur||myLam())return;
  $('a-card').innerHTML=info(cur,false);
  $('ap-nama').value=D.me.nama||'';$('ap-alamat').value=D.me.alamat||'';$('ap-hp').value=D.me.hp||'';$('ap-ttl').value='';$('ap-tentang').value='';
  go('apply');
});
$('a-go').addEventListener('click',async()=>{
  const v={lowongan_id:cur.id,nama:$('ap-nama').value.trim(),alamat:$('ap-alamat').value.trim(),ttl:$('ap-ttl').value.trim(),hp:$('ap-hp').value.trim(),tentang:$('ap-tentang').value.trim()};
  if(!v.nama||!v.alamat||!v.ttl||!v.hp)return toast('Nama, alamat, tempat tanggal lahir, dan No hp wajib diisi');
  if(!/^[0-9+\s-]{8,16}$/.test(v.hp))return toast('Nomor HP belum benar');
  if(await aksi(()=>api('lamaran/kirim',v))){toast('Lamaran terkirim ke '+cur.nama);await refresh();btnState();setTimeout(()=>go('lowongan'),700)}
});
onData(()=>{jobs();if(cur&&!$('v-detail').hidden)btnState()});

// ---- Tugas: lapor progres + foto pengerjaan (wajib)
let kid=null,photos=[];
const kk=()=>Kerja.get(kid);
window.openKerja=id=>{kid=id;photos=[];renderTugas(true);go('tugas')};
window.refreshKerja=()=>{if(!$('v-tugas').hidden)renderTugas(false)};
function prev(){$('t-prev').innerHTML=photos.map((p,i)=>`<div><img src="${p}" alt="Foto ${i+1}"><button type="button" data-x="${i}" aria-label="Hapus foto">&times;</button></div>`).join('')}
function renderTugas(reset){
  const k=kk();if(!k)return;
  $('t-card').innerHTML=`<div class="jh"><div><h3>${esc(k.job_nama)}</h3><small>${esc(k.lokasi)}</small></div><button class="chat" data-chat type="button">Chat</button></div>`
   +row('jenis','Bos tani',k.owner)+row('waktu','Mulai bekerja',tgl(k.mulai))+row('bagi','Persentase bagi hasil','Petani '+k.persen_petani+'% | Bos tani '+(100-k.persen_petani)+'%')+`<div style="margin:6px 0">${Kerja.badge(k)}</div>`+Kerja.tl(k);
  const open=k.status==='berjalan';
  $('t-form').hidden=!open;$('t-lock').hidden=open;
  $('t-lock').textContent=k.status==='menunggu'?'Semua tahapan sudah dilaporkan. Menunggu konfirmasi bos tani.':'Pekerjaan sudah selesai. Terima kasih! Kamu sekarang bisa memberi rating lewat tombol di kiri.';
  const cs=Kerja.curStage(k),old=$('t-tahap').value;
  $('t-tahap').innerHTML=k.tahapan.map((s,i)=>i<cs?'':`<option value="${i}">Tahap ${esc(s)}</option>`).join('');
  $('t-tahap').value=(!reset&&old!==''&&+old>=cs)?old:String(cs);
  $('t-list').innerHTML=Kerja.rhtml(k);prev();
  $('t-rate').textContent=k.status==='selesai'?'Beri rating bos tani':'Lihat Riwayat Rating';
}
$('t-prev').addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(b){photos.splice(+b.dataset.x,1);prev()}});
$('t-foto').addEventListener('change',e=>{
  const fs=[...e.target.files];e.target.value='';
  const room=3-photos.length;if(room<=0)return toast('Maksimal 3 foto per laporan');
  fs.slice(0,room).forEach(f=>resizeImg(f,800,.7,d=>{if(!d)return toast('Gagal membaca foto');photos.push(d);prev()}));
  if(fs.length>room)toast('Hanya '+room+' foto pertama yang dipakai');
});
$('t-send').addEventListener('click',async()=>{
  const k=kk();if(!k||k.status!=='berjalan')return;
  if(!photos.length)return toast('Wajib melampirkan foto saat pengerjaan');
  const tahap=+$('t-tahap').value;
  if(await aksi(()=>api('kerja/laporan',{kerja_id:k.id,tahap,catatan:$('t-cat').value.trim(),fotos:photos}))){
    photos=[];$('t-cat').value='';toast('Laporan terkirim ke bos tani');await refresh();renderTugas(true);
  }
});
$('t-rate').addEventListener('click',()=>{const k=kk();k&&Kerja.rate(k)});
document.addEventListener('click',e=>{if(e.target.closest('[data-chat]')&&!$('v-tugas').hidden&&kk()){const o=Kerja.other(kk());Chat.openWith({id:o.id,nama:o.nama,foto:kk().bos_foto})}});
jobs();
