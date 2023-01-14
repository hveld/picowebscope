ArrayForScope = [0, 0, 0, 0, 100, 10, 0,]
ArrayForFFT = [10, 10, 2, 0]
ArrayForWaveform = [10, 1, 0, 0]
var dataArray = [];
var dataArray2 = [];
var delayBetweenCalls = 100;

var gateway = `ws://${window.location.hostname}/ws`;                        //websocket adress for the esp webserver

var websocket;
window.addEventListener('load', onload);                                    //call the onload function when the page loads
var ConnectionState = document.getElementById('ConnectionState');
function onload(event) {
    initWebSocket();
}


//check if the websocket is connected when not connected it will change the message on the screen.
function checkConnection() {
    if (websocket.readyState == 1) {
        ConnectionState.innerHTML = 'Connection Open';
    } else {
        ConnectionState.innerHTML = 'Connection Closed';
    }
}

//initialize the websocket
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


//when the websocket is connected it will change the message on the screen.
function onOpen(event) {
    ConnectionState.innerHTML = 'Connection Opened';
}


//when the websocket is closed it will change the message on the screen and try to reconnect after 2 seconds.
function onClose(event) {
    ConnectionState.innerHTML = 'Connection Closed';
    setTimeout(initWebSocket, 2000);
}


//when the websocket receives a message it will parse the message and put it in the dataArray
//after putting it in the dataArray the graphPlotter.updateGraph() is called to update the graph with the new values. 
function onMessage(event) {
    tmpArray = JSON.parse(event.data).data
    if (dataArray.length >= 1000) {
        dataArray = []
    }
    if (dataArray2.length >= 1000) {
        dataArray2 = []
    }

    for (i = 0; i < tmpArray.length; i += 2) {
        dataArray.push(tmpArray[i] - 12.75)
        dataArray2.push(tmpArray[i + 1] - 12.75)        //small offset because the stm has a reference current of 3V instead of 3.3V.
        if (dataArray.length >= 1000) {
            break;
        }
    }
    graphPlotter.updateGraph()
}
/*
Class inheritence is used to display the data in a graph. This is done to reduce the amount of duplicate functions in the code.
The Graph class is the highest layer. The other 2 graphs are inherited from this class.
*/
class Graph {
    //constructor for the graph class
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

    //function to create the axes on the graph
    createAxes(axisNumberOnX, axisNumberOnY) {

        var unitArray = ["us/div", "s/div", "ms/div"];              //calculate the units on the x axis
        var unit = unitArray[0];
        if (Number.isInteger(axisNumberOnX / 10 ** 6)) {
            unit = unitArray[unitArray.length - 2];
            axisNumberOnX = axisNumberOnX / 10 ** 6;
        } else if (Number.isInteger(axisNumberOnX / 10 ** 3)) {
            unit = unitArray[unitArray.length - 1];
            axisNumberOnX = axisNumberOnX / 10 ** 3;
        }
        this.xAxisName = unit;

        unitArray = ["mV/div", "V/div"];                            //calculate the units on the y axis
        var unit = unitArray[0];
        if (Number.isInteger(axisNumberOnY / 10 ** 6)) {
            unit = unitArray[unitArray.length - 2];
            axisNumberOnY = axisNumberOnY / 10 ** 6;
        } else if (Number.isInteger(axisNumberOnY / 10 ** 3)) {
            unit = unitArray[unitArray.length - 1];
            axisNumberOnY = axisNumberOnY / 10 ** 3;
        }
        this.yAxisName = unit;

        var y = d3.scaleLinear()                                    //use the scalelineair function to easily space out the axes     
            .range([this.height, 0])
            .domain([-(this.numTicksY / 2) * axisNumberOnY, (this.numTicksY / 2) * axisNumberOnY])
        var x = d3.scaleLinear()
            .range([0, this.width])
            .domain([0, this.numTicksX * axisNumberOnX])
        this.xAxis = x;
        this.YAxis = y;
        return;
    }

    //function to draw the axes on the graph including all the lines to easily read the graph.
    drawLinesInGraph() {
        this.svg = d3.select("#Chart").append("svg")                                                            //create the svg element                        
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .style("filter", "url(#I)")
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.svg.append("g")                                                                                    //draws lines vertically and numbers x-axis
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height).ticks(this.numTicksY, ".3s"))
            .selectAll("line")
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksY; k += 1) {
                    dashArray.push((this.height / this.numTicksY - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })
        this.svg.append("text")                                                                                 //text label for the x axis
            .attr("x", this.width / 2)
            .attr("y", this.height + 30)
            .style("text-anchor", "middle")
            .text(this.xAxisName);

        this.svg.append("g")                                                                                   //draws lines horizontally and numbers y-axis
            .attr("class", "y axis")
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width).ticks(this.numTicksX, ".3s"))
            .selectAll("line")
            //increasing the tickspace wil create an interrupted line.
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksX; k += 1) {
                    dashArray.push((this.width / this.numTicksX - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })

        this.svg.append("text")                                                                                 // text label for the y axis
            .attr("x", -50)
            .attr("y", this.height / 2)
            .style("text-anchor", "middle")
            .text(this.yAxisName);
    }
    updateAxes(AxisNumberOnX, AxisNumberOnY) {                                                                  //update the axis after the user changed settings.                 
        this.removeGraph();
        this.createAxes(AxisNumberOnX, AxisNumberOnY);
        this.drawLinesInGraph();
        this.updateGraph();
    }
    removeGraph() {                                                                                             //remove the entire graph.
        d3.select("svg").remove();
    }
    removeDataPoints() {                                                                                        //remove the data points from the graph.                                   
        for (var i = 0; i < this.graphPoints.length; i++) {
            this.graphPoints[i].remove();
        }
        this.graphPoints = [];
    }
    Conversion(Value, minDomain, maxDomain, axis) {                                                             //convert the values to the correct position on the graph.
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
    updateMinMax(maxX, minY) {                                                                                  //update the min and max values of the graph.         
        this.maxX = maxX * this.numTicksX;
        this.minY = minY * this.numTicksY;
    }
    updateGraph() {                                                                                            //update the graph with the new data.                            
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
        this.removeDataPoints()
        this.drawLine(0)
        this.drawLine(1)
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

    //draws the lines in the graph 
    async drawLine(line) {
        var multiplier = 1;                         //
        var ArrayInDrawLine = [];
        var strokeWidth = 1,
            minX = 0,                               //values are 0 to 1000 because we only get a max of 1000 points per scope view.
            maxX = 1000,
            minY = 255,                             //Y values are between 0 and 255. This is the min and max value of the graph.
            maxY = 0;
        var color = "rgb(0,255,0)";
        if (line) {                                                                        //if line is true then draw the second line.     
            color = "rgb(255,0,0)";
            ArrayInDrawLine = dataArray;

        } else {
            color = "rgb(0,255,0)";
            ArrayInDrawLine = dataArray2;
        }
        var x1, x2, y1, y2 = 0;
        for (var i = 0; i < ArrayInDrawLine.length - 1; i++) {                     //draws the line in the graph by looping through the entire array
            y1 = ArrayInDrawLine[i];
            y2 = ArrayInDrawLine[i + 1];
            if (y1 < minY) {
                var x1Temp = i * multiplier;
                var x2Temp = (i + 1) * multiplier;
                //the following if statements are there to make sure no values will be drawn outside of the graph. It is possible to draw lines below the graph.
                // But with a working system no Y values under 0 should be given.
                if (x2Temp > maxX) {
                    x1Temp = maxX;
                    x1 = this.Conversion(x1Temp, minX, maxX, 'x');                 //converts the x and y values to the correct values for the graph.
                    x2 = this.Conversion(x1Temp, minX, maxX, 'x');
                } else {
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
        this.createAxes(ArrayForFFT[0], ArrayForFFT[1] * this.numTicksY);
        this.drawLinesInGraph();
        this.updateGraph();
    }
    drawLinesInGraph() {
        this.svg = d3.select("#Chart").append("svg")                                                                 //creates the svg element                        
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .style("filter", "url(#I)")
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.svg.append("g")                                                                                        //draws lines vertically and numbers x-axis
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.xAxis).tickSize(-this.height).ticks(this.numTicksX, ".2s"))
            .selectAll("line")
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksY; k += 1) {
                    dashArray.push((this.height / this.numTicksY - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })

        this.svg.append("text")                                                                                     // text label for the x axis
            .attr("x", this.width / 2)
            .attr("y", this.height + 30)
            .style("text-anchor", "middle")
            .text(this.xAxisName);

        this.svg.append("g")                                                                                        //draws lines horizontally and numbers y-axis
            .attr("class", "y axis")
            .call(d3.axisLeft(this.YAxis).tickSize(-this.width).ticks(this.numTicksY, ".2s"))
            .selectAll("line")
            .style("stroke-dasharray", function (d, i) {
                var dashArray = []
                for (var k = 0; k < this.numTicksX; k += 1) {
                    dashArray.push((this.width / this.numTicksX - (this.tickSpace / 2) - (k > 0 ? (this.tickSpace / 2) : 0)));
                    dashArray.push(this.tickSpace)
                }
                return dashArray.join(",")
            })

        this.svg.append("text")                                                                                    // text label for the y axis
            .attr("x", -50)
            .attr("y", this.height / 2)
            .style("text-anchor", "middle")
            .text(this.yAxisName);
    }

    removeDataPoints() {                                                                                            //removes all data points from the graph
        this.svg.selectAll("rect").remove();
    }

    updateAxes(AxisNumberOnX, AxisNumberOnY) {                                                                     //updates the axes                       
        this.removeGraph();
        this.createAxes(AxisNumberOnX, AxisNumberOnY * this.numTicksY);
        this.drawLinesInGraph();
        this.updateGraph();
    }

    createAxes(axisNumberOnX, axisNumberOnY) {
        var y = d3.scaleLog()                                                                                       //calculate numbers for the y axis
            .range([this.height, 1])
            .domain([1, axisNumberOnY])
        var x = d3.scaleLog()                                                                                       //calculate numbers for the x axis
            .range([1, this.width])
            .domain([1, axisNumberOnX])
        this.xAxis = x;
        this.YAxis = y;
        return;
    }

    async drawLine() {
        var tmpXaxis = this.xAxis;
        var TmpYaxis = this.YAxis;
        var maxX = this.maxX / this.numTicksX;
        var minY = this.minY;
        var height = this.height;
        var multiplier = 9.77;                  //multiplier may be removed later when it is kwown how many points are sent and no spaces are between each data point.
        var JsonData = this.convertToJson(dataArray, multiplier);                                                               //converts the data to json format         
        this.svg.selectAll("mybar")                                                                                             //creates the bars for all data in the jsonData variable
            .data(JsonData)
            .enter()
            .append("rect")
            .attr("x", function (d) {
                if (d.x === 0) {                                                                                                //with a log scale d.x cannot be 0 because log(0) is impossible.
                    return tmpXaxis(1);
                }
                return tmpXaxis(d.x);
            })
            .attr("y", function (d) {
                if (TmpYaxis(d.y) < 0) {
                    return TmpYaxis(minY);
                }
                else {
                    return TmpYaxis(d.y);
                }
                return TmpYaxis(d.y);
            })
            .attr("width", function (d) {
                try {
                    if (d.x === 0) {                                                                                            //with a log scale d.x cannot be 0 because log(0) is impossible.                                    
                        return (tmpXaxis(1 + multiplier) - tmpXaxis(1));
                    }
                    return (tmpXaxis(d.x + multiplier) - tmpXaxis(d.x));
                }
                catch {
                    //continue
                }
            })
            .attr("height", function (d) {
                //make sure the bars are not drawn outside of the graph
                if (d.x >= maxX || height - TmpYaxis(d.y) < 0) {                                                                //if the data is out of the graph, the height of the bar is 0   
                    return 0;
                } else if (TmpYaxis(d.y) < 0) {                                                                                 //if the data is out of the graph, the height of the bar is the height of the graph
                    return height;
                } else {
                    return height - TmpYaxis(d.y);
                }
            })
            .attr("fill", "#69b3a2")
    }

    convertToJson(arr, multiplier) {        //converts the data to json format
        var result = '{"data":[';
        for (var i = 0; i < arr.length; i++) {
            var tmpJson = '{"x":' + i * multiplier + ',"y":' + arr[i] + '}';
            if (i + 1 != arr.length) {
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
oscilloscopePlotter = new OscilloscopeGraph("#ScopeChart", 0.6, 0.6, "us/div", "mV/div", 10, 8);                //creates the oscilloscope graph
FFTPlotter = new FFTGraph("FFTChart", 0.6, 0.6, "Hz", "mV", 10, 8);                                             //creates the FFT graph
graphPlotter = oscilloscopePlotter;
FFTScopeChange();                                                                                            //sets the graph to the FFT graph                             
var refreshSentDataId;
var keepAliveId;
var updateGraphID;
var currentPage = 2;

function SendDataOnUpdate() {                                                                             //sends data to the ESP when the user changes the settings                 
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
            "Ossilloscope": 1,
            "OnOff": ArrayForScope[0],
            "ACDC": ArrayForScope[1],
            "Channel": ArrayForScope[2],
            "edge": ArrayForScope[3],
            "TimePerDiv": ArrayForScope[4],
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
            "FFT": 2,
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
    websocket.send(data);                                                                //sends the data to the ESP
    graphPlotter.updateGraph();                                                         //updates the graph         
}

$('*').on('mouseup', function (e) {                                                 //sends data to the ESP when the user changes the settings          
    e.stopImmediatePropagation();
    setTimeout(SendDataOnUpdate, 50);
});

function FFTScopeChange() {                                                         //changes the graph from the FFT graph to the oscilloscope graph and vice versa when the button is pressed.
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

//this function is called when the voltage per division or time per division slider is moved. it will check which value corresponds to the slider index.
// this value will be shown on the interface and stored in an array. 
function RangeSliderHandler(SliderId) {
    var element = $('#' + SliderId),
        value = element.val()
    var unitArray, RangeSliderArray = [];
    if (SliderId == "timePerDivisionSlider") {
        RangeSliderArray = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000]
        unitArray = ["us/div", "s/div", "ms/div"];
    } else if (SliderId == "VoltagePerDivisionSlider" || SliderId == "DbPerDivisionSlider") {
        RangeSliderArray = [10, 100, 500, 1000, 2000, 5000]
        if (SliderId == "VoltagePerDivisionSlider")
            unitArray = ["mV/div", "V/div"];
        else
            unitArray = ["mV", "V"];
    }
    var returnValue = RangeSliderArray[value]
    var value = RangeSliderArray[value]
    var unit = unitArray[0];

    // the following if statements make sure the value is shown correctly so the values are readable eg. 5000000 us/div will be shown as 5 s/div
    if (Number.isInteger(value / 10 ** 6)) {
        unit = unitArray[unitArray.length - 2];
        value = value / 10 ** 6;
    } else if (Number.isInteger(value / 10 ** 3)) {
        unit = unitArray[unitArray.length - 1];
        value = value / 10 ** 3;
    }
    $('#' + SliderId + 'Value').text("Value: " + value + " " + unit);               //shows the value on the interface
    return returnValue;
}

switchStateArray = [false, false, false, false, false]              //array that stores the state of the switches
function SwitchHandler(SwitchstateIndex) {                          //function that handles all the switches
    if (switchStateArray[SwitchstateIndex] == false) {
        switchStateArray[SwitchstateIndex] = true;
    } else {
        switchStateArray[SwitchstateIndex] = false;
    }
    return switchStateArray[SwitchstateIndex];
}

$('#on-off-switch').on("input", function () {                       //gets called when the on off switch is pressed.
    indexInScopeArray = 0;
    SwitchstateIndex = 0;
    ValueSwitchOnOffSwitch = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchOnOffSwitch ? 1 : 0;
});


// part of code that checks for all the fields and buttons for the oscilloscope.
$('#ACDCcoupling').on("input", function () {                        //gets called when the ACDC switch is pressed.
    indexInScopeArray = 1;
    SwitchstateIndex = 1;
    ValueSwitchACDC = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchACDC ? 1 : 0;
});
$('#channel').on("input", function () {                             //gets called when the channel switch is pressed.
    indexInScopeArray = 2;
    SwitchstateIndex = 2;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchChannel ? 1 : 0;
});


$('#edge').on("input", function () {                                //gets called when the edge switch is pressed.      
    indexInScopeArray = 3;
    SwitchstateIndex = 3;
    ValueSwitchEdge = SwitchHandler(SwitchstateIndex);
    ArrayForScope[indexInScopeArray] = ValueSwitchEdge ? 1 : 0;
});
$('#timePerDivisionSlider').on("input change", function () {        //gets called when the time per division slider is moved.
    indexInScopeArray = 4;
    ValueTimePerDivsion = RangeSliderHandler("timePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueTimePerDivsion;
});

$('#VoltagePerDivisionSlider').on("input change", function () {     //gets called when the voltage per division slider is moved.    
    indexInScopeArray = 5;
    ValueVoltagePerDivsion = RangeSliderHandler("VoltagePerDivisionSlider");
    ArrayForScope[indexInScopeArray] = ValueVoltagePerDivsion;
    var voltage = (ArrayForScope[6] / 100) * ValueVoltagePerDivsion;
    $('#TriggerSliderValue').text("Value in percentage: " + ArrayForScope[2] + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
});

$('#TriggerSlider').on("input change", function () {                //gets called when the trigger slider is moved.
    indexInScopeArray = 6;
    var element = $('#TriggerSlider'),
        value = element.val()
    var voltage = (value / 100) * ArrayForScope[5]
    $('#TriggerSliderValue').text("Value in percentage: " + value + " %");
    $('#TriggerSliderValueVoltage').text("Value in voltage: " + voltage);
    ArrayForScope[indexInScopeArray] = parseInt(value);
});

//code for the FFT
$('#centreFrequencySlider').on("input change", function () {        //gets called when the centre frequency slider is moved.
    indexInFFTArray = 0;
    var element = $('#centreFrequencySlider'),
        value = element.val()
    ArrayForFFT[indexInFFTArray] = parseInt(value);
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");
    $('#CentreFrequencyInputField').val(parseInt(value))
});

$('#CentreFrequencyInputField').on("ipnut change", function () {    //gets called when the centre frequency input field is changed.
    indexInWFGArray = 0;
    var element = $('#CentreFrequencyInputField'),
        value = element.val()
    ArrayForFFT[indexInWFGArray] = parseInt(value);
    min = 10;
    max = 500000;
    if (value < min) value = min;                                       //makes sure the value is between the min and max value.
    if (value > max) value = max;
    $('#CentreFrequencyInputField').val(parseInt(value))                //sets the value to the input field.
    $('#centreFrequencySlider').val(parseInt(value))                    //sets the value to the input field.
    $('#centreFrequencySliderValue').text("Value : " + value + " Hz");  //sets the value to the input field.
    setTimeout(SendDataOnUpdate, 50);
})
$('#DbPerDivisionSlider').on("input change", function () {          //gets called when the Db per division slider is moved.
    indexInFFTArray = 1;
    ValueDbPerDivision = RangeSliderHandler("DbPerDivisionSlider");
    ArrayForFFT[indexInFFTArray] = parseInt(ValueDbPerDivision);
});
$('#channelForFFT').on("input", function () {                       //gets called when the channel for FFT switch is pressed.
    indexInFFTArray = 3;
    SwitchstateIndex = 4;
    ValueSwitchChannel = SwitchHandler(SwitchstateIndex);
    ArrayForFFT[indexInFFTArray] = ValueSwitchChannel ? 1 : 0;
});
function changeWindowStyle() {                                    //gets called when the window style is changed.                           
    var windowStyleDict = {                                       //dictionary that maps the window style to a number.
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


//code for the waveformgenerator
$('#frequencySlider').on("input change", function () {            //gets called when the frequency slider is moved.
    indexInWFGArray = 0;
    var element = $('#frequencySlider'),
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#FrequencyInputField').val(parseInt(value))
    $('#frequencySliderValue').text("Value : " + value + " Hz");
});

$('#FrequencyInputField').on("ipnut change", function () {          //gets called when the frequency input field is changed.
    indexInWFGArray = 0;
    var element = $('#FrequencyInputField'),
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    min = 10;
    max = 100000;
    if (value < min) value = min;                                   //makes sure the value is between the min and max value.
    if (value > max) value = max;
    $('#FrequencyInputField').val(parseInt(value))
    $('#frequencySlider').val(parseInt(value))
    $('#frequencySliderValue').text("Value : " + value + " Hz");
    setTimeout(SendDataOnUpdate, 50);
})

$('#dutycycleSlider').on("input change", function () {              //gets called when the dutycycle slider is moved.
    indexInWFGArray = 1;
    var element = $('#dutycycleSlider'),
        value = element.val()
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#dutycycleSliderValue').text("Value : " + value + " %");
});

$('#wavegen-offsetSlider').on("input change", function () {         //gets called when the offset slider is moved.
    indexInWFGArray = 3;
    var element = $('#wavegen-offsetSlider'),
        value = element.val();
    ArrayForWaveform[indexInWFGArray] = parseInt(value);
    $('#wavegen-offsetSliderValue').text("Value : " + value / 100 + " V");
});

function changeGolfStyle() {                                        //gets called when the golf style is changed.
    var golfStyleDict = {                                           //dictionary to convert the golf style to a number.
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
