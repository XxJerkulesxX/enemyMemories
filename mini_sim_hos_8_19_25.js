/**
 * Dual-brand mini-sim for a Fairfield (86 keys) + TownePlace (63 keys).
 * Models:
 *  - ADR, Occupancy, RevPAR, RGI (RevPAR Index)
 *  - Group Pace (simple weekly OTB vs target)
 *  - Lead Conversion (won / qualified)
 *  - RFP/LNR Wins (counts + roomnights)
 *  - Top-20 Account Production (roomnights/revenue)
 *  - Channel Mix (revenue & acquisition cost)
 *  - GOP, GOPPAR, Flow-through
 *
 * Notes:
 *  - This is intentionally simple; numbers are illustrative.
 *  - Replace assumptions with your real patterns as you learn them.
 */

/////////////////////////// UTIL ///////////////////////////
const DAYS = 30; // 30-day period
const WEEKS_AHEAD = 4; // for pace
const fmtPct = (x) => (x * 100).toFixed(1) + "%";
const fmt$ = (x) => "$" + x.toFixed(2);
const range = (n) => Array.from({ length: n }, (_, i) => i);
const clone = (obj) => JSON.parse(JSON.stringify(obj));

//////////////////// CHANNEL COST (commission / distribution) ////////////////////
// Very rough illustrative "take" percentages off gross revenue
const CHANNEL_COST = {
  Direct: 0.00,        // walk-ins, property-direct
  Brand: 0.03,         // brand.com + CRS cost proxy
  GDS: 0.08,           // negotiated business via GDS
  OTA: 0.15,           // OTA commission
  LNR: 0.02,           // local negotiated (small cost proxy)
};


const ALLOWED_CHANNELS = ["Direct","Brand","GDS","OTA","Voice","Wholesale","LNR"];
const ALLOWED_SEGMENTS = [
  "Corporate","Leisure","Government",
  "Group","SMERF","Sports",
  "Crew","Project","Relocation","ExtendedStay",
  "Other"
];

// Rollups to parent buckets (nice for dashboards)
const SEGMENT_PARENT = {
  Corporate: "Transient",
  Leisure: "Transient",
  Government: "Transient",
  Group: "Group",
  SMERF: "Group",
  Sports: "Group",
  Crew: "Contract",
  Project: "Contract",
  Relocation: "Contract",
  ExtendedStay: "Contract",
  Other: "Other"
};


//////////////////// COST MODELS (estimates) ////////////////////
// Variable cost per occupied room night; fixed cost per day.
const COST_MODEL = {
  FFI: { varPOR: 35, fixedPerDay: 3000 }, // Fairfield: breakfast + daily HK
  TPS: { varPOR: 22, fixedPerDay: 2500 }, // TownePlace: extended stay, weekly HK
};

const RATEPLAN_VALUE_ADD = {
  BAR: 0,            // Best Available Rate (flex)
  MEMBER: 0,         // Member rate
  AP: 0,             // Advance Purchase
  LNR: 0,            // Local Negotiated Rate
  PKG_BKFST: 8,      // package incl. breakfast
  PKG_PARK: 12,      // package incl. parking
  PKG_BKFST_PARK: 18 // package incl. both
};

//////////////////////////// CORE CLASSES ////////////////////////////
class Hotel {
    constructor(name, rooms, flag) {
        this.name = name;
        this.rooms = rooms;
        this.flag = flag; // "FFI" or "TPS"
        this.calendar = range(DAYS).map(() => ({
            sold: 0,
            revenue: 0,
            byChannel: {}, // channel -> revenue
            byAccount: {}, // account -> { nights, revenue }
            bySegment: {}, // segment -> nights
            byRatePlan: {},   // NEW: revenue & nights by rate plan
            groupNights: 0,
            valueAddCost: 0,
        }));
    }

  // Add a stay spanning multiple nights
// Add a stay spanning multiple nights
addStay({
  day,
  nights,
  rate,
  roomsCount = 1,
  segment = "Transient",
  channel = "Direct",
  account = null,
  isGroup = false,
  ratePlan = "BAR",
  valueAddCost = null, // optional override: per-room, per-night cost for this stay
}) {
  for (let d = day; d < Math.min(DAYS, day + nights); d++) {
    const soldAdd = roomsCount;
    const revAdd  = roomsCount * rate;
    const c = this.calendar[d];

    // base sales
    c.sold    += soldAdd;
    c.revenue += revAdd;

    // channel & segment rollups
    c.byChannel[channel] = (c.byChannel[channel] || 0) + revAdd;
    c.bySegment[segment] = (c.bySegment[segment] || 0) + soldAdd;

    // account rollup
    if (account) {
      const a = (c.byAccount[account] ||= { nights: 0, revenue: 0 });
      a.nights  += soldAdd;
      a.revenue += revAdd;
    }

    // rate plan rollup (track both nights and revenue)
    const rp = (c.byRatePlan[ratePlan] ||= { nights: 0, revenue: 0 });
    rp.nights  += soldAdd;
    rp.revenue += revAdd;

    // per-night value-add cost for packages (breakfast, parking, etc.)
    const perNightCost =
      valueAddCost ?? RATEPLAN_VALUE_ADD[ratePlan] ?? 0; // dollars per room-night
    c.valueAddCost += perNightCost * soldAdd;

    // group pace rollup
    if (isGroup) c.groupNights += soldAdd;
  }
}


// One-night sale helper
sellDay({
  day,
  sold,
  rate,
  segment = "Transient",
  channel = "Direct",
  account = null,
  isGroup = false,
  ratePlan = "BAR",        // NEW
  valueAddCost = null      // NEW (per room per night; leave null to use RATEPLAN_VALUE_ADD)
}) {
  this.addStay({
    day,
    nights: 1,
    rate,
    roomsCount: sold,
    segment,
    channel,
    account,
    isGroup,
    ratePlan,              // pass through
    valueAddCost           // pass through
  });
}


metrics(dayStart = 0, dayEnd = DAYS - 1) {
  let sold = 0, revenue = 0;
  let byChannel = {}, byAccount = {}, bySegment = {}, byRatePlan = {};
  let groupNights = 0;
  let valueAddCost = 0; // NEW

  for (let d = dayStart; d <= dayEnd; d++) {
    const c = this.calendar[d];
    sold       += c.sold;
    revenue    += c.revenue;
    groupNights += c.groupNights;
    valueAddCost += c.valueAddCost; // NEW

    for (const [k, v] of Object.entries(c.byChannel)) byChannel[k] = (byChannel[k] || 0) + v;
    for (const [k, v] of Object.entries(c.bySegment)) bySegment[k] = (bySegment[k] || 0) + v;

    for (const [k, v] of Object.entries(c.byAccount)) {
      if (!byAccount[k]) byAccount[k] = { nights: 0, revenue: 0 };
      byAccount[k].nights  += v.nights;
      byAccount[k].revenue += v.revenue;
    }
    for (const [k, v] of Object.entries(c.byRatePlan || {})) {  // NEW
      if (!byRatePlan[k]) byRatePlan[k] = { nights: 0, revenue: 0 };
      byRatePlan[k].nights  += v.nights;
      byRatePlan[k].revenue += v.revenue;
    }
  }

  const nights = dayEnd - dayStart + 1;
  const roomsAvail = this.rooms * nights;
  const occupancy = roomsAvail ? sold / roomsAvail : 0;
  const adr = sold ? revenue / sold : 0;
  const revpar = roomsAvail ? revenue / roomsAvail : 0;

  const netRevenue = revenue - this.channelCost(byChannel);
  const cost = this.costs({ sold, dayCount: nights });

  // NEW: subtract value-add (package) costs from GOP
  const gop = netRevenue - (cost.total + valueAddCost);
  const goppar = roomsAvail ? gop / roomsAvail : 0;

  return {
    sold, revenue, netRevenue, roomsAvail, occupancy, adr, revpar,
    gop, goppar, valueAddCost, // NEW: expose valueAddCost
    byChannel, byAccount, bySegment, byRatePlan, groupNights
  };
}

  channelCost(byChannel) {
    let total = 0;
    for (const [ch, rev] of Object.entries(byChannel)) {
      const take = CHANNEL_COST[ch] ?? 0;
      total += rev * take;
    }
    return total;
  }

  costs({ sold, dayCount }) {
    const cm = COST_MODEL[this.flag];
    const varCost = sold * cm.varPOR;
    const fixedCost = cm.fixedPerDay * dayCount;
    return { varCost, fixedCost, total: varCost + fixedCost };
  }

  // otb  On The Books
  // Simple "pace" view: group nights OTB for the next weeks vs a target
  groupPace({ startDay = 0, weeks = WEEKS_AHEAD, weeklyTargets = [] }) {
    const result = [];
    for (let w = 0; w < weeks; w++) {
      const from = startDay + w * 7;
      const to = Math.min(DAYS - 1, from + 6);
      let nights = 0;
      for (let d = from; d <= to; d++) nights += (this.calendar[d]?.groupNights || 0);
      const target = weeklyTargets[w] ?? 0;
      result.push({ week: w + 1, nightsOTB: nights, target, paceVsTarget: nights - target });
    }
    return result;
  }
}

class CompSet {
  constructor(name, revparByDay) {
    this.name = name;
    this.revparByDay = revparByDay;
  }
  revparAvg(dayStart = 0, dayEnd = DAYS - 1) {
    let sum = 0, n = 0;
    for (let d = dayStart; d <= dayEnd; d++) { sum += this.revparByDay[d]; n++; }
    return n ? sum / n : 0;
  }
}
// Revenue Generating Index
const RGI = (hotelRevPAR, compRevPAR) => (hotelRevPAR / compRevPAR) * 100;

///////////////////////// SALES PIPELINE /////////////////////////
class SalesPipeline {
  constructor() {
    this.leads = []; // {id, property, segment, channel, rooms, nights, rate, qualified, won, type: "Lead"|"RFP"|"LNR", account}
  }
  addLead(lead) { this.leads.push(lead); }
  summary() {
    const qualified = this.leads.filter(l => l.qualified);
    const won = qualified.filter(l => l.won);
    const leadConv = qualified.length ? (won.length / qualified.length) : 0;

    const rfpWins = won.filter(l => l.type === "RFP");
    const lnrWins = won.filter(l => l.type === "LNR");

    const countAndRN = (arr) => ({
      count: arr.length,
      roomNights: arr.reduce((s, l) => s + l.rooms * l.nights, 0),
      revenue: arr.reduce((s, l) => s + l.rooms * l.nights * l.rate, 0),
    });

    return {
      qualified: qualified.length,
      won: won.length,
      leadConversionRate: leadConv,
      rfp: countAndRN(rfpWins),
      lnr: countAndRN(lnrWins),
    };
  }
}

///////////////////////// SCENARIO SETUP /////////////////////////
// Instantiate hotels with your real key counts.
const fairfield = new Hotel("Fairfield Inn & Suites", 86, "FFI");
const townePlace = new Hotel("TownePlace Suites", 63, "TPS");


const fairfieldNorth = new Hotel("Fairfield Inn & Suites", 89, "ABQFN");


fairfieldNorth.sellDay({
  day: 1,
  sold: 35,
  rate: 135.00,
  segment: "Corporate",
  channel: "Direct",
  account: "Microsoft Corp",
  isGroup: true,
  ratePlan: "CORP_NEGOTIATED",
  valueAddCost: 25.00  // meeting room setup + continental breakfast
});



// Simple weekly pattern placeholder (edit freely)
// - Fairfield: stronger Fri/Sat, decent Mon-Thu, soft Sun
// - TownePlace: steady base + some weekday transient
const isWeekend = (d) => {
  const dow = d % 7; // 0=Mon ... 6=Sun (change if you prefer 0=Sun)
  return dow === 5 || dow === 6; // Sat or Sun in this mapping? -> Here 5=Sat, 6=Sun (Mon=0)
};

// FFI fill pattern
range(DAYS).forEach((d) => {
  if (isWeekend(d)) {
    fairfield.sellDay({ day: d, sold: 70, rate: 175, segment: "Leisure", channel: "Brand" });
  } else {
    const dow = d % 7;
    if (dow === 6) { // Sun (softer)
      fairfield.sellDay({ day: d, sold: 48, rate: 129, segment: "Transient", channel: "Brand" });
    } else {
      fairfield.sellDay({ day: d, sold: 58, rate: 139, segment: "Corporate", channel: "GDS" });
    }
  }
});
// A couple compression bumps (sports weekends / events)
// Use a distinct ratePlan so you can report by plan later.
[8, 18, 26].forEach((d) =>
  fairfield.sellDay({
    day: d,
    sold: 8,
    rate: 209,
    segment: "Sports",
    channel: "Direct",
    isGroup: true,
    ratePlan: "GROUP_SPORTS" // e.g., "GROUP", "EVENT", or "PKG_*" if you ever bundle
  })
);

// TPS base (extended stay crews / relocation) + light transient
townePlace.addStay({
  day: 0,
  nights: 30,
  rate: 119,
  roomsCount: 18,
  segment: "Crew",
  channel: "LNR",
  account: "ACME Utilities",
  isGroup: true,
  ratePlan: "LNR" // negotiated crew base
});

townePlace.addStay({
  day: 0,
  nights: 14,
  rate: 116,
  roomsCount: 10,
  segment: "Relocation",
  channel: "Direct",
  account: "TriCity Hospital",
  isGroup: true,
  ratePlan: "RELO" // relocation-specific plan label
});

townePlace.addStay({
  day: 14,
  nights: 16,
  rate: 118,
  roomsCount: 8,
  segment: "Project",
  channel: "Direct",
  account: "State DOT",
  isGroup: true,
  ratePlan: "PROJECT" // project-based long stay
});


range(DAYS).forEach((d) => {
  if (isWeekend(d)) {
    // Weekend leisure via OTA at public BAR (channel cost handled by "OTA")
    townePlace.sellDay({
      day: d,
      sold: 6,
      rate: 132,
      segment: "Leisure",
      channel: "OTA",
      ratePlan: "BAR"
    });
  } else {
    // Weekday corporate via GDS (negotiated/managed corp)
    townePlace.sellDay({
      day: d,
      sold: 8,
      rate: 138,
      segment: "Corporate",
      channel: "GDS",
      ratePlan: "CORP" // or "LNR" if you want to treat it as a local negotiated rate
    });
  }
});


// Build simple comp sets (RevPAR only; tweak to taste)
const compFFI = new CompSet("FFI Comp", range(DAYS).map((d) => {
  const occ = isWeekend(d) ? 0.86 : (d % 7 === 6 ? 0.58 : 0.65);
  const adr = isWeekend(d) ? 165 : (d % 7 === 6 ? 122 : 132);
  return occ * adr;
}));
const compTPS = new CompSet("TPS Comp", range(DAYS).map(() => 0.80 * 123)); // steady 80% @ $123 ADR

// Sales pipeline: a few sample leads (qualified/won) for KPI demos
const pipeline = new SalesPipeline();
pipeline.addLead({ id: 1, property: "TPS", type: "LNR", segment: "Crew", channel: "Direct", rooms: 12, nights: 21, rate: 117, qualified: true, won: true, account: "NorthGrid Electric" });
pipeline.addLead({ id: 2, property: "FFI", type: "RFP", segment: "Corporate", channel: "GDS", rooms: 15, nights: 2, rate: 145, qualified: true, won: false, account: "OmniTech" });
pipeline.addLead({ id: 3, property: "FFI", type: "Lead", segment: "Sports", channel: "Direct", rooms: 20, nights: 2, rate: 169, qualified: true, won: true, account: "State Swim Assoc." });
pipeline.addLead({ id: 4, property: "TPS", type: "RFP", segment: "Medical", channel: "Direct", rooms: 8, nights: 30, rate: 120, qualified: true, won: true, account: "Venture Dialysis" });
pipeline.addLead({ id: 5, property: "FFI", type: "LNR", segment: "Corporate", channel: "GDS", rooms: 5, nights: 20, rate: 135, qualified: false, won: false, account: "K&J Engineering" });
//On The Books
// Group pace targets (OTB vs target) for next 4 weeks (edit to your plan)
const ffiPaceTargets = [220, 180, 160, 200]; // group room nights target by week
const tpsPaceTargets = [300, 280, 260, 240];

///////////////////////// CALCULATIONS /////////////////////////
const ffi = fairfield.metrics();
const tps = townePlace.metrics();

const campus = {
  sold: ffi.sold + tps.sold,
  revenue: ffi.revenue + tps.revenue,
  netRevenue: ffi.netRevenue + tps.netRevenue,
  roomsAvail: (fairfield.rooms + townePlace.rooms) * DAYS,
};
campus.occupancy = campus.sold / campus.roomsAvail;
campus.adr = campus.sold ? campus.revenue / campus.sold : 0;
campus.revpar = campus.roomsAvail ? campus.revenue / campus.roomsAvail : 0;

// Comp set blended RevPAR (weighted by keys)
const ffiCompRevPAR = compFFI.revparAvg();
const tpsCompRevPAR = compTPS.revparAvg();
const campusCompRevPAR = (ffiCompRevPAR * fairfield.rooms + tpsCompRevPAR * townePlace.rooms) / (fairfield.rooms + townePlace.rooms);

// RGI
const ffiRGI = RGI(ffi.revpar, ffiCompRevPAR);
const tpsRGI = RGI(tps.revpar, tpsCompRevPAR);
const campusRGI = RGI(campus.revpar, campusCompRevPAR);

// Pace (next 4 weeks from day 0)
const ffiPace = fairfield.groupPace({ startDay: 0, weeks: WEEKS_AHEAD, weeklyTargets: ffiPaceTargets });
const tpsPace = townePlace.groupPace({ startDay: 0, weeks: WEEKS_AHEAD, weeklyTargets: tpsPaceTargets });

// Lead / RFP / LNR summary
const salesSummary = pipeline.summary();

// Top accounts (by revenue) — show top 5 for each
function topNAccounts(byAccount, n = 5) {
  return Object.entries(byAccount)
    .map(([k, v]) => ({ account: k, nights: v.nights, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}
const ffiTop = topNAccounts(ffi.byAccount);
const tpsTop = topNAccounts(tps.byAccount);

// Channel mix (% of revenue)
function channelMix(byChannel, totalRev) {
  return Object.fromEntries(
    Object.entries(byChannel).map(([ch, rev]) => [ch, { share: rev / totalRev, revenue: rev }])
  );
}
const ffiMix = channelMix(ffi.byChannel, ffi.revenue);
const tpsMix = channelMix(tps.byChannel, tps.revenue);

// Flow-through demo: run a tiny "what-if" variant and compare ΔGOP / ΔRev
function runVariant() {
  // Clone hotels then add extra long-stay base to TPS (example)
  const H1 = cloneHotel(townePlace); // TPS
  const H2 = cloneHotel(fairfield);  // FFI

  // Add 6 more crew rooms for 30 nights at TPS at $118
  H1.addStay({ day: 0, nights: 30, rate: 118, roomsCount: 6, segment: "Crew", channel: "LNR", account: "GridBuild JV", isGroup: true });

  const baseFFI = fairfield.metrics();
  const baseTPS = townePlace.metrics();
  const varFFI = H2.metrics();
  const varTPS = H1.metrics();

  const baseRev = baseFFI.revenue + baseTPS.revenue;
  const baseGOP = baseFFI.gop + baseTPS.gop;
  const varRev  = varFFI.revenue + varTPS.revenue;
  const varGOP  = varFFI.gop + varTPS.gop;

  const dRev = varRev - baseRev;
  const dGOP = varGOP - baseGOP;
  const flowThrough = dRev !== 0 ? dGOP / dRev : 0;

  return { baseRev, baseGOP, varRev, varGOP, dRev, dGOP, flowThrough };
}
function cloneHotel(h) {
  const copy = new Hotel(h.name, h.rooms, h.flag);
  copy.calendar = clone(h.calendar);
  return copy;
}

//////////////////////////// OUTPUT ////////////////////////////
function printBlock(title, m) {
  console.log(`\n=== ${title} ===`);
  console.log("Rooms Avail:", m.roomsAvail);
  console.log("Rooms Sold:", m.sold);
  console.log("Occupancy:", fmtPct(m.occupancy));
  console.log("ADR:", fmt$(m.adr));
  console.log("RevPAR:", fmt$(m.revpar));
  console.log("Net Revenue (after channel costs):", fmt$(m.netRevenue));
  console.log("Value-add costs (packages):", fmt$(m.valueAddCost)); // <- NEW
  console.log("GOP:", fmt$(m.gop), " | GOPPAR:", fmt$(m.goppar));
}


printBlock(fairfield.name, ffi);
console.log("FFI Comp RevPAR (avg):", fmt$(ffiCompRevPAR), "| RGI:", ffiRGI.toFixed(1));
console.log("FFI Channel Mix:", Object.fromEntries(Object.entries(ffiMix).map(([k,v])=>[k,{share:fmtPct(v.share), revenue:fmt$(v.revenue)}])));
console.log("FFI Top Accounts:", ffiTop);

printBlock(townePlace.name, tps);
console.log("TPS Comp RevPAR (avg):", fmt$(tpsCompRevPAR), "| RGI:", tpsRGI.toFixed(1));
console.log("TPS Channel Mix:", Object.fromEntries(Object.entries(tpsMix).map(([k,v])=>[k,{share:fmtPct(v.share), revenue:fmt$(v.revenue)}])));
console.log("TPS Top Accounts:", tpsTop);

console.log("\n--- Group Pace (OTB vs Target, next 4 weeks) ---");
console.table({ FFI: ffiPace, TPS: tpsPace });

console.log("\n--- Sales Pipeline Summary ---");
const ss = salesSummary;
console.log({
  qualifiedLeads: ss.qualified,
  wonLeads: ss.won,
  leadConversionRate: fmtPct(ss.leadConversionRate),
  rfpWins: { count: ss.rfp.count, roomNights: ss.rfp.roomNights, revenue: fmt$(ss.rfp.revenue) },
  lnrWins: { count: ss.lnr.count, roomNights: ss.lnr.roomNights, revenue: fmt$(ss.lnr.revenue) },
});

console.log("\n--- CAMPUS (Combined) ---");
console.log("Keys:", fairfield.rooms + townePlace.rooms);
console.log("Occupancy:", fmtPct(campus.occupancy));
console.log("ADR:", fmt$(campus.adr));
console.log("RevPAR:", fmt$(campus.revpar));
console.log("Campus Comp RevPAR (blend):", fmt$(campusCompRevPAR), "| RGI:", campusRGI.toFixed(1));

// Flow-through demonstration
const ft = runVariant();
console.log("\n--- Flow-through (Variant adds 6 more long-stay TPS rooms) ---");
console.log({
  baseRevenue: fmt$(ft.baseRev),
  baseGOP: fmt$(ft.baseGOP),
  variantRevenue: fmt$(ft.varRev),
  variantGOP: fmt$(ft.varGOP),
  deltaRevenue: fmt$(ft.dRev),
  deltaGOP: fmt$(ft.dGOP),
  flowThrough: fmtPct(ft.flowThrough),
});

/*
HOW THIS MAPS TO YOUR KPIs

ADR = revenue / roomsSold Average Daily Rate 
Occupancy = roomsSold / roomsAvailable
RevPAR = revenue / roomsAvailable = ADR * Occupancy Revenue Per Available Room
RGI = (Hotel RevPAR / Comp Set RevPAR) * 100 Revenue Generation Index
Group Pace = weekly group roomnights OTB vs target (see groupPace())
Lead Conversion = won / qualified (pipeline.summary())
RFP/LNR Wins = counts & roomnights (pipeline.summary().rfp / .lnr) Request for Proposal  Local Negotiated Rates 
Top-20 Accounts = calendar.byAccount aggregated & ranked
Channel Mix = revenue share by channel + commission “take”
GOP = (net revenue after channel costs) - (variable + fixed costs)  Gross Operating Profit
GOPPAR = GOP / roomsAvailable
Flow-through = ΔGOP / ΔRevenue across scenarios

TWEAK IDEAS
- Replace the sell patterns in SCENARIO SETUP with real weekday/weekend patterns.
- Push FFI compression: sellDay({day, sold:+X, rate:+$})
- Strengthen TPS base: addStay({ day:0, nights:30, rate:118, roomsCount: +N, segment:"Crew", channel:"LNR", isGroup:true })
- Change comp set strength by adjusting compFFI / compTPS RevPAR.
- Adjust CHANNEL_COST and COST_MODEL to mirror your property.
*/
