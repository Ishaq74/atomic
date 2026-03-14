import type { LegalTranslations } from '../config';

export default {
  meta: {
    title: 'Legal Notice – KLAN',
    description: 'Legal notice, privacy policy and terms of sale for KLAN.',
  },
  eyebrow: 'Required',
  heading: 'Legal Notice',
  sections: [
    {
      title: 'Legal Notice',
      intro: 'In accordance with the provisions of Law No. 2004-575 of June 21, 2004 on confidence in the digital economy, we wish to inform you of the identity of the parties involved in the creation and management of the KLAN website.',
      items: [
        {
          question: 'Website Identity',
          answer: 'The KLAN website is published by KLAN SAS, a simplified joint-stock company with a capital of €10,000, registered with the Trade and Companies Register under number RCS XXXXX, headquartered at 123 Rue de l\'Exemple, 75000 Paris, France.',
        },
        {
          question: 'Hosting',
          answer: 'The website is hosted by Vercel Inc., located at 340 S Lemon Ave #4133, Walnut, CA 91789, United States.',
        },
        {
          question: 'Publication Director',
          answer: 'The Publication Director of the website is Mr./Mrs. [Name of publication director].',
        },
        {
          question: 'Contact Us',
          answer: 'By email: contact@klan.fr\nBy mail: KLAN SAS, 123 Rue de l\'Exemple, 75000 Paris, France.',
        },
        {
          question: 'Personal Data',
          answer: 'The processing of your personal data is governed by our Privacy Policy, available in the "Privacy Policy" section, in accordance with the General Data Protection Regulation 2016/679 of April 27, 2016 ("GDPR").',
        },
        {
          question: 'Disputes',
          answer: 'In the event of a dispute between the professional and the consumer, they will endeavor to find an amicable solution. Failing an amicable agreement, the consumer may refer the matter free of charge to the consumer mediator within one year of the written complaint addressed to the professional.',
        },
      ],
    },
    {
      title: 'Privacy Policy',
      items: [
        {
          question: 'Company Information',
          answer: 'KLAN SAS, located at 123 Rue de l\'Exemple, 75000 Paris, France, is responsible for the processing of personal data collected on this website.',
        },
        {
          question: 'Collection of Personal Data',
          answer: 'We collect personal data such as name, email address, postal address, etc., solely for the purpose of providing our services and products, and with the explicit consent of the user.',
        },
        {
          question: 'Purpose of Data Collection',
          answer: 'Personal data collected is used to provide our services, process orders, improve our website and products, and communicate with our users.',
        },
        {
          question: 'Consent',
          answer: 'By using this website, you consent to the collection and processing of your personal data in accordance with our privacy policy.',
        },
        {
          question: 'Data Usage',
          answer: 'Personal data is used solely for the purposes specified at the time of collection and is protected in accordance with applicable data protection laws.',
        },
        {
          question: 'Data Sharing',
          answer: 'We do not share your personal data with third parties, except in cases provided by law or with your explicit consent.',
        },
        {
          question: 'User Rights',
          answer: 'You have the right to access, correct, delete, and object to the processing of your personal data. To exercise these rights, please contact us at contact@klan.fr.',
        },
        {
          question: 'Cookies and Online Tracking',
          answer: 'This website uses cookies and other tracking technologies to improve your browsing experience and to collect information about how you use the site.',
        },
        {
          question: 'Privacy Policy Updates',
          answer: 'This privacy policy may be updated periodically to reflect changes in our privacy practices. Any significant changes will be clearly indicated on this page.',
        },
      ],
    },
    {
      title: 'Terms of Sale',
      items: [
        {
          question: 'Scope of Application',
          answer: 'These Terms of Sale apply to all orders placed by the customer (hereinafter referred to as "the Customer") from KLAN SAS (hereinafter referred to as "the Seller") via the website klan.fr.',
        },
        {
          question: 'Orders',
          answer: 'The Customer may place orders via the website klan.fr. Any order implies express and unreserved acceptance of these Terms of Sale.',
        },
        {
          question: 'Prices',
          answer: 'Product prices are indicated in euros including all taxes (TTC). The Seller reserves the right to modify prices at any time, but products will be invoiced at the rates in effect at the time of order validation.',
        },
        {
          question: 'Payment',
          answer: 'Payment is made online by credit card or any other secure payment method accepted by the Seller. The order will only be processed after receipt of payment.',
        },
        {
          question: 'Delivery',
          answer: 'Products will be delivered to the address indicated by the Customer during the order. Delivery times are given as an indication and may vary depending on the delivery location and product availability.',
        },
        {
          question: 'Right of Withdrawal',
          answer: 'In accordance with current legislation, the Customer has 14 days to exercise the right of withdrawal from receipt of the products, without having to justify reasons or pay penalties.',
        },
        {
          question: 'Warranty',
          answer: 'Products sold are subject to the legal guarantee of conformity and the guarantee against hidden defects as provided by law. In the event of non-conformity or hidden defect, the Customer may choose between repair, replacement, or refund.',
        },
        {
          question: 'Liability',
          answer: 'The Seller shall not be held liable for direct or indirect damages caused by the use of products sold. The Seller\'s liability is limited to the amount of the order.',
        },
        {
          question: 'Disputes',
          answer: 'In the event of a dispute, an amicable solution will be sought as a priority. Failing an amicable agreement, the dispute will be submitted to the competent courts.',
        },
      ],
    },
  ],
} satisfies LegalTranslations;
