import React, { useEffect } from 'react'
import { Viewport } from '../components/Viewport/Viewport'
import { useConfig } from '../store/configContext'
import { useApp } from '../store/appContext'
import { useMap } from '../store/mapContext'
import { useLayoutMeasurements } from '../hooks/useLayoutMeasurements'
import { useFocusVisible } from '../hooks/useFocusVisible'
import { Logo } from '../components/Logo/Logo'
import { Attributions } from '../components/Attributions/Attributions'
import { layoutSlots } from '../renderer/slots'
import { SlotRenderer } from '../renderer/SlotRenderer'

export const Layout = () => {
  const { id } = useConfig()
  const { breakpoint, pluginRegistry, interfaceType, preferredColorScheme, layoutRefs, isLayoutReady, hasExclusiveControl, isFullscreen } = useApp()
  const { mapStyle } = useMap()

  useLayoutMeasurements()
  useFocusVisible()

  return (
    <div
      id={`${id}-im-app`}
      className={[
        'im-o-app',
        `im-o-app--${breakpoint}`,
        `im-o-app--${interfaceType}`,
        `im-o-app--${isFullscreen ? 'fullscreen' : 'inline'}`,
        `im-o-app--${mapStyle?.appColorScheme || preferredColorScheme}-app`,
        `im-o-app--${mapStyle?.mapColorScheme || 'light'}-map`,
        hasExclusiveControl && 'im-o-app--exclusive-control'
      ].filter(Boolean).join(' ')}
      style={{ backgroundColor: mapStyle?.backgroundColor || undefined }}
      ref={layoutRefs.appContainerRef}
    >
      <Viewport keyboardHintPortalRef={layoutRefs.topRef} />
      <div className={`im-o-app__overlay${!isLayoutReady ? ' im-o-app__overlay--not-ready' : ''}`}>
        <div className='im-o-app__side' ref={layoutRefs.sideRef}>
          <SlotRenderer slot={layoutSlots.SIDE} />
        </div>
        <div className='im-o-app__main' ref={layoutRefs.mainRef}>
          {['mobile', 'tablet'].includes(breakpoint) && (
            <div className='im-o-app__banner' ref={layoutRefs.bannerRef}>
              <SlotRenderer slot={layoutSlots.BANNER} />
            </div>
          )}
          <div className='im-o-app__top' ref={layoutRefs.topRef}>
            <div className='im-o-app__top-col' ref={layoutRefs.topLeftColRef}>
              <SlotRenderer slot={layoutSlots.TOP_LEFT} />
            </div>
            <div className='im-o-app__top-col'>
              <SlotRenderer slot={layoutSlots.TOP_MIDDLE} />
              {['desktop'].includes(breakpoint) && (
                <div className='im-o-app__banner' ref={layoutRefs.bannerRef}>
                  <SlotRenderer slot={layoutSlots.BANNER} />
                </div>
              )}
            </div>
            <div className='im-o-app__top-col' ref={layoutRefs.topRightColRef}>
              <SlotRenderer slot={layoutSlots.TOP_RIGHT} />
            </div>
          </div>
          <div className='im-o-app__inset' ref={layoutRefs.insetRef}>
            <SlotRenderer slot={layoutSlots.INSET} />
          </div>
          <div className='im-o-app__right' ref={layoutRefs.rightRef}>
            <div className='im-o-app__right-top'>
              <SlotRenderer slot={layoutSlots.RIGHT_TOP} />
            </div>
            <div className='im-o-app__right-bottom'>
              <SlotRenderer slot={layoutSlots.RIGHT_BOTTOM} />
            </div>
          </div>
          <div className='im-o-app__middle'>
            <SlotRenderer slot={layoutSlots.MIDDLE} />
          </div>
          <div className='im-o-app__footer' ref={layoutRefs.footerRef}>
            <div className='im-o-app__footer-col'>
              <Logo />
            </div>
            <div className='im-o-app__footer-col'>
              <SlotRenderer slot={layoutSlots.FOOTER_RIGHT} />
              <div className='im-o-app__attributions'>
                <Attributions />
              </div>
            </div>
          </div>
          <div className='im-o-app__bottom'>
            <SlotRenderer slot={layoutSlots.BOTTOM} />
          </div>
          <div className='im-o-app__actions' ref={layoutRefs.actionsRef}>
            <SlotRenderer slot={layoutSlots.ACTIONS} />
          </div>
        </div>
      </div>
      <div className='im-o-app__modal'>
        <SlotRenderer slot={layoutSlots.MODAL} />
        <div className='im-o-app__modal-backdrop' />
      </div>
    </div>
  )
}
