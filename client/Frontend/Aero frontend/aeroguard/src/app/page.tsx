'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AetherBackground from '../components/shared/AetherBackground';
import {
  ArrowRight,
  Upload,
  Cpu,
  Box,
  FileText,
  Package,
  Shield,
  ChevronRight,
  Play,
  Zap,
  Eye,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

/* ─── Scroll-aware Nav ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex h-[56px] items-center justify-between px-6 transition-all duration-300 ${scrolled
          ? 'glass-nav border-b border-border-subtle'
          : 'bg-transparent'
        }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
          A
        </div>
        <span className="text-[15px] font-semibold text-text-primary">AeroGuard</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/app/dashboard"
          className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Start Inspection
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero Section ─── */
function Hero() {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2 + 0.3,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden py-20 lg:py-0">
      {/* Aether particle background */}
      <AetherBackground />

      {/* Grid overlay */}
      <div className="grid-overlay absolute inset-0 pointer-events-none opacity-40" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row items-center gap-16 px-6 pt-[56px] z-10">
        {/* Left content */}
        <div className="flex-1 max-w-[560px]">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA' }}>
              Aircraft Inspection AI
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-5 text-text-primary bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 font-bold tracking-tighter"
            style={{ font: '500 52px/1.08 var(--font-display)', letterSpacing: '-0.03em' }}
          >
            AI-Powered
            <br />
            Aircraft Inspection
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-8 max-w-[460px] text-[17px] leading-[1.7] text-text-secondary"
          >
            Replace manual borescope video review with automated defect detection,
            3D digital twin visualization, and compliance reporting — all from one platform.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3"
          >
            <Link
              href="/app/dashboard"
              className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover shadow-lg shadow-accent/20"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="flex items-center gap-2 rounded-md border border-border-default bg-surface/30 backdrop-blur-sm px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary">
              <Play className="h-3.5 w-3.5" />
              Watch Demo
            </button>
          </motion.div>

          <motion.div
            custom={4}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 flex items-center gap-6 text-[12px] text-text-tertiary"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              FAA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              EASA Approved
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ISO 27001
            </span>
          </motion.div>
        </div>

        {/* Right — Pipeline diagram */}
        <motion.div
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex-1 max-w-[500px] lg:max-w-none lg:block"
        >
          <PipelineDiagram />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Animated Pipeline Diagram ─── */
function PipelineDiagram() {
  // --- CONFIGURABLE DIMENSIONS ---
  // Change these numbers to adjust the box size. 
  // For a perfect 16:9 rectangle, use sizes like 960x540, 1280x720, or 640x360.
  const BOX_WIDTH = 2048;
  const BOX_HEIGHT = 1350;
  // -------------------------------

  const [activeStage, setActiveStage] = useState(0);
  const [phase, setPhase] = useState<'pipeline' | 'video'>('pipeline');
  const [currentVideo, setCurrentVideo] = useState(1);

  const stages = [
    { icon: Upload, label: 'Upload', detail: '4K Video' },
    { icon: Cpu, label: 'AI Detection', detail: '1,247 Frames' },
    { icon: Eye, label: 'Enhancement', detail: 'Super-Res' },
    { icon: Zap, label: 'Defect Analysis', detail: '3 Found' },
    { icon: Box, label: '3D Twin', detail: 'Heatmap' },
    { icon: FileText, label: 'Report', detail: 'Compliant' },
  ];

  useEffect(() => {
    if (phase !== 'pipeline') return;

    const interval = setInterval(() => {
      setActiveStage((prev) => {
        const next = prev + 1;
        if (next >= stages.length) {
          clearInterval(interval);
          setTimeout(() => setPhase('video'), 1000);
          return next;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [stages.length, phase]);

  // We removed the flipping phase intermediate effect

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface/50 mx-auto" 
      style={{ 
        width: '100%',
        maxWidth: `${BOX_WIDTH}px`,
        height: 'auto',
        aspectRatio: `${BOX_WIDTH} / ${BOX_HEIGHT}`,
        perspective: '1200px' 
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-full w-full flex-col justify-center p-6"
          >
            <div className="space-y-3">
              {stages.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = i === activeStage;
                const isComplete = i < activeStage;

                return (
                  <motion.div
                    key={stage.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
                    className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all duration-500 ${isActive
                        ? 'border-accent/40 bg-accent-subtle shadow-sm shadow-accent/10'
                        : isComplete
                          ? 'border-border-subtle bg-surface/30'
                          : 'border-transparent bg-transparent'
                      }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all duration-500 ${isActive
                          ? 'bg-accent text-white shadow-md shadow-accent/30'
                          : isComplete
                            ? 'bg-success/10 text-success'
                            : 'bg-elevated text-text-tertiary'
                        }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-[14px] font-medium transition-colors ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {stage.label}
                      </div>
                    </div>
                    <div
                      className={`text-[11px] font-mono transition-colors ${isActive ? 'text-accent' : isComplete ? 'text-success' : 'text-text-tertiary'
                        }`}
                    >
                      {isComplete ? 'Done' : isActive ? 'Running...' : stage.detail}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Data flow indicator */}
            <div className="mt-4 flex items-center justify-between rounded-md bg-elevated px-4 py-2">
              <span className="text-[11px] text-text-tertiary font-mono">Pipeline ETA</span>
              <span className="text-[13px] font-mono text-accent">~12 min</span>
            </div>
          </motion.div>
        )}


        {phase === 'video' && (
          <motion.div
            key="video"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface/50"
          >
            <video
              ref={(el) => { if (el) el.playbackRate = 1.5; }}
              src={`/video/video/${currentVideo}.mp4`}
              autoPlay
              muted
              className="h-full w-full object-fill rounded-xl"
              onEnded={() => {
                if (currentVideo === 1) {
                  setCurrentVideo(2);
                } else {
                  setPhase('pipeline');
                  setActiveStage(0);
                  setCurrentVideo(1);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Trusted By ─── */
function TrustedBy() {
  const logos = ['Lufthansa Technik', 'Delta TechOps', 'SIA Engineering', 'Air France KLM E&M', 'ST Aerospace', 'HAECO'];
  return (
    <section className="border-y border-border-subtle bg-surface/30 py-10">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
          Trusted by leading MRO organizations
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {logos.map((name) => (
            <span key={name} className="text-[14px] font-medium text-text-tertiary/60 transition-colors hover:text-text-secondary">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Upload Video', desc: 'Drag & drop borescope footage in any format. Supports 4K, drone, and endoscopic video.' },
    { num: '02', title: 'Frame Extraction', desc: 'AI extracts and deduplicates key frames from hours of raw video footage.' },
    { num: '03', title: 'AI Enhancement', desc: 'Super-resolution and noise reduction brings out hidden defect details.' },
    { num: '04', title: 'Defect Detection', desc: 'Computer vision models identify cracks, erosion, FOD, and thermal damage.' },
    { num: '05', title: '3D Reconstruction', desc: 'Detected defects are mapped onto a 3D digital twin with severity heatmaps.' },
    { num: '06', title: 'Compliance Report', desc: 'FAA/EASA-compliant reports auto-generated with recommendations and part orders.' },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 text-center">
          <p className="mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717A' }}>
            How It Works
          </p>
          <h2 className="text-text-primary" style={{ font: '500 36px/1.15 var(--font-display)', letterSpacing: '-0.025em' }}>
            From Video to Report in 15 Minutes
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group card p-6 transition-all duration-standard hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="mb-3 block font-mono text-[12px] text-accent">{step.num}</span>
              <h3 className="mb-2 text-[16px] font-medium text-text-primary">{step.title}</h3>
              <p className="text-[13px] leading-[1.6] text-text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    {
      icon: Cpu,
      title: 'Edge AI Detection',
      desc: 'Real-time defect detection with 97%+ accuracy on cracks, erosion, FOD, and thermal damage.',
    },
    {
      icon: Box,
      title: '3D Digital Twin',
      desc: 'Interactive engine visualization with severity heatmaps and component-level drill-down.',
    },
    {
      icon: FileText,
      title: 'Compliance Reports',
      desc: 'Auto-generated reports mapped to FAA AC 33.27, EASA Part-145, and airline-specific standards.',
    },
    {
      icon: Package,
      title: 'Smart Procurement',
      desc: 'Automated parts ordering when critical defects are detected. Supplier matching and ETA tracking.',
    },
    {
      icon: BarChart3,
      title: 'Predictive Analytics',
      desc: 'Defect trend analysis, fleet health monitoring, and maintenance forecasting across your fleet.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      desc: 'SOC 2 Type II, ISO 27001, role-based access control, full audit trail, and data encryption at rest.',
    },
  ];

  return (
    <section className="border-t border-border-subtle bg-surface/20 py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 text-center">
          <p className="mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717A' }}>
            Core Capabilities
          </p>
          <h2 className="text-text-primary" style={{ font: '500 36px/1.15 var(--font-display)', letterSpacing: '-0.025em' }}>
            Built for Mission-Critical Inspection
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group card p-6 transition-all duration-standard hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent-subtle text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[16px] font-medium text-text-primary">{feature.title}</h3>
                <p className="text-[13px] leading-[1.6] text-text-secondary">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Security ─── */
function Security() {
  const certs = [
    { label: 'FAA Approved', detail: 'Part 145 Compliant' },
    { label: 'EASA', detail: 'Part-145 / Part-M' },
    { label: 'ISO 27001', detail: 'Information Security' },
    { label: 'SOC 2 Type II', detail: 'Trust Services' },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-10 text-center">
          <p className="mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#71717A' }}>
            Security & Compliance
          </p>
          <h2 className="mb-3 text-text-primary" style={{ font: '500 28px/1.2 var(--font-display)', letterSpacing: '-0.02em' }}>
            Enterprise-Grade Trust
          </h2>
          <p className="mx-auto max-w-[500px] text-[14px] leading-[1.7] text-text-secondary">
            AeroGuard meets the highest aviation and information security standards.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {certs.map((cert) => (
            <div key={cert.label} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-5 py-3">
              <Shield className="h-5 w-5 text-accent" />
              <div>
                <div className="text-[13px] font-medium text-text-primary">{cert.label}</div>
                <div className="text-[11px] text-text-tertiary">{cert.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function FinalCTA() {
  return (
    <section className="border-t border-border-subtle py-24">
      <div className="mx-auto max-w-[600px] px-6 text-center">
        <h2 className="mb-4 text-text-primary" style={{ font: '500 36px/1.15 var(--font-display)', letterSpacing: '-0.025em' }}>
          Ready to Transform Your Inspection Workflow?
        </h2>
        <p className="mb-8 text-[15px] leading-[1.7] text-text-secondary">
          Join leading MRO organizations using AeroGuard to reduce inspection time by 80% and improve defect detection accuracy.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/app/dashboard"
            className="flex items-center gap-2 rounded-md border border-border-default px-6 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            Request Enterprise Demo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const columns = [
    { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Changelog'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'Status', 'Blog'] },
    { title: 'Company', links: ['About', 'Careers', 'Contact', 'Legal'] },
  ];

  return (
    <footer className="border-t border-border-subtle bg-surface/30 py-12">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-8 px-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-[10px] font-bold text-white">A</div>
            <span className="text-[14px] font-semibold text-text-primary">AeroGuard</span>
          </div>
          <p className="max-w-[220px] text-[12px] leading-[1.6] text-text-tertiary">
            AI-powered aircraft inspection platform for MRO organizations worldwide.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-text-tertiary">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-[13px] text-text-secondary hover:text-text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-[1200px] border-t border-border-subtle px-6 pt-6">
        <p className="text-[11px] text-text-tertiary">
          © 2025 AeroGuard Aviation Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ─── Landing Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base">
      <Nav />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <Features />
      <Security />
      <FinalCTA />
      <Footer />
    </div>
  );
}
