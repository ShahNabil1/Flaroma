import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Button variant="ghost" asChild className="mb-8 text-muted-foreground hover:text-foreground">
          <Link to="/">
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: February 10, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              Welcome to Flaroma ("we", "our", or "us"). We are a Dhaka-based artisanal food brand specializing in handcrafted kunafa chocolates. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or place an order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and delivery address when you place an order or contact us.</li>
              <li><strong>Account Information:</strong> If you sign in via Google OAuth, we receive your name, email, and profile picture from your Google account.</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent on our site, browser type, and device information collected automatically through cookies and analytics tools.</li>
              <li><strong>Order Data:</strong> Product selections, customization preferences, order history, and payment details processed through our secure payment partners.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To process and fulfill your orders, including delivery coordination.</li>
              <li>To communicate with you about your orders, promotions, and updates.</li>
              <li>To improve our website, products, and customer experience.</li>
              <li>To comply with legal obligations and protect against fraudulent activity.</li>
              <li>To manage administrative access to our internal dashboard.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share your data with trusted service providers who assist in operating our website, processing payments, or delivering orders — strictly on a need-to-know basis and under confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>
              Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser. Disabling cookies may affect some functionality of the website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information, including encrypted connections (SSL/TLS), secure authentication systems, and restricted access to sensitive data. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information at any time. To exercise these rights, please contact us at <a href="mailto:hello@flaroma.com" className="text-accent hover:underline">hello@flaroma.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-3">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please reach out to us:
            </p>
            <ul className="list-none space-y-1 mt-2">
              <li>📍 Bogura, Bangladesh</li>
              <li>✉️ <a href="mailto:hello@flaroma.com" className="text-accent hover:underline">hello@flaroma.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
