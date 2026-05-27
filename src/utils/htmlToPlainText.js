/**
 * Strips HTML tags from a string and returns plain text.
 * Collapses runs of two or more whitespace characters into a single space,
 * while preserving intentional single spaces between words.
 * @param {string} htmlString - A string containing HTML markup.
 * @returns {string} The extracted text content with normalised whitespace.
 */
export const htmlToPlainText = (htmlString) => {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  return doc.body.textContent.replace(/\s{2,}/g, ' ').trim()
}
