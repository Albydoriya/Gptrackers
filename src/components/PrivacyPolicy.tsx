import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center transition-colors"
          >
            ← Back to Application
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <header className="text-center mb-12 pb-8 border-b-2 border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600 text-sm italic">Last Updated: January 21, 2026</p>
        </header>

        <section className="bg-white rounded-xl shadow-md p-10 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p className="mb-4 leading-relaxed">
            Welcome to GoParts. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our internal procurement and parts management system. GoParts is an invitation-only business application designed for authorized personnel to manage parts inventory, suppliers, orders, and quotes.
          </p>
          <p className="mb-4 leading-relaxed">
            Please read this privacy policy carefully. By accessing or using GoParts, you acknowledge that you have read, understood, and agree to be bound by the terms of this Privacy Policy.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information Collected via Google OAuth</h3>
          <p className="mb-4 leading-relaxed">When you sign in to GoParts using Google OAuth, we collect:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Email Address:</strong> Used for authentication and account identification</li>
            <li className="leading-relaxed"><strong>Full Name:</strong> Used for display purposes and user identification within the system</li>
            <li className="leading-relaxed"><strong>Profile Picture:</strong> Optionally displayed within the application interface</li>
            <li className="leading-relaxed"><strong>Google Account ID:</strong> Used to uniquely identify your account</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Information You Provide</h3>
          <p className="mb-4 leading-relaxed">When using GoParts, you may provide:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Parts information (descriptions, specifications, pricing, inventory data)</li>
            <li className="leading-relaxed">Supplier information (company names, contact details, pricing agreements)</li>
            <li className="leading-relaxed">Order and quote details (quantities, prices, dates, status updates)</li>
            <li className="leading-relaxed">Notes, comments, and other business-related data</li>
            <li className="leading-relaxed">User preferences and application settings</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.3 Automatically Collected Information</h3>
          <p className="mb-4 leading-relaxed">We automatically collect certain information when you use GoParts:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Usage Data:</strong> Actions performed, features accessed, timestamps</li>
            <li className="leading-relaxed"><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
            <li className="leading-relaxed"><strong>Log Data:</strong> IP addresses, access times, pages viewed</li>
            <li className="leading-relaxed"><strong>Session Data:</strong> Authentication tokens and session identifiers</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">3. How We Use Your Information</h2>
          <p className="mb-4 leading-relaxed">We use the collected information for the following purposes:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Authentication and Access Control:</strong> Verify your identity and ensure only authorized users access the system</li>
            <li className="leading-relaxed"><strong>Application Functionality:</strong> Enable core features including parts management, supplier tracking, order processing, and quote generation</li>
            <li className="leading-relaxed"><strong>User Experience:</strong> Personalize your experience and display relevant information</li>
            <li className="leading-relaxed"><strong>Business Operations:</strong> Maintain records for procurement activities, inventory management, and supplier relationships</li>
            <li className="leading-relaxed"><strong>Security:</strong> Detect, prevent, and respond to security incidents or unauthorized access attempts</li>
            <li className="leading-relaxed"><strong>System Improvement:</strong> Analyze usage patterns to improve application performance and features</li>
            <li className="leading-relaxed"><strong>Communication:</strong> Send system notifications and important updates about the application</li>
            <li className="leading-relaxed"><strong>Compliance:</strong> Meet legal and regulatory requirements for business record-keeping</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">4. Data Storage and Security</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Data Storage</h3>
          <p className="mb-4 leading-relaxed">
            Your data is stored securely using Supabase, a PostgreSQL-based database platform. All data is encrypted in transit using industry-standard TLS encryption and encrypted at rest. Database servers are located in secure data centers with appropriate physical and technical safeguards.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Security Measures</h3>
          <p className="mb-4 leading-relaxed">We implement various security measures to protect your information:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Authentication:</strong> Google OAuth 2.0 for secure user authentication</li>
            <li className="leading-relaxed"><strong>Authorization:</strong> Pre-approved user list (allowed_users table) ensures only authorized personnel can access the system</li>
            <li className="leading-relaxed"><strong>Row-Level Security (RLS):</strong> Database-level access controls ensure users can only access data they're authorized to view</li>
            <li className="leading-relaxed"><strong>Encryption:</strong> Data encrypted in transit (HTTPS/TLS) and at rest</li>
            <li className="leading-relaxed"><strong>Access Logging:</strong> Monitoring and logging of system access and data modifications</li>
            <li className="leading-relaxed"><strong>Regular Updates:</strong> Application and infrastructure security patches applied regularly</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Data Retention</h3>
          <p className="mb-4 leading-relaxed">
            We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law or for legitimate business purposes. Business records including orders, quotes, and supplier information are retained according to applicable business record retention requirements.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">5. Invitation-Only Access</h2>
          <p className="mb-4 leading-relaxed">
            GoParts is an invitation-only system. Access is restricted to email addresses that have been pre-approved and added to our allowed users list. Only authorized personnel within your organization can use the application. If you attempt to sign in with an email address that is not on the approved list, you will be denied access.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">6. Information Sharing and Disclosure</h2>
          <p className="mb-4 leading-relaxed">We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Within Your Organization:</strong> Authorized users within your organization can view relevant business data necessary for procurement operations</li>
            <li className="leading-relaxed"><strong>Service Providers:</strong> Third-party service providers who assist in operating the application (e.g., Supabase for database hosting, Google for authentication)</li>
            <li className="leading-relaxed"><strong>Legal Requirements:</strong> When required by law, court order, or other legal processes</li>
            <li className="leading-relaxed"><strong>Business Protection:</strong> To protect the rights, property, or safety of our organization, users, or others</li>
            <li className="leading-relaxed"><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">7. Third-Party Services</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Google OAuth</h3>
          <p className="mb-4 leading-relaxed">
            We use Google OAuth 2.0 for authentication. When you sign in with Google, Google's privacy policy applies to the authentication process. Please review <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google's Privacy Policy</a> for more information.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 Supabase</h3>
          <p className="mb-4 leading-relaxed">
            We use Supabase for database hosting and backend services. Please review <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Supabase's Privacy Policy</a> for information about how they handle data.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">8. Your Rights and Choices</h2>
          <p className="mb-4 leading-relaxed">Depending on your location, you may have certain rights regarding your personal information:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><strong>Access:</strong> Request access to the personal information we hold about you</li>
            <li className="leading-relaxed"><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li className="leading-relaxed"><strong>Deletion:</strong> Request deletion of your personal information (subject to business record retention requirements)</li>
            <li className="leading-relaxed"><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
            <li className="leading-relaxed"><strong>Objection:</strong> Object to certain processing of your personal information</li>
            <li className="leading-relaxed"><strong>Withdrawal of Consent:</strong> Withdraw consent for processing where consent is the legal basis</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            To exercise any of these rights, please contact us using the contact information provided below. Please note that as an internal business system, some data may be retained for legitimate business purposes or legal compliance requirements.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">9. Data for Business Purposes</h2>
          <p className="mb-4 leading-relaxed">
            GoParts is a business tool designed for procurement and inventory management. The data you enter (parts, suppliers, orders, quotes) is business data necessary for organizational operations. This data is retained for business record-keeping, audit trails, financial reporting, and supplier relationship management.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">10. Children's Privacy</h2>
          <p className="mb-4 leading-relaxed">
            GoParts is a business application intended for use by authorized business personnel. We do not knowingly collect information from individuals under the age of 18. If you believe we have inadvertently collected such information, please contact us immediately.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">11. International Data Transfers</h2>
          <p className="mb-4 leading-relaxed">
            Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using GoParts, you consent to the transfer of your information to these locations.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">12. Changes to This Privacy Policy</h2>
          <p className="mb-4 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by updating the "Last Updated" date at the top of this policy and, where appropriate, providing additional notice through the application.
          </p>
          <p className="mb-4 leading-relaxed">
            Your continued use of GoParts after any changes to this Privacy Policy constitutes your acceptance of the updated policy.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">13. Contact Us</h2>
          <p className="mb-4 leading-relaxed">If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:</p>
          <div className="bg-gray-50 border-l-4 border-blue-600 p-6 my-6 rounded">
            <p className="mb-2 leading-relaxed"><strong>Email:</strong> <a href="mailto:accounts@go-parts.com.au" className="text-blue-600 hover:text-blue-800">accounts@go-parts.com.au</a></p>
            <p className="leading-relaxed"><strong>Subject Line:</strong> GoParts Privacy Policy Inquiry</p>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">14. Acceptance of This Policy</h2>
          <p className="mb-4 leading-relaxed">
            By using GoParts, you signify your acceptance of this Privacy Policy. If you do not agree to this policy, please do not use the application. Your continued use following the posting of changes to this policy will be deemed your acceptance of those changes.
          </p>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <p className="text-gray-600 text-sm">&copy; 2026 GoParts. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                Application
              </Link>
              <Link to="/privacy-policy" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
