/*
নিজের নিরাপদ কম্পিউটারে চালান:
1) Firebase Console > Project settings > Service accounts > Generate new private key
2) JSON ফাইলটি project folder-এর বাইরে নিরাপদে রাখুন; কখনো public/ বা GitHub-এ নয়।
3) PowerShell:
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\service-account.json"
   $env:ADMIN_UID="Firebase Authentication-এর user UID"
   node scripts/set-admin.js
*/
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
initializeApp({credential:applicationDefault()});
(async()=>{
 const uid=process.env.ADMIN_UID;
 if(!uid) throw new Error("ADMIN_UID environment variable দিন");
 await getAuth().setCustomUserClaims(uid,{admin:true});
 console.log("Admin claim set. আবার login করে ID token refresh করুন.");
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
