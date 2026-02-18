"use client";

import Link from "next/link";
import { Twitter, Linkedin, Github, Disc as Discord, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Top Section: Main Navigation & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/10">
          
          {/* Brand Column */}
          <div className="md:col-span-4 p-12 md:p-24 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black tracking-tighter uppercase block mb-8">ReferAI</span>
              <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
                The first heuristic matchmaking engine for tech referrals. connects you with advocate employees who actually want to refer you.
              </p>
            </div>
            <div className="mt-12 md:mt-0 flex gap-4">
               <SocialLink href="#" icon={<Twitter className="w-5 h-5" />} />
               <SocialLink href="#" icon={<Github className="w-5 h-5" />} />
               <SocialLink href="#" icon={<Linkedin className="w-5 h-5" />} />
               <SocialLink href="#" icon={<Discord className="w-5 h-5" />} />
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4">
             <FooterColumn 
                title="Product" 
                links={[
                    { label: "The Feed", href: "#network" },
                    { label: "Match Engine", href: "#engine" },
                    { label: "AI Drafter", href: "#draft" },
                    { label: "Pricing", href: "/pricing" }
                ]} 
             />
             <FooterColumn 
                title="Company" 
                links={[
                    { label: "Manifesto", href: "/manifesto" },
                    { label: "Careers", href: "/careers" },
                    { label: "Blog", href: "/blog" },
                    { label: "Contact", href: "/contact" }
                ]} 
             />
             <FooterColumn 
                title="Resources" 
                links={[
                    { label: "Resume Guide", href: "/guide" },
                    { label: "Referral Templates", href: "/templates" },
                    { label: "Success Stories", href: "/stories" },
                    { label: "Help Center", href: "/help" }
                ]} 
             />
             <div className="p-12 md:p-16 flex flex-col justify-between border-l border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <div className="flex items-center gap-2 mt-4">
                    <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
                    <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">Systems Normal</span>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Section: Legal & Copyright */}
        <div className="px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <div className="flex gap-8">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/cookies" className="hover:text-white transition-colors">Cookie Settings</Link>
            </div>
            <span>© 2025 ReferAI Inc. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string, links: { label: string, href: string }[] }) {
    return (
        <div className="p-12 md:p-16 border-r border-b md:border-b-0 border-white/10 flex flex-col h-full">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-8 block">{title}</span>
            <ul className="space-y-4 flex-1">
                {links.map((link) => (
                    <li key={link.label}>
                        <Link href={link.href} className="text-sm font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1 group">
                             {link.label}
                             <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function SocialLink({ href, icon }: { href: string, icon: any }) {
    return (
        <Link href={href} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all">
            {icon}
        </Link>
    )
}
