import React, { useState } from 'react';
import {
  ScanBarcode,
  Coins,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle,
  Clock,
  FileCheck,
  AlertTriangle,
  Smartphone,
  Layers,
  Sparkles,
  Search,
  Check
} from 'lucide-react';

interface FeaturesPageProps {
  navigate: (route: string) => void;
}

export function FeaturesPage({ navigate }: FeaturesPageProps) {
  const [activeTab, setActiveTab] = useState<'imei' | 'kisti' | 'buyback' | 'mfs'>('imei');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ডিপ-ডাইভ ফিচার স্পেসিফিকেশন</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          মোবাইল ব্যবসার প্রতিটি জটিল ধাপ এখন সহজ
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          সাধারণ অ্যাকাউন্টিং সফটওয়্যার মোবাইল শপের আইএমইআই, কিস্তি ও ব্যবহৃত ফোনের আইনি প্রক্রিয়া সামলাতে পারে না। Bebsayik তৈরি হয়েছে এসব সমস্যার বাস্তব সমাধান দিতে।
        </p>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-3xl mx-auto">
        {[
          { id: 'imei', label: 'Dual-IMEI লাইফসাইকেল', icon: ScanBarcode },
          { id: 'kisti', label: 'কিস্তি (EMI) ইঞ্জিন', icon: Coins },
          { id: 'buyback', label: 'পুলিশ আন্ডারটেকিং', icon: ShieldCheck },
          { id: 'mfs', label: 'এমএফএস এজেন্ট ডেস্ক', icon: Zap }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl">
        {activeTab === 'imei' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-lg border border-teal-800/50">
                <ScanBarcode className="h-4 w-4" />
                <span>Feature 01 — Dual-IMEI & Serial Registry</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                প্রতিটি ফোনের নিখুঁত ট্র্যাকিং: পারচেজ থেকে ওয়ারেন্টি
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ডুয়াল সিমের স্মার্টফোনে ১৫ ডিজিটের দুটি আলাদা আইএমইআই থাকে। Bebsayik আন্তর্জাতিক Luhn অ্যালগরিদমের মাধ্যমে ইনভয়েসে ভুল আইএমইআই এন্ট্রি সম্পূর্ণ প্রতিরোধ করে।
              </p>

              <div className="space-y-3">
                {[
                  '১৫-ডিজিট Luhn অ্যালগরিদম চেকসাম ভ্যালিডেশন',
                  'গুদাম (Godown) থেকে কাউন্টারে ট্রান্সফার নোট (STN) অনুমোদন',
                  '৬০ দিনের বেশি অবিক্রিত ফোনের ডেড-স্টক এলার্ট ও এইজিং অ্যানালিটিক্স',
                  'ব্র্যান্ড ওয়ারেন্টি (RMA) ক্লেইম ও সার্ভিস সেন্টারে পাঠানোর ট্র্যাকিং',
                  'নির্দিষ্ট আইএমইআই ভিত্তিক আসল ক্রয়মূল্য (Specific Identification COGS)'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-teal-500/20"
                >
                  <span>ফ্রি ট্রায়ালে ট্রাই করুন</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Visual IMEI Lifecycle Box */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
              <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-800 flex justify-between">
                <span>IMEI LIFECYCLE SIMULATION</span>
                <span className="text-emerald-400">ACTIVE TRACKING</span>
              </div>

              <div className="space-y-2">
                {[
                  { step: '01. GRN Received', detail: 'PO #402 -> 20 Units Checked In', time: '10:15 AM' },
                  { step: '02. Godown Storage', detail: 'IMEI: 356938035643803', time: '10:20 AM' },
                  { step: '03. STN Dispatch', detail: 'Sent to Showroom Counter 01', time: '02:00 PM' },
                  { step: '04. POS Sold', detail: 'Sold with ৳42,500 Inv #INV-0042', time: '05:40 PM' }
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{s.step}</div>
                      <div className="text-[11px] text-teal-400">{s.detail}</div>
                    </div>
                    <span className="text-[10px] text-slate-500">{s.time}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] font-sans">
                ✓ কোনো ফোনের সিরিয়াল ভুল হওয়ার সুযোগ নেই; অডিট ট্রেইল সম্পূর্ণ সংরক্ষিত।
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kisti' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-lg border border-teal-800/50">
                <Coins className="h-4 w-4" />
                <span>Feature 02 — Kisti (EMI) Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                কিস্তিতে মোবাইল বিক্রি করুন শতভাগ সুরক্ষায়
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ডাউন পেমেন্ট, মাসিক কিস্তির তারিখ এবং দুই জামিনদারের জাতীয় পরিচয়পত্র সংরক্ষণের মাধ্যমে নিশ্চিত করুন সময়মতো টাকা আদায়।
              </p>

              <div className="space-y-3">
                {[
                  'স্বয়ংক্রিয় কিস্তির সময়সূচি (Milestone Schedule) জেনারেশন',
                  '২ জন জামিনদারের এনআইডি ও মোবাইল নম্বর বাধ্যতামূলক ভ্যালিডেশন',
                  'নির্ধারিত তারিখের ২ দিন আগে গ্রাহকের মোবাইলে অটো এসএমএস অ্যালার্ট',
                  'আংশিক কিস্তি গ্রহণ ও বাকি টাকার সঠিক সমন্বয়',
                  'আগে পরিশোধ করলে রিবেট (Rebate) প্রদান ও ক্লিয়ারেন্স সার্টিফিকেট'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-teal-500/20"
                >
                  <span>কিস্তি ইঞ্জিন শুরু করুন</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Visual Kisti Schedule Card */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-white font-bold">KISTI CONTRACT: KST-202610-002</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>হ্যান্ডসেট মূল্য:</span>
                  <span className="text-white">৳36,000</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ডাউন পেমেন্ট গ্রহণ:</span>
                  <span className="text-emerald-400 font-bold">৳12,000 (Paid)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>বাকি কিস্তি:</span>
                  <span className="text-amber-400">৳24,000 (৬ কিস্তি @ ৳4,000)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-sans font-bold">জামিনদারদের তথ্য:</div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  ১. মো: রহিম (NID: 1985269123456 | 01711002233)
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  ২. মো: করিম (NID: 1991269654321 | 01822334455)
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buyback' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-lg border border-teal-800/50">
                <ShieldCheck className="h-4 w-4" />
                <span>Feature 03 — Police Buyback Undertaking</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                আইনি ঝুঁকিমুক্ত ব্যবহৃত ও সেকেন্ড হ্যান্ড ফোন কেনা
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                চোরাই ফোন কেনার দায় থেকে আপনার দোকানকে সুরক্ষিত রাখুন। বিক্রেতার লাইভ ছবি, এনআইডি এবং লিখিত পুলিশ প্রত্যয়ন ফরম ১-ক্লিকে সংরক্ষণ করুন।
              </p>

              <div className="space-y-3">
                {[
                  'ল্যাপটপ বা ওয়েবক্যামের মাধ্যমে বিক্রেতার লাইভ ছবি ক্যাপচার',
                  'জাতীয় পরিচয়পত্র (NID) আপলোড ও বায়োমেট্রিক তথ্য সংরক্ষণ',
                  'বাংলাদেশ পুলিশের ফরম্যাট অনুযায়ী প্রত্যয়ন চুক্তিপত্র অটো-প্রিন্ট',
                  'ফোনের শারীরিক অবস্থা ও ত্রুটি চেকলিস্ট যাচাই',
                  'পরবর্তীতে বিক্রি করার সময় আলাদা ইনভেন্টরি ট্যাগিং'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-teal-500/20"
                >
                  <span>পুলিশ সুরক্ষা ট্রাই করুন</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Visual Police Undertaking Form */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-sans text-xs">
              <div className="text-center border-b border-slate-800 pb-2">
                <div className="font-bold text-white text-sm">ব্যবহৃত মোবাইল ফোন ক্রয় ও অঙ্গীকারনামা</div>
                <div className="text-[10px] text-slate-400">Under Bangladesh Police Undertaking Guideline</div>
              </div>

              <div className="space-y-2 text-slate-300 text-[11px]">
                <p>
                  আমি <span className="font-bold text-teal-300">কামাল উদ্দিন</span>, এই মর্মে প্রত্যয়ন করছি যে <span className="font-bold text-teal-300">iPhone 13 (IMEI: 359123456789012)</span> হ্যান্ডসেটটি আমার নিজের এবং বৈধ মালিকানাধীন।
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px]">
                    <span className="text-slate-400 block">NID NO:</span>
                    <span className="font-mono font-bold text-white">4192837461928</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px]">
                    <span className="text-slate-400 block">WEBCAM PHOTO:</span>
                    <span className="text-emerald-400 font-bold">✓ Verified Biometric</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-center text-[10px] text-slate-400">
                আইনশৃঙ্খলা রক্ষাকারী বাহিনীর তদন্তে তাৎক্ষণিক প্রদর্শনের উপযুক্ত প্রিন্টআউট ফাইল।
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mfs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3 py-1 rounded-lg border border-teal-800/50">
                <Zap className="h-4 w-4" />
                <span>Feature 04 — MFS Agent Float Desk</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                ক্যাশ ড্রয়ার ও এমএফএস এজেন্টের আলাদা ব্যালেন্স
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                মোবাইল দোকানের সাধারণ ভুল হলো ড্রয়ারের ক্যাশ আর বিকাশ/নগদ এজেন্ট সিমের টাকা একসাথে মিলিয়ে ফেলা। Bebsayik এ দুটি হিসাব সম্পূর্ণ পৃথক রাখে।
              </p>

              <div className="space-y-3">
                {[
                  'ড্রয়ারের ক্যাশ টাকা এবং বিকাশ/নগদ/রকেট এজেন্ট সিমের ফ্লোট শতভাগ আইসোলেটেড',
                  'সন্ধ্যায় USSD কোড ডায়াল করে সিমের ব্যালেন্স অডিট ও ব্যবধান ট্র্যাকিং',
                  'ক্যাশ-ইন ও ক্যাশ-আউটে অটো কমিশন হিসাব (+৳৪.১০ প্রতি হাজারে)',
                  'গ্রাহকের বিল বিকাশে ক্যাশ-আউট নিলে ড্রয়ারের ক্যাশে কোনো হাত পড়বে না',
                  'দিন শেষে আলাদা এমএফএস ব্যালেন্স রিপোর্ট ও প্রফিট লেজার'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-teal-500/20"
                >
                  <span>এমএফএস ডেস্ক শুরু করুন</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Visual MFS Ledger Box */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-white font-bold">MFS FLOAT SUMMARY</span>
                <span className="text-teal-400">USSD BALANCED</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-pink-400 font-bold">bKash Agent SIM:</span>
                  <span className="text-white font-bold">৳84,250.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-bold">Nagad Uddokta SIM:</span>
                  <span className="text-white font-bold">৳42,100.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-purple-400 font-bold">Rocket Agent Float:</span>
                  <span className="text-white font-bold">৳18,500.00</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                <span>আজকের মোট অর্জিত কমিশন:</span>
                <span>+৳542.80</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
