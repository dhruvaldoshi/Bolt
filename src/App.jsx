import { useState, useEffect, useRef } from "react";

const FONT = “https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap”;

// - DESIGN TOKENS -
const C = {
bg:”#080808”,surface:”#0d0d0d”,surface2:”#111”,border:”#1a1a1a”,border2:”#222”,
text:”#ece8df”,muted:”#888”,dim:”#555”,dimmer:”#333”,
amber:”#f5a623”,green:”#4ade80”,blue:”#60a5fa”,red:”#f87171”,
purple:”#c084fc”,teal:”#2dd4bf”,pink:”#f472b6”,wa:”#25d366”
};
const F = { serif:“Instrument Serif, Georgia, serif”, sans:“DM Sans, system-ui, sans-serif” };

// - SUPABASE SCHEMA (paste into Supabase SQL editor when going live) -
/*
TABLE: users
mobile_number TEXT PRIMARY KEY
created_at TIMESTAMPTZ DEFAULT NOW()
referral_code TEXT UNIQUE
referred_by TEXT
retake_count INTEGER DEFAULT 0
ab_test_cell TEXT
total_spent INTEGER DEFAULT 0

TABLE: blueprints
blueprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
mobile_number TEXT REFERENCES users
blueprint_number INTEGER UNIQUE
created_at TIMESTAMPTZ DEFAULT NOW()
quiz_answers JSONB
ai_output JSONB
readiness_score INTEGER
chosen_idea_index INTEGER
chosen_idea_title TEXT
niche_match TEXT
ab_test_cell TEXT
is_retake BOOLEAN DEFAULT FALSE
retake_number INTEGER DEFAULT 1

TABLE: events
event_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
mobile_number TEXT REFERENCES users
blueprint_id UUID REFERENCES blueprints
event_type TEXT
event_data JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
session_id TEXT
ab_test_cell TEXT

TABLE: transactions
transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
mobile_number TEXT REFERENCES users
blueprint_id UUID REFERENCES blueprints
product TEXT
amount INTEGER
razorpay_id TEXT
status TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
*/

// - A/B TEST -
const AB_CELLS = {
A:{ gatePrice:499,  promptPrice:149, hookVariant:“pain” },
B:{ gatePrice:499,  promptPrice:249, hookVariant:“pain” },
C:{ gatePrice:799,  promptPrice:149, hookVariant:“pain” },
D:{ gatePrice:799,  promptPrice:249, hookVariant:“aspiration” },
};
const getABCell = () => {
let c = localStorage.getItem(“bolt_ab_cell”);
if (!c) { c = Object.keys(AB_CELLS)[Math.floor(Math.random()*4)]; localStorage.setItem(“bolt_ab_cell”,c); }
return c;
};

// - ANALYTICS ENGINE -
const Analytics = {
sessionId: Math.random().toString(36).slice(2),
events: [],
track(type, data={}) {
const e = { event_id:Math.random().toString(36).slice(2), event_type:type, event_data:data, created_at:new Date().toISOString(), session_id:this.sessionId, ab_test_cell:localStorage.getItem(“bolt_ab_cell”)||“A”, mobile_number:localStorage.getItem(“bolt_mobile”)||null };
this.events.push(e);
// Production: await supabase.from(“events”).insert(e)
return e;
},
getSummary() {
const e = this.events;
return {
total_events: e.length,
quiz_questions_answered: e.filter(x=>x.event_type===“quiz_question_answered”).length,
screens_viewed: […new Set(e.filter(x=>x.event_type===“screen_viewed”).map(x=>x.event_data.screen))],
chosen_idea: e.find(x=>x.event_type===“idea_chosen”)?.event_data?.idea_title||null,
script_copied: e.some(x=>x.event_type===“script_copied”),
prompt_pack_converted: e.some(x=>x.event_type===“prompt_pack_converted”),
full_bundle_converted: e.some(x=>x.event_type===“full_bundle_converted”),
share_card_sent: e.some(x=>x.event_type===“share_card_sent”),
session_duration_mins: e.length>0 ? Math.round((new Date()-new Date(e[0].created_at))/60000) : 0,
};
}
};

// - USER STATE -
const UserState = {
get(m){ const d=localStorage.getItem(`bolt_user_${m}`); return d?JSON.parse(d):null; },
set(m,d){ localStorage.setItem(`bolt_user_${m}`,JSON.stringify(d)); localStorage.setItem(“bolt_mobile”,m); },
getRetakeCount(m){ return this.get(m)?.retake_count||0; },
incrementRetake(m){ const u=this.get(m)||{mobile_number:m,retake_count:0,blueprints:[]}; u.retake_count=(u.retake_count||0)+1; this.set(m,u); return u.retake_count; },
saveBlueprint(m,bp){ const u=this.get(m)||{mobile_number:m,retake_count:0,blueprints:[]}; if(!u.blueprints)u.blueprints=[]; u.blueprints.push({…bp,saved_at:new Date().toISOString()}); this.set(m,u); },
getBlueprints(m){ return this.get(m)?.blueprints||[]; }
};

// - NICHE DATA -
const NICHES_DATA = {
digital_marketing:{ id:“digital_marketing”,label:“Digital Marketing”,color:C.amber, marketCrore:18000,practitioners:2100000,growthYoY:30, avgMonthlyIncome:{entry:25000,mid:85000,senior:250000}, entryBarrier:“Low”,timeToFirstRupee:“1–2 weeks”,saturation:“Crowded”, bestChannel:“LinkedIn DMs + Meta retargeting”, topModels:[“Paid ads management”,“Strategy consulting”,“Audits & diagnostics”], indiaInsight:“India’s digital ad spend crossed ₹40,800 Cr in FY25 — growing 29% YoY. Brands are spending but most can’t measure ROI. That gap is the opportunity.”, scoreBreakdown:{expertise:18,timeViability:14,distribution:16,modelFit:17,execution:13}, x:42,y:55,r:82 },
dev_tech:{ id:“dev_tech”,label:“Tech & Dev”,color:C.green, marketCrore:52000,practitioners:3200000,growthYoY:28, avgMonthlyIncome:{entry:40000,mid:120000,senior:400000}, entryBarrier:“Medium”,timeToFirstRupee:“2–3 weeks”,saturation:“Competitive”, bestChannel:“Upwork + LinkedIn + referrals”, topModels:[“Freelance development”,“SaaS tools”,“Tech audits”], indiaInsight:“India produces 1.5M engineers/year. Generalist devs are commoditised — specialists in AI/ML/Web3 command 3–5× premiums.”, scoreBreakdown:{expertise:16,timeViability:15,distribution:14,modelFit:18,execution:12}, x:68,y:40,r:105 },
content_creation:{ id:“content_creation”,label:“Content Creation”,color:C.red, marketCrore:21000,practitioners:4100000,growthYoY:45, avgMonthlyIncome:{entry:15000,mid:60000,senior:300000}, entryBarrier:“Very Low”,timeToFirstRupee:“3–4 weeks”,saturation:“Saturated”, bestChannel:“Instagram + YouTube + brand deals”, topModels:[“Brand partnerships”,“Digital products”,“Community”], indiaInsight:“Short-form video dominates — Reels and YouTube Shorts drive 70% of brand spend on creators. Vernacular content has 40% less competition than English.”, scoreBreakdown:{expertise:12,timeViability:10,distribution:14,modelFit:15,execution:11}, x:60,y:72,r:95 },
ecommerce:{ id:“ecommerce”,label:“E-commerce”,color:C.teal, marketCrore:86000,practitioners:5600000,growthYoY:22, avgMonthlyIncome:{entry:20000,mid:80000,senior:500000}, entryBarrier:“Medium”,timeToFirstRupee:“3–6 weeks”,saturation:“Competitive”, bestChannel:“Amazon/Flipkart + D2C Meta ads”, topModels:[“Private label”,“Reselling”,“D2C brand”], indiaInsight:“Tier 2/3 cities now account for 60%+ of e-commerce growth. Niche categories have lower competition and higher loyalty.”, scoreBreakdown:{expertise:13,timeViability:12,distribution:15,modelFit:14,execution:13}, x:80,y:62,r:112 },
edtech_teaching:{ id:“edtech_teaching”,label:“Online Teaching”,color:”#a78bfa”, marketCrore:28000,practitioners:1900000,growthYoY:35, avgMonthlyIncome:{entry:20000,mid:75000,senior:280000}, entryBarrier:“Low”,timeToFirstRupee:“2–4 weeks”,saturation:“Growing”, bestChannel:“YouTube funnel + WhatsApp community”, topModels:[“Live cohorts”,“Recorded courses”,“1:1 coaching”], indiaInsight:“Post-BYJU’s collapse, learners trust small independent instructors more than large platforms. Now is the best time to launch.”, scoreBreakdown:{expertise:15,timeViability:13,distribution:14,modelFit:16,execution:12}, x:52,y:20,r:88 },
finance_consulting:{ id:“finance_consulting”,label:“Finance & Tax”,color:”#fb923c”, marketCrore:9400,practitioners:890000,growthYoY:18, avgMonthlyIncome:{entry:30000,mid:100000,senior:350000}, entryBarrier:“High”,timeToFirstRupee:“3–5 weeks”,saturation:“Undercrowded”, bestChannel:“LinkedIn + CA referral network”, topModels:[“Tax advisory”,“Investment planning”,“CFO-as-a-service”], indiaInsight:“Only 8% of India’s 140M taxpayers use a professional advisor. New tax regimes and startup ecosystem created massive unmet demand.”, scoreBreakdown:{expertise:17,timeViability:14,distribution:13,modelFit:15,execution:14}, x:76,y:22,r:58 },
coaching:{ id:“coaching”,label:“Coaching”,color:”#e879f9”, marketCrore:3100,practitioners:720000,growthYoY:40, avgMonthlyIncome:{entry:15000,mid:60000,senior:250000}, entryBarrier:“Low”,timeToFirstRupee:“1–2 weeks”,saturation:“Growing”, bestChannel:“LinkedIn personal brand + referrals”, topModels:[“1:1 coaching”,“Group programs”,“Community”], indiaInsight:“Corporate burnout post-pandemic created massive demand for career, leadership, and wellness coaching. ICF-certified coaches charge 2–3× more.”, scoreBreakdown:{expertise:14,timeViability:15,distribution:13,modelFit:16,execution:11}, x:28,y:74,r:52 },
design:{ id:“design”,label:“Design”,color:C.pink, marketCrore:6800,practitioners:1600000,growthYoY:25, avgMonthlyIncome:{entry:20000,mid:70000,senior:220000}, entryBarrier:“Low”,timeToFirstRupee:“1–2 weeks”,saturation:“Crowded”, bestChannel:“Behance + LinkedIn + Instagram”, topModels:[“Brand design”,“UI/UX”,“Digital templates”], indiaInsight:“UI/UX designers with product sense (not just visual skill) command 40% premium over pure visual designers.”, scoreBreakdown:{expertise:13,timeViability:14,distribution:15,modelFit:14,execution:12}, x:20,y:52,r:65 },
freelance_writing:{ id:“freelance_writing”,label:“Writing”,color:C.blue, marketCrore:4200,practitioners:2800000,growthYoY:20, avgMonthlyIncome:{entry:15000,mid:50000,senior:180000}, entryBarrier:“Very Low”,timeToFirstRupee:“1 week”,saturation:“Saturated”, bestChannel:“LinkedIn + cold email to content managers”, topModels:[“B2B content”,“Ghost writing”,“Technical writing”], indiaInsight:“AI has commoditised general writing. Technical writing, financial content, and SaaS documentation earn 2–4× generalists.”, scoreBreakdown:{expertise:11,timeViability:16,distribution:12,modelFit:14,execution:13}, x:25,y:32,r:68 },
};

// - SCORE DIMENSIONS -
const SCORE_DIMS = [
{ id:“expertise”,    label:“Expertise Depth”,        color:C.amber },
{ id:“timeViability”,label:“Time Viability”,         color:C.green },
{ id:“distribution”, label:“Distribution Readiness”, color:C.blue  },
{ id:“modelFit”,     label:“Income Model Fit”,       color:C.purple},
{ id:“execution”,    label:“Execution History”,      color:C.teal  },
];
const DIM_DESCS = {
expertise:    { high:“Deep, specific expertise that commands premium pricing.”, low:“Broad skill set — niche down further to increase perceived value 3×.”, fix:”‘Marketing’ → ‘Growth marketing for D2C brands’ → ‘Meta ads for fashion D2C’. Each step narrows competition and raises your price ceiling.” },
timeViability:{ high:“Your available hours support your income target.”, low:“Your time constraint vs income target requires high-ticket, low-volume only.”, fix:“Either raise your target price (fewer clients, same revenue) or reduce income target for first 90 days and build up.” },
distribution: { high:“Strong network and visibility — fast path to first client.”, low:“Limited warm network — paid ads or community seeding needed before first sale.”, fix:“Build a free lead magnet first — a scorecard, template, or short guide. Run ₹500/day in ads to it before pitching the paid product.” },
modelFit:     { high:“Your preferred earn mode matches well-proven models in your niche.”, low:“Your preferred earn mode has friction in your niche — consider a hybrid approach.”, fix:“Start with per-project work to validate demand. Once you have 3 paying clients, productize the most repeatable piece.” },
execution:    { high:“Past attempts show learning — you know what to avoid.”, low:“No execution history — the first step will feel harder than it is. Start small.”, fix:“Set a 30-day deadline and a specific failure condition before starting. A defined end-point removes the ‘I’ll figure it out’ trap.” },
};

// - MOCK ANALYTICS DATA -
const MOCK = {
totalUsers:347, totalRevenue:287450, avgLTV:828,
segments:{
champions:{ count:28,  pct:8,  avgLTV:1847, label:“Champions”,  color:C.green,  desc:“Gate + upsell + shared”,    nudgeUrgency:“Low”,    nudgeAction:“Exclusive Full Bundle upgrade offer”, nudgeMsg:“You’re Blueprint #347. Unlock the Pressure Test to stress-test your plan before you invest.” },
converts: { count:121, pct:35, avgLTV:748,  label:“Converts”,   color:C.blue,   desc:“Gate + completed blueprint”,nudgeUrgency:“Medium”, nudgeAction:“Prompt Pack impulse via WhatsApp”,    nudgeMsg:“Your Growth Systems Diagnostic plan is ready. Here are 6 prompts to start executing in 10 mins — ₹149.” },
browsers: { count:139, pct:40, avgLTV:499,  label:“Browsers”,   color:C.amber,  desc:“Gate + incomplete blueprint”,nudgeUrgency:“High”,  nudgeAction:“Re-engagement with Week 1 reminder”,  nudgeMsg:“You built a blueprint 3 days ago. Day 1 action: write the intake form. Takes 45 mins. Do it tonight?” },
at_risk:  { count:59,  pct:17, avgLTV:499,  label:“At Risk”,    color:C.red,    desc:“No activity 14+ days”,      nudgeUrgency:“Urgent”, nudgeAction:“Urgency push + social proof”,        nudgeMsg:“47 people who got a blueprint like yours started their first project this week. Your plan is still waiting.” },
},
ltvSignals:[
{ signal:“Shared referral link”,        multiplier:4.2, users:42,  color:C.green  },
{ signal:“Reached share screen”,        multiplier:3.1, users:89,  color:C.blue   },
{ signal:“Copied first client script”,  multiplier:2.4, users:134, color:C.purple },
{ signal:“Expanded 2+ idea cards”,      multiplier:2.1, users:156, color:C.teal   },
{ signal:“Sent commitment share”,       multiplier:1.8, users:76,  color:C.amber  },
],
flywheel:{
paidToBuyer:       { rate:0.14, target:0.22, label:“Ad → Buyer”,          metric:“Landing conversion”,    fixes:[“A/B test hook copy — pain vs aspiration”,“Try video ad showing a sample blueprint”,“Tighten landing page to single CTA above fold”] },
buyerToEngaged:    { rate:0.43, target:0.60, label:“Buyer → Engaged”,     metric:“Blueprint completion”,  fixes:[“Add progress saves — resume where left off”,“Send WhatsApp reminder 24hrs after gate if incomplete”,“Reduce screens — merge Assessment + First Step”] },
engagedToAdvocate: { rate:0.12, target:0.20, label:“Engaged → Advocate”,  metric:“Share card sent”,       fixes:[“Move share card earlier — after idea choice not end”,“Add score comparison — ‘I scored higher than X% of users’”,“Add native screenshot prompt on mobile”] },
advocateToReferral:{ rate:0.18, target:0.35, label:“Advocate → Referral”, metric:“Referral link clicked”, fixes:[“Rewrite referral copy — outcome not tool”,“Show sample blueprint in shared link preview”,“Add ₹200 discount for referred user, not just cashback for sharer”] },
referralToBuyer:   { rate:0.21, target:0.30, label:“Referral → Buyer”,    metric:“Referral conversion”,   fixes:[“Build dedicated referral landing page”,“Show blueprint # from person who referred them”,“Add social proof specific to referral traffic”] },
},
abTests:{
A:{ buyers:91,  convRate:0.138, avgLTV:812,  promptAttach:0.36, bundleAttach:0.07 },
B:{ buyers:84,  convRate:0.141, avgLTV:889,  promptAttach:0.29, bundleAttach:0.08 },
C:{ buyers:88,  convRate:0.122, avgLTV:1042, promptAttach:0.38, bundleAttach:0.09 },
D:{ buyers:84,  convRate:0.119, avgLTV:1089, promptAttach:0.31, bundleAttach:0.10 },
},
nicheDistrib:[
{ niche:“Digital Marketing”,pct:34,buyers:118 },
{ niche:“Tech & Dev”,       pct:18,buyers:62  },
{ niche:“Content Creation”, pct:14,buyers:49  },
{ niche:“Online Teaching”,  pct:11,buyers:38  },
{ niche:“Finance & Tax”,    pct:8, buyers:28  },
{ niche:“E-commerce”,       pct:7, buyers:24  },
{ niche:“Coaching”,         pct:5, buyers:17  },
{ niche:“Design”,           pct:3, buyers:11  },
],
scoreDist:[
{ range:“90–100”,count:23,  label:“Launch-Ready” },
{ range:“75–89”, count:89,  label:“Almost There” },
{ range:“60–74”, count:142, label:“Getting Closer” },
{ range:“40–59”, count:71,  label:“Foundation Phase” },
{ range:”< 40”,  count:22,  label:“Early Stage” },
],
};

// - QUIZ QUESTIONS -
const QUESTIONS = [
{ id:“expertise”,    q:“What’s your primary professional expertise?”,                                           sub:“Not your job title — what you actually know deeply.”, type:“text”,       placeholder:“e.g. Growth marketing & paid acquisition, B2B SaaS sales” },
{ id:“differentiator”,q:“What’s the one thing you know that most people in your field don’t?”,                sub:“This becomes your positioning. The sharper, the better.”, type:“text”,   placeholder:“e.g. Most marketers optimise for clicks. I optimise for post-click revenue.” },
{ id:“experience”,   q:“How many years of experience in this field?”,                                           sub:“Exact number — 10 and 20 years are very different.”, type:“number”,    placeholder:“17”, suffix:“years” },
{ id:“currentIncome”,q:“Roughly what’s your current monthly take-home?”,                                        sub:“Calibrates the right ambition level.”, type:“choice”,                 options:[“Under ₹50,000”,“₹50k–₹1,00,000”,“₹1,00,000–₹2,00,000”,“₹2,00,000–₹3,50,000”,“₹3,50,000+”] },
{ id:“targetIncome”, q:“Monthly income target from this next move?”,                                            sub:“Your actual number — not a bracket.”, type:“number”,                  placeholder:“300000”, prefix:“₹”, suffix:”/ month” },
{ id:“timeline”,     q:“How soon do you want to hit that target?”,                                              sub:“Timeline determines your entire strategy.”, type:“choice”,            options:[“Within 3 months”,“6 months is fine”,“Building over 12 months”] },
{ id:“hours”,        q:“Hours per week you can actually commit?”,                                               sub:“Ruthlessly honest — overestimating kills most attempts.”, type:“choice”, options:[“1–3 hrs”,“4–7 hrs”,“8–15 hrs”,“15+ hrs”] },
{ id:“hoursWhen”,    q:“When are those hours available?”,                                                       sub:“Async vs live delivery depends on this.”, type:“multiselect”,          options:[“Early mornings”,“Weekday evenings”,“Weekends”,“Sporadic”] },
{ id:“superpower”,   q:“Last 3 times someone asked for your advice — what did they want to decide?”,           sub:“The more specific, the better.”, type:“textarea”,                      placeholder:“e.g.\n1. Whether to run Meta or Google ads first\n2. How to evaluate if their agency is performing\n3. How to structure a content funnel” },
{ id:“earnMode”,     q:“Rank how you prefer to earn.”,                                                          sub:“Top two weighted most in your blueprint.”, type:“rank”,                options:[{id:“dp”,label:“Digital product”,desc:“Build once, sell repeatedly”},{id:“cohort”,label:“Cohort”,desc:“Teach a group”},{id:“project”,label:“Per-project”,desc:“Deliver, get paid, done”},{id:“retainer”,label:“Retainer”,desc:“Same client, recurring”},{id:“commission”,label:“Commission”,desc:“Earn % on outcomes”}] },
{ id:“audience”,     q:“Describe your ideal client or customer.”,                                               sub:“Their mindset, problem, spending behaviour.”, type:“textarea”,         placeholder:“e.g. Founders of D2C brands spending ₹2L+/month on ads who aren’t seeing the ROI they expected.” },
{ id:“visibility”,   q:“How visible do you want to be?”,                                                        sub:“Filters which distribution strategies are realistic.”, type:“choice_d”, options:[{v:“active”,l:“Already active online”,d:“Post publicly on LinkedIn/Twitter”},{v:“occasional”,l:“Occasional posting”,d:“Show up but won’t grind content”},{v:“minimal”,l:“Product does the talking”,d:“Minimal personal presence”},{v:“anon”,l:“Fully behind the scenes”,d:“No name, no face”}] },
{ id:“network”,      q:“Do you have a warm professional network you could reach out to this week?”,             sub:“Biggest variable in time-to-first-rupee.”, type:“choice_d”,           options:[{v:“warm”,l:“Yes — warm network”,d:“Ex-colleagues, founders I know”},{v:“linkedin”,l:“LinkedIn connections”,d:“Not super warm but reachable”},{v:“cold”,l:“Starting cold”,d:“Will use paid ads”}] },
{ id:“pastFailure”,  q:“What did you try before and what got in the way?”,                                      sub:“Most predictive question on this form.”, type:“textarea”,             placeholder:“e.g. Ran a marketing agency. Not enough leverage for valuable profits — too much effort, not enough margin.” },
];

// - DEMO BLUEPRINT -
const DEMO = {
blueprintNumber:347, referralCode:“BOLT-KR347”, score:81, scoreLabel:“Almost Launch-Ready”,
positioning:“I help growth-obsessed founders stop burning money on channels and start building the system that makes every rupee compound.”,
ideas:[
{ title:“Growth Systems Diagnostic”, tagline:“Find out exactly why your digital spend isn’t compounding — in 72 hours.”, monthly:“₹1,80,000–₹3,00,000”, timeToFirst:“2 weeks”,
fit:“You’ve spent 17 years watching founders confuse channel problems with systems problems. That diagnosis is worth ₹29,999 as a structured deliverable.”,
hardTruths:[“10 audits at ₹29,999 = ₹3L but also 30–35 hours. You have 12–16. Raise prices to ₹45,000–₹50,000 or cap volume at 6 audits.”,“Cold paid traffic to a ₹30k service needs a trust bridge. A free scorecard as ad entry cuts CPL by 40–60%.”],
distributionPath:“Meta ads → Free ‘Growth System Scorecard’ → Results page offers paid diagnostic. CPL ₹600–900. At 20% conversion, ROAS hits 5x at ₹45,000.”,
failurePrevention:“Agency = selling time monthly forever. One deliverable, one payment, done. The leverage is pattern recognition — 17 years in 3 hours.”,
firstStep:“Write the 12-question intake form. That IS the product skeleton, trust signal, and ad qualifying mechanism.”,
firstClientScript:“Hey [Name] — quick thought. I keep seeing founders with solid ad budgets whose spend isn’t compounding. Not a channel problem — a systems problem. I’ve built a structured diagnostic for exactly this. 72-hour turnaround, full audit. Worth a look at your setup?” },
{ title:“Growth Systems Playbook”, tagline:“The framework that took 17 years to build. Yours for ₹7,999.”, monthly:“₹80,000–₹2,00,000”, timeToFirst:“3–4 weeks”,
fit:“Digital product is your #1 earn mode. Build once, sell forever. Zero ongoing obligation.”,
hardTruths:[“₹7,999 to a cold audience needs social proof before it scales. Seed with audit clients first.”,“₹3L/month standalone requires ~375 sales/month. Works best as a funnel supplement.”],
distributionPath:“Retarget Scorecard visitors who didn’t convert to audit. CPL ₹300–500, ROAS 16x+.”,
failurePrevention:“No clients. No retainer. No team. Pure IP leverage.”,
firstStep:“Write the 5-module table of contents. That’s your product scope, landing page, and ad brief.”,
firstClientScript:“Hey [Name] — I packaged my growth systems framework into a Notion playbook. Not a course — a working tool. ₹7,999. Thought of you specifically.” },
{ title:“Growth Systems Cohort”, tagline:“4 weeks. 15 founders. One system that fixes everything.”, monthly:“₹2,50,000–₹4,50,000”, timeToFirst:“5–6 weeks”,
fit:“One cohort of 15 at ₹25,000 = ₹3.75L. Hard end date. No retainer trap.”,
hardTruths:[“Cohort via cold paid ads rarely hits 5x ROAS without warm audience or webinar funnel.”,“Requires 12–15 hours per cohort. One cohort per 6 weeks max.”],
distributionPath:“LinkedIn ads → free 90-min webinar → cohort upsell. Webinar CPL ₹250–400, conversion 4–6%.”,
failurePrevention:“Hard end date = no scope creep. Teach once to many. Maximum leverage per hour.”,
firstStep:“Map the 4-session curriculum on one page.”,
firstClientScript:“Hey [Name] — running a 4-week cohort for founders who are done guessing at their growth stack. ₹25,000 per seat. I think you’d get outsized value.” },
],
week1:[“Day 1–2: Write the 12-question intake form and audit template”,“Day 3–4: Do one free audit for a warm contact. Record the Loom.”,“Day 5–7: Refine template. Write 5 targeted outreach messages.”],
week2:“Set Razorpay at ₹29,999. Send 5 outreach messages. Convert 1–2 to beta audits.”,
week3:“Raise to ₹45,000. Post once on LinkedIn — systems POV, no pitch. Begin Playbook ToC.”,
week4:“Build Tally intake form. Cap at 6 audits/month. Open cohort waitlist.”,
projectedMonth3:250000,
};

const SAMPLE_BLUEPRINTS = [
{ num:203, score:74, idea:“SaaS Onboarding Audit”,   field:“Product Management · 9 yrs”,        monthly:“₹1,20,000–₹2,00,000” },
{ num:289, score:88, idea:“Finance Systems Playbook”, field:“CA & Tax Strategy · 14 yrs”,        monthly:“₹80,000–₹1,80,000”   },
{ num:312, score:91, idea:“D2C Growth Sprint”,        field:“E-commerce Marketing · 11 yrs”,     monthly:“₹2,00,000–₹3,50,000” },
{ num:156, score:67, idea:“HR Tech Consulting”,       field:“People & Culture · 12 yrs”,         monthly:“₹90,000–₹1,50,000”   },
];

// - VIEWS -
const V = { LANDING:“landing”, MOBILE:“mobile”, OTP:“otp”, RETAKE_GATE:“retake_gate”, QUIZ:“quiz”, GATE:“gate”, WELCOME:“welcome”, DECISION:“decision”, COMMITMENT:“commitment”, ASSESSMENT:“assessment”, FIRSTSTEP:“firststep”, MARKET:“market”, ROADMAP:“roadmap”, SHARE:“share” };
const SCREEN_ORDER = [V.GATE,V.WELCOME,V.DECISION,V.COMMITMENT,V.ASSESSMENT,V.FIRSTSTEP,V.MARKET,V.ROADMAP,V.SHARE];

// - SHARED UI -
const Btn = ({ children, onClick, bg=`linear-gradient(135deg,${C.amber},#e8410a)`, color=C.bg, style={} }) => (
<button onClick={onClick} style={{ width:“100%”,background:bg,border:“none”,borderRadius:12,padding:“16px”,fontSize:15,fontWeight:700,color,cursor:“pointer”,fontFamily:F.sans,letterSpacing:0.2,transition:“all 0.2s”,display:“block”,…style }}>{children}</button>
);
const OutlineBtn = ({ children, onClick, style={} }) => (
<button onClick={onClick} style={{ width:“100%”,background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:12,padding:“14px”,fontSize:14,color:C.dim,cursor:“pointer”,fontFamily:F.sans,…style }}>{children}</button>
);
const Label = ({ children }) => <div style={{ fontSize:9,letterSpacing:3,color:C.amber,textTransform:“uppercase”,marginBottom:8,fontFamily:F.sans }}>{children}</div>;
const Divider = () => <div style={{ height:1,background:C.border,margin:“24px 0” }} />;
const SectionHeader = ({ children }) => <div style={{ fontSize:9,color:C.dim,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:16,fontFamily:F.sans,paddingBottom:10,borderBottom:`1px solid ${C.border}` }}>{children}</div>;
const fmt = n => n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const fmtRs = n => `₹${fmt(n)}`;
const pct = n => `${Math.round(n*100)}%`;

function ProgressBar({ value, max, color=C.amber, height=6 }) {
return (
<div style={{ height,background:C.border,borderRadius:99,overflow:“hidden” }}>
<div style={{ height:“100%”,width:`${Math.min(100,(value/max)*100)}%`,background:color,borderRadius:99,transition:“width 0.8s cubic-bezier(0.34,1.56,0.64,1)” }} />
</div>
);
}

function StatCard({ label, value, sub, color=C.amber }) {
return (
<div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“14px”,flex:“1 1 calc(50% - 5px)”,minWidth:0 }}>
<div style={{ fontSize:9,color:C.dim,letterSpacing:1.5,textTransform:“uppercase”,marginBottom:6,fontFamily:F.sans }}>{label}</div>
<div style={{ fontSize:20,fontWeight:800,color,fontFamily:F.sans,marginBottom:sub?3:0 }}>{value}</div>
{sub && <div style={{ fontSize:11,color:C.dim,fontFamily:F.sans }}>{sub}</div>}
</div>
);
}

function ScoreArc({ score, size=80 }) {
const r=size*0.36,cx=size/2,cy=size/2,circ=2*Math.PI*r;
const color=score>=70?C.green:score>=40?C.amber:C.red;
return (
<svg width={size} height={size} style={{ transform:“rotate(-90deg)”,flexShrink:0 }}>
<circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={size*0.07} />
<circle cx={cx} cy={cy} r={r} fill=“none” stroke={color} strokeWidth={size*0.07} strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)} strokeLinecap=“round” style={{ transition:“stroke-dashoffset 1s ease” }} />
<text x={cx} y={cy+1} textAnchor=“middle” dominantBaseline=“middle” fill={color} fontSize={size*0.22} fontWeight=“800” style={{ transform:`rotate(90deg)`,transformOrigin:`${cx}px ${cy}px`,fontFamily:F.sans }}>{score}</text>
</svg>
);
}

function Dots({ view }) {
const idx=SCREEN_ORDER.indexOf(view);
if(idx<0)return null;
return (
<div style={{ display:“flex”,gap:5,justifyContent:“center”,padding:“12px 0 6px” }}>
{SCREEN_ORDER.map((_,i)=><div key={i} style={{ width:i===idx?18:6,height:6,borderRadius:99,background:i===idx?C.amber:i<idx?`${C.amber}33`:C.border,transition:“all 0.3s” }} />)}
</div>
);
}

function RankQ({ options, onAnswer }) {
const [items,setItems]=useState(options);
const [dragging,setDragging]=useState(null);
const drop=i=>{if(dragging===null||dragging===i)return;const n=[…items];const[m]=n.splice(dragging,1);n.splice(i,0,m);setItems(n);setDragging(null);};
return (
<div>
<p style={{ fontSize:12,color:C.dim,marginBottom:12,fontFamily:F.sans }}>Drag to reorder — top two weighted most</p>
<div style={{ display:“flex”,flexDirection:“column”,gap:8,marginBottom:18 }}>
{items.map((item,i)=>(
<div key={item.id} draggable onDragStart={()=>setDragging(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>drop(i)}
style={{ display:“flex”,gap:12,alignItems:“center”,background:i<2?”#0c0b00”:C.surface,border:`1px solid ${i<2?C.amber+"33":C.border}`,borderRadius:10,padding:“12px 14px”,cursor:“grab” }}>
<span style={{ fontSize:11,fontWeight:800,color:i<2?C.amber:”#2a2a2a”,minWidth:16,fontFamily:F.sans }}>{i+1}</span>
<div><div style={{ fontSize:14,color:i<2?C.text:C.dim,fontFamily:F.sans }}>{item.label}</div><div style={{ fontSize:11,color:”#444”,fontFamily:F.sans }}>{item.desc}</div></div>
<span style={{ marginLeft:“auto”,color:”#2a2a2a” }}>⠿</span>
</div>
))}
</div>
<Btn onClick={()=>onAnswer(items.slice(0,2).map(x=>x.label).join(” + “))}>Confirm →</Btn>
</div>
);
}

function BubbleChart({ onNicheClick }) {
const niches=Object.values(NICHES_DATA);
const svgRef=useRef(null);
const [tip,setTip]=useState(null);
const [anim,setAnim]=useState(false);
useEffect(()=>{setTimeout(()=>setAnim(true),300);},[]);
return (
<div style={{ position:“relative” }}>
<svg ref={svgRef} viewBox=“0 0 100 100” style={{ width:“100%”,maxHeight:280,display:“block” }}>
<defs>{niches.map(n=>(<radialGradient key={n.id} id={`bg${n.id}`} cx=“35%” cy=“30%”><stop offset="0%" stopColor={n.color} stopOpacity="0.5"/><stop offset="100%" stopColor={n.color} stopOpacity="0.05"/></radialGradient>))}</defs>
{niches.map((n,i)=>{
const isU=n.id===“digital_marketing”,rS=(n.r/112)*12;
return (
<g key={n.id} opacity={anim?(isU?1:0.28):0} style={{ transition:`opacity 0.5s ease ${i*55}ms`,cursor:“pointer” }}
onClick={()=>onNicheClick&&onNicheClick(n)}
onMouseEnter={()=>{const r=svgRef.current?.getBoundingClientRect();if(r)setTip({n,x:(n.x/100)*r.width+r.left,y:(n.y/100)*r.height+r.top});}}
onMouseLeave={()=>setTip(null)}>
<circle cx={n.x} cy={n.y} r={rS} fill={`url(#bg${n.id})`} stroke={n.color} strokeWidth={isU?“0.7”:“0.2”} strokeOpacity={isU?1:0.4} />
{isU&&<circle cx={n.x} cy={n.y} r={rS+2} fill="none" stroke={n.color} strokeWidth="0.35" strokeDasharray="2 1.5" strokeOpacity="0.6"><animateTransform attributeName=“transform” type=“rotate” from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur=“8s” repeatCount=“indefinite”/></circle>}
{rS>5&&n.label.split(” “).map((l,li,arr)=><text key={li} x={n.x} y={n.y+(li-(arr.length-1)/2)*2.4} textAnchor=“middle” dominantBaseline=“middle” fill=”#fff” fontSize={isU?“2.2”:“1.8”} fontWeight={isU?“700”:“400”} opacity=“0.85” style={{pointerEvents:“none”}}>{l}</text>)}
{isU&&<text x={n.x} y={n.y+rS+3.2} textAnchor="middle" fill={n.color} fontSize="1.9" fontWeight="800">YOUR NICHE</text>}
</g>
);
})}
</svg>
{tip&&<div style={{ position:“fixed”,left:Math.min(tip.x+12,window.innerWidth-190),top:tip.y-50,zIndex:9999,background:”#0a0a0a”,border:`1px solid ${tip.n.color}55`,borderRadius:10,padding:“10px 14px”,pointerEvents:“none”,minWidth:170,fontFamily:F.sans }}>
<div style={{fontSize:12,fontWeight:700,color:tip.n.color,marginBottom:4}}>{tip.n.label}</div>
<div style={{fontSize:11,color:C.muted,marginBottom:2}}>👥 {fmt(tip.n.practitioners)} practitioners</div>
<div style={{fontSize:11,color:C.muted}}>💰 ₹{tip.n.marketCrore>=1000?`${(tip.n.marketCrore/1000).toFixed(0)}K`:tip.n.marketCrore} Cr · {tip.n.growthYoY}% growth</div>
<div style={{fontSize:10,color:tip.n.color,marginTop:4}}>Tap for full profile →</div>
</div>}
<div style={{ display:“flex”,gap:16,justifyContent:“center”,marginTop:10,flexWrap:“wrap” }}>
<div style={{fontSize:10,color:C.dimmer,display:“flex”,alignItems:“center”,gap:5,fontFamily:F.sans}}><div style={{width:8,height:8,borderRadius:“50%”,border:`1.5px solid ${C.amber}`}}/>Your niche</div>
<div style={{fontSize:10,color:C.dimmer,fontFamily:F.sans}}>Bubble = market revenue · Tap for details</div>
</div>
</div>
);
}

function ShareCard({ idea, mini=false }) {
const sz=mini?50:70;
return (
<div style={{ background:“linear-gradient(135deg,#0d0d0d,#111108)”,border:`1px solid ${C.amber}33`,borderRadius:mini?12:16,padding:mini?“14px”:“22px 18px” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,marginBottom:mini?10:16 }}>
<div><div style={{ fontSize:mini?9:10,letterSpacing:3,color:C.amber,textTransform:“uppercase”,fontFamily:F.sans }}>⚡ bolt</div><div style={{ fontSize:9,color:C.dimmer,letterSpacing:1,fontFamily:F.sans }}>Blueprint #{DEMO.blueprintNumber}</div></div>
<ScoreArc score={DEMO.score} size={sz} />
</div>
{!mini&&<p style={{ fontSize:13,color:”#ccc”,lineHeight:1.6,margin:“0 0 14px”,fontStyle:“italic”,fontFamily:F.serif }}>”{DEMO.positioning}”</p>}
<div style={{ background:”#0a0900”,border:`1px solid ${C.amber}22`,borderRadius:mini?8:10,padding:mini?“8px 10px”:“10px 12px” }}>
<div style={{ fontSize:9,color:C.amber,letterSpacing:1.5,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans }}>My Next Move</div>
<div style={{ fontSize:mini?12:13,fontWeight:600,color:C.text,fontFamily:F.sans }}>{idea.title}</div>
{!mini&&<div style={{ fontSize:11,color:C.dim,marginTop:2,fontFamily:F.sans }}>{idea.monthly}/month projected</div>}
</div>
{!mini&&<div style={{ fontSize:9,color:”#252525”,textAlign:“center”,marginTop:12,letterSpacing:1,fontFamily:F.sans }}>bolt.in · your next move, built</div>}
</div>
);
}

// - NICHE PROFILE SHEET -
function NicheSheet({ niche, onClose, isUserNiche }) {
if(!niche)return null;
return (
<div style={{ position:“fixed”,inset:0,background:”#000000cc”,zIndex:10001,display:“flex”,alignItems:“flex-end” }}>
<div style={{ width:“100%”,maxWidth:390,margin:“0 auto”,background:C.bg,borderRadius:“20px 20px 0 0”,padding:“24px 22px 48px”,maxHeight:“90vh”,overflowY:“auto” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,marginBottom:20 }}>
<div>
{isUserNiche&&<div style={{ fontSize:9,color:niche.color,letterSpacing:2,textTransform:“uppercase”,marginBottom:6,fontFamily:F.sans }}>⚡ Your Niche</div>}
<h3 style={{ fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,margin:0,fontStyle:“italic” }}>{niche.label}</h3>
</div>
<button onClick={onClose} style={{ background:“none”,border:`1px solid ${C.border2}`,borderRadius:8,padding:“6px 12px”,color:C.dim,cursor:“pointer”,fontFamily:F.sans,fontSize:12 }}>✕</button>
</div>
<div style={{ display:“flex”,gap:8,marginBottom:20 }}>
{[[`₹${niche.marketCrore>=1000?`${(niche.marketCrore/1000).toFixed(0)}K`:niche.marketCrore} Cr`,“Market”],
[fmt(niche.practitioners),“Practitioners”],
[`${niche.growthYoY}%`,“YoY Growth”]].map(([v,l])=>(
<div key={l} style={{ flex:1,background:C.surface,border:`1px solid ${niche.color}33`,borderRadius:10,padding:“12px 8px”,textAlign:“center” }}>
<div style={{ fontSize:15,fontWeight:800,color:niche.color,fontFamily:F.sans }}>{v}</div>
<div style={{ fontSize:10,color:C.dim,fontFamily:F.sans }}>{l}</div>
</div>
))}
</div>
<div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“16px”,marginBottom:14 }}>
<div style={{ fontSize:9,color:C.dim,letterSpacing:2,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans }}>Monthly Income Range</div>
{[[“Entry”,niche.avgMonthlyIncome.entry],[“Mid-Level”,niche.avgMonthlyIncome.mid],[“Senior”,niche.avgMonthlyIncome.senior]].map(([level,amt])=>(
<div key={level} style={{ display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:10 }}>
<span style={{ fontSize:13,color:C.muted,fontFamily:F.sans }}>{level}</span>
<div style={{ display:“flex”,alignItems:“center”,gap:10 }}>
<div style={{ width:70,height:4,background:C.border,borderRadius:99 }}>
<div style={{ height:“100%”,width:`${Math.min(100,(amt/500000)*100)}%`,background:niche.color,borderRadius:99 }} />
</div>
<span style={{ fontSize:12,color:C.text,fontWeight:700,fontFamily:F.sans,minWidth:64,textAlign:“right” }}>{fmtRs(amt)}/mo</span>
</div>
</div>
))}
</div>
<div style={{ display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:8,marginBottom:14 }}>
{[[“Entry Barrier”,niche.entryBarrier,niche.entryBarrier.includes(“Low”)?C.green:niche.entryBarrier===“High”?C.red:C.amber],
[“Time to First ₹”,niche.timeToFirstRupee,C.blue],
[“Saturation”,niche.saturation,niche.saturation===“Undercrowded”?C.green:niche.saturation===“Saturated”?C.red:C.amber],
[“Best Channel”,niche.bestChannel.split(”+”)[0].trim(),C.purple]].map(([label,val,color])=>(
<div key={label} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“12px” }}>
<div style={{ fontSize:9,color:C.dim,letterSpacing:1.5,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans }}>{label}</div>
<div style={{ fontSize:12,fontWeight:700,color,fontFamily:F.sans }}>{val}</div>
</div>
))}
</div>
<div style={{ marginBottom:14 }}>
<div style={{ fontSize:9,color:C.dim,letterSpacing:2,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans }}>Top Income Models</div>
<div style={{ display:“flex”,gap:8,flexWrap:“wrap” }}>
{niche.topModels.map(m=>(
<div key={m} style={{ background:C.surface,border:`1px solid ${niche.color}33`,borderRadius:99,padding:“6px 14px”,fontSize:12,color:niche.color,fontFamily:F.sans }}>{m}</div>
))}
</div>
</div>
<div style={{ background:`${niche.color}11`,border:`1px solid ${niche.color}33`,borderRadius:12,padding:“16px” }}>
<div style={{ fontSize:9,color:niche.color,letterSpacing:2,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans }}>India Insight</div>
<p style={{ fontFamily:F.serif,fontSize:14,color:C.text,lineHeight:1.7,margin:0,fontStyle:“italic” }}>{niche.indiaInsight}</p>
</div>
</div>
</div>
);
}

// - RADAR CHART -
function RadarChart({ scores, size=180 }) {
const cx=size/2,cy=size/2,r=size*0.35,n=SCORE_DIMS.length;
const pt=(i,val,maxR)=>{const a=(i*2*Math.PI/n)-Math.PI/2;const pR=maxR*(val/20);return{x:cx+pR*Math.cos(a),y:cy+pR*Math.sin(a)};};
const lp=i=>{const a=(i*2*Math.PI/n)-Math.PI/2;return{x:cx+(r+22)*Math.cos(a),y:cy+(r+22)*Math.sin(a)};};
const sPts=SCORE_DIMS.map((d,i)=>pt(i,scores[d.id]||0,r));
const pathD=sPts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(” “)+” Z”;
return (
<svg width={size} height={size} style={{ overflow:“visible” }}>
{[0.25,0.5,0.75,1].map(level=>{
const pts=SCORE_DIMS.map((_,i)=>pt(i,20*level,r));
const d=pts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(” “)+” Z”;
return <path key={level} d={d} fill="none" stroke={C.border} strokeWidth="0.5"/>;
})}
{SCORE_DIMS.map((_,i)=>{const o=pt(i,20,r);return<line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke={C.border} strokeWidth="0.5"/>;  })}
<path d={pathD} fill={`${C.amber}22`} stroke={C.amber} strokeWidth=“1.5”/>
{sPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3" fill={SCORE_DIMS[i].color}/>)}
{SCORE_DIMS.map((d,i)=>{
const p=lp(i);
return(
<text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={d.color} fontSize="8" fontWeight="700" fontFamily={F.sans}>
{d.label.split(” “).map((w,wi,arr)=><tspan key={wi} x={p.x} dy={wi===0?`${-(arr.length-1)*5}`:“10”}>{w}</tspan>)}
</text>
);
})}
</svg>
);
}

// - MOCK PER-USER DATA -
const MOCK_USERS = [
{ mobile:“98XXXXX001”, name:“Krutika R.”, joined:“2025-04-01”, lastActive:“2025-04-06”, retakes:1, segment:“champions”,  abCell:“C”, niche:“Digital Marketing”, chosenIdea:“Growth Systems Diagnostic”, blueprints:2, totalSpent:1648, promptBought:true,  bundleBought:true,  shared:true,  referrals:3, ltvScore:92, actions:[“gate_converted”,“idea_chosen”,“script_copied”,“prompt_pack_converted”,“full_bundle_converted”,“share_card_sent”,“referral_link_copied”] },
{ mobile:“91XXXXX002”, name:“Arjun M.”,  joined:“2025-04-02”, lastActive:“2025-04-05”, retakes:0, segment:“converts”,   abCell:“A”, niche:“Tech & Dev”,          chosenIdea:“SaaS Onboarding Sprint”,    blueprints:1, totalSpent:499,  promptBought:true,  bundleBought:false, shared:false, referrals:0, ltvScore:61, actions:[“gate_converted”,“idea_chosen”,“script_copied”,“prompt_pack_converted”] },
{ mobile:“87XXXXX003”, name:“Priya S.”,  joined:“2025-04-02”, lastActive:“2025-04-03”, retakes:0, segment:“browsers”,   abCell:“B”, niche:“Content Creation”,    chosenIdea:“Creator Monetisation Kit”,  blueprints:1, totalSpent:499,  promptBought:false, bundleBought:false, shared:false, referrals:0, ltvScore:34, actions:[“gate_converted”,“idea_chosen”] },
{ mobile:“76XXXXX004”, name:“Deepak T.”, joined:“2025-03-24”, lastActive:“2025-03-25”, retakes:0, segment:“at_risk”,    abCell:“D”, niche:“Finance & Tax”,        chosenIdea:“CFO-as-a-Service”,          blueprints:1, totalSpent:799,  promptBought:false, bundleBought:false, shared:false, referrals:0, ltvScore:22, actions:[“gate_converted”] },
{ mobile:“93XXXXX005”, name:“Sneha K.”,  joined:“2025-04-03”, lastActive:“2025-04-06”, retakes:2, segment:“champions”,  abCell:“C”, niche:“Online Teaching”,      chosenIdea:“Live Cohort Framework”,     blueprints:3, totalSpent:1897, promptBought:true,  bundleBought:true,  shared:true,  referrals:1, ltvScore:88, actions:[“gate_converted”,“idea_chosen”,“script_copied”,“prompt_pack_converted”,“full_bundle_converted”,“share_card_sent”] },
{ mobile:“82XXXXX006”, name:“Rahul D.”,  joined:“2025-04-04”, lastActive:“2025-04-04”, retakes:0, segment:“browsers”,   abCell:“A”, niche:“Digital Marketing”,    chosenIdea:“Performance Audit”,         blueprints:1, totalSpent:499,  promptBought:false, bundleBought:false, shared:false, referrals:0, ltvScore:29, actions:[“gate_converted”] },
{ mobile:“99XXXXX007”, name:“Meera P.”,  joined:“2025-04-01”, lastActive:“2025-04-05”, retakes:1, segment:“converts”,   abCell:“B”, niche:“Coaching”,             chosenIdea:“Career Coaching Sprint”,    blueprints:2, totalSpent:748,  promptBought:true,  bundleBought:false, shared:true,  referrals:0, ltvScore:55, actions:[“gate_converted”,“idea_chosen”,“script_copied”,“prompt_pack_converted”,“share_card_sent”] },
{ mobile:“77XXXXX008”, name:“Vikram N.”, joined:“2025-03-28”, lastActive:“2025-03-29”, retakes:0, segment:“at_risk”,    abCell:“A”, niche:“E-commerce”,           chosenIdea:“D2C Growth Playbook”,       blueprints:1, totalSpent:499,  promptBought:false, bundleBought:false, shared:false, referrals:0, ltvScore:18, actions:[“gate_converted”,“idea_chosen”] },
];

const SEGMENT_COLOR = { champions:C.green, converts:C.blue, browsers:C.amber, at_risk:C.red };

// - PER-USER ANALYTICS TAB -
function UserAnalyticsTab({ currentMobile }) {
const [search, setSearch] = useState(””);
const [sortBy, setSortBy] = useState(“ltvScore”);
const [sortDir, setSortDir] = useState(“desc”);
const [selectedUser, setSelectedUser] = useState(null);
const [filterSegment, setFilterSegment] = useState(“all”);

// Merge real localStorage user with mock users if mobile matches
const allUsers = […MOCK_USERS];
if (currentMobile && !allUsers.find(u => u.mobile === currentMobile)) {
const realUser = UserState.get(currentMobile);
if (realUser) {
allUsers.unshift({
mobile: currentMobile,
name: “You (current session)”,
joined: realUser.blueprints?.[0]?.saved_at?.slice(0,10) || new Date().toISOString().slice(0,10),
lastActive: new Date().toISOString().slice(0,10),
retakes: realUser.retake_count || 0,
segment: “converts”,
abCell: localStorage.getItem(“bolt_ab_cell”) || “A”,
niche: “Digital Marketing”,
chosenIdea: realUser.blueprints?.slice(-1)[0]?.chosen_idea || “Not chosen”,
blueprints: realUser.blueprints?.length || 0,
totalSpent: (realUser.retake_count || 0) * 499 + 499,
promptBought: Analytics.events.some(e => e.event_type === “prompt_pack_converted”),
bundleBought: Analytics.events.some(e => e.event_type === “full_bundle_converted”),
shared: Analytics.events.some(e => e.event_type === “share_card_sent”),
referrals: 0,
ltvScore: 45,
actions: Analytics.events.map(e => e.event_type),
});
}
}

const filtered = allUsers
.filter(u => filterSegment === “all” || u.segment === filterSegment)
.filter(u => search === “” || u.mobile.includes(search) || u.name.toLowerCase().includes(search.toLowerCase()) || u.niche.toLowerCase().includes(search.toLowerCase()) || u.chosenIdea.toLowerCase().includes(search.toLowerCase()))
.sort((a, b) => {
const v = sortDir === “desc” ? -1 : 1;
if (sortBy === “ltvScore”) return v * (a.ltvScore - b.ltvScore);
if (sortBy === “totalSpent”) return v * (a.totalSpent - b.totalSpent);
if (sortBy === “lastActive”) return v * (new Date(a.lastActive) - new Date(b.lastActive));
if (sortBy === “referrals”) return v * (a.referrals - b.referrals);
return 0;
});

const toggleSort = (col) => { if (sortBy === col) setSortDir(d => d === “desc” ? “asc” : “desc”); else { setSortBy(col); setSortDir(“desc”); } };

const SortBtn = ({ col, children }) => (
<button onClick={() => toggleSort(col)} style={{ background: “none”, border: “none”, color: sortBy === col ? C.amber : C.dim, cursor: “pointer”, fontFamily: F.sans, fontSize: 10, letterSpacing: 1, textTransform: “uppercase”, padding: 0, display: “flex”, alignItems: “center”, gap: 3 }}>
{children} {sortBy === col ? (sortDir === “desc” ? “↓” : “↑”) : “↕”}
</button>
);

if (selectedUser) return <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />;

return (
<div>
{/* Summary row */}
<div style={{ display:“flex”,gap:8,flexWrap:“wrap”,marginBottom:20 }}>
{[
[“Total Users”, allUsers.length, C.amber],
[“Champions”, allUsers.filter(u=>u.segment===“champions”).length, C.green],
[“At Risk”, allUsers.filter(u=>u.segment===“at_risk”).length, C.red],
[“Avg LTV”, `₹${Math.round(allUsers.reduce((s,u)=>s+u.totalSpent,0)/allUsers.length)}`, C.blue],
].map(([label, value, color]) => (
<div key={label} style={{ flex:“1 1 calc(50% - 4px)”,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“12px 14px” }}>
<div style={{ fontSize:9,color:C.dim,letterSpacing:1.5,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans }}>{label}</div>
<div style={{ fontSize:20,fontWeight:800,color,fontFamily:F.sans }}>{value}</div>
</div>
))}
</div>

```
  {/* Search + filter */}
  <div style={{ marginBottom:14 }}>
    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by mobile, name, niche, or idea…"
      style={{ width:"100%",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:13,fontFamily:F.sans,outline:"none",marginBottom:10 }} />
    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
      {["all","champions","converts","browsers","at_risk"].map(seg => (
        <button key={seg} onClick={() => setFilterSegment(seg)}
          style={{ background:filterSegment===seg?(SEGMENT_COLOR[seg]||C.amber)+"22":"transparent", border:`1px solid ${filterSegment===seg?(SEGMENT_COLOR[seg]||C.amber)+"55":C.border}`, borderRadius:99,padding:"5px 12px",fontSize:11,color:filterSegment===seg?(SEGMENT_COLOR[seg]||C.amber):C.dim,cursor:"pointer",fontFamily:F.sans,textTransform:"capitalize" }}>
          {seg === "all" ? "All" : seg.replace("_"," ")}
        </button>
      ))}
    </div>
  </div>

  {/* Sort controls */}
  <div style={{ display:"flex",gap:16,marginBottom:12,padding:"0 4px" }}>
    <SortBtn col="ltvScore">LTV Score</SortBtn>
    <SortBtn col="totalSpent">Spent</SortBtn>
    <SortBtn col="lastActive">Last Active</SortBtn>
    <SortBtn col="referrals">Referrals</SortBtn>
  </div>

  {/* User list */}
  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
    {filtered.length === 0 && <div style={{ textAlign:"center",color:C.dim,fontSize:13,padding:"32px 0",fontFamily:F.sans }}>No users match this filter.</div>}
    {filtered.map(user => (
      <div key={user.mobile} onClick={() => setSelectedUser(user)}
        style={{ background:C.surface,border:`1px solid ${SEGMENT_COLOR[user.segment]}22`,borderRadius:12,padding:"14px",cursor:"pointer",transition:"border-color 0.2s" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:SEGMENT_COLOR[user.segment],flexShrink:0 }}/>
              <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{user.name}</div>
              {user.mobile === currentMobile && <span style={{ fontSize:9,color:C.amber,border:`1px solid ${C.amber}44`,borderRadius:99,padding:"1px 6px",fontFamily:F.sans }}>YOU</span>}
            </div>
            <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim,marginLeft:14 }}>{user.mobile} · {user.niche}</div>
          </div>
          <div style={{ textAlign:"right",flexShrink:0 }}>
            <div style={{ fontFamily:F.sans,fontSize:14,fontWeight:800,color:SEGMENT_COLOR[user.segment] }}>₹{user.totalSpent.toLocaleString("en-IN")}</div>
            <div style={{ fontFamily:F.sans,fontSize:10,color:C.dim }}>LTV score: {user.ltvScore}</div>
          </div>
        </div>

        {/* Mini behaviour bar */}
        <div style={{ display:"flex",gap:5,marginBottom:10 }}>
          {[["Gate",true],["Idea",user.actions.includes("idea_chosen")],["Script",user.actions.includes("script_copied")],["Pack",user.promptBought],["Bundle",user.bundleBought],["Shared",user.shared]].map(([label,done])=>(
            <div key={label} style={{ flex:1,background:done?`${C.green}22`:C.border,border:`1px solid ${done?C.green+"44":C.border}`,borderRadius:4,padding:"3px 0",textAlign:"center" }}>
              <div style={{ fontSize:8,color:done?C.green:C.dimmer,fontFamily:F.sans }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>{user.chosenIdea}</div>
          <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>Last active {user.lastActive} →</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

);
}

// - USER DETAIL VIEW -
function UserDetail({ user, onBack }) {
const segColor = SEGMENT_COLOR[user.segment] || C.amber;

const timeline = [
{ event:“Joined Bolt”,           done:true,                             time:user.joined,       color:C.blue   },
{ event:“Completed quiz”,         done:true,                             time:user.joined,       color:C.blue   },
{ event:“Unlocked blueprint”,     done:true,                             time:user.joined,       color:C.green  },
{ event:“Chose idea”,             done:user.actions.includes(“idea_chosen”),       time:user.joined, color:C.green  },
{ event:“Copied client script”,   done:user.actions.includes(“script_copied”),     time:user.joined, color:C.amber  },
{ event:“Bought Prompt Pack”,     done:user.promptBought,                time:user.lastActive,   color:C.amber  },
{ event:“Bought Full Bundle”,     done:user.bundleBought,                time:user.lastActive,   color:C.purple },
{ event:“Sent share card”,        done:user.shared,                      time:user.lastActive,   color:C.wa     },
{ event:“Referred a buyer”,       done:user.referrals > 0,               time:user.lastActive,   color:C.wa     },
];

const completedSteps = timeline.filter(t => t.done).length;
const nextBestAction =
!user.actions.includes(“idea_chosen”)   ? { action:“Send idea reminder”, msg:`Your blueprint for ${user.niche} is ready. You haven't chosen your idea yet — it takes 30 seconds.`, urgency:“High” } :
!user.actions.includes(“script_copied”) ? { action:“Send first step nudge”, msg:`Your Growth Systems Diagnostic plan is waiting. Here's the first client script — copy it and send it today.`, urgency:“High” } :
!user.promptBought  ? { action:“Prompt Pack impulse offer”, msg:`You've got your plan. Here are 6 prompts to execute it in 10 mins — ₹${AB_CELLS[user.abCell]?.promptPrice || 149}.`, urgency:“Medium” } :
!user.bundleBought  ? { action:“Full Bundle upgrade”, msg:`Ready to stress-test your ${user.chosenIdea} plan? The Pressure Test tells you exactly what could go wrong — and how to fix it.`, urgency:“Medium” } :
!user.shared        ? { action:“Share card nudge”, msg:`You're Blueprint #${Math.floor(Math.random()*100)+250}. Screenshot your card and share it — you earn ₹150 for every person who buys.`, urgency:“Low” } :
user.referrals === 0 ? { action:“Referral activation”, msg:`3 people you know are probably asking the same question you had. Send them your link — you earn ₹150 per sale.`, urgency:“Low” } :
{ action:“Retake nudge (3 months on)”, msg:`It's been 3 months since your blueprint. A lot can change. Rebuild it and see what's shifted — free retake included.`, urgency:“Low” };

const ltvColor = user.ltvScore >= 70 ? C.green : user.ltvScore >= 40 ? C.amber : C.red;

return (
<div>
{/* Back button */}
<button onClick={onBack} style={{ background:“none”,border:`1px solid ${C.border2}`,borderRadius:8,padding:“7px 14px”,color:C.dim,cursor:“pointer”,fontFamily:F.sans,fontSize:12,marginBottom:20 }}>← All Users</button>

```
  {/* User header */}
  <div style={{ background:C.surface,border:`1px solid ${segColor}44`,borderRadius:14,padding:"18px",marginBottom:16 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
      <div>
        <div style={{ fontFamily:F.sans,fontSize:16,fontWeight:800,color:C.text,marginBottom:4 }}>{user.name}</div>
        <div style={{ fontFamily:F.sans,fontSize:12,color:C.dim,marginBottom:6 }}>{user.mobile}</div>
        <div style={{ display:"flex",gap:6 }}>
          <span style={{ fontSize:10,fontWeight:700,color:segColor,background:`${segColor}22`,borderRadius:99,padding:"3px 10px",fontFamily:F.sans,textTransform:"capitalize" }}>{user.segment.replace("_"," ")}</span>
          <span style={{ fontSize:10,color:C.dim,background:C.surface2,borderRadius:99,padding:"3px 10px",fontFamily:F.sans }}>Cell {user.abCell}</span>
          <span style={{ fontSize:10,color:C.blue,background:`${C.blue}22`,borderRadius:99,padding:"3px 10px",fontFamily:F.sans }}>{user.niche}</span>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontFamily:F.sans,fontSize:28,fontWeight:800,color:ltvColor,lineHeight:1 }}>{user.ltvScore}</div>
        <div style={{ fontFamily:F.sans,fontSize:9,color:ltvColor,letterSpacing:1,textTransform:"uppercase" }}>LTV Score</div>
      </div>
    </div>
    <div style={{ display:"flex",gap:10 }}>
      {[["Total Spent",`₹${user.totalSpent.toLocaleString("en-IN")}`,C.green],["Blueprints",user.blueprints,C.blue],["Retakes",user.retakes,C.amber],["Referrals",user.referrals,C.wa]].map(([l,v,c])=>(
        <div key={l} style={{ flex:1,textAlign:"center",background:C.surface2,borderRadius:8,padding:"8px 4px" }}>
          <div style={{ fontFamily:F.sans,fontSize:15,fontWeight:800,color:c }}>{v}</div>
          <div style={{ fontFamily:F.sans,fontSize:9,color:C.dim }}>{l}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Journey progress */}
  <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",marginBottom:16 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
      <SectionHeader>Journey — {completedSteps}/{timeline.length} steps</SectionHeader>
    </div>
    <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
      {timeline.map((step, i) => (
        <div key={i} style={{ display:"flex",gap:12,alignItems:"flex-start",marginBottom:i < timeline.length-1 ? 0 : 0 }}>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
            <div style={{ width:16,height:16,borderRadius:"50%",background:step.done?step.color:C.border,border:step.done?"none":`1px solid ${C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2 }}>
              {step.done && <span style={{ fontSize:8,color:C.bg,fontWeight:800 }}>✓</span>}
            </div>
            {i < timeline.length-1 && <div style={{ width:1,height:16,background:step.done?`${step.color}44`:C.border }}/>}
          </div>
          <div style={{ paddingBottom:12,flex:1 }}>
            <div style={{ fontFamily:F.sans,fontSize:13,color:step.done?C.text:C.dim }}>{step.event}</div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Chosen idea */}
  <div style={{ background:"#0a0900",border:`1px solid ${C.amber}22`,borderRadius:12,padding:"14px",marginBottom:16 }}>
    <div style={{ fontSize:9,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontFamily:F.sans }}>Chosen Idea</div>
    <div style={{ fontFamily:F.sans,fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>{user.chosenIdea}</div>
    <div style={{ fontFamily:F.sans,fontSize:12,color:C.dim }}>{user.niche} · Joined {user.joined} · Last active {user.lastActive}</div>
  </div>

  {/* Next best action */}
  <div style={{ background:`${segColor}0a`,border:`1px solid ${segColor}44`,borderRadius:12,padding:"16px",marginBottom:16 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
      <div style={{ fontSize:9,color:segColor,letterSpacing:2,textTransform:"uppercase",fontFamily:F.sans }}>Next Best Action</div>
      <div style={{ fontSize:9,fontWeight:700,color:nextBestAction.urgency==="High"?C.red:nextBestAction.urgency==="Medium"?C.amber:C.green,background:`${nextBestAction.urgency==="High"?C.red:nextBestAction.urgency==="Medium"?C.amber:C.green}22`,borderRadius:99,padding:"2px 8px",fontFamily:F.sans }}>
        {nextBestAction.urgency}
      </div>
    </div>
    <div style={{ fontFamily:F.sans,fontSize:13,color:C.text,marginBottom:10 }}>{nextBestAction.action}</div>
    <div style={{ background:C.surface2,borderRadius:8,padding:"10px 12px" }}>
      <div style={{ fontSize:9,color:C.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:6,fontFamily:F.sans }}>WhatsApp message to send</div>
      <div style={{ fontFamily:F.sans,fontSize:12,color:C.muted,lineHeight:1.6,fontStyle:"italic" }}>"{nextBestAction.msg}"</div>
    </div>
  </div>

  {/* Conversion funnel for this user */}
  <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px" }}>
    <SectionHeader>Conversion Funnel</SectionHeader>
    <div style={{ display:"flex",gap:4 }}>
      {[["Gate",true,C.blue],["Idea",user.actions.includes("idea_chosen"),C.green],["Script",user.actions.includes("script_copied"),C.amber],["Pack",user.promptBought,C.amber],["Bundle",user.bundleBought,C.purple],["Shared",user.shared,C.wa],["Referred",user.referrals>0,C.wa]].map(([label,done,color],i,arr)=>(
        <div key={label} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
          <div style={{ width:"100%",height:28,background:done?`${color}33`:C.border,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontSize:done?14:10,color:done?color:C.dimmer }}>{done?"✓":"·"}</span>
          </div>
          <div style={{ fontSize:8,color:done?color:C.dimmer,fontFamily:F.sans,textAlign:"center" }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
</div>
```

);
}
const summary=Analytics.getSummary();
const events=Analytics.getEvents ? Analytics.getEvents() : Analytics.events;
const abCell=localStorage.getItem(“bolt_ab_cell”)||“A”;
const abConfig=AB_CELLS[abCell];
const userBlueprints=mobile?UserState.getBlueprints(mobile):[];
const userNicheData=NICHES_DATA[“digital_marketing”];
const userScores=userNicheData.scoreBreakdown;
const totalScore=Object.values(userScores).reduce((a,b)=>a+b,0);
const viralCoeff=MOCK.flywheel.engagedToAdvocate.rate*MOCK.flywheel.advocateToReferral.rate*MOCK.flywheel.referralToBuyer.rate;
const weakestLink=Object.entries(MOCK.flywheel).sort((a,b)=>(a[1].rate/a[1].target)-(b[1].rate/b[1].target))[0];

const TABS=[{id:“overview”,label:“Overview”},{id:“score”,label:“Readiness”},{id:“niches”,label:“Niches”},{id:“segments”,label:“Segments”},{id:“users”,label:“Users”},{id:“flywheel”,label:“Flywheel”}];

return (
<div style={{ position:“fixed”,inset:0,background:”#000000ee”,zIndex:10000,overflowY:“auto”,fontFamily:F.sans }}>
<div style={{ maxWidth:480,margin:“0 auto”,background:C.bg,minHeight:“100vh”,display:“flex”,flexDirection:“column” }}>
{/* Header */}
<div style={{ padding:“20px 20px 0”,borderBottom:`1px solid ${C.border}`,position:“sticky”,top:0,background:C.bg,zIndex:10 }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:16 }}>
<div>
<div style={{ fontSize:16,fontWeight:800,color:C.amber }}>⚡ Bolt Analytics</div>
<div style={{ fontSize:10,color:C.dimmer,letterSpacing:1.5 }}>ADMIN DASHBOARD</div>
</div>
<button onClick={onClose} style={{ background:“none”,border:`1px solid ${C.border2}`,borderRadius:8,padding:“6px 14px”,color:C.dim,cursor:“pointer”,fontFamily:F.sans,fontSize:13 }}>✕ Close</button>
</div>
<div style={{ display:“flex”,gap:0,overflowX:“auto”,borderBottom:“none” }}>
{TABS.map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)} style={{ background:“none”,border:“none”,borderBottom:tab===t.id?`2px solid ${C.amber}`:“2px solid transparent”,padding:“8px 12px”,color:tab===t.id?C.amber:C.dim,fontSize:12,cursor:“pointer”,fontFamily:F.sans,fontWeight:tab===t.id?700:400,whiteSpace:“nowrap” }}>
{t.label}
</button>
))}
</div>
</div>

```
    <div style={{ flex:1,overflowY:"auto",padding:"20px" }}>

      {/* - OVERVIEW - */}
      {tab==="overview"&&(
        <div>
          <SectionHeader>Product Health</SectionHeader>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:24 }}>
            <StatCard label="Total Blueprints" value="347" color={C.amber}/>
            <StatCard label="Avg LTV" value="₹828" color={C.green}/>
            <StatCard label="Total Revenue" value={fmtRs(MOCK.totalRevenue)} color={C.blue}/>
            <StatCard label="Viral Coefficient" value={viralCoeff.toFixed(3)} sub="target: 0.30+" color={C.red}/>
          </div>

          <SectionHeader>This Session</SectionHeader>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:24 }}>
            <StatCard label="Events" value={summary.total_events} color={C.amber}/>
            <StatCard label="Screens Seen" value={summary.screens_viewed.length} color={C.blue}/>
            <StatCard label="Chosen Idea" value={summary.chosen_idea||"None"} color={C.purple}/>
            <StatCard label="A/B Cell" value={`${abCell} · ₹${abConfig.gatePrice}`} color={C.teal}/>
          </div>

          <SectionHeader>Session Funnel</SectionHeader>
          <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:24 }}>
            {[
              ["Landing viewed",    events.some(e=>e.event_type==="screen_viewed"&&e.event_data.screen==="landing")],
              ["Quiz started",      events.some(e=>e.event_type==="quiz_started")],
              ["Quiz completed",    events.some(e=>e.event_type==="quiz_completed")],
              ["Gate viewed",       events.some(e=>e.event_type==="screen_viewed"&&e.event_data.screen==="gate")],
              ["Blueprint unlocked",events.some(e=>e.event_type==="gate_converted")],
              ["Idea chosen",       !!summary.chosen_idea],
              ["Script copied",     summary.script_copied],
              ["Share card sent",   summary.share_card_sent],
            ].map(([step,done])=>(
              <div key={step} style={{ display:"flex",gap:12,alignItems:"center",background:C.surface,border:`1px solid ${done?C.green+"33":C.border}`,borderRadius:8,padding:"10px 14px" }}>
                <div style={{ width:16,height:16,borderRadius:"50%",background:done?C.green:C.border,border:done?"none":`1px solid ${C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {done&&<span style={{ fontSize:9,color:C.bg }}>✓</span>}
                </div>
                <span style={{ fontSize:12,color:done?C.text:C.dim }}>{step}</span>
              </div>
            ))}
          </div>

          <SectionHeader>A/B Test Live Results</SectionHeader>
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:24 }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",borderBottom:`1px solid ${C.border}` }}>
              {["Cell","Conv%","LTV","PP%","Bundle%"].map(h=>(
                <div key={h} style={{ padding:"10px 6px",fontSize:9,color:C.dim,letterSpacing:1,textTransform:"uppercase",textAlign:"center" }}>{h}</div>
              ))}
            </div>
            {Object.entries(MOCK.abTests).map(([cell,d])=>{
              const isWinner=Object.values(MOCK.abTests).every(dd=>dd.avgLTV<=d.avgLTV);
              return(
                <div key={cell} style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",borderBottom:`1px solid ${C.border}`,background:cell===abCell?"#0c0b00":isWinner?"#060f06":"transparent" }}>
                  <div style={{ padding:"10px 6px",fontSize:12,fontWeight:800,color:isWinner?C.green:cell===abCell?C.amber:C.dim,textAlign:"center" }}>{cell}{isWinner?" ★":""}</div>
                  <div style={{ padding:"10px 6px",fontSize:12,color:C.text,textAlign:"center" }}>{pct(d.convRate)}</div>
                  <div style={{ padding:"10px 6px",fontSize:12,color:isWinner?C.green:C.text,fontWeight:isWinner?700:400,textAlign:"center" }}>₹{d.avgLTV}</div>
                  <div style={{ padding:"10px 6px",fontSize:12,color:C.text,textAlign:"center" }}>{pct(d.promptAttach)}</div>
                  <div style={{ padding:"10px 6px",fontSize:12,color:C.text,textAlign:"center" }}>{pct(d.bundleAttach)}</div>
                </div>
              );
            })}
          </div>

          <SectionHeader>Deep Dive Unlock Thresholds</SectionHeader>
          {[
            { label:"Blueprint engagement rate", current:0.28, target:0.35, color:C.amber, isCount:false },
            { label:"Prompt Pack attach rate",   current:0.34, target:0.35, color:C.blue,  isCount:false },
            { label:"WhatsApp share rate",       current:0.12, target:0.20, color:C.green, isCount:false },
            { label:"Monthly buyers",            current:347,  target:300,  color:C.purple, isCount:true },
          ].map(({label,current,target,color,isCount})=>{
            const met=isCount?current>=target:current>=target;
            return(
              <div key={label} style={{ background:met?"#060f06":C.surface,border:`1px solid ${met?C.green+"44":C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontSize:12,color:C.text }}>{label}</span>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <span style={{ fontSize:12,color:met?C.green:C.dim }}>{isCount?current:pct(current)}</span>
                    <span style={{ fontSize:10,color:C.dim }}>/ {isCount?target:pct(target)}</span>
                    {met&&<span style={{ fontSize:12,color:C.green }}>✓</span>}
                  </div>
                </div>
                <ProgressBar value={isCount?current:current*100} max={isCount?target:target*100} color={met?C.green:color}/>
              </div>
            );
          })}
          <div style={{ background:"#060f06",border:`1px solid ${C.green}33`,borderRadius:12,padding:"14px",marginTop:12 }}>
            <div style={{ fontSize:12,color:C.green,fontWeight:700,marginBottom:6 }}>3 / 4 thresholds met</div>
            <div style={{ fontSize:12,color:C.dim,lineHeight:1.6 }}>WhatsApp share rate (12% vs 20% target) is the only blocker. Improving share card UX unlocks the Deep Dive tier.</div>
          </div>
        </div>
      )}

      {/* - READINESS SCORE - */}
      {tab==="score"&&(
        <div>
          <SectionHeader>Readiness Score Breakdown</SectionHeader>
          <div style={{ textAlign:"center",padding:"20px 0 28px" }}>
            <div style={{ position:"relative",display:"inline-block" }}>
              <RadarChart scores={userScores} size={200}/>
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center" }}>
                <div style={{ fontSize:30,fontWeight:800,color:totalScore>=75?C.green:C.amber,fontFamily:F.sans,lineHeight:1 }}>{totalScore}</div>
                <div style={{ fontSize:8,color:totalScore>=75?C.green:C.amber,letterSpacing:1.5,textTransform:"uppercase",fontFamily:F.sans }}>{totalScore>=75?"Launch-Ready":totalScore>=50?"Almost There":"Getting Closer"}</div>
              </div>
            </div>
          </div>

          <SectionHeader>Score Dimensions — Tap to expand</SectionHeader>
          {SCORE_DIMS.map(dim=>{
            const score=userScores[dim.id]||0;
            const isExp=expandedDim===dim.id;
            const isHigh=score>=15;
            const desc=DIM_DESCS[dim.id];
            return(
              <div key={dim.id} onClick={()=>setExpandedDim(isExp?null:dim.id)}
                style={{ background:isExp?`${dim.color}0a`:C.surface,border:`1px solid ${isExp?dim.color+"55":C.border}`,borderRadius:12,padding:"14px",marginBottom:8,cursor:"pointer" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:600,color:C.text }}>{dim.label}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:14,fontWeight:800,color:dim.color,fontFamily:F.sans }}>{score}<span style={{ fontSize:11,color:C.dim }}>/20</span></span>
                    <span style={{ fontSize:12,color:C.dim }}>{isExp?"↑":"↓"}</span>
                  </div>
                </div>
                <ProgressBar value={score} max={20} color={dim.color}/>
                {isExp&&(
                  <div style={{ marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}` }}>
                    <p style={{ fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:"0 0 12px" }}>{isHigh?desc.high:desc.low}</p>
                    {!isHigh&&(
                      <div style={{ background:`${dim.color}11`,border:`1px solid ${dim.color}33`,borderRadius:8,padding:"10px 12px" }}>
                        <div style={{ fontSize:9,color:dim.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6,fontFamily:F.sans }}>To improve this score</div>
                        <div style={{ fontSize:12,color:C.text,fontFamily:F.sans,lineHeight:1.6 }}>{desc.fix}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <SectionHeader>How You Compare — All Blueprints</SectionHeader>
          {MOCK.scoreDist.map(({range,count,label})=>(
            <div key={range} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
              <div style={{ minWidth:52,fontSize:11,color:C.muted,fontFamily:F.sans }}>{range}</div>
              <div style={{ flex:1 }}><ProgressBar value={count} max={142} color={range==="90–100"?C.green:range==="75–89"?C.blue:range==="60–74"?C.amber:C.red}/></div>
              <div style={{ fontSize:11,color:C.dim,minWidth:28,fontFamily:F.sans }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* - NICHES - */}
      {tab==="niches"&&(
        <div>
          <SectionHeader>Blueprint Distribution by Niche</SectionHeader>
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:24 }}>
            {MOCK.nicheDistrib.map(({niche,pct:p,buyers})=>{
              const nd=Object.values(NICHES_DATA).find(n=>n.label===niche);
              const color=nd?.color||C.amber;
              return(
                <div key={niche} onClick={()=>setSelectedNiche(nd||null)} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",display:"flex",gap:12,alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                      <span style={{ fontFamily:F.sans,fontSize:13,color:C.text }}>{niche}</span>
                      <span style={{ fontFamily:F.sans,fontSize:12,color,fontWeight:700 }}>{buyers} · {p}%</span>
                    </div>
                    <ProgressBar value={p} max={34} color={color}/>
                  </div>
                  <span style={{ color:C.dim,fontSize:12 }}>→</span>
                </div>
              );
            })}
          </div>

          <SectionHeader>Niche Intelligence — Tap for full profile</SectionHeader>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {Object.values(NICHES_DATA).map(n=>(
              <div key={n.id} onClick={()=>setSelectedNiche(n)} style={{ background:C.surface,border:`1px solid ${n.color}33`,borderRadius:12,padding:"14px",cursor:"pointer" }}>
                <div style={{ fontSize:11,fontWeight:700,color:n.color,marginBottom:8,fontFamily:F.sans }}>{n.label}</div>
                <div style={{ fontSize:10,color:C.dim,marginBottom:6,fontFamily:F.sans }}>₹{n.marketCrore>=1000?`${(n.marketCrore/1000).toFixed(0)}K`:n.marketCrore} Cr · {n.growthYoY}% YoY</div>
                <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                  <span style={{ fontSize:9,background:n.entryBarrier.includes("Low")?`${C.green}22`:`${C.amber}22`,color:n.entryBarrier.includes("Low")?C.green:C.amber,borderRadius:4,padding:"2px 6px",fontFamily:F.sans }}>{n.entryBarrier} entry</span>
                  <span style={{ fontSize:9,background:`${C.blue}22`,color:C.blue,borderRadius:4,padding:"2px 6px",fontFamily:F.sans }}>{n.saturation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* - USER SEGMENTS - */}
      {tab==="segments"&&(
        <div>
          <SectionHeader>Revenue Overview</SectionHeader>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:24 }}>
            <StatCard label="Total Users" value="347" color={C.amber}/>
            <StatCard label="Avg LTV" value="₹828" color={C.green}/>
            <StatCard label="At Risk Revenue" value={fmtRs(MOCK.segments.at_risk.count*499)} color={C.red}/>
            <StatCard label="Nudge Opportunity" value={fmtRs(MOCK.segments.converts.count*249+MOCK.segments.browsers.count*150)} sub="potential uplift" color={C.blue}/>
          </div>

          <SectionHeader>User Segments — Tap to expand</SectionHeader>
          {Object.entries(MOCK.segments).map(([key,s])=>{
            const isExp=expandedSeg===key;
            const oppLTV={champions:2400,converts:948,browsers:649,at_risk:499};
            const opp=(oppLTV[key]-s.avgLTV)*s.count;
            return(
              <div key={key} onClick={()=>setExpandedSeg(isExp?null:key)}
                style={{ background:isExp?`${s.color}0a`:C.surface,border:`1px solid ${isExp?s.color+"55":C.border}`,borderRadius:14,padding:"16px",marginBottom:10,cursor:"pointer" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:s.color }}/>
                      <div style={{ fontFamily:F.sans,fontSize:14,fontWeight:700,color:C.text }}>{s.label}</div>
                      <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>({s.pct}%)</div>
                    </div>
                    <div style={{ fontFamily:F.sans,fontSize:12,color:C.dim,marginLeft:16 }}>{s.desc}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontFamily:F.sans,fontSize:16,fontWeight:800,color:s.color }}>{s.count}</div>
                    <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>₹{s.avgLTV} avg LTV</div>
                  </div>
                </div>
                <ProgressBar value={s.count} max={347} color={s.color}/>
                {isExp&&(
                  <div style={{ marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}` }}>
                    <div style={{ background:`${s.color}11`,border:`1px solid ${s.color}33`,borderRadius:10,padding:"14px",marginBottom:12 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                        <div style={{ fontSize:9,color:s.color,letterSpacing:1.5,textTransform:"uppercase",fontFamily:F.sans }}>Recommended Action</div>
                        <div style={{ fontSize:9,fontWeight:700,color:s.nudgeUrgency==="Urgent"?C.red:s.nudgeUrgency==="High"?C.amber:s.nudgeUrgency==="Medium"?C.blue:C.green,background:`${s.nudgeUrgency==="Urgent"?C.red:C.green}22`,borderRadius:99,padding:"2px 8px",fontFamily:F.sans }}>{s.nudgeUrgency}</div>
                      </div>
                      <div style={{ fontFamily:F.sans,fontSize:13,color:C.text,marginBottom:10 }}>{s.nudgeAction}</div>
                      <div style={{ background:C.surface2,borderRadius:8,padding:"10px 12px" }}>
                        <div style={{ fontSize:9,color:C.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:6,fontFamily:F.sans }}>Sample WhatsApp message</div>
                        <div style={{ fontFamily:F.sans,fontSize:12,color:C.muted,lineHeight:1.6,fontStyle:"italic" }}>"{s.nudgeMsg}"</div>
                      </div>
                    </div>
                    {opp>0&&(
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div style={{ fontFamily:F.sans,fontSize:12,color:C.dim }}>Revenue opportunity with nudge</div>
                        <div style={{ fontFamily:F.sans,fontSize:14,fontWeight:700,color:C.green }}>+{fmtRs(opp)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <SectionHeader>LTV Prediction Signals</SectionHeader>
          <p style={{ fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.65,marginBottom:14 }}>Early session behaviours that strongly predict upgrade. Optimise UX to trigger these.</p>
          {MOCK.ltvSignals.sort((a,b)=>b.multiplier-a.multiplier).map(sig=>(
            <div key={sig.signal} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px",marginBottom:8 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <div style={{ fontFamily:F.sans,fontSize:13,color:C.text,flex:1 }}>{sig.signal}</div>
                <div style={{ display:"flex",gap:10,alignItems:"center",flexShrink:0 }}>
                  <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>{sig.users} users</div>
                  <div style={{ fontFamily:F.sans,fontSize:14,fontWeight:800,color:sig.color }}>{sig.multiplier}×</div>
                </div>
              </div>
              <ProgressBar value={sig.multiplier} max={5} color={sig.color}/>
            </div>
          ))}
        </div>
      )}

      {/* - USERS - */}
      {tab==="users"&&(
        <UserAnalyticsTab currentMobile={mobile}/>
      )}

      {/* - FLYWHEEL - */}
      {tab==="flywheel"&&(
        <div>
          <div style={{ background:viralCoeff>=0.3?"#060f06":"#0f0a00",border:`1px solid ${viralCoeff>=0.3?C.green:C.amber}44`,borderRadius:14,padding:"20px",marginBottom:24 }}>
            <div style={{ fontSize:9,color:viralCoeff>=0.3?C.green:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontFamily:F.sans }}>Viral Coefficient</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:10 }}>
              <div style={{ fontFamily:F.sans,fontSize:40,fontWeight:800,color:viralCoeff>=0.3?C.green:C.amber,lineHeight:1 }}>{viralCoeff.toFixed(3)}</div>
              <div style={{ fontFamily:F.sans,fontSize:13,color:C.dim }}>target: 0.300</div>
            </div>
            <p style={{ fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,marginBottom:14 }}>
              Per 100 paid buyers you get <strong style={{ color:C.text }}>{Math.round(viralCoeff*100)} organic buyers</strong> from referrals. Target is 30+ before scaling back paid spend.
            </p>
            <div style={{ background:C.surface,borderRadius:8,padding:"10px 12px" }}>
              <div style={{ fontFamily:F.sans,fontSize:12,color:C.dim }}>Weakest link: <span style={{ color:C.red,fontWeight:700 }}>{MOCK.flywheel[weakestLink[0]].label}</span> — {pct(weakestLink[1].rate)} vs {pct(weakestLink[1].target)} target</div>
            </div>
          </div>

          <SectionHeader>Flywheel Chain — Rate vs Target</SectionHeader>
          {Object.entries(MOCK.flywheel).map(([key,link])=>{
            const health=link.rate/link.target;
            const color=health>=0.8?C.green:health>=0.5?C.amber:C.red;
            const isWeak=key===weakestLink[0];
            return(
              <div key={key} style={{ background:isWeak?"#0f0a00":C.surface,border:`1px solid ${isWeak?C.red+"44":C.border}`,borderRadius:12,padding:"14px",marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text,marginBottom:2 }}>{link.label}{isWeak&&<span style={{ fontSize:10,color:C.red,marginLeft:6 }}>⚠ Weakest</span>}</div>
                    <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>{link.metric}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:F.sans,fontSize:16,fontWeight:800,color }}>{pct(link.rate)}</div>
                    <div style={{ fontFamily:F.sans,fontSize:10,color:C.dim }}>target {pct(link.target)}</div>
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <div style={{ flex:1 }}><ProgressBar value={health*100} max={100} color={color}/></div>
                  <div style={{ fontSize:11,color,fontFamily:F.sans,minWidth:32,textAlign:"right" }}>{Math.round(health*100)}%</div>
                </div>
              </div>
            );
          })}

          <SectionHeader>What To Fix — Prioritised by Impact</SectionHeader>
          {Object.entries(MOCK.flywheel).sort((a,b)=>(a[1].rate/a[1].target)-(b[1].rate/b[1].target)).map(([key,link])=>{
            const health=link.rate/link.target;
            const color=health>=0.8?C.green:health>=0.5?C.amber:C.red;
            return(
              <div key={key} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                  <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text }}>{link.label}</div>
                  <div style={{ fontSize:11,fontWeight:700,color,background:`${color}22`,borderRadius:99,padding:"3px 10px",fontFamily:F.sans }}>{pct(link.rate)} → {pct(link.target)}</div>
                </div>
                {link.fixes.map((fix,i)=>(
                  <div key={i} style={{ display:"flex",gap:10,marginBottom:8,alignItems:"flex-start" }}>
                    <span style={{ color:C.amber,fontSize:11,flexShrink:0,marginTop:2 }}>→</span>
                    <span style={{ fontFamily:F.sans,fontSize:12,color:C.muted,lineHeight:1.6 }}>{fix}</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px" }}>
            <SectionHeader>CAC: Paid vs Referral</SectionHeader>
            {[["Paid (Meta/LinkedIn)",175,C.red],["Referral (current)",42,C.amber],["Referral (at target)",14,C.green]].map(([label,cac,color])=>(
              <div key={label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                <div style={{ fontFamily:F.sans,fontSize:13,color:C.muted }}>{label}</div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:70,height:4,background:C.border,borderRadius:99 }}>
                    <div style={{ height:"100%",width:`${(cac/175)*100}%`,background:color,borderRadius:99 }}/>
                  </div>
                  <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:700,color,minWidth:36,textAlign:"right" }}>₹{cac}</div>
                </div>
              </div>
            ))}
            <p style={{ fontFamily:F.sans,fontSize:12,color:C.dim,marginTop:8,lineHeight:1.6 }}>At target viral coefficient, referral CAC drops to ₹14 — 12× cheaper than paid.</p>
          </div>
        </div>
      )}
    </div>
  </div>

  {selectedNiche&&<NicheSheet niche={selectedNiche} onClose={()=>setSelectedNiche(null)} isUserNiche={selectedNiche.id==="digital_marketing"}/>}
</div>
```

);
}

// - MAIN APP -
export default function App() {
const [view,setView]=useState(V.LANDING);
const [mobile,setMobile]=useState(””);
const [mobileInput,setMobileInput]=useState(””);
const [otpInput,setOtpInput]=useState(””);
const [otpError,setOtpError]=useState(””);
const [qIdx,setQIdx]=useState(0);
const [answers,setAnswers]=useState({});
const [textVal,setTextVal]=useState(””);
const [multiSel,setMultiSel]=useState([]);
const [chosenIdx,setChosenIdx]=useState(0);
const [promptBought,setPromptBought]=useState(false);
const [bundleBought,setBundleBought]=useState(false);
const [copied,setCopied]=useState(false);
const [scriptCopied,setScriptCopied]=useState(false);
const [waSent,setWaSent]=useState(false);
const [showAdmin,setShowAdmin]=useState(false);
const [selectedNiche,setSelectedNiche]=useState(null);
const [retakeCount,setRetakeCount]=useState(0);
const [abCell]=useState(()=>getABCell());
const topRef=useRef(null);

const abConfig=AB_CELLS[abCell];
const idea=DEMO.ideas[chosenIdx];
const bundlePrice=Math.round((DEMO.projectedMonth3*0.02)/100)*100;
const q=QUESTIONS[qIdx];

useEffect(()=>{ Analytics.track(“screen_viewed”,{screen:view,ab_cell:abCell}); },[view]);

const go=v=>{ setView(v); setTimeout(()=>topRef.current?.scrollIntoView({behavior:“smooth”}),50); };
const copy=(txt,set)=>{ navigator.clipboard?.writeText(txt).catch(()=>{}); set(true); setTimeout(()=>set(false),2500); };

const handleMobile=()=>{
if(mobileInput.replace(/\D/g,””).length<10)return;
const num=mobileInput.replace(/\D/g,””);
const count=UserState.getRetakeCount(num);
setMobile(num); setRetakeCount(count);
localStorage.setItem(“bolt_mobile”,num);
Analytics.track(“mobile_submitted”,{retake_count:count});
if(count>=2) go(V.RETAKE_GATE); else go(V.OTP);
};

const handleOtp=()=>{
if(otpInput!==“1234”){ setOtpError(“Incorrect OTP. Use 1234 for demo.”); return; }
Analytics.track(“otp_verified”,{mobile});
if(!UserState.get(mobile)) UserState.set(mobile,{mobile_number:mobile,retake_count:0,blueprints:[],referral_code:`BOLT-${mobile.slice(-4).toUpperCase()}`,ab_cell:abCell});
Analytics.track(“quiz_started”,{mobile});
go(V.QUIZ);
};

const handleQAnswer=val=>{
Analytics.track(“quiz_question_answered”,{question_id:q.id,answer:val});
const up={…answers,[q.id]:val};
setAnswers(up); setTextVal(””); setMultiSel([]);
if(qIdx<QUESTIONS.length-1) setQIdx(qIdx+1);
else{ Analytics.track(“quiz_completed”,{mobile}); go(V.GATE); }
};

const Phone=({children,noDots})=>(
<div style={{ minHeight:“100vh”,background:C.bg,display:“flex”,justifyContent:“center” }}>
<link rel="stylesheet" href={FONT}/>
<style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.border2}}`}</style>
<div style={{ width:“100%”,maxWidth:390,minHeight:“100vh”,background:C.bg,display:“flex”,flexDirection:“column” }}>
{!noDots&&<Dots view={view}/>}
<div ref={topRef} style={{ flex:1,overflowY:“auto” }}>{children}</div>
</div>
</div>
);
const Pad=({children})=><div style={{ padding:“0 22px” }}>{children}</div>;

const renderQInput=()=>{
if(q.type===“choice”) return <div style={{display:“flex”,flexDirection:“column”,gap:10}}>{q.options.map(o=><button key={o} onClick={()=>handleQAnswer(o)} style={{background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,textAlign:“left”,color:C.text,fontSize:14,cursor:“pointer”,fontFamily:F.sans,transition:“all 0.15s”}}>{o}</button>)}</div>;
if(q.type===“choice_d”) return <div style={{display:“flex”,flexDirection:“column”,gap:10}}>{q.options.map(o=><button key={o.v} onClick={()=>handleQAnswer(o.l)} style={{background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,textAlign:“left”,cursor:“pointer”,fontFamily:F.sans,transition:“all 0.15s”}}><div style={{fontSize:14,color:C.text,marginBottom:2}}>{o.l}</div><div style={{fontSize:11,color:C.dim}}>{o.d}</div></button>)}</div>;
if(q.type===“multiselect”) return <div><div style={{display:“flex”,flexDirection:“column”,gap:8,marginBottom:16}}>{q.options.map(o=>{const s=multiSel.includes(o);return<button key={o} onClick={()=>setMultiSel(p=>s?p.filter(x=>x!==o):[…p,o])} style={{background:s?”#100f00”:“transparent”,border:s?`1px solid ${C.amber}44`:`1px solid ${C.border2}`,borderRadius:10,padding:“12px 16px”,textAlign:“left”,color:s?C.amber:C.muted,fontSize:14,cursor:“pointer”,fontFamily:F.sans,display:“flex”,gap:10,alignItems:“center”}}><span style={{fontSize:11,opacity:s?1:0.3}}>{s?“◆”:“◇”}</span>{o}</button>;})}</div><Btn onClick={()=>handleQAnswer(multiSel.join(”, “)||“Flexible”)}>Continue →</Btn></div>;
if(q.type===“rank”) return <RankQ options={q.options} onAnswer={handleQAnswer}/>;
if(q.type===“text”) return <div><input value={textVal} onChange={e=>setTextVal(e.target.value)} onKeyDown={e=>e.key===“Enter”&&textVal.trim()&&handleQAnswer(textVal.trim())} placeholder={q.placeholder} style={{width:“100%”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,color:C.text,fontSize:14,fontFamily:F.sans,outline:“none”,marginBottom:14}}/><Btn onClick={()=>textVal.trim()&&handleQAnswer(textVal.trim())}>Continue →</Btn></div>;
if(q.type===“number”) return <div><div style={{display:“flex”,alignItems:“center”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,overflow:“hidden”,marginBottom:14,maxWidth:240}}>{q.prefix&&<span style={{padding:“0 14px”,color:C.amber,fontSize:16,background:”#0e0e0e”,borderRight:`1px solid ${C.border2}`,alignSelf:“stretch”,display:“flex”,alignItems:“center”,fontFamily:F.sans}}>{q.prefix}</span>}<input type=“number” value={textVal} onChange={e=>setTextVal(e.target.value)} onKeyDown={e=>e.key===“Enter”&&textVal&&handleQAnswer(textVal)} placeholder={q.placeholder} style={{flex:1,background:“transparent”,border:“none”,padding:“14px”,color:C.text,fontSize:16,fontFamily:F.sans,outline:“none”}}/>{q.suffix&&<span style={{padding:“0 12px”,color:C.dim,fontSize:12,background:”#0e0e0e”,borderLeft:`1px solid ${C.border2}`,alignSelf:“stretch”,display:“flex”,alignItems:“center”,fontFamily:F.sans}}>{q.suffix}</span>}</div><Btn onClick={()=>textVal&&handleQAnswer(textVal)}>Continue →</Btn></div>;
if(q.type===“textarea”) return <div><textarea value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder={q.placeholder} style={{width:“100%”,minHeight:120,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,color:C.text,fontSize:13,fontFamily:F.sans,resize:“none”,outline:“none”,lineHeight:1.65,marginBottom:14}}/><Btn onClick={()=>handleQAnswer(textVal.trim()||“Not provided”)}>{textVal.trim()?“Continue →”:“Skip →”}</Btn></div>;
return null;
};

// - LANDING -
if(view===V.LANDING) return (
<div style={{ minHeight:“100vh”,background:C.bg,display:“flex”,justifyContent:“center” }}>
<link rel="stylesheet" href={FONT}/>
<style>{`*{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
<div style={{ width:“100%”,maxWidth:390,minHeight:“100vh”,background:C.bg,paddingBottom:120,position:“relative” }}>
<div style={{ position:“fixed”,bottom:0,left:“50%”,transform:“translateX(-50%)”,width:“100%”,maxWidth:390,background:`linear-gradient(to top,${C.bg} 60%,transparent)`,padding:“16px 22px 24px”,zIndex:100 }}>
<Btn onClick={()=>{Analytics.track(“cta_clicked”,{location:“sticky_bar”});go(V.MOBILE);}} style={{boxShadow:“0 8px 32px rgba(245,166,35,0.3)”,fontSize:16}}>
Build My Blueprint — ₹{abConfig.gatePrice} →
</Btn>
<div style={{textAlign:“center”,marginTop:8,fontSize:11,color:C.dimmer,fontFamily:F.sans}}>5 minutes · Instant · One time</div>
</div>
<div style={{ padding:“28px 22px 0” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:32 }}>
<div>
<div style={{fontSize:18,fontWeight:800,color:C.amber,letterSpacing:1,fontFamily:F.sans}}>⚡ bolt</div>
<div style={{fontSize:9,color:C.dimmer,letterSpacing:2,fontFamily:F.sans}}>YOUR NEXT MOVE, BUILT</div>
</div>
<button onClick={()=>setShowAdmin(true)} style={{background:“none”,border:`1px solid ${C.border}`,borderRadius:8,padding:“6px 12px”,color:C.dimmer,fontSize:10,cursor:“pointer”,fontFamily:F.sans}}>Admin</button>
</div>
<div style={{animation:“fadeUp 0.5s ease”,marginBottom:32}}>
<h1 style={{fontFamily:F.serif,fontSize:34,fontWeight:400,color:C.text,lineHeight:1.15,margin:“0 0 18px”,fontStyle:“italic”}}>
{abConfig.hookVariant===“pain”
?<>Most people know what they’re good at.<br/><span style={{color:C.amber}}>Almost nobody knows how to make money from it.</span></>
:<>Your expertise is worth more than your salary.<br/><span style={{color:C.amber}}>Bolt shows you exactly how to unlock it.</span></>
}
</h1>
<p style={{fontFamily:F.sans,fontSize:15,color:C.dim,lineHeight:1.7,margin:0}}>Bolt takes 14 questions about your expertise, goals, and constraints — and builds a personalised blueprint for your next income move. Not a listicle. A plan.</p>
</div>
<div style={{marginBottom:40,animation:“fadeUp 0.5s ease 0.15s both”}}>
<div style={{animation:“float 4s ease infinite”}}><ShareCard idea={DEMO.ideas[0]}/></div>
<div style={{textAlign:“center”,marginTop:14}}>
<span style={{fontSize:11,color:C.amber,background:”#0a0900”,border:`1px solid ${C.amber}33`,borderRadius:99,padding:“6px 16px”,fontFamily:F.sans}}>↑ Real blueprint · Blueprint #347</span>
</div>
</div>
<div style={{marginBottom:40}}>
<div style={{fontSize:9,letterSpacing:3,color:C.dim,textTransform:“uppercase”,marginBottom:20,fontFamily:F.sans}}>Is This You?</div>
{[
{icon:“💸”,title:“You’re spending on digital — but it’s not compounding.”,sub:“Every month the spend goes up. The ROI stays flat. You know something’s broken but can’t pinpoint what.”},
{icon:“🧠”,title:“You have 10+ years of expertise nobody is paying for.”,sub:“People ask for your advice constantly. You give it away free. You’ve thought about monetising it — but don’t know where to start.”},
{icon:“🔁”,title:“You’ve tried a side hustle before. It didn’t stick.”,sub:“Too much work, not enough margin. Or you built something nobody bought. You want to try again — smarter.”},
].map((item,i)=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“18px 16px”,marginBottom:12}}>
<div style={{fontSize:22,marginBottom:10}}>{item.icon}</div>
<div style={{fontFamily:F.serif,fontSize:16,color:C.text,lineHeight:1.35,marginBottom:8,fontStyle:“italic”}}>{item.title}</div>
<div style={{fontFamily:F.sans,fontSize:13,color:”#666”,lineHeight:1.6}}>{item.sub}</div>
</div>
))}
</div>
<div style={{marginBottom:40}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“baseline”,marginBottom:18}}>
<div style={{fontSize:9,letterSpacing:3,color:C.dim,textTransform:“uppercase”,fontFamily:F.sans}}>Recent Blueprints</div>
<div style={{fontSize:11,color:C.amber,fontFamily:F.sans}}>347 built</div>
</div>
{SAMPLE_BLUEPRINTS.map((bp,i)=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“14px”,display:“flex”,gap:12,alignItems:“center”,marginBottom:10}}>
<ScoreArc score={bp.score} size={46}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:“nowrap”,overflow:“hidden”,textOverflow:“ellipsis”}}>{bp.idea}</div>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dim,marginBottom:2}}>{bp.field}</div>
<div style={{fontFamily:F.sans,fontSize:12,color:`${C.green}99`}}>{bp.monthly}/month</div>
</div>
<div style={{fontFamily:F.sans,fontSize:10,color:C.border2}}>#{bp.num}</div>
</div>
))}
<p style={{fontFamily:F.sans,fontSize:12,color:C.dimmer,textAlign:“center”,marginTop:12,fontStyle:“italic”}}>Anonymised. Real outputs from real users.</p>
</div>
<div style={{marginBottom:40}}>
<div style={{fontSize:9,letterSpacing:3,color:C.dim,textTransform:“uppercase”,marginBottom:24,fontFamily:F.sans}}>How It Works</div>
{[
{n:“01”,title:“Answer 14 questions”,sub:“About your expertise, goals, time, past failures. Takes 5 minutes.”,preview:<div style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:“12px 14px”,marginTop:10}}><div style={{fontSize:11,color:C.dim,marginBottom:6,fontFamily:F.sans}}>Question 2 of 14</div><div style={{fontFamily:F.serif,fontSize:14,color:C.text,fontStyle:“italic”}}>What’s the one thing you know that most people in your field don’t?</div></div>},
{n:“02”,title:“Get your blueprint instantly”,sub:“3 ideas matched to your exact profile. Honest hard truths. Distribution paths.”,preview:null},
{n:“03”,title:“Know exactly what to do next”,sub:“Week 1 plan. First client script. Market map. Act in the next 10 minutes.”,preview:null},
].map((step,i)=>(
<div key={i} style={{display:“flex”,gap:16,marginBottom:28}}>
<div style={{fontFamily:F.sans,fontSize:22,fontWeight:800,color:C.border2,flexShrink:0,width:36}}>{step.n}</div>
<div style={{flex:1}}>
<div style={{fontFamily:F.serif,fontSize:16,color:C.text,marginBottom:6,fontStyle:“italic”}}>{step.title}</div>
<div style={{fontFamily:F.sans,fontSize:13,color:”#666”,lineHeight:1.65}}>{step.sub}</div>
{step.preview}
</div>
</div>
))}
</div>
<div style={{background:”#0c0a00”,border:`1px solid ${C.amber}22`,borderRadius:16,padding:“22px 18px”,marginBottom:40}}>
<div style={{fontSize:9,letterSpacing:3,color:C.amber,textTransform:“uppercase”,marginBottom:16,fontFamily:F.sans}}>What You Get — ₹{abConfig.gatePrice}</div>
{[“3 ideas matched to your exact profile”,“Honest hard truths per idea”,“Distribution path built for your visibility preference”,“Market opportunity map — India’s gig economy + tap for niche deep-dive”,“Your first client outreach script”,“Week 1 action plan — specific days and tasks”,“Shareable blueprint card”].map((f,i)=>(
<div key={i} style={{display:“flex”,gap:10,alignItems:“flex-start”,marginBottom:10}}>
<span style={{color:C.amber,fontSize:12,flexShrink:0,marginTop:2}}>✦</span>
<span style={{fontFamily:F.sans,fontSize:13,color:”#999”,lineHeight:1.5}}>{f}</span>
</div>
))}
<Divider/>
<div style={{fontFamily:F.sans,fontSize:12,color:C.dimmer,textAlign:“center”}}>Prompt Pack (₹{abConfig.promptPrice}) · Full Bundle (₹{bundlePrice}) unlockable after →</div>
</div>
<div style={{textAlign:“center”,marginBottom:32}}>
<div style={{fontFamily:F.serif,fontSize:20,color:C.text,fontStyle:“italic”,marginBottom:8,lineHeight:1.4}}>“Every founder you’ve met is fighting a channel war.<br/>You know it’s an architecture problem.”</div>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dimmer}}>— From Blueprint #347</div>
</div>
</div>
</div>
{showAdmin&&<AdminDashboard onClose={()=>setShowAdmin(false)} mobile={mobile}/>}
{selectedNiche&&<NicheSheet niche={selectedNiche} onClose={()=>setSelectedNiche(null)} isUserNiche={false}/>}
</div>
);

// - MOBILE -
if(view===V.MOBILE) return (
<Phone noDots>
<Pad>
<div style={{padding:“40px 0 32px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:32}}>⚡ bolt</div>
<h2 style={{fontFamily:F.serif,fontSize:26,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 12px”,lineHeight:1.3}}>One number to save your blueprint forever.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,lineHeight:1.65,margin:0}}>Used to save your blueprint, manage retakes, and send to WhatsApp. Nothing else.</p>
</div>
<div style={{marginBottom:14}}>
<div style={{display:“flex”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,overflow:“hidden”}}>
<div style={{padding:“0 16px”,background:”#0e0e0e”,borderRight:`1px solid ${C.border2}`,display:“flex”,alignItems:“center”,fontSize:14,color:C.muted,fontFamily:F.sans,flexShrink:0}}>🇮🇳 +91</div>
<input type=“tel” value={mobileInput} onChange={e=>setMobileInput(e.target.value.replace(/\D/g,””).slice(0,10))} onKeyDown={e=>e.key===“Enter”&&handleMobile()} placeholder=“10-digit mobile number” style={{flex:1,background:“transparent”,border:“none”,padding:“16px”,color:C.text,fontSize:16,fontFamily:F.sans,outline:“none”}}/>
</div>
</div>
<Btn onClick={handleMobile} style={{marginBottom:14}}>Send OTP →</Btn>
<div style={{fontFamily:F.sans,fontSize:12,color:C.dimmer,textAlign:“center”,marginBottom:28,lineHeight:1.6}}>No spam. No marketing messages. Ever.</div>
<OutlineBtn onClick={()=>go(V.LANDING)}>← Back</OutlineBtn>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“16px”,marginTop:24}}>
<div style={{fontSize:9,color:C.dim,letterSpacing:2,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans}}>Retake Policy</div>
{[[“First 2 retakes”,“Free — included in ₹499”],[“3rd retake onwards”,“₹399 each”]].map(([l,v])=>(
<div key={l} style={{display:“flex”,justifyContent:“space-between”,marginBottom:6}}>
<span style={{fontFamily:F.sans,fontSize:13,color:C.muted}}>{l}</span>
<span style={{fontFamily:F.sans,fontSize:13,color:C.text,fontWeight:600}}>{v}</span>
</div>
))}
</div>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - OTP -
if(view===V.OTP) return (
<Phone noDots>
<Pad>
<div style={{padding:“40px 0 32px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:28}}>⚡ bolt</div>
<div style={{fontSize:32,marginBottom:16}}>📱</div>
<h2 style={{fontFamily:F.serif,fontSize:24,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 10px”}}>Check your messages.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,margin:0}}>OTP sent to +91 {mobileInput.slice(0,5)}XXXXX</p>
<p style={{fontFamily:F.sans,fontSize:12,color:C.amber,margin:“8px 0 0”}}>Demo: use 1234</p>
</div>
<div style={{marginBottom:14}}>
<input type=“number” value={otpInput} onChange={e=>{setOtpInput(e.target.value.slice(0,4));setOtpError(””);}} onKeyDown={e=>e.key===“Enter”&&handleOtp()} placeholder=“Enter 4-digit OTP” style={{width:“100%”,background:C.surface,border:`1px solid ${otpError?C.red:C.border2}`,borderRadius:12,padding:“16px”,color:C.text,fontSize:22,fontFamily:F.sans,outline:“none”,textAlign:“center”,letterSpacing:8}}/>
{otpError&&<div style={{fontSize:12,color:C.red,textAlign:“center”,marginTop:8,fontFamily:F.sans}}>{otpError}</div>}
</div>
<Btn onClick={handleOtp} style={{marginBottom:14}}>Verify & Continue →</Btn>
<OutlineBtn onClick={()=>go(V.MOBILE)}>← Change number</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - RETAKE GATE -
if(view===V.RETAKE_GATE) return (
<Phone noDots>
<Pad>
<div style={{padding:“40px 0 28px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:28}}>⚡ bolt</div>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“20px”,marginBottom:24,display:“inline-flex”,flexDirection:“column”,alignItems:“center”,gap:4}}>
<div style={{fontFamily:F.sans,fontSize:12,color:C.dim}}>Your retakes used</div>
<div style={{fontFamily:F.sans,fontSize:36,fontWeight:800,color:C.text}}>{retakeCount}<span style={{fontSize:18,color:C.dim}}>/2 free</span></div>
</div>
<h2 style={{fontFamily:F.serif,fontSize:24,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 12px”,lineHeight:1.3}}>A lot can change in 3 months.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,lineHeight:1.65,margin:0}}>Your situation evolved. Your blueprint should too. Rebuild it for ₹399.</p>
</div>
<div style={{background:”#0c0a00”,border:`1px solid ${C.amber}22`,borderRadius:14,padding:“18px”,marginBottom:20}}>
<div style={{fontFamily:F.sans,fontSize:10,color:C.amber,letterSpacing:2,textTransform:“uppercase”,marginBottom:12}}>What You Get</div>
{[“Fresh blueprint based on your updated answers”,“New ideas if your goals have changed”,“Updated 30-day roadmap”,“New first client script”].map(f=>(
<div key={f} style={{display:“flex”,gap:10,marginBottom:8}}><span style={{color:C.amber,fontSize:11}}>✦</span><span style={{fontFamily:F.sans,fontSize:13,color:”#999”}}>{f}</span></div>
))}
</div>
<Btn onClick={()=>{Analytics.track(“retake_gate_converted”,{mobile,amount:399});UserState.incrementRetake(mobile);go(V.QUIZ);}} style={{marginBottom:12,fontSize:16}}>
Rebuild My Blueprint — ₹399 →
</Btn>
<OutlineBtn onClick={()=>go(V.LANDING)}>← Not yet</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - QUIZ -
if(view===V.QUIZ) return (
<Phone noDots>
<Pad>
<div style={{padding:“20px 0 22px”,display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<div style={{fontSize:14,fontWeight:800,color:C.amber,fontFamily:F.sans}}>⚡ bolt</div>
<div style={{fontSize:12,color:C.dimmer,fontFamily:F.sans}}>{qIdx+1} / {QUESTIONS.length}</div>
</div>
<div style={{height:3,background:C.border,borderRadius:99,marginBottom:32}}>
<div style={{height:“100%”,borderRadius:99,background:`linear-gradient(90deg,${C.amber},#e8410a)`,width:`${((qIdx+1)/QUESTIONS.length)*100}%`,transition:“width 0.5s cubic-bezier(0.34,1.56,0.64,1)”}}/>
</div>
<div key={qIdx} style={{animation:“fadeUp 0.3s ease”}}>
<h2 style={{fontFamily:F.serif,fontSize:“clamp(19px,5vw,26px)”,fontWeight:400,color:C.text,lineHeight:1.35,margin:“0 0 8px”,fontStyle:“italic”}}>{q.q}</h2>
{q.sub&&<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,margin:“0 0 26px”}}>{q.sub}</p>}
{renderQInput()}
</div>
{qIdx>0&&<OutlineBtn onClick={()=>{setQIdx(qIdx-1);setTextVal(””);setMultiSel([]);}} style={{marginTop:20}}>← Back</OutlineBtn>}
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - GATE -
if(view===V.GATE) return (
<Phone noDots>
<Pad>
<div style={{padding:“24px 0 0”,display:“flex”,justifyContent:“space-between”,marginBottom:32}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans}}>⚡ bolt</div>
<div style={{fontSize:10,color:C.dimmer,fontFamily:F.sans}}>Blueprint #{DEMO.blueprintNumber}</div>
</div>
<div style={{textAlign:“center”,marginBottom:28}}>
<ScoreArc score={DEMO.score} size={140}/>
<div style={{fontSize:11,color:C.green,letterSpacing:3,textTransform:“uppercase”,marginTop:12,fontFamily:F.sans}}>{DEMO.scoreLabel}</div>
</div>
<div style={{background:”#0c0a00”,border:`1px solid ${C.amber}22`,borderRadius:14,padding:“18px 16px”,marginBottom:28}}>
<Label>Your positioning</Label>
<p style={{fontFamily:F.serif,fontSize:15,color:”#ddd”,lineHeight:1.65,margin:0,fontStyle:“italic”}}>”{DEMO.positioning}”</p>
</div>
<div style={{marginBottom:32}}>
<Label>Your 3 ideas</Label>
{DEMO.ideas.map((idea,i)=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“14px 16px”,filter:“blur(5px)”,userSelect:“none”,pointerEvents:“none”,marginBottom:8}}>
<div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2,fontFamily:F.sans}}>{idea.title}</div>
<div style={{fontSize:12,color:C.dim,fontFamily:F.sans}}>{idea.monthly}/month</div>
</div>
))}
<div style={{textAlign:“center”,marginTop:10}}><div style={{fontSize:11,color:C.dimmer,fontStyle:“italic”,fontFamily:F.sans}}>Unlock to see your ideas →</div></div>
</div>
<Btn onClick={()=>{Analytics.track(“gate_converted”,{mobile,amount:abConfig.gatePrice,ab_cell:abCell});UserState.incrementRetake(mobile);go(V.WELCOME);}} style={{background:`linear-gradient(135deg,${C.amber},#e8410a)`,boxShadow:“0 8px 28px rgba(245,166,35,0.25)”,fontSize:16,marginBottom:10}}>
Unlock My Blueprint — ₹{abConfig.gatePrice}
</Btn>
<div style={{textAlign:“center”,fontSize:11,color:C.dimmer,fontFamily:F.sans}}>One-time · 2 free retakes included</div>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - WELCOME + REFERRAL -
if(view===V.WELCOME) return (
<Phone>
<Pad>
<div style={{textAlign:“center”,padding:“32px 0 24px”}}>
<div style={{fontSize:9,letterSpacing:3,color:C.amber,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>⚡ bolt</div>
<div style={{fontSize:52,fontWeight:800,color:C.text,lineHeight:1,marginBottom:6,fontFamily:F.sans}}>#{DEMO.blueprintNumber}</div>
<div style={{fontSize:12,color:C.dim,letterSpacing:1,fontFamily:F.sans}}>Your Blueprint Number</div>
</div>
<div style={{background:”#060f06”,border:`1px solid ${C.wa}33`,borderRadius:16,padding:“20px 16px”,marginBottom:22}}>
<div style={{display:“flex”,gap:10,alignItems:“center”,marginBottom:12}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill={C.wa}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
<div style={{fontSize:13,fontWeight:700,color:C.wa,fontFamily:F.sans}}>Share your link. Earn ₹150 cashback.</div>
</div>
<p style={{fontSize:13,color:C.muted,lineHeight:1.6,margin:“0 0 12px”,fontFamily:F.sans}}>Every time someone buys using your link, ₹150 comes back to you. No cap.</p>
<div style={{background:”#0a1a0a”,borderRadius:8,padding:“10px 12px”,marginBottom:12,display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<span style={{fontSize:11,color:C.green,fontFamily:“monospace”}}>bolt.in/r/{DEMO.referralCode}</span>
<button onClick={()=>{copy(`https://bolt.in/r/${DEMO.referralCode}`,setCopied);Analytics.track(“referral_link_copied”,{location:“welcome”});}} style={{background:“none”,border:`1px solid ${C.wa}44`,borderRadius:6,padding:“4px 10px”,color:C.wa,fontSize:11,cursor:“pointer”,fontFamily:F.sans}}>{copied?“✓”:“Copy”}</button>
</div>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`Just built my Blueprint on Bolt — mapped my next income move in 5 mins. Blueprint #${DEMO.blueprintNumber}. Get yours: https://bolt.in/r/${DEMO.referralCode}`)}`, “_blank”);Analytics.track(“referral_share_sent”,{platform:“whatsapp”,location:“welcome”});}} style={{fontSize:13,padding:“12px”}}>
Share on WhatsApp →
</Btn>
</div>
<Btn onClick={()=>go(V.DECISION)}>See My 3 Ideas →</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - DECISION -
if(view===V.DECISION) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 20px”}}>
<Label>Your 3 Ideas</Label>
<h2 style={{fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,lineHeight:1.3,margin:0,fontStyle:“italic”}}>One pulls harder than the others.<br/>Which one?</h2>
</div>
<div style={{background:”#0b0a00”,border:`1px solid ${C.amber}55`,borderRadius:16,padding:“20px 16px”,marginBottom:12,position:“relative”}}>
<div style={{position:“absolute”,top:-10,right:14,background:C.amber,color:C.bg,fontSize:9,fontWeight:800,letterSpacing:1.5,padding:“3px 12px”,borderRadius:99,fontFamily:F.sans}}>BEST MATCH</div>
<div style={{fontFamily:F.sans,fontSize:17,fontWeight:700,color:C.text,marginBottom:6}}>{DEMO.ideas[0].title}</div>
<div style={{fontFamily:F.serif,fontSize:14,color:C.muted,fontStyle:“italic”,marginBottom:14,lineHeight:1.5}}>{DEMO.ideas[0].tagline}</div>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:16}}>
<div style={{fontSize:14,color:C.green,fontWeight:700,fontFamily:F.sans}}>{DEMO.ideas[0].monthly}</div>
<div style={{fontSize:11,color:C.dim,fontFamily:F.sans}}>{DEMO.ideas[0].timeToFirst} to first ₹</div>
</div>
<Btn onClick={()=>{setChosenIdx(0);Analytics.track(“idea_chosen”,{idea_title:DEMO.ideas[0].title});go(V.COMMITMENT);}}>This Is My Move →</Btn>
</div>
<div style={{fontSize:10,color:”#2a2a2a”,textAlign:“center”,margin:“8px 0”,letterSpacing:1,fontFamily:F.sans}}>OR CONSIDER</div>
{[1,2].map(i=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“14px”,marginBottom:10}}>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:8}}>
<div style={{flex:1,paddingRight:10}}>
<div style={{fontFamily:F.sans,fontSize:14,fontWeight:600,color:”#aaa”,marginBottom:3}}>{DEMO.ideas[i].title}</div>
<div style={{fontFamily:F.serif,fontSize:12,color:C.dim,fontStyle:“italic”}}>{DEMO.ideas[i].tagline}</div>
</div>
<div style={{fontSize:13,color:`${C.green}66`,fontWeight:600,flexShrink:0,fontFamily:F.sans}}>{DEMO.ideas[i].monthly}</div>
</div>
<OutlineBtn onClick={()=>{setChosenIdx(i);Analytics.track(“idea_chosen”,{idea_title:DEMO.ideas[i].title});go(V.COMMITMENT);}} style={{borderRadius:8,padding:“9px”,fontSize:12}}>Choose This Instead</OutlineBtn>
</div>
))}
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - COMMITMENT -
if(view===V.COMMITMENT) return (
<Phone>
<Pad>
<div style={{textAlign:“center”,padding:“48px 0 28px”}}>
<div style={{fontSize:36,marginBottom:16}}>🔒</div>
<Label>Decision Locked</Label>
<h2 style={{fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 12px”,fontStyle:“italic”}}>{idea.title}</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.65,margin:0}}>Make it real — tell one person you’re doing this.<br/>People who announce a goal are 3× more likely to pursue it.</p>
</div>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“16px”,marginBottom:18}}>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dimmer,marginBottom:10}}>Pre-written — one tap to send:</div>
<div style={{background:C.bg,borderRadius:10,padding:“12px 14px”,marginBottom:14,border:`1px solid ${C.border}`}}>
<p style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:0,fontStyle:“italic”}}>“Just figured out my next income move using Bolt. Building {idea.title} — {idea.tagline} Starting this week 🎯”</p>
</div>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`Just figured out my next income move using Bolt. Building “${idea.title}” — ${idea.tagline} Starting this week 🎯\n\nGet your blueprint: https://bolt.in/r/${DEMO.referralCode}`)}`, “_blank”);Analytics.track(“commitment_share_sent”,{idea_title:idea.title});}} style={{fontSize:13,padding:“13px”}}>
Send on WhatsApp →
</Btn>
</div>
<Btn onClick={()=>{Analytics.track(“commitment_share_skipped”);go(V.ASSESSMENT);}}>Skip — Show Me The Plan →</Btn>
<div style={{textAlign:“center”,marginTop:10,fontSize:11,color:C.dimmer,fontFamily:F.sans}}>Sharing earns ₹150 if they buy</div>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - ASSESSMENT -
if(view===V.ASSESSMENT) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 20px”}}>
<Label>Honest Assessment</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.35,margin:“0 0 16px”,fontStyle:“italic”}}>Why this works for you — and where it gets hard.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:”#999”,lineHeight:1.7,margin:0}}>{idea.fit}</p>
</div>
<Divider/>
<div style={{marginBottom:20}}>
<div style={{fontSize:9,color:”#34d399”,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans}}>Avoids Your Past Failure</div>
<p style={{fontFamily:F.sans,fontSize:14,color:”#aaa”,lineHeight:1.7,margin:0}}>{idea.failurePrevention}</p>
</div>
<div style={{marginBottom:20}}>
<div style={{fontSize:9,color:C.red,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:12,fontFamily:F.sans}}>Two Things To Know</div>
{idea.hardTruths.map((t,i)=>(
<div key={i} style={{display:“flex”,gap:10,marginBottom:12}}>
<span style={{color:C.red,fontSize:12,flexShrink:0,marginTop:2}}>▸</span>
<span style={{fontFamily:F.sans,fontSize:13,color:”#cc8888”,lineHeight:1.65}}>{t}</span>
</div>
))}
</div>
<div style={{background:”#080f08”,border:“1px solid #34d39922”,borderRadius:12,padding:“16px”,marginBottom:24}}>
<div style={{fontSize:9,color:”#34d399”,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans}}>How You Get Customers</div>
<p style={{fontFamily:F.sans,fontSize:13,color:”#aaa”,lineHeight:1.65,margin:0}}>{idea.distributionPath}</p>
</div>
<div style={{background:”#0a0900”,border:`1px solid ${C.amber}22`,borderRadius:10,padding:“14px”,marginBottom:24}}>
<p style={{fontFamily:F.serif,fontSize:15,color:C.amber,margin:0,fontStyle:“italic”}}>Still the right move. Here’s your first action.</p>
</div>
<Btn onClick={()=>go(V.FIRSTSTEP)}>Show Me The First Step →</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - FIRST STEP + PROMPT PACK -
if(view===V.FIRSTSTEP) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 16px”}}>
<Label>This Week</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.35,margin:0,fontStyle:“italic”}}>{idea.firstStep}</h2>
</div>
<div style={{marginBottom:6}}>
<div style={{fontSize:9,color:C.green,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>Send This Today</div>
<div style={{background:”#0d0d0d”,borderRadius:16,padding:4,border:`1px solid ${C.border}`}}>
<div style={{padding:“10px 14px 8px”,borderBottom:`1px solid ${C.border}`,display:“flex”,gap:10,alignItems:“center”}}>
<div style={{width:30,height:30,borderRadius:“50%”,background:`${C.amber}22`,display:“flex”,alignItems:“center”,justifyContent:“center”}}>👤</div>
<div><div style={{fontSize:12,color:C.text,fontFamily:F.sans}}>Ideal Client</div><div style={{fontSize:10,color:C.green,fontFamily:F.sans}}>online</div></div>
</div>
<div style={{padding:“14px 12px”}}>
<div style={{background:”#1a1500”,border:`1px solid ${C.amber}22`,borderRadius:“4px 14px 14px 14px”,padding:“12px 14px”,maxWidth:“88%”}}>
<p style={{fontFamily:F.sans,fontSize:13,color:”#ddd”,lineHeight:1.65,margin:0}}>{idea.firstClientScript}</p>
<div style={{fontSize:10,color:C.dim,textAlign:“right”,marginTop:6}}>✓✓</div>
</div>
</div>
</div>
<OutlineBtn onClick={()=>{copy(idea.firstClientScript,setScriptCopied);Analytics.track(“script_copied”,{idea_title:idea.title});}} style={{marginTop:10,borderRadius:10,fontSize:13,padding:“12px”}}>
{scriptCopied?“✓ Copied”:“Copy Message”}
</OutlineBtn>
</div>
<Divider/>
{!promptBought?(
<div style={{background:“linear-gradient(135deg,#0a0900,#080810)”,border:`1px solid ${C.amber}33`,borderRadius:16,padding:“18px 16px”}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:8}}>
<div><div style={{fontSize:9,color:C.amber,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans}}>Impulse Add-On</div><div style={{fontFamily:F.sans,fontSize:15,fontWeight:700,color:C.text}}>Prompt Pack</div></div>
<div style={{fontFamily:F.sans,fontSize:22,fontWeight:800,color:C.amber}}>₹{abConfig.promptPrice}</div>
</div>
<p style={{fontFamily:F.sans,fontSize:12,color:”#666”,lineHeight:1.6,margin:“0 0 14px”}}>6 prompts built for {idea.title} — landing page, audit report, objection handler, ad creatives, proposal email, Loom script.</p>
<Btn onClick={()=>{setPromptBought(true);Analytics.track(“prompt_pack_converted”,{price:abConfig.promptPrice,ab_cell:abCell});}} style={{padding:“13px”,fontSize:14}}>
Get All 6 Prompts — ₹{abConfig.promptPrice} →
</Btn>
</div>
):(
<div style={{background:”#060f06”,border:“1px solid #4ade8033”,borderRadius:14,padding:“16px”,textAlign:“center”}}>
<div style={{fontSize:20,marginBottom:8}}>✓</div>
<div style={{fontFamily:F.sans,fontSize:13,color:C.green,fontWeight:600}}>Prompt Pack unlocked · 6 prompts ready</div>
</div>
)}
<Btn onClick={()=>go(V.MARKET)} style={{marginTop:16}}>See Market Opportunity →</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - MARKET MAP -
if(view===V.MARKET) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 16px”}}>
<Label>Market Opportunity</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 8px”,fontStyle:“italic”}}>You picked the right niche.</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dimmer,margin:0}}>India’s gig economy — bubble size = market revenue. Tap any bubble for a full niche profile.</p>
</div>
<BubbleChart onNicheClick={setSelectedNiche}/>
<div style={{display:“flex”,gap:10,marginTop:18,marginBottom:24}}>
{[[“₹18K Cr”,“Market size”],[“21L+”,“Practitioners”],[“30%”,“YoY growth”]].map(([v,l])=>(
<div key={l} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“12px 8px”,textAlign:“center”}}>
<div style={{fontFamily:F.sans,fontSize:15,fontWeight:700,color:C.amber,marginBottom:3}}>{v}</div>
<div style={{fontFamily:F.sans,fontSize:10,color:C.dimmer}}>{l}</div>
</div>
))}
</div>
<Btn onClick={()=>go(V.ROADMAP)}>See My 30-Day Plan →</Btn>
<div style={{height:40}}/>
</Pad>
{selectedNiche&&<NicheSheet niche={selectedNiche} onClose={()=>setSelectedNiche(null)} isUserNiche={selectedNiche.id===“digital_marketing”}/>}
</Phone>
);

// - ROADMAP + FULL BUNDLE -
if(view===V.ROADMAP) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 16px”}}>
<Label>Your 30-Day Plan</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.3,margin:0,fontStyle:“italic”}}>Week 1 is all that matters right now.</h2>
</div>
<div style={{marginBottom:16}}>
<div style={{display:“flex”,gap:14}}>
<div style={{width:3,background:C.green,borderRadius:2,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:9,color:C.green,letterSpacing:2,textTransform:“uppercase”,marginBottom:12,fontFamily:F.sans}}>Week 1</div>
{DEMO.week1.map((t,i)=>(
<div key={i} style={{display:“flex”,gap:10,marginBottom:12,alignItems:“flex-start”}}>
<div style={{width:20,height:20,borderRadius:“50%”,border:`1px solid ${C.green}44`,display:“flex”,alignItems:“center”,justifyContent:“center”,flexShrink:0,marginTop:1}}>
<div style={{fontSize:9,color:C.green,fontFamily:F.sans}}>{i+1}</div>
</div>
<span style={{fontFamily:F.sans,fontSize:13,color:”#bbb”,lineHeight:1.55}}>{t}</span>
</div>
))}
</div>
</div>
</div>
{[[“Week 2”,DEMO.week2,C.blue],[“Week 3”,DEMO.week3,”#c084fc”],[“Week 4”,DEMO.week4,C.amber]].map(([lbl,task,clr])=>(
<div key={lbl} style={{display:“flex”,gap:14,marginBottom:14}}>
<div style={{width:3,background:clr,borderRadius:2,flexShrink:0,opacity:0.35}}/>
<div style={{flex:1}}>
<div style={{fontSize:9,color:clr,letterSpacing:2,textTransform:“uppercase”,marginBottom:5,opacity:0.6,fontFamily:F.sans}}>{lbl}</div>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.55,margin:0}}>{task}</p>
</div>
</div>
))}
<Divider/>
{!bundleBought?(
<div style={{background:“linear-gradient(135deg,#080810,#0a0900)”,border:`1px solid ${C.blue}33`,borderRadius:16,padding:“20px 16px”}} onClick={()=>Analytics.track(“full_bundle_viewed”)}>
<div style={{fontSize:9,color:C.blue,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>Full Bundle</div>
<div style={{textAlign:“center”,marginBottom:18}}>
<div style={{fontFamily:F.sans,fontSize:12,color:C.dimmer,marginBottom:6}}>{idea.title} projects</div>
<div style={{fontFamily:F.sans,fontSize:26,fontWeight:800,color:C.green}}>₹{(DEMO.projectedMonth3/100000).toFixed(1)}L/month</div>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dimmer,margin:“4px 0 12px”}}>by month 3</div>
<div style={{height:1,background:C.border,margin:“12px 0”}}/>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dim,marginBottom:4}}>Full Bundle = 2% of that → one time</div>
<div style={{fontFamily:F.sans,fontSize:34,fontWeight:800,color:C.text}}>₹{bundlePrice.toLocaleString(“en-IN”)}</div>
</div>
{[“Pressure Test + Go/No Go verdict”,“5 hard questions answered honestly”,“Months 1–3 full roadmap”,“30-day re-planning prompt”,“Prompt Pack included”].map(f=>(
<div key={f} style={{display:“flex”,gap:8,alignItems:“center”,marginBottom:8}}>
<span style={{color:C.blue,fontSize:11}}>✦</span>
<span style={{fontFamily:F.sans,fontSize:12,color:C.muted}}>{f}</span>
</div>
))}
<Btn bg={C.text} color={C.bg} onClick={()=>{setBundleBought(true);Analytics.track(“full_bundle_converted”,{price:bundlePrice,ab_cell:abCell});}} style={{fontWeight:800,marginTop:14}}>
Get Full Bundle — ₹{bundlePrice.toLocaleString(“en-IN”)} →
</Btn>
<div style={{textAlign:“center”,marginTop:8,fontFamily:F.sans,fontSize:11,color:C.dimmer}}>2% to potentially unlock ₹{(DEMO.projectedMonth3/100000).toFixed(1)}L/month</div>
</div>
):(
<div style={{background:”#060f06”,border:“1px solid #4ade8033”,borderRadius:14,padding:“20px”,textAlign:“center”}}>
<div style={{fontSize:24,marginBottom:8}}>⚡</div>
<div style={{fontFamily:F.sans,fontSize:14,color:C.green,fontWeight:700}}>Full Bundle Unlocked</div>
</div>
)}
<Btn onClick={()=>go(V.SHARE)} style={{marginTop:16}}>Get My Share Card →</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// - SHARE -
if(view===V.SHARE) return (
<Phone>
<Pad>
<div style={{padding:“24px 0 18px”,textAlign:“center”}}>
<Label>Your Blueprint Card</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 6px”,fontStyle:“italic”}}>Screenshot and share.</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dimmer,margin:0}}>Every share earns ₹150 when someone buys.</p>
</div>
<div style={{marginBottom:18}}><ShareCard idea={idea}/></div>
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`⚡ *Bolt Blueprint #${DEMO.blueprintNumber}*\n\n_”${DEMO.positioning}”_\n\n🎯 *My next move:* ${idea.title}\n”${idea.tagline}”\n\n📈 ${idea.monthly}/month projected\n\n→ Get yours: https://bolt.in/r/${DEMO.referralCode}`)}`, “_blank”);setWaSent(true);Analytics.track(“share_card_sent”,{platform:“whatsapp”});}} style={{fontSize:14,display:“flex”,alignItems:“center”,justifyContent:“center”,gap:8}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill={C.bg}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
{waSent?“✓ Sent · ₹150 pending”:“Share on WhatsApp”}
</Btn>
<OutlineBtn onClick={()=>{copy(`https://bolt.in/r/${DEMO.referralCode}`,setCopied);Analytics.track(“referral_link_copied”,{location:“share”});}} style={{borderRadius:12,padding:“14px”,fontSize:12}}>
{copied?“✓ Link Copied”:`Copy Referral — bolt.in/r/${DEMO.referralCode}`}
</OutlineBtn>
</div>
<Divider/>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“16px”,marginBottom:20}}>
<div style={{fontSize:9,color:C.dimmer,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>Your Referral Stats</div>
<div style={{display:“flex”,gap:10}}>
{[[“0”,“Referrals”],[“₹0”,“Earned”],[“₹150”,“Per buy”]].map(([v,l])=>(
<div key={l} style={{flex:1,textAlign:“center”}}>
<div style={{fontFamily:F.sans,fontSize:20,fontWeight:800,color:C.amber,marginBottom:4}}>{v}</div>
<div style={{fontFamily:F.sans,fontSize:10,color:C.dimmer}}>{l}</div>
</div>
))}
</div>
</div>
<div style={{textAlign:“center”,padding:“16px 0 8px”}}>
<div style={{fontFamily:F.sans,fontSize:16,fontWeight:800,color:C.amber,letterSpacing:1,marginBottom:4}}>⚡ bolt</div>
<div style={{fontFamily:F.sans,fontSize:9,color:”#2a2a2a”,letterSpacing:2}}>YOUR NEXT MOVE, BUILT</div>
</div>
<OutlineBtn onClick={()=>{setView(V.LANDING);setQIdx(0);setAnswers({});setChosenIdx(0);setPromptBought(false);setBundleBought(false);setWaSent(false);setMobileInput(””);setOtpInput(””);}} style={{borderRadius:10,marginBottom:10}}>← Start Over</OutlineBtn>
<button onClick={()=>setShowAdmin(true)} style={{width:“100%”,background:“none”,border:`1px solid ${C.border}`,borderRadius:10,padding:“10px”,color:C.dimmer,fontSize:12,cursor:“pointer”,fontFamily:F.sans,marginBottom:8}}>View Analytics Dashboard</button>
<div style={{height:40}}/>
</Pad>
{showAdmin&&<AdminDashboard onClose={()=>setShowAdmin(false)} mobile={mobile}/>}
</Phone>
);



return null;
}