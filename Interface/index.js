ArrayToPico = [100, 10]
switchStateArray = [false, false]
var arraySin = [];
var delayBetweenCalls = 20;

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
    arraySin.push(JSON.parse(event.data))             //for sending data 1 by one
    //arraySin = JSON.parse(event.data).data          //for sending data once
    if (arraySin.length >= 360) {
        arraySin.length = 0
    }
});

class graph {
    constructor() {
        this.margin = { top: 100, right: 100, bottom: 100, left: 100 },
            this.width = window.innerHeight * 2 - this.margin.left - this.margin.right,
            this.height = window.innerHeight - this.margin.top - this.margin.bottom,
            this.numTicksX = 10,
            this.numTicksY = 8,
            this.tickSpace = 0;
        this.width = this.width;
        this.height = this.height;
        this.updateGraphWithAxes();
    }

    updateGraphWithAxes() {
        this.removeGraph()
        this.createAxes(ArrayToPico[0], ArrayToPico[1]);
        this.drawLinesInGraph();
        this.drawLine()
    }

    createAxes(axisNumberOnX, axisNumberOnY) {
        var y = d3.scaleLinear()            //calculate numbers for the y axis
            .range([this.height, 0])
            .domain([0, this.numTicksY * axisNumberOnY])
        var x = d3.scaleLinear()             //calculate numbers for the x axis
            .range([0, this.width])
            .domain([0, this.numTicksX * axisNumberOnX])
        this.x = x;
        this.y = y;
        return;
    }

    drawLinesInGraph() {
        this.svg = d3.select("#chart").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .style("filter", "url(#I)")
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.svg.append("g")                             //draws lines vertically and numbers x-axis
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.x).tickSize(-this.height).ticks(this.numTicksY))
            .selectAll("line")
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksY; k += 1) {
                    dashArray.push((this.height / this.numTicksY - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })
        this.svg.append("text")                          // text label for the x axis
            .attr("x", this.width / 2)
            .attr("y", this.height + 30)
            .style("text-anchor", "middle")
            .text("us/div");
        this.svg.append("g")                             //draws lines horizontally and numbers y-axis
            .attr("class", "y axis")
            .call(d3.axisLeft(this.y).tickSize(-this.width).ticks(this.numTicksX))
            .selectAll("line")
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksX; k += 1) {
                    dashArray.push((this.width / this.numTicksX - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })

        this.svg.append("text")                          // text label for the y axis
            .attr("x", -50)
            .attr("y", this.height / 2)
            .style("text-anchor", "middle")
            .text("mV/div");
    }
    async drawLine() {
        var strokeWidth = 10,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the Pico.
            maxX = 360,
            minY = 60,
            maxY = 300;
        var x1, x2, y1, y2 = 0;
        //stationary function

        for (var i = 0; i < arraySin.length - 1; i++) {
            x1 = this.Conversion(arraySin[i].x, minX, maxX, 'x');
            y1 = this.Conversion(arraySin[i].y, minY, maxY, 'y');
            x2 = this.Conversion(arraySin[i + 1].x, minX, maxX, 'x');
            y2 = this.Conversion(arraySin[i + 1].y, minY, maxY, 'y');
            this.graph_line = this.svg.append("line")
                .attr("id", "plotted_line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .style("stroke", "rgb(0,255,0)")
                .style("stroke-width", strokeWidth);
        }
    }
    removeGraph() {
        d3.select("svg").remove();
    }
    Conversion(Value, minDomain, maxDomain, axis) {
        var range = this.width;
        if (axis == 'y')
            range = this.height;
        else {
            range = this.width
        }
        var xy = d3.scaleLinear()
            .range([0, range])
            .domain([minDomain, maxDomain])
        return xy(Value)
    }
}

function RangeSliderHandler(SliderId, unitIndex) {
    var element = $('#' + SliderId),
        value = element.val()
    var unitArray, arrayForTimePerDivision = [];
    if (unitIndex == 0) {
        arrayForTimePerDivision = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000]
        unitArray = ["us/div", "s/div", "ms/div"];
    } else if (unitIndex == 1) {
        arrayForTimePerDivision = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
        unitArray = ["mV/div", "V/div"];
    }
    var valueToPico = arrayForTimePerDivision[value]
    var value = arrayForTimePerDivision[value]
    var unit = unitArray[0];
    if (Number.isInteger(value / 10 ** 6)) {
        unit = unitArray[unitArray.length - 2];
        value = value / 10 ** 6;
    } else if (Number.isInteger(value / 10 ** 3)) {
        unit = unitArray[unitArray.length - 1];
        value = value / 10 ** 3;
    }
    $('#' + SliderId + 'Value').text("Value: " + value + " " + unit);
    return valueToPico;
}

function SwitchHandler(SwitchstateIndex) {
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

graphPlotter = new graph();
var refreshSentDataId;
var keepAliveId;
var updateGraphID;

function normalise(Y, min, max) {
    normalisedY = (Y - min) / (max - min);
    return normalisedY;
}

function startUpdating(Value) {
    var delay = 55000;
    if (Value == true) {
        clearInterval(keepAliveId);
        refreshSentDataId = setInterval(Send_data, delayBetweenCalls);
    } else {
        clearInterval(refreshSentDataId)
        delay = 55000;
        keepAliveId = setInterval(keep_alive, delay);
    }
}

function updateoscilloscopePlotter() {
    graphPlotter.updateGraphWithAxes();
}
function startStopUpdatingGraph(Value) {
    if (Value == true) {
        updateGraphID = setInterval(updateoscilloscopePlotter, delayBetweenCalls);
    } else {
        clearInterval(updateGraphID); //stop updating graph
    }
}

// part of code that gets elements from html and uses all the above fuctions and classes
$('#timePerDivisionSlider').on("input change", function () {
    unitIndex = 0;
    ValueTimePerDivsionToPico = RangeSliderHandler("timePerDivisionSlider", unitIndex);
    ArrayToPico[unitIndex] = ValueTimePerDivsionToPico;
});

$('#VoltagePerDivisionSlider').on("input change", function () {
    unitIndex = 1;
    ValueVoltagePerDivsionToPico = RangeSliderHandler("VoltagePerDivisionSlider", unitIndex);
    ArrayToPico[unitIndex] = ValueVoltagePerDivsionToPico;
    var voltage = (ArrayToPico[2] / 100) * ValueVoltagePerDivsionToPico;
    $('#TriggerSliderValue').text("Value in percentage: " + ArrayToPico[2] + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
});

$('#TriggerSlider').on("input change", function () {
    unitIndex = 2;
    var element = $('#TriggerSlider'),
        value = element.val()
    var voltage = (value / 100) * ArrayToPico[1]
    $('#TriggerSliderValue').text("Value in percentage: " + value + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
    ArrayToPico[unitIndex] = value;
});

$('#on-off-switch').on("input", function () {
    unitIndex = 3;
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayToPico[unitIndex] = ValueSwitchOnOffSwitch;
    startUpdating(ValueSwitchOnOffSwitch);
    startStopUpdatingGraph(ValueSwitchOnOffSwitch);
});

$('#ACDCcoupling').on("input", function () {
    unitIndex = 4;
    SwitchstateIndex = 1;
    ValueSwitchACDC = SwitchHandler(SwitchstateIndex);
    ArrayToPico[unitIndex] = ValueSwitchACDC;
});

$('#channel').on("input", function () {
    unitIndex = 5;
    SwitchstateIndex = 2;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayToPico[unitIndex] = ValueSwitchChannel;
});