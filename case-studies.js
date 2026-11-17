/* Case-study content — one template, used by every project.
   Each project fills the sections it needs; a section with no content is not shown,
   and the side index follows the sections that are shown.

   IMAGES: every `image` / `images` entry is an empty placeholder until you give it a file.
   Put the file in ./assets/ and set   image: { src: './assets/your-file.webp' }
   (the placeholder disappears and the image shows at its own proportions).

   Section order on the page:
     hero (cover) → intro → problem → research → strategy → palette → solution → learnings → forward → next project → footer
*/
window.CASE_STUDIES = {
  arth: {
    /* used by the hero, the carousel and the "next project" link */
    label: 'Personal project',
    subtitle: 'A Mutual Funds Investment App',
    cover: './assets/arth-hero.webp',
    category: 'Fintech / Product Design',
    description: 'A goal-based mutual fund investment experience designed to help first-time investors understand their financial goals, make informed investment decisions, and navigate investing with greater confidence.',
    hero: './assets/arth-card.webp', heroBg: '#0A0A0A',

    intro: {
      text: [
        'Arth is a mutual fund investment app concept for people investing for the first time. It is a goal-based experience designed to help first-time investors understand their financial goals, make informed investment decisions, and navigate investing with greater confidence.'
      ],
      meta: [['Year', '2026'], ['Role', 'Product Designer'], ['Project type', 'Personal Project'], ['Category', 'Fintech / Investment Experience'], ['Tools', 'Figma, Claude, Google Stitch']],
      image: { src: './assets/arth-intro.webp', label: 'Arth home, Ask Arth chat and fund explore screens', ratio: '2496 / 1502' }
    },

    problem: {
      question: 'Why is it difficult for first-time investors to get started?',
      text: [
        'First-time investors often find mutual fund investing overwhelming because of limited financial knowledge, unfamiliar terminology, and the number of investment choices available. This uncertainty can make it difficult to understand risk, choose suitable investments, and work confidently toward financial goals.',
        'Existing investment experiences can also feel too technical or information-heavy for someone who is just starting out.'
      ],
      cards: [
        ['Lack of financial understanding', 'Concepts such as SIP, NAV, CAGR and risk are unfamiliar, and the terminology makes the process feel complicated.'],
        ['Too many choices, too little direction', 'There are too many funds and investment options to compare, with no clear way to know which one is appropriate.'],
        ['Lack of confidence', 'A fear of losing money and a lack of confidence when it comes to making an investment decision.']
      ],
      challengeLabel: 'The design challenge',
      challenge: 'How might we help first-time investors understand their financial goals, learn the fundamentals of investing, and make more informed investment decisions without feeling overwhelmed by financial complexity?'
    },

    research: {
      images: [
        { caption: 'User research', src: './assets/arth-research.webp', label: 'Arth research board: framing, competitor journeys, app review and key insights', ratio: '2000 / 1660' },
        { caption: 'Personas', src: './assets/arth-personas.webp', label: 'Personas: Monica and Rahul', ratio: '2000 / 846' }
      ]
    },

    strategy: {
      images: [
        { caption: 'User journey', src: './assets/arth-user-journey.webp', label: 'Arth user journey: awareness to goal achievement', ratio: '2000 / 454' },
        { caption: 'Information architecture / Sitemap', src: './assets/arth-sitemap.webp', label: 'Arth information architecture and sitemap', ratio: '2000 / 644' }
      ]
    },

    palette: {
      text: 'A near-black background with one purple accent family keeps attention on figures and the next action. Three text levels separate the key number from supporting detail, which helps when screens carry a lot of financial information.',
      /* span: columns the card takes (grid of 4). spec: white card (for CTA / border style tokens). button: shows a sample button */
      swatches: [
        { role: 'Base', name: 'Background', hex: '#0A0A0A', span: 2 },
        { role: 'Brand', name: 'Primary Purple', hex: '#6861C5' },
        { role: 'Brand', name: 'Secondary Purple', hex: '#E9E7FB' },
        { role: 'Accent', name: 'Highlight Purple', hex: '#8B7DFF' },
        { role: 'Text', name: 'Primary Text', hex: '#FFFFFF' },
        { role: 'Text', name: 'Secondary Text', hex: '#696675' },
        { role: 'Text', name: 'Tertiary Text', hex: '#7D7D8E' },
        { role: 'Action', name: 'Primary CTA / CTA Text', hex: '#6861C5', hexLabel: '#6861C5 / #FFFFFF', span: 2, spec: true, button: 'Invest now', buttonInk: '#FFFFFF' },
        { role: 'Stroke', name: 'Border', hex: '#E4E1E9', span: 2, spec: true }
      ],
      buttons: { title: 'Button Variations', text: 'Primary and secondary buttons used across the experience.', primary: 'Primary', secondary: 'Secondary', color: '#6861C5', ink: '#FFFFFF' },
      tokens: {
        kicker: 'Reference', title: 'Semantic Token Mapping', note: 'Light mode · WCAG-conscious contrast',
        rows: [
          ['Primary Purple', '#6861C5', 'Core brand, buttons, states'],
          ['Secondary Purple', '#E9E7FB', 'Containers, cards, elevation'],
          ['Highlight Purple', '#8B7DFF', 'Focus, active states, links'],
          ['Secondary Text', '#696675', 'Body content, labels'],
          ['Border', '#E4E1E9', 'Sectioning, input fields']
        ]
      }
    },

    solution: {
      lead: 'The journey builds understanding before asking for an investment decision.',
      text: 'Learning, discovery, investing and tracking each have their own area, so a beginner deals with one kind of decision at a time. Investment setup is its own step, after education and recommendations.',
      rows: [
        { title: 'Goal-based investing', text: 'Investment planning starts from a goal the user names, so every later number has a purpose.', image: { src: './assets/arth-goal-based.webp', label: 'Arth personalised plan screen', fit: 'phone' } },
        { title: 'AI-powered recommendations', text: 'Each recommendation is tied to the user’s goal, time horizon and risk profile, with the reasoning shown.', image: { src: './assets/arth-ai-recommendations.webp', label: 'Ask Arth explaining why these three funds', fit: 'phone' } },
        { title: 'Contextual financial education', text: 'Terms like SIP, NAV and CAGR are explained in context, in plain language.', image: { src: './assets/arth-financial-education.webp', label: 'Home screen with Ask Arth suggested questions', fit: 'phone' } },
        { title: 'AI portfolio guidance', text: 'An assistant offers ongoing insights and answers questions about the portfolio.', image: { src: './assets/arth-ai-portfolio-guidance.webp', label: 'Fund detail with Arth’s verdict', fit: 'phone' } }
      ],
      /* add more screens to a carousel and the arrow scrolls through them */
      carousels: [
        { title: 'Onboarding Screens', screens: [
          { image: { src: './assets/arth-onboarding-01.webp', label: 'Splash: Investing, simplified' } },
          { image: { src: './assets/arth-onboarding-02.webp', label: 'Intro: Invest with confidence' } },
          { image: { src: './assets/arth-onboarding-03.webp', label: 'Intro: AI-powered guidance' } },
          { image: { src: './assets/arth-onboarding-04.webp', label: 'Intro: Grow your goals' } },
          { image: { src: './assets/arth-onboarding-05.webp', label: 'Sign up' } },
          { image: { src: './assets/arth-onboarding-06.webp', label: 'Verify mobile number' } },
          { image: { src: './assets/arth-onboarding-07-v2.webp', label: 'Choose a goal' } },
          { image: { src: './assets/arth-onboarding-08.webp', label: 'Define your goal' } },
          { image: { src: './assets/arth-onboarding-09.webp', label: 'Investing experience' } },
          { image: { src: './assets/arth-onboarding-10.webp', label: 'Risk question' } },
          { image: { src: './assets/arth-onboarding-11.webp', label: 'Monthly SIP amount' } },
          { image: { src: './assets/arth-onboarding-12.webp', label: 'Personalised plan', scroll: true } },
          { image: { src: './assets/arth-onboarding-13.webp', label: 'Complete KYC', scroll: true } },
          { image: { src: './assets/arth-onboarding-14.webp', label: 'All set' } }
        ] },
        { screens: [
          { label: 'Home', image: { src: './assets/arth-screen-home.webp', label: 'Arth Home screen', scroll: true } },
          { label: 'AI Chat', image: { src: './assets/arth-screen-ai-chat.webp', label: 'Arth AI Chat screen' } },
          { label: 'Explore', image: { src: './assets/arth-screen-explore.webp', label: 'Arth Explore screen' } },
          { label: 'All Funds', image: { src: './assets/arth-screen-all-funds.webp', label: 'Arth All Funds screen', scroll: true } },
          { label: 'Fund Details', image: { src: './assets/arth-screen-fund-details.webp', label: 'Arth Fund Details screen', scroll: true } },
          { label: 'Portfolio', image: { src: './assets/arth-screen-portfolio.webp', label: 'Arth Portfolio screen', scroll: true } },
          { label: 'Profile', image: { src: './assets/arth-screen-profile.webp', label: 'Arth Profile screen', scroll: true } },
          { label: 'Investment', image: { src: './assets/arth-screen-amount.webp', label: 'Arth investment amount screen' } },
          { label: 'SIP Confirmation', image: { src: './assets/arth-screen-sip-confirmation.webp', label: 'Arth SIP confirmation screen' } },
          { label: 'Payment Option', image: { src: './assets/arth-screen-payment-option.webp', label: 'Arth payment option screen' } },
          { label: 'Selection', image: { src: './assets/arth-screen-payment-selection.webp', label: 'Arth payment selection screen' } },
          { label: 'Payment Confirmation', image: { src: './assets/arth-screen-payment-confirmation.webp', label: 'Arth payment confirmation screen' } }
        ] }
      ]
    },

    learnings: {
      lead: 'Financial complexity and user confidence',
      text: [
        'Working on Arth helped me think more carefully about the relationship between financial complexity and user confidence.',
        'Rather than treating investment discovery as a standalone task, I approached the experience as a journey that connects user goals, education, recommendations, and ongoing tracking.'
      ]
    },

    forward: {
      cards: [
        'Validate the proposed experience with actual beginner investors.',
        'Test whether AI explanations genuinely improve understanding and confidence.',
        'Review recommendations with appropriate financial expertise and safeguards.'
      ]
    }
  },

  'propvr-website': {
    label: 'Product design', category: 'Web Design / Product Design',
    description: 'A website redesign focused on presenting products and digital experiences clearly.',
    hero: './assets/propvr-card.webp', heroBg: '#16171b',
    titlePlace: 'none', /* 'over' (default) overlays the big title on the cover, 'below' puts it under the cover, 'none' hides it */
    heroLight: true, /* light cover: dark title + dark back button/index over it. heroInk can override the title colour */
    intro: {
      label: 'Overview',
      title: 'Bringing PropVR’s real estate solutions to life through the web.',
      text: [
        'PropVR offers immersive 3D experiences and digital solutions for the real estate industry. Its website showcases these capabilities, helping potential clients understand how technology can transform property visualisation, presentation and exploration.',
        'I worked on the Real Estate industry page, contributing to its visual design and website experience.'
      ],
      meta: [['Year', '2026'], ['Role', 'UX Designer'], ['Project type', 'Website · propvr.ai', 'https://propvr.ai/industries/real-estate'], ['Category', 'Real Estate'], ['Tools', 'Figma, Cursor AI']],
      image: false /* no intro image; add { src: './assets/…' } to show one */
      /* Website then & now — sharp screenshots are ready; uncomment to show them under the intro
      , compareTitle: 'The Website: Then & Now',
      compare: [
        { label: 'Previous Experience', image: { src: './assets/propvr-previous.webp', label: 'Full-page screenshot of the previous PropVR website', scroll: true, frameWidth: 760 } },
        { label: 'Redesigned Experience', image: { src: './assets/propvr-redesigned.webp', label: 'Full-page screenshot of the redesigned Real Estate industry page', scroll: true, frameWidth: 760 } }
      ] */
    },

    problem: {
      label: 'The Challenge',
      title: 'Communicating complex real estate solutions through one cohesive experience.',
      text: 'PropVR offers a range of solutions for real estate businesses, each with different capabilities and use cases. The challenge was to communicate these offerings through one cohesive website experience without overwhelming visitors.',
      numbered: true,
      cards: [
        ['Content Clarity', 'Presenting multiple solutions in a way that is easy to understand and navigate.'],
        ['Visual Storytelling', 'Showcasing complex 3D capabilities through engaging visual demonstrations.'],
        ['User Engagement', 'Creating a clear journey that helps visitors explore solutions and understand their value.']
      ]
    },

    research: {
      label: 'Design Direction',
      title: 'Establishing the visual and content direction.',
      text: 'The design direction focused on presenting PropVR’s capabilities through strong visual storytelling, clear content hierarchy and engaging product demonstrations.',
      images: [
        { caption: 'Website references and inspiration', src: './assets/propvr-references.webp', label: 'Website references and inspiration board' },
        { caption: 'Visual direction and moodboard', src: './assets/propvr-moodboard.webp', label: 'Visual direction moodboard' },
        { caption: 'Content structure and section planning', src: './assets/propvr-content-structure.webp', label: 'PropVR website information architecture' },
        { caption: 'Early layout explorations', src: './assets/propvr-early-layout.webp', label: 'Early full-page layout exploration for the PropVR website', scroll: true, frameWidth: 760 }
      ]
    },

    strategy: {
      label: 'Design Evolution',
      title: 'Design Evolution',
      text: 'How the Real Estate industry page evolved, from the previous website to the redesigned experience.',
      images: [
        { caption: 'Previous website', src: './assets/propvr-previous.webp', label: 'Full-page screenshot of the previous PropVR Real Estate page', scroll: true },
        { caption: 'Redesigned website', src: './assets/propvr-redesigned.webp', label: 'Full-page screenshot of the redesigned PropVR Real Estate page', scroll: true }
      ]
    },

    solution: {
      label: 'Final Website',
      title: 'Bringing PropVR’s real estate capabilities together.',
      text: 'The redesigned experience brings PropVR’s real estate solutions together through a structured and visually engaging website that communicates its capabilities and applications.',
      numbered: true,
      rows: [
        { title: 'Realty Capture Solutions', text: 'The hero section and its primary message.', image: { src: './assets/propvr-fw-hero.webp', label: 'Redesigned page: hero and Spatial OS outcomes' } },
        { title: 'Solution Showcase', text: 'The different real estate applications, presented through visual cards.', image: { src: './assets/propvr-fw-solutions.webp', label: 'Redesigned page: Real Estate Digital Twin Products' } },
        { title: 'Planning, Presenting and Selling', text: 'How PropVR’s capabilities support different stages of real estate workflows.', image: { src: './assets/propvr-fw-spatial-os.webp', label: 'Redesigned page: Spatial OS product layers' } },
        { title: 'Interactive Property Experiences', text: 'How visitors can explore spaces through immersive 3D experiences.', image: { src: './assets/propvr-fw-experience-centres.webp', label: 'Redesigned page: Immersive Experience Centres' } },
        { title: 'Feature Demonstrations', text: 'The interactive tools and product capabilities, shown through visual examples.', image: { src: './assets/propvr-fw-features.webp', label: 'Redesigned page: Craft AI tools' } },
        { title: 'Conversion and Engagement', text: 'How the page answers visitor questions and guides them towards taking the next step.', image: { src: './assets/propvr-fw-cta.webp', label: 'Redesigned page: developer playbook and final CTA' } }
      ]
    },

    learnings: {
      label: 'Reflection',
      title: 'Connecting design thinking with the final experience.',
      text: [
        'Working on the PropVR website gave me an opportunity to explore how visual design, content presentation and interactive experiences come together to communicate a complex product.',
        'It also strengthened my understanding of website design as a complete experience, where every section contributes to how visitors discover, understand and engage with a company’s offerings.'
      ]
    }
  },

  hologram: {
    /* PRIVATE: internal, NDA-protected product. This page is intentionally a brief, visual-first
       overview only — no research process, user flows, wireframes or internal/technical detail.
       Do not add further confidential detail without checking with the client first. */
    label: 'Project showcase', category: 'Internal Product',
    description: 'An immersive experience combining touchscreen interactions with holographic displays to bring 3D content to life.',
    hero: './assets/hologram-row1-holo.webp', heroBg: '#1a1714', titlePlace: 'none',
    intro: {
      label: 'Overview',
      title: 'An immersive experience that brings 3D content to life.',
      text: [
        'Hologram combines a touchscreen interface with a holographic display, letting users control and explore 3D content in physical space rather than on a flat screen.',
        'I contributed to two experiences within the product: an interactive 3D real estate presentation, and an experimental AI-powered character interaction.'
      ],
      meta: [['Role', 'UX Designer'], ['Tool', 'Figma'], ['Project', 'Hologram'], ['Year', '2026']],
      image: false
    },

    problem: {
      label: '3D Real Estate',
      title: 'Explore real estate in 3D.',
      text: [
        'An interactive real estate presentation experience where users control and explore 3D building models through a touchscreen, with the selected content displayed on a holographic screen.'
      ],
      numbered: true,
      cards: [
        ['Project Selection', 'Browse and select real estate developments.'],
        ['360° Model Exploration', 'Rotate and zoom into 3D building models.'],
        ['Masterplan Navigation', 'Explore the development and isolate individual buildings.'],
        ['Building Isolation', 'Tap a tower to isolate it from the surrounding masterplan.'],
        ['Floor Plan Exploration', 'Navigate floors and explore floor plans.'],
        ['Interior Visualisation', 'View property interiors and spaces.']
      ],
      groups: [
        { title: 'Touchscreen × hologram', pairs: [
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-row1-touch.webp', label: 'Project selection on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-row1-holo.webp', label: '3D building model on hologram' } }, caption: 'Selecting a project on the touchscreen loads its 3D building model on the hologram.' },
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-row2-touch.webp', label: '3D model controls on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-row2-holo.webp', label: '3D model on hologram' } }, caption: 'Touchscreen controls let users rotate and explore the model shown on the hologram.' },
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-row4-touch.webp', label: 'Project list on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-row4-holo.webp', label: 'Masterplan with landmark callouts on hologram' } }, caption: 'Enabling landmarks on the touchscreen surfaces nearby points of interest around the masterplan on the hologram.' },
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-row3b-touch.webp', label: 'Floor list on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-row3b-holo.webp', label: 'Isolated tower on hologram' } }, caption: 'Tapping a tower isolates it from the masterplan on the hologram, while the touchscreen surfaces its floor list.' },
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-floorplan-touch.webp', label: 'Floor plan filters on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-floorplan-holo.webp', label: 'Isolated tower on hologram' } }, caption: 'Filtering by unit type on the touchscreen highlights the matching floor plan on the hologram.' },
          { left: { label: 'On touchscreen', image: { src: './assets/hologram-row6-touch.webp', label: 'Unit selector on touchscreen' } }, right: { label: 'On hologram', image: { src: './assets/hologram-row6-holo.webp', label: 'Isometric floor plan on hologram' } }, caption: 'Browsing interior spaces on the touchscreen brings up the corresponding floor plan on the hologram.' }
        ] }
      ]
    },

    learnings: {
      label: 'Closing',
      title: 'Exploring new ways to interact.',
      text: [
        'Working on Hologram meant designing experiences that connect digital interfaces, physical environments and emerging technologies — a chance to think beyond the screen and explore how 3D content can be presented across touchscreen and holographic displays.',
        { text: 'This was just a sneak peek — reach out to know more.', center: true }
      ]
    }
  },


  'dial-design': {
    label: 'Project showcase', category: 'Internal Product',
    description: 'An interactive real estate experience using physical dial controls.',
    hero: './assets/kiosk-hero.webp', heroBg: '#1b1a19', titlePlace: 'none',

    intro: {
      label: 'Overview',
      title: 'Controlling virtual spaces with a physical dial.',
      text: [
        'An interactive real estate experience that brings virtual spaces to life through physical dial controls. Users can explore rooms, navigate virtual environments and customise interiors using the kiosk, while every interaction is reflected on a large display in real time.'
      ],
      meta: [['Role', 'UX Designer'], ['Project', 'Kiosk Experience'], ['Company', 'PropVR'], ['Year', '2026']],
      image: false
    },

    research: {
      label: 'Selected Screens',
      title: 'Selected Screens',
      groups: [
        { title: 'Space Exploration', pairs: [
          { left: { label: 'On kiosk', image: { src: './assets/kiosk-explore-kiosk.webp', label: 'Floor plan navigation on kiosk' } }, right: { label: 'On display', image: { src: './assets/kiosk-explore-display.webp', label: 'Virtual room on main display' } }, caption: 'Explore virtual spaces and navigate rooms through physical dial controls.' }
        ] },
        { title: 'Interior Customisation', pairs: [
          { left: { label: 'On kiosk', image: { src: './assets/kiosk-customise-kiosk.webp', label: 'Furniture customisation on kiosk' } }, right: { label: 'On display', image: { src: './assets/kiosk-customise-display.webp', label: 'Customised interior on main display' } }, caption: 'Customise furniture, materials and interior elements with real-time visual feedback.' }
        ] }
      ]
    },

    learnings: {
      label: 'Closing',
      title: '',
      text: [
        { text: 'This was just a sneak peek — reach out to know more.', center: true }
      ]
    }
  }
};
