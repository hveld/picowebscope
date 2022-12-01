ArrayForScope = [0, 0, 0, 0, 100, 10, 0,]
ArrayForFFT = [1, 10, 2, 0]
ArrayForWaveform = [0, 0, 0]
var dataArray = [];
var delayBetweenCalls = 1000;

const gateway = 'ws://localhost:8000';        //for the python webserver
// var gateway = `ws://${window.location.hostname}/ws`;     //for the esp webserver

var websocket;
window.addEventListener('load', onload);
var ConnectionState = document.getElementById('ConnectionState');

function onload(event) {
    initWebSocket();
}

function initWebSocket() {
    ConnectionState.innerHTML = 'Establishing Connection...';
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}
function Send_data() {
    websocket.send("request_data");
}

function onOpen(event) {
    ConnectionState.innerHTML = 'Connection Opened';
}
function onClose(event) {
    ConnectionState.innerHTML = 'Connection Closed';
    setTimeout(initWebSocket, 2000);
}
function onMessage(event) {
    dataArray = JSON.parse(event.data).data
}

class Graph {
    constructor(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
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
        var unitArray = ["us/div", "s/div", "ms/div"];
        var unit = unitArray[0];
        if (Number.isInteger(axisNumberOnX / 10 ** 6)) {
            unit = unitArray[unitArray.length - 2];
            axisNumberOnX = axisNumberOnX / 10 ** 6;
        } else if (Number.isInteger(axisNumberOnX / 10 ** 3)) {
            unit = unitArray[unitArray.length - 1];
            axisNumberOnX = axisNumberOnX / 10 ** 3;
        }
        this.xAxisName = unit;

        unitArray = ["mV/div", "V/div"];
        var unit = unitArray[0];
        if (Number.isInteger(axisNumberOnY / 10 ** 6)) {
            unit = unitArray[unitArray.length - 2];
            axisNumberOnY = axisNumberOnY / 10 ** 6;
        } else if (Number.isInteger(axisNumberOnY / 10 ** 3)) {
            unit = unitArray[unitArray.length - 1];
            axisNumberOnY = axisNumberOnY / 10 ** 3;
        }
        this.yAxisName = unit;

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
        this.createAxes(AxisNumberOnX, AxisNumberOnY);
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
        // console.log(minDomain, maxDomain, Value, range);
        var xy = d3.scaleLinear()
            .range([0, range])
            .domain([minDomain, maxDomain])
        return xy(Value)
    }
    updateMinMax(maxX, minY) {
        this.maxX = maxX * this.numTicksX;
        this.minY = minY * this.numTicksY;
    }
}
class OscilloscopeGraph extends Graph {
    constructor(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        super(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY);
        this.maxX = this.numTicksX * 100;
        this.minY = this.numTicksY * 10;
        this.createAxes(ArrayForScope[4], ArrayForScope[5]);
        this.drawLinesInGraph();
        this.updateGraph();
    }
    updateGraph() {
        this.removeDataPoints()
        this.drawLine()
    }

    async drawLine() {
        var multiplier = 4;
        var strokeWidth = 1,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the esp.
            maxX = this.maxX,
            minY = this.minY,
            maxY = 0;

        var x1, x2, y1, y2 = 0;
        //stationary function
        for (var i = 0; i < dataArray.length - 1; i++) {
            y1 = dataArray[i];                                                                        //may be possible to make this more readable with scale clamping
            y2 = dataArray[i + 1];
            if (y1 < minY) {
                var x1Temp = i*multiplier;
                var x2Temp = (i+1)*multiplier;
                // console.log("i", i, "x1", x1Temp, "x2", x2Temp);
                // console.log(i,x1Temp,x2Temp,multiplier,maxX);
                if (x2Temp > maxX){
                    x1Temp = maxX;
                    x1 = this.Conversion(x1Temp, minX, maxX, 'x');
                    x2 = this.Conversion(x1Temp, minX, maxX, 'x');
                }else {
                    x1 = this.Conversion(i * multiplier, minX, maxX, 'x');
                    x2 = this.Conversion((i + 1) * multiplier, minX, maxX, 'x');
                }
                y1 = this.Conversion(dataArray[i], minY, maxY, 'y');
                if (y2 > minY) {
                    y2 = minY;
                    y2 = this.Conversion(y2, minY, maxY, 'y');
                } else {
                    y2 = this.Conversion(dataArray[i + 1], minY, maxY, 'y');
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

class FFTGraph extends Graph {
    constructor(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        super(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY);
        this.createAxes(ArrayForFFT[0], ArrayForFFT[1]);                        // change this later        
        this.drawLinesInGraph();
        this.updateGraph();
    }

    removeDataPoints() {
        this.svg.selectAll("rect").remove();
    }
    updateGraph() {
        this.removeDataPoints()
        this.drawLine()
    }

    updateAxes(AxisNumberOnX, AxisNumberOnY) {
        this.removeGraph();
        this.createAxes(AxisNumberOnX, AxisNumberOnY * this.numTicksY);
        this.drawLinesInGraph();
        this.updateGraph();
    }

    createAxes(axisNumberOnX, axisNumberOnY) {
        var y = d3.scaleLog()            //calculate numbers for the y axis
            .range([this.height, 1])
            .domain([1, axisNumberOnY])
        //scaleLinear
        // var x = d3.scaleLinear()            //calculate numbers for the x axis
        var x = d3.scaleLog()             //calculate numbers for the x axis
            .range([1, this.width])
            .domain([1, axisNumberOnX])
        this.xAxis = x;
        this.YAxis = y;
        return;
    }

    async drawLine() {
        var tmpXaxis = this.xAxis;
        var TmpYaxis = this.YAxis;
        var minY = this.minY;
        //stationary function
        var height = this.height;
        var JsonData = this.convertToJson(dataArray);
        console.log(JsonData);
        this.svg.selectAll("mybar")
            .data(JsonData)
            .enter()
            .append("rect")
            .attr("x", function (d) { return tmpXaxis(d.x); })
            .attr("y", function (d) { 
                if (TmpYaxis(d.y) < 0){
                    return TmpYaxis(minY);
                  }
                  else{
                    return TmpYaxis(d.y);
                  }
                return TmpYaxis(d.y);
            })
            .attr("width", function (d) { return (tmpXaxis(d.x + 1) - tmpXaxis(d.x)); })
            // .attr("width", function (d) {
            //     try {
            //         var next = dataArray[dataArray.indexOf(d) + 1];
            //         return (tmpXaxis(next.x) - tmpXaxis(d.x))
            //     }
            //     catch {
            //         //continue
            //     }
            // })
            .attr("height", function (d) { 
                if (TmpYaxis(d.y) < 0) {
                    return height;
                  }
                  else {
                    return height - TmpYaxis(d.y);
                  }
                return height - TmpYaxis(d.y); 
             })
            .attr("fill", "#69b3a2")
    }

    convertToJson(arr) {
        var result = '{"data":[';
        var multiplier = 1;
        for (var i = 0; i < arr.length; i++) {
            var tmpJson = '{"x":' + i * multiplier + ',"y":' + arr[i] + '}';
            if (i != arr.length - 1) {
                tmpJson += ',';
            }
            result += tmpJson;
        }
        result += ']}';
        result = JSON.parse(result).data;
        return result;
    }
}

//code that handles all the graph stuff
oscilloscopePlotter = new OscilloscopeGraph("#ScopeChart", 0.6, 0.6, "us/div", "mV/div", 10, 8);
FFTPlotter = new FFTGraph("FFTChart", 0.6, 0.6, "Hz", "V", 10, 8);
graphPlotter = oscilloscopePlotter;
FFTScopeChange();
var refreshSentDataId;
var keepAliveId;
var updateGraphID;
var currentPage = 2;

$('*').on('mouseup', function (e) {
    e.stopImmediatePropagation();
    setTimeout(function () {
        var scope = document.getElementById("scope");
        if (scope.style.display === "block") {
            tmp1 = ArrayForScope[4];
            tmp2 = ArrayForScope[5];
        } else {
            tmp1 = ArrayForFFT[0];
            tmp2 = ArrayForFFT[1];
        }
        graphPlotter.updateAxes(tmp1, tmp2);              //change this later to fft or scope array depending on which one is selected
        graphPlotter.updateMinMax(tmp1, tmp2);
        var data;
        if (currentPage == 1) {
            //split array into json objects
            data = JSON.stringify({
                "Ossilloscope": 1,//ossilloscope is 1
                "OnOff": ArrayForScope[0],
                "ACDC": ArrayForScope[1],
                "Channel": ArrayForScope[2],
                "edge": ArrayForScope[3],
                "TimePerDiv": ArrayForScope[4],
                "VoltagePerDiv": ArrayForScope[5],
                "Trigger": ArrayForScope[6],
                "frequency": ArrayForWaveform[0],
                "dutyCycle": ArrayForWaveform[1],
                "golfType": ArrayForWaveform[2]
            });
        }
        if (currentPage == 2) {
            data = JSON.stringify({
                "FFT": 2, //FFT is 2
                "OnOff": ArrayForScope[0],
                "centreFrequency": ArrayForFFT[0],
                "VoltPerDivDb": ArrayForFFT[1],
                "Windowstyle": ArrayForFFT[2],
                // "scanRate": ArrayForFFT[3],
                "frequency": ArrayForWaveform[0],
                "dutyCycle": ArrayForWaveform[1],
                "golfType": ArrayForWaveform[2],
            });
        }
        // console.log(JSON.parse(data));
        websocket.send(data);
        graphPlotter.updateGraph();
    }, 50);
});

function startStopUpdatingGraph(Value) {
    if (Value == true) {
        updateGraphID = setInterval(function () {
            graphPlotter.updateGraph()
        }, delayBetweenCalls);
    } else {
        clearInterval(updateGraphID); //stop updating graph
    }
}

function FFTScopeChange() {
    var scope = document.getElementById("scope");
    var FFT = document.getElementById("FFT");
    if (scope.style.display === "none") {
        scope.style.display = "block";
        FFT.style.display = "none";
        graphPlotter.removeGraph();
        graphPlotter = oscilloscopePlotter;
        graphPlotter.updateAxes(ArrayForScope[4], ArrayForScope[5]);
        currentPage = 1;

    } else {
        scope.style.display = "none";
        FFT.style.display = "block";
        graphPlotter.removeGraph();
        graphPlotter = FFTPlotter;
        graphPlotter.updateAxes(ArrayForFFT[1], ArrayForFFT[2]);
        currentPage = 2;
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
    } else if (SliderId == "VoltagePerDivisionSlider" || SliderId == "DbPerDivisionSlider") {
        arrayForTimePerDivision = [10, 100, 500, 1000, 2000, 5000]
        if (SliderId == "VoltagePerDivisionSlider")
            unitArray = ["mV/div", "V/div"];
        else
            unitArray = ["mV", "V"];
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

switchStateArray = [false, false, false, false]
function SwitchHandler(SwitchstateIndex) {
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

// 
$('#on-off-switch').on("input", function () {
    indexInScopeArray = 0;
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchOnOffSwitch ? 1 : 0;
    startStopUpdatingGraph(ValueSwitchOnOffSwitch);
});


// part of code that checks for all the fields and buttons for the oscilloscope.
$('#ACDCcoupling').on("input", function () {
    indexInScopeArray = 1;
    SwitchstateIndex = 1;
    ValueSwitchACDC = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchACDC ? 1 : 0;
});
$('#channel').on("input", function () {
    indexInScopeArray = 2;
    SwitchstateIndex = 2;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchChannel ? 1 : 0;
});

$('#edge').on("input", function () {
    indexInScopeArray = 3;
    SwitchstateIndex = 3;
    ValueSwitchEdge = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchEdge ? 1 : 0;
});
$('#timePerDivisionSlider').on("input change", function () {
    indexInScopeArray = 4;
    ValueTimePerDivsion = RangeSliderHandler("timePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueTimePerDivsion;
});

$('#VoltagePerDivisionSlider').on("input change", function () {
    indexInScopeArray = 5;
    ValueVoltagePerDivsion = RangeSliderHandler("VoltagePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueVoltagePerDivsion;
    var voltage = (ArrayForScope[6] / 100) * ValueVoltagePerDivsion;
    $('#TriggerSliderValue').text("Value in percentage: " + ArrayForScope[2] + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
});

$('#TriggerSlider').on("input change", function () {
    indexInScopeArray = 6;
    var element = $('#TriggerSlider'),
        value = element.val()
    var voltage = (value / 100) * ArrayForScope[5]
    $('#TriggerSliderValue').text("Value in percentage: " + value + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
    ArrayForScope[indexInScopeArray] = parseInt(value);
});

//code for the FFT
$('#centreFrequencySlider').on("input change", function () {
    indexInFFTArray = 0;
    var element = $('#centreFrequencySlider'),                              //change this when the real values are kwown
        value = element.val()
    ArrayForFFT[indexInFFTArray] = parseInt(value);
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");
});

$('#DbPerDivisionSlider').on("input change", function () {
    indexInFFTArray = 1;
    ValueDbPerDivision = RangeSliderHandler("DbPerDivisionSlider");
    ArrayForFFT[indexInFFTArray] = parseInt(ValueDbPerDivision);
});

function changeWindowStyle() {
    var windowStyleDict = {
        "flattop": 0,
        "hanning": 1,
        "uniform": 2
    };
    indexInFFTArray = 2;
    let windowStyle = document.getElementById("window_style");
    let windowStyleValue = windowStyle.value;
    ArrayForFFT[indexInFFTArray] = windowStyleDict[windowStyleValue];
}

// $('#scanRateSlider').on("input change", function () {
//     indexInFFTArray = 3;
//     var element = $('#scanRateSlider'),                                     //change this when the real values are kwown
//         value = element.val()
//     ArrayForFFT[indexInFFTArray] = parseInt(value);
//     $('#scanRateSliderValue').text("scan rate : " + value);
// });

//code for the waveformgenerator
$('#frequencySlider').on("input change", function () {
    indexInWFGArray = 0;
    var element = $('#frequencySlider'),                                    //change this when the real values are kwown
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#frequencySliderValue').text("Value : " + value + " Hz");
});

$('#dutycycleSlider').on("input change", function () {
    indexInWFGArray = 1;
    var element = $('#dutycycleSlider'),                                    //change this when the real values are kwown
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#dutycycleSliderValue').text("Value : " + value + " %");
});

function changeGolfStyle() {
    var golfStyleDict = {
        "sinus": 0,
        "blok": 1,
        "triangle": 2
    };
    indexInWFGArray = 2;
    let golfStyle = document.getElementById("golf_style");
    let golfStyleValue = golfStyle.value;
    ArrayForWaveform[indexInWFGArray] = golfStyleDict[golfStyleValue];
}
