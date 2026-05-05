import { useState, useEffect, useRef } from ‘react’;
import { motion, useScroll, useSpring, AnimatePresence } from ‘framer-motion’;

// — FONTS —
(()=>{
if(typeof document===“undefined”||document.getElementById(“bolt-fonts”))return;
const l=document.createElement(“link”);l.id=“bolt-fonts”;l.rel=“stylesheet”;
l.href=“https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap”;
document.head.appendChild(l);
})();

// — DESIGN TOKENS —
const C = {
bg:”#fdfaf6”,surface:”#f7f3ee”,surface2:”#f0ebe4”,border:”#e8e0d5”,border2:”#d4c9ba”,
text:”#1a1612”,muted:”#6b5f52”,dim:”#a89a8c”,dimmer:”#c5b8aa”,
amber:”#c9893f”,green:”#2d7a4f”,blue:”#2d6b8a”,red:”#c0392b”,
purple:”#7b5ea7”,teal:”#2a8a7a”,pink:”#b5536a”,wa:”#25d366”
};
const F = { serif:”‘Playfair Display’,Georgia,serif”, sans:“Inter,-apple-system,sans-serif” };

const CI = {
bg:”#fdfaf6”,surface:”#f7f3ee”,border:”#e8e0d5”,
text:”#1a1612”,muted:”#6b5f52”,dim:”#a89a8c”,
accent:”#c9893f”,accentLight:”#f5e6d0”,white:”#ffffff”,
};
const FI = { serif:”‘Playfair Display’,Georgia,serif”, sans:“Inter,-apple-system,sans-serif” };

(()=>{
if(typeof document===“undefined”||document.getElementById(“bolt-in-styles”))return;
const s=document.createElement(“style”);s.id=“bolt-in-styles”;
s.textContent=`@keyframes morphShape{0%,100%{border-radius:62% 38% 46% 54%/60% 44% 56% 40%}25%{border-radius:44% 56% 54% 46%/38% 62% 38% 62%}50%{border-radius:52% 48% 38% 62%/54% 46% 54% 46%}75%{border-radius:38% 62% 48% 52%/46% 54% 46% 54%}} @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.15)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes loadBar{0%{width:0%}60%{width:85%}100%{width:95%}} *{box-sizing:border-box;-webkit-tap-highlight-color:transparent} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#d4c9ba}`;
document.head.appendChild(s);
})();

// — SUPABASE CLIENT (bolt-prod project) —
const SUPABASE_URL = “https://fosbycemrnljhjfjlnad.supabase.co”;
const SUPABASE_ANON = “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvc2J5Y2Vtcm5samhqZmpsbmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzY0NzIsImV4cCI6MjA5MzI1MjQ3Mn0.l8i6YyUzqQHppdSNbzmAhhw6JyoS_v6lg2NnWQKRl2U”;

const sb = {
async query(table, method=“GET”, body=null, params=””) {
const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
const res = await fetch(url, {
method,
headers: {
“apikey”: SUPABASE_ANON,
“Authorization”: `Bearer ${SUPABASE_ANON}`,
“Content-Type”: “application/json”,
“Prefer”: method===“POST” ? “return=representation” : “return=minimal”,
},
body: body ? JSON.stringify(body) : null,
});
if (!res.ok) { const err = await res.text(); console.error(“SB error”, err); return null; }
try { return await res.json(); } catch { return null; }
},
select: (table, params=””) => sb.query(table, “GET”, null, params),
insert: (table, body) => sb.query(table, “POST”, body),
upsert: (table, body) => sb.query(table, “POST”, body, “?on_conflict=mobile_number”),
update: (table, body, params) => sb.query(table, “PATCH”, body, params),
};

/*
=== PASTE THIS INTO SUPABASE SQL EDITOR (bolt-prod) ===

create table users (
mobile_number text primary key,
country_code text default ‘in’,
created_at timestamptz default now(),
referral_code text unique,
referred_by text,
retake_count integer default 0,
ab_test_cell text,
utm_source text,
utm_campaign text,
utm_content text
);

create table blueprints (
blueprint_id uuid primary key default gen_random_uuid(),
mobile_number text references users,
blueprint_number integer,
created_at timestamptz default now(),
country_code text,
quiz_answers jsonb,
ai_output jsonb,
readiness_score integer,
chosen_idea_index integer,
chosen_idea_title text,
positioning text,
hard_truths jsonb,
distribution_path text,
first_client_script text,
week1_plan jsonb,
week2_plan text,
week3_plan text,
week4_plan text,
niche_match text,
ab_test_cell text,
utm_source text,
is_retake boolean default false
);

create table purchases (
purchase_id uuid primary key default gen_random_uuid(),
mobile_number text references users,
blueprint_id uuid references blueprints,
product text,
amount integer,
currency text default ‘INR’,
country_code text default ‘in’,
razorpay_id text,
status text,
created_at timestamptz default now()
);

create table prompts (
prompt_id uuid primary key default gen_random_uuid(),
mobile_number text references users,
blueprint_id uuid references blueprints,
prompt_type text,
prompt_text text,
last_copied_at timestamptz,
copy_count integer default 0,
created_at timestamptz default now()
);

create table events (
event_id uuid primary key default gen_random_uuid(),
mobile_number text,
blueprint_id uuid,
event_type text,
event_data jsonb,
created_at timestamptz default now(),
session_id text,
ab_test_cell text,
country_code text,
utm_source text,
utm_campaign text
);
*/

// — A/B TEST —
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

// — UTM —
const getUTM = () => {
const p = new URLSearchParams(window.location.search);
return { source:p.get(‘utm_source’)||‘direct’, campaign:p.get(‘utm_campaign’)||‘generic’, content:p.get(‘utm_content’)||null };
};
const UTM_NICHE_MAP = {
growth_marketing:‘digital_marketing’, performance_marketing:‘digital_marketing’, paid_media:‘digital_marketing’,
finance:‘finance_consulting’, ca:‘finance_consulting’, cfo:‘finance_consulting’,
hr:‘coaching’, people:‘coaching’, product:‘dev_tech’, tech:‘dev_tech’,
content:‘content_creation’, supply_chain:‘ecommerce’, operations:‘ecommerce’,
};

// — ANALYTICS —
const Analytics = {
sessionId: Math.random().toString(36).slice(2),
events: [],
track(type, data={}) {
const utm = getUTM();
const e = {
event_type:type, event_data:data,
created_at:new Date().toISOString(),
session_id:this.sessionId,
ab_test_cell:localStorage.getItem(“bolt_ab_cell”)||“A”,
mobile_number:localStorage.getItem(“bolt_mobile”)||null,
utm_source:utm.source, utm_campaign:utm.campaign,
country_code:‘in’,
};
this.events.push(e);
sb.insert(“events”, e);
return e;
},
getSummary() {
const e = this.events;
return {
total_events: e.length,
screens_viewed: […new Set(e.filter(x=>x.event_type===“screen_viewed”).map(x=>x.event_data.screen))],
chosen_idea: e.find(x=>x.event_type===“idea_chosen”)?.event_data?.idea_title||null,
script_copied: e.some(x=>x.event_type===“script_copied”),
prompt_pack_converted: e.some(x=>x.event_type===“prompt_pack_converted”),
full_bundle_converted: e.some(x=>x.event_type===“full_bundle_converted”),
share_card_sent: e.some(x=>x.event_type===“share_card_sent”),
};
}
};

// — USER STATE (localStorage + Supabase sync) —
const UserState = {
get(m){ const d=localStorage.getItem(`bolt_user_${m}`); return d?JSON.parse(d):null; },
set(m,d){ localStorage.setItem(`bolt_user_${m}`,JSON.stringify({…d,_ts:Date.now()})); localStorage.setItem(“bolt_mobile”,m); },
isStale(m){ const u=this.get(m); return !u?true:(Date.now()-(u._ts||0))>86400000; },
getRetakeCount(m){ return this.get(m)?.retake_count||0; },
incrementRetake(m){ const u=this.get(m)||{mobile_number:m,retake_count:0,blueprints:[]}; u.retake_count=(u.retake_count||0)+1; this.set(m,u); sb.update(“users”,{retake_count:u.retake_count},`?mobile_number=eq.${m}`); return u.retake_count; },
saveBlueprint(m,bp){
const u=this.get(m)||{mobile_number:m,retake_count:0,blueprints:[]};
if(!u.blueprints)u.blueprints=[];
const entry={…bp,saved_at:new Date().toISOString()};
u.blueprints.push(entry);
this.set(m,u);
sb.insert(“blueprints”,{
mobile_number:m,
blueprint_number:bp.blueprintNumber,
readiness_score:bp.score,
chosen_idea_title:bp.ideas?.[0]?.title||null,
positioning:bp.positioning,
quiz_answers:u.quiz_answers||{},
ai_output:bp,
week1_plan:bp.week1,
week2_plan:bp.week2,
week3_plan:bp.week3,
week4_plan:bp.week4,
country_code:‘in’,
ab_test_cell:localStorage.getItem(“bolt_ab_cell”)||“A”,
utm_source:getUTM().source,
});
},
getBlueprints(m){ return this.get(m)?.blueprints||[]; },
savePrompts(m,prompts){ const u=this.get(m)||{mobile_number:m,retake_count:0,blueprints:[]}; u.prompts=prompts; this.set(m,u); },
getPrompts(m){ return this.get(m)?.prompts||[]; },
updatePromptCopy(m,promptId){
const u=this.get(m); if(!u?.prompts)return;
const p=u.prompts.find(x=>x.id===promptId);
if(p){ p.copy_count=(p.copy_count||0)+1; p.last_copied_at=new Date().toISOString(); this.set(m,u); }
},
async syncFromSupabase(m){
const data = await sb.select(“users”,`?mobile_number=eq.${m}&select=*`);
if(data?.[0]){ const u=this.get(m)||{}; this.set(m,{…u,…data[0]}); }
},
async createUser(m,abCell){
const utm=getUTM();
const referralCode=`BOLT-${m.slice(-4).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}`;
const user={ mobile_number:m, referral_code:referralCode, retake_count:0, ab_test_cell:abCell, utm_source:utm.source, utm_campaign:utm.campaign, utm_content:utm.content, country_code:‘in’ };
this.set(m,{…user,blueprints:[]});
await sb.insert(“users”, user);
return user;
}
};

// — GENERATE PROMPTS —
const generatePrompts = (idea, answers) => [
{ id:‘landing’,  title:‘Landing Page’,      prompt:`Write a landing page for "${idea.title}" targeting ${answers.audience||'senior professionals'}.\nPositioning: their expertise in ${answers.expertise||'their field'}. Key benefit: ${idea.monthly}/month.\nInclude: headline, 3 benefit bullets, social proof placeholder, CTA.` },
{ id:‘audit’,    title:‘Audit Report’,      prompt:`Write a structured "${idea.title}" audit report template for ${answers.expertise||'my niche'}.\nInclude: executive summary, 5 diagnostic sections, scoring rubric, recommended next steps.\nCalibrated for ${answers.experience||'10'}+ years of expertise.` },
{ id:‘objection’,title:‘Objection Handler’, prompt:`Write responses to the 5 most common objections when selling "${idea.title}" to ${answers.audience||'my audience'}.\nTone: confident, not defensive. Each response under 3 sentences.` },
{ id:‘ad’,       title:‘Ad Creative’,       prompt:`Write 3 Meta ad variations for "${idea.title}" targeting ${answers.audience||'professionals'}.\nHook styles: pain, aspiration, social proof.\nPrimary text under 125 characters each.` },
{ id:‘proposal’, title:‘Proposal Email’,    prompt:`Write a proposal email for "${idea.title}" at ${idea.monthly}/month.\nRecipient: ${answers.audience||'potential client'}. From: ${answers.experience||'10'}-year professional.\nInclude: problem, approach, deliverable, price, next step. Under 200 words.` },
{ id:‘loom’,     title:‘Loom Script’,       prompt:`Write a 3-minute Loom video script for "${idea.title}".\nPurpose: send to warm lead before sales call.\nStructure: problem 30s, approach 60s, proof 45s, offer 30s, CTA 15s.` },
].map(p=>({…p, copy_count:0, last_copied_at:null, created_at:new Date().toISOString()}));

// — NICHE DATA —
const NICHES_DATA = {
digital_marketing:{ id:“digital_marketing”,label:“Digital Marketing”,color:C.amber,marketCrore:18000,practitioners:2100000,growthYoY:30,avgMonthlyIncome:{entry:25000,mid:85000,senior:250000},entryBarrier:“Low”,timeToFirstRupee:“1-2 weeks”,saturation:“Crowded”,bestChannel:“LinkedIn DMs + Meta retargeting”,topModels:[“Paid ads management”,“Strategy consulting”,“Audits & diagnostics”],indiaInsight:“India’s digital ad spend crossed Rs.40,800 Cr in FY25 - growing 29% YoY. Brands are spending but most can’t measure ROI. That gap is the opportunity.”,scoreBreakdown:{expertise:18,timeViability:14,distribution:16,modelFit:17,execution:13},x:42,y:55,r:82 },
dev_tech:{ id:“dev_tech”,label:“Tech & Dev”,color:C.green,marketCrore:52000,practitioners:3200000,growthYoY:28,avgMonthlyIncome:{entry:40000,mid:120000,senior:400000},entryBarrier:“Medium”,timeToFirstRupee:“2-3 weeks”,saturation:“Competitive”,bestChannel:“Upwork + LinkedIn + referrals”,topModels:[“Freelance development”,“SaaS tools”,“Tech audits”],indiaInsight:“India produces 1.5M engineers/year. Generalist devs are commoditised - specialists in AI/ML/Web3 command 3-5x premiums.”,scoreBreakdown:{expertise:16,timeViability:15,distribution:14,modelFit:18,execution:12},x:68,y:40,r:105 },
content_creation:{ id:“content_creation”,label:“Content Creation”,color:C.red,marketCrore:21000,practitioners:4100000,growthYoY:45,avgMonthlyIncome:{entry:15000,mid:60000,senior:300000},entryBarrier:“Very Low”,timeToFirstRupee:“3-4 weeks”,saturation:“Saturated”,bestChannel:“Instagram + YouTube + brand deals”,topModels:[“Brand partnerships”,“Digital products”,“Community”],indiaInsight:“Short-form video dominates. Vernacular content has 40% less competition than English.”,scoreBreakdown:{expertise:12,timeViability:10,distribution:14,modelFit:15,execution:11},x:60,y:72,r:95 },
ecommerce:{ id:“ecommerce”,label:“E-commerce”,color:C.teal,marketCrore:86000,practitioners:5600000,growthYoY:22,avgMonthlyIncome:{entry:20000,mid:80000,senior:500000},entryBarrier:“Medium”,timeToFirstRupee:“3-6 weeks”,saturation:“Competitive”,bestChannel:“Amazon/Flipkart + D2C Meta ads”,topModels:[“Private label”,“Reselling”,“D2C brand”],indiaInsight:“Tier 2/3 cities now account for 60%+ of e-commerce growth. Niche categories have lower competition and higher loyalty.”,scoreBreakdown:{expertise:13,timeViability:12,distribution:15,modelFit:14,execution:13},x:80,y:62,r:112 },
edtech_teaching:{ id:“edtech_teaching”,label:“Online Teaching”,color:”#a78bfa”,marketCrore:28000,practitioners:1900000,growthYoY:35,avgMonthlyIncome:{entry:20000,mid:75000,senior:280000},entryBarrier:“Low”,timeToFirstRupee:“2-4 weeks”,saturation:“Growing”,bestChannel:“YouTube funnel + WhatsApp community”,topModels:[“Live cohorts”,“Recorded courses”,“1:1 coaching”],indiaInsight:“Post-BYJU’s collapse, learners trust small independent instructors more than large platforms. Now is the best time to launch.”,scoreBreakdown:{expertise:15,timeViability:13,distribution:14,modelFit:16,execution:12},x:52,y:20,r:88 },
finance_consulting:{ id:“finance_consulting”,label:“Finance & Tax”,color:”#fb923c”,marketCrore:9400,practitioners:890000,growthYoY:18,avgMonthlyIncome:{entry:30000,mid:100000,senior:350000},entryBarrier:“High”,timeToFirstRupee:“3-5 weeks”,saturation:“Undercrowded”,bestChannel:“LinkedIn + CA referral network”,topModels:[“Tax advisory”,“Investment planning”,“CFO-as-a-service”],indiaInsight:“Only 8% of India’s 140M taxpayers use a professional advisor. New tax regimes and startup ecosystem created massive unmet demand.”,scoreBreakdown:{expertise:17,timeViability:14,distribution:13,modelFit:15,execution:14},x:76,y:22,r:58 },
coaching:{ id:“coaching”,label:“Coaching”,color:”#e879f9”,marketCrore:3100,practitioners:720000,growthYoY:40,avgMonthlyIncome:{entry:15000,mid:60000,senior:250000},entryBarrier:“Low”,timeToFirstRupee:“1-2 weeks”,saturation:“Growing”,bestChannel:“LinkedIn personal brand + referrals”,topModels:[“1:1 coaching”,“Group programs”,“Community”],indiaInsight:“Corporate burnout post-pandemic created massive demand for career, leadership, and wellness coaching. ICF-certified coaches charge 2-3x more.”,scoreBreakdown:{expertise:14,timeViability:15,distribution:13,modelFit:16,execution:11},x:28,y:74,r:52 },
design:{ id:“design”,label:“Design”,color:C.pink,marketCrore:6800,practitioners:1600000,growthYoY:25,avgMonthlyIncome:{entry:20000,mid:70000,senior:220000},entryBarrier:“Low”,timeToFirstRupee:“1-2 weeks”,saturation:“Crowded”,bestChannel:“Behance + LinkedIn + Instagram”,topModels:[“Brand design”,“UI/UX”,“Digital templates”],indiaInsight:“UI/UX designers with product sense command 40% premium over pure visual designers.”,scoreBreakdown:{expertise:13,timeViability:14,distribution:15,modelFit:14,execution:12},x:20,y:52,r:65 },
freelance_writing:{ id:“freelance_writing”,label:“Writing”,color:C.blue,marketCrore:4200,practitioners:2800000,growthYoY:20,avgMonthlyIncome:{entry:15000,mid:50000,senior:180000},entryBarrier:“Very Low”,timeToFirstRupee:“1 week”,saturation:“Saturated”,bestChannel:“LinkedIn + cold email to content managers”,topModels:[“B2B content”,“Ghost writing”,“Technical writing”],indiaInsight:“AI has commoditised general writing. Technical writing, financial content, and SaaS documentation earn 2-4x generalists.”,scoreBreakdown:{expertise:11,timeViability:16,distribution:12,modelFit:14,execution:13},x:25,y:32,r:68 },
};

const SCORE_DIMS = [
{ id:“expertise”,    label:“Expertise Depth”,        color:C.amber },
{ id:“timeViability”,label:“Time Viability”,         color:C.green },
{ id:“distribution”, label:“Distribution Readiness”, color:C.blue  },
{ id:“modelFit”,     label:“Income Model Fit”,       color:C.purple},
{ id:“execution”,    label:“Execution History”,      color:C.teal  },
];
const DIM_DESCS = {
expertise:    { high:“Deep, specific expertise that commands premium pricing.”, low:“Broad skill set - niche down further to increase perceived value 3x.”, fix:”‘Marketing’ -> ‘Growth marketing for D2C brands’ -> ‘Meta ads for fashion D2C’. Each step narrows competition and raises your price ceiling.” },
timeViability:{ high:“Your available hours support your income target.”, low:“Your time constraint vs income target requires high-ticket, low-volume only.”, fix:“Either raise your target price (fewer clients, same revenue) or reduce income target for first 90 days and build up.” },
distribution: { high:“Strong network and visibility - fast path to first client.”, low:“Limited warm network - paid ads or community seeding needed before first sale.”, fix:“Build a free lead magnet first - a scorecard, template, or short guide. Run Rs.500/day in ads to it before pitching the paid product.” },
modelFit:     { high:“Your preferred earn mode matches well-proven models in your niche.”, low:“Your preferred earn mode has friction in your niche - consider a hybrid approach.”, fix:“Start with per-project work to validate demand. Once you have 3 paying clients, productize the most repeatable piece.” },
execution:    { high:“Past attempts show learning - you know what to avoid.”, low:“No execution history - the first step will feel harder than it is. Start small.”, fix:“Set a 30-day deadline and a specific failure condition before starting. A defined end-point removes the trap.” },
};

// — QUIZ QUESTIONS —
const QUESTIONS = [
{ id:“expertise”,     q:“What’s your primary professional expertise?”,                                          sub:“Not your job title - what you actually know deeply.”,           type:“text”,       placeholder:“e.g. Growth marketing & paid acquisition, B2B SaaS sales” },
{ id:“differentiator”,q:“What’s the one thing you know that most people in your field don’t?”,                sub:“This becomes your positioning. The sharper, the better.”,       type:“text”,       placeholder:“e.g. Most marketers optimise for clicks. I optimise for post-click revenue.” },
{ id:“experience”,    q:“How many years of experience in this field?”,                                          sub:“Exact number - 10 and 20 years are very different.”,            type:“number”,     placeholder:“17”, suffix:“years” },
{ id:“currentIncome”, q:“Roughly what’s your current monthly take-home?”,                                       sub:“Calibrates the right ambition level.”,                          type:“choice”,     options:[“Under Rs.50,000”,“Rs.50k-Rs.1,00,000”,“Rs.1,00,000-Rs.2,00,000”,“Rs.2,00,000-Rs.3,50,000”,“Rs.3,50,000+”] },
{ id:“targetIncome”,  q:“Monthly income target from this next move?”,                                           sub:“Your actual number - not a bracket.”,                           type:“number”,     placeholder:“300000”, prefix:“Rs.”, suffix:”/ month” },
{ id:“timeline”,      q:“How soon do you want to hit that target?”,                                             sub:“Timeline determines your entire strategy.”,                     type:“choice”,     options:[“Within 3 months”,“6 months is fine”,“Building over 12 months”] },
{ id:“hours”,         q:“Hours per week you can actually commit?”,                                              sub:“Ruthlessly honest - overestimating kills most attempts.”,       type:“choice”,     options:[“1-3 hrs”,“4-7 hrs”,“8-15 hrs”,“15+ hrs”] },
{ id:“hoursWhen”,     q:“When are those hours available?”,                                                      sub:“Async vs live delivery depends on this.”,                       type:“multiselect”,options:[“Early mornings”,“Weekday evenings”,“Weekends”,“Sporadic”] },
{ id:“superpower”,    q:“Last 3 times someone asked for your advice - what did they want to decide?”,          sub:“The more specific, the better.”,                                type:“textarea”,   placeholder:“e.g.\n1. Whether to run Meta or Google ads first\n2. How to evaluate if their agency is performing\n3. How to structure a content funnel” },
{ id:“earnMode”,      q:“Rank how you prefer to earn.”,                                                         sub:“Top two weighted most in your blueprint.”,                      type:“rank”,       options:[{id:“dp”,label:“Digital product”,desc:“Build once, sell repeatedly”},{id:“cohort”,label:“Cohort”,desc:“Teach a group”},{id:“project”,label:“Per-project”,desc:“Deliver, get paid, done”},{id:“retainer”,label:“Retainer”,desc:“Same client, recurring”},{id:“commission”,label:“Commission”,desc:“Earn % on outcomes”}] },
{ id:“audience”,      q:“Describe your ideal client or customer.”,                                              sub:“Their mindset, problem, spending behaviour.”,                   type:“textarea”,   placeholder:“e.g. Founders of D2C brands spending Rs.2L+/month on ads who aren’t seeing the ROI they expected.” },
{ id:“visibility”,    q:“How visible do you want to be?”,                                                       sub:“Choose one - this filters which distribution strategies fit you.”, type:“choice_d”, options:[{v:“active”,l:“Already active online”,d:“Post publicly on LinkedIn/Twitter”},{v:“occasional”,l:“Occasional posting”,d:“Show up but won’t grind content”},{v:“minimal”,l:“Product does the talking”,d:“Minimal personal presence”},{v:“anon”,l:“Fully behind the scenes”,d:“No name, no face”}] },
{ id:“network”,       q:“Do you have a warm professional network you could reach out to this week?”,            sub:“Biggest variable in time-to-first-rupee.”,                      type:“choice_d”,   options:[{v:“warm”,l:“Yes - warm network”,d:“Ex-colleagues, founders I know”},{v:“linkedin”,l:“LinkedIn connections”,d:“Not super warm but reachable”},{v:“cold”,l:“Starting cold”,d:“Will use paid ads”}] },
{ id:“pastFailure”,   q:“What did you try before and what got in the way?”,                                     sub:“Most predictive question on this form.”,                        type:“textarea”,   placeholder:“e.g. Ran a marketing agency. Not enough leverage for valuable profits - too much effort, not enough margin.” },
];

// — DEMO BLUEPRINT —
const DEMO = {
blueprintNumber:347, referralCode:“BOLT-KR347”, score:81, scoreLabel:“Almost Launch-Ready”,
positioning:“I help growth-obsessed founders stop burning money on channels and start building the system that makes every rupee compound.”,
ideas:[
{ title:“Growth Systems Diagnostic”, tagline:“Find out exactly why your digital spend isn’t compounding - in 72 hours.”, monthly:“Rs.1,80,000-Rs.3,00,000”, timeToFirst:“2 weeks”,
fit:“You’ve spent 17 years watching founders confuse channel problems with systems problems. That diagnosis is worth Rs.29,999 as a structured deliverable.”,
hardTruths:[“10 audits at Rs.29,999 = Rs.3L but also 30-35 hours. You have 12-16. Raise prices to Rs.45,000-Rs.50,000 or cap volume at 6 audits.”,“Cold paid traffic to a Rs.30k service needs a trust bridge. A free scorecard as ad entry cuts CPL by 40-60%.”],
distributionPath:“Meta ads -> Free ‘Growth System Scorecard’ -> Results page offers paid diagnostic. CPL Rs.600-900. At 20% conversion, ROAS hits 5x at Rs.45,000.”,
failurePrevention:“Agency = selling time monthly forever. One deliverable, one payment, done. The leverage is pattern recognition - 17 years in 3 hours.”,
firstStep:“Write the 12-question intake form. That IS the product skeleton, trust signal, and ad qualifying mechanism.”,
firstClientScript:“Hey [Name] - quick thought. I keep seeing founders with solid ad budgets whose spend isn’t compounding. Not a channel problem - a systems problem. I’ve built a structured diagnostic for exactly this. 72-hour turnaround, full audit. Worth a look at your setup?” },
{ title:“Growth Systems Playbook”, tagline:“The framework that took 17 years to build. Yours for Rs.7,999.”, monthly:“Rs.80,000-Rs.2,00,000”, timeToFirst:“3-4 weeks”,
fit:“Digital product is your #1 earn mode. Build once, sell forever. Zero ongoing obligation.”,
hardTruths:[“Rs.7,999 to a cold audience needs social proof before it scales. Seed with audit clients first.”,“Rs.3L/month standalone requires ~375 sales/month. Works best as a funnel supplement.”],
distributionPath:“Retarget Scorecard visitors who didn’t convert to audit. CPL Rs.300-500, ROAS 16x+.”,
failurePrevention:“No clients. No retainer. No team. Pure IP leverage.”,
firstStep:“Write the 5-module table of contents. That’s your product scope, landing page, and ad brief.”,
firstClientScript:“Hey [Name] - I packaged my growth systems framework into a Notion playbook. Not a course - a working tool. Rs.7,999. Thought of you specifically.” },
{ title:“Growth Systems Cohort”, tagline:“4 weeks. 15 founders. One system that fixes everything.”, monthly:“Rs.2,50,000-Rs.4,50,000”, timeToFirst:“5-6 weeks”,
fit:“One cohort of 15 at Rs.25,000 = Rs.3.75L. Hard end date. No retainer trap.”,
hardTruths:[“Cohort via cold paid ads rarely hits 5x ROAS without warm audience or webinar funnel.”,“Requires 12-15 hours per cohort. One cohort per 6 weeks max.”],
distributionPath:“LinkedIn ads -> free 90-min webinar -> cohort upsell. Webinar CPL Rs.250-400, conversion 4-6%.”,
failurePrevention:“Hard end date = no scope creep. Teach once to many. Maximum leverage per hour.”,
firstStep:“Map the 4-session curriculum on one page.”,
firstClientScript:“Hey [Name] - running a 4-week cohort for founders who are done guessing at their growth stack. Rs.25,000 per seat. I think you’d get outsized value.” },
],
week1:[“Day 1-2: Write the 12-question intake form and audit template”,“Day 3-4: Do one free audit for a warm contact. Record the Loom.”,“Day 5-7: Refine template. Write 5 targeted outreach messages.”],
week2:“Set Razorpay at Rs.29,999. Send 5 outreach messages. Convert 1-2 to beta audits.”,
week3:“Raise to Rs.45,000. Post once on LinkedIn - systems POV, no pitch. Begin Playbook ToC.”,
week4:“Build Tally intake form. Cap at 6 audits/month. Open cohort waitlist.”,
projectedMonth3:250000,
};

const SAMPLE_BLUEPRINTS = [
{ num:203, score:74, idea:“SaaS Onboarding Audit”,   field:“Product Management - 9 yrs”,    monthly:“Rs.1,20,000-Rs.2,00,000” },
{ num:289, score:88, idea:“Finance Systems Playbook”, field:“CA & Tax Strategy - 14 yrs”,    monthly:“Rs.80,000-Rs.1,80,000”   },
{ num:312, score:91, idea:“D2C Growth Sprint”,        field:“E-commerce Marketing - 11 yrs”, monthly:“Rs.2,00,000-Rs.3,50,000” },
{ num:156, score:67, idea:“HR Tech Consulting”,       field:“People & Culture - 12 yrs”,     monthly:“Rs.90,000-Rs.1,50,000”   },
];

// — VIEWS —
const V = {
LANDING:“landing”, MOBILE:“mobile”, OTP:“otp”, DASHBOARD:“dashboard”,
RETAKE_GATE:“retake_gate”, QUIZ:“quiz”, GENERATING:“generating”,
GATE:“gate”, WELCOME:“welcome”, DECISION:“decision”, COMMITMENT:“commitment”,
ASSESSMENT:“assessment”, FIRSTSTEP:“firststep”, MARKET:“market”,
ROADMAP:“roadmap”, BUNDLE_REVEAL:“bundle_reveal”, SHARE:“share”
};
const SCREEN_ORDER = [V.GATE,V.WELCOME,V.DECISION,V.COMMITMENT,V.ASSESSMENT,V.FIRSTSTEP,V.MARKET,V.ROADMAP,V.SHARE];

// — SHARED UI COMPONENTS —
const Btn = ({ children, onClick, bg=C.amber, color=”#fff”, style={} }) => (
<button onClick={onClick} style={{ width:“100%”,background:bg,border:“none”,borderRadius:12,padding:“16px”,fontSize:15,fontWeight:700,color,cursor:“pointer”,fontFamily:F.sans,letterSpacing:“0.03em”,transition:“all 0.2s”,display:“block”,…style }}>{children}</button>
);
const OutlineBtn = ({ children, onClick, style={} }) => (
<button onClick={onClick} style={{ width:“100%”,background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px”,fontSize:14,color:C.muted,cursor:“pointer”,fontFamily:F.sans,…style }}>{children}</button>
);
const Label = ({ children }) => <div style={{ fontSize:9,letterSpacing:3,color:C.amber,textTransform:“uppercase”,marginBottom:8,fontFamily:F.sans }}>{children}</div>;
const Divider = () => <div style={{ height:1,background:C.border,margin:“24px 0” }} />;
const SectionHeader = ({ children }) => <div style={{ fontSize:9,color:C.dim,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:16,fontFamily:F.sans,paddingBottom:10,borderBottom:`1px solid ${C.border}` }}>{children}</div>;
const fmt = n => n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:n;
const fmtRs = n => `Rs.${fmt(n)}`;
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
<circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border2} strokeWidth={size*0.07} />
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
{SCREEN_ORDER.map((_,i)=><div key={i} style={{ width:i===idx?18:6,height:6,borderRadius:99,background:i===idx?C.amber:i<idx?`${C.amber}55`:C.border,transition:“all 0.3s” }} />)}
</div>
);
}

function RankQ({ options, onAnswer }) {
const [items,setItems]=useState(options);
const move=(i,dir)=>{const j=i+dir;if(j<0||j>=items.length)return;const n=[…items];[n[i],n[j]]=[n[j],n[i]];setItems(n);};
return (
<div>
<p style={{ fontSize:12,color:C.dim,marginBottom:12,fontFamily:F.sans }}>Tap up/down to rank - your top two choices count most</p>
<div style={{ display:“flex”,flexDirection:“column”,gap:8,marginBottom:18 }}>
{items.map((item,i)=>(
<div key={item.id} style={{ display:“flex”,gap:12,alignItems:“center”,background:i<2?`${C.amber}18`:C.surface,border:`1px solid ${i<2?C.amber:C.border}`,borderRadius:10,padding:“12px 14px” }}>
<span style={{ fontSize:12,fontWeight:600,color:i<2?C.amber:C.dim,minWidth:20,fontFamily:F.serif }}>{i+1}</span>
<div style={{flex:1}}>
<div style={{ fontSize:14,color:i<2?C.text:C.muted,fontFamily:F.sans,fontWeight:i<2?600:400 }}>{item.label}</div>
<div style={{ fontSize:11,color:C.dim,fontFamily:F.sans,marginTop:2 }}>{item.desc}</div>
</div>
<div style={{display:“flex”,flexDirection:“column”,gap:3}}>
<button onClick={()=>move(i,-1)} disabled={i===0} style={{background:i===0?“transparent”:C.surface2,border:`1px solid ${C.border}`,borderRadius:4,width:28,height:26,cursor:i===0?“default”:“pointer”,color:i===0?C.border:C.muted,fontSize:13,display:“flex”,alignItems:“center”,justifyContent:“center”,padding:0}}>^</button>
<button onClick={()=>move(i,1)} disabled={i===items.length-1} style={{background:i===items.length-1?“transparent”:C.surface2,border:`1px solid ${C.border}`,borderRadius:4,width:28,height:26,cursor:i===items.length-1?“default”:“pointer”,color:i===items.length-1?C.border:C.muted,fontSize:13,display:“flex”,alignItems:“center”,justifyContent:“center”,padding:0}}>v</button>
</div>
</div>
))}
</div>
<Btn onClick={()=>onAnswer(items.slice(0,2).map(x=>x.label).join(”, “))}>Confirm top 2</Btn>
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
{rS>5&&n.label.split(” “).map((l,li,arr)=><text key={li} x={n.x} y={n.y+(li-(arr.length-1)/2)*2.4} textAnchor=“middle” dominantBaseline=“middle” fill=”#fff” fontSize={isU?“2.2”:“1.8”} fontWeight={isU?“700”:“400”} opacity=“0.85” style={{pointerEvents:“none”}}>{l}</text>)}
{isU&&<text x={n.x} y={n.y+rS+3.2} textAnchor="middle" fill={n.color} fontSize="1.9" fontWeight="800">YOUR NICHE</text>}
</g>
);
})}
</svg>
{tip&&<div style={{ position:“fixed”,left:Math.min(tip.x+12,window.innerWidth-190),top:tip.y-50,zIndex:9999,background:C.surface,border:`1px solid ${tip.n.color}55`,borderRadius:10,padding:“10px 14px”,pointerEvents:“none”,minWidth:170,fontFamily:F.sans }}>
<div style={{fontSize:12,fontWeight:700,color:tip.n.color,marginBottom:4}}>{tip.n.label}</div>
<div style={{fontSize:11,color:C.muted,marginBottom:2}}>{fmt(tip.n.practitioners)} practitioners</div>
<div style={{fontSize:11,color:C.muted}}>Rs.{tip.n.marketCrore>=1000?`${(tip.n.marketCrore/1000).toFixed(0)}K`:tip.n.marketCrore} Cr - {tip.n.growthYoY}% growth</div>
<div style={{fontSize:10,color:tip.n.color,marginTop:4}}>Tap for full profile</div>
</div>}
</div>
);
}

function ShareCard({ idea, score=DEMO.score, positioning=DEMO.positioning, blueprintNumber=DEMO.blueprintNumber, mini=false }) {
const sz=mini?50:70;
return (
<div style={{ background:“linear-gradient(135deg,#1a1008,#2a1f0e)”,border:`1px solid ${C.amber}33`,borderRadius:mini?12:16,padding:mini?“14px”:“22px 18px” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,marginBottom:mini?10:16 }}>
<div><div style={{ fontSize:mini?9:10,letterSpacing:3,color:C.amber,textTransform:“uppercase”,fontFamily:F.sans }}>bolt</div><div style={{ fontSize:9,color:C.dimmer,letterSpacing:1,fontFamily:F.sans }}>Blueprint #{blueprintNumber}</div></div>
<ScoreArc score={score} size={sz} />
</div>
{!mini&&<p style={{ fontSize:13,color:”#ccc”,lineHeight:1.6,margin:“0 0 14px”,fontStyle:“italic”,fontFamily:F.serif }}>”{positioning}”</p>}
<div style={{ background:C.surface,border:`1px solid ${C.amber}22`,borderRadius:mini?8:10,padding:mini?“8px 10px”:“10px 12px” }}>
<div style={{ fontSize:9,color:C.amber,letterSpacing:1.5,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans }}>My Next Move</div>
<div style={{ fontSize:mini?12:13,fontWeight:600,color:C.text,fontFamily:F.sans }}>{idea.title}</div>
{!mini&&<div style={{ fontSize:11,color:C.dim,marginTop:2,fontFamily:F.sans }}>{idea.monthly}/month projected</div>}
</div>
{!mini&&<div style={{ fontSize:9,color:”#6b5c45”,textAlign:“center”,marginTop:12,letterSpacing:1,fontFamily:F.sans }}>bolt.in - your next move, built</div>}
</div>
);
}

function NicheSheet({ niche, onClose, isUserNiche }) {
if(!niche)return null;
return (
<div style={{ position:“fixed”,inset:0,background:”#000000cc”,zIndex:10001,display:“flex”,alignItems:“flex-end” }}>
<div style={{ width:“100%”,maxWidth:390,margin:“0 auto”,background:C.bg,borderRadius:“20px 20px 0 0”,padding:“24px 22px 48px”,maxHeight:“90vh”,overflowY:“auto” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,marginBottom:20 }}>
<div>
{isUserNiche&&<div style={{ fontSize:9,color:niche.color,letterSpacing:2,textTransform:“uppercase”,marginBottom:6,fontFamily:F.sans }}>Your Niche</div>}
<h3 style={{ fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,margin:0,fontStyle:“italic” }}>{niche.label}</h3>
</div>
<button onClick={onClose} style={{ background:“none”,border:`1px solid ${C.border2}`,borderRadius:8,padding:“6px 12px”,color:C.dim,cursor:“pointer”,fontFamily:F.sans,fontSize:12 }}>Close</button>
</div>
<div style={{ display:“flex”,gap:8,marginBottom:20 }}>
{[[`Rs.${niche.marketCrore>=1000?`${(niche.marketCrore/1000).toFixed(0)}K`:niche.marketCrore} Cr`,“Market”],[fmt(niche.practitioners),“Practitioners”],[`${niche.growthYoY}%`,“YoY Growth”]].map(([v,l])=>(
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
<div style={{ background:`${niche.color}11`,border:`1px solid ${niche.color}33`,borderRadius:12,padding:“16px” }}>
<div style={{ fontSize:9,color:niche.color,letterSpacing:2,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans }}>India Insight</div>
<p style={{ fontFamily:F.serif,fontSize:14,color:C.text,lineHeight:1.7,margin:0,fontStyle:“italic” }}>{niche.indiaInsight}</p>
</div>
</div>
</div>
);
}

function RadarChart({ scores, size=180 }) {
const cx=size/2,cy=size/2,r=size*0.35,n=SCORE_DIMS.length;
const pt=(i,val,maxR)=>{const a=(i*2*Math.PI/n)-Math.PI/2;const pR=maxR*(val/20);return{x:cx+pR*Math.cos(a),y:cy+pR*Math.sin(a)};};
const lp=i=>{const a=(i*2*Math.PI/n)-Math.PI/2;return{x:cx+(r+22)*Math.cos(a),y:cy+(r+22)*Math.sin(a)};};
const sPts=SCORE_DIMS.map((d,i)=>pt(i,scores[d.id]||0,r));
const pathD=sPts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(” “)+” Z”;
return (
<svg width={size} height={size} style={{ overflow:“visible” }}>
{[0.25,0.5,0.75,1].map(level=>{const pts=SCORE_DIMS.map((_,i)=>pt(i,20*level,r));const d=pts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(” “)+” Z”;return <path key={level} d={d} fill="none" stroke={C.border} strokeWidth="0.5"/>;  })}
{SCORE_DIMS.map((_,i)=>{const o=pt(i,20,r);return<line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke={C.border} strokeWidth="0.5"/>;  })}
<path d={pathD} fill={`${C.amber}22`} stroke={C.amber} strokeWidth=“1.5”/>
{sPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3" fill={SCORE_DIMS[i].color}/>)}
{SCORE_DIMS.map((d,i)=>{const p=lp(i);return(<text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={d.color} fontSize="8" fontWeight="700" fontFamily={F.sans}>{d.label.split(” “).map((w,wi,arr)=><tspan key={wi} x={p.x} dy={wi===0?`${-(arr.length-1)*5}`:“10”}>{w}</tspan>)}</text>);})}
</svg>
);
}

// — DASHBOARD SCREEN —
function Dashboard({ mobile, onRetake, onGoBlueprint }) {
const [tab,setTab]=useState(“blueprint”);
const [expandedHardTruth,setExpandedHardTruth]=useState(false);
const [copiedPromptId,setCopiedPromptId]=useState(null);
const [viewBpIdx,setViewBpIdx]=useState(null);

const userData = UserState.get(mobile);
const blueprints = UserState.getBlueprints(mobile);
const prompts = UserState.getPrompts(mobile);
const latestBp = viewBpIdx!==null ? blueprints[viewBpIdx] : blueprints[blueprints.length-1];
const idea = latestBp?.ideas?.[latestBp.chosen_idea_index||0]||latestBp?.ideas?.[0];

const copyPrompt = (p) => {
navigator.clipboard?.writeText(p.prompt).catch(()=>{});
setCopiedPromptId(p.id);
UserState.updatePromptCopy(mobile, p.id);
setTimeout(()=>setCopiedPromptId(null),2500);
};

const tabs = [
{ id:“blueprint”, label:“My Blueprint” },
{ id:“prompts”,   label:“My Prompts”, hidden:prompts.length===0 },
{ id:“history”,   label:“History” },
];

return (
<div style={{ minHeight:“100vh”,background:C.bg,display:“flex”,justifyContent:“center” }}>
<div style={{ width:“100%”,maxWidth:390,minHeight:“100vh”,background:C.bg,display:“flex”,flexDirection:“column” }}>

```
    {/* Header */}
    <div style={{ padding:"20px 22px 0",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:C.bg,zIndex:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:800,color:C.amber,fontFamily:F.sans }}>bolt</div>
          <div style={{ fontSize:10,color:C.dimmer,letterSpacing:1.5,fontFamily:F.sans }}>YOUR NEXT MOVE</div>
        </div>
        <div style={{ fontSize:10,color:C.dim,fontFamily:F.sans }}>Blueprint #{latestBp?.blueprintNumber||"--"}</div>
      </div>
      <div style={{ display:"flex",gap:0,borderBottom:"none" }}>
        {tabs.filter(t=>!t.hidden).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none",border:"none",borderBottom:tab===t.id?`2px solid ${C.amber}`:"2px solid transparent",padding:"8px 14px",color:tab===t.id?C.amber:C.dim,fontSize:12,cursor:"pointer",fontFamily:F.sans,fontWeight:tab===t.id?700:400,whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>

    <div style={{ flex:1,overflowY:"auto",padding:"20px 22px" }}>

      {/* --- TAB: MY BLUEPRINT --- */}
      {tab==="blueprint"&&(
        <div>
          {!latestBp&&(
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <div style={{ fontSize:32,marginBottom:16 }}>--</div>
              <p style={{ fontFamily:F.sans,fontSize:14,color:C.dim }}>No blueprint yet.</p>
              <Btn onClick={onGoBlueprint} style={{ marginTop:20 }}>Build My Blueprint</Btn>
            </div>
          )}
          {latestBp&&idea&&(
            <div>
              <div style={{ textAlign:"center",marginBottom:20 }}>
                <ScoreArc score={latestBp.score} size={120}/>
                <div style={{ fontSize:11,color:latestBp.score>=70?C.green:C.amber,letterSpacing:2,textTransform:"uppercase",marginTop:8,fontFamily:F.sans }}>{latestBp.scoreLabel||"Blueprint Ready"}</div>
              </div>

              {/* Chosen idea */}
              <div style={{ background:`${C.amber}10`,border:`1px solid ${C.amber}33`,borderRadius:14,padding:"18px",marginBottom:16 }}>
                <div style={{ fontSize:9,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontFamily:F.sans }}>Your Chosen Move</div>
                <div style={{ fontFamily:F.sans,fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>{idea.title}</div>
                <div style={{ fontFamily:F.serif,fontSize:13,color:C.muted,fontStyle:"italic",marginBottom:12,lineHeight:1.5 }}>{idea.tagline}</div>
                <div style={{ display:"flex",gap:8 }}>
                  <div style={{ flex:1,background:C.surface,borderRadius:8,padding:"8px 10px" }}>
                    <div style={{ fontSize:9,color:C.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:3,fontFamily:F.sans }}>Month 3 target</div>
                    <div style={{ fontSize:13,fontWeight:700,color:C.green,fontFamily:F.sans }}>{idea.monthly}</div>
                  </div>
                  <div style={{ flex:1,background:C.surface,borderRadius:8,padding:"8px 10px" }}>
                    <div style={{ fontSize:9,color:C.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:3,fontFamily:F.sans }}>First client in</div>
                    <div style={{ fontSize:13,fontWeight:700,color:C.blue,fontFamily:F.sans }}>{idea.timeToFirst}</div>
                  </div>
                </div>
              </div>

              {/* Positioning */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:16 }}>
                <div style={{ fontSize:9,color:C.dim,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontFamily:F.sans }}>Your Positioning</div>
                <p style={{ fontFamily:F.serif,fontSize:14,color:C.text,lineHeight:1.65,margin:0,fontStyle:"italic" }}>"{latestBp.positioning}"</p>
              </div>

              {/* Hard truths */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:expandedHardTruth?12:0,cursor:"pointer" }} onClick={()=>setExpandedHardTruth(x=>!x)}>
                  <div style={{ fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",fontFamily:F.sans }}>Hard Truths</div>
                  <span style={{ fontSize:12,color:C.dim }}>{expandedHardTruth?"^":"v"}</span>
                </div>
                {expandedHardTruth&&idea.hardTruths?.map((t,i)=>(
                  <div key={i} style={{ display:"flex",gap:10,marginBottom:10 }}>
                    <span style={{ color:C.red,fontSize:12,flexShrink:0,marginTop:2 }}>-</span>
                    <span style={{ fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Distribution path */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:16 }}>
                <div style={{ fontSize:9,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontFamily:F.sans }}>Distribution Path</div>
                <p style={{ fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:0 }}>{idea.distributionPath}</p>
              </div>

              {/* First client script */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div style={{ fontSize:9,color:C.blue,letterSpacing:2,textTransform:"uppercase",fontFamily:F.sans }}>First Client Script</div>
                  <CopyBtnInline text={idea.firstClientScript} label="Copy" />
                </div>
                <p style={{ fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:0 }}>{idea.firstClientScript}</p>
              </div>

              {/* 30-day roadmap */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:20 }}>
                <div style={{ fontSize:9,color:C.dim,letterSpacing:2,textTransform:"uppercase",marginBottom:14,fontFamily:F.sans }}>30-Day Roadmap</div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10,color:C.green,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,fontFamily:F.sans }}>Week 1 (detailed)</div>
                  {latestBp.week1?.map((t,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,marginBottom:8,alignItems:"flex-start" }}>
                      <div style={{ width:18,height:18,borderRadius:"50%",border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                        <span style={{ fontSize:9,color:C.green,fontFamily:F.sans }}>{i+1}</span>
                      </div>
                      <span style={{ fontFamily:F.sans,fontSize:12,color:C.muted,lineHeight:1.55 }}>{t}</span>
                    </div>
                  ))}
                </div>
                {[["Week 2",latestBp.week2,C.blue],["Week 3",latestBp.week3,C.purple],["Week 4",latestBp.week4,C.amber]].map(([lbl,task,clr])=>(
                  <div key={lbl} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10,color:clr,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4,fontFamily:F.sans,opacity:0.7 }}>{lbl}</div>
                    <p style={{ fontFamily:F.sans,fontSize:12,color:C.dim,lineHeight:1.55,margin:0 }}>{task}</p>
                  </div>
                ))}
              </div>

              <Btn onClick={onRetake} bg={C.surface} color={C.amber} style={{ border:`1px solid ${C.amber}`,marginBottom:10,fontWeight:600 }}>
                Retake Blueprint
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* --- TAB: MY PROMPTS --- */}
      {tab==="prompts"&&(
        <div>
          {prompts.length===0&&(
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <p style={{ fontFamily:F.sans,fontSize:14,color:C.dim }}>Purchase the Prompt Pack to unlock your 6 custom prompts.</p>
            </div>
          )}
          {prompts.map(p=>(
            <div key={p.id} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <div style={{ fontSize:12,fontWeight:700,color:C.text,fontFamily:F.sans }}>{p.title}</div>
                <button onClick={()=>copyPrompt(p)} style={{ background:copiedPromptId===p.id?C.green:C.amber,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F.sans,transition:"background 0.2s" }}>
                  {copiedPromptId===p.id?"Copied!":"Copy Prompt"}
                </button>
              </div>
              <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px",maxHeight:140,overflowY:"auto",marginBottom:8 }}>
                <p style={{ fontFamily:F.sans,fontSize:12,color:C.muted,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap" }}>{p.prompt}</p>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:10,color:C.dim,fontFamily:F.sans }}>
                  {p.copy_count>0?`Copied ${p.copy_count} time${p.copy_count!==1?"s":""}`:""} 
                </span>
                {p.last_copied_at&&<span style={{ fontSize:10,color:C.dim,fontFamily:F.sans }}>Last copied {new Date(p.last_copied_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB: HISTORY --- */}
      {tab==="history"&&(
        <div>
          {blueprints.length===0&&(
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <p style={{ fontFamily:F.sans,fontSize:14,color:C.dim }}>No blueprints yet.</p>
            </div>
          )}
          {[...blueprints].reverse().map((bp,i)=>{
            const bpIdea=bp.ideas?.[bp.chosen_idea_index||0]||bp.ideas?.[0];
            const realIdx=blueprints.length-1-i;
            return(
              <div key={i} onClick={()=>setViewBpIdx(realIdx)} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:10,cursor:"pointer" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                  <div>
                    <div style={{ fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text,marginBottom:2 }}>Blueprint {realIdx+1}{realIdx===blueprints.length-1?" (latest)":""}</div>
                    <div style={{ fontFamily:F.sans,fontSize:11,color:C.dim }}>{bp.saved_at?new Date(bp.saved_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):""}</div>
                  </div>
                  <ScoreArc score={bp.score||0} size={40}/>
                </div>
                {bpIdea&&<div style={{ fontFamily:F.sans,fontSize:12,color:C.amber }}>{bpIdea.title}</div>}
              </div>
            );
          })}
          {viewBpIdx!==null&&(
            <div style={{ background:`${C.amber}10`,border:`1px solid ${C.amber}33`,borderRadius:10,padding:"12px 14px",marginTop:12 }}>
              <div style={{ fontFamily:F.sans,fontSize:12,color:C.amber,marginBottom:8 }}>Viewing Blueprint {viewBpIdx+1}</div>
              <button onClick={()=>setViewBpIdx(null)} style={{ background:"none",border:`1px solid ${C.border2}`,borderRadius:8,padding:"6px 14px",color:C.dim,cursor:"pointer",fontFamily:F.sans,fontSize:12 }}>Back to latest</button>
            </div>
          )}
          <Divider/>
          <Btn onClick={onRetake} style={{ marginBottom:10 }}>Retake Blueprint</Btn>
        </div>
      )}

    </div>
  </div>
</div>
```

);
}

function CopyBtnInline({ text, label=“Copy” }) {
const [copied,setCopied]=useState(false);
const copy=()=>{ navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); };
return (
<button onClick={copy} style={{ background:copied?C.green:C.amber,color:”#fff”,border:“none”,borderRadius:6,padding:“4px 12px”,fontSize:10,fontWeight:700,cursor:“pointer”,fontFamily:F.sans,transition:“background 0.2s” }}>
{copied?“Copied!”:label}
</button>
);
}

// — INDIA LANDING PAGE —
const fadeUp={hidden:{opacity:0,y:40},show:{opacity:1,y:0}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.12}}};

function Reveal({children,delay=0,style={}}){
return(
<motion.div initial={{opacity:0,y:36}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:”-60px”}} transition={{duration:0.7,ease:[0.22,1,0.36,1],delay}} style={style}>
{children}
</motion.div>
);
}

function INHero({onStart}){
const proofItems=[{l:“Month 3 income”,v:“Rs.2,40,000”},{l:“Hours/week”,v:“7 hrs”},{l:“First client in”,v:“3 weeks”},{l:“Earn mode”,v:“Retainer”}];
return(
<section style={{minHeight:“100vh”,background:CI.bg,display:“flex”,flexDirection:“column”,justifyContent:“center”,alignItems:“center”,padding:“80px 32px 60px”,position:“relative”,overflow:“hidden”,textAlign:“center”}}>
<motion.div style={{position:“absolute”,width:640,height:640,background:`radial-gradient(ellipse,${CI.accentLight} 0%,transparent 70%)`,top:“50%”,left:“50%”,translateX:”-50%”,translateY:”-50%”,pointerEvents:“none”}} animate={{scale:[1,1.06,0.97,1]}} transition={{duration:20,repeat:Infinity,ease:“easeInOut”}} initial={{opacity:0}} whileInView={{opacity:0.65}} viewport={{once:true}}/>
<motion.div style={{position:“relative”,maxWidth:640,zIndex:1}} variants={stagger} initial=“hidden” animate=“show”>
<motion.div variants={fadeUp} transition={{duration:0.8,ease:[0.22,1,0.36,1]}}>
<div style={{display:“inline-block”,background:CI.accentLight,color:CI.accent,fontSize:11,fontFamily:FI.sans,fontWeight:600,letterSpacing:“0.18em”,textTransform:“uppercase”,padding:“6px 16px”,borderRadius:40,marginBottom:40}}>
For Professionals with 10+ Years - By Invitation Only
</div>
</motion.div>
<motion.h1 variants={fadeUp} transition={{duration:0.9,ease:[0.22,1,0.36,1]}} style={{fontFamily:FI.serif,fontSize:“clamp(36px,7vw,62px)”,fontWeight:400,color:CI.text,lineHeight:1.1,letterSpacing:”-0.02em”,marginBottom:24}}>
Your expertise is worth<br/><em style={{fontStyle:“italic”,color:CI.accent}}>Rs.2-8 lakh/month</em><br/>beyond your salary.
</motion.h1>
<motion.p variants={fadeUp} transition={{duration:0.8}} style={{fontFamily:FI.sans,fontSize:17,color:CI.muted,lineHeight:1.75,fontWeight:300,maxWidth:480,margin:“0 auto 36px”}}>
The professionals who cracked this didn’t have more time or better ideas. They had a map. Bolt builds yours in 3 minutes.
</motion.p>
<motion.div variants={fadeUp} style={{background:CI.white,border:`1px solid ${CI.border}`,borderRadius:12,padding:“24px 28px”,maxWidth:420,margin:“0 auto 36px”,textAlign:“left”,boxShadow:“0 4px 40px rgba(0,0,0,0.06)”}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:14}}>
<span style={{fontFamily:FI.sans,fontSize:10,color:CI.dim,letterSpacing:“0.15em”,textTransform:“uppercase”}}>Sample Blueprint</span>
<span style={{fontFamily:FI.sans,fontSize:10,color:CI.accent,background:CI.accentLight,padding:“3px 10px”,borderRadius:20,letterSpacing:“0.06em”,fontWeight:500}}>Score 84 / 100</span>
</div>
<div style={{fontFamily:FI.serif,fontSize:17,fontWeight:500,color:CI.text,marginBottom:3}}>CFO-as-a-Service for D2C Brands</div>
<div style={{fontFamily:FI.sans,fontSize:12,color:CI.dim,marginBottom:20}}>12-year Finance professional - Bengaluru</div>
<div style={{display:“grid”,gridTemplateColumns:“repeat(auto-fit,minmax(120px,1fr))”,gap:“14px 20px”}}>
{proofItems.map(item=>(
<div key={item.l}>
<div style={{fontFamily:FI.sans,fontSize:10,color:CI.dim,marginBottom:3,letterSpacing:“0.06em”,textTransform:“uppercase”}}>{item.l}</div>
<div style={{fontFamily:FI.serif,fontSize:16,fontWeight:500,color:CI.text}}>{item.v}</div>
</div>
))}
</div>
</motion.div>
<motion.div variants={fadeUp}>
<motion.button onClick={onStart}
style={{background:CI.accent,color:”#fff”,border:“none”,borderRadius:12,padding:“20px 52px”,fontFamily:FI.sans,fontSize:15,fontWeight:700,letterSpacing:“0.04em”,cursor:“pointer”,display:“block”,margin:“0 auto”,boxShadow:`0 8px 32px ${CI.accent}44`}}
whileHover={{opacity:0.9,scale:1.03}} whileTap={{scale:0.97}} transition={{duration:0.2}}>
Build my blueprint - free to start
</motion.button>
<p style={{fontFamily:FI.sans,fontSize:12,color:CI.dim,marginTop:14,fontWeight:300,margin:“14px auto 0”}}>3 minutes - No signup - 12,400+ blueprints generated</p>
<p style={{fontFamily:FI.sans,fontSize:12,color:CI.accent,marginTop:8,fontWeight:500}}>Unlock full roadmap for Rs.499 - less than one hour of your billing rate.</p>
</motion.div>
</motion.div>
</section>
);
}

function INShift(){
return(
<section style={{background:CI.surface,padding:“72px 32px”,textAlign:“center”}}>
<Reveal>
<p style={{fontFamily:FI.serif,fontSize:“clamp(24px,4.5vw,44px)”,fontWeight:400,color:CI.text,lineHeight:1.35,maxWidth:720,margin:“0 auto 24px”,letterSpacing:”-0.01em”}}>
“After 10 years, you are not underpaid because you lack skill. You are underpaid because no one has shown you where to point it.”
</p>
</Reveal>
<Reveal delay={0.2}>
<p style={{fontFamily:FI.sans,fontSize:16,color:CI.muted,fontWeight:300,maxWidth:480,margin:“0 auto”}}>Bolt maps your expertise to the income path the market is already buying - and shows you exactly how to reach your first client.</p>
</Reveal>
</section>
);
}

function INJourneyMap(){
const steps=[
{n:“1”,title:“Answer”,sub:“14 questions”,body:“Your expertise, time available, income gap, what you’ve already tried. Takes 3 minutes.”,loop:false},
{n:“2”,title:“Shortlist”,sub:“3 ranked ideas”,body:“Your top income paths ranked by fit - with honest revenue projections and effort estimates for each.”,loop:false},
{n:“3”,title:“Deep dive”,sub:“Action-ready plan”,body:“Choose your best idea. Get pricing, outreach scripts, a 90-day plan, and ready-to-deliver prompts to start this week.”,loop:false},
{n:”*”,title:“Come back”,sub:“Refine & level up”,body:“As you grow, revisit and retake. Most people refine their blueprint within 60 days of their first client.”,loop:true},
];
return(
<section style={{background:CI.bg,padding:“72px 32px”}}>
<div style={{maxWidth:960,margin:“0 auto”}}>
<Reveal>
<div style={{textAlign:“center”,marginBottom:52}}>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(22px,4vw,36px)”,fontWeight:400,color:CI.text,marginBottom:12,letterSpacing:”-0.01em”}}>How close are you to building something real?</h2>
<p style={{fontFamily:FI.sans,fontSize:15,color:CI.muted,fontWeight:300,lineHeight:1.7}}>Four moves. Most people have their first client conversation within 3 weeks of their blueprint.</p>
</div>
</Reveal>
<div style={{display:“grid”,gridTemplateColumns:“repeat(auto-fit,minmax(200px,1fr))”,gap:2}}>
{steps.map((step,i)=>(
<Reveal key={step.n} delay={i*0.12}>
<div style={{background:step.loop?CI.surface:CI.white,border:`1px solid ${CI.border}`,borderRadius:10,padding:“28px 24px”,height:“100%”,boxSizing:“border-box”}}>
<div style={{width:40,height:40,borderRadius:“50%”,background:step.loop?CI.surface:CI.accentLight,border:`1.5px solid ${step.loop?CI.border:CI.accent}`,display:“flex”,alignItems:“center”,justifyContent:“center”,marginBottom:20}}>
<span style={{fontFamily:FI.serif,fontSize:step.loop?20:16,fontWeight:600,color:step.loop?CI.dim:CI.accent}}>{step.n}</span>
</div>
<div style={{fontFamily:FI.sans,fontSize:10,color:step.loop?CI.dim:CI.accent,letterSpacing:“0.14em”,textTransform:“uppercase”,marginBottom:6,fontWeight:500}}>{step.sub}</div>
<h3 style={{fontFamily:FI.serif,fontSize:18,fontWeight:500,color:CI.text,marginBottom:10}}>{step.title}</h3>
<p style={{fontFamily:FI.sans,fontSize:13,color:CI.muted,lineHeight:1.65,margin:0,fontWeight:300}}>{step.body}</p>
</div>
</Reveal>
))}
</div>
</div>
</section>
);
}

function INIsThisForYou(){
const checks=[
“You’ve been in your field for 10+ years and are genuinely good at what you do”,
“You earn Rs.1.5L-Rs.5L/month in salary but your income has a ceiling your skills don’t”,
“You have 5-10 hours a week outside your job that aren’t going anywhere useful”,
“You’ve thought about consulting but never knew exactly how to position or price yourself”,
“You’ve tried freelancing and it felt like trading time for money at junior rates”,
“You want an income stream that leverages your seniority - not just your spare time”,
];
return(
<section style={{background:CI.surface,padding:“72px 32px”}}>
<div style={{maxWidth:680,margin:“0 auto”}}>
<Reveal>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(24px,4vw,38px)”,fontWeight:400,color:CI.text,marginBottom:16,letterSpacing:”-0.01em”,textAlign:“center”}}>Is this for you?</h2>
<p style={{fontFamily:FI.sans,fontSize:15,color:CI.muted,fontWeight:300,marginBottom:40,lineHeight:1.7,textAlign:“center”,maxWidth:480,margin:“0 auto 40px”}}>If three or more of these are true, Bolt was built for you.</p>
</Reveal>
<div style={{display:“flex”,flexDirection:“column”,gap:16}}>
{checks.map((c,i)=>(
<Reveal key={i} delay={i*0.07}>
<div style={{display:“flex”,gap:16,alignItems:“flex-start”}}>
<div style={{width:22,height:22,borderRadius:“50%”,background:CI.accentLight,border:`1px solid ${CI.accent}`,display:“flex”,alignItems:“center”,justifyContent:“center”,flexShrink:0,marginTop:2}}>
<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke={CI.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
</div>
<p style={{fontFamily:FI.sans,fontSize:14,color:CI.text,lineHeight:1.6,margin:0,fontWeight:300}}>{c}</p>
</div>
</Reveal>
))}
</div>
<Reveal delay={0.48}>
<div style={{marginTop:36,padding:“18px 24px”,background:CI.bg,border:`1px solid ${CI.border}`,borderRadius:8,borderLeft:`3px solid ${CI.accent}`}}>
<p style={{fontFamily:FI.sans,fontSize:13,color:CI.muted,margin:0,lineHeight:1.7,fontWeight:300}}>
Bolt is not for early-career professionals looking for quick gigs. It’s for people whose expertise has compounded - and who are ready to make it work for them.
</p>
</div>
</Reveal>
</div>
</section>
);
}

function INWhatBoltDoes(){
const items=[
{label:“NICHE”,title:“Identifies your premium niche”,body:“We map your exact seniority to the specific problem the market already pays a premium to solve - the gap where 10 years of experience becomes an unfair advantage.”},
{label:“NUMBERS”,title:“Shows your real revenue math”,body:“Honest projections built on your actual hours and income gap. Comparable professionals at your level, calibrated to the Indian market. Not inflated promises.”},
{label:“NOW”,title:“Hands you this week’s move”,body:“Word-for-word outreach scripts for your first three clients, plus ready-to-use prompts so you can start delivering value immediately - not after months of preparation.”},
];
return(
<section style={{background:CI.bg,padding:“72px 32px”}}>
<div style={{maxWidth:960,margin:“0 auto”}}>
<Reveal>
<div style={{textAlign:“center”,marginBottom:40}}>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(22px,4vw,36px)”,fontWeight:400,color:CI.text,marginBottom:20,letterSpacing:”-0.01em”}}>What Bolt actually does</h2>
<div style={{display:“flex”,justifyContent:“center”,alignItems:“baseline”,gap:“clamp(10px,2vw,24px)”,flexWrap:“wrap”}}>
{[“NICHE”,“NUMBERS”,“NOW”].map((w,i)=>(
<span key={w} style={{display:“flex”,alignItems:“baseline”,gap:“clamp(10px,2vw,24px)”}}>
<span style={{fontFamily:FI.serif,fontSize:“clamp(20px,3.5vw,34px)”,fontWeight:700,color:CI.accent,letterSpacing:“0.04em”}}>{w}</span>
{i<2&&<span style={{color:CI.dim,fontSize:22,fontWeight:300}}>.</span>}
</span>
))}
</div>
</div>
</Reveal>
<div style={{display:“grid”,gridTemplateColumns:“repeat(auto-fit,minmax(260px,1fr))”,gap:16}}>
{items.map((item,i)=>(
<Reveal key={item.label} delay={i*0.12}>
<div style={{background:CI.surface,border:`1px solid ${CI.border}`,borderRadius:12,padding:“32px 28px”,height:“100%”,boxSizing:“border-box”}}>
<div style={{fontFamily:FI.sans,fontSize:10,color:CI.accent,letterSpacing:“0.18em”,textTransform:“uppercase”,margin:“0 0 8px”,fontWeight:600}}>{item.label}</div>
<h3 style={{fontFamily:FI.serif,fontSize:19,fontWeight:500,color:CI.text,marginBottom:12,lineHeight:1.35}}>{item.title}</h3>
<p style={{fontFamily:FI.sans,fontSize:14,color:CI.muted,lineHeight:1.7,fontWeight:300,margin:0}}>{item.body}</p>
</div>
</Reveal>
))}
</div>
</div>
</section>
);
}

function INSocialProof(){
const stats=[{value:“12,400+”,label:“blueprints generated”},{value:“Rs.1.4L+”,label:“avg. Month 3 - senior profiles”},{value:“3 min”,label:“to your full roadmap”}];
return(
<section style={{background:CI.surface,padding:“56px 32px”}}>
<div style={{maxWidth:720,margin:“0 auto”,display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:32,textAlign:“center”}}>
{stats.map((s,i)=>(
<Reveal key={s.value} delay={i*0.1}>
<div>
<div style={{fontFamily:FI.serif,fontSize:“clamp(32px,5vw,52px)”,fontWeight:500,color:CI.text,letterSpacing:”-0.02em”,lineHeight:1,marginBottom:12}}>{s.value}</div>
<div style={{fontFamily:FI.sans,fontSize:12,color:CI.muted,fontWeight:400,letterSpacing:“0.06em”,textTransform:“uppercase”}}>{s.label}</div>
</div>
</Reveal>
))}
</div>
</section>
);
}

function INTestimonials(){
const quotes=[
{verdict:“1.7L/month. Month three.”,q:“I spent 14 years in supply chain and assumed my only options were consulting or a senior job switch. Bolt told me to productise my expertise into a retainer advisory service. By month three I had two clients at Rs.85,000 each.”,name:“Vikram S.”,loc:“Mumbai - Supply Chain Director, 14 yrs exp”,niche:“Supply Chain”},
{verdict:“First paid client in week four.”,q:“I kept waiting until I felt ‘established enough’. Bolt’s blueprint showed me that my 11 years in growth marketing was already the product. Week one action, first paid client in week four. Rs.1.8 lakh in month three.”,name:“Priya R.”,loc:“Bengaluru - Growth Marketing Lead, 11 yrs exp”,niche:“Digital Marketing”},
{verdict:“A completely different model.”,q:“I thought side income meant weekends on Upwork. Bolt showed me a completely different model - premium advisory to founders in my domain. The specificity of the roadmap meant I never had to guess what to do next.”,name:“Rohit K.”,loc:“Delhi - Product Director, 12 yrs exp”,niche:“Product”},
];
return(
<section style={{background:CI.bg,padding:“72px 32px”}}>
<div style={{maxWidth:860,margin:“0 auto”}}>
<Reveal>
<div style={{display:“flex”,alignItems:“center”,gap:16,marginBottom:48}}>
<div style={{flex:1,height:1,background:CI.border}}/>
<span style={{fontFamily:FI.sans,fontSize:11,color:CI.dim,letterSpacing:“0.15em”,textTransform:“uppercase”,whiteSpace:“nowrap”}}>From people like you</span>
<div style={{flex:1,height:1,background:CI.border}}/>
</div>
</Reveal>
<div style={{display:“flex”,flexDirection:“column”,gap:40}}>
{quotes.map((t,i)=>(
<Reveal key={t.name} delay={i*0.1}>
<div>
<div style={{display:“flex”,gap:10,alignItems:“center”,marginBottom:14}}>
<span style={{fontFamily:FI.sans,fontSize:12,fontWeight:700,color:CI.accent,background:CI.accentLight,padding:“4px 12px”,borderRadius:20}}>{t.verdict}</span>
<span style={{fontFamily:FI.sans,fontSize:10,color:CI.dim,background:CI.surface,border:`1px solid ${CI.border}`,padding:“3px 10px”,borderRadius:20}}>{t.niche}</span>
</div>
<div style={{display:“grid”,gridTemplateColumns:“40px 1fr”,gap:24,alignItems:“start”}}>
<div style={{width:40,height:40,borderRadius:“50%”,background:CI.accentLight,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:FI.serif,fontSize:18,color:CI.accent,marginTop:4}}>”</div>
<div>
<p style={{fontFamily:FI.serif,fontSize:“clamp(17px,2.5vw,22px)”,fontWeight:400,color:CI.text,lineHeight:1.6,margin:“0 0 20px”,letterSpacing:”-0.01em”}}>{t.q}</p>
<div style={{display:“flex”,alignItems:“center”,gap:12}}>
<div style={{width:1,height:24,background:CI.accent}}/>
<div>
<div style={{fontFamily:FI.sans,fontSize:13,fontWeight:500,color:CI.text}}>{t.name}</div>
<div style={{fontFamily:FI.sans,fontSize:12,color:CI.dim,marginTop:2}}>{t.loc}</div>
</div>
</div>
</div>
</div>
</div>
</Reveal>
))}
</div>
</div>
</section>
);
}

function INBlueprintPreview(){
const items=[
{label:“Your matched niche”,value:“Strategic HR Advisory for Series A-C Startups”},
{label:“Profile”,value:“13-year HR Director - Mumbai”},
{label:“Month 1 target”,value:“Rs.60,000-Rs.90,000”},
{label:“Month 3 projection”,value:“Rs.1,80,000-Rs.2,80,000”},
{label:“Hours per week”,value:“6-8 hrs”},
{label:“First client in”,value:“2-3 weeks”},
{label:“First action this week”,value:“Message 5 founder contacts with specific offer”},
{label:“Earn mode”,value:“Monthly retainer”},
];
return(
<section style={{background:CI.surface,padding:“72px 32px”}}>
<div style={{maxWidth:680,margin:“0 auto”}}>
<Reveal>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(24px,4vw,38px)”,fontWeight:400,color:CI.text,marginBottom:12,letterSpacing:”-0.01em”}}>What your blueprint looks like</h2>
<p style={{fontFamily:FI.sans,fontSize:15,color:CI.muted,fontWeight:300,marginBottom:40,lineHeight:1.7}}>A real example for a senior professional. Yours will be built entirely from your answers - including ready-to-action prompts, scripts, and a 90-day plan.</p>
</Reveal>
<Reveal delay={0.15}>
<div style={{background:CI.white,border:`1px solid ${CI.border}`,borderRadius:8,overflow:“hidden”,boxShadow:“0 2px 24px rgba(0,0,0,0.06)”}}>
<div style={{background:CI.accentLight,borderBottom:`1px solid ${CI.border}`,padding:“16px 28px”,display:“flex”,alignItems:“center”,gap:10}}>
<div style={{width:8,height:8,borderRadius:“50%”,background:CI.accent}}/>
<span style={{fontFamily:FI.sans,fontSize:12,color:CI.accent,fontWeight:500,letterSpacing:“0.1em”,textTransform:“uppercase”}}>Your Bolt Blueprint</span>
</div>
<div style={{padding:“8px 0”}}>
{items.map((item,i)=>(
<div key={item.label} style={{display:“flex”,justifyContent:“space-between”,alignItems:“baseline”,padding:“16px 28px”,borderBottom:i<items.length-1?`1px solid ${CI.border}`:“none”,gap:24}}>
<span style={{fontFamily:FI.sans,fontSize:13,color:CI.muted,fontWeight:400,flexShrink:0}}>{item.label}</span>
<span style={{fontFamily:FI.serif,fontSize:16,color:CI.text,fontWeight:400,textAlign:“right”}}>{item.value}</span>
</div>
))}
</div>
<div style={{background:CI.accentLight,padding:“16px 28px”,borderTop:`1px solid ${CI.border}`}}>
<p style={{fontFamily:FI.sans,fontSize:12,color:CI.accent,margin:0,fontWeight:400}}>+ 90-day week-by-week action plan - Ready-to-send outreach scripts - Delivery prompts so you can start helping clients immediately - Income milestone tracker</p>
</div>
</div>
</Reveal>
</div>
</section>
);
}

function INFinalCTA({onStart}){
return(
<section style={{background:CI.text,padding:“100px 32px”,textAlign:“center”}}>
<Reveal>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(30px,6vw,56px)”,fontWeight:400,color:CI.bg,lineHeight:1.15,letterSpacing:”-0.02em”,marginBottom:24}}>
You’ve spent 10 years<br/>building this expertise.<br/><em style={{fontStyle:“italic”,color:CI.accent}}>Time to use it - and get paid doing it.</em>
</h2>
</Reveal>
<Reveal delay={0.2}>
<p style={{fontFamily:FI.sans,fontSize:16,color:”#a89a8c”,fontWeight:300,marginBottom:12,lineHeight:1.7,maxWidth:480,margin:“0 auto 12px”}}>Free to start. Your blueprint is yours to keep. Unlock the full 90-day action plan for Rs.499 when you’re ready.</p>
</Reveal>
<Reveal delay={0.28}>
<div style={{display:“inline-flex”,alignItems:“center”,gap:8,background:“rgba(255,255,255,0.06)”,border:“1px solid rgba(255,255,255,0.1)”,borderRadius:40,padding:“8px 18px”,marginBottom:44}}>
<span style={{width:7,height:7,borderRadius:“50%”,background:C.green,display:“inline-block”,animation:“pulse 2s infinite”}}/>
<span style={{fontFamily:FI.sans,fontSize:12,color:”#c8beb5”,letterSpacing:“0.04em”}}>312 blueprints generated this week</span>
</div>
</Reveal>
<Reveal delay={0.38}>
<motion.button onClick={onStart}
style={{background:CI.accent,color:”#fff”,border:“none”,borderRadius:12,padding:“20px 52px”,fontFamily:FI.sans,fontSize:15,fontWeight:700,letterSpacing:“0.04em”,cursor:“pointer”,display:“block”,margin:“0 auto”,boxShadow:`0 8px 32px ${CI.accent}55`}}
whileHover={{opacity:0.88,scale:1.04}} whileTap={{scale:0.96}} transition={{duration:0.2}}>
Build my blueprint - free to start
</motion.button>
<p style={{fontFamily:FI.sans,fontSize:12,color:”#6b5f52”,marginTop:16,fontWeight:300}}>3 minutes - No signup required</p>
<p style={{fontFamily:FI.sans,fontSize:12,color:CI.accent,marginTop:6,fontWeight:500}}>Rs.499 to unlock your full roadmap - less than a lunch meeting.</p>
</Reveal>
</section>
);
}

function LandingIN({onStart}){
const containerRef=useRef(null);
const {scrollYProgress}=useScroll({container:containerRef});
const scaleX=useSpring(scrollYProgress,{stiffness:100,damping:30,restDelta:0.001});
return(
<div ref={containerRef} style={{background:CI.bg,fontFamily:FI.sans,height:“100vh”,overflowY:“auto”}}>
<motion.div style={{position:“fixed”,top:0,left:0,width:2,height:“100vh”,background:CI.border,zIndex:9999,transformOrigin:“top”}}>
<motion.div style={{position:“absolute”,top:0,left:0,width:“100%”,height:“100%”,background:CI.accent,scaleY:scaleX,transformOrigin:“top”}}/>
</motion.div>
<nav style={{position:“fixed”,top:0,left:0,right:0,height:64,display:“flex”,alignItems:“center”,justifyContent:“space-between”,padding:“0 40px”,background:`${CI.bg}f0`,backdropFilter:“blur(16px)”,zIndex:100,borderBottom:`1px solid ${CI.border}`}}>
<motion.span initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{duration:0.6,delay:0.4}} style={{fontFamily:FI.serif,fontSize:20,fontWeight:500,color:CI.text,letterSpacing:”-0.02em”}}>Bolt</motion.span>
<motion.button onClick={onStart} initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{duration:0.6,delay:0.5}}
style={{background:CI.accent,color:”#fff”,border:“none”,borderRadius:8,padding:“9px 22px”,fontFamily:FI.sans,fontSize:13,fontWeight:700,cursor:“pointer”,boxShadow:`0 4px 16px ${CI.accent}44`}}
whileHover={{opacity:0.88,scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.2}}>
Get started
</motion.button>
</nav>
<div style={{paddingTop:64}}>
<INHero onStart={onStart}/>
<INShift/>
<INJourneyMap/>
<INIsThisForYou/>
<INWhatBoltDoes/>
<INBlueprintPreview/>
<INSocialProof/>
<INTestimonials/>
<INFinalCTA onStart={onStart}/>
</div>
</div>
);
}

// — PHONE WRAPPER —
function Phone({children,noDots,view,topRef}){
return(
<div style={{ minHeight:“100vh”,background:C.bg,display:“flex”,justifyContent:“center” }}>
<div style={{ width:“100%”,maxWidth:390,minHeight:“100vh”,background:C.bg,display:“flex”,flexDirection:“column” }}>
{!noDots&&<Dots view={view}/>}
<div ref={topRef} style={{ flex:1,overflowY:“auto” }}>{children}</div>
</div>
</div>
);
}
function Pad({children}){return <div style={{ padding:“0 22px” }}>{children}</div>;}

// — MAIN APP —
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
const [isIN]=useState(()=>window.location.pathname===”/in”);
const [blueprint,setBlueprint]=useState(null);
// Blueprint counter varied per session for social proof
const [bpCounter]=useState(()=>12400+Math.floor(Math.random()*40)-20);
const topRef=useRef(null);

const abConfig=AB_CELLS[abCell];
const bp=blueprint||DEMO;
const idea=bp.ideas[chosenIdx];
const bundlePrice=Math.round((bp.projectedMonth3*0.02)/100)*100;
const q=QUESTIONS[qIdx];
const utm=getUTM();

useEffect(()=>{ Analytics.track(“screen_viewed”,{screen:view,ab_cell:abCell}); },[view]);

// Returning user detection on load
useEffect(()=>{
const savedMobile=localStorage.getItem(“bolt_mobile”);
if(savedMobile){
const user=UserState.get(savedMobile);
if(user?.blueprints?.length>0){
setMobile(savedMobile);
setRetakeCount(user.retake_count||0);
setView(V.DASHBOARD);
}
}
},[]);

const RESUMABLE=[V.GATE,V.WELCOME,V.DECISION,V.COMMITMENT,V.ASSESSMENT,V.FIRSTSTEP,V.MARKET,V.ROADMAP,V.BUNDLE_REVEAL,V.SHARE];
const go=v=>{
setView(v);
if(mobile&&RESUMABLE.includes(v)){
const u=UserState.get(mobile)||{};
UserState.set(mobile,{…u,last_view:v});
}
setTimeout(()=>topRef.current?.scrollIntoView({behavior:“smooth”}),50);
};
const copy=(txt,set)=>{ navigator.clipboard?.writeText(txt).catch(()=>{}); set(true); setTimeout(()=>set(false),2500); };

const handleMobile=()=>{
const num=mobileInput.replace(/\D/g,””).slice(0,10);
if(num.length<10)return;
const user=UserState.get(num);
setMobile(num);
localStorage.setItem(“bolt_mobile”,num);
Analytics.track(“mobile_submitted”,{});
// Returning user with blueprint -> skip OTP -> Dashboard
if(user?.blueprints?.length>0){
setRetakeCount(user.retake_count||0);
go(V.DASHBOARD);
return;
}
const count=UserState.getRetakeCount(num);
setRetakeCount(count);
if(count>=2) go(V.RETAKE_GATE); else go(V.OTP);
};

const handleOtp=()=>{
if(otpInput.replace(/\D/g,””)!==“1234”){ setOtpError(“Incorrect OTP. Please try again.”); return; }
Analytics.track(“otp_verified”,{mobile});
const existingUser=UserState.get(mobile);
if(!existingUser){ UserState.createUser(mobile,abCell); }
const saved=UserState.get(mobile);
if(saved?.last_view&&RESUMABLE.includes(saved.last_view)&&saved?.last_blueprint){
setBlueprint(saved.last_blueprint);
if(saved.quiz_answers)setAnswers(saved.quiz_answers);
go(saved.last_view);
} else {
Analytics.track(“quiz_started”,{mobile});
go(V.QUIZ);
}
};

const handleQAnswer=val=>{
Analytics.track(“quiz_question_answered”,{question_id:q.id,answer:val});
const up={…answers,[q.id]:val};
setAnswers(up); setTextVal(””); setMultiSel([]);
if(qIdx<QUESTIONS.length-1){ setQIdx(qIdx+1); }
else{
Analytics.track(“quiz_completed”,{mobile});
const u=UserState.get(mobile)||{};
UserState.set(mobile,{…u,quiz_answers:up});
go(V.GENERATING);
fetch(”/api/generate”,{method:“POST”,headers:{“Content-Type”:“application/json”},body:JSON.stringify({answers:up,mobile,abCell,utm})})
.then(r=>r.ok?r.json():Promise.reject(r.status))
.then(generated=>{
setBlueprint(generated);
UserState.saveBlueprint(mobile,generated);
const u2=UserState.get(mobile)||{};
UserState.set(mobile,{…u2,last_blueprint:generated});
go(V.GATE);
})
.catch(()=>{ go(V.GATE); });
}
};

const renderQInput=()=>{
if(q.type===“choice”) return <div style={{display:“flex”,flexDirection:“column”,gap:10}}>{q.options.map(o=><button key={o} onClick={()=>handleQAnswer(o)} style={{background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,textAlign:“left”,color:C.text,fontSize:14,cursor:“pointer”,fontFamily:F.sans,transition:“all 0.15s”}}>{o}</button>)}</div>;
if(q.type===“choice_d”) return <div style={{display:“flex”,flexDirection:“column”,gap:10}}>{q.options.map(o=><button key={o.v} onClick={()=>handleQAnswer(o.l)} style={{background:“transparent”,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,textAlign:“left”,cursor:“pointer”,fontFamily:F.sans}}><div style={{fontSize:14,color:C.text,marginBottom:2}}>{o.l}</div><div style={{fontSize:11,color:C.dim}}>{o.d}</div></button>)}</div>;
if(q.type===“multiselect”) return <div><div style={{display:“flex”,flexDirection:“column”,gap:8,marginBottom:16}}>{q.options.map(o=>{const s=multiSel.includes(o);return<button key={o} onClick={()=>setMultiSel(p=>s?p.filter(x=>x!==o):[…p,o])} style={{background:s?`${C.amber}18`:“transparent”,border:s?`1px solid ${C.amber}`:`1px solid ${C.border2}`,borderRadius:10,padding:“12px 16px”,textAlign:“left”,color:s?C.amber:C.muted,fontSize:14,cursor:“pointer”,fontFamily:F.sans,display:“flex”,gap:10,alignItems:“center”}}><span style={{fontSize:11,opacity:s?1:0.3}}>{s?”*”:”-”}</span>{o}</button>;})}</div><Btn onClick={()=>handleQAnswer(multiSel.join(”, “)||“Flexible”)}>Continue</Btn></div>;
if(q.type===“rank”) return <RankQ options={q.options} onAnswer={handleQAnswer}/>;
if(q.type===“text”) return <div><input value={textVal} onChange={e=>setTextVal(e.target.value)} onKeyDown={e=>e.key===“Enter”&&textVal.trim()&&handleQAnswer(textVal.trim())} placeholder={q.placeholder} style={{width:“100%”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,color:C.text,fontSize:14,fontFamily:F.sans,outline:“none”,marginBottom:14}}/><Btn onClick={()=>textVal.trim()&&handleQAnswer(textVal.trim())}>Continue</Btn></div>;
if(q.type===“number”) return <div><div style={{display:“flex”,alignItems:“center”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,overflow:“hidden”,marginBottom:14,maxWidth:240}}>{q.prefix&&<span style={{padding:“0 14px”,color:C.amber,fontSize:16,background:C.surface2,borderRight:`1px solid ${C.border2}`,alignSelf:“stretch”,display:“flex”,alignItems:“center”,fontFamily:F.sans}}>{q.prefix}</span>}<input type=“number” value={textVal} onChange={e=>setTextVal(e.target.value)} onKeyDown={e=>e.key===“Enter”&&textVal&&handleQAnswer(textVal)} placeholder={q.placeholder} style={{flex:1,background:“transparent”,border:“none”,padding:“14px”,color:C.text,fontSize:16,fontFamily:F.sans,outline:“none”}}/>{q.suffix&&<span style={{padding:“0 12px”,color:C.dim,fontSize:12,background:C.surface2,borderLeft:`1px solid ${C.border2}`,alignSelf:“stretch”,display:“flex”,alignItems:“center”,fontFamily:F.sans}}>{q.suffix}</span>}</div><Btn onClick={()=>textVal&&handleQAnswer(textVal)}>Continue</Btn></div>;
if(q.type===“textarea”) return <div><textarea value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder={q.placeholder} style={{width:“100%”,minHeight:120,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:“14px 16px”,color:C.text,fontSize:13,fontFamily:F.sans,resize:“none”,outline:“none”,lineHeight:1.65,marginBottom:14}}/><Btn onClick={()=>handleQAnswer(textVal.trim()||“Not provided”)}>{textVal.trim()?“Continue”:“Skip”}</Btn></div>;
return null;
};

// — INDIA LANDING ROUTE —
if(isIN&&view===V.LANDING) return <LandingIN onStart={()=>{window.history.pushState({},””,”/”);go(V.MOBILE);}}/>;

// — DASHBOARD —
if(view===V.DASHBOARD) return (
<Dashboard
mobile={mobile}
onRetake={()=>{
if(retakeCount>=2) go(V.RETAKE_GATE);
else { setBlueprint(null);setQIdx(0);setAnswers({});setTextVal(””);setMultiSel([]);go(V.QUIZ); }
}}
onGoBlueprint={()=>go(V.MOBILE)}
/>
);

// — INDIA MOBILE —
if(isIN&&view===V.MOBILE) return(
<div ref={topRef} style={{minHeight:“100vh”,background:CI.bg,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,padding:“40px 32px”}}>
<div style={{width:“100%”,maxWidth:440}}>
<div style={{textAlign:“center”,marginBottom:48}}>
<div style={{fontFamily:FI.serif,fontSize:22,fontWeight:500,color:CI.text,letterSpacing:”-0.02em”,marginBottom:44}}>Bolt</div>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(24px,5vw,34px)”,fontWeight:400,color:CI.text,lineHeight:1.25,margin:“0 0 14px”,letterSpacing:”-0.01em”}}>Save your blueprint with one number.</h2>
<p style={{fontFamily:FI.sans,fontSize:15,color:CI.muted,fontWeight:300,lineHeight:1.7,margin:0}}>Used to save your results and send to WhatsApp. Nothing else.</p>
</div>
<div style={{display:“flex”,background:CI.white,border:`1px solid ${CI.border}`,borderRadius:8,overflow:“hidden”,boxShadow:“0 2px 16px rgba(0,0,0,0.04)”,marginBottom:14}}>
<div style={{padding:“0 16px”,background:CI.surface,borderRight:`1px solid ${CI.border}`,display:“flex”,alignItems:“center”,fontSize:14,color:CI.muted,fontFamily:FI.sans,flexShrink:0}}>+91</div>
<input type=“text” inputMode=“numeric” maxLength={10} value={mobileInput} onChange={e=>setMobileInput(e.target.value)} onKeyDown={e=>e.key===“Enter”&&handleMobile()} placeholder=“10-digit mobile number” style={{flex:1,background:“transparent”,border:“none”,padding:“18px 16px”,color:CI.text,fontSize:16,fontFamily:FI.sans,outline:“none”}}/>
</div>
<motion.button onClick={handleMobile} style={{width:“100%”,background:CI.accent,color:”#fff”,border:“none”,borderRadius:12,padding:“18px”,fontFamily:FI.sans,fontSize:15,fontWeight:700,letterSpacing:“0.04em”,cursor:“pointer”,marginBottom:14,boxShadow:`0 6px 24px ${CI.accent}44`}} whileHover={{opacity:0.88}} whileTap={{scale:0.98}} transition={{duration:0.15}}>Send OTP</motion.button>
<p style={{fontFamily:FI.sans,fontSize:12,color:CI.dim,textAlign:“center”,margin:“0 0 28px”,fontWeight:300}}>No spam. No marketing messages. Ever.</p>
<motion.button onClick={()=>go(V.LANDING)} style={{background:“transparent”,border:`1px solid ${CI.border}`,borderRadius:6,padding:“12px 24px”,fontFamily:FI.sans,fontSize:13,color:CI.muted,cursor:“pointer”,display:“block”,margin:“0 auto”}} whileHover={{borderColor:CI.text,color:CI.text}} transition={{duration:0.15}}>Back</motion.button>
</div>
</div>
);

// — INDIA OTP —
if(isIN&&view===V.OTP) return(
<div ref={topRef} style={{minHeight:“100vh”,background:CI.bg,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,padding:“40px 32px”}}>
<div style={{width:“100%”,maxWidth:440,textAlign:“center”}}>
<div style={{fontFamily:FI.serif,fontSize:22,fontWeight:500,color:CI.text,letterSpacing:”-0.02em”,marginBottom:44}}>Bolt</div>
<div style={{fontSize:36,marginBottom:20}}>–</div>
<h2 style={{fontFamily:FI.serif,fontSize:“clamp(22px,5vw,32px)”,fontWeight:400,color:CI.text,lineHeight:1.25,margin:“0 0 12px”,letterSpacing:”-0.01em”}}>Check your messages.</h2>
<p style={{fontFamily:FI.sans,fontSize:15,color:CI.muted,fontWeight:300,margin:“0 0 36px”,lineHeight:1.7}}>OTP sent to +91 {mobileInput.slice(0,5)}XXXXX</p>
<input type=“text” inputMode=“numeric” maxLength={4} value={otpInput} onChange={e=>{setOtpInput(e.target.value);setOtpError(””);}} onKeyDown={e=>e.key===“Enter”&&handleOtp()} placeholder=”    “ style={{width:“100%”,background:CI.white,border:`1.5px solid ${otpError?"#e53e3e":CI.border}`,borderRadius:8,padding:“20px”,color:CI.text,fontSize:32,fontFamily:FI.serif,outline:“none”,textAlign:“center”,letterSpacing:12,boxShadow:“0 2px 16px rgba(0,0,0,0.04)”,marginBottom:8}}/>
{otpError&&<div style={{fontSize:13,color:”#e53e3e”,marginBottom:12,fontFamily:FI.sans,fontWeight:300}}>{otpError}</div>}
<motion.button onClick={handleOtp} style={{width:“100%”,background:CI.accent,color:”#fff”,border:“none”,borderRadius:12,padding:“18px”,fontFamily:FI.sans,fontSize:15,fontWeight:700,letterSpacing:“0.04em”,cursor:“pointer”,marginTop:8,marginBottom:14,boxShadow:`0 6px 24px ${CI.accent}44`}} whileHover={{opacity:0.88}} whileTap={{scale:0.98}} transition={{duration:0.15}}>Verify and Continue</motion.button>
<motion.button onClick={()=>go(V.MOBILE)} style={{background:“transparent”,border:“none”,padding:“10px”,fontFamily:FI.sans,fontSize:13,color:CI.muted,cursor:“pointer”}} whileHover={{color:CI.text}} transition={{duration:0.15}}>Change number</motion.button>
</div>
</div>
);

// — DARK LANDING (/) —
if(view===V.LANDING) return (
<div style={{ minHeight:“100vh”,background:C.bg,display:“flex”,justifyContent:“center” }}>
<div style={{ width:“100%”,maxWidth:390,minHeight:“100vh”,background:C.bg,paddingBottom:120,position:“relative” }}>

```
    {/* Sticky CTA bar */}
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:390,background:`linear-gradient(to top,${C.bg} 65%,transparent)`,padding:"20px 22px 28px",zIndex:100 }}>
      <Btn onClick={()=>{Analytics.track("cta_clicked",{location:"sticky_bar"});go(V.MOBILE);}} style={{fontSize:16,padding:"18px",boxShadow:`0 8px 32px ${C.amber}55`}}>
        Build My Blueprint - Rs.{abConfig.gatePrice}
      </Btn>
      <div style={{textAlign:"center",marginTop:8,fontSize:12,color:C.dim,fontFamily:F.sans}}>5 min - One-time - 2 free retakes included</div>
    </div>

    <div style={{ padding:"28px 22px 0" }}>

      {/* Nav */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:40 }}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.amber,letterSpacing:1,fontFamily:F.sans}}>bolt</div>
          <div style={{fontSize:9,color:C.dimmer,letterSpacing:2,fontFamily:F.sans}}>YOUR NEXT MOVE, BUILT</div>
        </div>
      </div>

      {/* Hero */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:[0.22,1,0.36,1]}} style={{marginBottom:36}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surface,border:`1px solid ${C.amber}33`,borderRadius:99,padding:"5px 14px",marginBottom:22}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"pulse 2s infinite"}}/>
          <span style={{fontFamily:F.sans,fontSize:11,color:C.amber,letterSpacing:"0.08em"}}>{bpCounter.toLocaleString('en-IN')}+ blueprints built</span>
        </div>
        <div style={{display:"inline-block",background:C.surface,border:`1px solid ${C.amber}22`,borderRadius:99,padding:"4px 14px",marginBottom:16,marginLeft:8}}>
          <span style={{fontFamily:F.sans,fontSize:10,color:C.dim,letterSpacing:"0.1em"}}>For Professionals with 10+ Years - By Invitation Only</span>
        </div>
        <h1 style={{fontFamily:F.serif,fontSize:38,fontWeight:400,color:C.text,lineHeight:1.15,margin:"0 0 20px",fontStyle:"italic"}}>
          {abConfig.hookVariant==="pain"
            ?<>Your expertise is a business.<br/><span style={{color:C.amber}}>You just haven't built it yet.</span></>
            :<>Your next Rs.50,000/month<br/><span style={{color:C.amber}}>is already inside you.</span></>
          }
        </h1>
        <p style={{fontFamily:F.sans,fontSize:15,color:C.muted,lineHeight:1.75,margin:"0 0 8px"}}>14 questions. 5 minutes. A complete income blueprint - 3 ideas, honest hard truths, and your Week 1 action plan - built around your exact expertise and constraints.</p>
        <p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.6,margin:"0 0 12px"}}>Not a course. Not a template. A plan built for you, by AI trained on what actually works in the Indian market.</p>
        <p style={{fontFamily:F.sans,fontSize:13,color:C.amber,lineHeight:1.6,margin:0,fontWeight:600}}>Rs.{abConfig.gatePrice} - one-time. 2 free retakes included. Less than one hour of consulting fees.</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.15}} style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:36}}>
        {[["12,400+","Blueprints"],["Rs.1.4L+","Avg Month 3"],["3 min","To results"]].map(([v,l])=>(
          <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontFamily:F.sans,fontSize:16,fontWeight:800,color:C.amber,marginBottom:3}}>{v}</div>
            <div style={{fontFamily:F.sans,fontSize:10,color:C.dim,letterSpacing:"0.04em"}}>{l}</div>
          </div>
        ))}
      </motion.div>

      {/* Blueprint preview */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.25}} style={{marginBottom:40}}>
        <div style={{animation:"float 4s ease infinite"}}><ShareCard idea={bp.ideas[0]}/></div>
        <div style={{textAlign:"center",marginTop:14}}>
          <span style={{fontSize:11,color:C.amber,background:C.surface,border:`1px solid ${C.amber}33`,borderRadius:99,padding:"6px 16px",fontFamily:F.sans}}>Real output - Blueprint #{bp.blueprintNumber}</span>
        </div>
      </motion.div>

      {/* Is This You */}
      <div style={{marginBottom:40}}>
        <div style={{fontSize:9,letterSpacing:3,color:C.dim,textTransform:"uppercase",marginBottom:20,fontFamily:F.sans}}>Is This You?</div>
        {[
          {n:"01",title:"You have deep expertise - but it's locked inside your job.",sub:"You're the person everyone calls for advice. But you clock out and that knowledge earns nothing extra."},
          {n:"02",title:"You've tried to monetise it. It didn't stick.",sub:"Freelancing felt like another job. A course felt overwhelming. Something got in the way."},
          {n:"03",title:"You have 4-8 hours a week and a clear income goal.",sub:"Not quitting your job. Not grinding 80 hours. Just building something that pays - quietly, on the side."},
        ].map((item,i)=>(
          <motion.div key={i} initial={{opacity:0,x:-16}} whileInView={{opacity:1,x:0}} viewport={{once:true,margin:"-40px"}} transition={{duration:0.5,delay:i*0.08}} style={{display:"flex",gap:16,marginBottom:24,alignItems:"flex-start"}}>
            <div style={{fontFamily:F.sans,fontSize:11,fontWeight:700,color:C.amber,flexShrink:0,marginTop:3}}>{item.n}</div>
            <div>
              <div style={{fontFamily:F.serif,fontSize:16,color:C.text,lineHeight:1.35,marginBottom:6,fontStyle:"italic"}}>{item.title}</div>
              <div style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65}}>{item.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Blueprints */}
      <div style={{marginBottom:40}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:3,color:C.dim,textTransform:"uppercase",fontFamily:F.sans}}>Recent Blueprints</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:11,color:C.amber,fontFamily:F.sans}}>{bpCounter.toLocaleString('en-IN')} built</span>
          </div>
        </div>
        {SAMPLE_BLUEPRINTS.map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-30px"}} transition={{duration:0.45,delay:i*0.07}} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
            <ScoreArc score={s.score} size={46}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:F.sans,fontSize:13,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.idea}</div>
              <div style={{fontFamily:F.sans,fontSize:11,color:C.dim,marginBottom:2}}>{s.field}</div>
              <div style={{fontFamily:F.sans,fontSize:12,color:C.green}}>{s.monthly}/month</div>
            </div>
            <div style={{fontFamily:F.sans,fontSize:10,color:C.border2}}>#{s.num}</div>
          </motion.div>
        ))}
      </div>

      {/* What You Get */}
      <motion.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-40px"}} transition={{duration:0.6}} style={{background:`${C.amber}0d`,border:`1px solid ${C.amber}22`,borderRadius:16,padding:"22px 18px",marginBottom:40}}>
        <div style={{fontSize:9,letterSpacing:3,color:C.amber,textTransform:"uppercase",marginBottom:16,fontFamily:F.sans}}>What You Get - Rs.{abConfig.gatePrice}</div>
        {["3 ideas matched to your exact profile","Honest hard truths per idea - no sugarcoating","Distribution path for your visibility preference","India market map - tap any niche for full data","Your first client outreach script (word-for-word)","Week 1 action plan - specific days and tasks","Shareable blueprint card"].map((f,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
            <span style={{color:C.amber,fontSize:12,flexShrink:0,marginTop:2}}>+</span>
            <span style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.5}}>{f}</span>
          </div>
        ))}
        <Divider/>
        <div style={{fontFamily:F.sans,fontSize:12,color:C.dim,textAlign:"center"}}>Prompt Pack (Rs.{abConfig.promptPrice}) - Full Bundle (Rs.{bundlePrice}) unlockable after</div>
      </motion.div>

      {/* Closing quote */}
      <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true,margin:"-40px"}} transition={{duration:0.8}} style={{textAlign:"center",marginBottom:32,padding:"0 8px"}}>
        <div style={{fontFamily:F.serif,fontSize:22,color:C.text,fontStyle:"italic",marginBottom:10,lineHeight:1.45}}>"Every founder you've met is fighting a channel war. You know it's an architecture problem."</div>
        <div style={{fontFamily:F.sans,fontSize:11,color:C.dim}}>- From Blueprint #{bp.blueprintNumber}</div>
      </motion.div>

    </div>
  </div>
</div>
```

);

// — MOBILE —
if(view===V.MOBILE) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<div style={{padding:“40px 0 32px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:32}}>bolt</div>
<h2 style={{fontFamily:F.serif,fontSize:26,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 12px”,lineHeight:1.3}}>One number to save your blueprint forever.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,lineHeight:1.65,margin:0}}>Used to save your blueprint, manage retakes, and send to WhatsApp. Nothing else.</p>
</div>
<div style={{marginBottom:14}}>
<div style={{display:“flex”,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:12,overflow:“hidden”}}>
<div style={{padding:“0 16px”,background:C.surface2,borderRight:`1px solid ${C.border2}`,display:“flex”,alignItems:“center”,fontSize:14,color:C.muted,fontFamily:F.sans,flexShrink:0}}>+91</div>
<input type=“text” inputMode=“numeric” maxLength={10} value={mobileInput} onChange={e=>setMobileInput(e.target.value)} onKeyDown={e=>e.key===“Enter”&&handleMobile()} placeholder=“10-digit mobile number” style={{flex:1,background:“transparent”,border:“none”,padding:“16px”,color:C.text,fontSize:16,fontFamily:F.sans,outline:“none”}}/>
</div>
</div>
<Btn onClick={handleMobile} style={{marginBottom:14}}>Send OTP</Btn>
<div style={{fontFamily:F.sans,fontSize:12,color:C.dimmer,textAlign:“center”,marginBottom:28,lineHeight:1.6}}>No spam. No marketing messages. Ever.</div>
<OutlineBtn onClick={()=>go(V.LANDING)}>Back</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — OTP —
if(view===V.OTP) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<div style={{padding:“40px 0 32px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:28}}>bolt</div>
<h2 style={{fontFamily:F.serif,fontSize:24,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 10px”}}>Check your messages.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,margin:0}}>OTP sent to +91 {mobileInput.slice(0,5)}XXXXX</p>
</div>
<div style={{marginBottom:14}}>
<input type=“text” inputMode=“numeric” maxLength={4} value={otpInput} onChange={e=>{setOtpInput(e.target.value);setOtpError(””);}} onKeyDown={e=>e.key===“Enter”&&handleOtp()} placeholder=”    “ style={{width:“100%”,background:C.surface,border:`1px solid ${otpError?C.red:C.border2}`,borderRadius:12,padding:“16px”,color:C.text,fontSize:28,fontFamily:F.sans,outline:“none”,textAlign:“center”,letterSpacing:16}}/>
{otpError&&<div style={{fontSize:12,color:C.red,textAlign:“center”,marginTop:8,fontFamily:F.sans}}>{otpError}</div>}
</div>
<Btn onClick={handleOtp} style={{marginBottom:14}}>Verify and Continue</Btn>
<OutlineBtn onClick={()=>go(V.MOBILE)}>Change number</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — RETAKE GATE —
if(view===V.RETAKE_GATE) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<div style={{padding:“40px 0 28px”,textAlign:“center”}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans,marginBottom:28}}>bolt</div>
<h2 style={{fontFamily:F.serif,fontSize:24,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 12px”,lineHeight:1.3}}>A lot can change in 3 months.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.dim,lineHeight:1.65,margin:0}}>Your situation evolved. Your blueprint should too. Rebuild it for Rs.399.</p>
</div>
<div style={{background:`${C.amber}0d`,border:`1px solid ${C.amber}22`,borderRadius:14,padding:“18px”,marginBottom:20}}>
<div style={{fontFamily:F.sans,fontSize:10,color:C.amber,letterSpacing:2,textTransform:“uppercase”,marginBottom:12}}>What You Get</div>
{[“Fresh blueprint based on your updated answers”,“New ideas if your goals have changed”,“Updated 30-day roadmap”,“New first client script”].map(f=>(
<div key={f} style={{display:“flex”,gap:10,marginBottom:8}}><span style={{color:C.amber,fontSize:11}}>+</span><span style={{fontFamily:F.sans,fontSize:13,color:C.muted}}>{f}</span></div>
))}
</div>
<Btn onClick={()=>{Analytics.track(“retake_gate_converted”,{mobile,amount:399});UserState.incrementRetake(mobile);setBlueprint(null);setQIdx(0);setAnswers({});setTextVal(””);setMultiSel([]);go(V.QUIZ);}} style={{marginBottom:12,fontSize:16}}>
Rebuild My Blueprint - Rs.399
</Btn>
<OutlineBtn onClick={()=>go(V.DASHBOARD)}>Back to my blueprint</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — QUIZ —
if(view===V.QUIZ) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<div style={{padding:“20px 0 22px”,display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<div style={{fontSize:14,fontWeight:800,color:C.amber,fontFamily:F.sans}}>bolt</div>
<div style={{fontSize:12,color:C.dimmer,fontFamily:F.sans}}>{qIdx+1} of {QUESTIONS.length} - approx {Math.max(1,Math.round((QUESTIONS.length-qIdx)*0.22))} min remaining</div>
</div>
<div style={{height:3,background:C.border,borderRadius:99,marginBottom:32}}>
<div style={{height:“100%”,borderRadius:99,background:`linear-gradient(90deg,${C.amber},#e8a050)`,width:`${((qIdx+1)/QUESTIONS.length)*100}%`,transition:“width 0.5s cubic-bezier(0.34,1.56,0.64,1)”}}/>
</div>
<div key={qIdx} style={{animation:“fadeUp 0.3s ease”}}>
<h2 style={{fontFamily:F.serif,fontSize:“clamp(19px,5vw,26px)”,fontWeight:400,color:C.text,lineHeight:1.35,margin:“0 0 8px”,fontStyle:“italic”}}>{q.q}</h2>
{q.sub&&<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,margin:“0 0 26px”}}>{q.sub}</p>}
{renderQInput()}
</div>
{qIdx>0&&<OutlineBtn onClick={()=>{setQIdx(qIdx-1);setTextVal(””);setMultiSel([]);}} style={{marginTop:20}}>Back</OutlineBtn>}
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — GENERATING —
if(view===V.GENERATING) return (
<Phone noDots view={view} topRef={topRef}>
<div style={{display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,minHeight:“100vh”,padding:“0 32px”,textAlign:“center”}}>
<div style={{fontSize:40,marginBottom:28,animation:“float 2s ease infinite”}}>*</div>
<h2 style={{fontFamily:F.serif,fontSize:24,fontWeight:400,color:C.text,fontStyle:“italic”,margin:“0 0 12px”,lineHeight:1.3}}>Building your blueprint…</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.7,margin:“0 0 40px”}}>Analysing {QUESTIONS.length} answers.<br/>Calibrating to the Indian market.</p>
<div style={{width:180,height:2,background:C.border,borderRadius:99,overflow:“hidden”}}>
<div style={{height:“100%”,background:`linear-gradient(90deg,${C.amber},#e8a050)`,borderRadius:99,animation:“loadBar 2.5s ease-in-out infinite”}}/>
</div>
</div>
</Phone>
);

// — GATE —
if(view===V.GATE) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 0”,display:“flex”,justifyContent:“space-between”,marginBottom:32}}>
<div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:F.sans}}>bolt</div>
<div style={{fontSize:10,color:C.dimmer,fontFamily:F.sans}}>Blueprint #{bp.blueprintNumber}</div>
</div>
<div style={{textAlign:“center”,marginBottom:28}}>
<ScoreArc score={bp.score} size={140}/>
<div style={{fontSize:11,color:C.green,letterSpacing:3,textTransform:“uppercase”,marginTop:12,fontFamily:F.sans}}>{bp.scoreLabel}</div>
</div>
<div style={{background:`${C.amber}0d`,border:`1px solid ${C.amber}22`,borderRadius:14,padding:“18px 16px”,marginBottom:28}}>
<Label>Your positioning</Label>
<p style={{fontFamily:F.serif,fontSize:15,color:C.text,lineHeight:1.65,margin:0,fontStyle:“italic”}}>”{bp.positioning}”</p>
</div>
<div style={{marginBottom:32}}>
<Label>Your 3 ideas</Label>
{bp.ideas.map((idea,i)=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“14px 16px”,filter:“blur(5px)”,userSelect:“none”,pointerEvents:“none”,marginBottom:8}}>
<div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2,fontFamily:F.sans}}>{idea.title}</div>
<div style={{fontSize:12,color:C.dim,fontFamily:F.sans}}>{idea.monthly}/month</div>
</div>
))}
<div style={{textAlign:“center”,marginTop:10}}><div style={{fontSize:11,color:C.dimmer,fontStyle:“italic”,fontFamily:F.sans}}>Unlock to see your ideas</div></div>
</div>
<Btn onClick={()=>{Analytics.track(“gate_converted”,{mobile,amount:abConfig.gatePrice,ab_cell:abCell});UserState.incrementRetake(mobile);go(V.WELCOME);}} style={{fontSize:16,marginBottom:10,boxShadow:`0 8px 32px ${C.amber}44`}}>
Unlock My Blueprint - Rs.{abConfig.gatePrice}
</Btn>
<div style={{textAlign:“center”,fontSize:11,color:C.dimmer,fontFamily:F.sans,marginBottom:14}}>One-time - 2 free retakes included</div>
<OutlineBtn onClick={()=>{setBlueprint(null);setQIdx(0);setAnswers({});setTextVal(””);setMultiSel([]);go(V.QUIZ);}}>Redo Quiz</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — WELCOME —
if(view===V.WELCOME) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{textAlign:“center”,padding:“32px 0 24px”}}>
<div style={{fontSize:9,letterSpacing:3,color:C.amber,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>bolt</div>
<div style={{fontSize:52,fontWeight:800,color:C.text,lineHeight:1,marginBottom:6,fontFamily:F.sans}}>#{bp.blueprintNumber}</div>
<div style={{fontSize:12,color:C.dim,letterSpacing:1,fontFamily:F.sans}}>Your Blueprint Number</div>
</div>
<div style={{background:`${C.wa}11`,border:`1px solid ${C.wa}33`,borderRadius:16,padding:“20px 16px”,marginBottom:22}}>
<div style={{fontSize:13,fontWeight:700,color:C.wa,fontFamily:F.sans,marginBottom:10}}>Share your link. Earn Rs.150 cashback.</div>
<p style={{fontSize:13,color:C.muted,lineHeight:1.6,margin:“0 0 12px”,fontFamily:F.sans}}>Every time someone buys using your link, Rs.150 comes back to you. No cap.</p>
<div style={{background:C.surface,borderRadius:8,padding:“10px 12px”,marginBottom:12,display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<span style={{fontSize:11,color:C.green,fontFamily:“monospace”}}>bolt.in/r/{bp.referralCode}</span>
<button onClick={()=>{copy(`https://bolt.in/r/${bp.referralCode}`,setCopied);Analytics.track(“referral_link_copied”,{location:“welcome”});}} style={{background:“none”,border:`1px solid ${C.wa}44`,borderRadius:6,padding:“4px 10px”,color:C.wa,fontSize:11,cursor:“pointer”,fontFamily:F.sans}}>{copied?“Copied”:“Copy”}</button>
</div>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`Just built my Blueprint on Bolt - mapped my next income move in 5 mins. Blueprint #${bp.blueprintNumber}. Get yours: https://bolt.in/r/${bp.referralCode}`)}`, “_blank”);Analytics.track(“referral_share_sent”,{platform:“whatsapp”,location:“welcome”});}} style={{fontSize:13,padding:“12px”}}>
Share on WhatsApp
</Btn>
</div>
<Btn onClick={()=>go(V.DECISION)}>See My 3 Ideas</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — DECISION —
if(view===V.DECISION) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 20px”}}>
<Label>Your 3 Ideas</Label>
<h2 style={{fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,lineHeight:1.3,margin:0,fontStyle:“italic”}}>One pulls harder than the others. Which one?</h2>
</div>
<div style={{background:`${C.amber}0d`,border:`1px solid ${C.amber}55`,borderRadius:16,padding:“20px 16px”,marginBottom:12,position:“relative”}}>
<div style={{position:“absolute”,top:-10,right:14,background:C.amber,color:”#fff”,fontSize:9,fontWeight:800,letterSpacing:1.5,padding:“3px 12px”,borderRadius:99,fontFamily:F.sans}}>BEST MATCH</div>
<div style={{fontFamily:F.sans,fontSize:17,fontWeight:700,color:C.text,marginBottom:6}}>{bp.ideas[0].title}</div>
<div style={{fontFamily:F.serif,fontSize:14,color:C.muted,fontStyle:“italic”,marginBottom:14,lineHeight:1.5}}>{bp.ideas[0].tagline}</div>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:16}}>
<div style={{fontSize:14,color:C.green,fontWeight:700,fontFamily:F.sans}}>{bp.ideas[0].monthly}</div>
<div style={{fontSize:11,color:C.dim,fontFamily:F.sans}}>{bp.ideas[0].timeToFirst} to first Rs.</div>
</div>
<Btn onClick={()=>{setChosenIdx(0);Analytics.track(“idea_chosen”,{idea_title:bp.ideas[0].title});go(V.COMMITMENT);}}>This Is My Move</Btn>
</div>
<div style={{fontSize:10,color:C.dim,textAlign:“center”,margin:“8px 0”,letterSpacing:1,fontFamily:F.sans}}>OR CONSIDER</div>
{[1,2].map(i=>(
<div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“14px”,marginBottom:10}}>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:8}}>
<div style={{flex:1,paddingRight:10}}>
<div style={{fontFamily:F.sans,fontSize:14,fontWeight:600,color:C.muted,marginBottom:3}}>{bp.ideas[i].title}</div>
<div style={{fontFamily:F.serif,fontSize:12,color:C.dim,fontStyle:“italic”}}>{bp.ideas[i].tagline}</div>
</div>
<div style={{fontSize:13,color:C.green,fontWeight:600,flexShrink:0,fontFamily:F.sans,opacity:0.7}}>{bp.ideas[i].monthly}</div>
</div>
<OutlineBtn onClick={()=>{setChosenIdx(i);Analytics.track(“idea_chosen”,{idea_title:bp.ideas[i].title});go(V.COMMITMENT);}} style={{borderRadius:8,padding:“9px”,fontSize:12}}>Choose This Instead</OutlineBtn>
</div>
))}
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — COMMITMENT —
if(view===V.COMMITMENT) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{textAlign:“center”,padding:“48px 0 28px”}}>
<Label>Decision Locked</Label>
<h2 style={{fontFamily:F.serif,fontSize:22,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 12px”,fontStyle:“italic”}}>{idea.title}</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.65,margin:0}}>Make it real - tell one person you’re doing this.<br/>People who announce a goal are 3x more likely to pursue it.</p>
</div>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“16px”,marginBottom:18}}>
<div style={{fontFamily:F.sans,fontSize:11,color:C.dimmer,marginBottom:10}}>Pre-written - one tap to send:</div>
<div style={{background:C.bg,borderRadius:10,padding:“12px 14px”,marginBottom:14,border:`1px solid ${C.border}`}}>
<p style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:0,fontStyle:“italic”}}>“Just figured out my next income move using Bolt. Building {idea.title} - {idea.tagline} Starting this week.”</p>
</div>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`Just figured out my next income move using Bolt. Building “${idea.title}” - ${idea.tagline} Starting this week.\n\nGet your blueprint: https://bolt.in/r/${bp.referralCode}`)}`, “_blank”);Analytics.track(“commitment_share_sent”,{idea_title:idea.title});}} style={{fontSize:13,padding:“13px”}}>
Send on WhatsApp
</Btn>
</div>
<Btn onClick={()=>{Analytics.track(“commitment_share_skipped”);go(V.ASSESSMENT);}}>Skip - Show Me The Plan</Btn>
<div style={{textAlign:“center”,marginTop:10,fontSize:11,color:C.dimmer,fontFamily:F.sans}}>Sharing earns Rs.150 if they buy</div>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — ASSESSMENT —
if(view===V.ASSESSMENT) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 20px”}}>
<Label>Honest Assessment</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.35,margin:“0 0 16px”,fontStyle:“italic”}}>Why this works for you - and where it gets hard.</h2>
<p style={{fontFamily:F.sans,fontSize:14,color:C.muted,lineHeight:1.7,margin:0}}>{idea.fit}</p>
</div>
<Divider/>
<div style={{marginBottom:20}}>
<div style={{fontSize:9,color:C.green,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans}}>Avoids Your Past Failure</div>
<p style={{fontFamily:F.sans,fontSize:14,color:C.muted,lineHeight:1.7,margin:0}}>{idea.failurePrevention}</p>
</div>
<div style={{marginBottom:20}}>
<div style={{fontSize:9,color:C.red,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:12,fontFamily:F.sans}}>Two Things To Know</div>
{idea.hardTruths.map((t,i)=>(
<div key={i} style={{display:“flex”,gap:10,marginBottom:12}}>
<span style={{color:C.red,fontSize:12,flexShrink:0,marginTop:2}}>-</span>
<span style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65}}>{t}</span>
</div>
))}
</div>
<div style={{background:`${C.green}0d`,border:`1px solid ${C.green}22`,borderRadius:12,padding:“16px”,marginBottom:24}}>
<div style={{fontSize:9,color:C.green,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans}}>How You Get Customers</div>
<p style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:0}}>{idea.distributionPath}</p>
</div>
<Btn onClick={()=>go(V.FIRSTSTEP)}>Show Me The First Step</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — FIRST STEP + PROMPT PACK —
if(view===V.FIRSTSTEP) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 16px”}}>
<Label>This Week</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.35,margin:0,fontStyle:“italic”}}>{idea.firstStep}</h2>
</div>
<div style={{marginBottom:6}}>
<div style={{fontSize:9,color:C.green,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>Send This Today</div>
<div style={{background:C.surface,borderRadius:16,padding:4,border:`1px solid ${C.border}`}}>
<div style={{padding:“10px 14px 8px”,borderBottom:`1px solid ${C.border}`,display:“flex”,gap:10,alignItems:“center”}}>
<div style={{width:30,height:30,borderRadius:“50%”,background:`${C.amber}22`,display:“flex”,alignItems:“center”,justifyContent:“center”}}>–</div>
<div><div style={{fontSize:12,color:C.text,fontFamily:F.sans}}>Ideal Client</div><div style={{fontSize:10,color:C.green,fontFamily:F.sans}}>online</div></div>
</div>
<div style={{padding:“14px 12px”}}>
<div style={{background:`${C.amber}0d`,border:`1px solid ${C.amber}22`,borderRadius:“4px 14px 14px 14px”,padding:“12px 14px”,maxWidth:“88%”}}>
<p style={{fontFamily:F.sans,fontSize:13,color:C.text,lineHeight:1.65,margin:0}}>{idea.firstClientScript}</p>
</div>
</div>
</div>
<OutlineBtn onClick={()=>{copy(idea.firstClientScript,setScriptCopied);Analytics.track(“script_copied”,{idea_title:idea.title});}} style={{marginTop:10,borderRadius:10,fontSize:13,padding:“12px”}}>
{scriptCopied?“Copied”:“Copy Message”}
</OutlineBtn>
</div>
<Divider/>
{!promptBought?(
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“20px 18px”}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,marginBottom:10}}>
<div>
<div style={{fontSize:9,color:C.amber,letterSpacing:“0.14em”,textTransform:“uppercase”,marginBottom:4,fontFamily:F.sans,fontWeight:600}}>Move Faster</div>
<div style={{fontFamily:F.serif,fontSize:17,fontWeight:500,color:C.text}}>Prompt Pack</div>
</div>
<div style={{fontFamily:F.serif,fontSize:22,fontWeight:500,color:C.amber}}>Rs.{abConfig.promptPrice}</div>
</div>
<p style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.65,margin:“0 0 16px”,fontWeight:300}}>6 done-for-you prompts built for {idea.title} - skip weeks of setup. Landing page, audit report, objection handler, proposal email, and more.</p>
<Btn onClick={()=>{
const prompts=generatePrompts(idea,answers);
UserState.savePrompts(mobile,prompts);
prompts.forEach(p=>sb.insert(“prompts”,{mobile_number:mobile,prompt_type:p.id,prompt_text:p.prompt}));
setPromptBought(true);
Analytics.track(“prompt_pack_converted”,{price:abConfig.promptPrice,ab_cell:abCell});
}} style={{padding:“13px”,fontSize:14}}>
Get 6 Prompts - Rs.{abConfig.promptPrice}
</Btn>
</div>
):(
<div style={{background:`${C.green}0d`,border:`1px solid ${C.green}44`,borderRadius:10,padding:“16px”,textAlign:“center”}}>
<div style={{fontFamily:F.sans,fontSize:13,color:C.green,fontWeight:600}}>Prompt Pack unlocked - 6 prompts ready to use</div>
<button onClick={()=>go(V.DASHBOARD)} style={{background:“none”,border:“none”,color:C.amber,fontSize:12,cursor:“pointer”,fontFamily:F.sans,marginTop:6,textDecoration:“underline”}}>View in Dashboard</button>
</div>
)}
<Btn onClick={()=>go(V.MARKET)} style={{marginTop:16}}>See Market Opportunity</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — MARKET MAP —
if(view===V.MARKET) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 16px”}}>
<Label>Market Opportunity</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 8px”,fontStyle:“italic”}}>You picked the right niche.</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dimmer,margin:0}}>India’s gig economy - bubble size = market revenue. Tap any bubble for a full niche profile.</p>
</div>
<BubbleChart onNicheClick={setSelectedNiche}/>
<div style={{display:“flex”,gap:10,marginTop:18,marginBottom:24}}>
{[[“Rs.18K Cr”,“Market size”],[“21L+”,“Practitioners”],[“30%”,“YoY growth”]].map(([v,l])=>(
<div key={l} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“12px 8px”,textAlign:“center”}}>
<div style={{fontFamily:F.sans,fontSize:15,fontWeight:700,color:C.amber,marginBottom:3}}>{v}</div>
<div style={{fontFamily:F.sans,fontSize:10,color:C.dimmer}}>{l}</div>
</div>
))}
</div>
<Btn onClick={()=>go(V.ROADMAP)}>See My 30-Day Plan</Btn>
<div style={{height:40}}/>
</Pad>
{selectedNiche&&<NicheSheet niche={selectedNiche} onClose={()=>setSelectedNiche(null)} isUserNiche={selectedNiche.id===“digital_marketing”}/>}
</Phone>
);

// — ROADMAP + FULL BUNDLE —
if(view===V.ROADMAP) return (
<Phone view={view} topRef={topRef}>
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
{bp.week1.map((t,i)=>(
<div key={i} style={{display:“flex”,gap:10,marginBottom:12,alignItems:“flex-start”}}>
<div style={{width:20,height:20,borderRadius:“50%”,border:`1px solid ${C.green}44`,display:“flex”,alignItems:“center”,justifyContent:“center”,flexShrink:0,marginTop:1}}>
<div style={{fontSize:9,color:C.green,fontFamily:F.sans}}>{i+1}</div>
</div>
<span style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.55}}>{t}</span>
</div>
))}
</div>
</div>
</div>
{[[“Week 2”,bp.week2,C.blue],[“Week 3”,bp.week3,C.purple],[“Week 4”,bp.week4,C.amber]].map(([lbl,task,clr])=>(
<div key={lbl} style={{display:“flex”,gap:14,marginBottom:14}}>
<div style={{width:3,background:clr,borderRadius:2,flexShrink:0,opacity:0.35}}/>
<div style={{flex:1}}>
<div style={{fontSize:9,color:clr,letterSpacing:2,textTransform:“uppercase”,marginBottom:5,opacity:0.6,fontFamily:F.sans}}>{lbl}</div>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,lineHeight:1.55,margin:0}}>{task}</p>
</div>
</div>
))}
<Divider/>
{!bundleBought&&(
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:“24px 20px”}}>
<div style={{fontSize:9,color:C.amber,letterSpacing:“0.14em”,textTransform:“uppercase”,marginBottom:16,fontFamily:F.sans,fontWeight:600}}>Your Complete Arsenal</div>
<div style={{textAlign:“center”,marginBottom:20}}>
<div style={{fontFamily:F.sans,fontSize:13,color:C.dim,marginBottom:8,fontWeight:300}}>{idea.title} - Month 3 target</div>
<div style={{fontFamily:F.serif,fontSize:32,fontWeight:500,color:C.text}}>Rs.{(bp.projectedMonth3/100000).toFixed(1)}L/month</div>
<div style={{height:1,background:C.border,margin:“16px 0”}}/>
<div style={{fontFamily:F.sans,fontSize:12,color:C.muted,marginBottom:4,fontWeight:300}}>One-time - 2% of your Month 3 target</div>
<div style={{fontFamily:F.serif,fontSize:30,fontWeight:500,color:C.amber}}>Rs.{bundlePrice.toLocaleString(“en-IN”)}</div>
</div>
{[“Full 90-day roadmap with monthly milestones”,“Pressure test + honest go/no-go verdict”,“5 hard questions answered with specifics”,“30-day replanning prompt (use any time)”,“6 done-for-you prompt pack included”].map(f=>(
<div key={f} style={{display:“flex”,gap:10,alignItems:“flex-start”,marginBottom:10}}>
<div style={{width:18,height:18,borderRadius:“50%”,background:`${C.amber}22`,border:`1px solid ${C.amber}`,display:“flex”,alignItems:“center”,justifyContent:“center”,flexShrink:0,marginTop:1}}>
<svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L2.8 4.8L7 1" stroke={C.amber} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
</div>
<span style={{fontFamily:F.sans,fontSize:13,color:C.muted,fontWeight:300,lineHeight:1.5}}>{f}</span>
</div>
))}
<Btn onClick={()=>{setBundleBought(true);Analytics.track(“full_bundle_converted”,{price:bundlePrice,ab_cell:abCell});go(V.BUNDLE_REVEAL);}} style={{marginTop:18}}>
Unlock My Complete Arsenal - Rs.{bundlePrice.toLocaleString(“en-IN”)}
</Btn>
</div>
)}
<Btn onClick={()=>go(V.SHARE)} style={{marginTop:16}}>Get My Share Card</Btn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

// — BUNDLE REVEAL —
if(view===V.BUNDLE_REVEAL) return (
<Phone noDots view={view} topRef={topRef}>
<Pad>
<motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.6}}>
<div style={{paddingTop:40,paddingBottom:8,textAlign:“center”}}>
<motion.div initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.7,ease:[0.22,1,0.36,1]}}>
<div style={{width:72,height:72,borderRadius:“50%”,background:`${C.amber}22`,border:`2px solid ${C.amber}`,display:“flex”,alignItems:“center”,justifyContent:“center”,margin:“0 auto 20px”,fontSize:28,color:C.amber,fontFamily:F.serif}}>*</div>
</motion.div>
<motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.2}}>
<div style={{fontSize:9,color:C.amber,letterSpacing:“0.18em”,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans,fontWeight:600}}>Your Complete Arsenal Is Ready</div>
<h2 style={{fontFamily:F.serif,fontSize:26,fontWeight:400,color:C.text,lineHeight:1.25,margin:“0 0 8px”}}>Everything you need<br/><em style={{fontStyle:“italic”,color:C.amber}}>for {idea.title}</em></h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dim,fontWeight:300,lineHeight:1.65,margin:“0 0 28px”}}>From zero to first client - and beyond.</p>
</motion.div>
</div>
{[
{delay:0.3,label:“Your Positioning”,content:`"${bp.positioning}"`},
{delay:0.4,label:“90-Day Roadmap”,content:[bp.week1?.join(” - “)||“Week 1 tasks ready”,`Week 2: ${bp.week2||""}`,`Week 3: ${bp.week3||""}`,`Week 4: ${bp.week4||""}`].join(”\n”)},
{delay:0.5,label:“Hard Truths”,content:idea.hardTruths?.join(”\n\n”)||idea.fit},
{delay:0.6,label:“Distribution Path”,content:idea.distributionPath},
{delay:0.7,label:“Your First Client Script”,content:idea.firstClientScript},
].map(({delay,label,content})=>(
<motion.div key={label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay}}>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:“18px 16px”,marginBottom:12}}>
<div style={{fontSize:9,color:C.amber,letterSpacing:“0.14em”,textTransform:“uppercase”,marginBottom:10,fontFamily:F.sans,fontWeight:600}}>{label}</div>
<p style={{fontFamily:F.sans,fontSize:13,color:C.muted,lineHeight:1.7,margin:0,fontWeight:300,whiteSpace:“pre-line”}}>{content}</p>
</div>
</motion.div>
))}
<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.85}}>
<Btn onClick={()=>go(V.SHARE)} style={{marginBottom:10}}>Get Your Blueprint Card</Btn>
</motion.div>
<div style={{height:40}}/>
</motion.div>
</Pad>
</Phone>
);

// — SHARE —
if(view===V.SHARE) return (
<Phone view={view} topRef={topRef}>
<Pad>
<div style={{padding:“24px 0 18px”,textAlign:“center”}}>
<Label>Your Blueprint Card</Label>
<h2 style={{fontFamily:F.serif,fontSize:20,fontWeight:400,color:C.text,lineHeight:1.3,margin:“0 0 6px”,fontStyle:“italic”}}>Screenshot and share.</h2>
<p style={{fontFamily:F.sans,fontSize:13,color:C.dimmer,margin:0}}>Every share earns Rs.150 when someone buys.</p>
</div>
<div style={{marginBottom:18}}><ShareCard idea={idea} score={bp.score} positioning={bp.positioning} blueprintNumber={bp.blueprintNumber}/></div>
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
<Btn bg={C.wa} onClick={()=>{window.open(`https://wa.me/?text=${encodeURIComponent(`bolt Blueprint #${bp.blueprintNumber}\n\n”${bp.positioning}”\n\nMy next move: ${idea.title}\n”${idea.tagline}”\n\n${idea.monthly}/month projected\n\nGet yours: https://bolt.in/r/${bp.referralCode}`)}`, “_blank”);setWaSent(true);Analytics.track(“share_card_sent”,{platform:“whatsapp”});}} style={{fontSize:14}}>
{waSent?“Sent - Rs.150 pending”:“Share on WhatsApp”}
</Btn>
<OutlineBtn onClick={()=>{copy(`https://bolt.in/r/${bp.referralCode}`,setCopied);Analytics.track(“referral_link_copied”,{location:“share”});}} style={{borderRadius:12,padding:“14px”,fontSize:12}}>
{copied?“Link Copied”:`Copy Referral - bolt.in/r/${bp.referralCode}`}
</OutlineBtn>
</div>
<Divider/>
<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:“16px”,marginBottom:20}}>
<div style={{fontSize:9,color:C.dimmer,letterSpacing:2.5,textTransform:“uppercase”,marginBottom:14,fontFamily:F.sans}}>Your Referral Stats</div>
<div style={{display:“flex”,gap:10}}>
{[[“0”,“Referrals”],[“Rs.0”,“Earned”],[“Rs.150”,“Per buy”]].map(([v,l])=>(
<div key={l} style={{flex:1,textAlign:“center”}}>
<div style={{fontFamily:F.sans,fontSize:20,fontWeight:800,color:C.amber,marginBottom:4}}>{v}</div>
<div style={{fontFamily:F.sans,fontSize:10,color:C.dimmer}}>{l}</div>
</div>
))}
</div>
</div>
<Btn onClick={()=>go(V.DASHBOARD)} style={{marginBottom:10}}>Go to My Dashboard</Btn>
<OutlineBtn onClick={()=>{setView(V.LANDING);setBlueprint(null);setQIdx(0);setAnswers({});setChosenIdx(0);setPromptBought(false);setBundleBought(false);setWaSent(false);setMobileInput(””);setOtpInput(””);setTextVal(””);setMultiSel([]);}} style={{borderRadius:10,marginBottom:10}}>Start Over</OutlineBtn>
<div style={{height:40}}/>
</Pad>
</Phone>
);

return null;
}