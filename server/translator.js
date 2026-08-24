const axios = require('axios');

/**
 * Translates a given text to targetLanguage using cached results if available,
 * otherwise querying Google Translate free endpoint or MyMemory, falling back to mock formatting.
 */
async function translateText(db, messageId, text, targetLanguage, sourceLanguage = 'auto') {
  if (!text || !targetLanguage) {
    return { translatedText: text, detectedLanguage: sourceLanguage === 'auto' ? 'en' : sourceLanguage };
  }

  // Check cache if messageId is provided
  if (messageId) {
    const cached = await db.get(
      'SELECT translated_text FROM translations WHERE message_id = ? AND target_language = ?',
      [messageId, targetLanguage]
    );
    if (cached) {
      return { translatedText: cached.translated_text, cached: true };
    }
  }

  let translatedText = text;
  let detectedLang = sourceLanguage === 'auto' ? 'en' : sourceLanguage;

  try {
    // 1. Try Google Translate gtx free endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await axios.get(url, { timeout: 3000 });

    if (response.data && response.data[0]) {
      translatedText = response.data[0].map(item => item[0]).filter(Boolean).join('');
      if (response.data[2]) {
        detectedLang = response.data[2].split('-')[0];
      }
    }
  } catch (err) {
    // 2. Fallback to MyMemory translation API if google gtx fails
    try {
      const src = sourceLanguage === 'auto' ? 'autodetect' : sourceLanguage;
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${targetLanguage}`;
      const mmRes = await axios.get(mmUrl, { timeout: 3000 });
      if (mmRes.data && mmRes.data.responseData && mmRes.data.responseData.translatedText) {
        translatedText = mmRes.data.responseData.translatedText;
      }
    } catch (mmErr) {
      // 3. Fallback mock translation when offline / no network available
      if (sourceLanguage !== targetLanguage && targetLanguage !== 'en') {
        translatedText = `[${targetLanguage.toUpperCase()}] ${text}`;
      } else {
        translatedText = text;
      }
    }
  }

  // Cache translation if messageId is present
  if (messageId && translatedText) {
    try {
      await db.run(
        'INSERT OR REPLACE INTO translations (message_id, target_language, translated_text) VALUES (?, ?, ?)',
        [messageId, targetLanguage, translatedText]
      );
    } catch (dbErr) {
      console.error('Error caching translation:', dbErr);
    }
  }

  return { translatedText, detectedLanguage: detectedLang };
}

/**
 * Detect language of text
 */
async function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'en';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 3000 });
    if (res.data && res.data[2]) {
      return res.data[2].split('-')[0];
    }
  } catch (e) {
    // Simple offline heuristic (e.g. check character ranges or default to en)
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
    if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text)) return 'ko';
  }
  return 'en';
}

module.exports = { translateText, detectLanguage };
