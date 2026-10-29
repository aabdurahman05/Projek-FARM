document.documentElement.classList.add('js');
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// navbar
const nav=$('.nav');
const onScroll=()=>nav.classList.toggle('on',scrollY>8);onScroll();addEventListener('scroll',onScroll,{passive:true});
const burger=$('#burger'),menu=$('#menu');
burger.addEventListener('click',()=>{const o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o)});
menu.addEventListener('click',e=>{if(e.target.tagName==='A'){menu.classList.remove('open');burger.setAttribute('aria-expanded',false)}});

// tema terang/gelap (disimpan, dipakai juga di halaman lain)
const dark=()=>document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:dark)').matches);
const ti=()=>$('#tema').textContent=dark()?'\u2600':'\u263E';ti();
$('#tema').addEventListener('click',()=>{
  const n=dark()?'light':'dark';document.documentElement.setAttribute('data-theme',n);
  try{localStorage.setItem('farm_tema',n)}catch(e){}ti();
});

// tab (cara kerja & intip dashboard)
$$('[role=tab][data-g]').forEach(b=>b.addEventListener('click',()=>{
  const g=b.dataset.g;
  $$(`[role=tab][data-g="${g}"]`).forEach(x=>x.setAttribute('aria-selected',x===b));
  $$(`[data-gp="${g}"]`).forEach(p=>p.hidden=p.dataset.p!==b.dataset.t);
}));

// simulasi bagi hasil (harga contoh Rp 8.000.000 per ton, bos tani 40% : petani 60%)
const rp=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
function sim(){
  const ton=+$('#sn').value,modal=(parseFloat($('#sm').value)||0)*1e6;
  $('#snv').textContent=ton+' ton';
  const kotor=ton*8e6,bersih=Math.max(0,kotor-modal);
  $('#r-k').textContent=rp(kotor);$('#r-b').textContent=rp(bersih);
  $('#r-bos').textContent=rp(bersih*.4);$('#r-pet').textContent=rp(bersih*.6);
  $('#r-w').hidden=kotor>modal;
}
$('#sn').addEventListener('input',sim);$('#sm').addEventListener('input',sim);sim();

// muncul saat di-scroll
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  $$('.rv').forEach(el=>io.observe(el));
}else $$('.rv').forEach(el=>el.classList.add('in'));
