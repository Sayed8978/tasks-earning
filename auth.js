import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, updateProfile, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const $ = id => document.getElementById(id);
const say = (s, bad=false) => { if($("message")) { $("message").textContent=s; $("message").className="message "+(bad?"error":"success"); } };

$("registerForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const name=$("name").value.trim(), email=$("email").value.trim(), password=$("password").value;
  if(password.length<8) return say("পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।",true);
  try {
    const cred=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(cred.user,{displayName:name});
    await sendEmailVerification(cred.user);
    await signOut(auth);
    say("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই করে Login করুন।");
    e.target.reset();
  } catch(err) { say(err.message,true); }
});

$("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const cred=await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
    if(!cred.user.emailVerified) { await signOut(auth); return say("আগে ইমেইল যাচাই করুন।",true); }
    location.href="dashboard.html";
  } catch(err) { say("লগইন হয়নি। ইমেইল ও পাসওয়ার্ড পরীক্ষা করুন।",true); }
});
$("logoutButton")?.addEventListener("click", async()=>{await signOut(auth);location.href="login.html";});
export function protectPage() {
  onAuthStateChanged(auth,user=>{
    if(!user || !user.emailVerified) location.replace("login.html");
  });
}
