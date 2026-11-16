# TaskEarn — নিরাপদ ডেমো PWA

এটি Firebase-ভিত্তিক একটি পরীক্ষামূলক rewards-app starter। এটি নিজে থেকে বাস্তব টাকা পাঠায় না।
বাস্তব bKash/Nagad পেমেন্ট, বিজ্ঞাপন নেটওয়ার্ক বা offerwall চালুর আগে সংশ্লিষ্ট provider-এর
অনুমোদন, আইনগত যাচাই, প্রাপ্তবয়স্ক দায়িত্বশীল পরিচালনা এবং server-to-server verification লাগবে।

## দরকারি সফটওয়্যার
- Node.js 20 বা নতুন
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project

## ১) Firebase প্রস্তুতি
1. Firebase Console-এ project তৈরি করুন।
2. Authentication > Sign-in method > Email/Password চালু করুন।
3. Firestore Database তৈরি করুন।
4. App Check চালু করুন। প্রথমে reCAPTCHA Enterprise provider ব্যবহার করে web app register করুন।
   Enforcement চালুর আগে metrics পরীক্ষা করুন।
5. Functions deploy করতে Blaze plan লাগতে পারে; Google Cloud billing alert/budget সেট করুন।
6. Project Settings > Your apps > Web app থেকে Firebase config নিন।

## ২) কনফিগারেশন
`public/js/firebase-config.js`-এ নিজের Firebase web config বসান।
` .firebaserc`-এর `YOUR_FIREBASE_PROJECT_ID` বদলে project ID দিন।

## ৩) লোকাল পরীক্ষা
```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase emulators:start
```
Emulator না ব্যবহার করলে:
```bash
firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
```

## ৪) অ্যাডমিন সেট করা
প্রথম অ্যাডমিনের জন্য project owner-কে নিজের কম্পিউটারে Firebase Admin SDK ব্যবহার করে
custom claim সেট করতে হবে। `scripts/set-admin.js`-এর নির্দেশনা দেখুন।
Service-account JSON কখনো public folder, GitHub বা hosting-এ দেবেন না।

## ৫) গুরুত্বপূর্ণ সীমা
- পয়েন্ট যোগ/কাটা Cloud Functions-এর মাধ্যমে।
- Quiz উত্তর সার্ভারে যাচাই হয়।
- Daily check-in server timestamp ও transaction দিয়ে একবার/দিন সীমাবদ্ধ।
- বিজ্ঞাপন task ইচ্ছাকৃতভাবে বন্ধ: কেবল provider-এর server callback/S2S verification যোগ করার পর চালু করা যাবে।
- Withdrawal শুধু request record তৈরি করে; payment transfer করে না। Admin approve/reject কেবল status/ledger update।
- ১০০ পয়েন্ট = ১ টাকা; সর্বনিম্ন ১০,০০০ পয়েন্ট।
- এটি production financial system নয়। বাস্তব অর্থ লেনদেনের আগে security review, abuse testing, provider approval ও আইনগত পরামর্শ নিন।
