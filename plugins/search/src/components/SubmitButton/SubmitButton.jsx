// src/plugins/search/SubmitButton.jsx
export const SubmitButton = ({ defaultExpanded, submitIcon }) => {
  return (
    <button
      aria-label='Search'
      className='im-c-map-button im-c-search-submit-button'
      type='submit'
      style={defaultExpanded ? undefined : { display: 'none' }}
    >
      {submitIcon && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          focusable='false'
          dangerouslySetInnerHTML={{ __html: submitIcon }}
        />
      )}
    </button>
  )
}
