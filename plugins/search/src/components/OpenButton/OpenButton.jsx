// src/plugins/search/OpenButton.jsx
export const OpenButton = ({ id, isExpanded, onClick, buttonRef, searchIcon }) => {
  return (
    <button
      aria-label="Open search"
      className="im-c-map-button"
      onClick={onClick}
      aria-controls={`${id}-search-form`}
      ref={buttonRef}
      style={isExpanded ? { display: 'none' } : undefined}
    >
      {searchIcon && (
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
          dangerouslySetInnerHTML={{ __html: searchIcon }}
          />
      )}
    </button>
  )
}
