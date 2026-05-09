const DEEPSEEK_API_KEY = 'sk-d7f136cbcf6e49458438c520cab151ee';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Estimate task duration in hours (not days).
 * The developer works with AI assistance (Cline), making them extremely fast.
 * Most tasks take minutes to a few hours, not days.
 */
export async function estimateTaskDays(title: string, description: string): Promise<number> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are estimating task duration for a developer who works with AI coding assistance (Cline). The AI does most of the heavy lifting - writing code, debugging, refactoring. The developer just reviews and guides. Tasks take MINUTES to a few HOURS, not days. Estimate in HOURS (can be decimal like 0.25 for 15 min, 0.5 for 30 min, 1 for 1 hour, 2 for 2 hours, etc). Return ONLY a single number representing hours. Max 8 hours (1 working day). Be very aggressive - most simple tasks are 0.25-0.5 hours.',
          },
          {
            role: 'user',
            content: `Task: ${title}\nDescription: ${description}`,
          },
        ],
        max_tokens: 10,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, response.statusText);
      return getFallbackEstimate(title, description);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const hours = parseFloat(text);
    
    if (isNaN(hours) || hours < 0.1) {
      return getFallbackEstimate(title, description);
    }
    
    // Convert hours to working days (8 hours = 1 day), cap at 1 day max
    const days = hours / 8;
    return Math.min(Math.max(days, 0.05), 1); // Between 0.05 days (~24 min) and 1 day max
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    return getFallbackEstimate(title, description);
  }
}

/**
 * Fallback estimation based on description length and keywords
 * Used when API is unavailable
 * Estimates in hours, then converts to days (8 hours = 1 day)
 */
function getFallbackEstimate(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  
  // With AI assistance, everything is very fast
  // Estimate in hours, then convert to days
  let hours = 0.5; // Default: 30 minutes
  
  if (text.includes('complex') || text.includes('integration') || text.includes('architecture') || 
      text.includes('system') || text.includes('pipeline') || text.includes('database') ||
      text.includes('api') || text.includes('authentication') || text.includes('migration')) {
    hours = 2; // 2 hours max for complex tasks with AI
  } else if (text.includes('design') || text.includes('layout') || text.includes('responsive') ||
      text.includes('ui') || text.includes('ux') || text.includes('interface')) {
    hours = 1; // 1 hour
  } else if (text.includes('bug') || text.includes('fix') || text.includes('adjust') ||
      text.includes('update') || text.includes('change') || text.includes('modify')) {
    hours = 0.25; // 15 minutes
  }
  
  // Convert to days (8 hours = 1 working day)
  return Math.min(hours / 8, 1);
}
