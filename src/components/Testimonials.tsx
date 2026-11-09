import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Fatima Rahman",
    location: "Dhaka",
    text: "Flaroma-র কুনাফা চকোলেট এক কথায় অসাধারণ! এত ক্রিসপি আর ক্রিমি টেক্সচার আর কোথাও পাইনি। পরিবারের সবাই ফ্যান হয়ে গেছে।",
    rating: 5,
    avatar: "FR",
  },
  {
    name: "Arif Hossain",
    location: "Chittagong",
    text: "বন্ধুকে গিফট দিয়েছিলাম। সে বলেছে এটা তার খাওয়া সেরা চকোলেট। প্যাকেজিংও দারুণ। Highly recommend!",
    rating: 5,
    avatar: "AH",
  },
  {
    name: "Nusrat Jahan",
    location: "Sylhet",
    text: "আমি অনেক দুবাই চকোলেট খেয়েছি, কিন্তু Flaroma-র স্বাদ আলাদা। ফ্রেশনেস আর কোয়ালিটি মেইনটেইন করে বলে ভালো লাগে।",
    rating: 5,
    avatar: "NJ",
  },
  {
    name: "Tanvir Ahmed",
    location: "Rajshahi",
    text: "Build Your Own Box ফিচারটা amazing! নিজের পছন্দমতো customize করতে পেরে খুবই ভালো লাগলো।",
    rating: 4,
    avatar: "TA",
  },
];

const Testimonials = () => {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  return (
    <section id="testimonials" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-dark">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mt-3">
            আমাদের গ্রাহকদের কথা
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card rounded-3xl p-8 md:p-12 border border-border text-center"
            >
              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} size={18} className="fill-gold text-gold" />
                ))}
              </div>

              <p className="text-lg md:text-xl font-serif text-foreground leading-relaxed mb-8 italic">
                "{testimonials[current].text}"
              </p>

              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-sm">
                  {testimonials[current].avatar}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{testimonials[current].name}</p>
                  <p className="text-xs text-muted-foreground">{testimonials[current].location}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-3 mt-6">
            <button onClick={prev} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-card transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-gold w-6" : "bg-border"}`}
                />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-card transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
