ArrayForScope = [0, 0, 0, 0, 100, 10, 0,]
ArrayForFFT = [10, 10, 2, 0]
ArrayForWaveform = [10, 1, 0, 0]
var dataArray = [];
var dataArray2 = [];
var delayBetweenCalls =100;
var indexForTimePerDivision =  0;
//const gateway = 'ws://localhost:8000';        //for the python webserver
var gateway = `ws://${window.location.hostname}/ws`;     //for the esp webserver

var websocket;
window.addEventListener('load', onload);
var ConnectionState = document.getElementById('ConnectionState');
function onload(event) {
    initWebSocket();
}

function checkConnection() {
        ////console.log("checking connection");
        if (websocket.readyState == 1) {
            ConnectionState.innerHTML = 'Connection Open';
        } else {
            ConnectionState.innerHTML = 'Connection Closed';
        }
    }

    function initWebSocket() {
        ConnectionState.innerHTML = 'Establishing Connection...';
        websocket = new WebSocket(gateway);
        websocket.onopen = onOpen;
        websocket.onclose = onClose;
        websocket.onmessage = onMessage;
        setInterval(function () {
            checkConnection()
        }, 1000);
    }
    
function onOpen(event) {
    ConnectionState.innerHTML = 'Connection Opened';
}
function onClose(event) {
    ConnectionState.innerHTML = 'Connection Closed';
    setTimeout(initWebSocket, 2000);
}

function onMessage(event) {
    //console.log(event.data)
    tmpArray = JSON.parse(event.data).data
    if (dataArray.length >= 1000) {
        dataArray = []
    }
    if (dataArray2.length >= 1000) {
        dataArray2 = []
    }

    for (i = 0; i < tmpArray.length; i += 2) {
        dataArray.push(1000 * ((3 / 255) * tmpArray[i]))
        dataArray2.push(1000 * ((3 / 255) * tmpArray[i+1]))
        // dataArray.push(tmpArray[i])                                                  //uncomment later when integrated
        // dataArray2.push(tmpArray[i+1])
        if (dataArray.length >= 1000) {
            break;
        }
    }
    console.log(dataArray.length);
    // dataArray = JSON.parse(event.data).data
    // dataArray2 = JSON.parse(event.data).data1

    //console.time("testTime")
    graphPlotter.updateGraph()
    //console.timeEnd("testTime")
    ////console.log(JSON.parse(event.data).data1.length)
    ////console.log(JSON.parse(event.data).data.length)
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
        var unitArray = ["us/div", "s/div", "ms/div"];              //calculate the number of units on the x axis
        var unit = unitArray[0];
        if (Number.isInteger(axisNumberOnX / 10 ** 6)) {
            unit = unitArray[unitArray.length - 2];
            axisNumberOnX = axisNumberOnX / 10 ** 6;
        } else if (Number.isInteger(axisNumberOnX / 10 ** 3)) {
            unit = unitArray[unitArray.length - 1];
            axisNumberOnX = axisNumberOnX / 10 ** 3;
        }
        this.xAxisName = unit;

        unitArray = ["mV/div", "V/div"];                            //calculate the number of units on the y axis
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
            .domain([-(this.numTicksY/2) * axisNumberOnY, (this.numTicksY/2) * axisNumberOnY])
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
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height).ticks(this.numTicksY,".3s"))
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
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width).ticks(this.numTicksX,".3s"))
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
        var xy = d3.scaleLinear()
            .range([0, range])
            .domain([minDomain, maxDomain])
        return xy(Value)
    }
    updateMinMax(maxX, minY) {
        this.maxX = maxX * this.numTicksX;
        this.minY = minY * this.numTicksY;
    }
    updateGraph() {
        this.removeDataPoints()
        this.drawLine()
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
        //console.time("testTime")
        this.removeDataPoints()
        this.drawLine(0)
        this.drawLine(1)
        //console.timeEnd("testTime")
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
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height))
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
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width))
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
    async drawLine(line) {
        var multiplier = 1;
        var ArrayInDrawLine = [];
        var strokeWidth = 1,
            minX = 0,                               //this needs to be auatomated later. These values must be given from the esp.
            maxX = 1000,
            minY = this.minY/2,                     //this should be 255
            maxY = -this.minY/2;                    //this should be 0
        var color = "rgb(0,255,0)";
        //console.log(line)
        if (line){
            color = "rgb(255,0,0)";
            ArrayInDrawLine = dataArray; 

        }else{
            color = "rgb(0,255,0)";
            ArrayInDrawLine = dataArray2;
        }
        //console.log(ArrayInDrawLine)

        var x1, x2, y1, y2 = 0;
        //stationary function
        for (var i = 0; i < ArrayInDrawLine.length - 1; i++) {
            y1 = ArrayInDrawLine[i];                                                                        //may be possible to make this more readable with scale clamping
            y2 = ArrayInDrawLine[i + 1];
            if (y1 < minY) {
                var x1Temp = i*multiplier;
                var x2Temp = (i+1)*multiplier;
                if (x2Temp > maxX){
                    x1Temp = maxX;
                    x1 = this.Conversion(x1Temp, minX, maxX, 'x');
                    x2 = this.Conversion(x1Temp, minX, maxX, 'x');
                }else {
                    x1 = this.Conversion(i * multiplier, minX, maxX, 'x');
                    x2 = this.Conversion((i + 1) * multiplier, minX, maxX, 'x');
                }
                y1 = this.Conversion(ArrayInDrawLine[i], minY, maxY, 'y');
                if (y2 > minY) {
                    y2 = minY;
                    y2 = this.Conversion(y2, minY, maxY, 'y');
                } else {
                    y2 = this.Conversion(ArrayInDrawLine[i + 1], minY, maxY, 'y');
                }
                this.graph_line = this.svg.append("line")
                    .attr("id", "plotted_line")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("stroke", color)
                    .style("stroke-width", strokeWidth);
                this.graphPoints.push(this.graph_line);
            }
        }
    }

}

class FFTGraph extends Graph {
    constructor(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY) {
        super(nameOfChart, widthRatio, heightRatio, XaxisName, YaxisName, numTicksX, numTicksY);
        this.createAxes(ArrayForFFT[0], ArrayForFFT[1]*this.numTicksY);
        this.drawLinesInGraph();
        this.updateGraph();
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
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height).ticks(this.numTicksX,".2s"))
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
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width).ticks(this.numTicksY,".2s"))
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

    removeDataPoints() {
        this.svg.selectAll("rect").remove();
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
        var maxX  = this.maxX/this.numTicksX;
        var minY = this.minY;
        //stationary function
        var height = this.height;
        var JsonData = this.convertToJson(dataArray);
        //console.log(JsonData);
        this.svg.selectAll("mybar")
            .data(JsonData)
            .enter()
            .append("rect")
            .attr("x", function (d) {
                if(d.x === 0){
                    return tmpXaxis(1);
                }
                return tmpXaxis(d.x); })
            .attr("y", function (d) { 
                if (TmpYaxis(d.y) < 0){
                    return TmpYaxis(minY);
                  }
                  else{
                    return TmpYaxis(d.y);
                  }
                return TmpYaxis(d.y);
            })
            // .attr("width", function (d) { return (tmpXaxis(d.x + 1) - tmpXaxis(d.x)); })
            .attr("width", function (d) {
                try {
                    if(d.x === 0){
                        return (tmpXaxis(1 +9.77)-tmpXaxis(1));
                    }
                    var next = dataArray[dataArray.indexOf(d.x) + 1];
                    // return 9.77*(tmpXaxis(d.x + 1) - tmpXaxis(d.x));
                    return (tmpXaxis(d.x +9.77)-tmpXaxis(d.x));
                }
                catch {
                    //continue
                }
            })
            .attr("height", function (d) { 
                if (d.x >= maxX || height - TmpYaxis(d.y) < 0){
                    return 0;
                }else if (TmpYaxis(d.y) < 0) {
                    return height;
                }else{
                   return height - TmpYaxis(d.y);
                }
})
            .attr("fill", "#69b3a2")
    }

    convertToJson(arr) {
        var result = '{"data":[';
        var multiplier = 9.77;
        for (var i = 0; i < arr.length; i++) {
            var tmpJson = '{"x":' + i * multiplier + ',"y":' + arr[i] + '}';
            if (i+1 != arr.length) {
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
FFTPlotter = new FFTGraph("FFTChart", 0.6, 0.6, "Hz", "mV", 10, 8);
graphPlotter = oscilloscopePlotter;
FFTScopeChange();
var refreshSentDataId;
var keepAliveId;
var updateGraphID;
var currentPage = 2;

function SendDataOnUpdate () {
    var scope = document.getElementById("scope");
    if (scope.style.display === "block") {
        tmp1 = ArrayForScope[4];
        tmp2 = ArrayForScope[5];
    } else {
        tmp1 = ArrayForFFT[0];
        tmp2 = ArrayForFFT[1];
    }
    graphPlotter.updateAxes(tmp1, tmp2);
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
            "TimePerDiv": indexForTimePerDivision,
            "VoltagePerDiv": ArrayForScope[5],
            "Trigger": ArrayForScope[6],
            "frequency": ArrayForWaveform[0],
            "dutyCycle": ArrayForWaveform[1],
            "golfType": ArrayForWaveform[2],
            "offset": ArrayForWaveform[3]
        });
    }
    if (currentPage == 2) {
        data = JSON.stringify({
            "FFT": 2, //FFT is 2
            "OnOff": ArrayForScope[0],
            "centreFrequency": ArrayForFFT[0],
            "VoltPerDivDb": ArrayForFFT[1],
            "Windowstyle": ArrayForFFT[2],
            "channelForFFT": ArrayForFFT[3],
            "frequency": ArrayForWaveform[0],
            "dutyCycle": ArrayForWaveform[1],
            "golfType": ArrayForWaveform[2],
            "offset": ArrayForWaveform[3]
        });
    }
    console.log(JSON.parse(data));
    websocket.send(data);
    graphPlotter.updateGraph();
}

$('*').on('mouseup', function (e) {
    e.stopImmediatePropagation();
    setTimeout(SendDataOnUpdate, 50);
});

function FFTScopeChange() {
    var scope = document.getElementById("scope");
    var FFT = document.getElementById("FFT");
    if (scope.style.display === "none") {
        dataArray = [];
        dataArray2 = [];
        scope.style.display = "block";
        FFT.style.display = "none";
        graphPlotter.removeGraph();
        graphPlotter = oscilloscopePlotter;
        graphPlotter.updateAxes(ArrayForScope[4], ArrayForScope[5]);
        currentPage = 1;
    } else {
        dataArray = [];
        dataArray2 = [];

        scope.style.display = "none";
        FFT.style.display = "block";
        graphPlotter.removeGraph();
        graphPlotter = FFTPlotter;
        graphPlotter.updateAxes(ArrayForFFT[0], ArrayForFFT[1]);
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

switchStateArray = [false, false, false, false,false]
function SwitchHandler(SwitchstateIndex) {
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

$('#on-off-switch').on("input", function () {
    indexInScopeArray = 0;
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchOnOffSwitch ? 1 : 0;
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
    var element = $('#timePerDivisionSlider'),
        value = element.val()
    indexForTimePerDivision = parseInt(value);
    console.log(indexForTimePerDivision);
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
    var element = $('#centreFrequencySlider'),
        value = element.val()
    ArrayForFFT[indexInFFTArray] = parseInt(value);
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");
    $('#CentreFrequencyInputField').val(parseInt(value))
});

$('#CentreFrequencyInputField').on("ipnut change", function () {
    indexInWFGArray = 0;
    var element = $('#CentreFrequencyInputField'),                                    
        value = element.val()
    ArrayForFFT[indexInWFGArray] = parseInt(value);
    min = 10;
    max = 500000;
    if (value < min) value = min;
    if (value > max) value = max;
    $('#CentreFrequencyInputField').val(parseInt(value))
    $('#centreFrequencySlider').val(parseInt(value))
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");
    setTimeout(SendDataOnUpdate, 50);
})
$('#DbPerDivisionSlider').on("input change", function () {
    indexInFFTArray = 1;
    ValueDbPerDivision = RangeSliderHandler("DbPerDivisionSlider");
    ArrayForFFT[indexInFFTArray] = parseInt(ValueDbPerDivision);
});
$('#channelForFFT').on("input", function () {
    indexInFFTArray = 3;
    SwitchstateIndex = 4;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayForFFT[indexInFFTArray] = ValueSwitchChannel ? 1 : 0;
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
    setTimeout(SendDataOnUpdate, 50);
}

// $('#scanRateSlider').on("input change", function () {
//     indexInFFTArray = 3;
//     var element = $('#scanRateSlider'),
//         value = element.val()
//     ArrayForFFT[indexInFFTArray] = parseInt(value);
//     $('#scanRateSliderValue').text("scan rate : " + value);
// });

//code for the waveformgenerator
$('#frequencySlider').on("input change", function () {
    indexInWFGArray = 0;
    var element = $('#frequencySlider'),
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#FrequencyInputField').val(parseInt(value))
    $('#frequencySliderValue').text("Value : " + value + " Hz");
});

$('#FrequencyInputField').on("ipnut change", function () {
    indexInWFGArray = 0;
    var element = $('#FrequencyInputField'),                                    
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    min = 10;
    max = 100000;
    if (value < min) value = min;
    if (value > max) value = max;
    $('#FrequencyInputField').val(parseInt(value))
    $('#frequencySlider').val(parseInt(value))
    $('#frequencySliderValue').text("Value : " + value + " Hz");
    setTimeout(SendDataOnUpdate, 50);
})

$('#dutycycleSlider').on("input change", function () {
    indexInWFGArray = 1;
    var element = $('#dutycycleSlider'),
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#dutycycleSliderValue').text("Value : " + value + " %");
});

$('#wavegen-offsetSlider').on("input change", function () {
    indexInWFGArray = 3;
    var element = $('#wavegen-offsetSlider'),
        value = element.val();
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#wavegen-offsetSliderValue').text("Value : " + value/100 + " V");
});

function changeGolfStyle() {
    var golfStyleDict = {
        "sine": 0,
        "square": 1,
        "triangle": 2
    };
    
    indexInWFGArray = 2;
    let golfStyle = document.getElementById("golf_style");
    let golfStyleValue = golfStyle.value;
    ArrayForWaveform[indexInWFGArray] = golfStyleDict[golfStyleValue];
    setTimeout(SendDataOnUpdate, 50);
}
