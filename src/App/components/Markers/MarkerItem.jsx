const MarkerItem = ({ id, isSelected, children }) => ( // NOSONAR: project does not use PropTypes
  <li // NOSONAR: role='option' is the correct ARIA pattern for listbox children; <option> is only valid inside <select>
    id={id}
    role='option' // NOSONAR: role='option' is the correct ARIA pattern for listbox children; <option> is only valid inside <select>
    aria-selected={isSelected}
  >
    {children}
  </li>
)

export default MarkerItem
