const openMapStyles = [{
	id: 'outdoor',
	label: 'Outdoor',
	url: process.env.OUTDOOR_URL,
	thumbnail: '',
	logo: '/assets/images/os-logo.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: `Contains OS data ${String.fromCharCode(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`,
	backgroundColor: '#f5f5f0'
}, {
	id: 'night',
	label: 'Night',
	url: process.env.NIGHT_URL,
	mapColorScheme: 'dark',
	appColorScheme: 'dark',
	thumbnail: '',
	logo: '/assets/images/os-logo-white.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
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
	backgroundColor: '#f5f5f0'
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
	backgroundColor: '#f5f5f0'
}, {
	id: 'dark',
	label: 'Dark',
	url: process.env.VTS_DARK_URL_27700,
	mapColorScheme: 'dark',
	appColorScheme: 'dark',
	thumbnail: '/assets/images/dark-map-thumb.jpg',
	logo: '/assets/images/os-logo-white.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
}, {
	id: 'black-and-white',
	label: 'Black/White',
	url: process.env.VTS_BLACK_AND_WHITE_URL_27700,
	thumbnail: '/assets/images/black-and-white-map-thumb.jpg',
	logo: '/assets/images/os-logo-black.svg',
	logoAltText: 'Ordnance survey logo',
	attribution: 'Test'
}]

const OS_LOGO = '/assets/images/os-logo.svg'
const OS_LOGO_ALT = 'Ordnance Survey logo'
const OS_ATTRIBUTION = `Contains OS data ${String.fromCodePoint(169)} Crown copyright and database rights ${(new Date()).getFullYear()}`

const mapsRasterStyles27700 = [{
	id: 'outdoor',
	label: 'Outdoor',
	url: `${process.env.MAPS_OUTDOOR_URL}?key=${process.env.OS_CLIENT_ID}`,
	thumbnail: '/assets/images/outdoor-raster-thumb.jpg',
	logo: OS_LOGO,
	logoAltText: OS_LOGO_ALT,
	attribution: OS_ATTRIBUTION,
	backgroundColor: '#f5f5f0',
	appColorScheme: 'light',
	mapColorScheme: 'light'
}, {
	id: 'road',
	label: 'Road',
	url: `${process.env.MAPS_ROAD_URL}?key=${process.env.OS_CLIENT_ID}`,
	thumbnail: '/assets/images/road-raster-thumb.jpg',
	logo: OS_LOGO,
	logoAltText: OS_LOGO_ALT,
	attribution: OS_ATTRIBUTION,
	backgroundColor: '#ffffff',
	appColorScheme: 'light',
	mapColorScheme: 'light'
}, {
	id: 'light',
	label: 'Light',
	url: `${process.env.MAPS_LIGHT_URL}?key=${process.env.OS_CLIENT_ID}`,
	thumbnail: '/assets/images/light-raster-thumb.jpg',
	logo: OS_LOGO,
	logoAltText: OS_LOGO_ALT,
	attribution: OS_ATTRIBUTION,
	backgroundColor: '#f0f0f0',
	appColorScheme: 'light',
	mapColorScheme: 'light'
}]

export {
	openMapStyles,
	vtsMapStyles3857,
	vtsMapStyles27700,
	mapsRasterStyles27700
}