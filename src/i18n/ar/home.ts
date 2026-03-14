import type { HomeTranslations } from '../config';

export default {
  hero: {
    badge: 'نبني معًا',
    title: 'الحضارة تُبنى طبقة تلو الأخرى',
    description:
      'كلان يرافق المجتمعات التي تبني على إرث من سبقها. كل جيل يضيف حجره إلى البناء المشترك.',
    ctaPrimary: 'انضم إلى الحركة',
    ctaSecondary: 'اكتشف رؤيتنا',
    socialProofHeading: 'انضم إلى أكثر من 10,000 بنّاء',
    socialProofSubtext: 'نبني المستقبل معًا',
    carouselImages: [
      { src: '/assets/images/brand/house-civilization.jpg', alt: 'منزل تراثي يرمز إلى طبقات الحضارة' },
      { src: '/assets/images/brand/strates-civilization.jpg', alt: 'طبقات جيولوجية ترمز إلى تراكم المعارف' },
    ],
  },
  logos: [
    { name: 'مؤسسة أطلس', src: '/assets/images/brand/stone.png' },
    { name: 'شبكة التراث', src: '/assets/images/brand/polish.png' },
    { name: 'جماعة الجذور', src: '/assets/images/brand/bronze.png' },
    { name: 'تحالف البنّائين', src: '/assets/images/brand/fer.png' },
  ],
  pillars: {
    badge: 'الركائز المؤسسة',
    title: 'أسس كلان',
    description: 'أربعة مبادئ توجه مهمتنا في البناء الجماعي.',
    items: [
      { icon: 'mdi:account-group', title: 'المجتمع', description: 'جمع من يتشاركون رؤية واحدة ويبنون معًا.' },
      { icon: 'mdi:book-open-variant', title: 'النقل', description: 'حفظ المعارف ونقلها من جيل إلى آخر.' },
      { icon: 'mdi:shield-check', title: 'النزاهة', description: 'البناء على أسس متينة بشفافية وأصالة.' },
      { icon: 'mdi:trending-up', title: 'التقدم', description: 'كل طبقة تستند إلى سابقتها للوصول أعلى.' },
    ],
  },
  testimonials: {
    badge: 'شهادات',
    heading: 'يبنون مع كلان',
    description: 'اكتشف كيف يصنع مجتمع البنّائين لدينا المستقبل معًا.',
    items: [
      {
        name: 'أمينة بلقاسم',
        role: 'مؤسسة، جماعة الجذور',
        content: 'ساعدنا كلان في هيكلة نقلنا بين الأجيال. كل طبقة من المعرفة محفوظة ومتاحة.',
        rating: 5,
        image: 'https://i.pravatar.cc/150?img=1',
      },
      {
        name: 'يوسف منصوري',
        role: 'مدير، معهد الذاكرة',
        content: 'رؤية كلان تتردد بعمق مع مهمتنا. البناء على أسس من سبقونا.',
        rating: 5,
        image: 'https://i.pravatar.cc/150?img=3',
      },
      {
        name: 'سارة دوبون',
        role: 'مسؤولة المجتمع',
        content: 'أداة لا غنى عنها لتوحيد مجتمعنا. نهج الطبقات يعطي معنى لكل مساهمة.',
        rating: 4,
        image: 'https://i.pravatar.cc/150?img=5',
      },
      {
        name: 'كريم وعدة',
        role: 'مهندس، تحالف البنّائين',
        content: 'كلان يجسد ما يجب أن تكون عليه كل منصة مجتمعية: صرح جماعي يساهم فيه الجميع.',
        rating: 5,
        image: 'https://i.pravatar.cc/150?img=8',
      },
    ],
  },
  pricing: {
    eyebrow: 'الأسعار',
    heading: 'اختر خطتك',
    description: 'اختر الخطة المثالية لاحتياجاتك. يمكنك التغيير في أي وقت.',
    monthlyLabel: 'شهري',
    yearlyLabel: 'سنوي',
    discountBadge: 'وفّر 20%',
    plans: [
      {
        name: 'البنّاء',
        description: 'لمن يبنون بنشاط داخل المجتمع.',
        monthlyPrice: '29',
        yearlyPrice: '279',
        features: [
          { text: 'الوصول إلى المجتمع', included: true },
          { text: 'المحتوى الأساسي', included: true },
          { text: 'ورش النقل', included: true },
          { text: 'الإرشاد المجتمعي', included: true },
          { text: 'أدوات التعاون', included: true },
        ],
        buttonText: 'كن بنّاءً',
        buttonHref: '#',
      },
      {
        name: 'الركيزة',
        description: 'للقادة الذين يحملون الرؤية ويوجهون المجتمع.',
        monthlyPrice: '79',
        yearlyPrice: '759',
        features: [
          { text: 'كل ما في البنّاء', included: true },
          { text: 'حلقة الركائز', included: true },
          { text: 'فعاليات حصرية', included: true },
          { text: 'التأثير على خارطة الطريق', included: true },
          { text: 'دعم مخصص', included: true },
          { text: 'وصول كامل للـ API', included: true },
        ],
        buttonText: 'انضم إلى الركائز',
        buttonHref: '#',
      },
    ],
  },
  ctaBanner: {
    title: 'مستعد لبناء طبقتك؟',
    description: 'انضم إلى آلاف البنّائين الذين يصنعون المستقبل معًا مع كلان.',
    primaryButton: { text: 'انضم إلى كلان', href: '#' },
    secondaryButton: { text: '← اعرف المزيد', href: '#' },
  },
} satisfies HomeTranslations;
