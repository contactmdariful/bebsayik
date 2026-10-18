import React, { useState } from 'react';
import { MapPin, Phone, Mail, MessageSquare, Send, CheckCircle2, Clock } from 'lucide-react';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', dokan: '', message: '' });
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-5xl font-black text-white">যোগাযোগ ও কাস্টমার সাপোর্ট</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          যেকোনো প্রশ্ন, অনবোর্ডিং সহায়তা বা ডেমোর জন্য আমাদের হটলাইনে ফোন দিন অথবা অফিসে চলে আসুন।
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">প্রধান কার্যালয় (Dhaka HQ)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              লেভেল ৭, ইস্টার্ন প্লাজা শপিং কমপ্লেক্স, হাতিরপুল, ঢাকা-১২০৫, বাংলাদেশ।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">হটলাইন ও হোয়াটসঅ্যাপ</h3>
            <p className="text-xs text-slate-300">
              হটলাইন: <span className="font-mono font-bold text-teal-400">+880 9638-000111</span> (সকাল ৯টা - রাত ১০টা)
            </p>
            <p className="text-xs text-slate-300">
              হোয়াটসঅ্যাপ সাপোর্ট: <span className="font-mono font-bold text-emerald-400">+880 1711-223344</span>
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">ইমেল ও অনলাইন সাপোর্ট</h3>
            <p className="text-xs text-slate-400">
              সাপোর্ট ও বিলিং: support@bebsayik.com
            </p>
            <p className="text-xs text-slate-400">
              বিজনেস পার্টনারশিপ: partners@bebsayik.com
            </p>
          </div>
        </div>

        {/* Contact Submission Form */}
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
          {isSent ? (
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">আপনার বার্তা সফলভাবে গৃহীত হয়েছে!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                আমাদের কাস্টমার সাকসেস টিম দ্রুত আপনার সাথে যোগাযোগ করবে। ধন্যবাদ।
              </p>
              <button
                onClick={() => {
                  setIsSent(false);
                  setFormData({ name: '', phone: '', dokan: '', message: '' });
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                আরেকটি বার্তা পাঠান
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">সরাসরি মেসেজ পাঠান</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">আপনার নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: সুমন"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">দোকানের নাম ও ঠিকানা</label>
                <input
                  type="text"
                  placeholder="যেমন: মোবাইল গ্যালারি, নিউ মার্কেট"
                  value={formData.dokan}
                  onChange={(e) => setFormData({ ...formData, dokan: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">আপনার বার্তা বা প্রশ্ন</label>
                <textarea
                  rows={3}
                  placeholder="আপনার যে কোনো প্রশ্ন লিখুন..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-500/20"
              >
                <Send className="h-4 w-4" />
                <span>বার্তা পাঠান</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
