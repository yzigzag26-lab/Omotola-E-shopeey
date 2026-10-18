import type { Metadata } from "next";
import { BUSINESS } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Corazon Empire collects and uses the information you share when placing an order.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="shell py-14 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Policy</p>
        <h1 className="mt-4 font-display text-4xl md:text-5xl">Privacy</h1>
        <p className="mt-4 border border-gold/40 bg-gold-soft/20 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          Draft policy for review before launch. It describes how this site actually works today and
          should be reviewed by the business owner (and, where appropriate, a legal adviser).
        </p>

        <div className="prose-luxe mt-8">
          <h2>What we collect</h2>
          <ul>
            <li>Your name, phone number, email address (if you provide it) and delivery address when you place an order.</li>
            <li>Notes you choose to add to an order.</li>
            <li>The products, options and quantities you select.</li>
          </ul>
          <p>We do not collect payment card details on this website.</p>

          <h2>Why we collect it</h2>
          <p>
            To contact you about your order, confirm availability, quote delivery, arrange payment and
            deliver your items. Your details are also retained in the seller&rsquo;s order records so we can
            resolve any follow-up questions.
          </p>

          <h2>How orders are transmitted</h2>
          <p>
            Orders are stored in our database. If you choose WhatsApp, the message is prepared in
            WhatsApp for you to send. If you choose email, the order notification is delivered to the
            store&rsquo;s email provider and forwarded to the seller.
          </p>

          <h2>Who can see your information</h2>
          <p>
            Customer order details are not public. Only the store administrator can read orders, and
            database access rules restrict this at the database level. Service providers that host the
            site, database and email delivery process data on our behalf.
          </p>

          <h2>Retention and your choices</h2>
          <p>
            Order records are kept for as long as needed to fulfil and support orders. You can ask us
            to correct or delete your contact details by emailing{" "}
            <a href={`mailto:${BUSINESS.orderEmail}`}>{BUSINESS.orderEmail}</a>. Some records may need
            to be retained for accounting or dispute purposes.
          </p>

          <h2>Cookies and local storage</h2>
          <p>
            The shopping bag is stored in your browser&rsquo;s local storage so it survives a refresh. The
            administrator login uses secure session cookies. We do not run advertising trackers on
            this site.
          </p>

          <h2>Contact</h2>
          <p>
            Privacy questions: <a href={`mailto:${BUSINESS.orderEmail}`}>{BUSINESS.orderEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
