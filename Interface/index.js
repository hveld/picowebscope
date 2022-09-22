unit = [["00 us", " ms", "0 ms", "00 ms", " s"],        //time per division
["0 mV/div", "00 mV/div", " V/div"]]        //voltage per division
ArrayToPico = []
switchStateArray = [false, false]
var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
var amplitude = 60,
    phase = 90,
    frequency = 2;

function Createfunction() {
    ctx.beginPath();
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.closePath();
    var i;
    var counter = 0, x = 0, y = 180;
    // period = 1 / frequency
    //100 iterations
    var increase = 0.5 * Math.PI / 90;
    for (i = 0; i <= 360; i++) {
        ctx.moveTo(x, y);
        x = i;
        y = 180 - Math.sin((counter + phase) * frequency) * amplitude;
        counter += increase;
        ctx.lineTo(x, y);
    }
    ctx.stroke(); // Don't stroke for each iteration of the loop.
}


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
    console.log(switchStateArray[SwitchstateIndex]);
    return switchStateArray[SwitchstateIndex];
}

$('#timePerDivisionSlider').on("input change", function () {
    unitIndex = 0;
    ValueTimePerDivsionToPico = RangeSliderHandler("timePerDivisionSlider", unitIndex);
    ArrayToPico[unitIndex] = ValueTimePerDivsionToPico;
    frequency = ValueTimePerDivsionToPico;
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
});

$('#some-switch').on("input", function () {
    SwitchstateIndex = 1;
    ValueSwitchSomeSwitch = SwitchHandler(SwitchstateIndex);
    ArrayToPico.push(ValueSwitchSomeSwitch);
});

$('#updateButton').on("click", function () {
    Createfunction();
});

