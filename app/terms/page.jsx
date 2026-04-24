import LegalPageLayout from "../components/LegalPageLayout";

export const metadata = {
  title: "Terms of Service | FinTrak",
  description: "Terms of Service for using FinTrak.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Terms of Service"
      title="Terms for using FinTrak"
      description="These Terms of Service govern access to and use of the FinTrak application and related services."
      effectiveDate="April 1, 2026"
    >
      <h2>Acceptance of terms</h2>
      <p>
        By using FinTrak, you agree to these Terms of Service. If you do not
        agree, do not use the app.
      </p>

      <h2>What FinTrak provides</h2>
      <p>
        FinTrak is a finance dashboard that helps users review transaction-like
        Gmail messages, extract payment details, and organize those details into
        summaries, charts, and transaction views.
      </p>

      <h2>User responsibilities</h2>
      <p>When using FinTrak, you agree to:</p>
      <ul>
        <li>use the app only with accounts and data you are authorized to access</li>
        <li>provide accurate information when connecting authentication services</li>
        <li>maintain the security of your device, browser, and Google account</li>
        <li>review parsed data before relying on it for financial decisions</li>
      </ul>

      <h2>Permitted use</h2>
      <p>
        You may use FinTrak for personal or internal business analysis unless a
        separate written agreement says otherwise.
      </p>

      <h2>Restricted use</h2>
      <p>You may not:</p>
      <ul>
        <li>use the service to access data without proper authorization</li>
        <li>attempt to interfere with app security, availability, or rate limits</li>
        <li>reverse engineer or misuse third-party APIs in violation of their terms</li>
        <li>use the app in a way that breaks applicable law or regulation</li>
      </ul>

      <h2>Third-party services</h2>
      <p>
        FinTrak depends on third-party services, including Google, hosting
        providers, and optional backend or database providers. Your use of those
        services may also be governed by their own terms and policies.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The service may change, be suspended, or be discontinued at any time.
        Features may be added, removed, or limited without notice.
      </p>

      <h2>No financial advice</h2>
      <p>
        FinTrak is a software tool for organizing and reviewing information. It
        does not provide accounting, tax, investment, compliance, or legal
        advice. You remain responsible for verifying all information before
        acting on it.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        FinTrak is provided on an &quot;as is&quot; and &quot;as available&quot;
        basis without warranties of any kind, whether express or implied, to the
        fullest extent permitted by law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the operators of FinTrak are
        not liable for indirect, incidental, special, consequential, or punitive
        damages, or for loss of data, profits, or business opportunities arising
        from use of the service.
      </p>

      <h2>Termination</h2>
      <p>
        Access to FinTrak may be suspended or terminated at any time if use of
        the service presents security, abuse, legal, or operational risk.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        These Terms of Service may be updated from time to time. Updated terms
        become effective when published on this page.
      </p>

      <h2>Contact</h2>
      <p>
        If you plan to use this deployment publicly, replace this section with
        your business or support contact information before linking to it from
        your Google OAuth branding page.
      </p>
    </LegalPageLayout>
  );
}
