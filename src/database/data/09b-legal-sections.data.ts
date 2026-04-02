// Legal page sections seed — one FAQ section per tab × locale.
// Each row maps to a pageSections entry whose content is a JSON FaqSection.
//
// Content schema: { title: string; intro?: string; items: { question: string; answer: string; }[] }

const PAGE_FR = '00000000-0000-4000-a000-legal00000fr';
const PAGE_EN = '00000000-0000-4000-a000-legal00000en';
const PAGE_ES = '00000000-0000-4000-a000-legal00000es';
const PAGE_AR = '00000000-0000-4000-a000-legal00000ar';

export default [
  // ══════════════════════════════════════════════════════════════════════════
  // FR — Mentions Légales
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: '10000000-0000-4000-a000-legalfr00001',
    pageId: PAGE_FR,
    type: 'faq',
    sortOrder: 0,
    isVisible: true,
    content: JSON.stringify({
      title: 'Mentions Légales',
      intro: "Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance en l'économie numérique, nous tenons à vous informer de l'identité des différents intervenants impliqués dans la réalisation et le suivi du site KLAN.",
      items: [
        { question: 'Identité du Site', answer: "Le site KLAN est édité par la société KLAN SAS, société par actions simplifiée au capital de 10 000 €, immatriculée au Registre du Commerce et des Sociétés sous le numéro RCS XXXXX, dont le siège social est situé au 123 Rue de l'Exemple, 75000 Paris, France." },
        { question: 'Hébergement', answer: 'Le site est hébergé par la société Vercel Inc., située au 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.' },
        { question: 'Directeur de publication', answer: 'Le Directeur de la publication du site est M./Mme [Nom du directeur de publication].' },
        { question: 'Nous contacter', answer: "Par email : contact@klan.fr\nPar courrier : KLAN SAS, 123 Rue de l'Exemple, 75000 Paris, France." },
        { question: 'Données personnelles', answer: 'Le traitement de vos données à caractère personnel est régi par notre Politique de Confidentialité, disponible dans la section « Politique de Confidentialité », conformément au Règlement Général sur la Protection des Données 2016/679 du 27 avril 2016 (« RGPD »).' },
        { question: 'Litiges', answer: "En cas de litige entre le professionnel et le consommateur, ceux-ci s'efforceront de trouver une solution amiable. À défaut d'accord amiable, le consommateur a la possibilité de saisir gratuitement le médiateur de la consommation dont relève le professionnel, dans un délai d'un an à compter de la réclamation écrite adressée au professionnel." },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalfr00002',
    pageId: PAGE_FR,
    type: 'faq',
    sortOrder: 1,
    isVisible: true,
    content: JSON.stringify({
      title: 'Politique de Confidentialité',
      items: [
        { question: "Informations sur l'entreprise", answer: "L'entreprise KLAN SAS, située au 123 Rue de l'Exemple, 75000 Paris, France, est responsable du traitement des données personnelles collectées sur ce site." },
        { question: 'Collecte des données personnelles', answer: "Nous collectons des données personnelles telles que le nom, l'adresse e-mail, l'adresse postale, etc., uniquement dans le cadre de la fourniture de nos services et produits, et avec le consentement explicite de l'utilisateur." },
        { question: 'But de la collecte des données', answer: 'Les données personnelles collectées sont utilisées dans le but de fournir nos services, de traiter les commandes, d\'améliorer notre site et nos produits, et de communiquer avec nos utilisateurs.' },
        { question: 'Consentement', answer: 'En utilisant ce site, vous consentez à la collecte et au traitement de vos données personnelles conformément à notre politique de confidentialité.' },
        { question: 'Utilisation des données', answer: 'Les données personnelles sont utilisées uniquement aux fins spécifiées lors de la collecte et sont protégées conformément aux lois sur la protection des données en vigueur.' },
        { question: 'Partage des données', answer: 'Nous ne partageons pas vos données personnelles avec des tiers, sauf dans les cas prévus par la loi ou avec votre consentement explicite.' },
        { question: 'Droits des utilisateurs', answer: "Vous avez le droit d'accéder à vos données personnelles, de les corriger, de les supprimer et de vous opposer à leur traitement. Pour exercer ces droits, veuillez nous contacter à contact@klan.fr." },
        { question: 'Cookies et suivi en ligne', answer: "Ce site utilise des cookies et d'autres technologies de suivi pour améliorer votre expérience de navigation et pour collecter des informations sur la manière dont vous utilisez le site." },
        { question: 'Mises à jour de la politique de confidentialité', answer: 'Cette politique de confidentialité peut être mise à jour périodiquement pour refléter les changements dans nos pratiques en matière de confidentialité. Toute modification importante sera clairement indiquée sur cette page.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalfr00003',
    pageId: PAGE_FR,
    type: 'faq',
    sortOrder: 2,
    isVisible: true,
    content: JSON.stringify({
      title: 'Conditions Générales de Vente',
      items: [
        { question: "Champ d'application", answer: "Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les commandes passées par le client (ci-après dénommé « le Client ») auprès de KLAN SAS (ci-après dénommé « le Vendeur ») via le site web klan.fr." },
        { question: 'Commandes', answer: "Le Client peut passer commande via le site web klan.fr. Toute commande implique l'acceptation expresse et sans réserve des présentes CGV." },
        { question: 'Prix', answer: 'Les prix des produits sont indiqués en euros toutes taxes comprises (TTC). Le Vendeur se réserve le droit de modifier ses prix à tout moment, mais les produits seront facturés sur la base des tarifs en vigueur au moment de la validation de la commande.' },
        { question: 'Paiement', answer: "Le paiement s'effectue en ligne par carte bancaire ou tout autre moyen de paiement sécurisé accepté par le Vendeur. La commande ne sera traitée qu'après réception du paiement." },
        { question: 'Livraison', answer: "Les produits seront livrés à l'adresse indiquée par le Client lors de la commande. Les délais de livraison sont donnés à titre indicatif et peuvent varier en fonction du lieu de livraison et de la disponibilité des produits." },
        { question: 'Droit de rétractation', answer: "Conformément à la législation en vigueur, le Client dispose d'un délai de 14 jours pour exercer son droit de rétractation à compter de la réception des produits, sans avoir à justifier de motifs ni à payer de pénalités." },
        { question: 'Garantie', answer: 'Les produits vendus sont soumis à la garantie légale de conformité et à la garantie des vices cachés prévues par la loi. En cas de non-conformité ou de vice caché, le Client peut choisir entre la réparation, le remplacement ou le remboursement du produit.' },
        { question: 'Responsabilité', answer: "Le Vendeur ne saurait être tenu pour responsable des dommages directs ou indirects causés par l'utilisation des produits vendus. La responsabilité du Vendeur est limitée au montant de la commande." },
        { question: 'Litiges', answer: "En cas de litige, une solution amiable sera recherchée en priorité. À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents." },
      ],
    }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // EN — Legal Notice
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: '10000000-0000-4000-a000-legalen00001',
    pageId: PAGE_EN,
    type: 'faq',
    sortOrder: 0,
    isVisible: true,
    content: JSON.stringify({
      title: 'Legal Notice',
      intro: 'In accordance with the provisions of Law No. 2004-575 of June 21, 2004 on confidence in the digital economy, we wish to inform you of the identity of the parties involved in the creation and management of the KLAN website.',
      items: [
        { question: 'Website Identity', answer: "The KLAN website is published by KLAN SAS, a simplified joint-stock company with a capital of €10,000, registered with the Trade and Companies Register under number RCS XXXXX, headquartered at 123 Rue de l'Exemple, 75000 Paris, France." },
        { question: 'Hosting', answer: 'The website is hosted by Vercel Inc., located at 340 S Lemon Ave #4133, Walnut, CA 91789, United States.' },
        { question: 'Publication Director', answer: 'The Publication Director of the website is Mr./Mrs. [Name of publication director].' },
        { question: 'Contact Us', answer: "By email: contact@klan.fr\nBy mail: KLAN SAS, 123 Rue de l'Exemple, 75000 Paris, France." },
        { question: 'Personal Data', answer: 'The processing of your personal data is governed by our Privacy Policy, available in the "Privacy Policy" section, in accordance with the General Data Protection Regulation 2016/679 of April 27, 2016 ("GDPR").' },
        { question: 'Disputes', answer: 'In the event of a dispute between the professional and the consumer, they will endeavor to find an amicable solution. Failing an amicable agreement, the consumer may refer the matter free of charge to the consumer mediator within one year of the written complaint addressed to the professional.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalen00002',
    pageId: PAGE_EN,
    type: 'faq',
    sortOrder: 1,
    isVisible: true,
    content: JSON.stringify({
      title: 'Privacy Policy',
      items: [
        { question: 'Company Information', answer: "KLAN SAS, located at 123 Rue de l'Exemple, 75000 Paris, France, is responsible for the processing of personal data collected on this website." },
        { question: 'Collection of Personal Data', answer: 'We collect personal data such as name, email address, postal address, etc., solely for the purpose of providing our services and products, and with the explicit consent of the user.' },
        { question: 'Purpose of Data Collection', answer: 'Personal data collected is used to provide our services, process orders, improve our website and products, and communicate with our users.' },
        { question: 'Consent', answer: 'By using this website, you consent to the collection and processing of your personal data in accordance with our privacy policy.' },
        { question: 'Data Usage', answer: 'Personal data is used solely for the purposes specified at the time of collection and is protected in accordance with applicable data protection laws.' },
        { question: 'Data Sharing', answer: 'We do not share your personal data with third parties, except in cases provided by law or with your explicit consent.' },
        { question: 'User Rights', answer: 'You have the right to access, correct, delete, and object to the processing of your personal data. To exercise these rights, please contact us at contact@klan.fr.' },
        { question: 'Cookies and Online Tracking', answer: 'This website uses cookies and other tracking technologies to improve your browsing experience and to collect information about how you use the site.' },
        { question: 'Privacy Policy Updates', answer: 'This privacy policy may be updated periodically to reflect changes in our privacy practices. Any significant changes will be clearly indicated on this page.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalen00003',
    pageId: PAGE_EN,
    type: 'faq',
    sortOrder: 2,
    isVisible: true,
    content: JSON.stringify({
      title: 'Terms of Sale',
      items: [
        { question: 'Scope of Application', answer: 'These Terms of Sale apply to all orders placed by the customer (hereinafter referred to as "the Customer") from KLAN SAS (hereinafter referred to as "the Seller") via the website klan.fr.' },
        { question: 'Orders', answer: 'The Customer may place orders via the website klan.fr. Any order implies express and unreserved acceptance of these Terms of Sale.' },
        { question: 'Prices', answer: 'Product prices are indicated in euros including all taxes (TTC). The Seller reserves the right to modify prices at any time, but products will be invoiced at the rates in effect at the time of order validation.' },
        { question: 'Payment', answer: 'Payment is made online by credit card or any other secure payment method accepted by the Seller. The order will only be processed after receipt of payment.' },
        { question: 'Delivery', answer: 'Products will be delivered to the address indicated by the Customer during the order. Delivery times are given as an indication and may vary depending on the delivery location and product availability.' },
        { question: 'Right of Withdrawal', answer: 'In accordance with current legislation, the Customer has 14 days to exercise the right of withdrawal from receipt of the products, without having to justify reasons or pay penalties.' },
        { question: 'Warranty', answer: 'Products sold are subject to the legal guarantee of conformity and the guarantee against hidden defects as provided by law. In the event of non-conformity or hidden defect, the Customer may choose between repair, replacement, or refund.' },
        { question: 'Liability', answer: "The Seller shall not be held liable for direct or indirect damages caused by the use of products sold. The Seller's liability is limited to the amount of the order." },
        { question: 'Disputes', answer: 'In the event of a dispute, an amicable solution will be sought as a priority. Failing an amicable agreement, the dispute will be submitted to the competent courts.' },
      ],
    }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ES — Aviso Legal
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: '10000000-0000-4000-a000-legales00001',
    pageId: PAGE_ES,
    type: 'faq',
    sortOrder: 0,
    isVisible: true,
    content: JSON.stringify({
      title: 'Aviso Legal',
      intro: 'De conformidad con las disposiciones de la Ley n° 2004-575 del 21 de junio de 2004 sobre la confianza en la economía digital, le informamos de la identidad de las diferentes partes involucradas en la creación y el seguimiento del sitio KLAN.',
      items: [
        { question: 'Identidad del Sitio', answer: "El sitio KLAN es editado por la empresa KLAN SAS, sociedad por acciones simplificada con un capital de 10.000 €, inscrita en el Registro Mercantil bajo el número RCS XXXXX, con domicilio social en 123 Rue de l'Exemple, 75000 París, Francia." },
        { question: 'Alojamiento', answer: 'El sitio está alojado por la empresa Vercel Inc., ubicada en 340 S Lemon Ave #4133, Walnut, CA 91789, Estados Unidos.' },
        { question: 'Director de publicación', answer: 'El Director de publicación del sitio es el Sr./Sra. [Nombre del director de publicación].' },
        { question: 'Contacto', answer: "Por correo electrónico: contact@klan.fr\nPor correo postal: KLAN SAS, 123 Rue de l'Exemple, 75000 París, Francia." },
        { question: 'Datos personales', answer: 'El tratamiento de sus datos personales se rige por nuestra Política de Privacidad, disponible en la sección « Política de Privacidad », de conformidad con el Reglamento General de Protección de Datos 2016/679 del 27 de abril de 2016 (« RGPD »).' },
        { question: 'Litigios', answer: 'En caso de litigio entre el profesional y el consumidor, ambos se esforzarán por encontrar una solución amistosa. A falta de acuerdo amistoso, el consumidor puede recurrir gratuitamente al mediador de consumo en un plazo de un año desde la reclamación escrita dirigida al profesional.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legales00002',
    pageId: PAGE_ES,
    type: 'faq',
    sortOrder: 1,
    isVisible: true,
    content: JSON.stringify({
      title: 'Política de Privacidad',
      items: [
        { question: 'Información de la empresa', answer: "La empresa KLAN SAS, ubicada en 123 Rue de l'Exemple, 75000 París, Francia, es responsable del tratamiento de los datos personales recogidos en este sitio." },
        { question: 'Recogida de datos personales', answer: 'Recogemos datos personales como el nombre, la dirección de correo electrónico, la dirección postal, etc., únicamente en el marco de la prestación de nuestros servicios y productos, y con el consentimiento explícito del usuario.' },
        { question: 'Finalidad de la recogida de datos', answer: 'Los datos personales recogidos se utilizan para proporcionar nuestros servicios, procesar pedidos, mejorar nuestro sitio y productos, y comunicarnos con nuestros usuarios.' },
        { question: 'Consentimiento', answer: 'Al utilizar este sitio, usted consiente la recogida y el tratamiento de sus datos personales de conformidad con nuestra política de privacidad.' },
        { question: 'Uso de los datos', answer: 'Los datos personales se utilizan únicamente para los fines especificados en el momento de la recogida y están protegidos de conformidad con las leyes de protección de datos vigentes.' },
        { question: 'Compartir datos', answer: 'No compartimos sus datos personales con terceros, salvo en los casos previstos por la ley o con su consentimiento explícito.' },
        { question: 'Derechos de los usuarios', answer: 'Tiene derecho a acceder a sus datos personales, corregirlos, suprimirlos y oponerse a su tratamiento. Para ejercer estos derechos, contáctenos en contact@klan.fr.' },
        { question: 'Cookies y seguimiento en línea', answer: 'Este sitio utiliza cookies y otras tecnologías de seguimiento para mejorar su experiencia de navegación y para recopilar información sobre cómo utiliza el sitio.' },
        { question: 'Actualizaciones de la política de privacidad', answer: 'Esta política de privacidad puede actualizarse periódicamente para reflejar los cambios en nuestras prácticas de privacidad. Cualquier modificación importante se indicará claramente en esta página.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legales00003',
    pageId: PAGE_ES,
    type: 'faq',
    sortOrder: 2,
    isVisible: true,
    content: JSON.stringify({
      title: 'Condiciones Generales de Venta',
      items: [
        { question: 'Ámbito de aplicación', answer: "Las presentes Condiciones Generales de Venta (CGV) se aplican a todos los pedidos realizados por el cliente (en adelante « el Cliente ») a KLAN SAS (en adelante « el Vendedor ») a través del sitio web klan.fr." },
        { question: 'Pedidos', answer: 'El Cliente puede realizar pedidos a través del sitio web klan.fr. Cualquier pedido implica la aceptación expresa y sin reservas de las presentes CGV.' },
        { question: 'Precios', answer: 'Los precios de los productos se indican en euros con todos los impuestos incluidos (IVA incluido). El Vendedor se reserva el derecho de modificar sus precios en cualquier momento, pero los productos se facturarán según las tarifas vigentes en el momento de la validación del pedido.' },
        { question: 'Pago', answer: 'El pago se realiza en línea con tarjeta bancaria o cualquier otro medio de pago seguro aceptado por el Vendedor. El pedido solo se procesará después de recibir el pago.' },
        { question: 'Entrega', answer: 'Los productos se entregarán en la dirección indicada por el Cliente durante el pedido. Los plazos de entrega se dan a título indicativo y pueden variar según el lugar de entrega y la disponibilidad de los productos.' },
        { question: 'Derecho de desistimiento', answer: 'De conformidad con la legislación vigente, el Cliente dispone de un plazo de 14 días para ejercer su derecho de desistimiento a partir de la recepción de los productos, sin tener que justificar motivos ni pagar penalizaciones.' },
        { question: 'Garantía', answer: 'Los productos vendidos están sujetos a la garantía legal de conformidad y a la garantía por vicios ocultos previstas por la ley. En caso de no conformidad o vicio oculto, el Cliente puede elegir entre la reparación, la sustitución o el reembolso del producto.' },
        { question: 'Responsabilidad', answer: 'El Vendedor no será responsable de los daños directos o indirectos causados por el uso de los productos vendidos. La responsabilidad del Vendedor se limita al importe del pedido.' },
        { question: 'Litigios', answer: 'En caso de litigio, se buscará prioritariamente una solución amistosa. A falta de acuerdo amistoso, el litigio se someterá a los tribunales competentes.' },
      ],
    }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AR — إشعار قانوني
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: '10000000-0000-4000-a000-legalar00001',
    pageId: PAGE_AR,
    type: 'faq',
    sortOrder: 0,
    isVisible: true,
    content: JSON.stringify({
      title: '\u0625\u0634\u0639\u0627\u0631 \u0642\u0627\u0646\u0648\u0646\u064a',
      intro: '\u0648\u0641\u0642\u064b\u0627 \u0644\u0623\u062d\u0643\u0627\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0631\u0642\u0645 2004-575 \u0627\u0644\u0645\u0624\u0631\u062e \u0641\u064a 21 \u064a\u0648\u0646\u064a\u0648 2004 \u0628\u0634\u0623\u0646 \u0627\u0644\u062b\u0642\u0629 \u0641\u064a \u0627\u0644\u0627\u0642\u062a\u0635\u0627\u062f \u0627\u0644\u0631\u0642\u0645\u064a\u060c \u0646\u0648\u062f \u0625\u0639\u0644\u0627\u0645\u0643\u0645 \u0628\u0647\u0648\u064a\u0629 \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0641\u064a \u0625\u0646\u0634\u0627\u0621 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0648\u0642\u0639 \u0643\u0644\u0627\u0646.',
      items: [
        { question: '\u0647\u0648\u064a\u0629 \u0627\u0644\u0645\u0648\u0642\u0639', answer: '\u0645\u0648\u0642\u0639 \u0643\u0644\u0627\u0646 \u062a\u062f\u064a\u0631\u0647 \u0634\u0631\u0643\u0629 KLAN SAS\u060c \u0648\u0647\u064a \u0634\u0631\u0643\u0629 \u0645\u0633\u0627\u0647\u0645\u0629 \u0645\u0628\u0633\u0637\u0629 \u0628\u0631\u0623\u0633\u0645\u0627\u0644 \u0642\u062f\u0631\u0647 10,000 \u064a\u0648\u0631\u0648\u060c \u0645\u0633\u062c\u0644\u0629 \u0641\u064a \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u062a\u062c\u0627\u0631\u064a \u062a\u062d\u062a \u0627\u0644\u0631\u0642\u0645 RCS XXXXX\u060c \u0648\u0645\u0642\u0631\u0647\u0627 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u064a \u0641\u064a 123 \u0634\u0627\u0631\u0639 \u0627\u0644\u0645\u062b\u0627\u0644\u060c 75000 \u0628\u0627\u0631\u064a\u0633\u060c \u0641\u0631\u0646\u0633\u0627.' },
        { question: '\u0627\u0644\u0627\u0633\u062a\u0636\u0627\u0641\u0629', answer: '\u064a\u064f\u0633\u062a\u0636\u0627\u0641 \u0627\u0644\u0645\u0648\u0642\u0639 \u0644\u062f\u0649 \u0634\u0631\u0643\u0629 Vercel Inc.\u060c \u0627\u0644\u0643\u0627\u0626\u0646\u0629 \u0641\u064a 340 S Lemon Ave #4133, Walnut, CA 91789\u060c \u0627\u0644\u0648\u0644\u0627\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u062d\u062f\u0629.' },
        { question: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0634\u0631', answer: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0634\u0631 \u0644\u0644\u0645\u0648\u0642\u0639 \u0647\u0648 \u0627\u0644\u0633\u064a\u062f/\u0627\u0644\u0633\u064a\u062f\u0629 [\u0627\u0633\u0645 \u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0634\u0631].' },
        { question: '\u0627\u062a\u0635\u0644 \u0628\u0646\u0627', answer: '\u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a: contact@klan.fr\n\u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f: KLAN SAS\u060c 123 \u0634\u0627\u0631\u0639 \u0627\u0644\u0645\u062b\u0627\u0644\u060c 75000 \u0628\u0627\u0631\u064a\u0633\u060c \u0641\u0631\u0646\u0633\u0627.' },
        { question: '\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629', answer: '\u062a\u062e\u0636\u0639 \u0645\u0639\u0627\u0644\u062c\u0629 \u0628\u064a\u0627\u0646\u0627\u062a\u0643\u0645 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0644\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0646\u0627\u060c \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0641\u064a \u0642\u0633\u0645 \u00ab \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u00bb\u060c \u0648\u0641\u0642\u064b\u0627 \u0644\u0644\u0627\u0626\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a 2016/679 \u0627\u0644\u0635\u0627\u062f\u0631\u0629 \u0641\u064a 27 \u0623\u0628\u0631\u064a\u0644 2016 (\u00ab GDPR \u00bb).' },
        { question: '\u0627\u0644\u0646\u0632\u0627\u0639\u0627\u062a', answer: '\u0641\u064a \u062d\u0627\u0644\u0629 \u0646\u0632\u0627\u0639 \u0628\u064a\u0646 \u0627\u0644\u0645\u0647\u0646\u064a \u0648\u0627\u0644\u0645\u0633\u062a\u0647\u0644\u0643\u060c \u064a\u0633\u0639\u0649 \u0627\u0644\u0637\u0631\u0641\u0627\u0646 \u0644\u0625\u064a\u062c\u0627\u062f \u062d\u0644 \u0648\u062f\u064a. \u0641\u064a \u062d\u0627\u0644 \u0639\u062f\u0645 \u0627\u0644\u062a\u0648\u0635\u0644 \u0625\u0644\u0649 \u0627\u062a\u0641\u0627\u0642 \u0648\u062f\u064a\u060c \u064a\u0645\u0643\u0646 \u0644\u0644\u0645\u0633\u062a\u0647\u0644\u0643 \u0627\u0644\u0644\u062c\u0648\u0621 \u0645\u062c\u0627\u0646\u064b\u0627 \u0625\u0644\u0649 \u0648\u0633\u064a\u0637 \u0627\u0644\u0645\u0633\u062a\u0647\u0644\u0643 \u062e\u0644\u0627\u0644 \u0633\u0646\u0629 \u0645\u0646 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0643\u0648\u0649 \u0627\u0644\u0645\u0643\u062a\u0648\u0628\u0629 \u0627\u0644\u0645\u0648\u062c\u0647\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0647\u0646\u064a.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalar00002',
    pageId: PAGE_AR,
    type: 'faq',
    sortOrder: 1,
    isVisible: true,
    content: JSON.stringify({
      title: '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629',
      items: [
        { question: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0639\u0646 \u0627\u0644\u0634\u0631\u0643\u0629', answer: '\u0634\u0631\u0643\u0629 KLAN SAS\u060c \u0627\u0644\u0643\u0627\u0626\u0646\u0629 \u0641\u064a 123 \u0634\u0627\u0631\u0639 \u0627\u0644\u0645\u062b\u0627\u0644\u060c 75000 \u0628\u0627\u0631\u064a\u0633\u060c \u0641\u0631\u0646\u0633\u0627\u060c \u0647\u064a \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u0629 \u0639\u0646 \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0627\u0644\u0645\u062c\u0645\u0639\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639.' },
        { question: '\u062c\u0645\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629', answer: '\u0646\u062c\u0645\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0634\u062e\u0635\u064a\u0629 \u0645\u062b\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0631\u064a\u062f\u064a \u0648\u063a\u064a\u0631\u0647\u0627\u060c \u0641\u0642\u0637 \u0641\u064a \u0625\u0637\u0627\u0631 \u062a\u0642\u062f\u064a\u0645 \u062e\u062f\u0645\u0627\u062a\u0646\u0627 \u0648\u0645\u0646\u062a\u062c\u0627\u062a\u0646\u0627\u060c \u0648\u0628\u0645\u0648\u0627\u0641\u0642\u0629 \u0635\u0631\u064a\u062d\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.' },
        { question: '\u0627\u0644\u063a\u0631\u0636 \u0645\u0646 \u062c\u0645\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', answer: '\u062a\u064f\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0627\u0644\u0645\u062c\u0645\u0639\u0629 \u0644\u062a\u0642\u062f\u064a\u0645 \u062e\u062f\u0645\u0627\u062a\u0646\u0627 \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u062a\u062d\u0633\u064a\u0646 \u0645\u0648\u0642\u0639\u0646\u0627 \u0648\u0645\u0646\u062a\u062c\u0627\u062a\u0646\u0627 \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646\u0627.' },
        { question: '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629', answer: '\u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0643 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639\u060c \u0641\u0625\u0646\u0643 \u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u062c\u0645\u0639 \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0648\u0641\u0642\u064b\u0627 \u0644\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0646\u0627.' },
        { question: '\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', answer: '\u062a\u064f\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0641\u0642\u0637 \u0644\u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0639\u0646\u062f \u062c\u0645\u0639\u0647\u0627 \u0648\u062a\u064f\u062d\u0645\u0649 \u0648\u0641\u0642\u064b\u0627 \u0644\u0642\u0648\u0627\u0646\u064a\u0646 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627.' },
        { question: '\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', answer: '\u0644\u0627 \u0646\u0634\u0627\u0631\u0643 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0645\u0639 \u0623\u0637\u0631\u0627\u0641 \u062b\u0627\u0644\u062b\u0629\u060c \u0625\u0644\u0627 \u0641\u064a \u0627\u0644\u062d\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0648\u0635 \u0639\u0644\u064a\u0647\u0627 \u0642\u0627\u0646\u0648\u0646\u064b\u0627 \u0623\u0648 \u0628\u0645\u0648\u0627\u0641\u0642\u062a\u0643 \u0627\u0644\u0635\u0631\u064a\u062d\u0629.' },
        { question: '\u062d\u0642\u0648\u0642 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646', answer: '\u0644\u062f\u064a\u0643 \u0627\u0644\u062d\u0642 \u0641\u064a \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0648\u062a\u0635\u062d\u064a\u062d\u0647\u0627 \u0648\u062d\u0630\u0641\u0647\u0627 \u0648\u0627\u0644\u0627\u0639\u062a\u0631\u0627\u0636 \u0639\u0644\u0649 \u0645\u0639\u0627\u0644\u062c\u062a\u0647\u0627. \u0644\u0645\u0645\u0627\u0631\u0633\u0629 \u0647\u0630\u0647 \u0627\u0644\u062d\u0642\u0648\u0642\u060c \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0644\u0649 contact@klan.fr.' },
        { question: '\u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0648\u0627\u0644\u062a\u062a\u0628\u0639 \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a', answer: '\u064a\u0633\u062a\u062e\u062f\u0645 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0648\u062a\u0642\u0646\u064a\u0627\u062a \u062a\u062a\u0628\u0639 \u0623\u062e\u0631\u0649 \u0644\u062a\u062d\u0633\u064a\u0646 \u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u062a\u0635\u0641\u062d \u0648\u0644\u062c\u0645\u0639 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u062d\u0648\u0644 \u0643\u064a\u0641\u064a\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0643 \u0644\u0644\u0645\u0648\u0642\u0639.' },
        { question: '\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', answer: '\u0642\u062f \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0647\u0630\u0647 \u0628\u0634\u0643\u0644 \u062f\u0648\u0631\u064a \u0644\u062a\u0639\u0643\u0633 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0641\u064a \u0645\u0645\u0627\u0631\u0633\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0644\u062f\u064a\u0646\u0627. \u0633\u064a\u062a\u0645 \u0627\u0644\u0625\u0634\u0627\u0631\u0629 \u0628\u0648\u0636\u0648\u062d \u0625\u0644\u0649 \u0623\u064a \u062a\u0639\u062f\u064a\u0644 \u0645\u0647\u0645 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629.' },
      ],
    }),
  },
  {
    id: '10000000-0000-4000-a000-legalar00003',
    pageId: PAGE_AR,
    type: 'faq',
    sortOrder: 2,
    isVisible: true,
    content: JSON.stringify({
      title: '\u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u0628\u064a\u0639',
      items: [
        { question: '\u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0637\u0628\u064a\u0642', answer: '\u062a\u0646\u0637\u0628\u0642 \u0634\u0631\u0648\u0637 \u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0639\u0627\u0645\u0629 \u0647\u0630\u0647 \u0639\u0644\u0649 \u062c\u0645\u064a\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0642\u062f\u0645\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u064a\u0644 (\u0627\u0644\u0645\u0634\u0627\u0631 \u0625\u0644\u064a\u0647 \u0641\u064a\u0645\u0627 \u064a\u0644\u064a \u0628\u0640 \u00ab \u0627\u0644\u0639\u0645\u064a\u0644 \u00bb) \u0644\u062f\u0649 KLAN SAS (\u0627\u0644\u0645\u0634\u0627\u0631 \u0625\u0644\u064a\u0647\u0627 \u0641\u064a\u0645\u0627 \u064a\u0644\u064a \u0628\u0640 \u00ab \u0627\u0644\u0628\u0627\u0626\u0639 \u00bb) \u0639\u0628\u0631 \u0645\u0648\u0642\u0639 klan.fr.' },
        { question: '\u0627\u0644\u0637\u0644\u0628\u0627\u062a', answer: '\u064a\u0645\u0643\u0646 \u0644\u0644\u0639\u0645\u064a\u0644 \u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628\u0627\u062a \u0639\u0628\u0631 \u0645\u0648\u0642\u0639 klan.fr. \u0623\u064a \u0637\u0644\u0628 \u064a\u0639\u0646\u064a \u0627\u0644\u0642\u0628\u0648\u0644 \u0627\u0644\u0635\u0631\u064a\u062d \u0648\u063a\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0637 \u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0639\u0627\u0645\u0629 \u0647\u0630\u0647.' },
        { question: '\u0627\u0644\u0623\u0633\u0639\u0627\u0631', answer: '\u062a\u064f\u0639\u0631\u0636 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0628\u0627\u0644\u064a\u0648\u0631\u0648 \u0634\u0627\u0645\u0644\u0629 \u062c\u0645\u064a\u0639 \u0627\u0644\u0636\u0631\u0627\u0626\u0628. \u064a\u062d\u062a\u0641\u0638 \u0627\u0644\u0628\u0627\u0626\u0639 \u0628\u0627\u0644\u062d\u0642 \u0641\u064a \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0641\u064a \u0623\u064a \u0648\u0642\u062a\u060c \u0644\u0643\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0633\u062a\u064f\u0641\u0648\u062a\u0631 \u0648\u0641\u0642\u064b\u0627 \u0644\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0633\u0627\u0631\u064a\u0629 \u0648\u0642\u062a \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0637\u0644\u0628.' },
        { question: '\u0627\u0644\u062f\u0641\u0639', answer: '\u064a\u062a\u0645 \u0627\u0644\u062f\u0641\u0639 \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u0635\u0631\u0641\u064a\u0629 \u0623\u0648 \u0623\u064a \u0648\u0633\u064a\u0644\u0629 \u062f\u0641\u0639 \u0622\u0645\u0646\u0629 \u0623\u062e\u0631\u0649 \u064a\u0642\u0628\u0644\u0647\u0627 \u0627\u0644\u0628\u0627\u0626\u0639. \u0644\u0646 \u062a\u062a\u0645 \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0637\u0644\u0628 \u0625\u0644\u0627 \u0628\u0639\u062f \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u062f\u0641\u0639.' },
        { question: '\u0627\u0644\u062a\u0648\u0635\u064a\u0644', answer: '\u064a\u062a\u0645 \u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0625\u0644\u0649 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062d\u062f\u062f \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0639\u0645\u064a\u0644 \u0639\u0646\u062f \u0627\u0644\u0637\u0644\u0628. \u0645\u0648\u0627\u0639\u064a\u062f \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u062a\u064f\u0639\u0637\u0649 \u0639\u0644\u0649 \u0633\u0628\u064a\u0644 \u0627\u0644\u0627\u0633\u062a\u062f\u0644\u0627\u0644 \u0648\u0642\u062f \u062a\u062e\u062a\u0644\u0641 \u062d\u0633\u0628 \u0645\u0643\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0648\u062a\u0648\u0641\u0631 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a.' },
        { question: '\u062d\u0642 \u0627\u0644\u0627\u0646\u0633\u062d\u0627\u0628', answer: '\u0648\u0641\u0642\u064b\u0627 \u0644\u0644\u062a\u0634\u0631\u064a\u0639\u0627\u062a \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627\u060c \u064a\u062d\u0642 \u0644\u0644\u0639\u0645\u064a\u0644 \u0645\u0645\u0627\u0631\u0633\u0629 \u062d\u0642 \u0627\u0644\u0627\u0646\u0633\u062d\u0627\u0628 \u062e\u0644\u0627\u0644 14 \u064a\u0648\u0645\u064b\u0627 \u0645\u0646 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a\u060c \u062f\u0648\u0646 \u0627\u0644\u062d\u0627\u062c\u0629 \u0625\u0644\u0649 \u062a\u0628\u0631\u064a\u0631 \u0627\u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0648 \u062f\u0641\u0639 \u063a\u0631\u0627\u0645\u0627\u062a.' },
        { question: '\u0627\u0644\u0636\u0645\u0627\u0646', answer: '\u062a\u062e\u0636\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0628\u0627\u0639\u0629 \u0644\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0644\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0648\u0636\u0645\u0627\u0646 \u0627\u0644\u0639\u064a\u0648\u0628 \u0627\u0644\u062e\u0641\u064a\u0629 \u0627\u0644\u0645\u0646\u0635\u0648\u0635 \u0639\u0644\u064a\u0647\u0645\u0627 \u0642\u0627\u0646\u0648\u0646\u064b\u0627. \u0641\u064a \u062d\u0627\u0644\u0629 \u0639\u062f\u0645 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0623\u0648 \u0627\u0644\u0639\u064a\u0628 \u0627\u0644\u062e\u0641\u064a\u060c \u064a\u0645\u0643\u0646 \u0644\u0644\u0639\u0645\u064a\u0644 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631 \u0628\u064a\u0646 \u0627\u0644\u0625\u0635\u0644\u0627\u062d \u0623\u0648 \u0627\u0644\u0627\u0633\u062a\u0628\u062f\u0627\u0644 \u0623\u0648 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f.' },
        { question: '\u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629', answer: '\u0644\u0627 \u064a\u062a\u062d\u0645\u0644 \u0627\u0644\u0628\u0627\u0626\u0639 \u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0627\u0644\u0623\u0636\u0631\u0627\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0648 \u063a\u064a\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0627\u0644\u0646\u0627\u062c\u0645\u0629 \u0639\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0628\u0627\u0639\u0629. \u062a\u0642\u062a\u0635\u0631 \u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0627\u0644\u0628\u0627\u0626\u0639 \u0639\u0644\u0649 \u0645\u0628\u0644\u063a \u0627\u0644\u0637\u0644\u0628.' },
        { question: '\u0627\u0644\u0646\u0632\u0627\u0639\u0627\u062a', answer: '\u0641\u064a \u062d\u0627\u0644\u0629 \u0627\u0644\u0646\u0632\u0627\u0639\u060c \u064a\u064f\u0628\u062d\u062b \u0639\u0646 \u062d\u0644 \u0648\u062f\u064a \u0623\u0648\u0644\u064b\u0627. \u0641\u064a \u062d\u0627\u0644 \u0639\u062f\u0645 \u0627\u0644\u062a\u0648\u0635\u0644 \u0625\u0644\u0649 \u0627\u062a\u0641\u0627\u0642 \u0648\u062f\u064a\u060c \u064a\u064f\u062d\u0627\u0644 \u0627\u0644\u0646\u0632\u0627\u0639 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u0627\u0643\u0645 \u0627\u0644\u0645\u062e\u062a\u0635\u0629.' },
      ],
    }),
  },
];
