const ROLE=D.me.role,OTHER=ROLE==='petani'?'bos':'petani';
const $=id=>document.getElementById(id);
const rp=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const BL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const tgl=s=>{const[y,m,d]=String(s).slice(0,10).split('-');return +d+' '+BL[m-1]+' '+y};
let tt;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2600)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-toast]');if(t)toast(t.dataset.toast)});

// ---- muat ulang data dari server, lalu gambar ulang tampilan
const hooks=[];const onData=f=>hooks.push(f);
async function refresh(){D=await api('boot');hooks.forEach(f=>{try{f()}catch(e){console.error(e)}})}
setInterval(()=>{if(!document.hidden)refresh().catch(()=>{})},15000);
// jalankan aksi ke server; tampilkan pesan error bila gagal
async function aksi(fn){try{return await fn()}catch(e){toast(e.message);return null}}

// ---- jendela bantu: sheet (info) dan konfirmasi
function sheet(title,html){
  let m=$('sheet');
  if(!m){m=document.createElement('div');m.id='sheet';m.className='modal';m.hidden=true;
    m.innerHTML='<div class="box"><h3 id="sh-t"></h3><div id="sh-b"></div><button class="btn c" id="sh-x" type="button">Tutup</button></div>';
    document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.id==='sh-x')m.hidden=true})}
  $('sh-t').textContent=title;$('sh-b').innerHTML=html;m.hidden=false;return $('sh-b');
}
function confirmBox(title,msg,ok,danger){
  return new Promise(res=>{
    const m=document.createElement('div');m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.innerHTML=`<div class="box"><h3>${esc(title)}</h3><p class="note" style="font-size:14px;margin:6px 0 0">${esc(msg)}</p><div class="cfm"><button class="sm" type="button" data-r="0">Batal</button><button class="btn${danger?' red':''}" type="button" data-r="1">${esc(ok||'Ya')}</button></div></div>`;
    const done=v=>{m.remove();document.removeEventListener('keydown',kd);res(v)};
    const kd=e=>{if(e.key==='Escape')done(false)};
    m.addEventListener('click',e=>{if(e.target===m)done(false);const b=e.target.closest('[data-r]');if(b)done(b.dataset.r==='1')});
    document.addEventListener('keydown',kd);document.body.appendChild(m);m.querySelector('[data-r="1"]').focus();
  });
}
const IC={
 jenis:'<svg viewBox="0 0 24 24"><path d="M3 8l9-4 9 4-9 4zM3 12l9 4 9-4M3 16l9 4 9-4"/></svg>',
 sistem:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
 waktu:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 desk:'<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/></svg>',
 bagi:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M12 6v4M3 17l5-1 5 2h4l4-2M3 21l5-1"/></svg>',
 hp:'<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'};
const avatar=(foto,nama,cls)=>`<span class="ava ${cls||''}">${foto?`<img src="${esc(foto)}" alt="">`:esc(((nama||'?').trim()[0]||'?').toUpperCase())}</span>`;
const row=(i,t,v)=>`<div class="jr">${IC[i]}<div><b>${t}</b><span>${esc(v)}</span></div></div>`;

// ---- navigasi
const VIEWS=[...document.querySelectorAll('main>section')].map(s=>s.id.slice(2));
const NAVOF={detail:'lowongan',apply:'lowongan',pdetail:'pelamar',tugas:'beranda',laporan:'beranda'};
function go(v){
  VIEWS.forEach(n=>$('v-'+n).hidden=n!==v);
  document.querySelectorAll('.nav[data-v]').forEach(b=>b.dataset.v===(NAVOF[v]||v)?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  document.querySelector('main').scrollTop=0;
}
document.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));
$('keluar').addEventListener('click',async()=>{
  if(await confirmBox('Keluar dari akun?','Kamu akan keluar dari dashboard dan perlu masuk lagi.','Ya, keluar',true)){
    try{await api('auth/logout',{})}catch(e){}
    location.href='login.html';
  }
});

// ---- notifikasi (lonceng)
const unread=()=>D.notif.filter(n=>!n.dibaca).length;
function bellDot(){document.querySelectorAll('.bell').forEach(b=>{let i=b.querySelector('i');if(!i){i=document.createElement('i');b.appendChild(i)}i.hidden=!unread()})}
document.querySelectorAll('.bell').forEach(b=>b.addEventListener('click',async()=>{
  try{await refresh()}catch(e){}
  sheet('Notifikasi',D.notif.length?D.notif.map(n=>`<div class="rv" style="${n.dibaca?'opacity:.6':''}">${esc(n.teks)}<br><small class="note">${dt(n.t)}</small></div>`).join(''):'<p class="note">Belum ada notifikasi.</p>');
  if(unread()){try{await api('notif/baca',{});D.notif.forEach(n=>n.dibaca=true);bellDot()}catch(e){}}
}));
onData(bellDot);bellDot();
