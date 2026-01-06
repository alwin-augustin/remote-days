import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = '2025-01-01';
  const companyName = 'Remote Days';
  const contactEmail = 'privacy@remotedays.app';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none pt-6">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                {companyName} ("we", "our", or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our remote work compliance tracking application.
              </p>
              <p className="text-gray-700">
                We comply with the General Data Protection Regulation (GDPR) and other applicable
                data protection laws in the European Union and Luxembourg.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Data Controller</h2>
              <p className="text-gray-700">
                The data controller responsible for your personal data is your employer who has
                subscribed to {companyName} services. {companyName} acts as a data processor on
                behalf of your employer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Information We Collect</h2>
              <p className="text-gray-700 mb-4">We collect the following types of information:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Account Information:</strong> Name, email address, country of residence,
                  work country, and employment details provided by your employer.
                </li>
                <li>
                  <strong>Work Location Data:</strong> Daily records of your work location
                  (home, office, or remote locations) for compliance tracking purposes.
                </li>
                <li>
                  <strong>Usage Data:</strong> Information about how you interact with our
                  application, including login times, features used, and device information.
                </li>
                <li>
                  <strong>Communication Data:</strong> Email notifications sent and their status.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Legal Basis for Processing</h2>
              <p className="text-gray-700 mb-4">
                We process your personal data based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Contractual Necessity:</strong> Processing is necessary to perform the
                  employment contract between you and your employer.
                </li>
                <li>
                  <strong>Legal Obligation:</strong> Your employer has legal obligations to track
                  cross-border work for tax compliance purposes.
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> Processing is necessary for the legitimate
                  interests of your employer in managing workforce compliance.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use collected information to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Track and monitor remote work days for tax compliance</li>
                <li>Generate compliance reports for HR and payroll purposes</li>
                <li>Send daily reminders to record work location</li>
                <li>Provide compliance status and warnings when approaching thresholds</li>
                <li>Maintain audit trails for regulatory purposes</li>
                <li>Improve and optimize our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Your Employer:</strong> HR and administrative personnel who require
                  access for compliance management.
                </li>
                <li>
                  <strong>Service Providers:</strong> Third-party vendors who assist with
                  email delivery, cloud hosting, and other technical services.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or
                  governmental authority.
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal data for as long as necessary to fulfill the purposes
                outlined in this policy, unless a longer retention period is required by law.
                Work location records are typically retained for the current year plus 7 years
                for tax compliance purposes. When you leave your employer, your data will be
                handled according to your employer's data retention policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Your Rights Under GDPR</h2>
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Right of Access:</strong> Request a copy of your personal data.
                </li>
                <li>
                  <strong>Right to Rectification:</strong> Request correction of inaccurate data.
                </li>
                <li>
                  <strong>Right to Erasure:</strong> Request deletion of your data under certain
                  conditions.
                </li>
                <li>
                  <strong>Right to Restrict Processing:</strong> Request limitation of data
                  processing under certain conditions.
                </li>
                <li>
                  <strong>Right to Data Portability:</strong> Receive your data in a structured,
                  machine-readable format.
                </li>
                <li>
                  <strong>Right to Object:</strong> Object to certain types of data processing.
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, use the data export feature in the application or
                contact your employer's HR department. You may also contact us directly at{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate technical and organizational measures to protect your
                personal data, including encryption in transit and at rest, access controls,
                regular security assessments, and secure development practices. However, no
                method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="text-gray-700">
                Your data is processed and stored within the European Economic Area (EEA).
                If any data is transferred outside the EEA, we ensure appropriate safeguards
                are in place, such as Standard Contractual Clauses approved by the European
                Commission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Cookies</h2>
              <p className="text-gray-700">
                We use essential cookies for authentication and session management. These are
                strictly necessary for the application to function. We do not use advertising
                or tracking cookies. For more information, see our{' '}
                <Link to="/legal/cookies" className="text-primary hover:underline">
                  Cookie Policy
                </Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of
                significant changes via email or through the application. We encourage you
                to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For questions about this Privacy Policy or to exercise your data rights,
                contact us at:
              </p>
              <p className="text-gray-700">
                Email:{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">14. Supervisory Authority</h2>
              <p className="text-gray-700">
                If you believe your data protection rights have been violated, you have the
                right to lodge a complaint with the Commission Nationale pour la Protection
                des Données (CNPD), the data protection authority in Luxembourg, or your
                local supervisory authority.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/legal/terms" className="hover:underline">Terms of Service</Link>
          {' | '}
          <Link to="/legal/cookies" className="hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}
