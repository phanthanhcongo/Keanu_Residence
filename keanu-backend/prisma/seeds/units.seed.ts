import { PrismaClient, UnitStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  developer: string;
  location: string | null;
  launchDate: Date;
  launchTime: string;
  timezone: string;
  status: any;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  heroImageUrl: string | null;
  videoUrl: string | null;
  termsUrl: string | null;
  policyUrl: string | null;
  reservationDuration: number;
  depositAmount: any;
  createdAt: Date;
  updatedAt: Date;
};

type Unit = {
  id: string;
  projectId: string;
  unitNumber: string;
  unitType: string;
  floor: number | null;
  size: any;
  bedrooms: number;
  bathrooms: any;
  price: any;
  status: UnitStatus;
  description: string | null;
  floorPlanUrl: string | null;
  imageUrls: any;
  features: any;
  xPosition: number | null;
  yPosition: number | null;
  shortlistCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function seedUnits(prisma: PrismaClient, projects: Project[]): Promise<Unit[]> {
  console.log('  - Creating units...');

  const units: Unit[] = [];

  // Only seed for Keanu Residences project
  const project = projects.find(p => p.slug === 'keanu-residences');
  if (!project) {
    console.log('  ⚠️  Keanu Residences project not found, skipping unit seeding');
    return units;
  }

  console.log(`    - Creating units for ${project.name}...`);

  // ────────────────────────────────────────────────────────────────────
  // Unit data from Keanu Price List spreadsheet (Units sheet)
  // unitNumber convention: number + letter suffix
  //   A = Type I, B = Type II, C = Type III, D = Type IV
  // ────────────────────────────────────────────────────────────────────
  const unitData = [
    {
      unitNumber: '1B',
      unitType: 'Type II',
      bedrooms: 3,
      bathrooms: 7,
      price: 1000000,
      launchPrice: 999999,
      size: 379,      // Interior Area, sq m
      status: UnitStatus.UNAVAILABLE,
      description: 'Set within a quieter part of the estate, Residence One offers a calmer, more compact expression of Type II living.',
      features: {
        land: 550,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence One is designed around clarity of plan: social spaces open at pool-and-garden level, private rooms sit above, and the rooftop terrace introduces an elevated outdoor retreat. The footprint is more compact, but the living sequence remains complete and resolved.',
        setting: 'Set within a quieter part of the estate, it looks toward surrounding greenery and rice field, with more distant ocean outlook from the rooftop terrace.',
        distinctiveFeatures: '• More compact, highly resolved footprint\n• Quieter internal estate position\n• Layered outlook across greenery, rice field, and ocean',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 151,
        terrace: 107,
        pool: 60,
        garden: 195,
        upperFloor: 179,
        rooftopArea: 48,
        beds: 3,
        guestSuite: false,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '2A',
      unitType: 'Type I',
      bedrooms: 3,
      bathrooms: 8,
      price: 1000000,
      launchPrice: 999999,
      size: 448,
      status: UnitStatus.AVAILABLE,
      description: 'Set deeper within the estate, Residence Two offers a quieter outlook and a more private rhythm of living.',
      features: {
        land: 670,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Two is shaped around layered privacy: social spaces at garden level, bedrooms above, and rooftop living as a quieter retreat above the estate. A central lightwell draws natural light into the core of the home and reinforces the vertical connection between levels.',
        setting: 'Set within a calmer internal position, the residence looks primarily to surrounding greenery and landscaped garden, with ocean views from the rooftop terrace.',
        distinctiveFeatures: '• Quieter internal estate position\n• Central lightwell bringing depth and daylight\n• Rooftop outlook over greenery toward the ocean',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 208,
        terrace: 110,
        pool: 80,
        garden: 210,
        upperFloor: 190,
        rooftopArea: 50,
        beds: 4,
        guestSuite: true,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '3A',
      unitType: 'Type I',
      bedrooms: 3,
      bathrooms: 8,
      price: 1000000,
      launchPrice: 999999,
      size: 448,
      status: UnitStatus.AVAILABLE,
      description: 'On the front row, Residence Three brings the Type I plan into a stronger relationship with the coastline.',
      features: {
        land: 665,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Three follows the layered Type I arrangement, with social spaces opening toward the pool and garden, private rooms positioned above, and rooftop living adding a final outdoor layer. The central lightwell strengthens openness and daylight through the core of the plan.',
        setting: 'Its front-row position gives the residence a stronger relationship to the coastline, with ocean outlook from the upper level and rooftop terrace.',
        distinctiveFeatures: '• Front-row position\n• Stronger upper-level and rooftop ocean outlook\n• Layered privacy across three levels of living',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 208,
        terrace: 140,
        pool: 80,
        garden: 196,
        upperFloor: 190,
        rooftopArea: 50,
        beds: 4,
        guestSuite: true,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '4C',
      unitType: 'Type III',
      bedrooms: 3,
      bathrooms: 7,
      price: 1000000,
      launchPrice: 999999,
      size: 286,
      status: UnitStatus.AVAILABLE,
      description: 'Residence Four is a single-storey beachfront home shaped by breadth, privacy, and direct proximity to the shoreline.',
      features: {
        land: 960,
        levels: 'Single-storey',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Four is organised entirely across one level, allowing social, private, and guest spaces to unfold horizontally. An internal gallery supports continuity through the plan, while the garden and pool extend the living space outward.',
        setting: 'Positioned on a generous front-row plot, it combines direct proximity to the coastline with a strong sense of planted privacy.',
        distinctiveFeatures: '• Single-storey horizontal planning\n• Internal gallery connecting the residence\n• Front-row beachfront plot',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nGuest suite\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 286,
        terrace: 183,
        pool: 80,
        garden: 353,
        upperFloor: null,
        rooftopArea: null,
        beds: 4,
        guestSuite: true,
        office: false,
        rooftop: false,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '5D',
      unitType: 'Type IV',
      bedrooms: 6,
      bathrooms: 11,
      price: 1000000,
      launchPrice: 999999,
      size: 548,
      status: UnitStatus.AVAILABLE,
      description: "Residence Five is Keanu\u2019s most expansive home, shaped for longer stays, larger gatherings, and the broadest outlook in the estate.",
      features: {
        land: 860,
        levels: '2 Storey + Rooftop',
        configuration: '6 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Five is structured around scale without excess: generous entertaining zones at lower level, private retreat above, and rooftop living as a final outdoor layer. A central lightwell brings daylight and volume into the heart of the home.',
        setting: 'The residence combines broad internal scale with layered outlooks across ocean, rice field, and greenery, giving it the most expansive private setting in the estate.',
        distinctiveFeatures: "• Keanu\u2019s flagship residence\n• Broadest internal programme in the estate\n• Multigenerational living potential with rooftop ocean outlook",
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 310,
        terrace: 161,
        pool: 95,
        garden: 212,
        upperFloor: 190,
        rooftopArea: 48,
        beds: 7,
        guestSuite: true,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '6A',
      unitType: 'Type I',
      bedrooms: 3,
      bathrooms: 8,
      price: 1000000,
      launchPrice: 999999,
      size: 448,
      status: UnitStatus.AVAILABLE,
      description: "At the estate\u2019s centre, Residence Six balances easier access with the layered privacy of the Type I plan.",
      features: {
        land: 770,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Six combines the vertical zoning of Type I with a more connected estate position. Ground-level living opens toward the pool and planted garden, while the upper levels and rooftop terrace create a quieter sequence of retreat above.',
        setting: 'Positioned closer to the centre of the estate, it benefits from immediate access to shared amenities while maintaining a landscaped residential outlook.',
        distinctiveFeatures: '• Central estate position\n• Immediate access to shared estate amenities\n• Rooftop terrace with ocean outlook above the estate',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 208,
        terrace: 172,
        pool: 80,
        garden: 257,
        upperFloor: 190,
        rooftopArea: 50,
        beds: 4,
        guestSuite: true,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '7A',
      unitType: 'Type I',
      bedrooms: 3,
      bathrooms: 8,
      price: 1000000,
      launchPrice: 999999,
      size: 448,
      status: UnitStatus.AVAILABLE,
      description: 'On the front row, Residence Seven combines broader garden depth with a stronger outward outlook.',
      features: {
        land: 810,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Seven follows the Type I sequence of garden-level living, upper-level retreat, and rooftop outlook. The layout supports clear separation between social and private use while maintaining a strong relationship to the landscape.',
        setting: 'Its front-row setting brings wider ocean views from the upper level and rooftop, while the deeper land parcel gives the ground level a stronger sense of garden privacy.',
        distinctiveFeatures: '• Front-row position\n• Deeper planted garden setting\n• Stronger ocean outlook from upper level and rooftop',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 208,
        terrace: 156,
        pool: 80,
        garden: 298,
        upperFloor: 190,
        rooftopArea: 50,
        beds: 4,
        guestSuite: true,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '8C',
      unitType: 'Type III',
      bedrooms: 3,
      bathrooms: 8,
      price: 1000000,
      launchPrice: 999999,
      size: 321,
      status: UnitStatus.AVAILABLE,
      description: "Set on the estate\u2019s largest plot, Residence Eight gives single-storey living its broadest and most planted expression.",
      features: {
        land: 1060,
        levels: 'Single-storey',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Eight uses its greater land area to extend the single-storey Type III idea: broad internal flow, uninterrupted movement, and a stronger relationship between home, garden, and pool. The internal gallery brings all major spaces into one continuous sequence.',
        setting: 'The largest plot in the estate gives this residence the deepest planted setting and the strongest sense of separation from neighbouring homes.',
        distinctiveFeatures: "• Estate\u2019s largest plot\n• Deepest garden setting\n• Single-storey plan with broad internal flow",
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nGuest suite\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 321,
        terrace: 216,
        pool: 80,
        garden: 395,
        upperFloor: null,
        rooftopArea: null,
        beds: 4,
        guestSuite: true,
        office: true,
        rooftop: false,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '9B',
      unitType: 'Type II',
      bedrooms: 3,
      bathrooms: 7,
      price: 1000000,
      launchPrice: 999999,
      size: 379,
      status: UnitStatus.AVAILABLE,
      description: 'Residence Nine brings the Type II plan to the front row, with a broader outlook and greater openness.',
      features: {
        land: 440,
        levels: '2 Storey + Rooftop',
        configuration: '3 BR',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Nine expresses the Type II plan with a stronger connection to the coast. Social spaces remain grounded to the pool and garden, while upper levels and the rooftop terrace create elevation, privacy, and a more open sense of outlook.',
        setting: 'Its front-row position opens wider views across the estate toward the coastline, particularly from the upper level and rooftop terrace.',
        distinctiveFeatures: '• Front-row placement\n• Stronger coastal outlook\n• Compact footprint with elevated rooftop living',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nOcean-view rooftop terrace\nOffice or study\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 151,
        terrace: 111,
        pool: 60,
        garden: 123,
        upperFloor: 179,
        rooftopArea: 48,
        beds: 3,
        guestSuite: false,
        office: true,
        rooftop: true,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
    {
      unitNumber: '10C',
      unitType: 'Type III',
      bedrooms: 3,
      bathrooms: 7,
      price: 1000000,
      launchPrice: 999999,
      size: 293,
      status: UnitStatus.UNAVAILABLE,
      description: 'Residence Ten balances single-storey beachfront living with a more sheltered, planted setting.',
      features: {
        land: 800,
        levels: 'Single-storey',
        configuration: '3 BR + Guest Suite',
        tenure: 'Leasehold (48 years)',
        leasehold: 48,
        livingConcept: 'Residence Ten is shaped around uninterrupted single-level living, with direct continuity between interior spaces, pool terrace, and planted garden. An internal gallery supports ease of movement and strengthens the calm, horizontal rhythm of the plan.',
        setting: 'Set on a spacious front-row plot, the residence balances ocean proximity with layered planting and a more protected internal outlook.',
        distinctiveFeatures: '• Single-level residential flow\n• Internal gallery\n• Balanced relationship between coastline and planted privacy',
        keyInclusions: 'Private swimming pool\nLandscaped garden and outdoor terraces\nGuest suite\nOutdoor kitchen with integrated BBQ\nDedicated service wing with staff bedroom and ensuite\nWet kitchen and service areas (laundry and storage)\nSeamless indoor–outdoor living\nHigh-performance glazing with large sliding openings\nAccess to estate infrastructure and residential services',
        groundFloor: 293,
        terrace: 180,
        pool: 80,
        garden: 226,
        upperFloor: null,
        rooftopArea: null,
        beds: 4,
        guestSuite: true,
        office: false,
        rooftop: false,
        serviceArea: 'Staff bedroom with ensuite\nSeparate wet kitchen\nLaundry & utility space\nAdditional storage',
      },
    },
  ];

  // Image and floorplan maps
  const mediaByUnit: Record<string, { images: string[], floorplans: string[] }> = {
    "1": {
      "images": [
        "/images/residences/Residence 1/2614CC - Brio - PLOT 1 - VIEW 10 - REV 5- Photos.jpg",
        "/images/residences/Residence 1/2614CC - Brio - PLOT 1 - VIEW 11 - REV 5- Photos.jpg",
        "/images/residences/Residence 1/2614CC - Brio - PLOT 1 - VIEW 9 - REV 5- Photos.jpg",
        "/images/residences/Residence 1/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 1/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 1/Floorplan 1.1.jpeg",
        "/images/residences/Residence 1/Floorplan 1.2.jpeg",
        "/images/residences/Residence 1/Floorplan 1.3.jpeg"
      ]
    },
    "2": {
      "images": [
        "/images/residences/Residence 2/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 2/2614CC - Brio - PLOT 6 - VIEW 7 - REV 5- Photos.jpg",
        "/images/residences/Residence 2/2614CC - Brio - PLOT 6 - VIEW 8 - REV 5- Photos.jpg",
        "/images/residences/Residence 2/2614CC - Brio - PLOT 7 - VIEW 5 - REV 5- Photos.jpg",
        "/images/residences/Residence 2/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 2/Floorplan 2.1.jpeg",
        "/images/residences/Residence 2/Floorplan 2.2.jpeg",
        "/images/residences/Residence 2/Floorplan 2.3.jpeg"
      ]
    },
    "3": {
      "images": [
        "/images/residences/Residence 3/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 3/2614CC - Brio - PLOT 6 - VIEW 7 - REV 5- Photos.jpg",
        "/images/residences/Residence 3/2614CC - Brio - PLOT 6 - VIEW 8 - REV 5- Photos.jpg",
        "/images/residences/Residence 3/2614CC - Brio - PLOT 7 - VIEW 5 - REV 5- Photos.jpg",
        "/images/residences/Residence 3/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 3/Floorplan 3.1.jpeg",
        "/images/residences/Residence 3/Floorplan 3.2.jpeg",
        "/images/residences/Residence 3/Floorplan 3.3.jpeg"
      ]
    },
    "4": {
      "images": [
        "/images/residences/Residence 4/2614CC - Brio - PLOT 8 - VIEW 13 - REV 5- Photos.jpg",
        "/images/residences/Residence 4/2614CC - Brio - PLOT 8 - VIEW 14B - REV 5- Photos.jpg",
        "/images/residences/Residence 4/2614CC - Brio - PLOT 8 - VIEW 14C - REV 5- Photos.jpg",
        "/images/residences/Residence 4/2614CC - Brio - PLOT 8 - VIEW 15 - REV 5- Photos.jpg",
        "/images/residences/Residence 4/2614CC - Brio - PLOT 8 - VIEW 16 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 4/Floorplan 4.jpeg"
      ]
    },
    "5": {
      "images": [
        "/images/residences/Residence 5/2614CC - Brio - PLOT 5 - VIEW 17 - REV 5- Photos.jpg",
        "/images/residences/Residence 5/2614CC - Brio - PLOT 5 - VIEW 18 - REV 5- Photos.jpg",
        "/images/residences/Residence 5/2614CC - Brio - PLOT 5 - VIEW 19 - REV 4- Photos.jpg",
        "/images/residences/Residence 5/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 5/Floorplan 5.1.jpeg",
        "/images/residences/Residence 5/Floorplan 5.2.jpeg",
        "/images/residences/Residence 5/Floorplan 5.3.jpeg"
      ]
    },
    "6": {
      "images": [
        "/images/residences/Residence 6/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 6/2614CC - Brio - PLOT 6 - VIEW 7 - REV 5- Photos.jpg",
        "/images/residences/Residence 6/2614CC - Brio - PLOT 6 - VIEW 8 - REV 5- Photos.jpg",
        "/images/residences/Residence 6/2614CC - Brio - PLOT 7 - VIEW 5 - REV 5- Photos.jpg",
        "/images/residences/Residence 6/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 6/Floorplan 6.1.jpeg",
        "/images/residences/Residence 6/Floorplan 6.2.jpeg",
        "/images/residences/Residence 6/Floorplan 6.3.jpeg"
      ]
    },
    "7": {
      "images": [
        "/images/residences/Residence 7/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 7/2614CC - Brio - PLOT 6 - VIEW 7 - REV 5- Photos.jpg",
        "/images/residences/Residence 7/2614CC - Brio - PLOT 6 - VIEW 8 - REV 5- Photos.jpg",
        "/images/residences/Residence 7/2614CC - Brio - PLOT 7 - VIEW 5 - REV 5- Photos.jpg",
        "/images/residences/Residence 7/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 7/Floorplan 7.1.jpeg",
        "/images/residences/Residence 7/Floorplan 7.2.jpeg",
        "/images/residences/Residence 7/Floorplan 7.3.jpeg"
      ]
    },
    "8": {
      "images": [
        "/images/residences/Residence 8/2614CC - Brio - PLOT 8 - VIEW 13 - REV 5- Photos.jpg",
        "/images/residences/Residence 8/2614CC - Brio - PLOT 8 - VIEW 14B - REV 5- Photos.jpg",
        "/images/residences/Residence 8/2614CC - Brio - PLOT 8 - VIEW 14C - REV 5- Photos.jpg",
        "/images/residences/Residence 8/2614CC - Brio - PLOT 8 - VIEW 15 - REV 5- Photos.jpg",
        "/images/residences/Residence 8/2614CC - Brio - PLOT 8 - VIEW 16 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 8/Floorplan 8.jpeg"
      ]
    },
    "9": {
      "images": [
        "/images/residences/Residence 9/2614CC - Brio - PLOT 1 - VIEW 10 - REV 5- Photos.jpg",
        "/images/residences/Residence 9/2614CC - Brio - PLOT 1 - VIEW 11 - REV 5- Photos.jpg",
        "/images/residences/Residence 9/2614CC - Brio - PLOT 1 - VIEW 9 - REV 5- Photos.jpg",
        "/images/residences/Residence 9/2614CC - Brio - PLOT 6 - VIEW 6 - REV 4- Photos.jpg",
        "/images/residences/Residence 9/2614CC - Brio - PLOT 9 - VIEW 12 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 9/Floorplan 9.1.jpeg",
        "/images/residences/Residence 9/Floorplan 9.2.jpeg",
        "/images/residences/Residence 9/Floorplan 9.3.jpeg"
      ]
    },
    "10": {
      "images": [
        "/images/residences/Residence 10/2614CC - Brio - PLOT 8 - VIEW 13 - REV 5- Photos.jpg",
        "/images/residences/Residence 10/2614CC - Brio - PLOT 8 - VIEW 14B - REV 5- Photos.jpg",
        "/images/residences/Residence 10/2614CC - Brio - PLOT 8 - VIEW 14C - REV 5- Photos.jpg",
        "/images/residences/Residence 10/2614CC - Brio - PLOT 8 - VIEW 15 - REV 5- Photos.jpg",
        "/images/residences/Residence 10/2614CC - Brio - PLOT 8 - VIEW 16 - REV 5- Photos.jpg"
      ],
      "floorplans": [
        "/images/residences/Residence 10/Floorplan 10.jpeg"
      ]
    }
  };

  // Create units
  for (const data of unitData) {
    const residenceNum = data.unitNumber.replace(/[^\d]/g, '');
    const media = mediaByUnit[residenceNum] || { images: [], floorplans: [] };
    
    // Add floorplans to features JSON
    const featuresWithFloorplans = {
      ...data.features,
      floorplans: media.floorplans
    };

    const unit = await prisma.unit.create({
      data: {
        id: randomUUID(),
        projectId: project.id,
        unitNumber: data.unitNumber,
        unitType: data.unitType,
        floor: null,
        size: data.size,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        price: data.price,
        launchPrice: data.launchPrice,
        shortlistCount: faker.number.int({ min: 5, max: 25 }),
        status: data.status,
        description: data.description,
        floorPlanUrl: media.floorplans[0] || `/images/floor-plan.svg`, // Keep first as fallback
        imageUrls: media.images.length > 0 ? media.images : [],
        features: featuresWithFloorplans,
        xPosition: null,
        yPosition: null,
      },
    });

    units.push(unit);
  }

  console.log(`  ✅ Created ${units.length} units for ${project.name}`);
  return units;
}