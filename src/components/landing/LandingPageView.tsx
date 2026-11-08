import React, { useState } from 'react';
import {
  Shield,
  Users,
  Building,
  Flame,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  BarChart3,
  Lock,
  HeartHandshake,
  Globe,
  Award,
  Sparkles,
  ChevronRight,
  HelpCircle,
  FileCheck,
  Layers,
  ChevronDown,
  UserCheck,
} from 'lucide-react';

interface LandingPageViewProps {
  onOpenAuth: (mode?: 'select' | 'tutor' | 'admin', tutorTab?: 'signup' | 'login') => void;
  onNavigateToLandingA?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ 
  onOpenAuth,
  onNavigateToLandingA,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How do new Cell Leaders (Tutors) create their accounts?',
      a: 'New tutors simply select "Tutor / Cell Leader" and choose "Sign Up". You only provide your Full Name, Cell Name, and Password. No personal email address, phone number, or administrative pre-approval is required. Your cell and leader profile are registered instantly.',
    },
    {
      q: 'What is the weekly reporting submission deadline?',
      a: 'Every weekly cell meeting report must be submitted by Sunday at exactly 6:00 PM Ghana Time (Africa/Accra / UTC+0). Reports submitted after this cutoff are automatically flagged as late submissions in the administrative audit log.',
    },
    {
      q: 'How does an Administrator access the platform?',
      a: 'Ministry leadership accesses the platform via the "Administrator Access" option using the secure administrative credentials. On first-time login, the system enforces an immediate, mandatory password change to invalidate the initial setup key and protect church governance data.',
    },
    {
      q: 'Can cell leaders view other cells\' reports or personal information?',
      a: 'No. Strict role isolation ensures tutors can only access, view, and report on their own assigned cell, its members, evangelism contacts, and follow-ups. Cross-cell consolidation is exclusively reserved for authorised church leadership.',
    },
    {
      q: 'Can reports and evangelism contacts be logged offline or on mobile devices?',
      a: 'Yes. FNI CELLS CONNECT is fully responsive across smartphones, tablets, laptops, and desktop computers, allowing cell leaders to record evangelism contacts immediately following outreaches or during cell meetings.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#182230] font-sans antialiased selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
      {/* ============================================================ */}
      {/* 1. TOP ANNOUNCEMENT BAR                                      */}
      {/* ============================================================ */}
      <div className="bg-[#142B4A] text-white py-2 px-4 text-xs font-medium border-b border-[#203D63]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6A45A] text-[#142B4A]">
              OFFICIAL PLATFORM
            </span>
            <span className="text-slate-200">
              Forerunners Network International &bull; Advancing the Great Commission Through Cell Fellowship
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#E9D9B2]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
              Weekly Reporting Deadline: <strong className="text-white">Sunday 6:00 PM (GMT)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN NAVIGATION HEADER                                    */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E3E8EF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#E3E8EF] shadow-xs bg-[#142B4A] flex items-center justify-center shrink-0">
              <img
                src="/fni-official-logo.jpg"
                alt="Forerunners Network International Official Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback in case of missing asset
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#142B4A]">
                  FNI CELLS CONNECT
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F7FA] border border-[#E3E8EF] text-[#667085]">
                  PORTAL
                </span>
              </div>
              <p className="text-xs text-[#667085] italic font-medium hidden md:block">
                Connecting cells. Strengthening fellowship. Advancing the mission.
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#182230]">
            <a href="#overview" className="hover:text-[#142B4A] transition-colors">Overview</a>
            <a href="#pillars" className="hover:text-[#142B4A] transition-colors">Core Pillars</a>
            <a href="#weekly-cycle" className="hover:text-[#142B4A] transition-colors">Reporting Cycle</a>
            <a href="#portals" className="hover:text-[#142B4A] transition-colors">Portal Access</a>
            <a href="#faq" className="hover:text-[#142B4A] transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {onNavigateToLandingA && (
              <button
                onClick={onNavigateToLandingA}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-navy-950 transition-colors"
                title="Switch to Minimal Landing Page"
              >
                &larr; Minimal View
              </button>
            )}
            <button
              onClick={() => onOpenAuth('admin')}
              className="px-3.5 py-2 text-xs font-bold text-[#142B4A] hover:bg-[#F5F7FA] border border-[#E3E8EF] rounded-xl transition-all"
            >
              Administrator
            </button>
            <button
              onClick={() => onOpenAuth('tutor', 'signup')}
              className="px-4 py-2 text-xs font-bold bg-[#142B4A] hover:bg-[#203D63] text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Cell Leader Portal</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3. HERO SECTION                                              */}
      {/* ============================================================ */}
      <section id="overview" className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-[#F5F7FA] via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Messaging & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142B4A]/5 border border-[#142B4A]/10 text-[#142B4A] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#C6A45A] animate-pulse"></span>
                <span>Forerunners Network International</span>
                <span className="text-[#C6A45A]">&bull;</span>
                <span className="text-[#667085] font-semibold">Centralised Cell Infrastructure</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#142B4A] tracking-tight leading-[1.15]">
                Connecting Cells.{' '}
                <span className="text-[#142B4A] block sm:inline">Strengthening Fellowship.</span>{' '}
                <span className="text-[#C6A45A] block">Advancing The Mission.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[#667085] leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                FNI CELLS CONNECT is the official digital cell management, documentation, and reporting platform for Forerunners Network International. Built to empower cell tutors, streamline weekly reporting, cultivate disciples, and deliver executive ministry intelligence with institutional excellence.
              </p>

              {/* Dual Action CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <button
                  onClick={() => onOpenAuth('tutor', 'signup')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Register or Access Cell</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => onOpenAuth('admin')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-[#F5F7FA] text-[#142B4A] border-2 border-[#E3E8EF] hover:border-[#142B4A] font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 text-[#C6A45A]" />
                  <span>Administrator Sign In</span>
                </button>
              </div>

              {/* Key Trust Signals */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#E3E8EF] max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#142B4A]">100%</div>
                  <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Accountability</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#142B4A]">Sun 6PM</div>
                  <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Ghana Cutoff</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#142B4A]">Strict</div>
                  <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Role Privacy</div>
                </div>
              </div>
            </div>

            {/* Right Column: Platform Preview Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-2xl bg-white border border-[#E3E8EF] shadow-xl p-6 space-y-5">
                {/* Preview Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center text-[#C6A45A]">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#182230]">Live Cell Reporting</h3>
                      <p className="text-[11px] text-[#667085]">2026 Reporting Cycle &bull; Open</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#23845B] border border-emerald-200">
                    Cycle Active
                  </span>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E3E8EF]">
                    <div className="text-[11px] font-bold text-[#667085] flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[#C6A45A]" />
                      Souls Harvested
                    </div>
                    <div className="text-2xl font-extrabold text-[#142B4A] mt-1">2,840+</div>
                    <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Growing across regions</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E3E8EF]">
                    <div className="text-[11px] font-bold text-[#667085] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#142B4A]" />
                      Weekly Deadline
                    </div>
                    <div className="text-sm font-extrabold text-[#142B4A] mt-2">Sun 6:00 PM</div>
                    <div className="text-[10px] text-[#C6A45A] font-bold mt-0.5">Africa/Accra (GMT)</div>
                  </div>
                </div>

                {/* Live Activity Row Preview (Matches reference design) */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#182230] uppercase tracking-wider flex items-center justify-between">
                    <span>Recent Cell Returns</span>
                    <span className="text-[#C6A45A] font-bold text-[10px]">Verified</span>
                  </div>

                  {/* Sample Row 1 - Approved */}
                  <div className="p-3 rounded-xl border border-[#E3E8EF] bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#142B4A] text-[#C6A45A] flex items-center justify-center font-bold text-[10px]">
                        GF
                      </div>
                      <div>
                        <div className="font-bold text-[#182230]">Grace Fellowship Cell</div>
                        <div className="text-[10px] text-[#667085]">Samuel Mensah &bull; Attendance: 28</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#23845B] bg-[#F0FDF4] px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Approved
                    </span>
                  </div>

                  {/* Sample Row 2 - In Review */}
                  <div className="p-3 rounded-xl border border-[#E3E8EF] bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#203D63] text-white flex items-center justify-center font-bold text-[10px]">
                        DC
                      </div>
                      <div>
                        <div className="font-bold text-[#182230]">Dominion Cell Central</div>
                        <div className="text-[10px] text-[#667085]">David Asante &bull; Attendance: 24</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D99A32] bg-amber-50 px-2 py-0.5 rounded-md">
                      Pending Review
                    </span>
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  onClick={() => onOpenAuth('select')}
                  className="w-full py-2.5 rounded-xl bg-[#F5F7FA] hover:bg-[#142B4A] text-[#142B4A] hover:text-white font-bold text-xs transition-colors border border-[#E3E8EF] flex items-center justify-center gap-2"
                >
                  <span>Launch Official Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. THE FOUR CORE PILLARS                                     */}
      {/* ============================================================ */}
      <section id="pillars" className="py-20 bg-white border-t border-[#E3E8EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C6A45A]">
              Comprehensive Ministry System
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#142B4A] mt-2">
              Four Pillars of Cell Stewardship
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#667085] leading-relaxed">
              Every feature of FNI CELLS CONNECT is engineered around spiritual vitality, faithful discipleship, and meticulous institutional documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E3E8EF] hover:border-[#142B4A] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#182230] group-hover:text-[#142B4A] transition-colors">
                  Weekly Cell Meeting Reporting
                </h3>
                <p className="mt-2.5 text-xs text-[#667085] leading-relaxed">
                  Structured records of attendance, first-timers, new converts, tithes/offerings, sermon outlines, and urgent pastoral prayer requests.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E3E8EF] flex items-center text-xs font-bold text-[#142B4A]">
                <span>On-time submission tracking</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E3E8EF] hover:border-[#142B4A] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#182230] group-hover:text-[#142B4A] transition-colors">
                  Soul Winning & Evangelism
                </h3>
                <p className="mt-2.5 text-xs text-[#667085] leading-relaxed">
                  Log street outreaches, campus invasions, personal witnessing, salvations, and Holy Spirit baptisms with immediate contact roster entry.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E3E8EF] flex items-center text-xs font-bold text-[#142B4A]">
                <span>Harvest documentation</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E3E8EF] hover:border-[#142B4A] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#182230] group-hover:text-[#142B4A] transition-colors">
                  Systematic Follow-Ups
                </h3>
                <p className="mt-2.5 text-xs text-[#667085] leading-relaxed">
                  Discipleship pipeline tracking phone calls, home visits, one-on-one prayers, and assimilation from new contact to committed disciple.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E3E8EF] flex items-center text-xs font-bold text-[#142B4A]">
                <span>Fruit retention & care</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E3E8EF] hover:border-[#142B4A] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#182230] group-hover:text-[#142B4A] transition-colors">
                  Executive Leadership Oversight
                </h3>
                <p className="mt-2.5 text-xs text-[#667085] leading-relaxed">
                  Real-time cross-cell analytics, regional performance tables, review audit trails, and late submission alerting for ministry governance.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E3E8EF] flex items-center text-xs font-bold text-[#142B4A]">
                <span>Ministry governance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. THE SACRED RHYTHM: WEEKLY DEADLINE SYSTEM                 */}
      {/* ============================================================ */}
      <section id="weekly-cycle" className="py-20 bg-[#F5F7FA] border-t border-[#E3E8EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#142B4A] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C6A45A]/20 border border-[#C6A45A]/30 text-[#E9D9B2] text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
                  WEEKLY REPORTING RHYTHM
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                  Sunday 6:00 PM (GMT) Strict Cutoff
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                  In Forerunners Network International, spiritual diligence is matched with operational excellence. Every cell meeting report must be lodged before the Sunday 6:00 PM Africa/Accra deadline. On-time returns ensure church leadership can intercede, evaluate, and provide timely pastoral care.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-[#E9D9B2]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A45A]" />
                    Automatic Late-Submission Detection
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A45A]" />
                    Audit-Logged Submission Timestamps
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A45A]" />
                    Accra / GMT Timezone Enforced
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#C6A45A] text-[#142B4A] flex items-center justify-center font-black text-xl mb-3 shadow-md">
                  18:00
                </div>
                <div className="text-lg font-bold text-white">Sunday Evening Cutoff</div>
                <div className="text-xs text-[#E9D9B2] mt-1 font-medium">Africa/Accra Time (UTC+0)</div>
                <button
                  onClick={() => onOpenAuth('tutor', 'signup')}
                  className="mt-5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#142B4A] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Submit This Week's Return</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. DUAL PORTALS: TUTOR VS ADMINISTRATOR                      */}
      {/* ============================================================ */}
      <section id="portals" className="py-20 bg-white border-t border-[#E3E8EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C6A45A]">
              Role-Protected Gateways
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#142B4A] mt-2">
              Two Dedicated Portals, One Mission
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#667085] leading-relaxed">
              FNI CELLS CONNECT maintains strict role segregation to safeguard church governance and leader privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Tutor / Cell Leader Portal Card */}
            <div className="rounded-2xl border-2 border-[#E3E8EF] hover:border-[#142B4A] bg-white p-8 flex flex-col justify-between transition-all shadow-xs hover:shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A]/5 text-[#142B4A] flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#C6A45A] mb-1">
                  Field Ministry Gateway
                </div>
                <h3 className="text-xl font-bold text-[#182230]">
                  Tutor / Cell Leader Portal
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#667085] leading-relaxed">
                  Tailored for cell leaders to register their cells, record weekly meeting metrics, log soul-winning encounters, and care for assigned disciples.
                </p>

                <ul className="mt-6 space-y-3 text-xs font-medium text-[#182230]">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Instant self-registration (4 fields only; no email/phone needed)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Submit Cell Meeting and Evangelism Reports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Manage soul follow-up pipeline & discipleship notes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Personal cell activity history and verification receipts</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E3E8EF] flex items-center gap-3">
                <button
                  onClick={() => onOpenAuth('tutor', 'signup')}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Sign Up as Tutor</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
                <button
                  onClick={() => onOpenAuth('tutor', 'login')}
                  className="py-3 px-4 rounded-xl border border-[#E3E8EF] hover:bg-[#F5F7FA] text-[#142B4A] font-bold text-xs transition-colors"
                >
                  <span>Tutor Login</span>
                </button>
              </div>
            </div>

            {/* Administrator Portal Card */}
            <div className="rounded-2xl border-2 border-[#E3E8EF] hover:border-[#142B4A] bg-white p-8 flex flex-col justify-between transition-all shadow-xs hover:shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#142B4A]/5 text-[#142B4A] flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#C6A45A] mb-1">
                  Executive Governance
                </div>
                <h3 className="text-xl font-bold text-[#182230]">
                  Administrator Portal
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#667085] leading-relaxed">
                  Dedicated executive command center for ministry leadership to supervise all regions, approve weekly returns, track late submissions, and analyze church growth.
                </p>

                <ul className="mt-6 space-y-3 text-xs font-medium text-[#182230]">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Single authorized administrator account with password protection</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Mandatory first-time password rotation (invalidates default)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Report review workflow with status changes & audit comments</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#23845B] shrink-0" />
                    <span>Complete organization-wide analytics and regional directories</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E3E8EF]">
                <button
                  onClick={() => onOpenAuth('admin')}
                  className="w-full py-3 px-4 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Shield className="w-4 h-4 text-[#C6A45A]" />
                  <span>Authenticate Administrator</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FREQUENTLY ASKED QUESTIONS                                */}
      {/* ============================================================ */}
      <section id="faq" className="py-20 bg-[#F5F7FA] border-t border-[#E3E8EF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C6A45A]">
              Clarifications & Guidance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E3E8EF] overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-sm text-[#182230] flex items-center justify-between gap-4 hover:bg-[#F5F7FA] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#667085] transition-transform duration-200 shrink-0 ${
                      openFaq === idx ? 'rotate-180 text-[#142B4A]' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[#667085] leading-relaxed border-t border-[#E3E8EF]/60">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. PRE-FOOTER INVOCATION / CTA BANNER                        */}
      {/* ============================================================ */}
      <section className="py-16 bg-[#142B4A] text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#C6A45A]/20 border border-[#C6A45A]/40 text-[#C6A45A] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to lodge your cell return or access your dashboard?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Experience the unified digital reporting platform of Forerunners Network International.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('select')}
              className="px-6 py-3 rounded-xl bg-white text-[#142B4A] hover:bg-slate-100 font-bold text-xs transition-all shadow-md flex items-center gap-2"
            >
              <span>Access Official Platform</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. OFFICIAL FOOTER                                           */}
      {/* ============================================================ */}
      <footer className="bg-white border-t border-[#E3E8EF] py-12 text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Ministry Branding */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E3E8EF] bg-[#142B4A] flex items-center justify-center shrink-0">
                  <img
                    src="/fni-official-logo.jpg"
                    alt="FNI Ministry Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#142B4A]">
                    FNI CELLS CONNECT
                  </div>
                  <div className="text-[11px] text-[#667085] font-semibold">
                    Forerunners Network International
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#667085] leading-relaxed max-w-sm">
                *Connecting cells. Strengthening fellowship. Advancing the mission.* Official digital platform for cell fellowship administration, reporting accuracy, and evangelistic follow-up.
              </p>
              <div className="text-[11px] font-semibold text-[#142B4A]">
                Headquarters: Accra, Ghana &bull; Global Operations
              </div>
            </div>

            {/* Platform Quick Links */}
            <div className="space-y-2.5">
              <div className="font-bold text-[#182230] text-xs uppercase tracking-wider">
                Platform
              </div>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <a href="#overview" className="hover:text-[#142B4A] transition-colors">Overview</a>
                </li>
                <li>
                  <a href="#pillars" className="hover:text-[#142B4A] transition-colors">Core Pillars</a>
                </li>
                <li>
                  <a href="#weekly-cycle" className="hover:text-[#142B4A] transition-colors">Weekly Deadline</a>
                </li>
                <li>
                  <a href="#portals" className="hover:text-[#142B4A] transition-colors">Portals Comparison</a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-[#142B4A] transition-colors">Help & FAQ</a>
                </li>
              </ul>
            </div>

            {/* Quick Access */}
            <div className="space-y-2.5">
              <div className="font-bold text-[#182230] text-xs uppercase tracking-wider">
                Direct Portals
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => onOpenAuth('tutor', 'signup')}
                    className="hover:text-[#142B4A] font-semibold flex items-center gap-1.5"
                  >
                    <span>Tutor Sign Up</span>
                    <span className="text-[#C6A45A]">→</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onOpenAuth('tutor', 'login')}
                    className="hover:text-[#142B4A] font-semibold flex items-center gap-1.5"
                  >
                    <span>Tutor Sign In</span>
                    <span className="text-[#C6A45A]">→</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onOpenAuth('admin')}
                    className="hover:text-[#142B4A] font-semibold flex items-center gap-1.5"
                  >
                    <span>Administrator Sign In</span>
                    <span className="text-[#C6A45A]">→</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E3E8EF] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#667085]">
            <div>
              &copy; {new Date().getFullYear()} Forerunners Network International (FNI). All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Faith &bull; Diligence &bull; Stewardship</span>
              <span className="text-[#C6A45A] font-bold">Accra &bull; London &bull; Lagos &bull; Global</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
