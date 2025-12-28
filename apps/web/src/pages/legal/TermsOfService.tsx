import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const lastUpdated = '2025-01-01';
  const companyName = 'Remote Days';
  const contactEmail = 'legal@remotedays.app';

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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none pt-6">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using the {companyName} application ("Service"), you agree to be
                bound by these Terms of Service ("Terms"). If you disagree with any part of
                the Terms, you may not access the Service.
              </p>
              <p className="text-gray-700">
                These Terms apply to all users of the Service, including employees whose
                employers have subscribed to {companyName} services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-gray-700">
                {companyName} is a remote work compliance tracking application designed for
                Luxembourg-based companies. The Service helps track employee work locations
                to ensure compliance with cross-border tax regulations applicable to employees
                residing in France, Belgium, and Germany who work in Luxembourg.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                When your employer creates an account for you, you are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Providing accurate and complete information when prompted</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 mb-4">As a user of the Service, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Record your work location accurately and honestly each day</li>
                <li>Respond to daily email prompts in a timely manner</li>
                <li>Report any discrepancies or errors in your records promptly</li>
                <li>Follow your employer's policies regarding remote work</li>
                <li>Not attempt to circumvent any security measures</li>
                <li>Not use the Service for any unlawful purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Accuracy of Information</h2>
              <p className="text-gray-700">
                You acknowledge that the accuracy of work location data is essential for
                tax compliance purposes. Deliberately providing false or misleading
                information may result in disciplinary action by your employer and could
                have legal consequences. {companyName} is not responsible for inaccurate
                data entered by users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700">
                The Service and its original content, features, and functionality are owned
                by {companyName} and are protected by international copyright, trademark,
                and other intellectual property laws. You may not copy, modify, distribute,
                or create derivative works based on the Service without our express written
                permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Data Processing</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is also governed by our{' '}
                <Link to="/legal/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>.
                By using the Service, you consent to the collection and processing of
                your data as described therein.
              </p>
              <p className="text-gray-700">
                Your employer is the data controller for your personal data. {companyName}
                acts as a data processor on behalf of your employer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Service Availability</h2>
              <p className="text-gray-700">
                We strive to maintain high availability of the Service but do not guarantee
                uninterrupted access. We may temporarily suspend the Service for maintenance,
                updates, or other operational reasons. We will endeavor to provide advance
                notice of planned maintenance when possible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
                ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Implied warranties of merchantability</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy or reliability of any information</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We do not warrant that the Service will be error-free, secure, or
                uninterrupted, or that any defects will be corrected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} SHALL NOT
                BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL,
                ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless {companyName}, its officers,
                directors, employees, and agents from any claims, damages, losses, or
                expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">
                Your access to the Service may be terminated:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>By your employer at any time for any reason</li>
                <li>When your employment relationship ends</li>
                <li>If you violate these Terms</li>
                <li>If we discontinue the Service</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon termination, your data will be handled according to your employer's
                data retention policies and applicable law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Modifications to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these Terms at any time. We will notify
                users of material changes via email or through the Service. Your continued
                use of the Service after such modifications constitutes acceptance of the
                updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">14. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws
                of Luxembourg, without regard to its conflict of law provisions. Any
                disputes arising from these Terms shall be subject to the exclusive
                jurisdiction of the courts of Luxembourg.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">15. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is found to be unenforceable or invalid,
                that provision shall be limited or eliminated to the minimum extent
                necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">16. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms of Service, please contact us at:{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/legal/privacy" className="hover:underline">Privacy Policy</Link>
          {' | '}
          <Link to="/legal/cookies" className="hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}
