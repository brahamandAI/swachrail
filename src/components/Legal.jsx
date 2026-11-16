import { PoweredBy } from './BrandLogo.jsx'

const CONTACT = {
  company: 'Robustrix IT Solution Pvt Ltd',
  email: 'info@therobustrix.com',
  phone: '9090020245',
  product: 'SwachhRail AI',
}

function Shell({ title, updated, children }) {
  return (
    <section className="legal">
      <a className="btn ghost" href="#">← Home</a>
      <p className="k">{CONTACT.product}</p>
      <h1>{title}</h1>
      <p className="sub">Last updated: {updated}</p>
      <div className="legal-body card flat">{children}</div>
      <footer className="legal-foot">
        <PoweredBy />
        <p>
          <a href="mailto:info@therobustrix.com">{CONTACT.email}</a>
          {' · '}
          <a href="#privacy">Privacy Policy</a>
          {' · '}
          <a href="#terms">Terms &amp; Conditions</a>
        </p>
      </footer>
    </section>
  )
}

export function PrivacyPolicy() {
  return (
    <Shell title="Privacy Policy" updated="5 November 2026">
      <p>
        This Privacy Policy explains how <b>{CONTACT.company}</b> (“we”, “us”, “our”) collects, uses,
        stores and shares information when you use <b>{CONTACT.product}</b> (the website, feedback app,
        admin panel and related services).
      </p>

      <h2>1. Who we are</h2>
      <p>
        {CONTACT.product} is operated by {CONTACT.company}. For privacy questions contact us at{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or phone {CONTACT.phone}.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <b>Account data:</b> name, username, password (stored as a secure hash), role and assigned station
          for administrators and staff.
        </li>
        <li>
          <b>Operational records:</b> passenger / TTE feedback, PNR (when provided), mobile number (when provided),
          train and coach details, cleanliness grading, comments and photos.
        </li>
        <li>
          <b>Attendance and field work:</b> staff name, duty round (Start / Mid / End), train number, camera photos,
          and location (coordinates with place name) when attendance or geo-tagged reports are saved.
        </li>
        <li>
          <b>Device and usage:</b> basic technical data needed to run the service (for example browser session
          cookies for signed-in users, and install / PWA storage if you add the app to your home screen).
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>To run railway cleanliness, feedback, attendance, photo and inspection workflows.</li>
        <li>To show station dashboards, score cards, alerts and reports to authorised users.</li>
        <li>To verify sign-in, protect accounts and prevent misuse.</li>
        <li>To improve reliability and support of {CONTACT.product}.</li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>4. Legal basis / purpose</h2>
      <p>
        We process data to provide the service you (or your organisation) asked for, to meet operational
        cleanliness reporting needs, and where required to protect the security of the platform.
      </p>

      <h2>5. Sharing</h2>
      <p>
        Records are available to authenticated staff and administrators for the relevant station or as
        configured by the administrator. Public cleanliness board views show limited feedback information
        with PNR and phone masked where applicable. We may use infrastructure providers (for example hosting
        and database services) strictly to operate the product. We may disclose information if required by law
        or lawful authority.
      </p>

      <h2>6. Photos and location</h2>
      <p>
        Camera photos and location are collected only when you (or staff) submit a feature that needs them,
        such as feedback photos or attendance. Location is used to record where the duty action was taken
        and may be shown as a place name to authorised users.
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep operational records for as long as needed for cleanliness monitoring, audits and reporting,
        or until an authorised administrator deletes them, unless a longer period is required by law or
        contract with the railway / client organisation.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard measures such as hashed passwords, session cookies and access controls.
        No method of transmission or storage is completely secure; please keep your login details confidential.
      </p>

      <h2>9. Your choices</h2>
      <ul>
        <li>Staff and admins can request correction or deletion of account data through the administrator or by emailing us.</li>
        <li>You may skip optional fields (for example passenger PNR, phone or photo) where the app allows Skip.</li>
        <li>You can deny camera or location permission; some features will then be unavailable.</li>
      </ul>

      <h2>10. Children</h2>
      <p>
        {CONTACT.product} is intended for railway operations and adult users. It is not directed at children under 13.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy from time to time. The “Last updated” date above will change when we do.
        Continued use of the service after an update means you accept the revised policy.
      </p>

      <h2>12. Contact</h2>
      <p>
        {CONTACT.company}<br />
        Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><br />
        Phone: {CONTACT.phone}
      </p>
    </Shell>
  )
}

export function TermsConditions() {
  return (
    <Shell title="Terms & Conditions" updated="5 November 2026">
      <p>
        These Terms &amp; Conditions (“Terms”) govern use of <b>{CONTACT.product}</b> provided by{' '}
        <b>{CONTACT.company}</b> (“we”, “us”, “our”). By accessing or using the website, feedback app,
        admin tools or related services, you agree to these Terms.
      </p>

      <h2>1. The service</h2>
      <p>
        {CONTACT.product} is a digital platform for railway cleanliness operations: passenger / TTE feedback,
        attendance, photo reports, inspections, score cards and related dashboards. Features may vary by
        role (public, staff, administrator).
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>Staff and administrator access requires a valid username and password issued or approved by the organisation’s administrator.</li>
        <li>You must provide accurate information and keep credentials secure. You are responsible for activity under your account.</li>
        <li>We may suspend or terminate access for misuse, security risk or breach of these Terms.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Submit false, abusive, unlawful or misleading records or photos.</li>
        <li>Attempt to access another user’s account, bypass security, scrape or overload the system.</li>
        <li>Upload malware or content that infringes others’ rights.</li>
        <li>Use the service for any purpose other than authorised railway / organisational cleanliness operations, except where a public feedback or board feature is expressly offered.</li>
      </ul>

      <h2>4. Operational data</h2>
      <p>
        Feedback, attendance, photos, grades and related entries are operational records. Authorised
        administrators may view, edit or delete entries as permitted by the product. Public board views may
        display limited, masked information.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The {CONTACT.product} name, software, design and documentation belong to {CONTACT.company} or its
        licensors. You receive a limited, non-exclusive right to use the service as provided. You must not
        copy, reverse engineer or resell the product except as allowed by law or a separate written agreement.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        The service may rely on hosting, databases, maps or other providers. Their availability can affect
        {CONTACT.product}. Links to third-party sites are not under our control.
      </p>

      <h2>7. Disclaimer</h2>
      <p>
        The service is provided on an “as is” and “as available” basis. We do not warrant uninterrupted or
        error-free operation. PNR checks in the app only validate format where stated; they do not confirm
        tickets with Indian Railways reservation systems unless separately integrated under a contract.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {CONTACT.company} is not liable for indirect, incidental,
        special or consequential damages, or loss of data, profits or business arising from use of the
        service. Our total liability for any claim relating to the service is limited to the fees paid to us
        for the service in the three months before the claim (or INR 1,000 if no fees apply), except where
        liability cannot be limited by law.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Personal and operational data is handled as described in our{' '}
        <a href="#privacy">Privacy Policy</a>.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms and the service features. Continued use after changes means you accept the
        updated Terms. The “Last updated” date shows the latest revision.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at the competent jurisdiction where{' '}
        {CONTACT.company} primarily operates shall have exclusive jurisdiction, subject to mandatory law.
      </p>

      <h2>12. Contact</h2>
      <p>
        {CONTACT.company}<br />
        Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><br />
        Phone: {CONTACT.phone}
      </p>
    </Shell>
  )
}

export function SiteFooter() {
  return (
    <footer>
      © 2026 SwachhRail AI · <PoweredBy as="span" className="inline-powered" />
      {' · '}
      <a href="mailto:info@therobustrix.com">info@therobustrix.com</a>
      <br />
      <a href="#privacy">Privacy Policy</a>
      {' · '}
      <a href="#terms">Terms &amp; Conditions</a>
    </footer>
  )
}
