/**
 * Normalizes a string by removing accents and converting to lowercase/slug format.
 * Used to match dynamic names with translation keys.
 */
export const normalizeTopicName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

/**
 * Attempts to localize a topic name if it matches a known default.
 * @param {string} name - The original name (e.g., 'Thảo luận')
 * @param {function} t - The translation function
 */
export const getLocalizedTopicName = (name, t) => {
  if (!name) return '';
  
  const normalized = normalizeTopicName(name);
  const key = `chat.topics.${normalized}`;
  const translated = t(key);
  
  // If t returns the key, it means no translation was found
  if (translated === key) {
    return name;
  }
  
  return translated;
};
