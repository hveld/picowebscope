unit = [["00 us/div", " ms/div", "0 ms/div", "00 ms/div", " s/div"],        //time per division
["0 mV/div", "00 mV/div", " V/div"]]        //voltage per division
ArrayToPico = [100, 10]
switchStateArray = [false, false]
var arraySin;

var smoothie = new SmoothieChart({ minValue: 60, maxValue: 300, millisPerPixel: 25, scrollBackwards: true, tooltip: true, timestampFormatter: SmoothieChart.timeFormatter });
smoothie.streamTo(document.getElementById("mycanvas"));
smoothie.stop();

const socket = new WebSocket('ws://localhost:8000');


socket.addEventListener('open', function (event) {

    socket.send('Connection Established');

});
function Send_data() {
    socket.send("request_data");
}

function keep_alive() {
    socket.send("keep_alive")
}

socket.addEventListener('message', function (event) {
    arraySin = JSON.parse(event.data)
});

function RangeSliderHandler(SliderId, unitIndex) {
    var
        element = $('#' + SliderId),
        value = element.val(),
        values = [1, 2, 5]
    let unitNmbr = 0;
    if (value >= 3) {
        unitNmbr = Math.floor(value / 3);
        value = value % 3;
    }
    $('#' + SliderId + 'Value').text("Value: " + values[value] + unit[unitIndex][unitNmbr]);
    return parseInt(values[value]) * 100 * (10 ** unitNmbr);
}

function SwitchHandler(SwitchstateIndex) {
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

// graphPlotter = new graph();
var refreshSentDataId;
var keepAliveId;

function normalise(Y, min, max) {
    normalisedY = (Y - min) / (max - min);
    return normalisedY;
}

function startUpdating(Value) {
    var delay = 55000;
    if (Value == true) {
        delay = 450;
        clearInterval(keepAliveId);
        refreshSentDataId = setInterval(Send_data, delay);
    } else {
        clearInterval(refreshSentDataId)
        delay = 55000;
        keepAliveId = setInterval(keep_alive, delay);
    }
}

function startStop(Value) {
    if (Value == true) {
        smoothie.start();
    } else {
        smoothie.stop();
    }
}


// part of code that gets elements from html and uses all the above fuctions.
$('#timePerDivisionSlider').on("input change", function () {
    unitIndex = 0;
    ValueTimePerDivsionToPico = RangeSliderHandler("timePerDivisionSlider", unitIndex);
    ArrayToPico[unitIndex] = ValueTimePerDivsionToPico;

});

$('#VoltagePerDivisionSlider').on("input change", function () {
    unitIndex = 1;
    ValueVoltagePerDivsionToPico = RangeSliderHandler("VoltagePerDivisionSlider", unitIndex);
    ArrayToPico[unitIndex] = ValueVoltagePerDivsionToPico;
});
$('#on-off-switch').on("input", function () {
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayToPico.push(ValueSwitchOnOffSwitch);
    startUpdating(ValueSwitchOnOffSwitch);
});

$('#some-switch').on("input", function () {
    SwitchstateIndex = 1;
    ValueSwitchSomeSwitch = SwitchHandler(SwitchstateIndex);
    ArrayToPico.push(ValueSwitchSomeSwitch);
    startStop(ValueSwitchSomeSwitch);
});

// Data
var line1 = new TimeSeries();

setInterval(function () {
    //normalise(arraySin["y"], 60, 300)                         //normalise the data only necessary if the values are not between 0 and 1 and this is wanted
    line1.append(new Date().getTime(), arraySin["y"]);              //60 and 300 are the max values for y. This needs to be given from the hardware/ calculated
    arraySin = NaN;
}, 500);

// Add to SmoothieChart
smoothie.addTimeSeries(line1, { lineWidth: 1.6, strokeStyle: '#00ff00' });
// smoothie.streamTo(document.getElementById("mycanvas"), 1000 /*delay*/);
