import React from 'react';
import { Store, ShieldCheck, Phone, MapPin, Mail, ExternalLink, Heart } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
  onOpenAppBadgeModal: () => void;
}

export function Footer({ navigate, onOpenAppBadgeModal }: FooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950">
                <Store className="h-5 w-5" />
              </div>
              <span className="text-lg font-black text-white">Bebsayik.com</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              বাংলাদেশের মোবাইল ও গ্যাজেট রিটেইলারদের জন্য বিশেষায়িত ক্লাউড ইআরপি ও পিওএস সফটওয়্যার।
              Born from the real-world retail heritage of Kanchan Telecom, Eastern Plaza.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="h-4 w-4" />
              <span>NBR Mushak 6.3 & BTRC Compliant</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/')} className="hover:text-teal-400 transition-colors">
                  Home Landing Page
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/features')} className="hover:text-teal-400 transition-colors">
                  Features & IMEI Lifecycle
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/pricing')} className="hover:text-teal-400 transition-colors">
                  Pricing & ROI Calculator
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-teal-400 transition-colors">
                  Kanchan Telecom Heritage Story
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/register')} className="text-teal-400 font-semibold hover:underline">
                  Free 14-Day Dokan Setup
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Trust & Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/terms')} className="hover:text-teal-400 transition-colors">
                  Merchant Terms of Service (SLA 99.9%)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/privacy')} className="hover:text-teal-400 transition-colors">
                  Privacy Policy & Data Isolation
                </button>
              </li>
              <li>
                <button onClick={onOpenAppBadgeModal} className="hover:text-teal-400 transition-colors">
                  Google Play & iOS Pre-Launch Alert
                </button>
              </li>
              <li>
                <span className="text-slate-500">Double-Entry Financial Guarantee</span>
              </li>
              <li>
                <span className="text-slate-500">100% Exportable Excel/CSV Guarantee</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Dhaka Central Office</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Level 7, Eastern Plaza, Hatirpool, Dhaka-1205, Bangladesh</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Hotline: +880 9638-000111</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-teal-400 shrink-0" />
                <span>support@bebsayik.com</span>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => navigate('/contact')} 
                  className="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Contact & Support Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Bebsayik.com Inc. All rights reserved. Made with pride in Bangladesh.</p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <span>Canonical Subdomain: bebsayik.com</span>
            <span>ERP Subdomain: app.bebsayik.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
