// Chat teks dan foto lewat server. Percakapan diperbarui otomatis setiap beberapa detik.
const Chat=(()=>{
  let cur=null,pimg=null,contacts=[],lastKey='',tick=0;
  async function loadContacts(){try{contacts=(await api('chat/contacts')).contacts;list()}catch(e){}}
  function list(){
    $('cl').innerHTML=contacts.length?contacts.map(c=>`<button class="ci${cur&&cur.id===c.id?' on':''}" data-id="${c.id}" type="button">${avatar(c.foto,c.nama,'s')}<span><b>${esc(c.nama)}</b><small>${c.last?esc(c.last.isi||'Foto'):esc(c.sub)}</small></span>${c.unread?`<em class="ub">${c.unread}</em>`:''}</button>`).join(''):'<p class="note" style="padding:12px">Belum ada kontak.</p>';
  }
  function head(){$('cav').innerHTML=cur?avatar(cur.foto,cur.nama,'s'):'';$('cname').textContent=cur?cur.nama:'Pilih percakapan'}
  function msgs(m,force){
    const key=m.length?m[m.length-1].id+':'+m.length:'0';
    if(key===lastKey&&!force)return;lastKey=key;
    const box=$('cm'),near=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    box.innerHTML=m.length?m.map(x=>{const nm=x.saya?D.me.nama:cur.nama,fo=x.saya?D.me.foto:cur.foto;
      return `<div class="mrow${x.saya?' me':''}">${avatar(fo,nm,'xs')}<div class="mb${x.saya?' me':''}">${x.foto?`<img src="${esc(x.foto)}" alt="Foto" data-big>`:''}${x.isi?`<p>${esc(x.isi)}</p>`:''}<small>${hm(x.t)}</small></div></div>`}).join(''):'<p class="note" style="text-align:center">Belum ada pesan. Sapa dulu!</p>';
    if(near||force)box.scrollTop=box.scrollHeight;
  }
  async function loadThread(force){
    if(!cur)return;
    try{const d=await api('chat/thread&with='+cur.id);
      if(d.with&&d.with.id===cur.id&&(d.with.foto||null)!==(cur.foto||null)){cur.foto=d.with.foto;head();force=true}
      msgs(d.messages,force)}catch(e){}
  }
  function open(c){cur={id:c.id,nama:c.nama,foto:c.foto||null};lastKey='';head();$('chatbox').classList.add('open');$('cc').hidden=false;loadThread(true).then(loadContacts)}
  function openWith(c){go('chat');open(c)}
  function clearPrev(){pimg=null;$('cprev').hidden=true;$('cfile').value=''}
  async function send(){
    if(!cur)return toast('Pilih kontak dulu');
    const isi=$('ctext').value.trim();if(!isi&&!pimg)return;
    try{await api('chat/kirim',{to:cur.id,isi,foto:pimg})}catch(e){return toast(e.message)}
    $('ctext').value='';clearPrev();await loadThread(true);loadContacts();
  }
  $('cl').addEventListener('click',e=>{const b=e.target.closest('.ci');if(!b)return;const c=contacts.find(x=>String(x.id)===b.dataset.id);if(c)open(c)});
  $('csend').addEventListener('click',send);
  $('ctext').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send()}});
  $('cfb').addEventListener('click',()=>$('cfile').click());
  $('cfile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;
    resizeImg(f,720,.75,d=>{if(!d)return toast('Gagal membaca foto');pimg=d;$('cpimg').src=d;$('cprev').hidden=false})});
  $('cpx').addEventListener('click',clearPrev);
  $('cback').addEventListener('click',()=>$('chatbox').classList.remove('open'));
  $('cm').addEventListener('click',e=>{if(e.target.matches('img[data-big]'))sheet('Foto','<img src="'+esc(e.target.src)+'" alt="Foto" style="max-width:100%;border-radius:8px">')});
  document.querySelector('.nav[data-v="chat"]').addEventListener('click',loadContacts);
  setInterval(()=>{if($('v-chat').hidden||document.hidden)return;loadThread(false);if(++tick%4===0)loadContacts()},3000);
  return{openWith};
})();
