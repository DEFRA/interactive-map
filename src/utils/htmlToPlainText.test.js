import { htmlToPlainText } from './htmlToPlainText'

it('strips HTML and normalises whitespace', () => {
  expect(htmlToPlainText('<p>  Hello  <strong>world</strong>  </p>')).toBe('Hello world')
})
