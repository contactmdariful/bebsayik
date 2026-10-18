import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Calculator,
  ShieldCheck,
  HelpCircle,
  Clock,
  Layers,
  Coins
} from 'lucide-react';

interface PricingPageProps {
  navigate: (route: string) => void;
}

export function PricingPage({ navigate }: PricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'half_yearly' | 'yearly'>('monthly');

  // Interactive ROI Calculator State
  const [monthlyTurnover, setMonthlyTurnover] = useState(1500000); // ৳15 Lakh
  const [staffCount, setStaffCount] = useState(2);
  const [shrinkageRate, setShrinkageRate] = useState(1.5); // 1.5%
  const [closingHoursPerDay, setClosingHoursPerDay] = useState(2); // 2 hours/day

  // Dynamic ROI calculations
  const shrinkageSavedPerMonth = Math.round((monthlyTurnover * (shrinkageRate / 100)) * 0.7); // 70% shrinkage prevented
  const hoursSavedPerMonth = closingHoursPerDay * 30 * 0.8; // 80% time saved on closing
  const hourlyLaborValue = 150; // ৳150/hr average labor cost
  const laborCostSaved = Math.round(hoursSavedPerMonth * hourlyLaborValue);
  const totalMonthlyBenefit = shrinkageSavedPerMonth + laborCostSaved;
  const goldPlanCost = billingCycle === 'yearly' ? 839 : billingCycle === 'half_yearly' ? 899 : 999;
  const netMonthlyProfit = totalMonthlyBenefit - goldPlanCost;
  const roiPercentage = Math.round((netMonthlyProfit / goldPlanCost) * 100);

  // Pricing calculations
  const getPrice = (base: number) => {
    if (billingCycle === 'yearly') return Math.round(base * 0.84); // 16% off
    if (billingCycle === 'half_yearly') return Math.round(base * 0.90); // 10% off
    return base;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      {/* 1. Header & Tenure Switcher */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>স্বচ্ছ ও সাশ্রয়ী সাবস্ক্রিপশন প্ল্যান</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          আপনার দোকানের জন্য উপযুক্ত প্ল্যান বেছে নিন
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          কোনো গোপন ফি নেই। প্রথম ১৪ দিন সম্পূর্ণ ফ্রি গোল্ড প্ল্যান উপভোগ করুন। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।
        </p>

        {/* Billing Tenure Toggle */}
        <div className="pt-4 flex items-center justify-center">
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 inline-flex items-center space-x-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="tenure-monthly-btn"
            >
              মাসিক (Monthly)
            </button>
            <button
              onClick={() => setBillingCycle('half_yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                billingCycle === 'half_yearly'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="tenure-6m-btn"
            >
              <span>৬ মাস</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                ১০% ছাড়
              </span>
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="tenure-1y-btn"
            >
              <span>১ বছর (বার্ষিক)</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                ১৬% ছাড়
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Silver Plan */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">সিলভার (Silver)</h3>
              <p className="text-xs text-slate-400 mt-1">ছোট দোকান ও স্টার্টার রিটেইলারদের জন্য</p>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white font-mono">৳{getPrice(499)}</span>
              <span className="text-xs text-slate-400">/প্রতি মাস</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
              {[
                '১টি সেলস কাউন্টার পিওএস টার্মিনাল',
                'প্রতি মাসে ১০০টি পর্যন্ত বিক্রয় ইনভয়েস',
                'Dual-IMEI ও বারকোড স্ক্যানিং',
                'প্রাথমিক বাকির খাতা ও কাস্টমার ডিরেক্টরি',
                'ওয়েবইউএসবি থার্মাল প্রিন্ট (৫৮মিমি)',
                'ইমেল ও কমিউনিটি সাপোর্ট'
              ].map((f, i) => (
                <div key={i} className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
            >
              সিলভার বেছে নিন
            </button>
          </div>
        </div>

        {/* Gold Plan (Most Popular / 14-Day Free Trial Default) */}
        <div className="p-8 rounded-3xl bg-gradient-to-b from-teal-950/60 via-slate-900 to-slate-900 border-2 border-teal-500 shadow-2xl shadow-teal-500/10 flex flex-col justify-between relative transform md:-translate-y-2">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
            Most Popular | 14-Day Free Trial
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>গোল্ড (Gold)</span>
                <span className="text-xs text-teal-400 font-bold bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                  জনপ্রিয়
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">মাঝারি ও দ্রুত বর্ধনশীল মোবাইল শপের জন্য আদর্শ</p>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-teal-300 font-mono">৳{getPrice(999)}</span>
              <span className="text-xs text-slate-400">/প্রতি মাস</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-200">
              {[
                '৩টি পর্যন্ত মাল্টি-কাউন্টার পিওএস টার্মিনাল',
                'আনলিমিটেড বিক্রয় ও স্টক ইনভয়েস',
                'কিস্তি (EMI) ক্যালকুলেটর ও জামিনদার খাতা',
                'এমএফএস এজেন্ট ডেস্ক (বিকাশ/নগদ ব্যালেন্স আলাদা)',
                'ব্লাইন্ড ক্যাশ ড্রয়ার ডে-ক্লোজিং ও Z-Report',
                'স্বয়ংক্রিয় এসএমএস রিমাইন্ডার (বাকি ও কিস্তি)',
                '৮০মিমি হাই-স্পিড থার্মাল প্রিন্ট ও লোগো ব্রান্ডিং',
                'হটলাইন ও হোয়াটসঅ্যাপ প্রায়োরিটি সাপোর্ট'
              ].map((f, i) => (
                <div key={i} className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              id="choose-gold-btn"
            >
              <span>১৪ দিনের ফ্রি ট্রায়াল শুরু করুন</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Diamond Plan */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">ডায়মন্ড (Diamond)</h3>
              <p className="text-xs text-slate-400 mt-1">মাল্টি-ব্রাঞ্চ শো-রুম, সার্ভিস ল্যাব ও মেগা শপের জন্য</p>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-white font-mono">৳{getPrice(1999)}</span>
              <span className="text-xs text-slate-400">/প্রতি মাস</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
              {[
                'গোল্ড প্ল্যানের সব ফিচার অন্তর্ভুক্ত',
                'মাল্টি-ব্রাঞ্চ ও সেন্ট্রাল গোডাউন ম্যানেজমেন্ট (STN)',
                'ব্যবহৃত ফোন ক্রয়ে পুলিশ আন্ডারটেকিং ফরম',
                'সার্ভিসিং ও রিপেয়ার ল্যাব (টেকনিশিয়ান ৫০% ভাগ)',
                'এইচআর, বিক্রয় টার্গেট ও কমিশন পে-রোল',
                'ব্যক্তিগত আমানত ও হাওলাত (Strictly Isolated)',
                '২৪/৭ ভিআইপি অ্যাকাউন্ট ম্যানেজার সাপোর্ট'
              ].map((f, i) => (
                <div key={i} className="flex items-center space-x-2.5">
                  <Check className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
            >
              ডায়মন্ড বেছে নিন
            </button>
          </div>
        </div>
      </div>

      {/* 3. Interactive ROI Savings Calculator */}
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-tr from-slate-950 via-slate-900 to-teal-950/40 p-8 sm:p-12 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 mb-1">
              <Calculator className="h-4 w-4" />
              <span>INTERACTIVE ROI SAVINGS CALCULATOR</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Bebsayik ব্যবহারে আপনার মাসিক কত টাকা লাভ হবে?
            </h2>
          </div>
          <div className="text-xs text-slate-400 max-w-sm">
            গবেষণায় দেখা গেছে সঠিক সফটওয়্যার ব্যবহারের মাধ্যমে প্রতিটি মোবাইল দোকানে চুরি ও হিসাবের গরমিল ৭০% পর্যন্ত হ্রাস পায়।
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Sliders Input Area */}
          <div className="lg:col-span-7 space-y-6">
            {/* Turnover Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>দোকানের মাসিক গড় বিক্রয় (টাকা):</span>
                <span className="font-mono text-teal-400 font-bold">৳{monthlyTurnover.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="300000"
                max="5000000"
                step="50000"
                value={monthlyTurnover}
                onChange={(e) => setMonthlyTurnover(Number(e.target.value))}
                className="w-full accent-teal-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>৳৩ লাখ</span>
                <span>৳২৫ লাখ</span>
                <span>৳৫০ লাখ</span>
              </div>
            </div>

            {/* Shrinkage Estimate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>আনুমানিক স্টক গরমিল / ঘাটতির হার (%):</span>
                <span className="font-mono text-amber-400 font-bold">{shrinkageRate}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={shrinkageRate}
                onChange={(e) => setShrinkageRate(Number(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>০.৫% (কম)</span>
                <span>২.৫% (মাঝারি)</span>
                <span>৫.০% (বেশি)</span>
              </div>
            </div>

            {/* Hours spent on Closing Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>প্রতিদিন ক্যাশ ও খাতা মেলাতে ব্যয় হওয়া সময়:</span>
                <span className="font-mono text-teal-400 font-bold">{closingHoursPerDay} ঘণ্টা/দিন</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={closingHoursPerDay}
                onChange={(e) => setClosingHoursPerDay(Number(e.target.value))}
                className="w-full accent-teal-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>১ ঘণ্টা</span>
                <span>২.৫ ঘণ্টা</span>
                <span>৪ ঘণ্টা</span>
              </div>
            </div>
          </div>

          {/* Results Dynamic Card */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-700/80 p-6 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">মাসিক সাশ্রয় ও রিটার্ন</span>
              
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">স্টক ঘাটতি ও চুরি রোধ:</span>
                  <span className="text-white font-mono font-bold">৳{shrinkageSavedPerMonth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">হিসাব-নিকাশের শ্রম সাশ্রয় ({Math.round(hoursSavedPerMonth)} ঘণ্টা):</span>
                  <span className="text-white font-mono font-bold">৳{laborCostSaved.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Bebsayik গোল্ড খরচ:</span>
                  <span className="text-rose-400 font-mono font-bold">-৳{goldPlanCost}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700 space-y-1">
                <div className="text-[11px] text-teal-400 font-bold uppercase tracking-wider">নেট অতিরিক্ত মাসিক মুনাফা:</div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  +৳{netMonthlyProfit.toLocaleString()} <span className="text-xs text-slate-400 font-sans">/মাস</span>
                </div>
                <div className="text-xs text-slate-400 pt-1">
                  আনুমানিক রিটার্ন অন ইনভেস্টমেন্ট:{' '}
                  <span className="font-bold text-teal-300 font-mono">{roiPercentage.toLocaleString()}% ROI</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              id="roi-claim-trial-btn"
            >
              <span>এই লাভ নিশ্চিত করতে ফ্রি ট্রায়াল নিন</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
