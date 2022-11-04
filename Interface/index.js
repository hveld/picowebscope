ArrayForScope = [100, 10, 0, 0, 0, 0]
ArrayForFFT = ["uniform", 0,0,0]
ArrayForWaveform = ["sinus", 0,0]
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
        this.width = this.width * 0.6;
        this.height = this.height * 0.6;
        this.updateGraphWithAxes();
    }

    updateGraphWithAxes() {
        this.removeGraph()
        this.createAxes(ArrayForScope[0], ArrayForScope[1]);
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
        var strokeWidth = 1,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the esp.
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
//code that handles all the graph stuff
graphPlotter = new graph();
var refreshSentDataId;
var keepAliveId;
var updateGraphID;

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

//functions for the scope sliders and buttons
function RangeSliderHandler(SliderId) {
    var element = $('#' + SliderId),
        value = element.val()
    var unitArray, arrayForTimePerDivision = [];
    if (SliderId == "timePerDivisionSlider") {
        arrayForTimePerDivision = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000]
        unitArray = ["us/div", "s/div", "ms/div"];
    } else if (SliderId == "VoltagePerDivisionSlider") {
        arrayForTimePerDivision = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
        unitArray = ["mV/div", "V/div"];
    }
    var returnValue = arrayForTimePerDivision[value]
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
    return returnValue;
}

switchStateArray = [false, false]
function SwitchHandler(SwitchstateIndex) {
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

function FFTScopeChange() {
    var scope = document.getElementById("scope");
    var FFT = document.getElementById("FFT");
    if (scope.style.display === "none") {
        scope.style.display = "block";
        FFT.style.display = "none";
    } else {
        scope.style.display = "none";
        FFT.style.display = "block";
    }
}

//submit button
function submit() {
//send the data to the esp
    console.log("submit button pressed");
    console.log(ArrayForScope);
    console.log(ArrayForFFT);
    console.log(ArrayForWaveform);
}


// part of code that checks for all the fields and buttons for the oscilloscope.
$('#timePerDivisionSlider').on("input change", function () {
    indexInScopeArray = 0;
    ValueTimePerDivsion = RangeSliderHandler("timePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueTimePerDivsionTo;
});

$('#VoltagePerDivisionSlider').on("input change", function () {
    indexInScopeArray = 1;
    ValueVoltagePerDivsion = RangeSliderHandler("VoltagePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueVoltagePerDivsion;
    var voltage = (ArrayForScope[2] / 100) * ValueVoltagePerDivsion;
    $('#TriggerSliderValue').text("Value in percentage: " + ArrayForScope[2] + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
});

$('#TriggerSlider').on("input change", function () {
    indexInScopeArray = 2;
    var element = $('#TriggerSlider'),
        value = element.val()
    var voltage = (value / 100) * ArrayForScope[1]
    $('#TriggerSliderValue').text("Value in percentage: " + value + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
    ArrayForScope[indexInScopeArray] = value;
});

$('#on-off-switch').on("input", function () {
    indexInScopeArray = 3;
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchOnOffSwitch;
    startUpdating(ValueSwitchOnOffSwitch);
    startStopUpdatingGraph(ValueSwitchOnOffSwitch);
});

$('#ACDCcoupling').on("input", function () {
    indexInScopeArray = 4;
    SwitchstateIndex = 1;
    ValueSwitchACDC = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchACDC;
});

$('#channel').on("input", function () {
    indexInScopeArray = 5;
    SwitchstateIndex = 2;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchChannel;
});

//code for the FFT
function changeWindowStyle() {
    indexInFFTArray = 0;
    let windowStyle = document.getElementById("window_style");
    let windowStyleValue = windowStyle.value;
    ArrayForFFT[indexInFFTArray] = windowStyleValue;}

$('#centreFrequencySlider').on("input change", function () {
    indexInFFTArray = 1;
    var element = $('#centreFrequencySlider'),                              //change this when the real values are kwown
        value = element.val()
    ArrayForFFT[indexInFFTArray] = value;                                     
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");
});

$('#bandwidthSlider').on("input change", function () {
    indexInFFTArray = 2;
    var element = $('#bandwidthSlider'),                                    //change this when the real values are kwown
        value = element.val()
    ArrayForFFT[indexInFFTArray] = value;                                     
    $('#bandwidthSliderValue').text("bandwidth : " + value);
});

$('#scanRateSlider').on("input change", function () {
    indexInFFTArray = 3;
    var element = $('#scanRateSlider'),                                     //change this when the real values are kwown
        value = element.val()
    ArrayForFFT[indexInFFTArray] = value;                                     
    $('#scanRateSliderValue').text("scan rate : " + value);
});

//code for the waveformgenerator
function changeGolfStyle() {
    indexInWFGArray = 0;
    let golfStyle = document.getElementById("golf_style");
    let golfStyleValue = golfStyle.value;
    ArrayForWaveform[indexInWFGArray] = golfStyleValue;
}
$('#frequencySlider').on("input change", function () {
    indexInWFGArray = 1;
    var element = $('#frequencySlider'),                                    //change this when the real values are kwown
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = value;
    $('#frequencySliderValue').text("Value : " + value + " Hz");
});

$('#dutycycleSlider').on("input change", function () {
    indexInWFGArray = 2;
    var element = $('#dutycycleSlider'),                                    //change this when the real values are kwown
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = value;
    $('#dutycycleSliderValue').text("Value : " + value + " %");
});
