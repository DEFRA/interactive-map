/**
 * Strips HTML tags from a string and returns plain text.
 * Elements with aria-hidden="true" are stripped entirely before extraction.
 * Collapses runs of two or more whitespace characters into a single space,
 * while preserving intentional single spaces between words.
 * @param {string} htmlString - A string containing HTML markup.
 * @returns {string} The extracted text content with normalised whitespace.
 */
export const htmlToPlainText = (htmlString) => {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')

  // Find all elements with aria-hidden="true" and remove them from the DOM
  const hiddenElements = doc.querySelectorAll('[aria-hidden="true"]')
  hiddenElements.forEach(el => el.remove())

  // Now textContent will completely ignore anything that was inside those elements
  return doc.body.textContent.replace(/\s{2,}/g, ' ').trim()
}
