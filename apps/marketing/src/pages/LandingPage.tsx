import React, { useState } from 'react';
import {
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Receipt,
  ScanBarcode,
  Users,
  Coins,
  FileText,
  Lock,
  Printer,
  ChevronRight,
  TrendingUp,
  Star,
  Layers,
  Award
} from 'lucide-react';

interface LandingPageProps {
  navigate: (route: string) => void;
  onOpenAppBadgeModal: (platform?: 'android' | 'ios' | 'general') => void;
}

export function LandingPage({ navigate, onOpenAppBadgeModal }: LandingPageProps) {
  // Interactive POS Simulator State
  const [posImei, setPosImei] = useState('356938035643803');
  const [cashAmount, setCashAmount] = useState('20000');
  const [mfsAmount, setMfsAmount] = useState('22500');
  const [isReceiptPrinted, setIsReceiptPrinted] = useState(false);

  const totalBill = 42500;
  const tenderTotal = (Number(cashAmount) || 0) + (Number(mfsAmount) || 0);
  const changeDue = tenderTotal > totalBill ? tenderTotal - totalBill : 0;

  return (
    <div className="space-y-24 py-8">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>বাংলাদেশি মোবাইল ও গ্যাজেট শপের জন্য তৈরি প্রথম ক্লাউড ইআরপি</span>
            <span className="hidden sm:inline bg-teal-800/80 px-2 py-0.5 rounded text-[10px] text-teal-200">v2.0.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
            দোকানের হিসাব, স্টক ও কিস্তি—{' '}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
              সব এক স্মার্ট সফটওয়্যারে
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Dual-IMEI লাইফসাইকেল ট্র্যাকিং, কিস্তি (EMI) ক্যালকুলেটর, ব্যবহৃত ফোন কেনায় পুলিশ আন্ডারটেকিং এবং এমএফএস এজেন্ট ব্যালেন্স—কাগজের খাতার ঝামেলা ছাড়া নিশ্চিন্তে দোকান চালান।
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-base shadow-xl shadow-teal-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
              id="hero-start-trial-btn"
            >
              <span>১৪ দিনের ফ্রি ট্রায়াল শুরু করুন</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('pos-simulator-preview');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2"
              id="hero-watch-demo-btn"
            >
              <Zap className="h-4 w-4 text-teal-400" />
              <span>লাইভ পিওএস ডেমো দেখুন</span>
            </button>
          </div>

          {/* App Store Download Badges (TC-43) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="text-xs text-slate-400 font-medium">মোবাইল অ্যাপ ডাউনলোড করুন:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onOpenAppBadgeModal('android')}
                className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-teal-500 hover:bg-slate-800 text-left transition-all group"
                id="google-play-badge"
              >
                <Smartphone className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">GET IT ON</div>
                  <div className="text-xs font-bold text-white leading-none">Google Play</div>
                </div>
              </button>

              <button
                onClick={() => onOpenAppBadgeModal('ios')}
                className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-teal-500 hover:bg-slate-800 text-left transition-all group"
                id="app-store-badge"
              >
                <AppleLogo className="h-6 w-6 text-slate-200 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Download on the</div>
                  <div className="text-xs font-bold text-white leading-none">App Store</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive POS Simulator Showcase */}
      <section id="pos-simulator-preview" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Interactive Live Simulator</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                সাব-সেকেন্ড বারকোড/আইএমইআই স্ক্যান ও স্প্লিট পেমেন্ট
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              <span className="text-teal-400">Terminal:</span>
              <span>SHOWROOM-01 (Eastern Plaza)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Left Column: POS Item & Split Payment Controls */}
            <div className="lg:col-span-7 space-y-4">
              {/* Product Card */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      Handset Smartphone
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">Samsung Galaxy A55 5G (8GB / 128GB)</h4>
                    <p className="text-xs text-slate-400">Color: Awesome Iceblue | Brand: Samsung</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400">৳42,500</span>
                    <span className="block text-[10px] text-slate-400">VAT (Mushak 6.3) Incl.</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                  <ScanBarcode className="h-4 w-4 text-teal-400 shrink-0" />
                  <span className="text-slate-400">IMEI-1:</span>
                  <input
                    type="text"
                    value={posImei}
                    onChange={(e) => setPosImei(e.target.value)}
                    className="bg-transparent font-bold text-teal-300 focus:outline-none w-full"
                  />
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    Luhn OK
                  </span>
                </div>
              </div>

              {/* Split Tender Controls */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>স্প্লিট পেমেন্ট বণ্টন (Split Tender)</span>
                  <span className="text-slate-400 font-mono">Bill: ৳{totalBill.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">নগদ ক্যাশ (৳)</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">বিকাশ ক্যাশ-আউট (৳)</label>
                    <input
                      type="number"
                      value={mfsAmount}
                      onChange={(e) => setMfsAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/60 font-mono">
                  <span className="text-slate-400">Total Tendered:</span>
                  <span className={tenderTotal >= totalBill ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    ৳{tenderTotal.toLocaleString()}
                  </span>
                </div>

                {changeDue > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/60 font-mono">
                    <span>গ্রাহককে ফেরত দিন (Change Due):</span>
                    <span className="font-bold">৳{changeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsReceiptPrinted(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2"
                  id="simulator-checkout-btn"
                >
                  <Printer className="h-4 w-4" />
                  <span>চেকআউট ও রসিদ প্রিন্ট করুন</span>
                </button>
                <button
                  onClick={() => {
                    setCashAmount('20000');
                    setMfsAmount('22500');
                    setIsReceiptPrinted(false);
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  রিসেট
                </button>
              </div>
            </div>

            {/* Right Column: Thermal Receipt Preview (80mm) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner font-mono text-[11px] text-slate-300 space-y-2">
                <div className="text-center border-b border-dashed border-slate-700 pb-2">
                  <div className="font-bold text-white text-sm">সিটি গ্যাজেট & টেলিকম</div>
                  <div className="text-[10px] text-slate-400">শপ #৪২, লেভেল ২, ইস্টার্ন প্লাজা, ঢাকা</div>
                  <div className="text-[9px] text-slate-400">BIN: 001234567-0101 | চালান (মূসক ৬.৩)</div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>INVOICE: INV-202610-0042</span>
                  <span>{new Date().toLocaleDateString('en-GB')}</span>
                </div>

                <div className="border-b border-dashed border-slate-700 py-1.5 space-y-1">
                  <div className="flex justify-between text-white font-semibold">
                    <span>Samsung Galaxy A55 5G (8/128)</span>
                    <span>৳42,500</span>
                  </div>
                  <div className="text-[9px] text-teal-400">IMEI: {posImei}</div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>সাব-টোটাল (Subtotal):</span>
                    <span>৳42,500</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>নগদ গ্রহণ (Cash Tendered):</span>
                    <span>৳{Number(cashAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>বিকাশ গ্রহণ (bKash Tendered):</span>
                    <span>৳{Number(mfsAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1">
                    <span>পরিশোধিত (Paid Total):</span>
                    <span>৳{tenderTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-700 pt-2 text-center text-[9px] text-slate-400 space-y-0.5">
                  <div>৭ দিনের রিপ্লেসমেন্ট পলিসি প্রযোজ্য।</div>
                  <div>ধন্যবাদ! আবার আসবেন। Powered by Bebsayik.com</div>
                </div>

                {isReceiptPrinted && (
                  <div className="mt-3 p-2 rounded bg-emerald-950/60 border border-emerald-800 text-center text-emerald-300 text-[10px] font-sans font-semibold animate-fade-in">
                    ✓ WebUSB 80mm ESC/POS কমান্ড সফলভাবে ক্যাশ ড্রয়ার ও প্রিন্টারে পাঠানো হয়েছে!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 6 Core Pillars Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">Built For Mobile dokans</h2>
          <p className="text-2xl sm:text-4xl font-black text-white">
            সাধারণ ইআরপি নয়, বিশেষায়িত মোবাইল রিটেইল সলিউশন
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: ScanBarcode,
              title: 'Dual-IMEI লাইফসাইকেল ট্র্যাকিং',
              desc: '১৫ ডিজিট Luhn অ্যালগরিদম ভ্যালিডেশন, গুদাম থেকে শোরুম ট্রান্সফার (STN), এবং ৬০ দিনের বেশি অবিক্রিত হ্যান্ডসেটের ডেড-স্টক এলার্ট।'
            },
            {
              icon: Coins,
              title: 'কিস্তি (EMI) ক্যালকুলেটর ইঞ্জিন',
              desc: 'ডাউন পেমেন্ট, দুই জামিনদারের এনআইডি ও ফোন নম্বর যাচাই, স্বয়ংক্রিয় মাসিক কিস্তির শিডিউল এবং এসএমএস রিমাইন্ডার।'
            },
            {
              icon: ShieldCheck,
              title: 'ব্যবহৃত ফোন ক্রয়ে পুলিশ আন্ডারটেকিং',
              desc: 'সেকেন্ড হ্যান্ড ফোন কেনার সময় গ্রাহকের ওয়েবক্যাম ছবি ও বায়োমেট্রিক তথ্য সংরক্ষণ এবং ১-ক্লিকে পুলিশ প্রত্যয়ন ফরম প্রিন্ট।'
            },
            {
              icon: Zap,
              title: 'এমএফএস এজেন্ট ডেস্ক (bKash/Nagad)',
              desc: 'দোকানের ক্যাশ ড্রয়ার থেকে এজেন্ট সিমের ব্যালেন্স সম্পূর্ণ আলাদা রাখা। ক্যাশ-ইন ও ক্যাশ-আউটের সঠিক কমিশন খাতা।'
            },
            {
              icon: Lock,
              title: 'ব্লাইন্ড ক্যাশ ড্রয়ার ডে-ক্লোজিং',
              desc: 'দিন শেষে ক্যাশিয়ারের নোট গণনা (Blind Count)। প্রত্যাশিত বনাম বাস্তব ক্যাশের গরমিল থাকলে মালিককে তাৎক্ষণিক এসএমএস এলার্ট।'
            },
            {
              icon: Layers,
              title: '১০০% আইসোলেটেড ক্লাউড সিকিউরিটি',
              desc: 'এক দোকানের ডেটা অন্য দোকানের দেখার কোনো সুযোগ নেই। ডাবল-এন্ট্রি ব্যালেন্স শিট এবং অফলাইনেও এক্সেসরিজ বিক্রির নিশ্চয়তা।'
            }
          ].map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/60 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 mb-4 group-hover:scale-110 transition-transform">
                <pillar.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Retailer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">Merchant Trust</h2>
            <p className="text-2xl sm:text-3xl font-black text-white">
              বাংলাদেশের শীর্ষ মোবাইল ব্যবসায়ীরা যা বলছেন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'ইস্টার্ন প্লাজায় আমাদের ৫টি কাউন্টারে আগে রাত ১০টায় ক্যাশ ড্রয়ার মিলাতে ১ ঘণ্টা লাগতো। এখন মাত্র ৩ মিনিটে ব্লাইন্ড কাউন্টে হিসাব মিলে যায়।',
                owner: 'মোহাম্মদ কাঞ্চন',
                shop: 'কাঞ্চন টেলিকম, ইস্টার্ন প্লাজা, ঢাকা'
              },
              {
                quote: 'কিস্তির এসএমএস স্বয়ংক্রিয়ভাবে গ্রাহকের কাছে যাওয়ার পর আমাদের বাকি আদায় প্রায় ৪০% বেড়ে গেছে। হিসাবের গরমিল শূন্য শতাংশ।',
                owner: 'তানভীর হাসান',
                shop: 'সিটি গ্যাজেট, মতিঝিল, ঢাকা'
              },
              {
                quote: 'সেকেন্ড হ্যান্ড ফোন কেনার পর পুলিশ ভেরিফিকেশন ফরম প্রিন্ট করে রাখাটা আমাদের বিশাল মানসিক শান্তি ও পুলিশি ঝামেলা থেকে সুরক্ষা দিয়েছে।',
                owner: 'মোহাম্মদ ফারুক',
                shop: 'চিটাগাং মোবাইল মার্ট, জিইসি মোড়, চট্টগ্রাম'
              }
            ].map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex space-x-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic mb-4">"{t.quote}"</p>
                </div>
                <div className="border-t border-slate-800/80 pt-3">
                  <div className="text-xs font-bold text-white">{t.owner}</div>
                  <div className="text-[11px] text-teal-400">{t.shop}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Trust Metrics & Stats Counters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { value: '৮৫,০০০+', label: 'টার্গেট দোকান বাংলাদেশে' },
            { value: '৳১.২ কোটি+', label: 'ম্যানেজড জিএমভি' },
            { value: '৯৯.৯৮%', label: 'ক্লাউড আপটাইম এসএলএ' },
            { value: '০.০০%', label: 'ডাবল-এন্ট্রি গরমিল' }
          ].map((stat, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Call To Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-3xl bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-950/60 border border-teal-500/30 p-8 sm:p-12 text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
            আপনার মোবাইল দোকানের পূর্ণ নিয়ন্ত্রণ নিন আজই
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto mb-8">
            কোনো ক্রেডিট কার্ড প্রয়োজন নেই। মাত্র ১ মিনিটে দোকান সেটআপ করুন এবং ১৪ দিন সম্পূর্ণ বিনামূল্যে গোল্ড প্ল্যানের সব ফিচার ব্যবহার করুন।
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center space-x-2"
              id="cta-free-trial-btn"
            >
              <span>১৪ দিনের ফ্রি ট্রায়াল শুরু করুন</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs"
            >
              প্ল্যান ও মূল্য তালিকা দেখুন
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.7 1 .08 2.02-.51 2.58-1.19z" />
    </svg>
  );
}
