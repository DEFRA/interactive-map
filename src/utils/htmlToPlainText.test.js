import { htmlToPlainText } from './htmlToPlainText'

it('strips HTML and normalises whitespace, ignoring aria-hidden elements', () => {
  expect(htmlToPlainText('<p>  Hello  <strong>world</strong>  <span aria-hidden="true">Remove me</span></p>')).toBe('Hello world')
})
