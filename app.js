import { auth, db, functions } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { doc, onSnapshot, collection, query, where, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

const $=id=>document.getElementById(id);
const msg=(s,bad=false)=>{if($("message")){$("message").textContent=s;$("message").className=bad?"error":"success";}};
export const call=async(name,data={})=> (await httpsCallable(functions,name)(data)).data;

onAuthStateChanged(auth,user=>{
  if(!user || !user.emailVerified){location.replace("login.html");return;}
  $("userName") && ($("userName").textContent=user.displayName||"ব্যবহারকারী");
  $("logoutButton")?.addEventListener("click",()=>signOut(auth).then(()=>location.replace("login.html")));
  onSnapshot(doc(db,"users",user.uid),snap=>{
    const points=snap.exists()?Number(snap.data().points||0):0;
    if($("points")) $("points").textContent=points.toLocaleString("en-US");
    if($("taka")) $("taka").textContent=(points/100).toFixed(2);
  });
  if($("checkinButton")) $("checkinButton").onclick=async()=>{
    $("checkinButton").disabled=true;
    try { const r=await call("dailyCheckin");msg(`${r.pointsAdded} পয়েন্ট যোগ হয়েছে।`); }
    catch(e){msg(e.message,true);}
    finally{$("checkinButton").disabled=false;}
  };
  if($("withdrawForm")) $("withdrawForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      const r=await call("requestWithdrawal",{points:Number($("withdrawPoints").value),method:$("method").value,number:$("number").value});
      msg("রিকোয়েস্ট জমা হয়েছে: "+r.requestId);e.target.reset();
    }catch(err){msg(err.message,true);}
  };
  if($("taskList")) loadTasks();
  if($("withdrawalList")) loadWithdrawals(user.uid);
});

async function loadTasks(){
  const list=$("taskList");
  onSnapshot(query(collection(db,"tasks"),where("active","==",true)),snap=>{
    list.innerHTML="";
    snap.forEach(d=>{
      const t=d.data();
      if(t.type!=="quiz") return;
      const el=document.createElement("article");el.className="task";
      const h=document.createElement("h3");h.textContent=t.title;
      const p=document.createElement("p");p.textContent=t.question;
      const form=document.createElement("form");
      const select=document.createElement("select");select.required=true;
      select.innerHTML='<option value="">উত্তর নির্বাচন করুন</option>';
      (t.options||[]).forEach(o=>{const op=document.createElement("option");op.value=o;op.textContent=o;select.append(op);});
      const btn=document.createElement("button");btn.textContent="উত্তর জমা দিন";
      form.append(select,btn);
      form.onsubmit=async e=>{e.preventDefault();btn.disabled=true;try{const r=await call("submitQuiz",{taskId:d.id,answer:select.value});msg(`${r.pointsAdded} পয়েন্ট পেয়েছেন।`);}catch(err){msg(err.message,true);}finally{btn.disabled=false;}};
      el.append(h,p,form);list.append(el);
    });
    if(!list.children.length) list.textContent="এখন কোনো কুইজ টাস্ক নেই।";
  });
}
function loadWithdrawals(uid){
  onSnapshot(query(collection(db,"withdrawals"),where("uid","==",uid),orderBy("createdAt","desc"),limit(20)),snap=>{
    const el=$("withdrawalList");el.innerHTML="";
    snap.forEach(d=>{const x=d.data();const p=document.createElement("p");p.textContent=`${x.points} পয়েন্ট · ${x.method} · ${x.status}`;el.append(p);});
  });
}
