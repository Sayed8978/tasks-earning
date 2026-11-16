const $=id=>document.getElementById(id);let points=0,checkinDay="",quizDay="",history=[];
const today=()=>new Date().toLocaleDateString('en-CA');
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function balance(){ $('points').textContent=points.toLocaleString();$('taka').textContent=(points/100).toFixed(2)}
function log(title,note){history.unshift({title,note});$('history').innerHTML='';history.forEach(x=>{let p=document.createElement('p');p.textContent=x.title+' — '+x.note;$('history').append(p)})}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();$('displayName').textContent=$('name').value.trim();$('login').classList.add('hidden');$('app').classList.remove('hidden');toast('ডেমো শুরু হয়েছে')});
$('logout').onclick=()=>{points=0;checkinDay='';quizDay='';history=[];balance();$('history').textContent='এখনো কোনো কার্যক্রম নেই।';$('app').classList.add('hidden');$('login').classList.remove('hidden')};
$('theme').onclick=()=>document.body.classList.toggle('light');
document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{if(b.dataset.task==='checkin'){if(checkinDay===today())return toast('আজকের চেক-ইন হয়ে গেছে');checkinDay=today();points+=25;balance();log('দৈনিক চেক-ইন','+২৫ পয়েন্ট');toast('২৫ ডেমো পয়েন্ট যোগ হয়েছে')}else{if(quizDay===today())return toast('আজকের কুইজ হয়ে গেছে');$('quiz').showModal()}});
$('quizForm').onsubmit=e=>{e.preventDefault();if(new FormData(e.target).get('answer')!=='ঢাকা')return toast('উত্তর সঠিক নয়');quizDay=today();points+=50;balance();log('কুইজ সম্পন্ন','+৫০ পয়েন্ট');$('quiz').close();e.target.reset();toast('৫০ ডেমো পয়েন্ট যোগ হয়েছে')};
$('withdraw').onclick=()=>{if(points<10000)return toast('উইথড্রের জন্য ১০,০০০ পয়েন্ট লাগবে');$('withdrawDialog').showModal()};
$('withdrawForm').onsubmit=e=>{e.preventDefault();if(!/^[0-9+ -]{10,20}$/.test($('wallet').value.trim()))return toast('নম্বর পরীক্ষা করুন');$('withdrawDialog').close();e.target.reset();log('ডেমো উইথড্র','Pending — কোনো টাকা পাঠানো হয়নি');toast('ডেমো অনুরোধ তৈরি হয়েছে')};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());balance();