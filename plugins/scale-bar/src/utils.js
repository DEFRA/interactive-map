const mapSizes = {
  small: 1,
  medium: 1.5,
  large: 2
}

const units = {
  metric: [
    { threshold: 1, abbr: 'm', abbrPlural: 'm', unit: 'metre', unitPlural: 'metres', factor: 1 },
    { threshold: 1000, abbr: 'km', abbrPlural: 'km', unit: 'kilometre', unitPlural: 'kilometres', factor: 0.001 }
  ],
  imperial: [
    { threshold: 1609.344, abbr: 'mi', abbrPlural: 'mi', unit: 'mile', unitPlural: 'miles', factor: 1 / 1609.344 },
    { threshold: 0.9144, abbr: 'yd', abbrPlural: 'yds', unit: 'yard', unitPlural: 'yards', factor: 1 / 0.9144 },
    { threshold: 0.3048, abbr: 'ft', abbrPlural: 'ft', unit: 'foot', unitPlural: 'feet', factor: 1 / 0.3048 }
  ]
}

const getBestScale = (metersPerPx, maxWidthPx, unitSystem, mapSize) => {
  // Get the scaling factor for the map size
  const scalingFactor = mapSizes[mapSize]

  // Adjust metersPerPx to account for the scaling factor
  // When scaled up, each visual pixel represents fewer real-world meters
  const adjustedMetersPerPx = metersPerPx / scalingFactor

  const maxMeters = adjustedMetersPerPx * maxWidthPx
  const options = units[unitSystem]

  // Loop over options from *largest to smallest*
  for (const { abbr, abbrPlural, unit, unitPlural, factor } of options) {
    const scaled = maxMeters * factor
    const rounded = getRounded(scaled)

    // We want a label like "50 km", not "50000 m"
    if (rounded >= 1 && rounded < 1000) {
      const width = (rounded / factor) / adjustedMetersPerPx
      if (width <= maxWidthPx) {
        return {
          label: rounded,
          abbr: rounded > 1 ? abbrPlural : abbr,
          width,
          unit: rounded > 1 ? unitPlural : unit
        }
      }
    }
  }

  // Fallback: pick smallest unit
  const fallback = options[options.length - 1]
  const fallbackScaled = maxMeters * fallback.factor
  const fallbackRounded = getRounded(fallbackScaled)
  const fallbackAbbr = fallbackRounded > 1 ? fallback.abbrPlural : fallback.abbr
  const fallbackUnit = fallbackRounded > 1 ? fallback.abbrPlural : fallback.abbr

  return {
    label: fallbackRounded,
    abbr: fallbackAbbr,
    width: (fallbackRounded / fallback.factor) / adjustedMetersPerPx,
    unit: fallbackUnit
  }
}

const getRounded = (num) => {
  // Round to nice numbers: 1, 2, 5, 10, 20, 50, 100...
  const pow10 = Math.pow(10, Math.floor(Math.log10(num)))
  const d = num / pow10
  let rounded
  if (d >= 10) {
    rounded = 10
  } else if (d >= 5) {
    rounded = 5
  } else if (d >= 3) {
    rounded = 3
  } else if (d >= 2) {
    rounded = 2
  } else {
    rounded = 1
  }
  return rounded * pow10
}

export {
  getBestScale
}
