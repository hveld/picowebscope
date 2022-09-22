unit = [["00 us", " ms", "0 ms", "00 ms", " s"],        //time per division
["0 mV/div", "00 mV/div", " V/div"]]        //voltage per division
ArrayToPico = []
switchStateArray = [false, false]

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
let width = screen.width;
let height = screen.height;
canvas.width = width;
canvas.height = height;
var amplitude = 120,
    phase = 90,
    frequency = 2;
let arraySin = [[40, 100], [900, 200], [200, 600], [40, 100]]
let normalisedArray = []
function testCreateFunction() {
    normalise(arraySin)
    context.beginPath();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.closePath();
    for (i = 0; i < normalisedArray.length - 1; i++) {
        context.moveTo(normalisedArray[i][0], normalisedArray[i][1]);
        context.lineTo(normalisedArray[i + 1][0], normalisedArray[i + 1][1]);
    }
    context.stroke(); // Don't stroke for each iteration of the loop.
    drawAxis()

}

function drawAxis() {
    var grid_size = 25;
    var x_axis_distance_grid_lines = 0;
    var y_axis_distance_grid_lines = 0;
    var x_axis_starting_point = { number: 1, suffix: '\u03a0' };
    var y_axis_starting_point = { number: 1, suffix: '' };

    var canvas_width = canvas.width;
    var canvas_height = canvas.height;

    var num_lines_x = Math.floor(canvas_height / grid_size);
    var num_lines_y = Math.floor(canvas_width / grid_size);

    // Draw grid lines along X-axis
    for (var i = 0; i <= num_lines_x; i++) {
        context.beginPath();
        context.lineWidth = 1;

        // If line represents X-axis draw in different color
        if (i == x_axis_distance_grid_lines)
            context.strokeStyle = "#000000";
        else
            context.strokeStyle = "#e9e9e9";

        if (i == num_lines_x) {
            context.moveTo(0, grid_size * i);
            context.lineTo(canvas_width, grid_size * i);
        }
        else {
            context.moveTo(0, grid_size * i + 0.5);
            context.lineTo(canvas_width, grid_size * i + 0.5);
        }
        context.stroke();
    }

    // Draw grid lines along Y-axis
    for (i = 0; i <= num_lines_y; i++) {
        context.beginPath();
        context.lineWidth = 1;

        // If line represents X-axis draw in different color
        if (i == y_axis_distance_grid_lines)
            context.strokeStyle = "#000000";
        else
            context.strokeStyle = "#e9e9e9";

        if (i == num_lines_y) {
            context.moveTo(grid_size * i, 0);
            context.lineTo(grid_size * i, canvas_height);
        }
        else {
            context.moveTo(grid_size * i + 0.5, 0);
            context.lineTo(grid_size * i + 0.5, canvas_height);
        }
        context.stroke();
    }

    // Translate to the new origin. Now Y-axis of the canvas is opposite to the Y-axis of the graph. So the y-coordinate of each element will be negative of the actual
    context.translate(y_axis_distance_grid_lines * grid_size, x_axis_distance_grid_lines * grid_size);

    // Ticks marks along the positive X-axis
    for (i = 1; i < (num_lines_y - y_axis_distance_grid_lines); i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = "#000000";

        // Draw a tick mark 6px long (-3 to 3)
        context.moveTo(grid_size * i + 0.5, -3);
        context.lineTo(grid_size * i + 0.5, 3);
        context.stroke();

        // Text value at that point
        context.font = '9px Arial';
        context.textAlign = 'start';
        context.fillText(x_axis_starting_point.number * i + x_axis_starting_point.suffix, grid_size * i - 2, 15);
    }

    // Ticks marks along the negative X-axis
    for (i = 1; i < y_axis_distance_grid_lines; i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = "#000000";

        // Draw a tick mark 6px long (-3 to 3)
        context.moveTo(-grid_size * i + 0.5, -3);
        context.lineTo(-grid_size * i + 0.5, 3);
        context.stroke();

        // Text value at that point
        context.font = '9px Arial';
        context.textAlign = 'end';
        context.fillText(-x_axis_starting_point.number * i + x_axis_starting_point.suffix, -grid_size * i + 3, 15);
    }

    // Ticks marks along the positive Y-axis
    // Positive Y-axis of graph is negative Y-axis of the canvas
    for (i = 1; i < (num_lines_x - x_axis_distance_grid_lines); i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = "#000000";

        // Draw a tick mark 6px long (-3 to 3)
        context.moveTo(-3, grid_size * i + 0.5);
        context.lineTo(3, grid_size * i + 0.5);
        context.stroke();

        // Text value at that point
        context.font = '9px Arial';
        context.textAlign = 'start';
        context.fillText(-y_axis_starting_point.number * i + y_axis_starting_point.suffix, 8, grid_size * i + 3);
    }

    // Ticks marks along the negative Y-axis
    // Negative Y-axis of graph is positive Y-axis of the canvas
    for (i = 1; i < x_axis_distance_grid_lines; i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = "#000000";

        // Draw a tick mark 6px long (-3 to 3)
        context.moveTo(-3, -grid_size * i + 0.5);
        context.lineTo(3, -grid_size * i + 0.5);
        context.stroke();

        // Text value at that point
        context.font = '9px Arial';
        context.textAlign = 'start';
        context.fillText(y_axis_starting_point.number * i + y_axis_starting_point.suffix, 8, -grid_size * i + 3);
    }
}

function normalise(arrayInput) {
    minX = 1080;
    minY = 1920;
    maxX = 0;
    maxY = 0;
    for (i = 0; i < arrayInput.length; i++) {
        if (minX > Math.min(arrayInput[i][0])) minX = Math.min(arrayInput[i][0]);
        if (maxX < Math.max(arrayInput[i][0])) maxX = Math.max(arrayInput[i][0]);
        if (minY > Math.min(arrayInput[i][1])) minY = Math.min(arrayInput[i][1]);
        if (maxY < Math.min(arrayInput[i][1])) maxY = Math.max(arrayInput[i][1]);
    }
    console.log(minX, minY, maxX, maxY)
    for (i = 0; i < arrayInput.length; i++) {
        normalisedX = (width * 0.9) * (arrayInput[i][0] - minX) / (maxX - minX);
        normalisedY = (height * 0.9) * (arrayInput[i][1] - minY) / (maxY - minY);
        tmpArray = [normalisedX, normalisedY];
        normalisedArray[i] = tmpArray;
    }
    console.log(normalisedArray);
}

function Createfunction() {
    context.beginPath();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.closePath();
    var i;
    var counter = x = height / 2, y = width / 2;
    // period = 1 / frequency
    //100 iterations
    var increase = 0.5 * Math.PI / 90;
    for (i = 0; i <= 360; i++) {
        context.moveTo(x, y);
        x = i;
        y = 180 - Math.sin((counter + phase) * frequency) * amplitude;
        counter += increase;
        context.lineTo(x, y);
    }
    context.stroke(); // Don't stroke for each iteration of the loop.
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
    testCreateFunction();
});

