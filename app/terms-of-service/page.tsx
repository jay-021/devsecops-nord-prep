"use client"

import { Header } from "@/components/header"
import { GlassCard } from "@/components/ui/glass-card"
import { FileText, CheckCircle, AlertTriangle, Shield } from "lucide-react"
import Link from "next/link"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-[#00BFFF] mx-auto" />
            <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-lg text-muted-foreground">
              Legal terms governing your use of ZenType
            </p>
            <p className="text-sm text-muted-foreground">
              Last Updated: November 15, 2025
            </p>
          </div>

          {/* Important Notice */}
          <GlassCard className="p-6 border-l-4 border-[#00BFFF]">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-[#00BFFF] flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Please Read Carefully</p>
                <p className="text-sm text-muted-foreground">
                  By creating an account or using ZenType, you agree to be bound by these Terms of Service and our{" "}
                  <Link href="/privacy-policy" className="text-[#00BFFF] hover:underline">
                    Privacy Policy
                  </Link>
                  . If you do not agree, please do not use our service.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* 1. Acceptance of Terms */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you and ZenType ("we," "us," "our") 
                regarding your use of the ZenType typing practice platform, including our website, applications, and related services 
                (collectively, the "Service").
              </p>
              <p>
                By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms 
                and our Privacy Policy. If you are using the Service on behalf of an organization, you represent that you have the 
                authority to bind that organization to these Terms.
              </p>
              <p>
                You must be at least 13 years old to use ZenType. If you are between 13 and 18 years old, you confirm that you have 
                obtained parental or guardian consent to use the Service.
              </p>
            </div>
          </GlassCard>

          {/* 2. User Accounts */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Account Creation</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>You may create an account using email/password or by signing in with Google OAuth</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>One person or entity may not maintain more than one free account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Account Security</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>You are responsible for all activities that occur under your account</li>
                <li>Use a strong, unique password and enable two-factor authentication when available</li>
                <li>Do not share your account credentials with others</li>
                <li>We are not liable for any loss or damage arising from unauthorized account access</li>
              </ul>
            </div>
          </GlassCard>

          {/* 3. Data Collection & Firebase Usage */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[#00BFFF]" />
              <h2 className="text-2xl font-semibold text-foreground">3. Data Collection & Firebase Usage</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Firebase Services</p>
              <p>
                ZenType uses Google Firebase services for authentication, data storage, and hosting. By using our Service, 
                you also agree to Firebase's terms and policies:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                  <a 
                    href="https://firebase.google.com/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BFFF] hover:underline"
                  >
                    Firebase Terms of Service
                  </a>
                </li>
                <li>
                  <a 
                    href="https://firebase.google.com/support/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BFFF] hover:underline"
                  >
                    Firebase Privacy and Security
                  </a>
                </li>
                <li>
                  <a 
                    href="https://firebase.google.com/terms/data-processing-terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BFFF] hover:underline"
                  >
                    Data Processing Terms (DPA)
                  </a>
                </li>
              </ul>

              <p className="font-medium text-foreground mt-4">Data We Collect</p>
              <p>
                For detailed information about data collection and processing, please review our{" "}
                <Link href="/privacy-policy" className="text-[#00BFFF] hover:underline">
                  Privacy Policy
                </Link>
                . In summary, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Account information (email, display name, profile data)</li>
                <li>Performance data (WPM scores, accuracy, test results)</li>
                <li>Technical data (IP address, browser information, device type)</li>
                <li>Usage data (features used, time spent, interaction patterns)</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Data Storage Location</p>
              <p>
                All personal data is stored in the European Union (europe-west1, Belgium) to ensure GDPR compliance. 
                Your data is protected by Firebase's security infrastructure and our own security measures.
              </p>
            </div>
          </GlassCard>

          {/* 4. AI-Generated Content & Third-Party AI Services */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. AI-Generated Content & Third-Party AI Services</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Google Gemini AI Integration</p>
              <p>
                ZenType offers AI-powered features (such as custom typing test generation) powered by <strong>Google Gemini AI</strong> 
                through Google Cloud Platform and Firebase services. When you use AI features:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Your AI requests (prompts, topics, preferences) are sent to Google's Gemini API for processing</li>
                <li>Google processes these requests according to their own{" "}
                  <a 
                    href="https://ai.google.dev/gemini-api/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BFFF] hover:underline"
                  >
                    Gemini API Terms of Service
                  </a>
                  {" "}and{" "}
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00BFFF] hover:underline"
                  >
                    Google Privacy Policy
                  </a>
                </li>
                <li>We store the AI-generated text results in our database to display in your typing tests</li>
                <li><strong>ZenType does not use your AI requests or generated content for training our own models</strong></li>
              </ul>

              <p className="font-medium text-foreground mt-4">Google's Use of AI Data</p>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm">
                  <strong>Important:</strong> While ZenType does not use your AI-generated content for any purpose other than 
                  providing the Service to you, <strong>Google may process and use your AI requests according to their own policies</strong>. 
                  As of our last review, Google's Gemini API may use prompts and generated content for service improvement and model training 
                  unless you are using a paid enterprise tier with specific data processing agreements.
                </p>
              </div>
              <p className="mt-2 text-sm">
                We have integrated Google Analytics and Firebase services (including AI features) under Google Cloud Platform's 
                standard terms. <strong>ZenType is not responsible for Google's data processing practices</strong> beyond what is 
                specified in our Data Processing Agreement with Google. If you have concerns about Google's use of AI data, 
                please review their policies directly or avoid using AI features.
              </p>

              <p className="font-medium text-foreground mt-4">Your Responsibilities for AI Content</p>
              <p>When using AI-powered features, you agree that:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>You will not use AI features to generate harmful, offensive, illegal, or inappropriate content</li>
                <li>You will not attempt to manipulate the AI to produce content that violates these Terms</li>
                <li>You are responsible for reviewing AI-generated content before using it in public tests</li>
                <li>You will not use AI features to impersonate others or create misleading content</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Content Moderation Rights</p>
              <p>
                We reserve the right to review, moderate, or remove any AI-generated content that violates these Terms or 
                is flagged by our community. <strong>We may suspend or permanently ban users who repeatedly abuse AI features 
                or generate inappropriate content</strong>, even if such content was produced by the AI model. You remain 
                responsible for all content created through your account.
              </p>
            </div>
          </GlassCard>

          {/* 5. User Conduct */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. User Conduct</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Acceptable Use</p>
              <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Use the Service in any way that violates applicable laws or regulations</li>
                <li>Impersonate or attempt to impersonate ZenType, our employees, other users, or any other person or entity</li>
                <li>Engage in any automated use of the system, such as using scripts or bots</li>
                <li>Interfere with, disrupt, or create an undue burden on the Service or its networks</li>
                <li>Attempt to gain unauthorized access to any portion of the Service or any other systems or networks</li>
                <li>Use the Service to transmit or distribute viruses, malware, or other malicious code</li>
                <li>Harass, abuse, or harm other users of the Service</li>
                <li>Upload, transmit, or distribute inappropriate, offensive, or unlawful content</li>
                <li>Manipulate test scores or leaderboards through cheating or exploits</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Consequences of Violations</p>
              <p>
                Violation of these conduct rules may result in immediate termination of your account without prior notice. 
                We reserve the right to take appropriate legal action, including reporting to law enforcement authorities.
              </p>

              <p className="font-medium text-foreground mt-4">Our Right to Moderate and Ban Users</p>
              <p>
                <strong>ZenType reserves the absolute right to suspend or permanently ban any user account at our sole discretion</strong> 
                for behavior that we determine to be:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>In violation of these Terms of Service or our community standards</li>
                <li>Harmful, abusive, or disrespectful to other users or our team</li>
                <li>Attempting to exploit, manipulate, or abuse any feature of the Service</li>
                <li>Creating inappropriate or offensive content (including via AI features)</li>
                <li>Repeatedly generating spam or low-quality content</li>
                <li>Detrimental to the integrity, security, or reputation of ZenType</li>
              </ul>
              <p className="mt-2">
                We are not required to provide warnings before banning users, and banned users may not appeal the decision. 
                Account bans are permanent and all associated data will be deleted in accordance with GDPR requirements.
              </p>
            </div>
          </GlassCard>

          {/* 6. Intellectual Property */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Our Intellectual Property</p>
              <p>
                The Service and its entire contents, features, and functionality (including but not limited to all information, 
                software, text, displays, images, video, audio, design, and the selection and arrangement thereof) are owned by 
                ZenType and are protected by copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <p className="font-medium text-foreground mt-4">Your Content</p>
              <p>
                When you create AI-generated typing tests or submit content to the Service:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>You retain ownership of any content you create</li>
                <li>You grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content 
                    within the Service (e.g., public test library)</li>
                <li>You represent that you have all necessary rights to grant this license</li>
                <li>We reserve the right to remove content that violates these Terms or is inappropriate</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Trademarks</p>
              <p>
                "ZenType" and our logo are trademarks of ZenType. You may not use these marks without our prior written permission.
              </p>
            </div>
          </GlassCard>

          {/* 7. Account Termination */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Account Termination</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Termination by You</p>
              <p>
                You may terminate your account at any time through the Settings page. Upon termination, your account and all 
                associated data will be permanently deleted within 24 hours in accordance with GDPR Article 17 (Right to Erasure). 
                This action cannot be undone.
              </p>

              <p className="font-medium text-foreground mt-4">Termination by Us</p>
              <p>
                We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, 
                without notice, for conduct that we believe:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Violates these Terms or our Privacy Policy</li>
                <li>Harms or could harm ZenType, other users, or third parties</li>
                <li>Violates applicable law or exposes us to legal liability</li>
                <li>Is otherwise inappropriate or harmful to the Service</li>
              </ul>

              <p className="font-medium text-foreground mt-4">Effect of Termination</p>
              <p>
                Upon termination of your account, your right to use the Service will immediately cease. All provisions of these 
                Terms that by their nature should survive termination shall survive, including intellectual property provisions, 
                disclaimers, indemnity, and limitations of liability.
              </p>
            </div>
          </GlassCard>

          {/* 8. Disclaimers */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Disclaimers</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-medium text-amber-400 mb-2">⚠️ Important Legal Notice</p>
                <p className="text-sm">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                  OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                  NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
                </p>
              </div>

              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>We do not warrant that the Service will be uninterrupted, secure, or error-free</li>
                <li>We do not warrant the accuracy, completeness, or usefulness of any content or information on the Service</li>
                <li>We do not guarantee that defects will be corrected or that the Service is free of viruses or harmful components</li>
                <li>You use the Service at your own risk</li>
                <li>We are not responsible for the conduct of any user, online or offline</li>
              </ul>
            </div>
          </GlassCard>

          {/* 9. Limitation of Liability */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZENTYPE, ITS AFFILIATES, OFFICERS, DIRECTORS, 
                EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
                <li>Damages resulting from your access to or use of (or inability to access or use) the Service</li>
                <li>Damages resulting from any conduct or content of third parties on the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>

              <p className="mt-4">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES EXCEED THE AMOUNT YOU HAVE PAID US IN THE PAST 
                TWELVE MONTHS, OR €100 (ONE HUNDRED EUROS), WHICHEVER IS GREATER.
              </p>

              <p className="mt-4 text-sm">
                Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations 
                may not apply to you. In such jurisdictions, our liability will be limited to the maximum extent permitted by law.
              </p>
            </div>
          </GlassCard>

          {/* 10. Indemnification */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Indemnification</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                You agree to defend, indemnify, and hold harmless ZenType, its affiliates, and their respective officers, directors, 
                employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, or expenses 
                (including reasonable attorneys' fees) arising out of or in any way connected with:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Your access to or use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights, including intellectual property or privacy rights</li>
                <li>Any content you submit or make available through the Service</li>
                <li>Your conduct in connection with the Service</li>
              </ul>
            </div>
          </GlassCard>

          {/* 11. Changes to Terms */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Changes to Terms</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We reserve the right to modify or replace these Terms at any time at our sole discretion. We will provide notice 
                of any material changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Posting the updated Terms on this page with a new "Last Updated" date</li>
                <li>Sending an email notification to the address associated with your account (for material changes)</li>
                <li>Displaying a prominent notice on the Service</li>
              </ul>

              <p className="mt-4">
                Your continued use of the Service after any changes to the Terms constitutes your acceptance of the new Terms. 
                If you do not agree to the new Terms, you must stop using the Service and may delete your account.
              </p>

              <p className="mt-4">
                We encourage you to review these Terms periodically to stay informed about our practices.
              </p>
            </div>
          </GlassCard>

          {/* 12. Governing Law & Dispute Resolution */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">12. Governing Law & Dispute Resolution</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Governing Law</p>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the European Union and Lithuania, 
                without regard to its conflict of law provisions. You agree to submit to the personal jurisdiction of the courts 
                located in Lithuania for the resolution of any disputes.
              </p>

              <p className="font-medium text-foreground mt-4">GDPR Rights</p>
              <p>
                If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the 
                General Data Protection Regulation (GDPR). Please see our{" "}
                <Link href="/privacy-policy" className="text-[#00BFFF] hover:underline">
                  Privacy Policy
                </Link>
                {" "}for more information.
              </p>

              <p className="font-medium text-foreground mt-4">Dispute Resolution</p>
              <p>
                In the event of any dispute arising from these Terms or your use of the Service, you agree to first attempt to 
                resolve the dispute informally by contacting us at Zen-type@outlook.com. If the dispute cannot be resolved informally 
                within 30 days, either party may pursue formal legal action.
              </p>
            </div>
          </GlassCard>

          {/* 13. Miscellaneous */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">13. Miscellaneous</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">Entire Agreement</p>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and ZenType regarding 
                the Service and supersede all prior agreements and understandings.
              </p>

              <p className="font-medium text-foreground mt-4">Severability</p>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated 
                to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
              </p>

              <p className="font-medium text-foreground mt-4">Waiver</p>
              <p>
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>

              <p className="font-medium text-foreground mt-4">Assignment</p>
              <p>
                You may not assign or transfer these Terms or your rights hereunder, in whole or in part, without our prior written 
                consent. We may assign these Terms at any time without notice or consent.
              </p>

              <p className="font-medium text-foreground mt-4">Third-Party Services</p>
              <p>
                The Service may contain links to third-party websites or services. We are not responsible for the content, privacy 
                policies, or practices of any third-party websites or services.
              </p>
            </div>
          </GlassCard>

          {/* 14. Contact Information */}
          <GlassCard className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">14. Contact Information</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="p-4 rounded-lg border border-border">
                <p><span className="font-semibold text-foreground">Email:</span> Zen-type@outlook.com</p>
                <p><span className="font-semibold text-foreground">Privacy Inquiries:</span> Zen-type@outlook.com</p>
                <p><span className="font-semibold text-foreground">Location:</span> European Union (Lithuania)</p>
              </div>
            </div>
          </GlassCard>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground space-y-2 pt-8 border-t border-border">
            <p>
              By using ZenType, you acknowledge that you have read and understood these Terms of Service.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/privacy-policy" className="text-[#00BFFF] hover:underline">
                Privacy Policy
              </Link>
              <Link href="/settings/privacy" className="text-[#00BFFF] hover:underline">
                Privacy Settings
              </Link>
              <a href="mailto:Zen-type@outlook.com" className="text-[#00BFFF] hover:underline">
                Contact ZenType
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
