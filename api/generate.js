export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { answers } = req.body;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "API key not configured" });

  const earnRanked = answers.earnMode
    ? answers.earnMode.split(", ").slice(0, 2).join(" then ")
    : "flexible";

  const prompt = `You are a senior business advisor specialising in the Indian professional side-income market. You help salaried professionals find income moves that leverage their existing expertise.

Analyse this professional profile and generate a personalised Bolt blueprint.

PROFILE:
- Primary expertise: ${answers.expertise || "not specified"}
- Unique differentiator: ${answers.differentiator || "not specified"}
- Years of experience: ${answers.experience || "not specified"}
- Current monthly income: ${answers.currentIncome || "not specified"}
- Target monthly income: ₹${answers.targetIncome || "not specified"}
- Timeline to target: ${answers.timeline || "not specified"}
- Hours per week available: ${answers.hours || "not specified"}
- Hours available when: ${answers.hoursWhen || "not specified"}
- Recent advisory requests (what people ask them): ${answers.superpower || "not specified"}
- Preferred earn mode (ranked): ${earnRanked}
- Ideal client description: ${answers.audience || "not specified"}
- Visibility preference: ${answers.visibility || "not specified"}
- Network strength: ${answers.network || "not specified"}
- Past failure and what got in the way: ${answers.pastFailure || "not specified"}

RULES:
1. Generate exactly 3 income ideas, ranked by fit. Idea 1 = best match.
2. Reference their exact answers throughout — make it feel personal.
3. Show specific ROAS math in every distributionPath (CPL, conversion rate, ROAS multiple).
4. If their timeline/hours are unrealistic for their income target, flag it explicitly in hardTruths with numbers.
5. Address their past failure pattern directly in failurePrevention for idea 1.
6. Calibrate all pricing, CPL estimates, and income projections to the Indian market (2024-2025).
7. firstClientScript must be word-for-word, ready to send today — no placeholders.
8. Score launch readiness 0-100: clarity of expertise (20pts), hours available (20pts), network strength (20pts), past failure learnings (20pts), income target realism (20pts).
9. projectedMonth3 = realistic Month 3 revenue in rupees from idea 1 (integer, no formatting).
10. week1 must be 3 specific day-range tasks (Day 1-2, Day 3-4, Day 5-7). Week 2-4 each one focused sentence.

Respond ONLY with valid JSON. No markdown. No explanation. Just the JSON object.

{
  "score": <0-100>,
  "scoreLabel": <"Early-Stage Builder" | "Building Momentum" | "Almost Launch-Ready" | "Ready to Launch">,
  "positioning": "<one punchy sentence — their unique market position, first person>",
  "ideas": [
    {
      "title": "<product or service name>",
      "tagline": "<one-line value prop>",
      "monthly": "<₹X–₹Y realistic range>",
      "timeToFirst": "<X weeks>",
      "fit": "<2-3 sentences why this fits them — reference their exact answers>",
      "hardTruths": ["<hard truth 1 with specific numbers>", "<hard truth 2>"],
      "distributionPath": "<specific path with CPL, conversion rate, ROAS math>",
      "failurePrevention": "<directly address past failure — how this move avoids that trap>",
      "firstStep": "<very specific first action, doable this week>",
      "firstClientScript": "<word-for-word outreach message ready to send>"
    }
  ],
  "week1": ["Day 1-2: <task>", "Day 3-4: <task>", "Day 5-7: <task>"],
  "week2": "<week 2 one-sentence focus>",
  "week3": "<week 3 one-sentence focus>",
  "week4": "<week 4 one-sentence focus>",
  "projectedMonth3": <integer in rupees>
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const text = data.content[0].text;

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: "No JSON in response" });

    const blueprint = JSON.parse(match[0]);
    blueprint.referralCode = `BOLT-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    blueprint.blueprintNumber = Math.floor(Math.random() * 400) + 350;

    res.json(blueprint);
  } catch (e) {
    console.error("generate error:", e);
    res.status(500).json({ error: e.message });
  }
}
