(function(){
const F={nama:'a-nama',email:'a-email',hp:'a-hp',alamat:'a-alamat',pengalaman:'a-peng'};
function fill(){
  document.querySelectorAll('.nm').forEach(e=>e.textContent=D.me.nama);
  const m=D.me;
  $('ava').innerHTML=m.foto?`<img alt="Foto profil" src="${esc(m.foto)}">`:`<span>${esc((m.nama.trim()[0]||'A').toUpperCase())}</span>`;
}
function fillForm(){Object.keys(F).forEach(k=>{if($(F[k]))$(F[k]).value=D.me[k]||''})}
if(ROLE==='bos')$('a-peng').closest('div').hidden=true;
fillForm();fill();onData(fill);

const tabs=[...document.querySelectorAll('.stabs button')];
tabs.forEach(b=>b.addEventListener('click',()=>tabs.forEach(x=>{const on=x===b;x.setAttribute('aria-selected',on);$('s-'+x.dataset.s).hidden=!on})));

// profil
$('ubahfoto').addEventListener('click',()=>$('foto').click());
$('foto').addEventListener('change',e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>8*1024*1024)return toast('Ukuran foto maksimal 8 MB');
  resizeImg(f,240,.8,async d=>{if(!d)return toast('Gagal membaca foto');
    if(await aksi(()=>api('profil/foto',{foto:d}))){await refresh();toast('Foto profil diperbarui')}});
});
$('simpanprofil').addEventListener('click',async()=>{
  const body={nama:$('a-nama').value.trim(),hp:$('a-hp').value.trim(),alamat:$('a-alamat').value.trim(),pengalaman:ROLE==='petani'?$('a-peng').value.trim():''};
  if(!body.nama)return toast('Nama lengkap wajib diisi');
  if(await aksi(()=>api('profil/update',body))){await refresh();fillForm();toast('Profil berhasil disimpan')}
});

// keamanan
$('simpansandi').addEventListener('click',async()=>{
  const a=$('k-lama').value,b=$('k-baru').value,c=$('k-ulang').value;
  if(!a)return toast('Masukkan kata sandi saat ini');
  if(b.length<8)return toast('Kata sandi baru minimal 8 karakter');
  if(b!==c)return toast('Kata sandi baru tidak sama');
  if(await aksi(()=>api('profil/sandi',{lama:a,baru:b}))){['k-lama','k-baru','k-ulang'].forEach(i=>$(i).value='');toast('Kata sandi berhasil diperbarui')}
});
$('hapus').addEventListener('click',async()=>{
  const pw=$('k-hapuspw').value;
  if(!pw)return toast('Masukkan kata sandi untuk konfirmasi');
  if(!(await confirmBox('Hapus akun?','Akun dan seluruh datamu akan dihapus dan tidak bisa dikembalikan.','Ya, hapus akun',true)))return;
  if(await aksi(()=>api('profil/hapus',{password:pw})))location.href='index.html';
});

// notifikasi (tersimpan di database dan dipakai server saat membuat notifikasi)
document.querySelectorAll('.sw input[data-n]').forEach(i=>{
  i.checked=D.prefs[i.dataset.n]!==false;
  i.addEventListener('change',async()=>{
    if(await aksi(()=>api('profil/notif',{jenis:i.dataset.n,aktif:i.checked}))){toast('Pengaturan notifikasi disimpan')}else i.checked=!i.checked;
  });
});

// tampilan (disimpan di browser)
let tema='auto';try{tema=localStorage.getItem('farm_tema')||'auto'}catch(e){}
document.querySelectorAll('input[name="tema"]').forEach(r=>{
  r.checked=r.value===tema;
  r.addEventListener('change',()=>{
    try{localStorage.setItem('farm_tema',r.value)}catch(e){}
    r.value==='auto'?document.documentElement.removeAttribute('data-theme'):document.documentElement.setAttribute('data-theme',r.value);
    toast('Tema diubah');
  });
});
})();
