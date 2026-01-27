# Unit Testing Reference

Quick reference for testing patterns. For the complete guide, see [docs/UNIT_TESTING.md](../../../docs/UNIT_TESTING.md).

## File Placement

| Source Type | Test File |
|-------------|-----------|
| `Component.jsx` | `Component.test.jsx` |
| `utils.js` | `utils.test.js` |
| `useHook.js` | `useHook.test.js` |

## Query Priority

```javascript
// 1. Accessible roles (preferred)
screen.getByRole('button', { name: 'Submit' })

// 2. Form labels
screen.getByLabelText('Email address')

// 3. Visible text
screen.getByText('Welcome')

// 4. Test IDs (last resort)
screen.getByTestId('complex-widget')
```

## Component Pattern

```javascript
import { render, screen, fireEvent } from '@testing-library/react'

describe('Component', () => {
  it('handles user interaction', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Save</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## Hook Pattern

```javascript
import { renderHook, act } from '@testing-library/react'

describe('useCounter', () => {
  it('increments value', () => {
    const { result } = renderHook(() => useCounter())

    act(() => result.current.increment())

    expect(result.current.count).toBe(1)
  })
})
```

## Plugin Factory Pattern

```javascript
import createPlugin from './index.js'

jest.mock('./styles.scss', () => ({}))

describe('createPlugin', () => {
  it('returns plugin with correct id', () => {
    const plugin = createPlugin()
    expect(plugin.id).toBe('myPlugin')
  })

  it('load returns manifest with controls', async () => {
    const plugin = createPlugin()
    const manifest = await plugin.load()
    expect(manifest.controls).toBeDefined()
  })
})
```

## Reducer Pattern

```javascript
import { reducer, initialState } from './appReducer'

describe('appReducer', () => {
  it('handles SET_MODE action', () => {
    const state = initialState
    const result = reducer(state, { type: 'SET_MODE', payload: 'draw' })

    expect(result.mode).toBe('draw')
    expect(result).not.toBe(state) // Immutability check
  })

  it('returns current state for unknown action', () => {
    const state = { mode: 'view' }
    const result = reducer(state, { type: 'UNKNOWN' })
    expect(result).toBe(state)
  })
})
```

## Service Pattern (Event Bus)

```javascript
import { eventBus } from './eventBus'

describe('eventBus', () => {
  beforeEach(() => eventBus.destroy()) // Clean state between tests

  it('emits events to subscribers', () => {
    const handler = jest.fn()
    eventBus.on('test', handler)
    eventBus.emit('test', 'data')

    expect(handler).toHaveBeenCalledWith('data')
  })
})
```

## Mock Factories

```javascript
import { createMockAppState, createMockRegistries } from 'src/test-utils'

const mockState = createMockAppState({ mode: 'draw' })
```

## Best Practices

**Do:**
- Test behaviour, not implementation details
- Use accessible queries (`getByRole`, `getByLabelText`)
- Clear mocks in `beforeEach` when needed
- Test error states and edge cases
- Keep tests focused on one behaviour

**Don't:**
- Test internal state directly
- Mock everything - use real implementations where practical
- Write tests that depend on execution order
- Use `getByTestId` when accessible queries work

## Commands

```bash
npx jest path/to/file.test.js   # Single file
npx jest plugins/scale-bar      # Directory
npx jest --watch                # Watch mode
```
