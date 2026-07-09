const express = require('express');
const router  = express.Router();
const { db } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const grokApiKey = process.env.GROK_API_KEY;
    if (!grokApiKey) {
      return res.status(500).json({ error: 'Grok API key is not configured on the server.' });
    }

    // Fetch PMO data to provide as context
    const rows = db.prepare('SELECT id, parent_code, project, theme, division, status, category, fy, live_target, live_actual, overall_status FROM projects ORDER BY created_at DESC').all();

    // Simplify the data so we don't overwhelm the token limit with unused fields
    const pmoContext = rows.map(r => ({
      Code: r.parent_code || 'N/A',
      Name: r.project || 'N/A',
      Theme: r.theme || 'N/A',
      Division: r.division || 'N/A',
      Status: r.status || 'N/A',
      Category: r.category || 'N/A',
      FinancialYear: r.fy || 'N/A',
      TargetDate: r.live_target || 'N/A',
      Remarks: r.overall_status || ''
    }));

    const systemPrompt = `You are a helpful PMO AI Assistant for the SafaaiLoop PMO Dashboard.
You have access to the current live PMO database records.
When the user asks a question, answer it based strictly on the provided PMO Database Context.
If the answer is not in the context, politely inform them that you cannot find the information.
Keep your answers concise, professional, and well-formatted.

--- PMO Database Context ---
${JSON.stringify(pmoContext, null, 2)}`;

    // Call xAI Grok API using native fetch
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API Error:', response.status, errorText);
      if (response.status === 402) {
         return res.status(402).json({ error: 'Grok API Error: Insufficient credits. Please add credits to your xAI account at console.x.ai.' });
      }
      return res.status(500).json({ error: `Grok API Error: ${response.statusText}` });
    }

    const data = await response.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : 'Sorry, I could not generate a response.';
    
    res.json({ reply });
  } catch (error) {
    console.error('AI Chat Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
