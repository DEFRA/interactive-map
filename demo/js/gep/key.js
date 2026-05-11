function renderKeyHTML() {
  return `
    <div class="im-c-datasets-key">
      <p class="im-c-datasets-key__empty-message" id="field-parcels-key-empty" style="display: none">No features displayed</p>
      <dl class="im-c-datasets-key__item" id="field-parcels-key-item">
        <dt class="im-c-datasets-key__item-symbol">
          <svg class="am-c-datasets-key-symbol" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="transparent" stroke="#1565C0" stroke-width="2"/>
            <g transform="translate(2, 2)">
              <path d="M0 8.707V7.293L7.293 0h1.414L16 7.293v1.414L8.707 16H7.293L0 8.707zM.707 8L8 15.293 15.293 8 8 .707.707 8z" fill="#1565C0"/>
            </g>
          </svg>
        </dt>
        <dd class="im-c-datasets-key__item-label">Field parcels</dd>
      </dl>
    </div>
  `
}

export { renderKeyHTML }
