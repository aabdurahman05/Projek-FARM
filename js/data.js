// Lapisan data: semua data berasal dari server (PHP + MySQL) lewat API.
const API='api/index.php';
let D=null;   // data dashboard milik pengguna yang sedang masuk (hasil api('boot'))

async function api(r,body){
  const opt={credentials:'same-origin',headers:{'X-Requested-With':'fetch'}};
  if(body!==undefined){opt.method='POST';opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body)}
  let res;
  try{res=await fetch(API+'?r='+r,opt)}
  catch(e){throw new Error('Tidak bisa terhubung ke server. Pastikan Laragon (Apache dan MySQL) sudah menyala.')}
  let d=null;
  try{d=await res.json()}catch(e){throw new Error('Respons server tidak valid. Buka api/health.php untuk memeriksa pengaturan.')}
  if(res.status===401&&r.indexOf('auth/')!==0&&!/login\.html$/.test(location.pathname)){location.replace('login.html')}
  if(!res.ok||!d||!d.ok){const err=new Error((d&&d.error)||'Terjadi kesalahan.');err.status=res.status;throw err}
  return d;
}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=t=>new Date(t).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
const dt=t=>new Date(t).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

// perkecil gambar di browser sebelum diunggah (foto chat, laporan, lahan, profil)
function resizeImg(file,max,q,cb){
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{
    const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    cb(c.toDataURL('image/jpeg',q))};im.onerror=()=>cb(null);im.src=r.result};
  r.onerror=()=>cb(null);r.readAsDataURL(file);
}

// Memuat data pengguna, lalu menjalankan skrip dashboard satu per satu.
async function startDash(role,scripts){
  try{D=await api('boot')}catch(e){location.replace('login.html');return}
  if(D.me.role!==role){location.replace('login.html');return}
  for(const s of scripts){
    await new Promise(res=>{const e=document.createElement('script');e.src='js/'+s+'.js';e.onload=res;e.onerror=()=>{console.error('Gagal memuat js/'+s+'.js');res()};document.body.appendChild(e)});
  }
}
