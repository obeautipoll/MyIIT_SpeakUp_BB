// loadLexicons.js
export const loadLexicons = async () => {
  const vaderText = await fetch("/datasets/vader_lexicon.txt").then((res) =>
    res.text()
  );

  const englishLexicon = {};

  vaderText.split("\n").forEach((line, index) => {
    if (!line || !line.trim()) return; // Skip empty lines

    const parts = line.trim().split(/\t+/);

    // Must have at LEAST 2 parts (word + score)
    if (parts.length < 2) {
      console.warn(`⚠️ Skipping invalid VADER line ${index + 1}:`, line);
      return;
    }

    const word = parts[0]?.trim();
    const score = parseFloat(parts[1]?.trim());

    // Validate parsed values
    if (!word || isNaN(score)) {
      console.warn(`⚠️ Skipping malformed entry:`, line);
      return;
    }

    // Store into lexicon
    englishLexicon[word.toLowerCase()] = score;
  });

  console.log("✅ English lexicon loaded:", Object.keys(englishLexicon).length);

  return { englishLexicon };
};
