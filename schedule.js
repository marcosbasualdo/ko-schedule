(function(window){
    ko.components.register('schedule', {
        viewModel: ViewModel(),
        template: `
        <div class="schedule-widget">
            <div class="schedule-widget__info"">
                <!-- ko foreach: getTimeBlocks() -->
                <div class="schedule-widget__infoblock" data-bind="css: {'schedule-widget__infoblock--firstofdate': $data.displayDate}">
                    <!-- ko if: $data.displayDate -->
                    <span class="schedule-widget__date" data-bind="text: $component.getDateStr($data.date)"></span>
                    <!-- /ko -->
                </div>   
                <!-- /ko -->   
            </div>
            <div class="schedule-widget__schedule">
                <div class="schedule-widget__background">
                    <!-- ko foreach: getTimeBlocks() -->
                    <div class="schedule-widget__timeblock" data-bind="css: {'schedule-widget__timeblock--firstofdate': $data.displayDate}, attr: {id: $data.id && 'schedule-widget__event__'+$data.id}">
                        <span data-bind="text: $data.label"></span>
                    </div>   
                    <!-- /ko -->
                </div>
                <div class="schedule-widget__events">
                    <!-- ko foreach: getEvents() -->
                    <div class="schedule-widget__event" data-bind="style: {
                        top: $component.getEventTopOffset($data), 
                        height: $component.getEventHeight($data)
                    }, attr: {id: $data.id && 'schedule-widget__event__'+$data.id}">
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
        var minThreshold = timeToDecimal('00:00:59');
        var secThreshold = timeToDecimal('00:00:00:1');

        var hours = Math.floor((decimal + minThreshold) % 60);
        var minutes = Math.floor(Math.floor(((decimal * 60) + secThreshold) % 60));
        var seconds = parseFloat(parseFloat((decimal * 3600) % 60).toFixed(2)) % 60;

        // TODO: This pad mapping can be simplified by right currying the pad function with 2.
        return [hours, minutes, seconds].map(function(n){return pad(n,2)}).join(':');
    }

    function getDateStr(date){
        return date.toLocaleString('en', {month: 'long', day: 'numeric'});
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
    }

    Object.defineProperty(Event.prototype, 'end', {
        get:function(){
            return decimalToTime(timeToDecimal(this.start) + timeToDecimal(this.duration));
        }
    });
    function ViewModel() {



        var _blocks;

        var defaults = {
            block: 60,
            start: 0,
            end: 24,
            blockHeight: 30,
            dayStartsAt: 0,
            startDate: new Date()
        };

        function ScheduleWidgetViewModel(params) {
            this.eventsDefinition = params.events || [];
            this.options = $.extend({}, defaults, params.options || {});
            this.start = this.options.start;
            this.duration = this.options.duration;
        }


        ScheduleWidgetViewModel.prototype.getEvents = function() {
            return (this.eventsDefinition && this.eventsDefinition.map(function(ev){
                var event = new Event(ev.label, ev.start, ev.duration, ev.date);
                if(ev.id != void 0){
                    event.id = ev.id
                }
                return event;
            })) || [];
        };

        ScheduleWidgetViewModel.prototype.getDateStr = getDateStr;

        ScheduleWidgetViewModel.prototype.getTimeBlocks = function() {
            if(!_blocks){
                var blocks = [];
                var currentDate = new Date(this.options.startDate.getTime());
                currentDate.setDate(currentDate.getDate() - 1);

                var blockSize = timeToDecimal(this.options.block);
                var startTime = timeToDecimal(this.start);
                var end = startTime + timeToDecimal(this.duration);

                for(var s = startTime; s < end; s = s + blockSize){
                    var hour = (s % 24);
                    var block = new TimeBlock(hour);

                    if(decimalToTime(hour) == this.options.dayStartsAt){
                        currentDate.setDate(currentDate.getDate() + 1);
                    }

                    block.date = new Date(currentDate.getTime());

                    if((decimalToTime(hour) == this.options.dayStartsAt) || blocks.length == 0){
                        block.displayDate = true;
                    }
                    block.id = currentDate.getTime()+'_'+block.label;
                    blocks.push(block);
                };
                _blocks = blocks;
            }
            return _blocks;
        };



        ScheduleWidgetViewModel.prototype.getEventTopOffset = function(ev){
            var blocks = this.getTimeBlocks();
            var count = 0;
            var blockTime = timeToDecimal(this.options.block);
            var eventTime = timeToDecimal(ev.start);
            var hourTime = timeToDecimal('01:00:00');
            for(var i in blocks){
                if(blocks[i].date.getTime() != ev.date.getTime()){
                    count++;
                }else{
                    var t = blocks[i].time;
                    if(eventTime >= t && eventTime < t+blockTime){
                        break;
                    }
                    count++;
                }
            }
            return count*this.options.blockHeight+((eventTime % blockTime) * this.options.blockHeight * (Math.floor(hourTime / blockTime)))+'px';
        };

        ScheduleWidgetViewModel.prototype.getEventHeight = function(ev){
            var blockTime = timeToDecimal(this.options.block);
            var hourTime = timeToDecimal('01:00:00');
            return (timeToDecimal(ev.duration) * (Math.floor(hourTime / blockTime) * this.options.blockHeight)) + 'px';
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