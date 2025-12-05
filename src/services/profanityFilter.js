// Profanity Filter Service
export const ProfanityFilter = {
  // Comprehensive list of inappropriate words
  badWords: [
    // English profanity
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard', 'crap', 'hell',
    'asshole', 'dick', 'cock', 'pussy', 'whore', 'slut', 'piss',
    
    // Filipino/Bisaya profanity and offensive terms
    'yawa', 'pisti', 'piste', 'punyeta', 'putang', 'gago', 'tanga', 'puta', 'pota',
    'tarantado', 'hinayupak', 'tangina', 'bobo', 'ulol', 'sira', 'buang',
    'lintik', 'animal', 'hayop', 'peste', 'leche', 'demonyo',
    'pakyu', 'buwisit', 'inutil', 'walanghiya', 'kupal', 'tangina mo',
    'putangina', 'pakingshet', 'hudas', 'yawain', 'pisteng yawa', 'obob',
    'kulang kulang', 'gagu', 'pilingon', 'bueng',
    
    // Common variations and abbreviations
    'wtf', 'stfu', 'gtfo', 'mf', 'bs', 'puta ka', 'gago ka',
    
    // Insults and derogatory terms
    'stupid', 'idiot', 'moron', 'dumb', 'retard', 'loser',
    'incompetent', 'useless', 'pathetic', 'worthless'
  ],

  // Check if text contains profanity
  containsProfanity(text) {
    if (!text) return { found: false, words: [] };
    
    const lowerText = text.toLowerCase();
    const foundWords = [];
    
    this.badWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(lowerText)) {
        foundWords.push(word);
      }
    });
    
    return {
      found: foundWords.length > 0,
      words: [...new Set(foundWords)]
    };
  },

  // Filter form data for profanity
  checkFormData(formData) {
    const issues = [];
    
    Object.entries(formData).forEach(([field, value]) => {
      if (typeof value === 'string' && value.trim()) {
        const result = this.containsProfanity(value);
        if (result.found) {
          issues.push({
            field,
            words: result.words
          });
        }
      }
    });
    
    return {
      hasIssues: issues.length > 0,
      issues
    };
  }
};