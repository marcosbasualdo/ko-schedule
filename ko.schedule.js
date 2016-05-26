(function(window){
    ko.components.register('schedule', {
        viewModel: ViewModel(),
        template: `
        <div class="schedule-widget">
            <div class="schedule-widget__info"">
                <!-- ko foreach: getTimeBlocks -->
                <div class="schedule-widget__infoblock" data-bind="css: {'schedule-widget__infoblock--firstofdate': $data.displayDate}">
                    <!-- ko if: $data.displayDate -->
                    <span class="schedule-widget__date" data-bind="text: $component.getDateStr($data.date)"></span>
                    <!-- /ko -->
                </div>   
                <!-- /ko -->   
            </div>
            <div class="schedule-widget__schedule">
                <div class="schedule-widget__infoevents">
                    <!-- ko foreach: infoevents -->
                    <div class="schedule-widget__event schedule-widget__event--info" data-bind="style: {
                        top: $component.getEventTopOffset($data), 
                        height: $component.getEventHeight($data)+'px'
                    }, attr: {id: $data.id && 'schedule-widget__event__'+$data.id}">
                        </span>
                        <span data-bind="text: $data.label" class="schedule-widget__event__label"></span>
                        <span class="schedule-widget__event__time">
                            <span data-bind="text: $data.start"></span> to <span data-bind="text: $data.end"></span>
                        </span>
                        <span data-bind="style:{'border-top-width': $component.getEventHeight($data) > 26 ? ($component.getEventHeight($data)-26)+'px' : 0}" class="schedule-widget__eventinfo__timearrow">
                    </div>   
                    <!-- /ko -->
                </div> 
                <div class="schedule-widget__background">
                    <!-- ko foreach: getTimeBlocks -->
                    <div class="schedule-widget__timeblock" data-bind="css: {'schedule-widget__timeblock--firstofdate': $data.displayDate}, attr: {id: $data.id && 'schedule-widget__event__'+$data.id}">
                        <span data-bind="text: $data.label"></span>
                    </div>   
                    <!-- /ko -->
                </div>
                <div class="schedule-widget__events">
                    <!-- ko foreach: events -->
                    <div class="schedule-widget__event" data-bind="
                    style: {
                        top: $component.getEventTopOffset($data), 
                        height: $component.getEventHeight($data)+'px'
                    }, 
                    attr: {
                        id: $data.id && 'schedule-widget__event__'+$data.id
                    },
                    event: { 
                        contextmenu: $component.getContextMenuHandler($data) 
                    }">
                        <span data-bind="text: $data.label" class="schedule-widget__event__label"></span>
                        <span class="schedule-widget__event__time">
                            From <span data-bind="text: $data.start"></span> to <span data-bind="text: $data.end"></span>
                        </span>
                    </div>   
                    <!-- /ko -->
                </div>    
            </div>
        </div>`
    });

    var contextualMenuDomElem = $('<ul class="contextual-menu">');
    var contextualMenuItemDomElem = $('<li class="contextual-menu__item">');
    var contextualMenuItemIconDomElem = $('<span class="contextual-menu__item__icon"><i class="fa">');

    $(function(){
        $(window).on('resize', () => {
            contextualMenuDomElem.hide();
        });
        $(window).on('scroll', () => {
            contextualMenuDomElem.hide();
        });
        $('html').on('click', () => {
            contextualMenuDomElem.hide();
        });
    })

    function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    function timeToDecimal(time){
        var start = time.split(':');
        var sum = 0;
        for(var i = start.length - 1; i >= 0; i--){
            if(i == 3){
                sum = sum + (parseFloat(start[i] / 36000));
            }
            if(i == 2){
                sum = sum + (parseFloat(start[i] / 3600));
            }
            if(i == 1){
                sum = sum + (parseFloat(start[i] / 60));
            }
            if(i == 0){
                sum = sum + parseFloat(start[i]);
            }
        }
        return sum;
    }

    function decimalToTime(decimal){

        var hours = Math.floor(decimal % 60);
        var minutes = Math.floor(Math.floor((decimal * 60) % 60));
        var seconds = parseFloat(parseFloat((decimal * 3600) % 60).toFixed(2)) % 60;

        // TODO: This pad mapping can be simplified by right currying the pad function with 2.
        return [hours, minutes, seconds].map(function(n){return pad(n,2)}).join(':');
    }

    function getDateStr(date){
        return date.toLocaleString('en', {month: 'long', day: 'numeric'});
    }

    function locateIntoView(elem){
        var hide = false;
        if(!elem.is(':visible')){
            hide = true;
        }
        elem.show();
        var win = $(window);
        var elemOffset = elem.offset();
        var elemHeight = elem.height();
        var elemWidth = elem.width();
        var visibleToY = win.height() + win.scrollTop();
        var visibleToX = win.width() + win.scrollLeft();
        if(elemHeight + elemOffset.top > visibleToY){
            var top = elemOffset.top - elemHeight;
            elem.css({
                top: top > 0 ? top : 0 + 'px'
            });
        }
        if(elemWidth + elemOffset.left > visibleToX){
            var left = elemOffset.left - elemWidth;
            elem.css({
                left: left > 0 ? left : 0 + 'px'
            });
        }
        if(hide) elem.hide();
    }

    function TimeBlock(time){
        this.time = time;
        this.date;
        this.displayDate = false;
        this.id;
    }

    Object.defineProperty(TimeBlock.prototype, 'label', {
        get:function(){
            return decimalToTime(this.time);
        }
    });

    function Event(label, start, duration, date){
        this.label = label;
        this.start = start;
        this.duration = duration;
        this.date = date;
        this.id;
        this.item;
    }

    Object.defineProperty(Event.prototype, 'end', {
        get:function(){
            return decimalToTime(timeToDecimal(this.start()) + timeToDecimal(this.duration()));
        }
    });
    function ViewModel() {



        var _blocks;

        var d = new Date();
        
        var defaults = {
            block: ko.observable('00:30:00'),
            start: ko.observable('00:00:00'),
            duration: ko.observable('24:00:00'),
            blockHeight: ko.observable(30),
            dayStartsAt: ko.observable('00:00:00'),
            startDate: ko.observable(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        };

        function getEventGeneratorFromObservableArray(observable){
            return ko.computed(function(){
                return (observable() && observable().map(function(ev){
                        if(!ev.duration && ev.end){
                            ev.duration = ko.observable(decimalToTime(timeToDecimal(ev.end()) - timeToDecimal(ev.start())));
                        }
                        var event = new Event(ev.label, ev.start, ev.duration, ev.date);
                        if(ev.id != void 0){
                            event.id = ev.id
                        }
                        if(ev.item){
                            event.item = ev.item;
                        }
                        return event;
                    })) || [];
            }, this);
        }


        function ScheduleWidgetViewModel(params) {
            this.eventsDefinition = params.events || ko.observableArray([]);
            this.infoEventsDefinition = params.info || ko.observableArray([]);
            this.contextMenuProvider = params.contextMenuProvider || function(){};
            this.options = $.extend({}, defaults, params.options || {});
            this.start = this.options.start;
            this.duration = this.options.duration;
            this.events = getEventGeneratorFromObservableArray(this.eventsDefinition);
            this.getTimeBlocks = ko.computed(function() {
                var blocks = [];
                var d = new Date(this.options.startDate().getTime());
                var currentDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
                currentDate.setDate(currentDate.getDate() - 1);

                var blockSize = timeToDecimal(this.options.block());
                var startTime = timeToDecimal(this.start());
                var end = startTime + timeToDecimal(this.duration());

                for(var s = startTime; s < end; s = s + blockSize){
                    var hour = (s % 24);
                    var block = new TimeBlock(hour);

                    if(decimalToTime(hour) == this.options.dayStartsAt()){
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                     
                    var d = new Date(currentDate.getTime());
                    block.date = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

                    if((decimalToTime(hour) == this.options.dayStartsAt()) || blocks.length == 0){
                        block.displayDate = true;
                    }
                    block.id = currentDate.getTime()+'_'+block.label;
                    blocks.push(block);
                };
                return blocks;

            }.bind(this));
            this.infoevents = getEventGeneratorFromObservableArray(this.infoEventsDefinition);
        }

        ScheduleWidgetViewModel.prototype.getDateStr = getDateStr;



        ScheduleWidgetViewModel.prototype.getContextMenuHandler = function(scheduleEvent){
            var self = this;
            return function(scheduleEvent, jsEvent){
                if(self.contextMenuProvider){
                    var actions = self.contextMenuProvider(scheduleEvent);
                    contextualMenuDomElem.empty();
                    if(actions){
                        actions.forEach(action => {
                            var item = contextualMenuItemDomElem.clone();
                            var icon = contextualMenuItemIconDomElem.clone();

                            item.bind('click', () => {
                                contextualMenuDomElem.hide();
                                action.action();
                            });

                            item.html(action.label);

                            if(action.faIcon){
                                icon.find('i').addClass(['fa',action.faIcon].join('-'));
                            }
                            item.prepend(icon);

                            contextualMenuDomElem.append(item);

                            contextualMenuDomElem.css({
                                top: jsEvent.pageY+'px',
                                left: jsEvent.pageX+'px'
                            });

                            $('body').append(contextualMenuDomElem);

                        });
                    };
                    locateIntoView(contextualMenuDomElem);
                    contextualMenuDomElem.show();
                }
            }
        };

        ScheduleWidgetViewModel.prototype.getTopOffsetFromStartTime = function(time, date){
            if(time == '16:00:00') debugger;
            var blocks = this.getTimeBlocks();
            var count = 0;
            var blockTime = timeToDecimal(this.options.block());
            var eventTime = timeToDecimal(time);
            var hourTime = timeToDecimal('01:00:00');
            for(var i in blocks){
                var blockDate = blocks[i].date;
                if([blockDate.getUTCFullYear(), blockDate.getUTCMonth(), blockDate.getUTCDate()].join('-') != [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()].join('-')){
                    count++;
                }else{
                    var t = blocks[i].time;
                    if(eventTime >= t && eventTime < t+blockTime){
                        break;
                    }
                    count++;
                }
            }
            return count*this.options.blockHeight()+((eventTime % blockTime) * this.options.blockHeight() * (Math.floor(hourTime / blockTime)))+'px';
        };

        ScheduleWidgetViewModel.prototype.getHeightFromDuration = function(duration) {
            var blockTime = timeToDecimal(this.options.block());
            var hourTime = timeToDecimal('01:00:00');
            var height = (timeToDecimal(duration) * (Math.floor(hourTime / blockTime) * this.options.blockHeight()));
            return height > 1 ? height : 2;
        }

        ScheduleWidgetViewModel.prototype.getEventTopOffset = function(ev){
            return this.getTopOffsetFromStartTime(ev.start(), ev.date());
        };

        ScheduleWidgetViewModel.prototype.getEventHeight = function(ev){
            return this.getHeightFromDuration(ev.duration());
        };

        window.scheduleWidget = {
            utils: {
                decimalToTime: decimalToTime,
                timeToDecimal: timeToDecimal
            }
        };

        return ScheduleWidgetViewModel;

    }
})(window);