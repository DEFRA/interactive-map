import { renderError } from './renderError.js'

describe('renderError', () => {
  it('renders error message in root element', () => {
    const rootEl = document.createElement('div')

    renderError(rootEl, 'Something went wrong')

    expect(rootEl.innerHTML).toBe('<div class="im-c-error">Something went wrong</div>')
  })

  it('replaces existing content', () => {
    const rootEl = document.createElement('div')
    rootEl.innerHTML = '<p>Old content</p>'

    renderError(rootEl, 'Error occurred')

    expect(rootEl.innerHTML).toBe('<div class="im-c-error">Error occurred</div>')
  })
})
