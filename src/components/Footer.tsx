import { Facebook, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import flaromaFooterLogo from "@/assets/flaroma-footer-logo.png";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #3D2314 0%, #2E1A0E 100%)" }}>
      <div className="container mx-auto px-6 py-10 pb-28 md:py-20 md:pb-20">
        {/* Brand - full width on mobile */}
        <div className="mb-6 md:mb-0 md:hidden">
          <h3 className="mb-3">
            <Link to="/">
              <img src={flaromaFooterLogo} alt="Flaroma" className="h-28 w-auto" />
            </Link>
          </h3>
          <p className="text-cream/50 text-xs leading-relaxed max-w-xs font-sans">
            কোনো প্রিজারভেটিভ নেই, একদম ফ্রেশ। প্রতিটি পিস পরম ভালোবাসায় হাতে তৈরি। বাংলাদেশের প্রিমিয়াম কুনাফা চকোলেট ব্র্যান্ড।
          </p>
          <div className="flex items-center gap-3 mt-4">
            <a
              href="https://www.facebook.com/profile.php?id=61574531571259"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-md border border-cream/20 flex items-center justify-center text-cream/50 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:scale-110 transition-all duration-300">

              <Facebook size={16} />
            </a>
            <a
              href="https://www.instagram.com/flaroma19/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="ig-hover w-9 h-9 rounded-md border border-cream/20 flex items-center justify-center text-cream/50 hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300">

              <Instagram size={16} />
            </a>
          </div>
        </div>

        {/* Contact + Legal side-by-side on mobile */}
        <div className="grid grid-cols-2 gap-6 mb-8 md:hidden">
          <div>
            <h4 className="font-serif font-semibold mb-3 text-gold-light text-xs tracking-wider uppercase">
              Contact
            </h4>
            <ul className="space-y-2 text-xs font-sans text-cream/50">
              <li className="flex items-start gap-1.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold/60" />
                <span>Bogura, Bangladesh</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0 text-gold/60" />
                <a href="tel:+8801766919551" className="hover:text-gold transition-colors duration-200">+880 1766-919551</a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail size={14} className="shrink-0 text-gold/60" />
                <a href="mailto:hello@flaroma.com" className="hover:text-gold transition-colors duration-200">hello@flaroma.com</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-3 text-gold-light text-xs tracking-wider uppercase">
              Legal
            </h4>
            <ul className="space-y-2 text-xs font-sans">
              <li><Link to="/privacy-policy" className="text-cream/50 hover:text-gold transition-colors duration-200">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-cream/50 hover:text-gold transition-colors duration-200">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="text-cream/50 hover:text-gold transition-colors duration-200">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Desktop 4-column layout */}
        <div className="hidden md:grid md:grid-cols-4 gap-12 mb-6">
          <div>
            <h3 className="mb-4">
              <Link to="/">
                <img src={flaromaFooterLogo} alt="Flaroma" className="h-28 w-auto" />
              </Link>
            </h3>
            <p className="text-cream/50 text-sm leading-relaxed max-w-xs font-sans">
              কোনো প্রিজারভেটিভ নেই, একদম ফ্রেশ। প্রতিটি পিস পরম ভালোবাসায় হাতে তৈরি। বাংলাদেশের প্রিমিয়াম কুনাফা চকোলেট ব্র্যান্ড।
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://www.facebook.com/profile.php?id=61574531571259"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-md border border-cream/20 flex items-center justify-center text-cream/50 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:scale-110 transition-all duration-300">

                <Facebook size={18} />
              </a>
              <a
                href="https://www.instagram.com/flaroma19/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="ig-hover w-10 h-10 rounded-md border border-cream/20 flex items-center justify-center text-cream/50 hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300">

                <Instagram size={18} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-5 text-gold-light text-sm tracking-wider uppercase">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li><Link to="/#products" className="text-cream/50 hover:text-gold transition-colors duration-200">Products</Link></li>
              <li><Link to="/custom" className="text-cream/50 hover:text-gold transition-colors duration-200">Build Your Box</Link></li>
              <li><Link to="/#community" className="text-cream/50 hover:text-gold transition-colors duration-200">Community / Reviews</Link></li>
              <li><Link to="/#process" className="text-cream/50 hover:text-gold transition-colors duration-200">Our Process</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-5 text-gold-light text-sm tracking-wider uppercase">
              Contact
            </h4>
            <ul className="space-y-3 text-sm font-sans text-cream/50">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-gold/60" />
                <span>Bogura, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0 text-gold/60" />
                <a href="tel:+8801766919551" className="hover:text-gold transition-colors duration-200">+880 1766-919551</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0 text-gold/60" />
                <a className="hover:text-gold transition-colors duration-200" href="mailto:hello@flaroma.bd">hello@flaroma.bd</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-5 text-gold-light text-sm tracking-wider uppercase">
              Legal
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li><Link to="/privacy-policy" className="text-cream/50 hover:text-gold transition-colors duration-200">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-cream/50 hover:text-gold transition-colors duration-200">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="text-cream/50 hover:text-gold transition-colors duration-200">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-cream/10" />

        {/* Bottom Bar */}
        <div className="pt-5 flex flex-col items-center justify-center gap-2 text-sm text-cream/40">
          <a
            href="https://www.facebook.com/profile.php?id=61574531571259"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold hover:underline transition-all duration-200">

            © {new Date().getFullYear()} Flaroma. All rights reserved.
          </a>
          <a
            href="https://www.shahnabil.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ig-hover text-gold underline font-sans px-3 py-1 rounded-lg transition-all duration-300 hover:text-white hover:no-underline active:text-white active:no-underline">

            Handcrafted with <span>♥</span> By Shahriar Nabil
          </a>
        </div>
      </div>
    </footer>);

};

export default Footer;