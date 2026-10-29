const $=id=>document.getElementById(id);
const rl=v=>document.querySelector('#'+v+' .tabs [aria-selected="true"]').textContent==='Petani'?'petani':'bos';
const pick=(v,role)=>document.querySelectorAll('#'+v+' .tabs button').forEach((b,i)=>b.setAttribute('aria-selected',i===(role==='petani'?0:1)));
const DASH={petani:'dashboard-petani.html',bos:'dashboard-bos-tani.html'};
const PWOK=/^[0-9+\s-]{8,16}$/;
function show(v){['login','daftar','lupa'].forEach(n=>$('v-'+n).hidden=n!==v)}
function say(el,t,ok){el.style.color=ok?'':'#c62828';el.textContent=t}
async function panggil(el,fn){try{return await fn()}catch(e){say(el,e.message);return null}}

document.querySelectorAll('.tabs').forEach(t=>t.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>t.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b)))));
let shown=false;
$('eye').addEventListener('click',()=>{
  shown=!shown;$('pw').type=shown?'text':'password';$('slash').style.display=shown?'none':'';
  $('eye').setAttribute('aria-label',shown?'Sembunyikan kata sandi':'Tampilkan kata sandi');
});
$('lupa').addEventListener('click',e=>{e.preventDefault();show('lupa')});
$('daftar').addEventListener('click',e=>{e.preventDefault();show('daftar')});
document.querySelectorAll('[data-back]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show('login')}));

// ingat saya (hanya mengisi kolom email/No.Hp, bukan kata sandi)
let ing=null;try{ing=JSON.parse(localStorage.getItem('farm_ingat')||'null')}catch(e){}
if(ing){$('id').value=ing.id;$('rem').checked=true;pick('v-login',ing.role)}

// masuk
async function login(){
  const idv=$('id').value.trim(),pw=$('pw').value,role=rl('v-login'),m=$('msg');
  if(!idv||!pw)return say(m,'Email/No.Hp dan kata sandi wajib diisi.');
  const r=await panggil(m,()=>api('auth/login',{id:idv,password:pw,role}));
  if(!r)return;
  try{if($('rem').checked)localStorage.setItem('farm_ingat',JSON.stringify({id:idv,role}));else localStorage.removeItem('farm_ingat')}catch(e){}
  say(m,'Berhasil masuk...',true);location.href=DASH[r.role];
}
$('go').addEventListener('click',login);
['id','pw'].forEach(i=>$(i).addEventListener('keydown',e=>{if(e.key==='Enter')login()}));

// Google / Facebook (mode demo, bisa dimatikan di api/config.php) dan nomor HP
document.querySelectorAll('[data-sosial]').forEach(b=>b.addEventListener('click',async()=>{
  const p=b.dataset.sosial,role=rl('v-login'),m=$('msg');
  if(p==='HP'){$('id').focus();return say(m,'Masukkan No.Hp yang terdaftar dan kata sandinya.',true)}
  const r=await panggil(m,()=>api('auth/sosial',{provider:p.toLowerCase(),role}));
  if(r){say(m,'Masuk dengan '+p+' (mode demo)...',true);location.href=DASH[r.role]}
}));

// daftar
$('d-go').addEventListener('click',async()=>{
  const m=$('d-msg'),role=rl('v-daftar'),nama=$('d-nama').value.trim(),email=$('d-email').value.trim(),hp=$('d-hp').value.trim(),pw=$('d-pw').value;
  if(!nama||!email||!hp||!pw)return say(m,'Semua kolom wajib diisi.');
  if(!/^\S+@\S+\.\S+$/.test(email))return say(m,'Format email belum benar.');
  if(!PWOK.test(hp))return say(m,'Nomor HP belum benar.');
  if(pw.length<8)return say(m,'Kata sandi minimal 8 karakter.');
  if(pw!==$('d-pw2').value)return say(m,'Kata sandi tidak sama.');
  if(!$('d-setuju').checked)return say(m,'Centang persetujuan syarat dan ketentuan.');
  if(!(await panggil(m,()=>api('auth/register',{role,nama,email,hp,password:pw}))))return;
  say(m,'Akun berhasil dibuat. Silakan masuk.',true);
  setTimeout(()=>{show('login');pick('v-login',role);$('id').value=email;$('pw').value='';say(m,'',true);say($('msg'),'Akun siap dipakai. Masukkan kata sandi.',true)},1200);
});

// lupa kata sandi: verifikasi email/No.Hp + nama lengkap, lalu atur sandi baru
let lupaId='';
$('l-go').addEventListener('click',async()=>{
  const v=$('l-id').value.trim(),n=$('l-nama').value.trim(),m=$('l-msg');
  if(!v||!n)return say(m,'Email/No.Hp dan nama lengkap wajib diisi.');
  if(!(await panggil(m,()=>api('auth/lupa_cek',{id:v,nama:n}))))return;
  lupaId=v;$('l1').hidden=true;$('l2').hidden=false;say(m,'Akun terverifikasi. Buat kata sandi baru.',true);
});
$('l-save').addEventListener('click',async()=>{
  const a=$('l-pw').value,b=$('l-pw2').value,m=$('l-msg');
  if(a.length<8)return say(m,'Kata sandi minimal 8 karakter.');
  if(a!==b)return say(m,'Kata sandi tidak sama.');
  if(!(await panggil(m,()=>api('auth/lupa_reset',{password:a}))))return;
  say(m,'Kata sandi berhasil diubah. Silakan masuk.',true);
  setTimeout(()=>{show('login');$('id').value=lupaId;$('pw').value='';$('l1').hidden=false;$('l2').hidden=true;['l-id','l-nama','l-pw','l-pw2'].forEach(i=>$(i).value='');say(m,'',true)},1200);
});

// buka tampilan dari tautan landing page: login.html#daftar-petani, #daftar-bos, #lupa
(function(){
  const h=location.hash;
  if(h.indexOf('#daftar')===0){show('daftar');pick('v-daftar',h==='#daftar-bos'?'bos':'petani')}
  else if(h==='#lupa')show('lupa');
})();
