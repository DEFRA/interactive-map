<div className="govuk-grid-row">
<div className="govuk-grid-column-two-thirds">

# Accessibility statement

This accessibility statement applies to the Defra Interactive Map component, including its core, the plugins and the map providers published from this repository.

Interactive Map is a component for building maps into services. It is not a service. Each service that uses it is responsible for its own accessibility statement, which should cover the component as it is set up in that service, and the service's data, base maps and pages. See [Using Interactive Map in your service](#using-interactive-map-in-your-service).

In this statement, "the map" means the map image: the base map and the data drawn on it. "The interface" means everything around it, including the buttons, panels, menus, search, and keyboard and screen reader support. The interface is covered by the accessibility regulations and is designed to meet WCAG 2.2 AA.

## Using the component

Interactive Map is built to be used by as many people as possible. People should be able to:

- switch between map styles, including dark and black and white styles where the service provides them
- make the map's labels, lines and symbols larger so they are easier to see
- zoom the page up to 400% without content overlapping or being cut off
- use a keyboard, screen reader or voice control for every interaction, including moving and zooming the map, selecting markers and map features, and drawing and editing shapes
- use every feature on a touch screen without needing precise movements or gestures such as pinching or dragging
- view the keyboard shortcuts at any time by pressing <kbd>Shift</kbd> + <kbd>?</kbd>

## Screen reader users

All controls in the interface are designed to meet WCAG 2.2 AA, with accessible names, roles and states.

The component gives audio feedback for most actions. This helps people who use a screen reader, whether they use it to hear the map's response or to confirm what they see. The component announces:

- the direction of each move and the approximate size of the visible area after zooming
- search results, and the selected suggestion
- features and markers as they are selected
- points selected or inserted while editing, and why a shape is not valid
- the place name at the centre of the map, on request, where the service supports it

The map image shows location, shape, distance and how places relate to each other, and a screen reader cannot describe this in full. For people who cannot see the map, the component does not replace a non-visual alternative.

We recommend that services provide the information in the map in a non-visual way wherever they can. For example:

- an address, place name or grid reference
- a list or table of the features shown on the map
- another way to give a location or boundary, such as a postcode, grid reference or land parcel ID, as well as drawing it

See [The map image](#the-map-image) for how this relates to the accessibility regulations.

## How accessible the component is

We know some parts of the component are not fully accessible:

- markers that are only a text label cannot be reached using a keyboard, screen reader or voice control
- placing a marker is not announced to screen reader users
- TalkBack on Android 16 reads some map and drawing buttons as unlabelled
- when drawing a line or shape, adding a point is not announced, and the location of points is not given, so screen reader users cannot tell where they have drawn
- reading map text labels aloud is experimental, and only works with MapLibre and some map styles

Some issues depend on the content each service provides, and are not part of the component:

- the base map style, including its colours, line contrast and the direction of road labels
- the colours and patterns of datasets, markers and drawn shapes
- the pages that host the map

## Using Interactive Map in your service

Your service's accessibility statement must cover the map and its interface as they appear in your service. You are responsible for:

- testing the map with your own configuration, data and base map styles
- choosing colours and patterns for your datasets, markers and shapes that meet [WCAG 2.2 contrast requirements](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- choosing base map styles that are readable in every style you offer
- providing the information in the map in a non-visual way, as described in [Screen reader users](#screen-reader-users)
- setting up a [reverse geocode provider](./api.md#reversegeocodeprovider), so screen reader users can hear the place name at the centre of the map
- listing any known issues from this statement that affect your service

You can adapt this wording for your own statement.

To describe the map and its alternative:

> This service uses the Defra Interactive Map component to show [what the map shows]. If you cannot use the map, you can [the non-visual alternative, for example enter a grid reference or address, or contact us].

To explain the map exemption:

> The map image is exempt from the accessibility regulations. The information it shows is also available by [the alternative].

To point to the component's known issues:

> The map uses the Defra Interactive Map component, which has some known accessibility issues. See the [Interactive Map accessibility statement](https://defra.github.io/interactive-map/accessibility).

## Feedback and contact information

If you find a problem with the accessibility of the component, or think we're not meeting accessibility requirements, [raise an issue on GitHub](https://github.com/DEFRA/interactive-map/issues).

If you have a problem using a service that includes an interactive map, contact the team that runs that service.

## Enforcement procedure

The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 (the 'accessibility regulations'). If you're not happy with how we respond to your complaint, [contact the Equality Advisory and Support Service (EASS)](https://www.equalityadvisoryservice.com/).

## Technical information about the component's accessibility

Defra is committed to making the Interactive Map component accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.

### Compliance status

The component has been tested against the Web Content Accessibility Guidelines (WCAG) version 2.2 AA standard.

The component is partially compliant with the Web Content Accessibility Guidelines version 2.2 AA standard, due to the non-compliances and exemptions listed below.

## Non-accessible content

The content listed below is non-accessible for the following reasons.

### Non-compliance with the accessibility regulations

Markers that are only a text label cannot be reached using a keyboard, screen reader or voice control. This fails WCAG 2.2 success criterion 4.1.2 (Name, Role, Value).

TalkBack on Android 16 reads some map and drawing buttons as unlabelled, because their names come from tooltips hidden from assistive technology. This fails WCAG 2.2 success criterion 4.1.2 (Name, Role, Value).

We plan to fix these issues by [date to be confirmed].

The following issues found in the audit have been fixed and will be checked when the component is retested:

- buttons that referred to panels missing from the page (4.1.2)
- markers that could not be reached using a keyboard (2.1.1)
- the search box not announcing when suggestions are shown (4.1.2)
- map features that could not be selected using voice control (4.1.2)
- markers that could not be found again after closing their panel (4.1.2)
- low contrast text in panels when using the dark map style (1.4.3)
- the "Exit" button label not saying what it closes (2.4.6)

### Content that's not within the scope of the accessibility regulations

#### The map image

Online maps are exempt from the [accessibility regulations](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps). This applies to the map image only, not the interface around it, which this statement covers. Services must provide the essential information in the map in an accessible format (1.1.1). See [Screen reader users](#screen-reader-users).

#### Third-party base maps and data

The base map styles, such as those from the Ordnance Survey, and the datasets shown on a map are provided by each service, not by the component. They are not covered by this statement. In the audit, some base map styles had low contrast lines and labels, and a dataset colour in an example map had low contrast (1.4.3 and 1.4.11).

## What we're doing to improve accessibility

We're fixing the issues listed in [Non-compliance with the accessibility regulations](#non-compliance-with-the-accessibility-regulations), then the component will be retested by the Digital Accessibility Centre. We'll update this statement with the results.

We're also looking at feedback from the audit that does not fail WCAG but would make the component easier to use, including:

- visible labels on icon-only buttons
- clearer hover states
- instructions for using the map and the drawing tools
- an option to stop the mouse scroll wheel zooming the map

## Preparation of this accessibility statement

This statement was prepared on [date to be confirmed]. It was last reviewed on [date to be confirmed].

The component was last tested on 19 August 2026 against the WCAG 2.2 AA standard.

The test was carried out by the Digital Accessibility Centre. They tested example maps covering the core component and the Interact, Search, Map Styles, Draw, Datasets and Map Key plugins, using a range of browsers and assistive technologies on desktop and mobile, including JAWS, NVDA, VoiceOver, TalkBack, Dragon, ZoomText and screen magnification.

</div>
</div>
