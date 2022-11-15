ArrayForScope = [100, 10, 0, 0, 0, 0]
ArrayForFFT = ["uniform", 0, 0, 0]
ArrayForWaveform = ["sinus", 0, 0]
var dataArray = [];
var delayBetweenCalls = 50;

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
    dataArray.push(JSON.parse(event.data))             //for sending data 1 by one
    //dataArray = JSON.parse(event.data).data
    if (dataArray.length > 360) {
        dataArray.length = 0
    }
});
class Graph{
    constructor(nameOfChart,widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        this.nameOfChart = nameOfChart;
        this.widthRatio = widthRatio;
        this.heightRatio = heightRatio;
        this.xAxisName = XaxisName;
        this.yAxisName = YaxisName;
        this.numTicksX = numTicksX;
        this.numTicksY = numTicksY;
        this.tickSpace = 0;
        this.margin = { top: 100, right: 100, bottom: 100, left: 100 },
            this.width = window.innerHeight * 2 - this.margin.left - this.margin.right,
            this.height = window.innerHeight - this.margin.top - this.margin.bottom,
        this.width = this.width * this.widthRatio;
        this.height = this.height * this.heightRatio;
        this.graphPoints = [];
    }

    createAxes(axisNumberOnX, axisNumberOnY) {
        var y = d3.scaleLinear()            //calculate numbers for the y axis
            .range([this.height, 0])
            .domain([0, this.numTicksY * axisNumberOnY])
        var x = d3.scaleLinear()             //calculate numbers for the x axis
            .range([0, this.width])
            .domain([0, this.numTicksX * axisNumberOnX])
        this.xAxis = x;
        this.YAxis = y;
        return;
    }

    drawLinesInGraph() {
        this.svg = d3.select("#Chart").append("svg")                                                                  // change this to the name of the chart?                         
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .style("filter", "url(#I)")
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.svg.append("g")                             //draws lines vertically and numbers x-axis
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height).ticks(this.numTicksY))
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
            .text(this.xAxisName);

        this.svg.append("g")                             //draws lines horizontally and numbers y-axis
            .attr("class", "y axis")
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width).ticks(this.numTicksX))
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
            .text(this.yAxisName);
    }

    updateAxes(AxisNumberOnX, AxisNumberOnY) {
        this.removeGraph();
        this.createAxes(AxisNumberOnX,AxisNumberOnY);
        this.drawLinesInGraph();
        this.updateGraph();
    }

    removeGraph() {
        d3.select("svg").remove();
    }
    removeDataPoints() {
        for (var i = 0; i < this.graphPoints.length; i++) {
            this.graphPoints[i].remove();
        }
        this.graphPoints = [];
    }

    Conversion(Value, minDomain, maxDomain, axis) {                                         //can be deleted later
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
class OscilloscopeGraph extends Graph{
    constructor(nameOfChart,widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        super(nameOfChart,widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY);
        this.maxX = this.numTicksX*100;
        this.minY = this.numTicksY*10;
        this.createAxes(ArrayForScope[0], ArrayForScope[1]);        
        this.drawLinesInGraph();
        this.updateGraph();
    }
    updateGraph() {
        this.removeDataPoints()
        this.drawLine()
    }

    updateMinMax(maxX, minY){
        this.maxX = maxX*this.numTicksX;
        this.minY = minY*this.numTicksY;
    }

    async drawLine() {
        var strokeWidth = 1,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the esp.
            maxX = this.maxX,           
            minY = this.minY,                        
            maxY = 0;
        var x1, x2, y1, y2 = 0;
        //stationary function
        for (var i = 0; i < dataArray.length - 1; i++) {
            y1 = dataArray[i].y;
            y2 = dataArray[i+1].y;
            if (y1 < minY){
                x1 = this.Conversion(dataArray[i].x, minX, maxX, 'x');
                y1 = this.Conversion(dataArray[i].y, minY, maxY, 'y');
                x2 = this.Conversion(dataArray[i + 1].x, minX, maxX, 'x');
                if (y2 > minY){
                    y2 = minY;
                    y2 = this.Conversion(y2, minY, maxY, 'y');
                }else{
                    y2 = this.Conversion(dataArray[i + 1].y, minY, maxY, 'y');
                    
                }
                this.graph_line = this.svg.append("line")
                    .attr("id", "plotted_line")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("stroke", "rgb(0,255,0)")
                    .style("stroke-width", strokeWidth);
                this.graphPoints.push(this.graph_line);
            }
        }
    }
}

class FFTGraph extends Graph{
    constructor(nameOfChart,widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        super(nameOfChart,widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY);
        this.createAxes(ArrayForScope[0], ArrayForScope[1]);        
        this.drawLinesInGraph();
        this.updateGraph();
    }
    updateGraph() {
        // this.removeDataPoints()
        // this.drawLine()
    }

    createAxes(axisNumberOnX, axisNumberOnY) {
        var y = d3.scaleLog()            //calculate numbers for the y axis
            .range([this.height, 1])
            .domain([1, this.numTicksY * axisNumberOnY])
        var x = d3.scaleLog()             //calculate numbers for the x axis
            .range([1, this.width])
            .domain([1, this.numTicksX * axisNumberOnX])
        this.xAxis = x;
        this.YAxis = y;
        return;
    }

    Conversion(Value, minDomain, maxDomain, axis) {                                         //can be deleted later
        var range = this.width;
        if (axis == 'y')
            range = this.height;
        else {
            range = this.width
        }
        var xy = d3.scaleLog()
            .range([0, range])
            .domain([minDomain, maxDomain])
        return xy(Value)
    }

    async drawLine() {
        var strokeWidth = 1,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the esp.
            maxX = 360,
            minY = 0,
            maxY = 300;
        var x1, x2, y1, y2 = 0;
        //stationary function
        for (var i = 0; i < dataArray.length - 1; i++) {
            y1 = this.Conversion(dataArray[i].x, minX, maxX, 'x');
            x1 = this.Conversion(dataArray[i].y, minY, maxY, 'y');
            y2 = this.Conversion(dataArray[i + 1].x, minX, maxX, 'x');
            x2 = this.Conversion(dataArray[i + 1].y, minY, maxY, 'y');
            this.graph_line = this.svg.append("line")
                .attr("id", "plotted_line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .style("stroke", "rgb(0,255,0)")
                .style("stroke-width", strokeWidth);
            this.graphPoints.push(this.graph_line);
        }
    }
}

//code that handles all the graph stuff
oscilloscopePlotter = new OscilloscopeGraph("#ScopeChart",0.6,0.6,"us/div","mV/div",10,8);
FFTPlotter = new FFTGraph("FFTChart",0.6,0.6,"Hz","mS/s",10,8);
FFTPlotter.removeGraph();
graphPlotter = oscilloscopePlotter;
var refreshSentDataId;
var keepAliveId;
var updateGraphID;
var elements = document.querySelectorAll( 'body > *' );
var elems = document.body.getElementsByTagName("*");
$('*').on('mouseup', function (e) {
        e.stopImmediatePropagation();
        console.log("mouse up");
    });

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

function startStopUpdatingGraph(Value) {
    if (Value == true) {
        updateGraphID = setInterval(function () {
            graphPlotter.updateGraph()
        }, delayBetweenCalls);
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
        graphPlotter.removeGraph();
        graphPlotter = oscilloscopePlotter;
        graphPlotter.updateAxes(ArrayForScope[0], ArrayForScope[1]);
    } else {
        scope.style.display = "none";
        FFT.style.display = "block";
        graphPlotter.removeGraph();
        graphPlotter = FFTPlotter;
        graphPlotter.updateAxes(ArrayForScope[0], ArrayForScope[1]);
    }
}

//submit button
function submit() {
    //send the data to the esp
    console.log("submit button pressed");
    console.log(ArrayForScope);
    console.log(ArrayForFFT);
    console.log(ArrayForWaveform);
    graphPlotter.updateAxes(ArrayForScope[0], ArrayForScope[1]);              //change this later to fft or scope array depending on which one is selected
    graphPlotter.updateMinMax(ArrayForScope[0], ArrayForScope[1]);
}

// part of code that checks for all the fields and buttons for the oscilloscope.
$('#timePerDivisionSlider').on("input change", function () {
    indexInScopeArray = 0;
    ValueTimePerDivsion = RangeSliderHandler("timePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueTimePerDivsion;
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
    ArrayForFFT[indexInFFTArray] = windowStyleValue;
}

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
