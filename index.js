const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const POINTS_PER_TAKA = 100;
const MIN_WITHDRAW_POINTS = 10000;

function requireUser(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "লগইন করতে হবে।");
  if (req.auth.token.blocked === true) throw new HttpsError("permission-denied", "অ্যাকাউন্ট স্থগিত।");
  return req.auth.uid;
}
function requireAdmin(req) {
  const uid = requireUser(req);
  if (req.auth.token.admin !== true) throw new HttpsError("permission-denied", "শুধু অ্যাডমিনের জন্য।");
  return uid;
}
function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Dhaka", year:"numeric", month:"2-digit", day:"2-digit"}).format(date);
}
function cleanString(v, max=100) {
  return typeof v === "string" ? v.trim().slice(0,max) : "";
}

exports.dailyCheckin = onCall({region:REGION, enforceAppCheck:true}, async (req) => {
  const uid = requireUser(req);
  const today = dayKey();
  const userRef = db.doc(`users/${uid}`);
  const claimRef = db.doc(`taskClaims/${uid}_daily_${today}`);
  return db.runTransaction(async tx => {
    const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);
    if (claimSnap.exists) throw new HttpsError("already-exists", "আজকের চেক-ইন হয়ে গেছে।");
    const current = userSnap.exists ? Number(userSnap.data().points || 0) : 0;
    const reward = 50;
    tx.set(userRef, {
      uid, email: req.auth.token.email || null,
      displayName: req.auth.token.name || "User",
      points: current + reward,
      updatedAt: FieldValue.serverTimestamp()
    }, {merge:true});
    tx.create(claimRef, {uid, taskId:"daily-checkin", day:today, points:reward, claimedAt:FieldValue.serverTimestamp()});
    tx.create(db.collection("ledger").doc(), {uid, type:"task_reward", points:reward, reference:claimRef.id, createdAt:FieldValue.serverTimestamp()});
    return {ok:true, pointsAdded:reward, balance:current+reward};
  });
});

exports.submitQuiz = onCall({region:REGION, enforceAppCheck:true}, async (req) => {
  const uid = requireUser(req);
  const taskId = cleanString(req.data?.taskId, 80);
  const answer = cleanString(req.data?.answer, 80);
  if (!taskId || !answer) throw new HttpsError("invalid-argument", "উত্তর দিন।");
  const taskRef = db.doc(`tasks/${taskId}`);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists || taskSnap.data().active !== true || taskSnap.data().type !== "quiz")
    throw new HttpsError("not-found", "টাস্কটি চালু নেই।");
  const task = taskSnap.data();
  if (answer.toLowerCase() !== String(task.correctAnswer).toLowerCase())
    throw new HttpsError("failed-precondition", "উত্তর সঠিক হয়নি।");
  const today = dayKey();
  const claimRef = db.doc(`taskClaims/${uid}_${taskId}_${today}`);
  const userRef = db.doc(`users/${uid}`);
  return db.runTransaction(async tx => {
    const [claimSnap,userSnap] = await Promise.all([tx.get(claimRef),tx.get(userRef)]);
    if (claimSnap.exists) throw new HttpsError("already-exists", "আজ এই টাস্ক করা হয়েছে।");
    const current = userSnap.exists ? Number(userSnap.data().points || 0) : 0;
    const reward = Math.max(1, Math.min(500, Number(task.rewardPoints || 0)));
    tx.set(userRef,{uid, email:req.auth.token.email || null, displayName:req.auth.token.name || "User",
      points:current+reward, updatedAt:FieldValue.serverTimestamp()},{merge:true});
    tx.create(claimRef,{uid,taskId,day:today,points:reward,claimedAt:FieldValue.serverTimestamp()});
    tx.create(db.collection("ledger").doc(),{uid,type:"task_reward",points:reward,reference:claimRef.id,createdAt:FieldValue.serverTimestamp()});
    return {ok:true,pointsAdded:reward,balance:current+reward};
  });
});

exports.requestWithdrawal = onCall({region:REGION, enforceAppCheck:true}, async req => {
  const uid = requireUser(req);
  const points = Math.floor(Number(req.data?.points));
  const method = cleanString(req.data?.method, 10);
  const number = cleanString(req.data?.number, 30);
  if (!Number.isFinite(points) || points < MIN_WITHDRAW_POINTS || points % 100 !== 0)
    throw new HttpsError("invalid-argument", "সর্বনিম্ন ১০,০০০ পয়েন্ট এবং ১০০-এর গুণিতক দিতে হবে।");
  if (!["bKash","Nagad"].includes(method) || !/^[0-9+ -]{10,20}$/.test(number))
    throw new HttpsError("invalid-argument", "পেমেন্ট মাধ্যম বা নম্বর সঠিক নয়।");
  const userRef = db.doc(`users/${uid}`);
  const withdrawalRef = db.collection("withdrawals").doc();
  await db.runTransaction(async tx => {
    const snap = await tx.get(userRef);
    const balance = snap.exists ? Number(snap.data().points || 0) : 0;
    if (balance < points) throw new HttpsError("failed-precondition", "পর্যাপ্ত পয়েন্ট নেই।");
    tx.update(userRef,{points:balance-points,updatedAt:FieldValue.serverTimestamp()});
    tx.create(withdrawalRef,{uid,points,amountTaka:points/POINTS_PER_TAKA,method,number,status:"pending",createdAt:FieldValue.serverTimestamp()});
    tx.create(db.collection("ledger").doc(),{uid,type:"withdrawal_hold",points:-points,reference:withdrawalRef.id,createdAt:FieldValue.serverTimestamp()});
  });
  return {ok:true,requestId:withdrawalRef.id,status:"pending"};
});

exports.adminReviewWithdrawal = onCall({region:REGION, enforceAppCheck:true}, async req => {
  requireAdmin(req);
  const id = cleanString(req.data?.withdrawalId, 100);
  const decision = cleanString(req.data?.decision, 20);
  const note = cleanString(req.data?.note, 300);
  if (!id || !["approved","rejected"].includes(decision)) throw new HttpsError("invalid-argument","অনুরোধ সঠিক নয়।");
  const ref = db.doc(`withdrawals/${id}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().status !== "pending") throw new HttpsError("failed-precondition","অনুরোধটি আর Pending নেই।");
    const w = snap.data();
    tx.update(ref,{status:decision,adminNote:note,reviewedAt:FieldValue.serverTimestamp()});
    if (decision === "rejected") {
      const userRef = db.doc(`users/${w.uid}`);
      const userSnap = await tx.get(userRef);
      const balance = userSnap.exists ? Number(userSnap.data().points || 0) : 0;
      tx.set(userRef,{points:balance+Number(w.points),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.create(db.collection("ledger").doc(),{uid:w.uid,type:"withdrawal_refund",points:Number(w.points),reference:id,createdAt:FieldValue.serverTimestamp()});
    }
  });
  return {ok:true,status:decision};
});

exports.adminSetTask = onCall({region:REGION,enforceAppCheck:true}, async req => {
  requireAdmin(req);
  const taskId = cleanString(req.data?.taskId,80);
  const title = cleanString(req.data?.title,100);
  const question = cleanString(req.data?.question,500);
  const options = Array.isArray(req.data?.options) ? req.data.options.slice(0,4).map(x=>cleanString(x,100)) : [];
  const correctAnswer = cleanString(req.data?.correctAnswer,80);
  const rewardPoints = Math.floor(Number(req.data?.rewardPoints));
  const active = req.data?.active === true;
  if (!taskId || !title || !question || !options.length || !options.includes(correctAnswer) ||
      !Number.isFinite(rewardPoints) || rewardPoints<1 || rewardPoints>500)
    throw new HttpsError("invalid-argument","টাস্কের তথ্য যাচাই করুন।");
  await db.doc(`tasks/${taskId}`).set({type:"quiz",title,question,options,correctAnswer,rewardPoints,active,updatedAt:FieldValue.serverTimestamp()});
  return {ok:true};
});

exports.adminSetBlocked = onCall({region:REGION,enforceAppCheck:true}, async req => {
  requireAdmin(req);
  const uid = cleanString(req.data?.uid,128);
  const blocked = req.data?.blocked === true;
  if (!uid) throw new HttpsError("invalid-argument","ইউজার আইডি দিন।");
  await getAuth().setCustomUserClaims(uid,{blocked});
  return {ok:true};
});

// Ad task intentionally has no client-side reward endpoint.
// Add only after an approved ad/offerwall provider's signed S2S callback is implemented.
