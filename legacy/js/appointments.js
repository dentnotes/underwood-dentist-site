(function() {

    let he_url = 'https://healthengine.com.au';

    /**
     * "The Document.currentScript property returns the <script> element whose script is
     *   currently being processed and isn't a JavaScript module."
     */
    let script = 'currentScript' in document && document.currentScript ?
      document.currentScript :
      null;

    /**
     * The HTML ID used to identify the anchor ('button' visually) which when clicked opens the webplugin in an iframe.
     */
    const iframeModalAnchorIdPrefix = 'he-webplugin-anchor-';

    /**
     * The HTML ID used to identify the practice profile anchor
     *   (used to generate google linker param for the embedded webplugin).
     */
    const profileAnchorIdPrefix = 'he-profile-anchor-';

    /**
     * Used to determine whether we have already injected the webplugin iframe.
     * This is exclusively used by the 'embed' webplugin type.
     */
    let embedIframeInjected = false;

    /**
     * The maximum amount of time to wait for the GA4 event call back to fire.
     * This is exclusively used by the 'embed' webplugin type.
     */
    const maximumWaitTimeForGaEventCallback = 800;

  /**
   * Function to extract the _gl parameter from a URL
   */
  function getLinkerParamFromUrl(url) {
      const urlObj = new URL(url);
      const urlParams = new URLSearchParams(urlObj.search);
      return urlParams.get('_gl');
  }

  /**
   * Get the linker param from the 'Book now'/'Book appointment' anchors that load the iframe.
   */
  function getLinkerParamForIframeAnchor(widid) {
      const linkerAnchor = document.getElementById(iframeModalAnchorIdPrefix + widid);
      return linkerAnchor ? (getLinkerParamFromUrl(linkerAnchor.href) || ''): '';
  }

  /**
   * Get the linker param from the practice profile anchor shown alongside the embedded iframe.
   */
  function getLinkerParamForPracticeProfileAnchor(widid) {
      // 'data-he-embed' handling where the param is embedded in a different location
      const profileLink = document.getElementById(profileAnchorIdPrefix + widid);
      return profileLink ? getLinkerParamFromUrl(profileLink.href) : '';
  }

  var widget_setup = function(target) {
        if (!target.parentNode) return; // sometimes this happens

        // allow the widget to treat the current host as the healthengine URL. Allows local debugging of widget in DEV
        if(!!target.getAttribute("data-he-debug")){
          // relative paths
          he_url = '';
        }

        let widid = parseInt(target.getAttribute("data-he-id"),10) || 0;
        let widspecialty = target.getAttribute("data-he-specialty") || '';
        let widdocid = parseInt(target.getAttribute("data-he-doctor"),10) || 0;

        if (widid > 0) {
            // check not already done (don't need two widgets)
            if (target.previousSibling && target.previousSibling.id === 'he-webplugin-'+widid) return;

            var params = [];
            if (!widspecialty.match(/^ *$/)) {
                params.push('specialty=' + widspecialty);
            }
            if (widdocid > 0) {
                params.push('doctor=' + widdocid);
            }
            params.push('source=webplugin');

            var widget_url = he_url + '/webplugin/?id=' + widid + (params.length ? '&' + params.join('&') : '');
            var practice_url = he_url + '/service/' + widid + (params.length ? '?' + params.join('&amp;') : '');

            // show button by preference...
            var fixedonly = !!target.getAttribute('data-he-fixed');
            var buttononly = !!target.getAttribute('data-he-button');
            var embedonly = !!target.getAttribute('data-he-embed');

            if (fixedonly) widget_url += '&trigger=button';
            if (buttononly) widget_url += '&trigger=button';

            // detect touch device...
            var touch_device;
            try {
              document.createEvent("TouchEvent");
              touch_device = true;
            } catch(ex) {
              touch_device = false;
            }

            //retrieve styling options
            var div_class = target.getAttribute('data-he-class') || '';
            var div_style = target.getAttribute('data-he-style') || '';
            var div_background_color = target.getAttribute('data-background-color') || '';
            var div_text_color = target.getAttribute('data-text-color') || '';
            var div_alignment = target.getAttribute('data-alignment') || '';
            var div_button_label = target.getAttribute('data-button-label') || '';

             //create, configure and add container div
            var targetdiv = document.createElement('div');
            targetdiv.id = 'he-webplugin-'+widid;
            targetdiv.className = div_class;
            targetdiv.style.cssText = div_style;

            //Basic button option
            if (!embedonly && !fixedonly && (buttononly || (touch_device && window.outerWidth<=720))) {
                //insert element before target
                target.parentNode.insertBefore(targetdiv, target);

                // Create, config and style button object
                var button_text = target.getAttribute('data-he-text') || '';
                var button_class = target.getAttribute('data-he-button-class') || '';
                var button_style = target.getAttribute('data-he-button-style') || '';
                var button;

                if (button_text) {
                    button = document.createElement('a');
                    button.id = iframeModalAnchorIdPrefix + widid;
                    button.href = practice_url;
                    button.innerHTML = button_text;
                    button.className = button_class;
                    button.style.cssText = button_style;
                } else {
                    // Style tweaks to make anchor wrap image tightly.
                    if (!button_style.match(/display/)) {
                        button_style += ';display:inline-block;';
                    }

                    if (!button_style.match(/line-height/)) {
                        button_style += ';line-height:0;';
                    }

                    if (!button_style.match(/text-decoration/)) {
                        button_style += ';text-decoration:none;';
                    }

                    // this allows the 'custom image for webplugin button' feature
                    // https://support.healthengine.com.au/hc/en-us/articles/206011346-Adding-a-Custom-Button-Image-for-the-Web-Plugin
                    var imgfile = target.getAttribute('data-he-img') || 'HE_BOOKNOW_NEWBRAND_1.png';

                    if (!imgfile.match(/(\/|https?:\/\/)/i)) {
                        imgfile = he_url + '/images/widget/' + imgfile;
                    }

                    var image = document.createElement('img');

                    image.alt = 'Book now with Healthengine';
                    image.src = imgfile;

                    button = document.createElement('a');
                    button.id = iframeModalAnchorIdPrefix + widid;
                    button.className = button_class;
                    button.href = practice_url;
                    button.style.border = 'none';
                    button.style.cssText = button_style;
                    button.style.cursor = 'pointer';

                    button.appendChild(image);
                }

                //Add event handler for basic button
                button.onclick = function(e) {
                    // Disable the default click handler for the popup button
                    e.preventDefault();
                    e.stopPropagation();

                    if (touch_device && window.outerWidth <= 720) {
                        openWebpluginInNewWindowForMobile(widid, widget_url);
                    } else {
                        if (!he_popup_exists(widid)) {
                            // Check if popup exists - if not create and show it
                            he_init_popup(widid, touch_device, widget_url);
                        } else {
                            // if existing, just hidden, show...
                            he_show_popup(widid,widdocid);
                        }
                    }
                    return false;
                };
                //Add button to targetDiv
                targetdiv.appendChild(button);
            } else if(!embedonly && !buttononly && fixedonly) {
                // Fixed Widget Option -  No targetDiv, can be included anywhere in page body

                //create static widget container div
                let staticwidget = document.createElement('a');
                staticwidget.id = iframeModalAnchorIdPrefix + widid;
                staticwidget.className = 'he-book he-widget-container';
                staticwidget.href = practice_url;

                //Check for additional styling options

                //Check for background color
                if(div_background_color!=''){
                    var widget_background_color = div_background_color;
                }

                else{
                    var widget_background_color = "#2c4c59";
                }

                //Check for text color
                if(div_text_color!=''){
                    var widget_text_color = div_text_color;
                }

                else{
                    var widget_text_color = "#FFF";

                    if (isHexColor(widget_background_color)) {
                        var rgb = hexToRGB(widget_background_color);

                        if (isLightBackground(rgb.r, rgb.g, rgb.b)) {
                            widget_text_color = "#000";
                        }
                    }

                    if (isRGBColor(widget_background_color)) {
                        var rgb = widget_background_color.replace(/[^\d,]/g, '').split(',');

                        if (isLightBackground(rgb[0], rgb[1], rgb[2])) {
                            widget_text_color = "#000";
                        }
                    }
                }

                //check alignment
                if(div_alignment!=''){
                    var widget_alignment = div_alignment;
                }

                else{
                    var widget_alignment = 'right';
                }

                //check button label
                if(div_button_label!=''){
                    var widget_button_label = div_button_label;
                }

                else{
                    var widget_button_label = 'Book appointment';
                }

                staticwidget.innerHTML ='<style type="text/css">.he-popup{transition:all 0.2s ease;visibility:hidden;opacity:0;display:none;}.he-popup.visible{visibility:visible;opacity:1.0}.he-frame-container{transition:all 0.2s ease;-webkit-transform:translateY(-40px);-moz-transform:translateY(-40px);-ms-transform:translateY(-40px);-o-transform:translateY(-40px)}.he-popup.visible .he-frame-container{transition:all 0.2s ease;-webkit-transform:translateY(-0px);-moz-transform:translateY(-0px);-ms-transform:translateY(-0px);-o-transform:translateY(-0px)}.he-row h2{clear: unset;float: left;font-size: 18px;user-select: none;font-weight: 400;padding: 0 !important;margin: 7px 10px !important;line-height: 1;font-family: Arial, Helvetica, sans-serif;color: '+widget_text_color+';}#he-calendar-icon{transition:all 0.2s ease;width:28px;height:28px;float:left;opacity:0.4;margin-top:2px;margin-left:10px}.he-widget-container:hover #he-calendar-icon{opacity:0.7 !important}.he-widget-container{color:'+widget_text_color+';opacity:1;box-shadow:0 10px 20px rgba(0, 0, 0, 0.5);transition:all 0.2s ease;position:fixed;bottom:-20px;'+widget_alignment+':15px;width:280px;height:110px;overflow:hidden;visibility:visible;border-radius:5px 5px 0px 0px;background:'+widget_background_color+';cursor:pointer;border:0px;z-index:9998;box-sizing:border-box;font-family:"Source Sans Pro",sans-serif;  transition: all 0.2s ease;-webkit-transform: translateY(-0px);-moz-transform: translateY(-0px);-ms-transform: translateY(-0px);-o-transform: translateY(-0px);} .he-widget-container.active{transition: all 0.2s ease;-webkit-transform: translateY(40px);-moz-transform: translateY(40px);-ms-transform: translateY(40px);-o-transform: translateY(40px);opacity:0;}.he-widget-container:hover{}#he-poweredby-container{width:100%;height:50px;padding-top:8px;background-color:rgba(0,0,0,0.1);}#he-poweredby-img{float:left;width:94px;height:19px;margin-left:7px}#he-poweredby-text{float:left;font-size:14px;font-weight:100;margin-left:25px;opacity:0.9}@media (max-width: 600px){.he-widget-container{width:100% !important;right:0px !important; left:0px !important; border-radius:0px !important}.he-widget-container:hover{}}</style><div class="he-row" style="margin: 15px;margin-bottom: 10px;"> <img alt="Book now with Healthengine" id="he-calendar-icon" src="'+he_url+'/images/widget/calendar.png"><h2>'+widget_button_label+'</h2><div style="clear: both;"></div></div><div class="he-row" id="he-poweredby-container"><div id="he-poweredby-text"> Powered By</div><img alt="Healthengine logo" id="he-poweredby-img" src="https://images.healthengine.com.au/public/images/he-logo-white_20210818061515.svg?auto=compress"><div style="clear: both;"></div></div>';

                document.getElementsByTagName('body')[0].appendChild(staticwidget);


                //Add event handler widget
                staticwidget.onclick = function(e) {
                    // Disable the default click handler for the popup button
                    e.preventDefault();
                    e.stopPropagation();

                    if (touch_device && window.outerWidth <= 720) {
                        openWebpluginInNewWindowForMobile(widid, widget_url);
                    } else {
                        //Add active class
                        staticwidget.classList.add('active');

                        if (!he_popup_exists(widid)) {
                            // Check if popup exists - if not create and show it
                            he_init_popup(widid, touch_device, widget_url);
                        } else {
                            // if existing, just hidden, show...
                            he_show_popup(widid,widdocid);
                        }
                    }
                    return false;
                };

                //apend widget to page
                document.getElementsByTagName('body')[0].appendChild(staticwidget);
            } else {
                // Calendar Option (directly embed the iframe with a practice profile link)
                const widgetPreviewNode = document.getElementById('widget_preview');

                if (widgetPreviewNode) {
                    // this is being rendered within the prac-admin preview page
                    while (widgetPreviewNode.firstChild) {
                        // remove prior iframe injected, due to prac-admin react re-render
                        widgetPreviewNode.firstChild.remove()
                    }
                    widgetPreviewNode.appendChild(targetdiv);
                } else {
                    // this is being rendered within the practices website
                    target.parentNode.insertBefore(targetdiv, target);
                }

                // inject the practice profile link
                let practiceProfileAnchor = buildPracticeProfileLinkAnchor(widid, practice_url);
                targetdiv.appendChild(practiceProfileAnchor);

                // inject the embed iframe placeholder (to avoid pop-in)
                let placeholderIframe = buildEmbedWebpluginPlaceholderHtml(widid, target);
                targetdiv.insertBefore(placeholderIframe, practiceProfileAnchor);

                if (widgetPreviewNode) {
                    // inject the iframe immediately in prac-admin, as there is no GA4 to check for
                    injectIframeForEmbed(
                      widid,
                      targetdiv,
                      target,
                      widget_url,
                      practiceProfileAnchor,
                      placeholderIframe
                    );
                } else {
                    // inject the iframe for the embedded webplugin
                    injectIframeForEmbedWithGoogleLinker(
                      widid,
                      targetdiv,
                      target,
                      widget_url,
                      practiceProfileAnchor,
                      placeholderIframe
                    );
                }
            }
        }
    };

    function openWebpluginInNewWindowForMobile(widid, widget_url) {
        const linkerParam = getLinkerParamForIframeAnchor(widid);

        if (linkerParam !== '') {
          widget_url += '&_gl=' + linkerParam;
        }

        // on phone just open a new window with widget in it.
        window.open(widget_url);
    }

    /**
     * Injecting the 'embed' webplugin poses a challenge because it is intended to be inserted into the page
     * without a user interaction.
     *
     * The workaround is to fire a custom GA4 event and hook into when it completes, which should mean google linker
     * will be ready to generate the _gl query parameter.
     */
    function injectIframeForEmbedWithGoogleLinker(
        widid,
        targetdiv,
        target,
        widget_url,
        practiceProfileAnchor,
        placeholderIframe
    ) {
        // firing a custom event for attaching the embedded webplugin gives us an opportunity to run code later in the
        // GA4 lifecycle - meaning we have a far higher chance of google linker being ready
        if (window.gtag !== undefined && typeof window.gtag === 'function') {
            window.gtag('event', 'embed_webplugin_attached', {
                'event_callback': function() {
                    clearTimeout(embedIframeAtLastMoment); // clear the fallback / 'last moment' iframe insertion
                    triggerArtificialEventToRetrieveGoogleLinkerParam(widid);
                    injectIframeForEmbed(
                        widid,
                        targetdiv,
                        target,
                        widget_url,
                        practiceProfileAnchor,
                        placeholderIframe
                    );
                }
            });
        }

        // check that after the maximum time we allow, that we have inserted the embedded webplugin
        const embedIframeAtLastMoment = setTimeout(() => {
          if (!embedIframeInjected) {
            // we have exceeded the total allowable wait time for the GA4 event callback
            triggerArtificialEventToRetrieveGoogleLinkerParam(widid);
            injectIframeForEmbed(widid, targetdiv, target, widget_url, practiceProfileAnchor, placeholderIframe);
          } // else, we have already injected the iframe successfully post-ga4-event-callback
        }, maximumWaitTimeForGaEventCallback);
    }

    function injectIframeForEmbed(widid, targetdiv, target, widget_url, practiceProfileAnchor, placeholderIframe) {
        if (!embedIframeInjected) { // safety measure to ensure setTimeout race won't inject multiple iframes
            // get the value of the `_gl` parameter from the URL (used to check if we can safely initialise)
            const gl = getLinkerParamForPracticeProfileAnchor(widid);

            if (gl) {
                widget_url += '&_gl=' + gl;
            }

            placeholderIframe.replaceWith(buildEmbedWebpluginHtml(widid, target, widget_url));
            embedIframeInjected = true;
        }
    }

    /**
     * The embedded webplugin doesn't have the luxury of a 'Book now'/'Book appointment' anchor prior to being injected.
     * Instead, the next best thing is to artificially fire an event on the practice profile anchor, to retrieve the
     * google linker parameter from it.
     */
    function triggerArtificialEventToRetrieveGoogleLinkerParam(widid) {
        // google linker appends its analytics query parameter on mousedown
        const practiceProfileAnchor = document.getElementById(profileAnchorIdPrefix + widid);

        if (practiceProfileAnchor) {
            practiceProfileAnchor.dispatchEvent(
                new MouseEvent('mousedown', { bubbles: true })
            );
        }
    }

    function buildPracticeProfileLinkAnchor(widid, practice_url) {
      let anchorContainer = document.createElement('p');
      anchorContainer.style.fontSize = '14px';
      anchorContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
      anchorContainer.style.marginLeft = '10px';
      anchorContainer.style.color = '#666 !important';
      anchorContainer.style.margin = '20px 0 0 0';

      let anchor = document.createElement('a');
      anchor.id = profileAnchorIdPrefix + widid;
      anchor.textContent = 'healthengine.com.au';
      anchor.href = practice_url;
      anchor.style.color = '#008ec7 !important';
      anchor.target = '_blank';

      anchorContainer.appendChild(anchor);
      anchorContainer.insertAdjacentText('afterbegin', 'View our profile on ');

      return anchorContainer;
    }

    /**
     * Returns the placeholder iframe HTML for the embed webplugin, to avoid pop-in.
     */
    function buildEmbedWebpluginPlaceholderHtml(widid, target) {
      // by convention (prac admin interface) - specifies a % with the '%' symbol.
      let width = target.getAttribute('data-he-width') || '100%';
      // by convention (prac admin interface) - specifies a pixel value without the 'px' unit.
      let height = target.getAttribute('data-he-height') || '500';
      let extraCss = target.getAttribute('data-he-frame-css') || 'border: 2px solid #045475';

      let iframePlaceholder = document.createElement('div');
      iframePlaceholder.id = 'he-embed-' + widid;
      iframePlaceholder.className = 'he-webplugin';
      iframePlaceholder.name = 'open-appointments-widget-' + widid;
      iframePlaceholder.style.border = 'none';
      iframePlaceholder.setAttribute(
        'style', 'width: ' + width + ';' + ' height: ' + height + 'px; ' + extraCss
      );

      return iframePlaceholder;
    }

    /**
     * Returns the iframe HTML for the embed webplugin.
     */
    function buildEmbedWebpluginHtml(widid, target, widget_url) {
        // by convention (prac admin interface) - specifies a % with the '%' symbol.
        let width = target.getAttribute('data-he-width') || '100%';
        // by convention (prac admin interface) - specifies a pixel value without the 'px' unit.
        let height = target.getAttribute('data-he-height') || '500';
        let extraCss = target.getAttribute('data-he-frame-css') || 'border: 2px solid #045475';

        let embedIframe = document.createElement('iframe');
        embedIframe.id = 'he-embed-' + widid;
        embedIframe.src = encodeURI(widget_url);
        embedIframe.width = width;
        embedIframe.height = height + 'px';
        embedIframe.className = 'he-webplugin';
        embedIframe.name = 'open-appointments-widget-' + widid;
        embedIframe.style.border = 'none';
        embedIframe.setAttribute('style', extraCss);

        return embedIframe;
    }

    var he_popup_exists = function (widid){
        var popup = document.getElementById('he-webplugin-popup-' + widid);

        if(!popup){
            return false;
        }

        else{
            return true;
        }
    }

    var he_init_popup = function(widid, touch_device, widget_url) {
        // otherwise create lightbox popup
        popup = document.createElement('div'); // background overlay
        popup.id = 'he-webplugin-popup-' + widid;

        // Overlay styling
        /*popup.style.display = 'none';*/
        popup.style.position = "fixed";
        popup.style.zIndex = "9999";
        popup.style.width = "100%";
        popup.style.height = "100%";
        popup.style.textAlign = "center";
        popup.style.top = "0";
        popup.style.left = "0";
        popup.classList.add('he-popup', 'visible');
        //add animation class

        // Overlay tranparent background
        popup.style.backgroundColor = "rgba(0,0,0,0.6)";

        const linkerParam = getLinkerParamForIframeAnchor(widid);

        if (linkerParam !== '') {
            widget_url += '&_gl=' + linkerParam;
        }

        // Click event to hide the overlay
        popup.onclick = function() {
            he_hide_popup(popup);
        };

        popup.innerHTML = '<style type="text/css"> .he-popup{ transition: all 0.2s ease; visibility:hidden;opacity:0;display: block;} .he-popup.visible{visibility: visible;opacity:1.0;} .he-frame-container{transition: all 0.2s ease;-webkit-transform: translateY(-40px);-moz-transform: translateY(-40px);-ms-transform: translateY(-40px);-o-transform: translateY(-40px); transform: translateY(-40px); } .he-popup.visible .he-frame-container{transition: all 0.2s ease;-webkit-transform: translateY(-0px);-moz-transform: translateY(-0px);-ms-transform: translateY(-0px);-o-transform: translateY(-0px); transform: translateY(-0px);}</style>'+'<div style="height: 10%;"></div>'+
                            '<div class="he-frame-container" style="margin: 0 auto; width: '+(window.outerWidth<=720?'100%':'80%')+';max-width: 1080px; height: 80%; filter: none; border-radius: 24px; -webkit-mask-image: -webkit-linear-gradient(#fff, #fff); mask-image: linear-gradient(#fff, #fff);'+(touch_device?' overflow: auto; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); -webkit-overflow-scrolling: touch':' overflow: hidden')+'">'+
                            '<iframe width="100%" height="100%" src="'+encodeURI(widget_url)+'" name="open-appointments-widget-' + widid + '" style="box-sizing: border-box; -webkit-box-sizing: border-box; border-radius: 24px; border: none; background: white;"></iframe></div>';

        popup.getElementsByTagName('iframe')[0].onclick = function(e) { // prevent click events propagating though the iframe
            if (!e) e = window.event;
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
        };

        // Prevent background scrolling in touch devices
        if (touch_device) {
            try {
                popup.addEventListener('touchmove', function(e){e.stopPropagation();e.preventDefault();}, false);
            } catch(ex) {}
        }

        // Insert the overlay into the DOM after all existing body elements
        document.getElementsByTagName('body')[0].appendChild(popup);
    }

    // Hide Popup
    var he_hide_popup = function (popup){

        popup.classList.remove('visible');
        window.setTimeout(function() { popup.style.display = 'none'; }, 300)
        if (document.getElementsByClassName('he-widget-container')[0]) {
            document.getElementsByClassName('he-widget-container')[0].classList.remove('active');
        }
    }

    // Show Popup
    var he_show_popup = function (widid,widdocid){
        if (widdocid > 0)
            {
                frames['open-appointments-widget-' + widid].postMessage('changePractitioner:' + widdocid, he_url);
            }
        popup = document.getElementById('he-webplugin-popup-' + widid);
        if (popup) {
            popup.style.display = 'block';
            window.setTimeout(function() { popup.classList.add('visible'); }, 100);
        }
        return;
    }



    /* Load the widget after the page is ready */
    var readyStateCheckInterval = setInterval(function(){
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);
            if (script) {
                widget_setup(script);
            } else {
                var scripts = (document.body || document).getElementsByTagName("script"); // fallback to get all scripts...
                for (var c = 0, len = scripts.length ; c < len ; c++) {
                    widget_setup(scripts[c]);
                }
            }
        }
    }, 100);

    var isHexColor = function(hex) {
        return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
    };

    var isRGBColor = function(color) {
        return /(^rgb[(](?:\s*0*(?:\d\d?(?:\.\d+)?(?:\s*%)?|\.\d+\s*%|100(?:\.0*)?\s*%|(?:1\d\d|2[0-4]\d|25[0-5])(?:\.\d+)?)\s*(?:,(?![)])|(?=[)]))){3}[)]$)/i.test(color);
    };

    var hexToRGB = function(hex) {
        // Remove #
        hex = hex.replace(/^#+/i, '');

        if (hex.length == 3) {
            hex = convertTripletHexToFullHex(hex);
        }

        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);

        return {
            r: r,
            g: g,
            b: b
        }
    };

    var convertTripletHexToFullHex = function(hex) {
        return hex[0] + hex [0] + hex[1] + hex[1] + hex[2] + hex[2];
    };

    var isLightBackground = function(r, g, b) {
        return getContrast(r, g, b) > 125;
    };

    var getContrast = function(r, g, b) {
        //https://www.w3.org/TR/AERT/#color-contrast
        return ((parseInt(r) * 299) + (parseInt(g) * 587) + (parseInt(b) * 114)) / 1000;
    };
})();
