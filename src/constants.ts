/*************************************************************
 * Swiss Ephemeris constants — translated from swephexp.h, sweph.h, sweodef.h
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.
 * All rights reserved.
 *
 * This file is part of Swiss Ephemeris (AGPL).
 *************************************************************/

export const SE_VERSION = "2.10.03";

/* ---- Mathematical constants ---- */
export const PI = Math.PI;
export const TWOPI = 2.0 * PI;
export const RADTODEG = 180.0 / PI;
export const DEGTORAD = PI / 180.0;

/* ---- Centisecond angle constants ---- */
export const DEG = 360000;           // 1 degree in centiseconds
export const DEG7_30 = 2700000;      // 7.5 degrees
export const DEG15 = 15 * DEG;
export const DEG24 = 24 * DEG;
export const DEG30 = 30 * DEG;
export const DEG60 = 60 * DEG;
export const DEG90 = 90 * DEG;
export const DEG120 = 120 * DEG;
export const DEG150 = 150 * DEG;
export const DEG180 = 180 * DEG;
export const DEG270 = 270 * DEG;
export const DEG360 = 360 * DEG;
export const CSTORAD = DEGTORAD / 360000.0;
export const RADTOCS = RADTODEG * 360000.0;
export const CS2DEG = 1.0 / 360000.0;

/* ---- Calendar flags for julDay() / revJul() ---- */
export const SE_JUL_CAL = 0;
export const SE_GREG_CAL = 1;

/* ---- Epoch constants ---- */
export const J2000 = 2451545.0;      // 2000 January 1.5
export const B1950 = 2433282.42345905;
export const J1900 = 2415020.0;      // 1900 January 0.5
export const B1850 = 2396758.2035810;

/* ---- Planet numbers for swe_calc() ipl parameter ---- */
export const SE_ECL_NUT = -1;

export const SE_SUN = 0;
export const SE_MOON = 1;
export const SE_MERCURY = 2;
export const SE_VENUS = 3;
export const SE_MARS = 4;
export const SE_JUPITER = 5;
export const SE_SATURN = 6;
export const SE_URANUS = 7;
export const SE_NEPTUNE = 8;
export const SE_PLUTO = 9;
export const SE_MEAN_NODE = 10;
export const SE_TRUE_NODE = 11;
export const SE_MEAN_APOG = 12;      // mean Lilith
export const SE_OSCU_APOG = 13;      // osculating Lilith
export const SE_EARTH = 14;
export const SE_CHIRON = 15;
export const SE_PHOLUS = 16;
export const SE_CERES = 17;
export const SE_PALLAS = 18;
export const SE_JUNO = 19;
export const SE_VESTA = 20;
export const SE_INTP_APOG = 21;      // interpolated Lilith
export const SE_INTP_PERG = 22;      // interpolated Perigee

export const SE_NPLANETS = 23;

export const SE_PLMOON_OFFSET = 9000;
export const SE_AST_OFFSET = 10000;
export const SE_VARUNA = SE_AST_OFFSET + 20000;

export const SE_FICT_OFFSET = 40;
export const SE_FICT_OFFSET_1 = 39;
export const SE_FICT_MAX = 999;
export const SE_NFICT_ELEM = 15;

export const SE_COMET_OFFSET = 1000;

export const SE_NALL_NAT_POINTS = SE_NPLANETS + SE_NFICT_ELEM;

/* Hamburger / Uranian "planets" */
export const SE_CUPIDO = 40;
export const SE_HADES = 41;
export const SE_ZEUS = 42;
export const SE_KRONOS = 43;
export const SE_APOLLON = 44;
export const SE_ADMETOS = 45;
export const SE_VULKANUS = 46;
export const SE_POSEIDON = 47;
/* other fictitious bodies */
export const SE_ISIS = 48;
export const SE_NIBIRU = 49;
export const SE_HARRINGTON = 50;
export const SE_NEPTUNE_LEVERRIER = 51;
export const SE_NEPTUNE_ADAMS = 52;
export const SE_PLUTO_LOWELL = 53;
export const SE_PLUTO_PICKERING = 54;
export const SE_VULCAN = 55;
export const SE_WHITE_MOON = 56;
export const SE_PROSERPINA = 57;
export const SE_WALDEMATH = 58;

export const SE_FIXSTAR = -10;

/* ---- House-related angle indices ---- */
export const SE_ASC = 0;
export const SE_MC = 1;
export const SE_ARMC = 2;
export const SE_VERTEX = 3;
export const SE_EQUASC = 4;      // equatorial ascendant
export const SE_COASC1 = 5;      // co-ascendant (W. Koch)
export const SE_COASC2 = 6;      // co-ascendant (M. Munkasey)
export const SE_POLASC = 7;      // polar ascendant (M. Munkasey)
export const SE_NASCMC = 8;

/* ---- Calculation flags for swe_calc() iflag parameter ---- */
export const SEFLG_JPLEPH = 1;
export const SEFLG_SWIEPH = 2;
export const SEFLG_MOSEPH = 4;

export const SEFLG_HELCTR = 8;           // heliocentric position
export const SEFLG_TRUEPOS = 16;         // true/geometric position
export const SEFLG_J2000 = 32;           // no precession, J2000 equinox
export const SEFLG_NONUT = 64;           // no nutation, mean equinox of date
export const SEFLG_SPEED3 = 128;         // speed from 3 positions (avoid)
export const SEFLG_SPEED = 256;          // high precision speed
export const SEFLG_NOGDEFL = 512;        // turn off gravitational deflection
export const SEFLG_NOABERR = 1024;       // turn off aberration of light
export const SEFLG_ASTROMETRIC = SEFLG_NOABERR | SEFLG_NOGDEFL;
export const SEFLG_EQUATORIAL = 2 * 1024;    // 2048
export const SEFLG_XYZ = 4 * 1024;           // 4096
export const SEFLG_RADIANS = 8 * 1024;       // 8192
export const SEFLG_BARYCTR = 16 * 1024;      // 16384
export const SEFLG_TOPOCTR = 32 * 1024;      // 32768
export const SEFLG_ORBEL_AA = SEFLG_TOPOCTR;
export const SEFLG_TROPICAL = 0;
export const SEFLG_SIDEREAL = 64 * 1024;     // 65536
export const SEFLG_ICRS = 128 * 1024;        // 131072
export const SEFLG_DPSIDEPS_1980 = 256 * 1024;
export const SEFLG_JPLHOR = SEFLG_DPSIDEPS_1980;
export const SEFLG_JPLHOR_APPROX = 512 * 1024;
export const SEFLG_CENTER_BODY = 1024 * 1024;
export const SEFLG_TEST_PLMOON = 2 * 1024 * 1024 | SEFLG_J2000 | SEFLG_ICRS | SEFLG_HELCTR | SEFLG_TRUEPOS;

/* default ephemeris when no flag bit is set */
export const SEFLG_DEFAULTEPH = SEFLG_SWIEPH;

/* ---- Sidereal mode bits ---- */
export const SE_SIDBITS = 256;
export const SE_SIDBIT_ECL_T0 = 256;
export const SE_SIDBIT_SSY_PLANE = 512;
export const SE_SIDBIT_USER_UT = 1024;
export const SE_SIDBIT_ECL_DATE = 2048;
export const SE_SIDBIT_NO_PREC_OFFSET = 4096;
export const SE_SIDBIT_PREC_ORIG = 8192;

/* ---- Sidereal modes (ayanamsas) ---- */
export const SE_SIDM_FAGAN_BRADLEY = 0;
export const SE_SIDM_LAHIRI = 1;
export const SE_SIDM_DELUCE = 2;
export const SE_SIDM_RAMAN = 3;
export const SE_SIDM_USHASHASHI = 4;
export const SE_SIDM_KRISHNAMURTI = 5;
export const SE_SIDM_DJWHAL_KHUL = 6;
export const SE_SIDM_YUKTESHWAR = 7;
export const SE_SIDM_JN_BHASIN = 8;
export const SE_SIDM_BABYL_KUGLER1 = 9;
export const SE_SIDM_BABYL_KUGLER2 = 10;
export const SE_SIDM_BABYL_KUGLER3 = 11;
export const SE_SIDM_BABYL_HUBER = 12;
export const SE_SIDM_BABYL_ETPSC = 13;
export const SE_SIDM_ALDEBARAN_15TAU = 14;
export const SE_SIDM_HIPPARCHOS = 15;
export const SE_SIDM_SASSANIAN = 16;
export const SE_SIDM_GALCENT_0SAG = 17;
export const SE_SIDM_J2000 = 18;
export const SE_SIDM_J1900 = 19;
export const SE_SIDM_B1950 = 20;
export const SE_SIDM_SURYASIDDHANTA = 21;
export const SE_SIDM_SURYASIDDHANTA_MSUN = 22;
export const SE_SIDM_ARYABHATA = 23;
export const SE_SIDM_ARYABHATA_MSUN = 24;
export const SE_SIDM_SS_REVATI = 25;
export const SE_SIDM_SS_CITRA = 26;
export const SE_SIDM_TRUE_CITRA = 27;
export const SE_SIDM_TRUE_REVATI = 28;
export const SE_SIDM_TRUE_PUSHYA = 29;
export const SE_SIDM_GALCENT_RGILBRAND = 30;
export const SE_SIDM_GALEQU_IAU1958 = 31;
export const SE_SIDM_GALEQU_TRUE = 32;
export const SE_SIDM_GALEQU_MULA = 33;
export const SE_SIDM_GALALIGN_MARDYKS = 34;
export const SE_SIDM_TRUE_MULA = 35;
export const SE_SIDM_GALCENT_MULA_WILHELM = 36;
export const SE_SIDM_ARYABHATA_522 = 37;
export const SE_SIDM_BABYL_BRITTON = 38;
export const SE_SIDM_TRUE_SHEORAN = 39;
export const SE_SIDM_GALCENT_COCHRANE = 40;
export const SE_SIDM_GALEQU_FIORENZA = 41;
export const SE_SIDM_VALENS_MOON = 42;
export const SE_SIDM_LAHIRI_1940 = 43;
export const SE_SIDM_LAHIRI_VP285 = 44;
export const SE_SIDM_KRISHNAMURTI_VP291 = 45;
export const SE_SIDM_LAHIRI_ICRC = 46;
export const SE_SIDM_USER = 255;

export const SE_NSIDM_PREDEF = 47;

/* ---- Node / apside calculation modes ---- */
export const SE_NODBIT_MEAN = 1;
export const SE_NODBIT_OSCU = 2;
export const SE_NODBIT_OSCU_BAR = 4;
export const SE_NODBIT_FOPOINT = 256;

/* ---- Eclipse defines ---- */
export const SE_ECL_CENTRAL = 1;
export const SE_ECL_NONCENTRAL = 2;
export const SE_ECL_TOTAL = 4;
export const SE_ECL_ANNULAR = 8;
export const SE_ECL_PARTIAL = 16;
export const SE_ECL_ANNULAR_TOTAL = 32;
export const SE_ECL_HYBRID = 32;
export const SE_ECL_PENUMBRAL = 64;
export const SE_ECL_ALLTYPES_SOLAR = SE_ECL_CENTRAL | SE_ECL_NONCENTRAL | SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL | SE_ECL_ANNULAR_TOTAL;
export const SE_ECL_ALLTYPES_LUNAR = SE_ECL_TOTAL | SE_ECL_PARTIAL | SE_ECL_PENUMBRAL;
export const SE_ECL_VISIBLE = 128;
export const SE_ECL_MAX_VISIBLE = 256;
export const SE_ECL_1ST_VISIBLE = 512;
export const SE_ECL_PARTBEG_VISIBLE = 512;
export const SE_ECL_2ND_VISIBLE = 1024;
export const SE_ECL_TOTBEG_VISIBLE = 1024;
export const SE_ECL_3RD_VISIBLE = 2048;
export const SE_ECL_TOTEND_VISIBLE = 2048;
export const SE_ECL_4TH_VISIBLE = 4096;
export const SE_ECL_PARTEND_VISIBLE = 4096;
export const SE_ECL_PENUMBBEG_VISIBLE = 8192;
export const SE_ECL_PENUMBEND_VISIBLE = 16384;
export const SE_ECL_OCC_BEG_DAYLIGHT = 8192;
export const SE_ECL_OCC_END_DAYLIGHT = 16384;
export const SE_ECL_ONE_TRY = 32 * 1024;

/* ---- Rise / Transit ---- */
export const SE_CALC_RISE = 1;
export const SE_CALC_SET = 2;
export const SE_CALC_MTRANSIT = 4;
export const SE_CALC_ITRANSIT = 8;
export const SE_BIT_DISC_CENTER = 256;
export const SE_BIT_DISC_BOTTOM = 8192;
export const SE_BIT_GEOCTR_NO_ECL_LAT = 128;
export const SE_BIT_NO_REFRACTION = 512;
export const SE_BIT_CIVIL_TWILIGHT = 1024;
export const SE_BIT_NAUTIC_TWILIGHT = 2048;
export const SE_BIT_ASTRO_TWILIGHT = 4096;
export const SE_BIT_FIXED_DISC_SIZE = 16384;
export const SE_BIT_FORCE_SLOW_METHOD = 32768;
export const SE_BIT_HINDU_RISING = SE_BIT_DISC_CENTER | SE_BIT_NO_REFRACTION | SE_BIT_GEOCTR_NO_ECL_LAT;

/* ---- Coordinate transformation ---- */
export const SE_ECL2HOR = 0;
export const SE_EQU2HOR = 1;
export const SE_HOR2ECL = 0;
export const SE_HOR2EQU = 1;

/* ---- Refraction ---- */
export const SE_TRUE_TO_APP = 0;
export const SE_APP_TO_TRUE = 1;

/* ---- split_deg flags ---- */
export const SE_SPLIT_DEG_ROUND_SEC = 1;
export const SE_SPLIT_DEG_ROUND_MIN = 2;
export const SE_SPLIT_DEG_ROUND_DEG = 4;
export const SE_SPLIT_DEG_ZODIACAL = 8;
export const SE_SPLIT_DEG_NAKSHATRA = 1024;
export const SE_SPLIT_DEG_KEEP_SIGN = 16;
export const SE_SPLIT_DEG_KEEP_DEG = 32;

/* ---- Tidal acceleration values ---- */
export const SE_TIDAL_DE200 = -23.8946;
export const SE_TIDAL_DE403 = -25.580;
export const SE_TIDAL_DE404 = -25.580;
export const SE_TIDAL_DE405 = -25.826;
export const SE_TIDAL_DE406 = -25.826;
export const SE_TIDAL_DE421 = -25.85;
export const SE_TIDAL_DE422 = -25.85;
export const SE_TIDAL_DE430 = -25.82;
export const SE_TIDAL_DE431 = -25.80;
export const SE_TIDAL_DE441 = -25.936;
export const SE_TIDAL_26 = -26.0;
export const SE_TIDAL_STEPHENSON_2016 = -25.85;
export const SE_TIDAL_DEFAULT = SE_TIDAL_DE431;
export const SE_TIDAL_AUTOMATIC = 999999;
export const SE_TIDAL_MOSEPH = SE_TIDAL_DE404;
export const SE_TIDAL_SWIEPH = SE_TIDAL_DEFAULT;
export const SE_TIDAL_JPLEPH = SE_TIDAL_DEFAULT;

export const SE_DELTAT_AUTOMATIC = -1E-10;

/* ---- Astro model indices ---- */
export const SE_MODEL_DELTAT = 0;
export const SE_MODEL_PREC_LONGTERM = 1;
export const SE_MODEL_PREC_SHORTTERM = 2;
export const SE_MODEL_NUT = 3;
export const SE_MODEL_BIAS = 4;
export const SE_MODEL_JPLHOR_MODE = 5;
export const SE_MODEL_JPLHORA_MODE = 6;
export const SE_MODEL_SIDT = 7;
export const NSE_MODELS = 8;

/* ---- Precession models ---- */
export const SEMOD_NPREC = 11;
export const SEMOD_PREC_IAU_1976 = 1;
export const SEMOD_PREC_LASKAR_1986 = 2;
export const SEMOD_PREC_WILL_EPS_LASK = 3;
export const SEMOD_PREC_WILLIAMS_1994 = 4;
export const SEMOD_PREC_SIMON_1994 = 5;
export const SEMOD_PREC_IAU_2000 = 6;
export const SEMOD_PREC_BRETAGNON_2003 = 7;
export const SEMOD_PREC_IAU_2006 = 8;
export const SEMOD_PREC_VONDRAK_2011 = 9;
export const SEMOD_PREC_OWEN_1990 = 10;
export const SEMOD_PREC_NEWCOMB = 11;
export const SEMOD_PREC_DEFAULT = SEMOD_PREC_VONDRAK_2011;
export const SEMOD_PREC_DEFAULT_SHORT = SEMOD_PREC_VONDRAK_2011;

/* ---- Nutation models ---- */
export const SEMOD_NNUT = 5;
export const SEMOD_NUT_IAU_1980 = 1;
export const SEMOD_NUT_IAU_CORR_1987 = 2;
export const SEMOD_NUT_IAU_2000A = 3;
export const SEMOD_NUT_IAU_2000B = 4;
export const SEMOD_NUT_WOOLARD = 5;
export const SEMOD_NUT_DEFAULT = SEMOD_NUT_IAU_2000B;

/* ---- Sidereal time models ---- */
export const SEMOD_NSIDT = 4;
export const SEMOD_SIDT_IAU_1976 = 1;
export const SEMOD_SIDT_IAU_2006 = 2;
export const SEMOD_SIDT_IERS_CONV_2010 = 3;
export const SEMOD_SIDT_LONGTERM = 4;
export const SEMOD_SIDT_DEFAULT = SEMOD_SIDT_LONGTERM;

/* ---- Frame bias models ---- */
export const SEMOD_NBIAS = 3;
export const SEMOD_BIAS_NONE = 1;
export const SEMOD_BIAS_IAU2000 = 2;
export const SEMOD_BIAS_IAU2006 = 3;
export const SEMOD_BIAS_DEFAULT = SEMOD_BIAS_IAU2006;

/* ---- JPL Horizons models ---- */
export const SEMOD_NJPLHOR = 2;
export const SEMOD_JPLHOR_LONG_AGREEMENT = 1;
export const SEMOD_JPLHOR_DEFAULT = SEMOD_JPLHOR_LONG_AGREEMENT;

export const SEMOD_NJPLHORA = 3;
export const SEMOD_JPLHORA_1 = 1;
export const SEMOD_JPLHORA_2 = 2;
export const SEMOD_JPLHORA_3 = 3;
export const SEMOD_JPLHORA_DEFAULT = SEMOD_JPLHORA_3;

/* ---- Delta T models ---- */
export const SEMOD_NDELTAT = 5;
export const SEMOD_DELTAT_STEPHENSON_MORRISON_1984 = 1;
export const SEMOD_DELTAT_STEPHENSON_1997 = 2;
export const SEMOD_DELTAT_STEPHENSON_MORRISON_2004 = 3;
export const SEMOD_DELTAT_ESPENAK_MEEUS_2006 = 4;
export const SEMOD_DELTAT_STEPHENSON_ETC_2016 = 5;
export const SEMOD_DELTAT_DEFAULT = SEMOD_DELTAT_STEPHENSON_ETC_2016;

/* ---- Ephemeris flag mask ---- */
export const SEFLG_EPHMASK = (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);

/* ---- JPL Horizons frame-bias constants (from swephlib.h) ---- */
export const DPSI_DEPS_IAU1980_TJD0_HORIZONS = 2437684.5;
export const HORIZONS_TJD0_DPSI_DEPS_IAU1980 = 2437684.5;
export const DPSI_IAU1980_TJD0 = 64.284 / 1000.0;   // arcsec
export const DEPS_IAU1980_TJD0 = 6.151 / 1000.0;    // arcsec

/* ---- Unit conversions ---- */
export const SE_AUNIT_TO_KM = 149597870.700;
export const SE_AUNIT_TO_LIGHTYEAR = 1.0 / 63241.07708427;
export const SE_AUNIT_TO_PARSEC = 1.0 / 206264.8062471;

export const SE_MAX_STNAME = 256;

/* ---- DE number ---- */
export const SE_DE_NUMBER = 431;

/* ---- House system codes ---- */
export const HOUSE_PLACIDUS = 'P';
export const HOUSE_KOCH = 'K';
export const HOUSE_EQUAL = 'E';
export const HOUSE_WHOLE_SIGN = 'W';
export const HOUSE_CAMPANUS = 'C';
export const HOUSE_REGIOMONTANUS = 'R';
export const HOUSE_TOPOCENTRIC = 'T';

/* ====================================================================
 * Internal constants (from sweph.h) — used by the engine, not public API
 * ==================================================================== */

export const ENDMARK = -99;

/* internal body indices */
export const SEI_EPSILON = -2;
export const SEI_NUTATION = -1;
export const SEI_EMB = 0;
export const SEI_EARTH = 0;
export const SEI_SUN = 0;
export const SEI_MOON = 1;
export const SEI_MERCURY = 2;
export const SEI_VENUS = 3;
export const SEI_MARS = 4;
export const SEI_JUPITER = 5;
export const SEI_SATURN = 6;
export const SEI_URANUS = 7;
export const SEI_NEPTUNE = 8;
export const SEI_PLUTO = 9;
export const SEI_SUNBARY = 10;    // barycentric sun
export const SEI_ANYBODY = 11;
export const SEI_CHIRON = 12;
export const SEI_PHOLUS = 13;
export const SEI_CERES = 14;
export const SEI_PALLAS = 15;
export const SEI_JUNO = 16;
export const SEI_VESTA = 17;

export const SEI_NPLANETS = 18;

export const SEI_MEAN_NODE = 0;
export const SEI_TRUE_NODE = 1;
export const SEI_MEAN_APOG = 2;
export const SEI_OSCU_APOG = 3;
export const SEI_INTP_APOG = 4;
export const SEI_INTP_PERG = 5;

export const SEI_NNODE_ETC = 6;

export const SEI_FLG_HELIO = 1;
export const SEI_FLG_ROTATE = 2;
export const SEI_FLG_ELLIPSE = 4;
export const SEI_FLG_EMBHEL = 8;

/* file types */
export const SEI_FILE_PLANET = 0;
export const SEI_FILE_MOON = 1;
export const SEI_FILE_MAIN_AST = 2;
export const SEI_FILE_ANY_AST = 3;
export const SEI_FILE_FIXSTAR = 4;
export const SEI_FILE_PLMOON = 5;

export const SEI_FILE_TEST_ENDIAN = 0x616263;   // "abc"
export const SEI_FILE_BIGENDIAN = 0;
export const SEI_FILE_NOREORD = 0;
export const SEI_FILE_LITENDIAN = 1;
export const SEI_FILE_REORD = 2;

export const SEI_FILE_NMAXPLAN = 50;
export const SEI_FILE_EFPOSBEGIN = 500;

export const SE_FILE_SUFFIX = "se1";

export const SEI_NEPHFILES = 7;
export const SEI_CURR_FPOS = -1;
export const SEI_NMODELS = 8;

export const SEI_ECL_GEOALT_MAX = 25000.0;
export const SEI_ECL_GEOALT_MIN = -500.0;

/* MPC asteroid numbers */
export const MPC_CERES = 1;
export const MPC_PALLAS = 2;
export const MPC_JUNO = 3;
export const MPC_VESTA = 4;
export const MPC_CHIRON = 2060;
export const MPC_PHOLUS = 5145;

/* ephemeris time ranges */
export const CHIRON_START = 1967601.5;     // 1.1.675
export const CHIRON_END = 3419437.5;       // 1.1.4650
export const PHOLUS_START = 640648.5;      // 1.1.-2958 jul
export const PHOLUS_END = 4390617.5;       // 1.1.7309
export const MOSHPLEPH_START = 625000.5;
export const MOSHPLEPH_END = 2818000.5;
export const MOSHLUEPH_START = 625000.5;
export const MOSHLUEPH_END = 2818000.5;
export const MOSHNDEPH_START = -3100015.5;
export const MOSHNDEPH_END = 8000016.5;
export const JPL_DE431_START = -3027215.5;
export const JPL_DE431_END = 7930192.5;

export const MAXORD = 40;
export const NCTIES = 6.0;        // number of centuries per ephemeris file

export const OK = 0;
export const ERR = -1;
export const NOT_AVAILABLE = -2;
export const BEYOND_EPH_LIMITS = -3;

export const J_TO_J2000 = 1;
export const J2000_TO_J = -1;

/* ---- Physical constants ---- */
export const MOON_MEAN_DIST = 384400000.0;        // in m, AA 1996
export const MOON_MEAN_INCL = 5.1453964;
export const MOON_MEAN_ECC = 0.054900489;
export const SUN_EARTH_MRAT = 332946.050895;       // Su / (Ea only) AA 2006 K7
export const EARTH_MOON_MRAT = 1 / 0.0123000383;  // AA 2006, K7
export const AUNIT = 1.49597870700e+11;            // AU in meters, DE431
export const CLIGHT = 2.99792458e+8;               // m/s
export const HELGRAVCONST = 1.32712440017987e+20;  // G * M(sun) m^3/sec^2
export const GEOGCONST = 3.98600448e+14;           // G * M(earth) m^3/sec^2
export const KGAUSS = 0.01720209895;               // Gaussian gravitational constant
export const SUN_RADIUS = 959.63 / 3600 * DEGTORAD;
export const EARTH_RADIUS = 6378136.6;
export const EARTH_OBLATENESS = 1.0 / 298.25642;
export const EARTH_ROT_SPEED = 7.2921151467e-5 * 86400; // in rad/day

export const LIGHTTIME_AUNIT = 499.0047838362 / 3600.0 / 24.0;  // ~8.3167 min (days)
export const PARSEC_TO_AUNIT = 206264.8062471;

/* solar system plane */
export const SSY_PLANE_NODE_E2000 = 107.582569 * DEGTORAD;
export const SSY_PLANE_NODE = 107.58883388 * DEGTORAD;
export const SSY_PLANE_INCL = 1.578701 * DEGTORAD;

export const KM_S_TO_AU_CTY = 21.095;

/* speed computation intervals */
export const MOON_SPEED_INTV = 0.00005;       // 4.32 seconds (in days)
export const PLAN_SPEED_INTV = 0.0001;        // 8.64 seconds (in days)
export const MEAN_NODE_SPEED_INTV = 0.001;
export const NODE_CALC_INTV = 0.0001;
export const NODE_CALC_INTV_MOSH = 0.1;
export const NUT_SPEED_INTV = 0.0001;
export const DEFL_SPEED_INTV = 0.0000005;

export const SE_LAPSE_RATE = 0.0065;  // deg K / m, for refraction

export const NDIAM = SE_VESTA + 1;  // 21

export const STR = 4.8481368110953599359e-6;  // radians per arc second

export const AS_MAXCH = 256;
export const HUGE_VAL = 1.7e+308;

export const SWI_STAR_LENGTH = 40;

/* ---- Eclipse geometry constants ---- */
export const DSUN = 1392000000.0 / AUNIT;
export const DMOON = 3476300.0 / AUNIT;
export const DEARTH_ECL = 6378140.0 * 2 / AUNIT;
export const RSUN_ECL = DSUN / 2;
export const RMOON = DMOON / 2;
export const REARTH_ECL = DEARTH_ECL / 2;
export const SAROS_CYCLE = 6585.3213;
export const NSAROS_SOLAR = 181;
export const NSAROS_LUNAR = 180;

/* dpsi and deps loaded for 100 years after 1962 */
export const SWE_DATA_DPSI_DEPS = 36525;

/* precession time range constants */
export const PREC_IAU_1976_CTIES = 2.0;
export const PREC_IAU_2000_CTIES = 2.0;
export const PREC_IAU_2006_CTIES = 75.0;

/* ---- Planet name table ---- */
export const SE_PLANET_NAMES: readonly string[] = [
  "Sun",              // 0
  "Moon",             // 1
  "Mercury",          // 2
  "Venus",            // 3
  "Mars",             // 4
  "Jupiter",          // 5
  "Saturn",           // 6
  "Uranus",           // 7
  "Neptune",          // 8
  "Pluto",            // 9
  "mean Node",        // 10
  "true Node",        // 11
  "mean Apogee",      // 12
  "osc. Apogee",      // 13
  "Earth",            // 14
  "Chiron",           // 15
  "Pholus",           // 16
  "Ceres",            // 17
  "Pallas",           // 18
  "Juno",             // 19
  "Vesta",            // 20
  "intp. Apogee",     // 21
  "intp. Perigee",    // 22
];

export const SE_FICTITIOUS_NAMES: readonly string[] = [
  "Cupido",
  "Hades",
  "Zeus",
  "Kronos",
  "Apollon",
  "Admetos",
  "Vulkanus",
  "Poseidon",
  "Isis",
  "Nibiru",
  "Harrington",
  "Leverrier",
  "Adams",
  "Lowell",
  "Pickering",
  "Vulcan",
  "White Moon",
  "Proserpina",
  "Waldemath",
];

/* ---- Planetary radii in meters (index = SE_* planet number) ---- */
export const PLA_DIAM: readonly number[] = [
  1392000000.0,       // Sun
  3475000.0,          // Moon
  2439400.0 * 2,      // Mercury
  6051800.0 * 2,      // Venus
  3389500.0 * 2,      // Mars
  69911000.0 * 2,     // Jupiter
  58232000.0 * 2,     // Saturn
  25362000.0 * 2,     // Uranus
  24622000.0 * 2,     // Neptune
  1188300.0 * 2,      // Pluto
  0, 0, 0, 0,         // nodes and apogees
  6371008.4 * 2,      // Earth
  271370.0,           // Chiron
  290000.0,           // Pholus
  939400.0,           // Ceres
  545000.0,           // Pallas
  246596.0,           // Juno
  525400.0,           // Vesta
];

/* ---- Ayanamsa initialization data ---- */
export interface AyaInit {
  t0: number;
  ayanT0: number;
  t0IsUT: boolean;
  precOffset: number;    // 0 = no correction, -1 = unclear/not applied
}

export const AYANAMSA: readonly AyaInit[] = [
  { t0: 2433282.42346, ayanT0: 24.042044444, t0IsUT: false, precOffset: SEMOD_PREC_NEWCOMB },  // 0: Fagan/Bradley
  { t0: 2435553.5, ayanT0: 23.250182778 - 0.004658035, t0IsUT: false, precOffset: SEMOD_PREC_IAU_1976 }, // 1: Lahiri
  { t0: 1721057.5, ayanT0: 0, t0IsUT: true, precOffset: 0 }, // 2: DeLuce
  { t0: J1900, ayanT0: 360 - 338.98556, t0IsUT: false, precOffset: SEMOD_PREC_NEWCOMB }, // 3: Raman
  { t0: J1900, ayanT0: 360 - 341.33904, t0IsUT: false, precOffset: -1 }, // 4: Usha/Shashi
  { t0: J1900, ayanT0: 360 - 337.636111, t0IsUT: false, precOffset: SEMOD_PREC_NEWCOMB }, // 5: Krishnamurti
  { t0: J1900, ayanT0: 360 - 333.0369024, t0IsUT: false, precOffset: 0 }, // 6: Djwhal Khul
  { t0: J1900, ayanT0: 360 - 338.917778, t0IsUT: false, precOffset: -1 }, // 7: Yukteshwar
  { t0: J1900, ayanT0: 360 - 338.634444, t0IsUT: false, precOffset: -1 }, // 8: Bhasin
  { t0: 1684532.5, ayanT0: -5.66667, t0IsUT: true, precOffset: -1 }, // 9: Kugler 1
  { t0: 1684532.5, ayanT0: -4.26667, t0IsUT: true, precOffset: -1 }, // 10: Kugler 2
  { t0: 1684532.5, ayanT0: -3.41667, t0IsUT: true, precOffset: -1 }, // 11: Kugler 3
  { t0: 1684532.5, ayanT0: -4.46667, t0IsUT: true, precOffset: -1 }, // 12: Huber
  { t0: 1673941, ayanT0: -5.079167, t0IsUT: true, precOffset: -1 }, // 13: Mercier
  { t0: 1684532.5, ayanT0: -4.44138598, t0IsUT: true, precOffset: 0 }, // 14: Aldebaran=15Tau
  { t0: 1674484.0, ayanT0: -9.33333, t0IsUT: true, precOffset: -1 }, // 15: Hipparchos
  { t0: 1927135.8747793, ayanT0: 0, t0IsUT: true, precOffset: -1 }, // 16: Sassanian
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 17: Gal.Ctr 0 Sag
  { t0: J2000, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 18: J2000
  { t0: J1900, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 19: J1900
  { t0: B1950, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 20: B1950
  { t0: 1903396.8128654, ayanT0: 0, t0IsUT: true, precOffset: 0 }, // 21: Suryasiddhanta
  { t0: 1903396.8128654, ayanT0: -0.21463395, t0IsUT: true, precOffset: 0 }, // 22: Suryasiddhanta, mean Sun
  { t0: 1903396.7895321, ayanT0: 0, t0IsUT: true, precOffset: 0 }, // 23: Aryabhata
  { t0: 1903396.7895321, ayanT0: -0.23763238, t0IsUT: true, precOffset: 0 }, // 24: Aryabhata, mean Sun
  { t0: 1903396.8128654, ayanT0: -0.79167046, t0IsUT: true, precOffset: 0 }, // 25: SS Revati
  { t0: 1903396.8128654, ayanT0: 2.11070444, t0IsUT: true, precOffset: 0 }, // 26: SS Citra
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 27: True Citra
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 28: True Revati
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 29: True Pushya
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 30: Gil Brand
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 31: GE IAU 1958
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 32: GE true
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 33: GE Mula
  { t0: 2451079.734892000, ayanT0: 30, t0IsUT: false, precOffset: 0 }, // 34: Skydram/Mardyks
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 35: Chandra Hari
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 36: Ernst Wilhelm
  { t0: 1911797.740782065, ayanT0: 0, t0IsUT: true, precOffset: 0 }, // 37: Aryabhata 522
  { t0: 1721057.5, ayanT0: -3.2, t0IsUT: true, precOffset: -1 }, // 38: Britton
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 39: Sheoran
  { t0: 0, ayanT0: 0, t0IsUT: false, precOffset: 0 }, // 40: Cochrane
  { t0: 2451544.5, ayanT0: 25.0, t0IsUT: true, precOffset: 0 }, // 41: Fiorenza
  { t0: 1775845.5, ayanT0: -2.9422, t0IsUT: true, precOffset: -1 }, // 42: Valens
  { t0: J1900, ayanT0: 22.44597222, t0IsUT: false, precOffset: SEMOD_PREC_NEWCOMB }, // 43: Lahiri 1940
  { t0: 1825235.2458513028, ayanT0: 0.0, t0IsUT: false, precOffset: 0 }, // 44: Lahiri VP285
  { t0: 1827424.752255678, ayanT0: 0.0, t0IsUT: false, precOffset: 0 }, // 45: Krishnamurti VP291
  { t0: 2435553.5, ayanT0: 23.25 - 0.00464207, t0IsUT: false, precOffset: SEMOD_PREC_NEWCOMB }, // 46: Lahiri ICRC
];

/* ---- Heliacal event types ---- */
export const SE_HELIACAL_RISING = 1;
export const SE_HELIACAL_SETTING = 2;
export const SE_MORNING_FIRST = 1;
export const SE_EVENING_LAST = 2;
export const SE_EVENING_FIRST = 3;
export const SE_MORNING_LAST = 4;
export const SE_ACRONYCHAL_RISING = 5;
export const SE_ACRONYCHAL_SETTING = 6;
export const SE_COSMICAL_SETTING = 6;

/* ---- Heliacal flags ---- */
export const SE_HELFLAG_LONG_SEARCH = 128;
export const SE_HELFLAG_HIGH_PRECISION = 256;
export const SE_HELFLAG_OPTICAL_PARAMS = 512;
export const SE_HELFLAG_NO_DETAILS = 1024;
export const SE_HELFLAG_SEARCH_1_PERIOD = 2048;
export const SE_HELFLAG_VISLIM_DARK = 4096;
export const SE_HELFLAG_VISLIM_NOMOON = 8192;
export const SE_HELFLAG_VISLIM_PHOTOPIC = 16384;
export const SE_HELFLAG_VISLIM_SCOTOPIC = 32768;
export const SE_HELFLAG_AVKIND_VR = 65536;
export const SE_HELFLAG_AVKIND_PTO = 131072;
export const SE_HELFLAG_AVKIND_MIN7 = 262144;
export const SE_HELFLAG_AVKIND_MIN9 = 524288;
export const SE_HELFLAG_AVKIND = SE_HELFLAG_AVKIND_VR | SE_HELFLAG_AVKIND_PTO | SE_HELFLAG_AVKIND_MIN7 | SE_HELFLAG_AVKIND_MIN9;

/* ---- Photopic/scotopic flags ---- */
export const SE_PHOTOPIC_FLAG = 0;
export const SE_SCOTOPIC_FLAG = 1;
export const SE_MIXEDOPIC_FLAG = 2;

/* ---- JPL body indices (from swejpl.h) ---- */
export const J_MERCURY = 0;
export const J_VENUS = 1;
export const J_EARTH = 2;
export const J_MARS = 3;
export const J_JUPITER = 4;
export const J_SATURN = 5;
export const J_URANUS = 6;
export const J_NEPTUNE = 7;
export const J_PLUTO = 8;
export const J_MOON = 9;
export const J_SUN = 10;
export const J_SBARY = 11;
export const J_EMB = 12;
export const J_NUT = 13;
export const J_LIB = 14;

/** Maps SEI internal planet index → JPL body number */
export const PNOINT2JPL: readonly number[] = [
  J_EARTH, J_MOON, J_MERCURY, J_VENUS, J_MARS,
  J_JUPITER, J_SATURN, J_URANUS, J_NEPTUNE, J_PLUTO, J_SUN,
];

/* ---- Default JPL file names ---- */
export const SE_FNAME_DFT = "de431.eph";
export const SE_FNAME_DFT2 = "de406.eph";

/* ---- Invalid TJD marker ---- */
export const TJD_INVALID = -99999999.0;
