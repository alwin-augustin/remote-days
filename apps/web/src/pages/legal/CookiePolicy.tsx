import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
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
            <CardTitle className="text-3xl">Cookie Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none pt-6">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. What Are Cookies</h2>
              <p className="text-gray-700">
                Cookies are small text files that are placed on your device when you visit
                a website. They are widely used to make websites work more efficiently and
                to provide information to website owners. Cookies help us improve your
                experience by remembering your preferences and understanding how you use
                our application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-700 mb-4">
                {companyName} uses only essential cookies that are strictly necessary for
                the application to function. We do not use advertising, marketing, or
                third-party tracking cookies.
              </p>
              <p className="text-gray-700">
                Our approach to cookies aligns with GDPR requirements, which allow essential
                cookies without explicit consent as they are necessary for the service you
                have requested.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Types of Cookies We Use</h2>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Essential Cookies</h3>
                <p className="text-gray-700 mb-3">
                  These cookies are necessary for the application to function and cannot
                  be disabled.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                          Cookie Name
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                          Purpose
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">token</td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          Stores your authentication token to keep you logged in securely.
                          This is an httpOnly cookie for security.
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">Session / 7 days</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">cookie_consent</td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          Remembers that you have acknowledged our cookie notice.
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Cookies We Do NOT Use</h2>
              <p className="text-gray-700 mb-4">
                {companyName} does not use:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Advertising Cookies:</strong> We do not display ads or use
                  cookies to track you for advertising purposes.
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> We do not use third-party analytics
                  services that track individual users.
                </li>
                <li>
                  <strong>Social Media Cookies:</strong> We do not embed social media
                  features that place tracking cookies.
                </li>
                <li>
                  <strong>Third-Party Tracking:</strong> We do not allow any third parties
                  to place cookies on our application.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Managing Cookies</h2>
              <p className="text-gray-700 mb-4">
                Most web browsers allow you to control cookies through their settings.
                You can typically:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>View what cookies are stored on your device</li>
                <li>Delete all or specific cookies</li>
                <li>Block all cookies or cookies from specific sites</li>
                <li>Block third-party cookies</li>
                <li>Set your browser to notify you when a cookie is set</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Note:</strong> If you disable essential cookies, you will not be
                able to use {companyName} as the authentication system requires cookies
                to function.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Browser-Specific Instructions</h2>
              <p className="text-gray-700 mb-4">
                For more information on how to manage cookies in your browser:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Apple Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Local Storage</h2>
              <p className="text-gray-700">
                In addition to cookies, we may use browser local storage to store
                non-sensitive preferences like UI settings. Local storage data stays
                on your device and is not transmitted to our servers. You can clear
                local storage through your browser's developer tools or settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time to reflect changes in
                our practices or for operational, legal, or regulatory reasons. The date
                at the top of this policy indicates when it was last updated. We encourage
                you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about our use of cookies, please contact us at:{' '}
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
          <Link to="/legal/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
