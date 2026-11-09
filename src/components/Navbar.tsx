import { useState, useCallback } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import flaromaLogoFull from "@/assets/flaroma-logo-full.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { openCart, totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleAnchorClick = useCallback(
    (hash: string) => {
      setIsOpen(false);
      if (location.pathname === "/") {
        // Delay scroll to allow mobile menu exit animation to complete
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 350);
      } else {
        navigate("/" + hash);
      }
    },
    [location.pathname, navigate]
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={flaromaLogoFull} alt="Flaroma" className="h-16 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
          <button onClick={() => handleAnchorClick("#products")} className="text-muted-foreground hover:text-foreground transition-colors">Products</button>
          <Link to="/custom" className="text-muted-foreground hover:text-foreground transition-colors">Build Your Chocolate</Link>
          <button onClick={() => handleAnchorClick("#process")} className="text-muted-foreground hover:text-foreground transition-colors">Our Process</button>
          <button onClick={() => handleAnchorClick("#community")} className="text-muted-foreground hover:text-foreground transition-colors">Reviews</button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={openCart}
            className="relative p-2 text-foreground hover:text-gold transition-colors">
            <ShoppingBag size={20} />
            <AnimatePresence>
              {totalItems > 0 &&
              <motion.span
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-strawberry text-destructive-foreground text-[10px] font-num font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </motion.span>
              }
            </AnimatePresence>
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden overflow-hidden bg-background border-b border-border">
            <div className="px-6 py-4 flex flex-col gap-4 text-sm font-medium">
              <button onClick={() => handleAnchorClick("#products")} className="text-left text-muted-foreground hover:text-foreground">Products</button>
              <Link to="/custom" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">Build Your Box</Link>
              <button onClick={() => handleAnchorClick("#process")} className="text-left text-muted-foreground hover:text-foreground">Our Process</button>
              <button onClick={() => handleAnchorClick("#community")} className="text-left text-muted-foreground hover:text-foreground">Reviews</button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;