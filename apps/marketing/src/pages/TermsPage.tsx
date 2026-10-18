import React from 'react';
import { ShieldCheck, FileText } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-400 bg-teal-950/80 px-3 py-1 rounded-lg border border-teal-800">
          <FileText className="h-4 w-4" />
          <span>Legal Merchant Agreement</span>
        </div>
        <h1 className="text-3xl font-black text-white">ব্যবহারের শর্তাবলি (Terms of Service)</h1>
        <p className="text-xs text-slate-400">সর্বশেষ আপডেট: অক্টোবর ২০২৬ | কার্যকর: Bebsayik.com SaaS মার্চেন্টদের জন্য</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">১. সাবস্ক্রিপশন ও ১৪ দিনের ট্রায়াল</h2>
          <p>
            Bebsayik.com নতুন নিবন্ধিত প্রতি দোকানদারকে ১৪ দিনের ফ্রি গোল্ড ট্রায়াল প্রদান করে। ট্রায়াল শেষে ব্যবহারকারীকে নির্ধারিত সাবস্ক্রিপশন ফি পরিশোধ করতে হবে। ফি পরিশোধ না করলে দোকানটি অটোমেটিক গ্রেস পিরিয়ড এবং রিড-অনলি মোডে স্থানান্তরিত হবে, কিন্তু কোনো ডেটা মুছে ফেলা হবে না।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">২. সেবার প্রাপ্যতা ও আপটাইম গ্যারান্টি (৯৯.৯% SLA)</h2>
          <p>
            Bebsayik.com প্রতি মাসে ৯৯.৯% ক্লাউড সার্ভার আপটাইম প্রদানের প্রতিশ্রুতি দেয়। শিডিউল মেইনটেন্যান্স সংক্রান্ত তথ্য কমপক্ষে ২৪ ঘণ্টা পূর্বে ড্যাশবোর্ড নোটিফিকেশনের মাধ্যমে জানানো হবে।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">৩. মার্চেন্ট ডেটার মালিকানা ও এক্সপোর্ট গ্যারান্টি</h2>
          <p>
            দোকানের সমস্ত ইনভেন্টরি, কাস্টমার, বাকি ও সেলস লেজারের শতভাগ মালিকানা সংশ্লিষ্ট দোকানদারের। সাবস্ক্রিপশন সক্রিয় বা মেয়াদোত্তীর্ণ উভয় অবস্থায়ই দোকানদার তার সম্পূর্ণ ডেটা Excel/CSV ফরম্যাটে সম্পূর্ণ বিনামূল্যে ডাউনলোড বা এক্সপোর্ট করার অধিকার রাখেন।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">৪. পুলিশ প্রত্যয়ন ও আইনি সম্মতি</h2>
          <p>
            ব্যবহৃত ফোন ক্রয়ে পুলিশ আন্ডারটেকিং ফরমটি বাংলাদেশ পুলিশের প্রচলিত নির্দেশিকা মোতাবেক প্রস্তুত করা হয়েছে। মার্চেন্টকে সংশ্লিষ্ট স্থানীয় থানার নির্দেশনা অনুযায়ী নথি সংরক্ষণ করতে হবে।
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">৫. রিফান্ড ও ক্যান্সেল পলিসি</h2>
          <p>
            মাসিক বা বাৎসরিক সাবস্ক্রিপশন যে কোনো সময় বাতিল করা যাবে। কোনো অতিরিক্ত হিডেন চার্জ বা বাতিলের ফি নেই।
          </p>
        </section>
      </div>
    </div>
  );
}
