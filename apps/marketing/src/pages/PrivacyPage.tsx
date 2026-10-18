import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/80 px-3 py-1 rounded-lg border border-teal-800">
          <Lock className="h-4 w-4" />
          <span>Security & Data Isolation</span>
        </div>
        <h1 className="text-3xl font-black text-white">গোপনীয়তা নীতিমালা (Privacy Policy)</h1>
        <p className="text-xs text-slate-400">সর্বশেষ আপডেট: অক্টোবর ২০২৬ | ডাটা সুরক্ষা ও এনক্রিপশন নির্দেশিকা</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">১. মাল্টি-টেন্যান্ট ডেটা আইসোলেশন ও এনক্রিপশন</h2>
          <p>
            Bebsayik.com এ প্রতিটি দোকানের ডেটা ডাটাবেজ লেভেলে সম্পূর্ণ আলাদা (Row-Level Security & Tenant Isolation)। এক দোকানের মালিক বা ক্যাশিয়ারের পক্ষে কোনো অবস্থাতেই অন্য দোকানের ইনভেন্টরি, খাতার হিসাব বা বিক্রির তথ্য দেখা সম্ভব নয়।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">২. তৃতীয় পক্ষের কাছে ডেটা বিক্রি নিষিদ্ধ</h2>
          <p>
            আমরা কোনো তৃতীয় পক্ষ, বিজ্ঞাপনী সংস্থা বা প্রতিযোগীর কাছে আপনার দোকানের গ্রাহকদের ফোন নম্বর, বাকি বা কেনাবেচার তথ্য বিক্রি বা শেয়ার করি না এবং ভবিষ্যতেও কখনো করব না।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">৩. এসএমএস স্ক্র্যাপিং নিষিদ্ধকরণ (গুগল প্লে পলিসি শতভাগ মান্য)</h2>
          <p>
            আমাদের কোনো মোবাইল অ্যাপ বা ওয়েব সিস্টেমে ডিভাইসের ব্যক্তিগত এসএমএস রিড বা স্ক্র্যাপ করার পারমিশন নেই। ওটিপি ভেরিফিকেশন আন্তর্জাতিক সিকিউর পদ্ধতিতে সম্পন্ন হয়।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">৪. জাতীয় রাজস্ব বোর্ড (এনবিআর) ও মূসক চালান</h2>
          <p>
            এনবিআরের মূসক ৬.৩ চালান নির্দেশিকা অনুযায়ী ইনভয়েস প্রস্তুত হয়। সমস্ত ডেটা ব্যাংক-গ্রেড SSL/TLS প্রটোকলে নিরাপদে এনক্রিপ্টেড থাকে।
          </p>
        </section>
      </div>
    </div>
  );
}
