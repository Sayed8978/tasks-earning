import { auth, db, functions } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, limit }
 from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

const call=(n,d)=>(httpsCallable(functions,n)(d)).then(x=>x.data);
onAuthStateChanged(auth,async user=>{
 if(!user || !user.emailVerified){location.replace("../login.html");return;}
 const token=await user.getIdTokenResult(true);
 if(token.claims.admin!==true){document.body.textContent="অ্যাক্সেস নেই।";return;}
 const list=document.getElementById("withdrawals");
 if(list) onSnapshot(query(collection(db,"withdrawals"),orderBy("createdAt","desc"),limit(100)),s=>{
   list.innerHTML="";
   s.forEach(d=>{
     const x=d.data(), box=document.createElement("article");box.className="task";
     const p=document.createElement("p");p.textContent=`${d.id} | ${x.points} পয়েন্ট | ${x.method} | ${x.number} | ${x.status}`;
     box.append(p);
     if(x.status==="pending") ["approved","rejected"].forEach(dec=>{
       const b=document.createElement("button");b.textContent=dec==="approved"?"Approve":"Reject";
       b.onclick=async()=>{b.disabled=true;try{await call("adminReviewWithdrawal",{withdrawalId:d.id,decision:dec});}catch(e){alert(e.message);} };
       box.append(b);
     });
     list.append(box);
   });
 });
 const form=document.getElementById("taskForm");
 form?.addEventListener("submit",async e=>{
  e.preventDefault();
  try{
   const options=document.getElementById("options").value.split("|").map(x=>x.trim()).filter(Boolean);
   await call("adminSetTask",{taskId:document.getElementById("taskId").value,title:document.getElementById("title").value,
    question:document.getElementById("question").value,options,correctAnswer:document.getElementById("answer").value,
    rewardPoints:Number(document.getElementById("reward").value),active:true});
   alert("টাস্ক সংরক্ষিত হয়েছে।");
  }catch(err){alert(err.message);}
 });
});
