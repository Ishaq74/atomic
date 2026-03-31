import type { ImageMetadata } from 'astro';

export const LOCALES = ['fr', 'en', 'es', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const RTL_LOCALES: Locale[] = ['ar'];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
};

export interface CommonTranslations {
  meta: {
    title: string;
    description: string;
  };
  pageRoutes: Record<PageId, string>;
  nav: {
    features: string;
    analytics: string;
    integrations: string;
    team: string;
    about: string;
    contact: string;
  };
  cta: {
    getStarted: string;
    signIn: string;
  };
  footer: {
    socialHeading: string;
    navPrimary: string;
    navSecondary: string;
    legalHeading: string;
    copyright: string;
    home: string;
    aboutLink: string;
    contact: string;
    legalNotice: string;
    privacyPolicy: string;
    termsOfSale: string;
  };
  a11y: {
    openMenu: string;
    switchLanguage: string;
    skipToContent: string;
  };
}

export interface HomeTranslations {
  hero: {
    badge: string;
    title: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    socialProofHeading: string;
    socialProofSubtext: string;
    carouselImages: { src: ImageMetadata; alt: string }[];
  };
  logos: { name: string; src: ImageMetadata }[];
  pillars: {
    badge: string;
    title: string;
    description: string;
    items: { icon: string; title: string; description: string }[];
  };
  testimonials: {
    badge: string;
    heading: string;
    description: string;
    items: {
      name: string;
      role: string;
      content: string;
      rating: number;
      image: ImageMetadata;
    }[];
  };
  pricing: {
    eyebrow: string;
    heading: string;
    description: string;
    monthlyLabel: string;
    yearlyLabel: string;
    discountBadge: string;
    plans: {
      name: string;
      description: string;
      monthlyPrice: string;
      yearlyPrice: string;
      features: { text: string; included: boolean }[];
      buttonText: string;
      buttonHref: string;
    }[];
  };
  ctaBanner: {
    title: string;
    description: string;
    primaryButton: { text: string; href: string };
    secondaryButton?: { text: string; href: string };
  };
}

export interface LegalFaqItem {
  question: string;
  answer: string;
}

export interface LegalSection {
  title: string;
  intro?: string;
  items: LegalFaqItem[];
}

export interface LegalTranslations {
  meta: {
    title: string;
    description: string;
  };
  eyebrow: string;
  heading: string;
  sections: LegalSection[];
}

export interface AboutTranslations {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    description: string;
    cards: {
      icon: string;
      title: string;
      description: string;
    }[];
  };
  values: {
    eyebrow: string;
    title: string;
    description: string;
    items: {
      title: string;
      description: string;
      image: ImageMetadata;
      value: string;
    }[];
  };
  team: {
    eyebrow: string;
    title: string;
    description: string;
    members: {
      name: string;
      role: string;
      bio: string;
      image: ImageMetadata;
      socials: {
        name: string;
        icon: string;
        href: string;
      }[];
    }[];
  };
  cta: {
    title: string;
    description: string;
    primaryButton: { text: string; href: string };
    secondaryButton?: { text: string; href: string };
  };
}

export interface ContactTranslations {
  meta: {
    title: string;
    description: string;
  };
  badge: string;
  heading: string;
  description: string;
  reasonsHeading: string;
  selectReasonButton: string;
  popularLabel: string;
  reasons: {
    value: string;
    title: string;
    description: string;
    features: string[];
    popular?: boolean;
  }[];
  form: {
    heading: string;
    description: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    reason: string;
    reasonPlaceholder: string;
    message: string;
    messagePlaceholder: string;
    urgent: string;
    urgentDescription: string;
    submit: string;
    disclaimer: string;
  };
  feedback: {
    success: string;
    error: string;
    networkError: string;
    rateLimited: string;
  };
}

export type AuthPageId = 'sign-in' | 'sign-up' | 'dashboard' | 'admin' | 'forgot-password' | 'reset-password' | 'verify-email' | 'profile' | 'organizations';

export type PageId = 'about' | 'contact' | 'legal';

export interface AuthTranslations {
  meta: {
    signIn: { title: string; description: string };
    signUp: { title: string; description: string };
    dashboard: { title: string; description: string };
    admin: { title: string; description: string };
    forgotPassword: { title: string; description: string };
    resetPassword: { title: string; description: string };
    verifyEmail: { title: string; description: string };
    profile: { title: string; description: string };
    organizations: { title: string; description: string };
  };
  routes: Record<AuthPageId, string>;
  signIn: {
    title: string;
    description: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    submit: string;
    noAccount: string;
    createAccount: string;
    forgotPassword: string;
    success: string;
  };
  signUp: {
    title: string;
    description: string;
    name: string;
    namePlaceholder: string;
    username: string;
    usernamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    submit: string;
    hasAccount: string;
    signInLink: string;
    success: string;
  };
  dashboard: {
    welcome: string;
    profile: {
      title: string;
      email: string;
      username: string;
      role: string;
    };
    organizations: {
      title: string;
      empty: string;
      create: string;
      viewDetails: string;
    };
    signOut: string;
    editProfile: string;
  };
  admin: {
    title: string;
    tabs: {
      stats: string;
      users: string;
      organizations: string;
      auditLog: string;
      site: string;
      navigation: string;
      pages: string;
      theme: string;
    };
    stats: {
      totalUsers: string;
      totalOrganizations: string;
      recentSignups: string;
      recentSignupsDescription: string;
    };
    users: {
      searchPlaceholder: string;
      columns: {
        name: string;
        email: string;
        username: string;
        role: string;
        status: string;
        joined: string;
        actions: string;
      };
      roles: { user: string; admin: string };
      status: { active: string; banned: string };
      actions: {
        ban: string;
        unban: string;
        setAdmin: string;
        setUser: string;
        delete: string;
        impersonate: string;
      };
      confirmBan: string;
      confirmDelete: string;
      banned: string;
      unbanned: string;
      roleChanged: string;
      deleted: string;
      noResults: string;
      sort: {
        label: string;
        nameAsc: string;
        nameDesc: string;
        newest: string;
        oldest: string;
      };
      filter: {
        allRoles: string;
        allStatuses: string;
      };
    };
    organizations: {
      searchPlaceholder: string;
      columns: {
        name: string;
        slug: string;
        owner: string;
        members: string;
        created: string;
        actions: string;
      };
      actions: { delete: string };
      confirmDelete: string;
      deleted: string;
      noResults: string;
      sort: {
        label: string;
        nameAsc: string;
        nameDesc: string;
        newest: string;
        oldest: string;
        mostMembers: string;
      };
    };
    auditLog: {
      columns: {
        date: string;
        user: string;
        action: string;
        resource: string;
        ip: string;
      };
      filterAction: string;
      allActions: string;
      noResults: string;
      showMore: string;
    };
    impersonation: {
      banner: string;
      stop: string;
    };
    cms: {
      site: {
        title: string;
        description: string;
        tabSettings: string;
        tabSocial: string;
        tabContact: string;
        tabHours: string;
        tabHeader: string;
        tabFooter: string;
        siteName: string;
        siteDescription: string;
        siteSlogan: string;
        metaTitle: string;
        metaDescription: string;
        logoLight: string;
        logoDark: string;
        favicon: string;
        ogImage: string;
        uploadImage: string;
        changeImage: string;
        removeImage: string;
        saved: string;
        save: string;
        platform: string;
        selectPlatform: string;
        otherPlatform: string;
        customPlatformName: string;
        url: string;
        label: string;
        icon: string;
        addLink: string;
        noLinks: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        postalCode: string;
        country: string;
        mapUrl: string;
        latitude: string;
        longitude: string;
        dayNames: string[];
        openTime: string;
        closeTime: string;
        closed: string;
        middayBreak: string;
        morningOpen: string;
        morningClose: string;
        afternoonOpen: string;
        afternoonClose: string;
        headerCtaText: string;
        headerCtaUrl: string;
        headerSecondaryText: string;
        headerSecondaryUrl: string;
        headerSticky: string;
        footerCopyrightText: string;
        footerCopyrightUrl: string;
        footerSocialHeading: string;
        footerNavPrimaryHeading: string;
        footerNavSecondaryHeading: string;
        footerLegalHeading: string;
      };
      navigation: {
        title: string;
        description: string;
        selectMenu: string;
        selectLocale: string;
        addItem: string;
        editItem: string;
        noItems: string;
        labelField: string;
        urlField: string;
        parentField: string;
        iconField: string;
        showIconField: string;
        selectIcon: string;
        searchIcon: string;
        clearIcon: string;
        openInNewTab: string;
        rootItem: string;
        sortOrderField: string;
        isActiveField: string;
        saveAll: string;
        saved: string;
        deleted: string;
        save: string;
        cancel: string;
        confirmDelete: string;
        createMenu: string;
        menuName: string;
        menuDescription: string;
        editMenu: string;
        deleteMenu: string;
        menuSaved: string;
        menuDeleted: string;
        confirmDeleteMenu: string;
        noMenus: string;
        manageMenus: string;
        items: string;
        moveUp: string;
        moveDown: string;
        menuVisible: string;
        displayLabelField: string;
        showHeadingField: string;
      };
      pages: {
        title: string;
        description: string;
        createPage: string;
        editPage: string;
        noPages: string;
        slug: string;
        pageTitle: string;
        metaTitle: string;
        metaDescription: string;
        template: string;
        published: string;
        draft: string;
        publish: string;
        unpublish: string;
        saved: string;
        deleted: string;
        save: string;
        cancel: string;
        confirmDelete: string;
        sections: string;
        addSection: string;
        sectionType: string;
        sectionContent: string;
        noSections: string;
        hidden: string;
        hide: string;
        show: string;
      };
      theme: {
        title: string;
        description: string;
        themeName: string;
        active: string;
        createTheme: string;
        deleteTheme: string;
        noThemes: string;
        cannotDeleteActive: string;
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        backgroundColor: string;
        foregroundColor: string;
        mutedColor: string;
        mutedForegroundColor: string;
        fontHeading: string;
        fontBody: string;
        borderRadius: string;
        saved: string;
        deleted: string;
        save: string;
        preview: string;
        activate: string;
        lightMode: string;
        darkMode: string;
        resetDefaults: string;
        wcagContrast: string;
        typographyLayout: string;
      };
      common: {
        actions: string;
        active: string;
        inactive: string;
        sortOrder: string;
        delete: string;
        confirmDelete: string;
        loading: string;
        error: string;
      };
    };
  };
  forgotPassword: {
    title: string;
    description: string;
    email: string;
    emailPlaceholder: string;
    submit: string;
    successTitle: string;
    successDescription: string;
    backToSignIn: string;
  };
  resetPassword: {
    title: string;
    description: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    submit: string;
    successTitle: string;
    successDescription: string;
    goToSignIn: string;
    invalidToken: string;
    expiredToken: string;
  };
  verifyEmail: {
    title: string;
    description: string;
    checking: string;
    successTitle: string;
    successDescription: string;
    errorTitle: string;
    errorDescription: string;
    resend: string;
    resendSuccess: string;
    goToSignIn: string;
  };
  profile: {
    identity: {
      title: string;
      avatarLabel: string;
      name: string;
      namePlaceholder: string;
      username: string;
      usernamePlaceholder: string;
      usernameAvailable: string;
      usernameTaken: string;
      usernameChecking: string;
      save: string;
      saveSuccess: string;
    };
    security: {
      title: string;
      description: string;
      currentPassword: string;
      currentPasswordPlaceholder: string;
      newPassword: string;
      newPasswordPlaceholder: string;
      confirmPassword: string;
      confirmPasswordPlaceholder: string;
      changePassword: string;
      passwordChanged: string;
      revokeOtherSessions: string;
    };
    dangerZone: {
      title: string;
      description: string;
      exportData: string;
      exportDataDescription: string;
      exportDataButton: string;
      deleteAccount: string;
      deleteAccountDescription: string;
      deleteAccountButton: string;
      deleteAccountConfirm: string;
      deleteAccountPassword: string;
      deleteAccountPasswordPlaceholder: string;
      deleteAccountSent: string;
    };
  };
  organizations: {
    list: {
      title: string;
      createButton: string;
      empty: string;
      membersCount: string;
      viewDetails: string;
    };
    pendingInvitations: {
      title: string;
      empty: string;
      accept: string;
      reject: string;
      from: string;
      role: string;
      accepted: string;
      rejected: string;
    };
    create: {
      title: string;
      name: string;
      namePlaceholder: string;
      slug: string;
      slugPlaceholder: string;
      slugAvailable: string;
      slugTaken: string;
      slugChecking: string;
      logo: string;
      submit: string;
      success: string;
    };
    detail: {
      backToList: string;
      membersTab: string;
      settingsTab: string;
    };
    members: {
      title: string;
      invite: string;
      email: string;
      emailPlaceholder: string;
      rolePlaceholder: string;
      sendInvite: string;
      inviteSent: string;
      remove: string;
      removeConfirm: string;
      removed: string;
      changeRole: string;
      roleChanged: string;
      you: string;
      owner: string;
      admin: string;
      member: string;
    };
    invitations: {
      title: string;
      empty: string;
      pending: string;
      cancel: string;
      cancelled: string;
    };
    settings: {
      title: string;
      name: string;
      namePlaceholder: string;
      slug: string;
      slugPlaceholder: string;
      logo: string;
      save: string;
      saved: string;
    };
    danger: {
      title: string;
      description: string;
      leave: string;
      leaveDescription: string;
      leaveConfirm: string;
      left: string;
      delete: string;
      deleteDescription: string;
      deleteConfirm: string;
      deleted: string;
    };
  };
  userMenu: {
    dashboard: string;
    profile: string;
    admin: string;
    organizations: string;
    signOut: string;
    signIn: string;
  };
  errors: Record<string, string>;
}
