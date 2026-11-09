import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Button variant="ghost" asChild className="mb-8 text-muted-foreground hover:text-foreground">
          <Link to="/">
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: February 10, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Flaroma website, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our website or services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">2. Products & Orders</h2>
            <p>
              All products listed on our website are handcrafted artisanal food items. Product images are representative and may vary slightly due to the handmade nature of our chocolates. Prices are listed in Bangladeshi Taka (৳) and are subject to change without prior notice.
            </p>
            <p className="mt-2">
              By placing an order, you confirm that the information you provide is accurate and that you are authorized to use the payment method selected. We reserve the right to refuse or cancel any order at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">3. Delivery & Shipping</h2>
            <p>
              We currently deliver within Dhaka, Bangladesh. Delivery times are estimates and may vary depending on location and order volume. Flaroma is not responsible for delays caused by factors beyond our control, including but not limited to weather conditions and courier service disruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">4. Returns & Refunds</h2>
            <p>
              Due to the perishable nature of our products, we do not accept returns. If you receive a damaged or incorrect order, please contact us within 24 hours of delivery with photographic evidence. We will assess the situation and offer a replacement or refund at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">5. Intellectual Property</h2>
            <p>
              All content on this website — including text, images, logos, product designs, and branding — is the property of Flaroma and is protected by applicable intellectual property laws. You may not reproduce, distribute, or use any content without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">6. User Accounts</h2>
            <p>
              Certain features of our website may require you to sign in using Google OAuth. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. Administrative access is restricted to authorized personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">7. Food Safety & Allergens</h2>
            <p>
              Our products are made in a facility that handles nuts, dairy, gluten, and other common allergens. While we take precautions, we cannot guarantee that our products are free from allergen traces. Please review product descriptions carefully and contact us if you have specific dietary concerns.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              Flaroma shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or consumption of our products, to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of Bangladesh. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Dhaka, Bangladesh.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p>
              For any questions regarding these Terms of Service, please contact us:
            </p>
            <ul className="list-none space-y-1 mt-2">
              <li>📍 Dhaka, Bangladesh</li>
              <li>✉️ <a href="mailto:hello@flaroma.com" className="text-accent hover:underline">hello@flaroma.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
