"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Magnetic } from "./Magnetic";

export function Footer() {
  return (
    <footer className="bg-[#050505] text-white pt-32 pb-12 px-8 md:px-16 border-t border-white/5">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 mb-12">
          
          {/* Column 1: SOCIALS */}
          <div className="md:col-span-2 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-8 block">SOCIALS</span>
            <ul className="space-y-6">
              <FooterLink href="https://github.com/pardhasaradhi-sde" label="GITHUB" />
              <FooterLink href="https://linkedin.com/in/pardha-saradhi18/" label="LINKEDIN" />
              <FooterLink href="https://x.com/__pardhu" label="TWITTER" />
              <FooterLink href="https://www.instagram.com/___pardhu___/" label="INSTAGRAM" />
            </ul>
          </div>

          {/* Column 2: COMPETITIVE CODING */}
          <div className="md:col-span-2 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-8 block">COMPETITIVE CODING</span>
            <ul className="space-y-6">
              <FooterLink href="https://leetcode.com/u/_pardhu_/" label="LEETCODE" />
              <FooterLink href="https://www.geeksforgeeks.org/profile/seerapupact2i/" label="GEEKSFORGEEKS" />
              <FooterLink href="https://www.codechef.com/users/soon_spice_01" label="CODECHEF" />
            </ul>
          </div>

          {/* Column 3: REFERAI LINKS */}
          <div className="md:col-span-2 flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-8 block">REFERAI PLATFORM</span>
             <ul className="space-y-6">
              <FooterLink href="#network" label="THE NETWORK" isInternal />
              <FooterLink href="#engine" label="MATCH ENGINE" isInternal />
              <FooterLink href="#draft" label="AI DRAFTER" isInternal />
              <FooterLink href="/auth/signup" label="START JOURNEY" isInternal />
            </ul>
          </div>

          {/* Column 4: WANT TO CONNECT? */}
          <div className="md:col-span-6 flex flex-col justify-between items-start md:items-end mt-12 md:mt-0">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-8 block md:text-right w-full">WANT TO CONNECT?</span>
             <div className="flex flex-col items-start md:items-end w-full">
                <Magnetic strength={0.3}>
                  <a href="mailto:seerapupardhu123@gmail.com" className="text-7xl md:text-8xl lg:text-[9.5rem] leading-[0.85] font-black tracking-tighter text-white hover:text-[#c4f82a] transition-colors decoration-transparent cursor-pointer block">
                     REFERAI
                  </a>
                </Magnetic>
                <a href="mailto:seerapupardhu123@gmail.com" className="text-gray-400 hover:text-white transition-colors mt-8 text-sm md:text-base tracking-widest font-medium uppercase">
                   seerapupardhu123@gmail.com
                </a>
             </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#555] gap-4 md:gap-0">
          <span className="flex-1 text-center md:text-left">&copy; 2026 SEERAPU PARDHA SARADHI</span>
          <span className="flex-1 text-center text-gray-400">BUILT BY A STUDENT WHO GOT TIRED OF BEING IGNORED BY ATS.</span>
          <span className="flex-1 text-center md:text-right">HYDERABAD, INDIA</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label, isInternal = false }: { href: string; label: string; isInternal?: boolean }) {
  return (
    <li>
      <Magnetic strength={0.2}>
        <Link 
          href={href} 
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="text-lg md:text-xl font-bold uppercase tracking-tighter text-gray-200 hover:text-[#c4f82a] transition-colors flex items-center gap-2 group w-fit"
        >
          {label}
          <span className="w-1.5 h-1.5 rounded-full bg-[#c4f82a] opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </Magnetic>
    </li>
  );
}
