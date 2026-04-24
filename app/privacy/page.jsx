import LegalPageLayout from "../components/LegalPageLayout";

export const metadata = {
  title: "Privacy Policy | FinTrak",
  description: "Privacy Policy for FinTrak and its Gmail-based expense tracking features.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy Policy"
      title="How FinTrak handles your data"
      description="This Privacy Policy explains what information FinTrak processes, why it is used, and the choices available to people who use the app."
      effectiveDate="April 1, 2026"
    >
      <h2>Overview</h2>
      <p>
        FinTrak is a personal finance dashboard that helps users review
        transaction-related Gmail messages, extract payment details, and organize
        that information into a transaction feed, charts, and summaries.
      </p>

      <h2>Information FinTrak processes</h2>
      <p>Depending on how the app is used, FinTrak may process:</p>
      <ul>
        <li>FinTrak account details such as username, email address, and password hash</li>
        <li>a hashed FinTrak passcode when the user enables the in-app lock screen</li>
        <li>basic Google account profile information needed to connect Gmail</li>
        <li>
          secure server-side Gmail connection tokens used to refresh access on
          the user&apos;s behalf after consent is granted
        </li>
        <li>
          Gmail messages and metadata that appear to contain transaction,
          debit, credit, bank, or UPI payment information
        </li>
        <li>
          parsed transaction details such as date, amount, bank name, payment
          type, VPA or payee identifier, and category
        </li>
        <li>user preferences such as category overrides and date filters</li>
      </ul>

      <h2>How the information is used</h2>
      <p>FinTrak uses this information to:</p>
      <ul>
        <li>authenticate FinTrak users and maintain an active app session</li>
        <li>retrieve transaction-related Gmail messages requested by the user</li>
        <li>parse those messages into structured transaction records</li>
        <li>display dashboards, charts, summaries, bank views, and payee views</li>
        <li>save user category preferences and sync settings where supported</li>
        <li>debug reliability, quota, and parsing issues in the service</li>
      </ul>

      <h2>Gmail data access</h2>
      <p>
        FinTrak accesses Gmail only after the user grants permission through
        Google OAuth. Gmail data is used to identify and display transaction
        information inside the app. FinTrak does not sell Gmail data and does
        not use Gmail data for advertising.
      </p>
      <p>
        Gmail data is processed only to provide the app&apos;s finance-tracking
        features, including transaction extraction, categorization, summaries,
        and user-requested sync operations.
      </p>

      <h2>Storage and retention</h2>
      <p>
        Parsed transaction data, local preferences, short-lived cache data, and
        Gmail connection information may be stored in the browser or on backend
        services used by the app. If cloud sync is enabled, category overrides
        and related Google connection data may also be stored on the configured
        backend.
      </p>
      <p>
        Data is retained only for as long as needed to operate the service,
        improve reliability, or comply with legal obligations. Operators of a
        deployed copy of FinTrak may choose their own retention periods.
      </p>

      <h2>Third-party services</h2>
      <p>FinTrak may rely on services such as:</p>
      <ul>
        <li>Google for authentication and Gmail API access</li>
        <li>hosting providers such as Vercel for app delivery</li>
        <li>database or sync providers such as Supabase when enabled</li>
      </ul>
      <p>
        Those services operate under their own privacy terms and policies.
      </p>

      <h2>Security</h2>
      <p>
        FinTrak uses reasonable measures to protect data in transit and limit
        access to authenticated users. No system can guarantee absolute
        security, so users should avoid connecting accounts on untrusted devices
        and should revoke access if they believe their Google account has been
        compromised.
      </p>

      <h2>User choices</h2>
      <p>Users may:</p>
      <ul>
        <li>disconnect Google access through their Google account settings</li>
        <li>clear local browser storage for cached transactions and preferences</li>
        <li>stop using the app at any time</li>
      </ul>

      <h2>Children&apos;s privacy</h2>
      <p>
        FinTrak is not directed to children under 13 and is not intended for
        use by children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        This Privacy Policy may be updated from time to time. Updated versions
        become effective when published on this page.
      </p>

      <h2>Contact</h2>
      <p>
        If you operate this deployment in production, replace this section with
        your support or legal contact email before submitting the app for broad
        public OAuth verification.
      </p>
    </LegalPageLayout>
  );
}
