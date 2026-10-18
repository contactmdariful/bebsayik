import React from 'react';
import { Store, Heart, ShieldCheck, MapPin, Award, Users, ArrowRight } from 'lucide-react';

interface AboutPageProps {
  navigate: (route: string) => void;
}

export function AboutPage({ navigate }: AboutPageProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-semibold">
          <Store className="h-3.5 w-3.5" />
          <span>আমাদের ঐতিহ্য ও পরিচিতি</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          কাঞ্চন টেলিকম থেকে Bebsayik: আমাদের গল্প
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          কোনো এসি রুমের অনুমান নয়, ঢাকার ইস্টার্ন প্লাজার মোবাইল দোকানের বাস্তব রক্ত-ঘামের অভিজ্ঞতা থেকে তৈরি।
        </p>
      </div>

      {/* Story Content Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
            <span>২০১৮ সাল: ইস্টার্ন প্লাজার সেই কঠিন রাতগুলো</span>
          </h2>
          <p>
            ২০১৮ সালে ঢাকার হাতিরপুলের ইস্টার্ন প্লাজা মার্কেটে কাঞ্চন টেলিকমের যাত্রা শুরু। ক্রেতাদের উপচে পড়া ভিড়, শত শত স্মার্টফোনের বাক্সে শোরুম ভরা। কিন্তু প্রতি রাত ১০টায় শোরুম বন্ধ করার সময় শুরু হতো আসল দুঃস্বপ্ন।
          </p>
          <p>
            কাগজের খাতার বাকির হিসাব মিলতো না, কোন ফোনের আইএমইআই কোন গ্রাহকের কাছে বিক্রি হয়েছে তা খুঁজে পেতে ঘণ্টার পর ঘণ্টা সময় নষ্ট হতো। ড্রয়ারের ক্যাশ টাকা আর বিকাশ-নগদ এজেন্ট সিমের টাকার মধ্যে তালগোল পাকিয়ে যেত। সবচেয়ে বড় ভয় ছিল—কাউন্টার থেকে কোনো হ্যান্ডসেট চুরি বা খোয়া গেল কিনা তা বের করা ছিল অসম্ভব।
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-teal-300">
            আমরা উপলব্ধি করলাম: সাধারণ সফটওয়্যার মোবাইল শপের জন্য নয়
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            বাজারের প্রচলিত অ্যাকাউন্টিং সফটওয়্যারগুলো মুদি দোকান বা ওষুধের জন্য ঠিক হতে পারে, কিন্তু মোবাইল শপের ১৫-ডিজিট ডুয়াল আইএমইআই, ওয়ারেন্টি ক্লেইম, কিস্তির জামিনদার এবং সেকেন্ড হ্যান্ড ফোন কেনার ক্ষেত্রে পুলিশ ভেরিফিকেশনের কোনো সমাধান সেখানে ছিল না।
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
            <span>Bebsayik.com এর জন্ম ও রূপান্তর</span>
          </h2>
          <p>
            সেই বাস্তব সমস্যা দূর করতে আমরা কোডিং শুরু করি। লক্ষ্য ছিল একটাই: এমন একটি সিস্টেম তৈরি করা যা বাংলাদেশের প্রতিটি মোবাইল ও গ্যাজেট দোকানি নিজের ভাইয়ের মতো সহজে চালাতে পারবে। যেখানে কোনো অ্যাকাউন্টিং ভুল হবে না, ডাবল-এন্ট্রি ব্যালেন্স শিট নিজে নিজেই মিলবে এবং প্রতি রাতে মাত্র ২ মিনিটে ক্যাশ ড্রয়ার রিকনসাইল করা যাবে।
          </p>
          <p>
            আজ কাঞ্চন টেলিকমের সেই মডেল রূপ নিয়েছে <strong className="text-white">Bebsayik.com</strong> এ। যা আজ বাংলাদেশের ৬৪ জেলার ৮৫,০০০ এর বেশি মোবাইল শপের ডিজিটাল রূপান্তরের অঙ্গীকার নিয়ে কাজ করছে।
          </p>
        </div>

        {/* Pillars / Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
            <Award className="h-6 w-6 text-teal-400 mx-auto" />
            <div className="font-bold text-white text-xs">খাঁটি রিটেইল অভিজ্ঞতা</div>
            <div className="text-[11px] text-slate-400">বাস্তব শপ পরিচালনার অভিজ্ঞতায় সমৃদ্ধ</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
            <ShieldCheck className="h-6 w-6 text-teal-400 mx-auto" />
            <div className="font-bold text-white text-xs">আইনি ও আর্থিক সুরক্ষা</div>
            <div className="text-[11px] text-slate-400">পুলিশ প্রত্যয়ন ও মূসক ৬.৩ চালান প্রস্তুত</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
            <Users className="h-6 w-6 text-teal-400 mx-auto" />
            <div className="font-bold text-white text-xs">দেশজুড়ে রিটেইলার কমিউনিটি</div>
            <div className="text-[11px] text-slate-400">সবসময় পাশে থাকা বাংলা সাপোর্ট টিম</div>
          </div>
        </div>

        <div className="pt-6 text-center">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20 transition-all"
          >
            <span>আমাদের সাথে আপনার দোকান ডিজিটাল করুন</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
