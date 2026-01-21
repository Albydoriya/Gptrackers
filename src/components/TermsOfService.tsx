import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600 text-sm italic">Last Updated: January 21, 2026</p>
        </header>

        <section className="bg-white rounded-xl shadow-md p-10 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
          <p className="mb-4 leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of GoParts, an internal procurement and parts management system. By accessing or using GoParts, you agree to be bound by these Terms and our Privacy Policy.
          </p>
          <p className="mb-4 leading-relaxed">
            If you do not agree to these Terms, you must not access or use the application. We reserve the right to modify these Terms at any time, and your continued use of GoParts following any changes constitutes acceptance of those changes.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">2. Description of Service</h2>
          <p className="mb-4 leading-relaxed">
            GoParts is an invitation-only business application designed to help authorized personnel manage:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Parts inventory and specifications</li>
            <li className="leading-relaxed">Supplier information and relationships</li>
            <li className="leading-relaxed">Purchase orders and order tracking</li>
            <li className="leading-relaxed">Quote requests and supplier quotes</li>
            <li className="leading-relaxed">Pricing information and cost analysis</li>
            <li className="leading-relaxed">Parts categories and organization</li>
            <li className="leading-relaxed">Exchange rates and international pricing</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            The service is provided for internal business use only and is not intended for public or consumer use.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">3. Eligibility and Account Access</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Invitation-Only Access</h3>
          <p className="mb-4 leading-relaxed">
            GoParts is an invitation-only system. Access is granted only to individuals whose email addresses have been pre-approved and added to the authorized users list by system administrators. You may not use the application unless your email address has been explicitly authorized.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Google OAuth Authentication</h3>
          <p className="mb-4 leading-relaxed">
            You must authenticate using Google OAuth with an authorized email address. By using Google OAuth, you agree to comply with Google's Terms of Service. You are responsible for maintaining the security of your Google account credentials.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Account Responsibilities</h3>
          <p className="mb-4 leading-relaxed">You agree to:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Provide accurate and complete information</li>
            <li className="leading-relaxed">Maintain the security of your account</li>
            <li className="leading-relaxed">Not share your account access with unauthorized individuals</li>
            <li className="leading-relaxed">Notify us immediately of any unauthorized access or security breaches</li>
            <li className="leading-relaxed">Accept responsibility for all activities that occur under your account</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">4. Acceptable Use Policy</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Permitted Uses</h3>
          <p className="mb-4 leading-relaxed">You may use GoParts only for legitimate business purposes related to:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Managing parts inventory and procurement activities</li>
            <li className="leading-relaxed">Tracking suppliers and supplier relationships</li>
            <li className="leading-relaxed">Creating and managing orders and quotes</li>
            <li className="leading-relaxed">Analyzing pricing and cost data</li>
            <li className="leading-relaxed">Collaborating with authorized colleagues on procurement tasks</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Prohibited Uses</h3>
          <p className="mb-4 leading-relaxed">You agree NOT to:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Use the application for any unlawful purpose or in violation of any applicable laws</li>
            <li className="leading-relaxed">Access or attempt to access accounts or data you are not authorized to access</li>
            <li className="leading-relaxed">Interfere with or disrupt the application or servers/networks connected to the application</li>
            <li className="leading-relaxed">Attempt to bypass security measures or authentication mechanisms</li>
            <li className="leading-relaxed">Use automated systems (bots, scrapers) to access the application without authorization</li>
            <li className="leading-relaxed">Reverse engineer, decompile, or disassemble any part of the application</li>
            <li className="leading-relaxed">Remove or modify any copyright, trademark, or other proprietary notices</li>
            <li className="leading-relaxed">Share, sell, or distribute access to the application to unauthorized individuals</li>
            <li className="leading-relaxed">Upload or transmit viruses, malware, or other malicious code</li>
            <li className="leading-relaxed">Use the application in any manner that could damage, disable, or impair the service</li>
            <li className="leading-relaxed">Harvest or collect user information without consent</li>
            <li className="leading-relaxed">Impersonate any person or entity or misrepresent your affiliation</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">5. Intellectual Property Rights</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Application Ownership</h3>
          <p className="mb-4 leading-relaxed">
            GoParts, including all software, design, text, graphics, logos, and other content (excluding user-generated content), is owned by or licensed to us and is protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Limited License</h3>
          <p className="mb-4 leading-relaxed">
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use GoParts for internal business purposes only. This license does not include any right to:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Modify, copy, or create derivative works of the application</li>
            <li className="leading-relaxed">Distribute, sell, lease, or sublicense the application</li>
            <li className="leading-relaxed">Use the application for commercial purposes outside your organization</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 User-Generated Content</h3>
          <p className="mb-4 leading-relaxed">
            You retain ownership of any data, information, or content you input into GoParts (parts data, supplier information, orders, quotes, etc.). By using the application, you grant us a license to use, store, and process this content solely for the purpose of providing the service to you and your organization.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">6. Data Accuracy and Responsibility</h2>
          <p className="mb-4 leading-relaxed">You are responsible for:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">The accuracy and completeness of data you enter into the system</li>
            <li className="leading-relaxed">Verifying information before making business decisions based on application data</li>
            <li className="leading-relaxed">Maintaining proper documentation and backup copies of critical business information</li>
            <li className="leading-relaxed">Regularly reviewing and updating data to ensure accuracy</li>
            <li className="leading-relaxed">Compliance with your organization's procurement policies and procedures</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            While we strive to provide accurate exchange rates and pricing calculations, you are responsible for verifying all financial information before completing transactions or making business commitments.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">7. Service Availability and Modifications</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Service Availability</h3>
          <p className="mb-4 leading-relaxed">
            We strive to provide reliable access to GoParts, but we do not guarantee uninterrupted or error-free service. The application may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 Modifications to Service</h3>
          <p className="mb-4 leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any aspect of GoParts at any time, with or without notice. We may also impose limits on certain features or restrict access to parts or all of the application without liability.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">8. Disclaimers and Limitation of Liability</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.1 "As Is" Disclaimer</h3>
          <p className="mb-4 leading-relaxed">
            GOPARTS IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
          </p>
          <p className="mb-4 leading-relaxed">We do not warrant that:</p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">The application will meet your specific requirements</li>
            <li className="leading-relaxed">The service will be uninterrupted, timely, secure, or error-free</li>
            <li className="leading-relaxed">Results obtained from use of the application will be accurate or reliable</li>
            <li className="leading-relaxed">Any errors in the application will be corrected</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.2 Limitation of Liability</h3>
          <p className="mb-4 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Your access to or use of or inability to access or use the application</li>
            <li className="leading-relaxed">Any conduct or content of any third party on the application</li>
            <li className="leading-relaxed">Unauthorized access, use, or alteration of your content or data</li>
            <li className="leading-relaxed">Business decisions made based on information in the application</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            Our total liability for any claims under these Terms shall not exceed the amount paid by you (if any) to access the application in the twelve months preceding the claim.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">9. Indemnification</h2>
          <p className="mb-4 leading-relaxed">
            You agree to indemnify, defend, and hold harmless our organization, its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Your use of or inability to use GoParts</li>
            <li className="leading-relaxed">Your violation of these Terms</li>
            <li className="leading-relaxed">Your violation of any rights of another party</li>
            <li className="leading-relaxed">Your breach of applicable laws or regulations</li>
            <li className="leading-relaxed">Any data or content you submit or transmit through the application</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">10. Third-Party Services</h2>
          <p className="mb-4 leading-relaxed">
            GoParts integrates with third-party services including Google OAuth for authentication and Supabase for data storage. Your use of these services is subject to their respective terms of service and privacy policies:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed"><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google Terms of Service</a></li>
            <li className="leading-relaxed"><a href="https://supabase.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Supabase Terms of Service</a></li>
          </ul>
          <p className="mb-4 leading-relaxed">
            We are not responsible for the practices or policies of these third-party services.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">11. Termination</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.1 Termination by Us</h3>
          <p className="mb-4 leading-relaxed">
            We reserve the right to terminate or suspend your access to GoParts immediately, without prior notice or liability, for any reason, including but not limited to:
          </p>
          <ul className="mb-6 ml-6 space-y-2">
            <li className="leading-relaxed">Violation of these Terms</li>
            <li className="leading-relaxed">Fraudulent, abusive, or illegal activity</li>
            <li className="leading-relaxed">Your email address being removed from the authorized users list</li>
            <li className="leading-relaxed">Termination of employment or business relationship</li>
            <li className="leading-relaxed">Extended period of inactivity</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.2 Effect of Termination</h3>
          <p className="mb-4 leading-relaxed">
            Upon termination, your right to use GoParts will immediately cease. Data you entered may be retained according to business record retention requirements and our Privacy Policy. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">12. Data Backup and Export</h2>
          <p className="mb-4 leading-relaxed">
            While we implement backup procedures for disaster recovery, you are encouraged to maintain your own records and backups of critical business information. We may provide data export functionality, but we are not responsible for data loss that occurs due to circumstances beyond our control.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">13. Governing Law and Dispute Resolution</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">13.1 Governing Law</h3>
          <p className="mb-4 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of Australia, without regard to its conflict of law provisions.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">13.2 Dispute Resolution</h3>
          <p className="mb-4 leading-relaxed">
            Any disputes arising out of or relating to these Terms or your use of GoParts shall be resolved through:
          </p>
          <ol className="mb-6 ml-6 space-y-2 list-decimal">
            <li className="leading-relaxed">Informal negotiation between the parties</li>
            <li className="leading-relaxed">If informal negotiation fails, binding arbitration in Australia</li>
            <li className="leading-relaxed">Small claims court for disputes that qualify</li>
          </ol>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">13.3 Class Action Waiver</h3>
          <p className="mb-4 leading-relaxed">
            Any proceedings to resolve disputes will be conducted on an individual basis. You agree not to bring claims as a plaintiff or class member in any class or representative action.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">14. General Provisions</h2>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14.1 Entire Agreement</h3>
          <p className="mb-4 leading-relaxed">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding your use of GoParts and supersede all prior agreements and understandings.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14.2 Severability</h3>
          <p className="mb-4 leading-relaxed">
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14.3 Waiver</h3>
          <p className="mb-4 leading-relaxed">
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14.4 Assignment</h3>
          <p className="mb-4 leading-relaxed">
            You may not assign or transfer these Terms or your rights under these Terms without our prior written consent. We may assign these Terms without restriction.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14.5 Force Majeure</h3>
          <p className="mb-4 leading-relaxed">
            We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including acts of God, natural disasters, war, terrorism, labor disputes, or internet/telecommunications failures.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">15. Contact Information</h2>
          <p className="mb-4 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-gray-50 border-l-4 border-blue-600 p-6 my-6 rounded">
            <p className="mb-2 leading-relaxed"><strong>Email:</strong> <a href="mailto:accounts@go-parts.com.au" className="text-blue-600 hover:text-blue-800">accounts@go-parts.com.au</a></p>
            <p className="leading-relaxed"><strong>Subject Line:</strong> GoParts Terms of Service Inquiry</p>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">16. Acknowledgment</h2>
          <p className="mb-4 leading-relaxed">
            BY USING GOPARTS, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT USE THE APPLICATION.
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

export default TermsOfService;
