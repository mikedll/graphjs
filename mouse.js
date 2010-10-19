/**
 * Capture mouse scroll
 * 
 * http://www.ogonek.net/mousewheel/demo.html
 * http://adomas.org/javascript-mouse-wheel/
 * 
 */
Object.extend(Event, {
        wheel:function (event){
                var delta = 0;
                if (!event) event = window.event;
                if (event.wheelDelta) {
                        delta = event.wheelDelta/120; 
                        if (window.opera) delta = -delta;
                } else if (event.detail) { delta = -event.detail/3;     }
                return Math.round(delta); //Safari Round
        }
});
/*
 * end of extension 
 */

