import { render, screen, act } from '@testing-library/react'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { LayersMenuCheckbox } from './LayersMenuCheckbox'

jest.mock('../../registry/datasetRegistry.js', () => ({
  datasetRegistry: {
    getDataset: jest.fn()
  }
}))

const onChange = jest.fn()
const menuGroupItem = { id: 'dataset-1' }

const baseDataset = {
  id: 'dataset-1',
  label: 'Dataset One',
  visible: true,
  isLocallyVisible: true,
  isSublayer: false,
  parentId: undefined
}

beforeEach(() => {
  datasetRegistry.getDataset.mockReset()
  onChange.mockReset()
})

describe('LayersMenuCheckbox', () => {
  describe('when the dataset is not in the registry', () => {
    it('returns null', () => {
      datasetRegistry.getDataset.mockReturnValue(undefined)
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when the dataset exists', () => {
    it('renders a checkbox input', () => {
      datasetRegistry.getDataset.mockReturnValue(baseDataset)
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
    })

    it('renders the dataset label', () => {
      datasetRegistry.getDataset.mockReturnValue(baseDataset)
      render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(screen.getByText('Dataset One')).toBeTruthy()
    })

    it('associates the label with the input via htmlFor', () => {
      datasetRegistry.getDataset.mockReturnValue(baseDataset)
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      const label = container.querySelector('label')
      const input = container.querySelector('input')
      expect(label.htmlFor).toBe(input.id)
    })

    it('calls onChange when the checkbox changes', () => {
      datasetRegistry.getDataset.mockReturnValue(baseDataset)
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      const input = container.querySelector('input')
      const propsKey = Object.keys(input).find(k => k.startsWith('__reactProps'))
      act(() => { input[propsKey].onChange({ target: { checked: true, value: input.value } }) })
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('checked state', () => {
    it('is checked when isLocallyVisible is true', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, isLocallyVisible: true })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.querySelector('input').checked).toBe(true)
    })

    it('is unchecked when isLocallyVisible is false', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, isLocallyVisible: false })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.querySelector('input').checked).toBe(false)
    })
  })

  describe('item class', () => {
    it('does not include the --checked modifier when visible is true', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, visible: true })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.firstChild.className).not.toContain('im-c-datasets-layers__item--checked')
    })

    it('includes the --checked modifier when visible is false', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, visible: false })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.firstChild.className).toContain('im-c-datasets-layers__item--checked')
    })
  })

  describe('data attributes', () => {
    it('uses the dataset id as data-dataset-id when not a sublayer', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, isSublayer: false })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      const input = container.querySelector('input')
      expect(input.dataset.datasetId).toBe('dataset-1')
      expect(input.dataset.sublayerId).toBeUndefined()
    })

    it('uses parentId as data-dataset-id when a sublayer', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, id: 'sub-1', isSublayer: true, parentId: 'parent-1' })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.querySelector('input').dataset.datasetId).toBe('parent-1')
    })

    it('uses the sublayer id as data-sublayer-id when a sublayer', () => {
      datasetRegistry.getDataset.mockReturnValue({ ...baseDataset, id: 'sub-1', isSublayer: true, parentId: 'parent-1' })
      const { container } = render(<LayersMenuCheckbox menuGroupItem={menuGroupItem} onChange={onChange} />)
      expect(container.querySelector('input').dataset.sublayerId).toBe('sub-1')
    })
  })
})
