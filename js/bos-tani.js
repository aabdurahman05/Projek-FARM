// Pelamar (+ detail), Posting job, Laporan petani, dan Bagi hasil (dashboard bos tani)
const mkPel=()=>D.lamaran.map(a=>({id:a.id,n:a.nama,l:a.alamat,p:a.pengalaman||'-',ttl:a.ttl,hp:a.hp,bio:a.tentang,job:a.job_nama,s:a.status,img:a.pfoto,pid:a.petani_id}));
let PEL=mkPel(),curP=null;
const pic=(p,big)=>p.img?`<img ${big?'class="dimg" ':''}src="${esc(p.img)}" alt="">`:`<div class="ava" style="${big?'width:100%;max-width:300px;height:300px;border-radius:16px;font-size:90px':'width:84px;height:84px;font-size:30px'}">${esc((p.n[0]||'?').toUpperCase())}</div>`;
function banner(){
  const n=PEL.filter(p=>p.s==='Menunggu').length;
  $('bn').textContent=n?`Ada ${n} pelamar baru menunggu keputusanmu`:'Semua pelamar sudah kamu proses';
}
function pel(){
  const q=$('q').value.toLowerCase();
  const l=PEL.map((p,i)=>({p,i})).filter(({p})=>(p.n+p.l+' perawatan '+p.job).toLowerCase().includes(q));
  $('pelamar').innerHTML=l.map(({p,i})=>{const x=p.s!=='Menunggu';
    return `<div class="card job">${pic(p)}<div class="t"><h3>${esc(p.n)}</h3><p>${esc(p.l)}</p><p>Pengalaman : ${esc(p.p)}<br>Melamar untuk : ${esc(p.job)}<br>Status&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <b class="st">${p.s}</b></p></div><div class="pact"><button class="det" data-a="detail" data-i="${i}">Lihat detail</button><button class="btn" data-a="terima" data-i="${i}" ${x?'disabled':''}>Terima</button><button class="sm" data-a="tolak" data-i="${i}" ${x?'disabled':''}>Tolak</button></div></div>`}).join('');
  $('nopel').hidden=l.length>0;banner();
}
async function decide(p,ok){
  const yes=await confirmBox(ok?'Terima pelamar?':'Tolak pelamar?',ok?`${p.n} akan diterima untuk ${p.job}.`:`${p.n} akan ditolak. Keputusan ini tidak bisa dibatalkan.`,ok?'Ya, terima':'Ya, tolak',!ok);
  if(!yes)return false;
  if(!(await aksi(()=>api('lamaran/putus',{id:p.id,status:ok?'Diterima':'Ditolak'}))))return false;
  toast(p.n+(ok?' diterima':' ditolak'));await refresh();return true;
}
$('pelamar').addEventListener('click',async e=>{
  const b=e.target.closest('button[data-a]');if(!b)return;
  const p=PEL[b.dataset.i];if(!p)return;
  if(b.dataset.a==='detail')return openP(p);
  await decide(p,b.dataset.a==='terima');
});
$('q').addEventListener('input',pel);
$('qx').addEventListener('click',()=>{$('q').value='';pel()});

// ---- detail pelamar (tampilan sama dengan Detail kerja di petani)
function infoP(p){
  return `<div class="jh"><div><h3>${esc(p.n)}</h3><small>${esc(p.l)} &middot; ${p.s}</small></div><button class="chat" data-chat type="button">Chat</button></div>`
   +row('jenis','Pengalaman',p.p)+row('sistem','Keahlian','Perawatan')+row('waktu','Tempat tanggal lahir',p.ttl||'-')+row('hp','No hp',p.hp||'-')+row('desk','Tentang',p.bio||'-')+row('bagi','Melamar untuk',p.job);
}
function paintP(){
  const p=curP,x=p.s!=='Menunggu';
  $('pd-card').innerHTML=infoP(p);$('pd-pic').innerHTML=pic(p,true);
  $('pd-ok').disabled=x;$('pd-no').disabled=x;$('pd-ok').textContent=x?'Status: '+p.s:'Terima pelamar';
}
function openP(p){curP=p;paintP();go('pdetail')}
$('pd-rate').addEventListener('click',()=>curP&&Rating.open(curP.pid,'Rating '+curP.n));
async function decideP(ok){if(curP)await decide(curP,ok)}
$('pd-ok').addEventListener('click',()=>decideP(true));
$('pd-no').addEventListener('click',()=>decideP(false));
document.addEventListener('click',e=>{if(e.target.closest('[data-chat]')&&curP&&!$('v-pdetail').hidden)Chat.openWith({id:curP.pid,nama:curP.n,foto:curP.img})});

// ---- Posting job (tampil di Lowongan dashboard petani)
let pjImg=null;
const TPL={'Perawatan':['Pemupukan','Penyiangan','Pengendalian hama','Menjelang panen'],'Penanaman':['Persiapan lahan','Penanaman'],'Pemanenan':['Pemanenan'],'Pengolahan lahan':['Pembersihan lahan','Pengolahan tanah']};
let tahap=TPL[$('pj-jenis').value].slice(),dirty=false;
function paintT(){$('pj-tahap').innerHTML=tahap.map((t,i)=>`<div class="tr"><input value="${esc(t)}" data-i="${i}" maxlength="60" placeholder="Nama tahapan ${i+1}" aria-label="Tahapan ${i+1}"><button type="button" class="sm" data-rm="${i}" aria-label="Hapus tahapan ${i+1}">&times;</button></div>`).join('')}
$('pj-tahap').addEventListener('input',e=>{const i=e.target.dataset.i;if(i!==undefined){tahap[+i]=e.target.value;dirty=true}});
$('pj-tahap').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;if(tahap.length<=1)return toast('Minimal 1 tahapan');tahap.splice(+b.dataset.rm,1);dirty=true;paintT()});
$('pj-add').addEventListener('click',()=>{if(tahap.length>=8)return toast('Maksimal 8 tahapan');tahap.push('');dirty=true;paintT();const i=$('pj-tahap').querySelectorAll('input');i[i.length-1].focus()});
$('pj-jenis').addEventListener('change',()=>{if(!dirty){tahap=TPL[$('pj-jenis').value].slice();paintT()}});
paintT();
function pjList(){
  const l=D.lowongan;
  $('pj-list').innerHTML=l.length?l.map(j=>`<div class="card job" style="margin-bottom:8px"><img src="${esc(j.foto)}" alt=""><div class="t"><h3>${esc(j.nama)}</h3><p>${esc(j.lokasi)}</p><p>${esc(j.jenis)} &middot; ${esc(j.estimasi)}<br>Tahapan: ${esc((j.tahapan||[]).join(' \u2192 '))}<br>Petani ${j.persen_petani}% | Bos tani ${100-j.persen_petani}%</p></div><button class="sm" data-del="${j.id}">Hapus</button></div>`).join(''):'<p class="note" style="margin:0">Belum ada lowongan yang kamu posting.</p>';
}
$('pj-list').addEventListener('click',async e=>{
  const b=e.target.closest('[data-del]');if(!b)return;
  if(!(await confirmBox('Hapus lowongan?','Lowongan ini tidak akan tampil lagi di daftar petani.','Ya, hapus',true)))return;
  if(await aksi(()=>api('lowongan/hapus',{id:+b.dataset.del}))){await refresh();toast('Lowongan dihapus')}
});
$('pj-pet').addEventListener('input',()=>{const v=parseInt($('pj-pet').value)||0;$('pj-bos').textContent='Bos tani '+(100-v)+'%'});
$('pj-foto').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  resizeImg(f,640,.8,d=>{if(!d)return toast('Gagal membaca foto');pjImg=d;$('pj-prev').src=d;$('pj-prev').hidden=false});
});
$('pj-go').addEventListener('click',async()=>{
  const nama=$('pj-nama').value.trim(),lokasi=$('pj-lok').value.trim(),desk=$('pj-desk').value.trim(),pet=parseInt($('pj-pet').value);
  if(!nama||!lokasi||!desk)return toast('Nama, lokasi, dan deskripsi wajib diisi');
  if(!(pet>=1&&pet<=99))return toast('Persentase petani harus antara 1 dan 99');
  const tahapan=tahap.map(t=>t.trim()).filter(Boolean);
  if(!tahapan.length)return toast('Isi minimal 1 tahapan pekerjaan');
  if(await aksi(()=>api('lowongan/buat',{nama,lokasi,jenis:$('pj-jenis').value,estimasi:$('pj-est').value,deskripsi:desk,persen_petani:pet,tahapan,foto:pjImg}))){
    dirty=false;tahap=TPL[$('pj-jenis').value].slice();paintT();
    ['pj-nama','pj-lok','pj-desk','pj-foto'].forEach(i=>$(i).value='');$('pj-pet').value=60;$('pj-bos').textContent='Bos tani 40%';
    pjImg=null;$('pj-prev').hidden=true;await refresh();toast('Lowongan berhasil diposting');
  }
});

// ---- Laporan petani (semua laporan yang sudah dikirim)
let kid=null;const kk=()=>Kerja.get(kid);
window.openKerja=id=>{kid=id;renderLap();go('laporan')};
window.refreshKerja=()=>{if(!$('v-laporan').hidden)renderLap()};
function renderLap(){
  const k=kk();if(!k)return;
  $('l-card').innerHTML=`<div class="jh"><div><h3>${esc(k.petani)}</h3><small>${esc(k.job_nama)}</small></div><button class="chat" data-chat type="button">Chat</button></div>`
   +row('jenis','Lokasi kerja',k.lokasi)+row('waktu','Mulai bekerja',tgl(k.mulai))+row('bagi','Persentase bagi hasil','Petani '+k.persen_petani+'% | Bos tani '+(100-k.persen_petani)+'%')+`<div style="margin:6px 0">${Kerja.badge(k)}</div>`+Kerja.tl(k);
  $('l-list').innerHTML=Kerja.rhtml(k);
  const st=k.status;
  $('l-done').disabled=st!=='menunggu';
  $('l-done').textContent=st==='selesai'?'Pekerjaan selesai':st==='menunggu'?'Tandai pekerjaan selesai':'Menunggu laporan tahap terakhir';
  $('l-bagi').hidden=!(st!=='berjalan'&&!k.bagi_ada);
  $('l-rate').textContent=st==='selesai'?'Beri rating petani':'Lihat Riwayat Rating';
}
$('l-rate').addEventListener('click',()=>{const k=kk();k&&Kerja.rate(k)});
$('l-done').addEventListener('click',async()=>{
  const k=kk();if(!k||k.status!=='menunggu')return;
  if(!(await confirmBox('Tandai pekerjaan selesai?',`Pekerjaan ${k.petani} akan dinyatakan selesai. Setelah itu kalian berdua bisa saling memberi rating.`,'Ya, selesai')))return;
  if(await aksi(()=>api('kerja/selesai',{kerja_id:k.id}))){toast('Pekerjaan selesai. Sekarang kamu bisa memberi rating.');await refresh()}
});
$('l-bagi').addEventListener('click',()=>{fillSel();if($('i-k').querySelector('option[value="'+kid+'"]'))$('i-k').value=kid;go('bagi')});
document.addEventListener('click',e=>{if(e.target.closest('[data-chat]')&&!$('v-laporan').hidden&&kk()){const o=Kerja.other(kk());Chat.openWith({id:o.id,nama:o.nama,foto:kk().petani_foto})}});

// ---- Bagi hasil: HANYA bos tani (pemilik lahan) yang mencatat; angka final dihitung server
let calc=null;
function fillSel(){
  const l=D.kerja.filter(k=>Kerja.lastDone(k)&&!k.bagi_ada),s=$('i-k'),old=s.value;
  s.innerHTML=l.length?l.map(k=>`<option value="${k.id}">${esc(k.petani)} - ${esc(k.job_nama)}</option>`).join(''):'<option value="">(belum ada)</option>';
  if(l.some(k=>String(k.id)===old))s.value=old;
  $('i-info').textContent=l.length?'Pilih pekerjaan yang semua tahapannya sudah dilaporkan.':'Belum ada pekerjaan yang menyelesaikan tahapan terakhir. Hasil panen baru bisa dicatat setelah petani melapor tahap terakhir.';
}
$('hitung').addEventListener('click',()=>{
  const k=Kerja.get($('i-k').value);if(!k)return toast('Belum ada pekerjaan yang siap dicatat');
  const t=$('i-t').value,n=parseFloat($('i-n').value),h=parseFloat($('i-h').value),m=parseFloat($('i-m').value)||0;
  if(!t||!(n>0)||!(h>0))return toast('Isi tanggal, jumlah hasil panen, dan harga jual per ton');
  const kotor=n*h,net=kotor-m;if(net<=0)return toast('Pendapatan bersih tidak boleh nol atau minus');
  calc={kerja_id:k.id,tanggal:t,ton:n,harga:h,modal:m};
  $('r1').textContent=n+' ton';$('r2').textContent=rp(kotor);$('r3').textContent=rp(m);$('r4').textContent=rp(net);
});
$('simpan').addEventListener('click',async()=>{
  if(!calc)return toast('Hitung bagi hasil dulu');
  if(await aksi(()=>api('bagi/simpan',calc))){
    calc=null;['i-t','i-n','i-m'].forEach(i=>$(i).value='');['r1','r2','r3','r4'].forEach(i=>$(i).textContent='\u2013');
    await refresh();toast('Hasil disimpan ke riwayat');
  }
});
onData(()=>{PEL=mkPel();pel();pjList();fillSel();if(curP&&!$('v-pdetail').hidden){curP=PEL.find(x=>x.id===curP.id)||curP;paintP()}});
pel();pjList();fillSel();
