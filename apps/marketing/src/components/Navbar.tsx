import React from 'react';
import { Store, ShieldCheck, ArrowRight, Smartphone, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenAppBadgeModal: () => void;
}

export function Navbar({ currentRoute, navigate, onOpenAppBadgeModal }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-3 cursor-pointer group"
          id="nav-logo"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Store className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-black tracking-tight text-white">Bebsayik</span>
              <span className="text-xs font-bold text-teal-400 bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-800/60">.com</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">মোবাইল শপ ম্যানেজমেন্ট সফটওয়্যার</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-semibold">
          {[
            { id: '/', label: 'Home' },
            { id: '/features', label: 'Features' },
            { id: '/pricing', label: 'Pricing & ROI' },
            { id: '/about', label: 'Our Story (Heritage)' },
            { id: '/contact', label: 'Contact' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                currentRoute === item.id
                  ? 'text-teal-400 bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAppBadgeModal}
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
            id="nav-app-badge-btn"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            <span>Mobile App</span>
          </button>

          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            id="nav-trial-cta-btn"
          >
            <Sparkles className="h-4 w-4" />
            <span>14-Day Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
          </button>
        </div>
      </div>
    </header>
  );
}
