// src/plugins/search/CloseButton.jsx
export const CloseButton = ({ defaultExpanded, onClick, closeIcon }) => {
  return (
    <button
      aria-label="Close search"
      className="im-c-map-button im-c-search-close-button"
      type="button"
      onClick={onClick}
      style={defaultExpanded ? { display: 'none' } : undefined}
    >
      {closeIcon && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
          dangerouslySetInnerHTML={{ __html: closeIcon }}
          />
      )}
    </button>
  )
}
