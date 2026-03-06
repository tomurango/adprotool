export const aiConfig = {
  defaultProvider: 'gemini' as 'gemini' | 'claude' | 'openai',
  providers: {
    gemini: {
      model: 'gemini-2.5-flash',
    },
    claude: {
      model: 'claude-sonnet-4-6',
    },
    openai: {
      model: 'gpt-4o-mini',
    },
  },
};
