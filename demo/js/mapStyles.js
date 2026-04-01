const openMapStyles = [{
	id: 'outdoor',
	label: 'Outdoor',
	url: process.env.OUTDOOR_URL,
	thumbnail: '',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	backgroundColor: '#f5f5f0',
	selectedColor: '#0b0c0c',
	haloColor: '#ffffff'
}, {
	id: 'night',
	label: 'Night',
	url: process.env.NIGHT_URL,
	mapColorScheme: 'dark',
	appColorScheme: 'dark',
	thumbnail: '',
	logo: '/assets/images/os-logo-white.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test',
	selectedColor: '#ffffff',
	haloColor: '#0b0c0c'
}, {
	id: 'deuteranopia',
	label: 'Deuteranopia',
	url: process.env.DEUTERANOPIA_URL,
	thumbnail: '',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
},{
	id: 'tritanopia',
	label: 'Tritanopia',
	url: process.env.TRITANOPIA_URL,
	thumbnail: '',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
}]

const vtsMapStyles3857 = [{
	id: 'outdoor',
	label: 'Outdoor',
	url: process.env.VTS_OUTDOOR_URL,
	thumbnail: '/assets/images/outdoor-map-thumb.jpg',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	backgroundColor: '#f5f5f0',
	selectedColor: '#0b0c0c',
	haloColor: '#ffffff'
}, {
	id: 'dark',
	label: 'Dark',
	url: process.env.VTS_DARK_URL,
	mapColorScheme: 'dark',
	appColorScheme: 'dark',
	thumbnail: '/assets/images/dark-map-thumb.jpg',
	logo: '/assets/images/os-logo-white.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test',
	selectedColor: '#ffffff',
	haloColor: '#0b0c0c'
}, {
	id: 'black-and-white',
	label: 'Black/White',
	url: process.env.VTS_BLACK_AND_WHITE_URL,
	thumbnail: '/assets/images/black-and-white-map-thumb.jpg',
	logo: '/assets/images/os-logo-black.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
},{
	id: 'aerial',
	label: 'Aerial',
	mapColorScheme: 'dark',
	url: process.env.AERIAL_URL,
	thumbnail: '/assets/images/aerial-map-thumb.jpg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
}]

const vtsMapStyles27700 = [{
	id: 'outdoor',
	label: 'Outdoor',
	url: process.env.VTS_OUTDOOR_URL_27700,
	thumbnail: '/assets/images/outdoor-map-thumb.jpg',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	backgroundColor: '#f5f5f0',
	selectedColor: '#0b0c0c',
	haloColor: '#ffffff'
}, {
	id: 'dark',
	label: 'Dark',
	url: process.env.VTS_DARK_URL_27700,
	mapColorScheme: 'dark',
	appColorScheme: 'dark',
	thumbnail: '/assets/images/dark-map-thumb.jpg',
	logo: '/assets/images/os-logo-white.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test',
	selectedColor: '#ffffff',
	haloColor: '#0b0c0c'
}, {
	id: 'black-and-white',
	label: 'Black/White',
	url: process.env.VTS_BLACK_AND_WHITE_URL_27700,
	thumbnail: '/assets/images/black-and-white-map-thumb.jpg',
	logo: '/assets/images/os-logo-black.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
}]

export {
  openMapStyles,
  vtsMapStyles3857,
	vtsMapStyles27700
}