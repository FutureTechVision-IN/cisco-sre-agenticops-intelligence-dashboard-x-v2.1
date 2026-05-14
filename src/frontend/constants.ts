import { DashboardData, IntelligenceData, VoiceScenario } from './types';

// Filter Options - These are the default static options shown in dropdowns
// Dynamic options are loaded from API for full lists
export const CUSTOMER_OPTIONS = [
  'All Customers',
  // Top customers shown as quick selections - full list loaded via API
  '3M INNOVATIVE PROPERTIES COMPANY',
  'AMAZON',
  'BANK OF AMERICA GLOBAL ENTERPRISE',
  'BOEING',
  'BRISTOL MYERS SQUIBB',
  'CIGNA HEALTH CORPORATION',
  'COSTCO WHOLESALE',
  'CVS',
  'DELTA TECHNOLOGY',
  'DISNEY CORPORATION',
  'DUKE ENERGY',
  'EXXON MOBIL - GLOBAL',
  'FEDEX',
  'FORD',
  'GENERAL MOTORS GLOBAL',
  'GOLDMAN SACHS',
  'HCA HEALTHCARE',
  'HOME DEPOT USA, INC.',
  'HSBC',
  'INTEL CORPORATION',
  'JOHNSON & JOHNSON',
  'JPMORGAN CHASE & CO.',
  'KAISER FOUNDATION HEALTH PLAN INC',
  'LOWES',
  'MASTERCARD',
  'MAYO FOUNDATION',
  'MCKESSON CORPORATION',
  'MICROSOFT AZURE',
  'MORGAN STANLEY - GLOBAL',
  'NAVY FEDERAL CREDIT UNION',
  'NIKE, INC',
  'PFIZER',
  'PNC BANK',
  'PROCTER AND GAMBLE',
  'ROCHE',
  'SCOTIABANK',
  'SHELL OFFSHORE SERVICES COMPANY',
  'STARBUCKS CORP',
  'TARGET',
  'TOYOTA MANUFACTURING',
  'UNITED AIR LINES INC',
  'UNITED HEALTH GROUP',
  'USAA',
  'VERIZON WIRELESS',
  'VISA',
  'WAL-MART CSPC',
  'WELLS FARGO MASTER ACCOUNT'
];

export const FN_OPTIONS = [
  'All Field Notices',
  // Top field notices - full list loaded via API (482 total)
  'FN62840',
  'FN63046',
  'FN63109',
  'FN63110',
  'FN70464',
  'FN70496',
  'FN70546',
  'FN72270',
  'FN72399',
  'FN74001',
  'FN74002',
  'FN74296'
];

export const TYPE_OPTIONS = [
  'All Types',
  'Hardware',
  'Software'
];

export const MONTH_OPTIONS = [
  'All Months',
  'April 2025',
  'May 2025',
  'June 2025',
  'July 2025',
  'August 2025',
  'September 2025',
  'October 2025',
  'November 2025',
  'December 2025',
  'January 2026'
];

// Helper to generate trend data
const generateTrendData = (base: number, volatility: number, trend: number, points: number) => {
  return Array.from({ length: points }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - i));
    const randomVar = (Math.random() - 0.5) * volatility;
    const trendVar = i * trend;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.floor(base + trendVar + randomVar)
    };
  });
};

// Field Notice titles for generating realistic data
const FN_TITLES = [
  'Cisco IP Phones Might Fail to Operate Correctly Due to Expired Manufacturer Installed Certificate - Configuration Change Recommended',
  'Webex Calling Does Not Work With HW V15 or Later IP Phones - Replace on Failure',
  'ASR 900/NCS 4200 with RSP2 Products Do Not Support Software Version Rollback - Workaround Provided',
  'PAK Licenses Will Not Be Supported on ASR 920 and NCS 520 Routers - Software Upgrade Recommended',
  'Catalyst 2960X/2960XR: Counterfeit Detection With SUDI Verification Feature - Software Upgrade Recommended',
  'Cisco Catalyst 9000 Series Switches May Experience Memory Leak - Software Upgrade Recommended',
  'Cisco ASA and FTD Software Web Services Interface Buffer Overflow Vulnerability - Software Upgrade Recommended',
  'Cisco ISE Authentication Bypass Vulnerability - Software Upgrade Recommended',
  'Cisco Nexus 9000 Series Switches - High CPU Usage Under Specific Conditions - Workaround Available',
  'Cisco UCS Manager Software Authentication Issues - Software Upgrade Recommended',
  'Cisco Firepower Threat Defense Software SSL VPN Memory Issues - Software Upgrade Recommended',
  'Cisco SD-WAN vManage Unauthorized Access Vulnerability - Immediate Patching Required',
  'Cisco Webex Meetings Desktop App Privilege Escalation - Software Upgrade Recommended',
  'Cisco AnyConnect Secure Mobility Client DLL Injection Vulnerability - Configuration Change Required',
  'Cisco DNA Center Command Injection Vulnerability - Software Upgrade Recommended',
  'Cisco Meraki MX Series Firewall Configuration Exposure - Configuration Change Recommended',
  'Cisco Prime Infrastructure SQL Injection Vulnerability - Software Upgrade Required',
  'Cisco Unified Communications Manager Remote Code Execution - Immediate Patching Required',
  'Cisco Aironet Access Points Denial of Service - Software Upgrade Recommended',
  'Cisco Identity Services Engine Cross-Site Scripting - Software Upgrade Recommended',
  'Cisco Expressway Series CSRF Vulnerability - Software Upgrade Required',
  'Cisco Email Security Appliance Information Disclosure - Configuration Change Recommended',
  'Cisco Web Security Appliance Memory Corruption - Software Upgrade Required',
  'Cisco TelePresence Endpoints Remote Code Execution - Immediate Patching Required',
  'Cisco Wireless LAN Controller Buffer Overflow - Software Upgrade Recommended',
  'Cisco IOS XE Software Authentication Bypass - Critical Security Update Required',
  'Cisco Small Business Router Arbitrary Command Execution - Firmware Update Required',
  'Cisco Jabber Protocol Handler Command Injection - Software Upgrade Recommended',
  'Cisco Meeting Server Information Disclosure - Configuration Change Recommended',
  'Cisco Umbrella API Key Exposure - Immediate Credential Rotation Required',
];

// Customer names for generating realistic data
const CUSTOMER_NAMES = [
  'WELLS FARGO MASTER ACCOUNT', 'HOME DEPOT USA, INC.', 'MORGAN STANLEY - GLOBAL', 'HCA HEALTHCARE',
  'NAVY FEDERAL CREDIT UNION', 'GEISINGER HEALTH SYSTEM FOUNDATION', 'NYC HEALTH AND HOSPITALS CORPORATION',
  'PIEDMONT HOSPITAL INC', 'COSTCO WHOLESALE', 'FORD', 'CARNIVAL CRUISE LINES', 'VERIZON ITNUC',
  'MERCK SHARP & DOHME CORPORATION', 'VIHA', 'TELECOM ITALIA', 'TRUIST', 'COLES GROUP LTD',
  'BJC HEALTH SYSTEM', 'SCOTIABANK', 'BRISTOL MYERS SQUIBB', 'AMAZON', 'MICROSOFT AZURE',
  'JPMORGAN CHASE & CO.', 'BANK OF AMERICA GLOBAL ENTERPRISE', 'GOOGLE CLOUD', 'APPLE INC',
  'INTEL CORPORATION', 'NVIDIA CORPORATION', 'ORACLE SYSTEMS', 'IBM GLOBAL SERVICES',
  'CISCO SYSTEMS', 'DELL TECHNOLOGIES', 'HP ENTERPRISE', 'SALESFORCE.COM', 'ADOBE SYSTEMS',
  'VMWARE INC', 'SERVICENOW', 'WORKDAY INC', 'SNOWFLAKE COMPUTING', 'CROWDSTRIKE HOLDINGS',
  'PALO ALTO NETWORKS', 'FORTINET INC', 'ZSCALER INC', 'OKTA INC', 'SPLUNK INC',
  'DATADOG INC', 'ELASTIC NV', 'MONGODB INC', 'CLOUDFLARE INC', 'FASTLY INC',
  'UNITED HEALTH GROUP', 'KAISER PERMANENTE', 'ANTHEM BLUE CROSS', 'CIGNA HEALTH CORPORATION',
  'AETNA HEALTH SYSTEMS', 'HUMANA INC', 'CENTENE CORPORATION', 'MOLINA HEALTHCARE',
  'CVS HEALTH CORP', 'WALGREENS BOOTS ALLIANCE', 'MCKESSON CORPORATION', 'AMERISOURCEBERGEN',
  'CARDINAL HEALTH', 'EXPRESS SCRIPTS', 'OPTUM HEALTH', 'QUEST DIAGNOSTICS',
  'LABORATORY CORP OF AMERICA', 'DAVITA HEALTHCARE', 'FRESENIUS MEDICAL CARE', 'TENET HEALTHCARE',
  'COMMUNITY HEALTH SYSTEMS', 'UNIVERSAL HEALTH SERVICES', 'ASCENSION HEALTH', 'PROVIDENCE HEALTH',
  'TRINITY HEALTH', 'SUTTER HEALTH', 'BANNER HEALTH', 'ADVOCATE AURORA HEALTH',
  'NORTHWELL HEALTH', 'MOUNT SINAI HEALTH SYSTEM', 'NYU LANGONE HEALTH', 'MASS GENERAL BRIGHAM',
  'CLEVELAND CLINIC', 'MAYO CLINIC', 'JOHNS HOPKINS MEDICINE', 'STANFORD HEALTH CARE',
  'CEDARS-SINAI MEDICAL CENTER', 'UCLA HEALTH', 'UCSF HEALTH', 'UNIVERSITY OF CHICAGO MEDICINE',
  'NORTHWESTERN MEMORIAL', 'RUSH UNIVERSITY MEDICAL', 'BAYLOR SCOTT & WHITE', 'TEXAS HEALTH RESOURCES',
  'MEMORIAL HERMANN HEALTH', 'METHODIST HEALTH SYSTEM', 'PARKLAND HEALTH', 'UT SOUTHWESTERN',
  'EMORY HEALTHCARE', 'GRADY HEALTH SYSTEM', 'ATRIUM HEALTH', 'DUKE UNIVERSITY HEALTH',
  'WAKE FOREST BAPTIST', 'UNIVERSITY OF VIRGINIA HEALTH', 'INOVA HEALTH SYSTEM', 'MEDSTAR HEALTH',
  'CHRISTIANA CARE', 'JEFFERSON HEALTH', 'PENN MEDICINE', 'UPMC HEALTH SYSTEM',
  'ALLEGHENY HEALTH NETWORK', 'GEISINGER MEDICAL CENTER', 'LEHIGH VALLEY HEALTH', 'VIRTUA HEALTH',
  'HACKENSACK MERIDIAN HEALTH', 'RWJBARNABAS HEALTH', 'ATLANTIC HEALTH SYSTEM', 'YALE NEW HAVEN HEALTH',
  'HARTFORD HEALTHCARE', 'BAYSTATE HEALTH', 'UMASS MEMORIAL HEALTH', 'BOSTON MEDICAL CENTER',
  'BETH ISRAEL LAHEY HEALTH', 'TUFTS MEDICAL CENTER', 'LIFESPAN HEALTH', 'CARE NEW ENGLAND',
  'MAINHEALTH', 'DARTMOUTH-HITCHCOCK', 'UNIVERSITY OF VERMONT HEALTH', 'ALBANY MED HEALTH',
  'ROCHESTER REGIONAL HEALTH', 'UPSTATE UNIVERSITY HOSPITAL', 'KALEIDA HEALTH', 'CATHOLIC HEALTH',
  'EXCELLUS BCBS', 'INDEPENDENT HEALTH', 'FIDELIS CARE', 'HEALTHFIRST NY',
  'EMBLEMHEALTH', 'OSCAR HEALTH', 'CLOVER HEALTH', 'DEVOTED HEALTH',
  'ALIGNMENT HEALTHCARE', 'BRIGHT HEALTH', 'CITYBLOCK HEALTH', 'IORA HEALTH',
  'OAK STREET HEALTH', 'AGILON HEALTH', 'PRIVIA HEALTH', 'ALEDADE INC',
  'INNOVACCER INC', 'HEALTH CATALYST', 'OMADA HEALTH', 'LIVONGO HEALTH',
  'TELADOC HEALTH', 'AMWELL', 'DOCTOR ON DEMAND', 'MDLIVE',
  'HIMS & HERS HEALTH', 'RO HEALTH', 'NURX INC', 'CARBON HEALTH',
  'FORWARD HEALTH', 'ONE MEDICAL', 'PARSLEY HEALTH', 'TALKSPACE',
  'HEADSPACE HEALTH', 'LYRA HEALTH', 'SPRING HEALTH', 'MODERN HEALTH',
  'CALM.COM', 'NOOM INC', 'PELOTON INTERACTIVE', 'WHOOP INC',
  'OURA HEALTH', 'FITBIT INC', 'GARMIN INTERNATIONAL', 'POLAR ELECTRO',
  'ABBOTT LABORATORIES', 'MEDTRONIC PLC', 'BOSTON SCIENTIFIC', 'STRYKER CORPORATION',
  'ZIMMER BIOMET', 'JOHNSON & JOHNSON MEDICAL', 'BECTON DICKINSON', 'BAXTER INTERNATIONAL',
  'EDWARDS LIFESCIENCES', 'INTUITIVE SURGICAL', 'DEXCOM INC', 'INSULET CORPORATION',
  'TANDEM DIABETES', 'NEVRO CORP', 'AXONICS INC', 'INSPIRE MEDICAL SYSTEMS',
  'PENUMBRA INC', 'SHOCKWAVE MEDICAL', 'INMODE LTD', 'HOLOGIC INC',
  'IDEXX LABORATORIES', 'ILLUMINA INC', 'THERMO FISHER SCIENTIFIC', 'AGILENT TECHNOLOGIES',
  'WATERS CORPORATION', 'METTLER-TOLEDO', 'BRUKER CORPORATION', 'PERKINELMER INC',
  'BIO-RAD LABORATORIES', 'BIO-TECHNE CORPORATION', 'REPLIGEN CORPORATION', 'SARTORIUS AG',
  'CHARLES RIVER LABS', 'ICON PLC', 'IQVIA HOLDINGS', 'PPD INC',
  'SYNEOS HEALTH', 'PAREXEL INTERNATIONAL', 'COVANCE INC', 'LABCORP DRUG DEVELOPMENT',
  'PRA HEALTH SCIENCES', 'MEDPACE HOLDINGS', 'PREMIER RESEARCH', 'CATO RESEARCH',
  'ROCHE DIAGNOSTICS', 'SIEMENS HEALTHINEERS', 'GE HEALTHCARE', 'PHILIPS HEALTHCARE',
  'CANON MEDICAL SYSTEMS', 'FUJIFILM MEDICAL', 'SAMSUNG HEALTH', 'MINDRAY MEDICAL',
  'EXXON MOBIL GLOBAL', 'CHEVRON CORPORATION', 'SHELL OIL COMPANY', 'BP AMERICA',
  'CONOCOPHILLIPS', 'MARATHON PETROLEUM', 'VALERO ENERGY', 'PHILLIPS 66',
  'OCCIDENTAL PETROLEUM', 'APACHE CORPORATION', 'DEVON ENERGY', 'PIONEER NATURAL RESOURCES',
  'EOG RESOURCES', 'DIAMONDBACK ENERGY', 'COTERRA ENERGY', 'HESS CORPORATION',
  'HALLIBURTON COMPANY', 'SCHLUMBERGER LIMITED', 'BAKER HUGHES', 'NATIONAL OILWELL VARCO',
  'TECHNIPFMC PLC', 'TRANSOCEAN LTD', 'NOBLE CORPORATION', 'VALARIS LIMITED',
  'DELTA AIR LINES', 'UNITED AIRLINES', 'AMERICAN AIRLINES', 'SOUTHWEST AIRLINES',
  'JETBLUE AIRWAYS', 'ALASKA AIR GROUP', 'SPIRIT AIRLINES', 'FRONTIER AIRLINES',
  'HAWAIIAN AIRLINES', 'ALLEGIANT TRAVEL', 'SUN COUNTRY AIRLINES', 'BREEZE AIRWAYS',
  'FedEx Corporation', 'UPS GLOBAL', 'DHL EXPRESS', 'XPO LOGISTICS',
  'JB HUNT TRANSPORT', 'LANDSTAR SYSTEM', 'SAIA INC', 'OLD DOMINION FREIGHT',
  'WERNER ENTERPRISES', 'HEARTLAND EXPRESS', 'KNIGHT-SWIFT TRANSPORT', 'SCHNEIDER NATIONAL',
  'UNION PACIFIC CORP', 'BNSF RAILWAY', 'CSX CORPORATION', 'NORFOLK SOUTHERN',
  'CANADIAN PACIFIC', 'CANADIAN NATIONAL', 'KANSAS CITY SOUTHERN', 'GENESEE & WYOMING',
  'WAL-MART STORES INC', 'TARGET CORPORATION', 'KROGER COMPANY', 'ALBERTSONS COMPANIES',
  'PUBLIX SUPERMARKETS', 'AHOLD DELHAIZE', 'HEB GROCERY', 'MEIJER INC',
  'WEGMANS FOOD MARKETS', 'TRADER JOES COMPANY', 'ALDI INC', 'LIDL US',
  'WHOLE FOODS MARKET', 'SPROUTS FARMERS MARKET', 'NATURAL GROCERS', 'FRESH THYME',
  'LOWES COMPANIES', 'MENARDS INC', 'ACE HARDWARE', 'TRUE VALUE COMPANY',
  'HARBOR FREIGHT TOOLS', 'NORTHERN TOOL', 'TRACTOR SUPPLY', 'RURAL KING',
  'BEST BUY CO INC', 'GAMESTOP CORP', 'MICROCENTER', 'NEWEGG INC',
  'BH PHOTO VIDEO', 'ADORAMA CAMERA', 'AMAZON DEVICES', 'APPLE RETAIL',
  'NORDSTROM INC', 'MACYS INC', 'KOHLS CORPORATION', 'JC PENNEY',
  'DILLARDS INC', 'BELK INC', 'STAGE STORES', 'BEALLS INC',
  'TJX COMPANIES', 'ROSS STORES', 'BURLINGTON STORES', 'DD DISCOUNT',
  'FIVE BELOW', 'DOLLAR GENERAL', 'DOLLAR TREE', 'FAMILY DOLLAR',
  'BIG LOTS INC', 'OLLIES BARGAIN', 'TUESDAY MORNING', 'CHRISTMAS TREE SHOPS',
  'STAPLES INC', 'OFFICE DEPOT', 'OFFICEMAX', 'WB MASON',
  'FASTENAL COMPANY', 'GRAINGER WW', 'MSC INDUSTRIAL', 'ULINE INC',
  'SYSCO CORPORATION', 'US FOODS INC', 'PERFORMANCE FOOD GROUP', 'GORDON FOOD SERVICE',
  'ARAMARK CORPORATION', 'COMPASS GROUP', 'SODEXO INC', 'ELIOR GROUP',
  'STARBUCKS CORPORATION', 'DUNKIN BRANDS', 'MCDONALDS CORP', 'BURGER KING',
  'WENDYS COMPANY', 'TACO BELL', 'KFC CORPORATION', 'PIZZA HUT',
  'DOMINOS PIZZA', 'PAPA JOHNS', 'LITTLE CAESARS', 'MARCOS PIZZA',
  'CHIPOTLE MEXICAN', 'QDOBA MEXICAN', 'MOE SW GRILL', 'TACO CABANA',
  'SUBWAY RESTAURANTS', 'JERSEY MIKES', 'JIMMY JOHNS', 'FIREHOUSE SUBS',
  'FIVE GUYS BURGERS', 'IN-N-OUT BURGER', 'SHAKE SHACK', 'SMASHBURGER',
  'CHICK-FIL-A', 'POPEYES LOUISIANA', 'RAISING CANES', 'WINGSTOP INC',
  'PANDA EXPRESS', 'PF CHANGS', 'BENIHANA INC', 'KURA SUSHI',
  'DARDEN RESTAURANTS', 'BRINKER INTERNATIONAL', 'BLOOMIN BRANDS', 'CRACKER BARREL',
  'TEXAS ROADHOUSE', 'BJS RESTAURANTS', 'THE CHEESECAKE FACTORY', 'FIRST WATCH',
  'IHOP CORPORATION', 'DENNYS INC', 'WAFFLE HOUSE', 'PERKINS RESTAURANTS',
  'MARRIOTT INTERNATIONAL', 'HILTON WORLDWIDE', 'HYATT HOTELS', 'IHG HOTELS',
  'WYNDHAM HOTELS', 'CHOICE HOTELS', 'BEST WESTERN', 'RADISSON HOTELS',
  'FOUR SEASONS HOTELS', 'RITZ-CARLTON', 'MANDARIN ORIENTAL', 'PENINSULA HOTELS',
  'DISNEY PARKS & RESORTS', 'UNIVERSAL PARKS', 'SEAWORLD PARKS', 'SIX FLAGS',
  'CEDAR FAIR LP', 'COMCAST PARKS', 'MERLIN ENTERTAINMENTS', 'LEGOLAND PARKS',
  'MGM RESORTS', 'CAESARS ENTERTAINMENT', 'WYNN RESORTS', 'LAS VEGAS SANDS',
  'HARD ROCK INTERNATIONAL', 'MOHEGAN SUN', 'FOXWOODS RESORT', 'SEMINOLE GAMING',
  'ROYAL CARIBBEAN', 'NORWEGIAN CRUISE', 'MSC CRUISES', 'VIKING CRUISES',
  'PRINCESS CRUISES', 'HOLLAND AMERICA', 'CUNARD LINE', 'CELEBRITY CRUISES',
  'DISNEY CRUISE LINE', 'VIRGIN VOYAGES', 'OCEANIA CRUISES', 'REGENT SEVEN SEAS',
  'GENERAL MOTORS GLOBAL', 'TOYOTA MOTOR NORTH AMERICA', 'HONDA NORTH AMERICA', 'NISSAN USA',
  'HYUNDAI MOTOR AMERICA', 'KIA MOTORS AMERICA', 'SUBARU OF AMERICA', 'MAZDA USA',
  'VOLKSWAGEN AMERICA', 'BMW OF NORTH AMERICA', 'MERCEDES-BENZ USA', 'AUDI OF AMERICA',
  'PORSCHE CARS NA', 'VOLVO CARS USA', 'JAGUAR LAND ROVER', 'FERRARI NORTH AMERICA',
  'TESLA INC', 'RIVIAN AUTOMOTIVE', 'LUCID MOTORS', 'LORDSTOWN MOTORS',
  'FISKER INC', 'CANOO INC', 'FARADAY FUTURE', 'WORKHORSE GROUP',
  'CUMMINS INC', 'PACCAR INC', 'NAVISTAR INTERNATIONAL', 'OSHKOSH CORPORATION',
  'CATERPILLAR INC', 'DEERE & COMPANY', 'CNH INDUSTRIAL', 'AGCO CORPORATION',
  'BOEING COMPANY', 'LOCKHEED MARTIN', 'NORTHROP GRUMMAN', 'RAYTHEON TECHNOLOGIES',
  'GENERAL DYNAMICS', 'L3HARRIS TECHNOLOGIES', 'BAE SYSTEMS USA', 'LEIDOS HOLDINGS',
  'BOOZ ALLEN HAMILTON', 'SAIC INC', 'CACI INTERNATIONAL', 'MANTECH INTERNATIONAL',
  'PARSONS CORPORATION', 'KBR INC', 'JACOBS ENGINEERING', 'FLUOR CORPORATION',
  'AECOM', 'WSP USA', 'STANTEC INC', 'TETRA TECH',
  'HDR INC', 'BURNS & MCDONNELL', 'BLACK & VEATCH', 'PARSONS BRINCKERHOFF',
  'BECHTEL CORPORATION', 'KIEWIT CORPORATION', 'TURNER CONSTRUCTION', 'SKANSKA USA',
  'WHITING-TURNER', 'HENSEL PHELPS', 'GILBANE BUILDING', 'SUFFOLK CONSTRUCTION',
  'MORTENSON COMPANY', 'DPR CONSTRUCTION', 'MCCARTHY BUILDING', 'HOLDER CONSTRUCTION',
  'AT&T CORPORATION', 'VERIZON COMMUNICATIONS', 'T-MOBILE USA', 'SPRINT CORPORATION',
  'COMCAST CORPORATION', 'CHARTER COMMUNICATIONS', 'COX COMMUNICATIONS', 'ALTICE USA',
  'DISH NETWORK', 'DIRECTV LLC', 'LUMEN TECHNOLOGIES', 'FRONTIER COMMUNICATIONS',
  'WINDSTREAM HOLDINGS', 'CONSOLIDATED COMMUNICATIONS', 'CINCINNATI BELL', 'SHENANDOAH TELECOM',
  'CROWN CASTLE', 'AMERICAN TOWER', 'SBA COMMUNICATIONS', 'UNITI GROUP',
  'CORNING INCORPORATED', 'COMMSCOPE HOLDING', 'CIENA CORPORATION', 'JUNIPER NETWORKS',
  'ARISTA NETWORKS', 'EXTREME NETWORKS', 'CALIX INC', 'ADTRAN INC'
];

// Real top Field Notice IDs from audit (Dec 8, 2025)
// These are the actual top Field Notices by vulnerability count from the CSV data
const REAL_TOP_FIELD_NOTICES = [
  { id: 'FN70496', title: 'Cisco IP Phones Might Fail to Operate Correctly Due to Expired Certificate', vuln: 3249961, pot: 0, secure: 0 },
  { id: 'FN70546', title: 'Webex Calling Does Not Work With HW V15 or Later IP Phones', vuln: 2496281, pot: 0, secure: 0 },
  { id: 'FN70464', title: 'ASR 900/NCS 4200 with RSP2 and RSP2A Might Experience Fan Failure', vuln: 222554, pot: 0, secure: 0 },
  { id: 'FN72270', title: 'PAK Licenses Will Not Be Supported After January 2023', vuln: 194379, pot: 0, secure: 0 },
  { id: 'FN72399', title: 'Catalyst 2960X/2960XR: Counter Value Might Appear Incorrect', vuln: 147036, pot: 13208, secure: 2639929 },
  { id: 'FN64190', title: 'Cisco IOS XE - Show commands might not display output', vuln: 127277, pot: 105, secure: 5238409 },
  { id: 'FN72294', title: 'PAK Licenses Will Not Be Supported After January 2023', vuln: 113128, pot: 0, secure: 0 },
  { id: 'FN70320', title: 'Nexus 3000, 3500, and 9000 BIOS Password May Be Bypassed', vuln: 69203, pot: 7810, secure: 1294700 },
  { id: 'FN74186', title: 'Certain Operations on Nexus Dashboard May Fail', vuln: 49085, pot: 0, secure: 314550 },
  { id: 'FN64131', title: 'RSP720 Accelerated Battery Discharge', vuln: 29942, pot: 0, secure: 0 },
  { id: 'FN64191', title: 'Catalyst 3850/3650 Switches That Use SNMP', vuln: 25310, pot: 21245, secure: 5321988 },
  { id: 'FN70538', title: 'Required Upgrade to a Later ACI/APIC Release', vuln: 18671, pot: 0, secure: 344501 },
  { id: 'FN70605', title: 'Some NCS 560 RSP4 Might Fail to Boot', vuln: 18232, pot: 0, secure: 0 },
  { id: 'FN70358', title: 'NCS 2000 Single Shelf Controller Might Experience Issues', vuln: 17103, pot: 0, secure: 0 },
  { id: 'FN72242', title: 'Limited Number of Cisco Catalyst Switches May Have Issues', vuln: 13646, pot: 0, secure: 0 },
];

// Generate 500+ field notices dynamically using real data as base
const generateFieldNotices = (count: number) => {
  const fieldNotices = [];
  
  // First add real top field notices from audit
  for (let i = 0; i < REAL_TOP_FIELD_NOTICES.length && i < count; i++) {
    const fn = REAL_TOP_FIELD_NOTICES[i];
    fieldNotices.push({
      id: fn.id,
      title: `${fn.id} - ${fn.title}`,
      vulnerableCount: fn.vuln,
      potentialCount: fn.pot,
      secureCount: fn.secure,
    });
  }
  
  // Generate additional synthetic entries if needed
  let vulnBase = 10000;
  for (let i = REAL_TOP_FIELD_NOTICES.length; i < count; i++) {
    // Use different FN number ranges to avoid conflicts with real IDs
    const fnNumber = 62000 + Math.floor((i - REAL_TOP_FIELD_NOTICES.length) * 0.5);
    const titleIdx = i % FN_TITLES.length;
    const vulnCount = Math.max(100, Math.floor(vulnBase * Math.pow(0.985, i - REAL_TOP_FIELD_NOTICES.length)));
    const potentialCount = Math.floor(vulnCount * (0.08 + Math.random() * 0.15));
    const secureCount = Math.floor(vulnCount * (0.3 + Math.random() * 0.5));
    fieldNotices.push({
      id: `FN${fnNumber}`,
      title: `FN${fnNumber} - ${FN_TITLES[titleIdx]}`,
      vulnerableCount: vulnCount,
      potentialCount: potentialCount,
      secureCount: secureCount,
    });
  }
  return fieldNotices;
};

// Generate 500+ customers dynamically
const generateCustomers = (count: number) => {
  const customers = [];
  let vulnBase = 350000;
  const riskLevels = ['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'];
  const trends = ['increasing', 'stable', 'decreasing'];
  const priorities = ['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW'];
  
  for (let i = 0; i < count; i++) {
    const nameIdx = i % CUSTOMER_NAMES.length;
    const suffix = i >= CUSTOMER_NAMES.length ? ` - REGION ${Math.floor(i / CUSTOMER_NAMES.length)}` : '';
    const vulnCount = Math.max(500, Math.floor(vulnBase * Math.pow(0.988, i)));
    const potentialCount = Math.floor(vulnCount * (0.5 + Math.random() * 1.2));
    const secureCount = Math.floor(vulnCount * (1.5 + Math.random() * 4));
    const recordCount = Math.floor(150 + Math.random() * 400);
    const riskIdx = Math.min(riskLevels.length - 1, Math.floor(i / (count / riskLevels.length)));
    const trendIdx = Math.floor(Math.random() * trends.length);
    const priorityIdx = Math.min(priorities.length - 1, Math.floor(i / (count / priorities.length)));
    
    customers.push({
      name: `${CUSTOMER_NAMES[nameIdx]}${suffix}`,
      vulnerableCount: vulnCount,
      potentialCount: potentialCount,
      secureCount: secureCount,
      recordCount: recordCount,
      riskLevel: riskLevels[riskIdx],
      trend: trends[trendIdx],
      priority: priorities[priorityIdx],
    });
  }
  return customers;
};

// Pre-generate 500 field notices and customers for dropdown support
const GENERATED_FIELD_NOTICES = generateFieldNotices(500);
const GENERATED_CUSTOMERS = generateCustomers(500);

export const MOCK_DATA: DashboardData = {
  lastUpdated: "2026-02-20T10:30:00", // Feb 20, 2026 10:30:00 AM
  metrics: {
    totalAssessed: {
      id: 'total-assessed',
      label: 'Total Assessed Assets',
      value: 554966657,
      subtext: 'Across all monitored environments',
      color: 'blue',
      history: generateTrendData(280000000, 500000, 100000, 30),
      deepDive: {
        definition: "The sum of all systems currently under monitoring and assessment across your infrastructure. This represents the complete asset inventory scope for vulnerability management.",
        methodology: "Total = Vulnerable Assets + Potentially Vulnerable Assets + Secure Assets",
        dataSources: "CMDB, Cloud Asset Inventory, Network Scanners",
        inclusions: ["Servers (physical and virtual)", "Network devices (routers, switches)", "Cloud instances", "Containers", "APIs and microservices", "IoT devices"],
        exclusions: ["Decommissioned systems", "Test/development sandbox environments", "Offline/archived systems"],
        businessContext: "This is your baseline for all security metrics. A larger asset inventory increases the potential attack surface. Regular audits ensure accurate counts."
      }
    },
    secure: {
      id: 'secure-assets',
      label: 'Secure Assets',
      value: 241169065,
      subtext: 'Target: >90%',
      percentage: 85.8,
      trend: 0.2,
      color: 'green',
      history: generateTrendData(240000000, 200000, 50000, 30),
      deepDive: {
        definition: "Assets that have been scanned and confirmed to have no known critical or high-severity vulnerabilities.",
        methodology: "(notVulnerable / totalAssessed) × 100",
        dataSources: "Vulnerability Scanners, Patch Management Systems",
        inclusions: ["Fully patched systems", "Systems with compensatory controls"],
        exclusions: ["Assets with open low/medium vulnerabilities (counted separately)", "Unscanned assets"],
        businessContext: "A high percentage indicates a strong security posture and effective patch management processes."
      }
    },
    potential: {
      id: 'potential-vulnerable',
      label: 'Potentially Vulnerable',
      value: 32792394,
      subtext: 'Investigation needed',
      percentage: 11.7,
      trend: 3.8,
      color: 'amber',
      history: generateTrendData(32000000, 400000, 20000, 30),
      deepDive: {
        definition: "Assets that match criteria for known vulnerabilities but require manual verification or have inconclusive scan results.",
        methodology: "(potentiallyVulnerable / totalAssessed) × 100",
        dataSources: "Heuristic Analysis, Field Notice Matching",
        inclusions: ["Version matches without configuration verification", "Suspected configuration drift"],
        exclusions: ["Confirmed vulnerable systems", "False positives marked by analysts"],
        businessContext: "Represents the operational backlog for security analysts. Reducing this number improves clarity of risk."
      }
    },
    vulnerable: {
      id: 'vulnerable-assets',
      label: 'Vulnerable Assets',
      value: 6997430,
      subtext: 'Critical Action',
      percentage: 2.5,
      trend: -12.9,
      color: 'rose',
      history: generateTrendData(8000000, 100000, -30000, 30),
      deepDive: {
        definition: "Assets confirmed to be affected by one or more known security vulnerabilities (CVEs) or Field Notices.",
        methodology: "(vulnerable / totalAssessed) × 100",
        dataSources: "CVE Database, Cisco PSIRT, Vulnerability Scanners",
        inclusions: ["Unpatched critical/high CVEs", "Hardware affected by Field Notices"],
        exclusions: ["Mitigated vulnerabilities", "Accepted risks"],
        businessContext: "Direct indicator of organizational risk. The primary goal is to minimize this metric through rapid remediation."
      }
    }
  },
  // Extended KPIs - Two new performance metrics
  extendedKPIs: [
    {
      id: 'risk-score-index',
      label: 'Risk Score Index',
      value: 72.4,
      displayValue: '72.4',
      unit: '/100',
      subtext: 'Composite security health score',
      trend: -5.2,
      trendDirection: 'down',
      isPositiveGood: false, // Lower risk score is better
      color: 'orange',
      icon: 'Shield',
      target: 85,
      targetLabel: 'Target: <50',
      history: generateTrendData(75, 3, -0.2, 30),
      aiInsight: 'Risk score has improved by 5.2% this month due to accelerated patch deployment. Continue focus on critical CVEs to reach target score of 50.'
    },
    {
      id: 'mttr',
      label: 'Mean Time to Remediate',
      value: 18.5,
      displayValue: '18.5',
      unit: 'days',
      subtext: 'Average remediation time for critical issues',
      trend: -12.3,
      trendDirection: 'down',
      isPositiveGood: false, // Lower MTTR is better
      color: 'cyan',
      icon: 'Clock',
      target: 14,
      targetLabel: 'Target: <14 days',
      history: generateTrendData(22, 2, -0.15, 30),
      aiInsight: 'MTTR has decreased by 3.5 days compared to last quarter. Automated patching for low-risk vulnerabilities has significantly reduced average remediation time.'
    }
  ],
  growthMetrics: [
    {
      label: "Vulnerable Growth",
      value: "1,167,640",
      percentageChange: -12.9,
      absoluteChange: "(-172,686)",
      subtext: "MoM",
      isPositiveGood: false,
      history: generateTrendData(1200000, 50000, -5000, 30),
      aiAnalysis: "Consistent decline in vulnerability growth indicates effective remediation strategies. Anomaly detected on Nov 15th associated with new CVE release."
    },
    {
      label: "Potentially Vulnerable Growth",
      value: "6,444,468",
      percentageChange: 3.8,
      absoluteChange: "(+232,939)",
      subtext: "MoM",
      isPositiveGood: false,
      history: generateTrendData(6000000, 100000, 20000, 30),
      aiAnalysis: "Slight increase driven by new heuristic patterns added to the detection engine. Expect stabilization within 7 days."
    },
    {
      label: "Secure Assets Growth",
      value: "47,789,438",
      percentageChange: 0.2,
      absoluteChange: "(+100,148)",
      subtext: "MoM",
      isPositiveGood: true,
      history: generateTrendData(47000000, 50000, 10000, 30),
      aiAnalysis: "Steady growth aligning with infrastructure expansion. Patch adoption rate is 98.5% for critical systems."
    }
  ],
  advancedMetrics: [
    {
      label: "Vulnerability Detection Rate",
      value: "2.5%",
      subtext: "0.10% from previous",
      color: "purple",
      history: generateTrendData(25, 2, -0.1, 30).map(d => ({...d, value: d.value/10})),
      aiAnalysis: "Detection rate stabilizing. Formula: (vulnerable / totalAssessed) * 100. Target < 2% is within reach."
    },
    {
      label: "Remediation Velocity",
      value: "0.2%",
      subtext: "Above average pace",
      color: "cyan",
      history: generateTrendData(20, 5, 0.5, 30).map(d => ({...d, value: d.value/100})),
      aiAnalysis: "Velocity calculated based on average time to patch critical CVEs. Current rate exceeds 3-month rolling average."
    },
    {
      label: "Security Coverage",
      value: "86.3%",
      subtext: "0.2% MoM growth",
      color: "indigo",
      history: generateTrendData(8600, 50, 5, 30).map(d => ({...d, value: d.value/100})),
      aiAnalysis: "Coverage gap of 13.7% primarily in legacy production environments. Recommendation: Isolate legacy segments."
    }
  ],
  anomalies: [
    {
      id: '1',
      entity: 'DUKE ENERGY',
      riskScore: 100,
      severity: 'CRITICAL',
      message: 'requiring attention',
      details: '294 vulnerabilities found — 279 above the normal baseline (avg: 15)'
    },
    {
      id: '2',
      entity: 'SCOTIABANK',
      riskScore: 100,
      severity: 'CRITICAL',
      message: 'requiring attention',
      details: '339 vulnerabilities found — 326 above the normal baseline (avg: 13)'
    },
    {
      id: '3',
      entity: 'BRISTOL MYERS SQUIBB',
      riskScore: 100,
      severity: 'CRITICAL',
      message: 'requiring attention',
      details: '11 vulnerabilities found — 10 above the normal baseline (avg: 1)'
    }
  ],
  predictions: [
    {
      id: 'p1',
      period: '2025-01',
      trend: 'RISING',
      confidence: 92.0,
      subtext: 'next 30 days',
      description: '27,651,340 potential vulnerabilities requiring monitoring',
      drivers: 'Drivers: Software vulnerabilities trending upward, Hardware vulnerabilities stabilizing'
    },
    {
      id: 'p2',
      period: '2025-02',
      trend: 'RISING',
      confidence: 88.0,
      subtext: 'next 60 days',
      description: 'Risk exposure projected to increase based on 420 field notice patterns',
      drivers: 'Drivers: New vulnerability disclosures, Customer infrastructure growth'
    }
  ],
  recommendations: [
    {
      id: 'r1',
      priority: 'CRITICAL',
      category: 'customer priority',
      action: 'Immediate engagement with WELLS FARGO MASTER ACCOUNT, HCA HEALTHCARE, MORGAN STANLEY - GLOBAL for vulnerability remediation'
    },
    {
      id: 'r2',
      priority: 'HIGH',
      category: 'vulnerability management',
      action: 'Focus remediation efforts on potential vulnerabilities'
    },
    {
      id: 'r3',
      priority: 'HIGH',
      category: 'monitoring',
      action: 'Implement enhanced monitoring for 689 customers with extreme vulnerability patterns'
    }
  ],
  trends: [
    { month: 'Apr 25', vulnerable: 8500000, potential: 35000000, secure: 220000000 },
    { month: 'May 25', vulnerable: 8200000, potential: 34500000, secure: 225000000 },
    { month: 'Jun 25', vulnerable: 7800000, potential: 34000000, secure: 230000000 },
    { month: 'Jul 25', vulnerable: 7500000, potential: 33500000, secure: 235000000 },
    { month: 'Aug 25', vulnerable: 7100000, potential: 33000000, secure: 238000000 },
    { month: 'Sep 25', vulnerable: 6997430, potential: 32792394, secure: 241169065 }
  ],
  // Use pre-generated 500 field notices and customers to support dropdown options up to 500
  topFieldNotices: GENERATED_FIELD_NOTICES,
  topCustomers: GENERATED_CUSTOMERS,
  // Records array for client-side filtering - generated from customer/field notice combinations
  records: [
    // WELLS FARGO MASTER ACCOUNT records
    { id: 'rec-001', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 85579, potVuln: 139309, notVuln: 472470 },
    { id: 'rec-002', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'April 2025', totVuln: 68463, potVuln: 111447, notVuln: 377976 },
    { id: 'rec-003', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN70464', fnType: 'Software', month: 'May 2025', totVuln: 51347, potVuln: 83585, notVuln: 283482 },
    { id: 'rec-004', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN72270', fnType: 'Hardware', month: 'May 2025', totVuln: 34232, potVuln: 55724, notVuln: 188988 },
    { id: 'rec-005', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 51347, potVuln: 83585, notVuln: 283482 },
    { id: 'rec-006', customer: 'WELLS FARGO MASTER ACCOUNT', fieldNotice: 'FN70496', fnType: 'Software', month: 'July 2025', totVuln: 51349, potVuln: 83586, notVuln: 283482 },
    // HOME DEPOT USA, INC. records
    { id: 'rec-007', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 57345, potVuln: 77367, notVuln: 118770 },
    { id: 'rec-008', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'April 2025', totVuln: 45876, potVuln: 61894, notVuln: 95016 },
    { id: 'rec-009', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN70464', fnType: 'Software', month: 'May 2025', totVuln: 34407, potVuln: 46420, notVuln: 71262 },
    { id: 'rec-010', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN72270', fnType: 'Hardware', month: 'May 2025', totVuln: 22938, potVuln: 30947, notVuln: 47508 },
    { id: 'rec-011', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 34406, potVuln: 46420, notVuln: 71261 },
    { id: 'rec-012', customer: 'HOME DEPOT USA, INC.', fieldNotice: 'FN70496', fnType: 'Software', month: 'July 2025', totVuln: 34406, potVuln: 46421, notVuln: 71261 },
    // MORGAN STANLEY - GLOBAL records
    { id: 'rec-013', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 39197, potVuln: 54302, notVuln: 168118 },
    { id: 'rec-014', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'April 2025', totVuln: 31358, potVuln: 43441, notVuln: 134494 },
    { id: 'rec-015', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN70464', fnType: 'Software', month: 'May 2025', totVuln: 23518, potVuln: 32581, notVuln: 100871 },
    { id: 'rec-016', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN72270', fnType: 'Hardware', month: 'May 2025', totVuln: 15679, potVuln: 21721, notVuln: 67247 },
    { id: 'rec-017', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 23518, potVuln: 32580, notVuln: 100870 },
    { id: 'rec-018', customer: 'MORGAN STANLEY - GLOBAL', fieldNotice: 'FN70496', fnType: 'Software', month: 'July 2025', totVuln: 23518, potVuln: 32581, notVuln: 100871 },
    // HCA HEALTHCARE records
    { id: 'rec-019', customer: 'HCA HEALTHCARE', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 32618, potVuln: 59018, notVuln: 335741 },
    { id: 'rec-020', customer: 'HCA HEALTHCARE', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'April 2025', totVuln: 26094, potVuln: 47214, notVuln: 268592 },
    { id: 'rec-021', customer: 'HCA HEALTHCARE', fieldNotice: 'FN70464', fnType: 'Software', month: 'May 2025', totVuln: 19571, potVuln: 35411, notVuln: 201444 },
    { id: 'rec-022', customer: 'HCA HEALTHCARE', fieldNotice: 'FN72270', fnType: 'Hardware', month: 'May 2025', totVuln: 13047, potVuln: 23607, notVuln: 134296 },
    { id: 'rec-023', customer: 'HCA HEALTHCARE', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 19570, potVuln: 35411, notVuln: 201445 },
    { id: 'rec-024', customer: 'HCA HEALTHCARE', fieldNotice: 'FN70496', fnType: 'Software', month: 'July 2025', totVuln: 19570, potVuln: 35411, notVuln: 201444 },
    // NAVY FEDERAL CREDIT UNION records
    { id: 'rec-025', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 26296, potVuln: 25775, notVuln: 28139 },
    { id: 'rec-026', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'April 2025', totVuln: 21037, potVuln: 20620, notVuln: 22511 },
    { id: 'rec-027', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN70464', fnType: 'Software', month: 'May 2025', totVuln: 15777, potVuln: 15465, notVuln: 16883 },
    { id: 'rec-028', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN72270', fnType: 'Hardware', month: 'May 2025', totVuln: 10518, potVuln: 10310, notVuln: 11255 },
    { id: 'rec-029', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 15777, potVuln: 15465, notVuln: 16883 },
    { id: 'rec-030', customer: 'NAVY FEDERAL CREDIT UNION', fieldNotice: 'FN70496', fnType: 'Software', month: 'July 2025', totVuln: 15777, potVuln: 15465, notVuln: 16883 },
    // Additional customers for more coverage
    { id: 'rec-031', customer: 'AMAZON', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 45000, potVuln: 67500, notVuln: 225000 },
    { id: 'rec-032', customer: 'AMAZON', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'May 2025', totVuln: 36000, potVuln: 54000, notVuln: 180000 },
    { id: 'rec-033', customer: 'AMAZON', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 27000, potVuln: 40500, notVuln: 135000 },
    { id: 'rec-034', customer: 'MICROSOFT AZURE', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 55000, potVuln: 82500, notVuln: 275000 },
    { id: 'rec-035', customer: 'MICROSOFT AZURE', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'May 2025', totVuln: 44000, potVuln: 66000, notVuln: 220000 },
    { id: 'rec-036', customer: 'MICROSOFT AZURE', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 33000, potVuln: 49500, notVuln: 165000 },
    { id: 'rec-037', customer: 'JPMORGAN CHASE & CO.', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 65000, potVuln: 97500, notVuln: 325000 },
    { id: 'rec-038', customer: 'JPMORGAN CHASE & CO.', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'May 2025', totVuln: 52000, potVuln: 78000, notVuln: 260000 },
    { id: 'rec-039', customer: 'JPMORGAN CHASE & CO.', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 39000, potVuln: 58500, notVuln: 195000 },
    { id: 'rec-040', customer: 'BANK OF AMERICA GLOBAL ENTERPRISE', fieldNotice: 'FN70496', fnType: 'Software', month: 'April 2025', totVuln: 48000, potVuln: 72000, notVuln: 240000 },
    { id: 'rec-041', customer: 'BANK OF AMERICA GLOBAL ENTERPRISE', fieldNotice: 'FN70546', fnType: 'Hardware', month: 'May 2025', totVuln: 38400, potVuln: 57600, notVuln: 192000 },
    { id: 'rec-042', customer: 'BANK OF AMERICA GLOBAL ENTERPRISE', fieldNotice: 'FN72399', fnType: 'Software', month: 'June 2025', totVuln: 28800, potVuln: 43200, notVuln: 144000 },
  ]
};

// Intelligence Center Mock Data - Complete data for all analytics panels
export const MOCK_INTELLIGENCE_DATA = {
  aiConfidence: "94.2%",
  kpis: [
    {
      label: "Active Anomalies",
      value: "12",
      subtext: "3 critical requiring immediate action",
      status: "critical" as const
    },
    {
      label: "ML Models Active",
      value: "8",
      subtext: "All models performing within SLA",
      status: "good" as const
    },
    {
      label: "Prediction Accuracy",
      value: "94.2%",
      subtext: "Based on last 30-day validation",
      status: "good" as const
    },
    {
      label: "Data Freshness",
      value: "< 1hr",
      subtext: "Last sync: 10 minutes ago",
      status: "active" as const
    }
  ],
  analytics: {
    vulnerabilityTrend: {
      status: "CRITICAL",
      acceleration: "+15.3%",
      strength: "Strong Upward",
      forecast: "+1.2M vulnerabilities"
    },
    customerRisk: {
      level: "HIGH",
      concentration: "78%",
      pareto: "Top 10 customers",
      focus: "Focus on enterprise accounts"
    },
    fieldNoticeImpact: {
      level: "CRITICAL",
      totalCVEs: 847,
      highImpact: 156,
      avgImpact: "7.8/10"
    },
    remediationVelocity: {
      status: "ON TRACK",
      rate: 12500,
      efficiency: "Above Average",
      monthsToClear: 8
    },
    temporalPatterns: {
      status: "DETECTED",
      seasonality: "Quarterly spikes",
      peak: "Q4 (Oct-Dec)",
      low: "Q2 (Apr-Jun)"
    },
    riskPrioritization: {
      level: "OPTIMIZED",
      score: 78,
      confidence: "92%",
      criticalIssues: 23,
      topAsset: "WELLS FARGO MASTER ACCOUNT"
    },
    intelligenceSummary: {
      level: "HEALTHY",
      score: 82,
      vulnerableAssetsPct: "2.5%",
      insights: [
        "Vulnerability growth rate declining for 3rd consecutive month",
        "Top 5 customers account for 45% of total risk exposure",
        "FN70496 remains highest impact field notice",
        "Remediation velocity exceeds target by 12%"
      ]
    },
    trendPredictions: [
      {
        period: "Dec 2025",
        prediction: "+8.2%",
        confidence: 92,
        trend: "up" as const
      },
      {
        period: "Jan 2026",
        prediction: "-3.1%",
        confidence: 85,
        trend: "down" as const
      },
      {
        period: "Feb 2026",
        prediction: "Stable",
        confidence: 78,
        trend: "stable" as const
      }
    ]
  },
  forecast: [
    { month: "Jul", value: 1150000 },
    { month: "Aug", value: 1180000 },
    { month: "Sep", value: 1210000 },
    { month: "Oct", value: 1245000 },
    { month: "Nov", value: 1167640 },
    { month: "Dec", value: 1292953 }
  ],
  anomalies: [
    {
      name: "DUKE ENERGY",
      score: 100,
      trend: 25,
      vulnerableCount: 294,
      updated: "10 min ago",
      tags: [{ label: "CRITICAL", severity: "CRITICAL" as const }]
    },
    {
      name: "SCOTIABANK",
      score: 100,
      trend: 18,
      vulnerableCount: 339,
      updated: "15 min ago",
      tags: [{ label: "CRITICAL", severity: "CRITICAL" as const }]
    },
    {
      name: "BRISTOL MYERS SQUIBB",
      score: 95,
      trend: 12,
      vulnerableCount: 11,
      updated: "22 min ago",
      tags: [{ label: "HIGH", severity: "HIGH" as const }]
    },
    {
      name: "NAVY FEDERAL",
      score: 88,
      trend: -5,
      vulnerableCount: 156,
      updated: "30 min ago",
      tags: [{ label: "MEDIUM", severity: "MEDIUM" as const }]
    }
  ],
  systemHealth: [
    { label: "ML Pipeline", score: 98, status: "HEALTHY", description: "All models operational" },
    { label: "Data Ingestion", score: 95, status: "HEALTHY", description: "Processing at normal rate" },
    { label: "API Gateway", score: 100, status: "OPTIMAL", description: "Sub-50ms response times" },
    { label: "Cache Layer", score: 92, status: "HEALTHY", description: "Hit rate: 94.2%" }
  ],
  nlpAnalysis: {
    keywords: ["vulnerability", "remediation", "critical", "customer risk", "field notice"],
    urgencyScore: "HIGH",
    patterns: ["Quarterly vulnerability spikes", "Weekend remediation delays", "Enterprise account concentration"]
  },
  mlPerformance: {
    accuracy: "94.2%",
    precision: "91.8%",
    recall: "96.1%",
    mape: "4.3%"
  },
  recommendations: [
    "Prioritize remediation for WELLS FARGO and HCA HEALTHCARE accounts",
    "Schedule maintenance window for FN70496 affected devices",
    "Increase monitoring frequency for newly detected anomalies",
    "Review Q4 staffing for expected vulnerability spike"
  ]
};

// Legacy export for backward compatibility
export const INTELLIGENCE_DATA = MOCK_INTELLIGENCE_DATA;

// Voice Command Scenarios
export const MOCK_VOICE_SCENARIOS: VoiceScenario[] = [
  {
    command: "Show me the trends",
    intent: "TREND_PREDICTIONS",
    response: {
      text: "Displaying vulnerability trend predictions for the next 3 months.",
      showPredictions: true
    }
  },
  {
    command: "What are the anomalies",
    intent: "ANOMALY_CHECK",
    response: {
      text: "Showing detected anomalies across all monitored entities.",
      showAnomalies: true
    }
  },
  {
    command: "System health status",
    intent: "SYSTEM_HEALTH",
    response: {
      text: "ML Pipeline is healthy. All 8 models are operational with 94.2% accuracy.",
      metrics: ["ML Pipeline", "Data Ingestion", "API Gateway"]
    }
  },
  {
    command: "Show metrics overview",
    intent: "METRIC_VIEW",
    response: {
      text: "Displaying core KPI metrics dashboard.",
      metrics: ["totalAssessed", "secure", "potential", "vulnerable"]
    }
  },
  {
    command: "Top customer insights",
    intent: "CUSTOMER_INSIGHT",
    response: {
      text: "Analyzing top customers by risk exposure. WELLS FARGO leads with highest vulnerability count.",
      metrics: ["topCustomers"]
    }
  },
  {
    command: "What should I prioritize",
    intent: "RECOMMENDATION_VIEW",
    response: {
      text: "Displaying AI-powered recommendations for immediate action.",
      showRecommendations: true
    }
  }
];