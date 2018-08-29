//global variables to check what parts of the chart have changed

var prevStartTime = -1;
var prevEndTime = -1;
var prevIsLogPredictor = false;
var prevIsMA1 = false;
var prevMAVal1 = 50;
var prevIsSD1 = false;
var prevSDVal1 = 2;
var prevIsBuySell1 = false;
var prevIsMA2 = false;
var prevMAVal2 = 50;
var prevIsSD2 = false;
var prevSDVal2 = 2;
var prevIsBuySell2 = false;
var isMA2Inactive = undefined;
var isSD2Inactive = undefined;
var isBuySell2Inactive = undefined;

//BEGINNING OF HELPER FUNCTION SECTION

//checks if the start and end times are different
function isTimeDiff(startTime, endTime) {
    return (startTime !== prevStartTime || endTime !== prevEndTime);
}

//checks if logPredictor and predictor was toggled
function isLogDiff(isLogPredictor) {
    return isLogPredictor !== prevIsLogPredictor;
}

//crops a series to fit the calendar/time constraint
function seriesCropper(priceData, startIndex, endIndex) {
    var priceArr = [];
    for (var i = startIndex; i < endIndex; i++) {
        priceArr.push([priceData[i][0], priceData[i][1]]);
    }
    return priceArr;
}
//finding all points when predictor series crosses over the upper standard deviation line
function buysFunc(predictorData, upperStdDevData) {
    var buysArr = [];
    var starting = predictorData.length - upperStdDevData.length;
    var firstPredictorPoint = predictorData[starting][1];
    var firstStdDevPoint = upperStdDevData[0][1];
    for (var i = starting + 1, j = 0; i < predictorData.length; i++, j++) {
        var secondPredictorPoint = predictorData[i][1];
        var secondStdDevPoint = upperStdDevData[j][1];
        if (firstPredictorPoint <= firstStdDevPoint && secondPredictorPoint > secondStdDevPoint) {
            var tempRow = [predictorData[i][0], predictorData[i][1], i];
            buysArr.push(tempRow);
        }
        firstPredictorPoint = secondPredictorPoint;
        firstStdDevPoint = secondStdDevPoint;
    }
    return buysArr;
}

//finding all points when predictor series crosses over the lower standard deviation line
function sellsFunc(predictorData, lowerStdDevData) {
    var sellsArr = [];
    var starting = predictorData.length - lowerStdDevData.length;
    var firstPredictorPoint = predictorData[starting][1];
    var firstStdDevPoint = lowerStdDevData[0][1];
    for (var i = starting + 1, j = 0; i < predictorData.length; i++, j++) {
        var secondPredictorPoint = predictorData[i][1];
        var secondStdDevPoint = lowerStdDevData[j][1];
        if (firstPredictorPoint >= firstStdDevPoint && secondPredictorPoint < secondStdDevPoint) {
            var tempRow = [predictorData[i][0], predictorData[i][1], i];
            sellsArr.push(tempRow);
        }
        firstPredictorPoint = secondPredictorPoint;
        firstStdDevPoint = secondStdDevPoint;
    }
    return sellsArr;
}
//cleans the buysFunc or sellsFunc data to remove any very close points and remove the third column (indices used for the popover)
function buySellCleaner(buyOrSellData) {
    var tempArr = [];
    var TIME_SIGNIFICANCE = 3600000;
    var recentTime = Number.MIN_SAFE_INTEGER;
    for (var i = 0; i < buyOrSellData.length; i++) {
        if (buyOrSellData[i][0] - recentTime > TIME_SIGNIFICANCE) {
            tempArr.push(buyOrSellData[i]);
            recentTime = buyOrSellData[i][0];
        }
    }
    return tempArr;
}
//takes data in form that is outputted by buyFunc or sellFunc and parses it to be used in the popover
function popoverInfoParser(buyOrSellData, priceArr) {
    var str = "";
    //Points less than 1 hour apart (in milliseconds) wont be shown
    var TIME_SIGNIFICANCE = 3600000;
    var recentTime = Number.MIN_SAFE_INTEGER;
    for (var i = 0; i < buyOrSellData.length; i++) {
        str += unixToEST(buyOrSellData[i][0]) + ", $" + priceArr[buyOrSellData[i][2]][1].toFixed(2) + '\n';
        recentTime = buyOrSellData[i][0];
    }
    return str;
}
//javascript for the calendars
function calendarFunc() {
    $('#datetimepicker1').datetimepicker({
        timeZone: "Etc/GMT+5",
        format: "MM/DD/YY kk:mm",
        useCurrent: false,
        defaultDate: dataArr[3][0][0],
        minDate: dataArr[3][0][0],
        maxDate: dataArr[3][dataArr[3].length - 1][0]
    });
    $('#datetimepicker2').datetimepicker({
        timeZone: "Etc/GMT+5",
        format: "MM/DD/YY kk:mm",
        useCurrent: false,
        defaultDate: dataArr[3][dataArr[3].length - 1][0],
        minDate: dataArr[3][0][0],
        maxDate: dataArr[3][dataArr[3].length - 1][0]
    });

}
//converts unix time to the index where predictorData should start
function UnixTimeToStartIndexConverter(predictorData, desiredStart) {
    for (var i = 0; i < predictorData.length; i++) {
        if (predictorData[i][0] >= desiredStart) {
            return i;
        }
    }
    return 0;
}

//converts unix time to the index where predictorData one past where the data should end so returned end is noninclusive
function UnixTimeToEndIndexConverter(predictorData, desiredEnd) {
    for (var i = predictorData.length - 1; i >= 0; i--) {
        if (predictorData[i][0] <= desiredEnd) {
            return i + 1;
        }
    }
    return predictorData.length;
}
//converts predictor data in logPredictor data
function logFunc(predictorData, startIndex, endIndex) {
    var predictorArr = [];
    for (var i = startIndex; i < endIndex; i++) {
        var tempRow = [predictorData[i][0], Math.log10(predictorData[i][1])];
        predictorArr.push(tempRow);
    }

    return predictorArr;
};

//calculates moving average data and returns it
//REQUIRES: Moving average days must be less than the number of data points
function movingDayAvgFunc(predictorData, days) {
    var MINUTES_PER_WORK_DAY = 390;

    var meanArr = [];

    var count = 1;
    var mean = predictorData[0][1];
    for (var i = 1; i < days * MINUTES_PER_WORK_DAY; i++) {
        count++;
        var delta = predictorData[i][1] - mean;
        mean += delta / count;
    }
    meanArr.push([predictorData[days * MINUTES_PER_WORK_DAY - 1][0], mean]);
    for (var i = days * MINUTES_PER_WORK_DAY, j = 1; i < predictorData.length; i++, j++) {
        mean += (predictorData[i][1] - predictorData[i - days * MINUTES_PER_WORK_DAY][1]) / (count - 1);

        meanArr.push([predictorData[i][0], mean]);
    }
    return meanArr;
}

function upperStdDevFunc(predictorData, days, numStdDev) {

    var MINUTES_PER_WORK_DAY = 390;
    var stdDevArr = [];
    var count = 1;
    var mean = predictorData[0][1];
    var m2 = mean;
    for (var i = 1; i < days * MINUTES_PER_WORK_DAY; i++) {
        count++;
        var delta = predictorData[i][1] - mean;
        mean += delta / count;
        var delta2 = predictorData[i][1] - mean;
        m2 += delta * delta2;
        var variance = m2 / (count - 1);
    }
    stdDevArr.push([predictorData[days * MINUTES_PER_WORK_DAY - 1][0], mean + numStdDev * Math.sqrt(variance)]);
    for (var i = days * MINUTES_PER_WORK_DAY, j = 1; i < predictorData.length; i++, j++) {
        var newMean = mean + (predictorData[i][1] - predictorData[i - days * MINUTES_PER_WORK_DAY][1]) / (count - 1);

        var newVariance = variance + (predictorData[i][1] - newMean + predictorData[i - days * MINUTES_PER_WORK_DAY][1] - mean) * (predictorData[i][1] - predictorData[i - days * MINUTES_PER_WORK_DAY][1]) / (count - 1);
        stdDevArr.push([predictorData[i][0], newMean + numStdDev * Math.sqrt(newVariance)]);
        mean = newMean;
        variance = newVariance;
    }
    return stdDevArr;
}

function lowerStdDevFunc(predictorData, days, numStdDev) {
    var MINUTES_PER_WORK_DAY = 390;
    var stdDevArr = [];
    var count = 1;
    var mean = predictorData[0][1];
    var m2 = mean;
    for (var i = 1; i < days * MINUTES_PER_WORK_DAY; i++) {
        count++;
        var delta = predictorData[i][1] - mean;
        mean += delta / count;
        var delta2 = predictorData[i][1] - mean;
        m2 += delta * delta2;
        var variance = m2 / (count - 1);
    }
    stdDevArr.push([predictorData[days * MINUTES_PER_WORK_DAY - 1][0], mean - numStdDev * Math.sqrt(variance)]);
    for (var i = days * MINUTES_PER_WORK_DAY, j = 1; i < predictorData.length; i++, j++) {
        var newMean = mean + (predictorData[i][1] - predictorData[i - days * MINUTES_PER_WORK_DAY][1]) / (count - 1);

        var newVariance = variance + (predictorData[i][1] - newMean + predictorData[i - days * MINUTES_PER_WORK_DAY][1] - mean) * (predictorData[i][1] - predictorData[i - days * MINUTES_PER_WORK_DAY][1]) / (count - 1);
        stdDevArr.push([predictorData[i][0], newMean - numStdDev * Math.sqrt(newVariance)]);
        mean = newMean;
        variance = newVariance;
    }
    return stdDevArr;
}


//BEGINNING OF 'MAIN'

$(document).ready(function () {
    // File selection
    const input = document.querySelector('input[type="file"]');
    input.addEventListener('change', function (e) {
        const reader = new FileReader();
        reader.onload = function () {
            parserFunction(reader.result);
            chartsFunction();
            calendarFunc();
        }
        reader.readAsText(input.files[0]);
    }, false);

    $("#predictor").click(function () {
        $("#logPredictor").removeClass("active");
        $("#predictor").addClass("active");
    });
    $("#logPredictor").click(function () {
        $("#predictor").removeClass("active");
        $("#logPredictor").addClass("active");
    });
    $("#onMA1").click(function () {
        $("#offMA1").removeClass("active");
        $("#onMA1").addClass("active");
        $("#textMA1").prop("disabled", false);
    });
    $("#offMA1").click(function () {
        $("#onMA1").removeClass("active");
        $("#offMA1").addClass("active");
        if ($("#offSD1").hasClass("active")) {
            $("#textMA1").prop("disabled", true);
        }
    });
    $("#onSD1").click(function () {
        $("#offSD1").removeClass("active")
        $("#onSD1").addClass("active")
        $("#textSD1").prop("disabled", false);
        $("#buySell1").prop("disabled", false);
        $("#textMA1").prop("disabled", false);
    });
    $("#offSD1").click(function () {
        $("#onSD1").removeClass("active")
        $("#offSD1").addClass("active")
        $("#textSD1").prop("disabled", true);
        $("#buySell1").prop("disabled", true);
        if ($("#offMA1").hasClass("active")) {
            $("#textMA1").prop("disabled", true);
        }
    });
    $("#buySell1").click(function () {
        $("#buySell1").toggleClass("active");
    });
    $("#onMA2").click(function () {
        $("#offMA2").removeClass("active");
        $("#onMA2").addClass("active");
        $("#textMA2").prop("disabled", false);
    });
    $("#offMA2").click(function () {
        $("#onMA2").removeClass("active");
        $("#offMA2").addClass("active");
        if ($("#offSD2").hasClass("active")) {
            $("#textMA2").prop("disabled", true);
        }
    });
    $("#onSD2").click(function () {
        $("#offSD2").removeClass("active");
        $("#onSD2").addClass("active");
        $("#textSD2").prop("disabled", false);
        $("#buySell2").prop("disabled", false);
        $("#textMA2").prop("disabled", false);
    });
    $("#offSD2").click(function () {
        $("#onSD2").removeClass("active");
        $("#offSD2").addClass("active");
        $("#textSD2").prop("disabled", true);
        $("#buySell2").prop("disabled", true);
        if ($("#offMA2").hasClass("active")) {
            $("#textMA2").prop("disabled", true);
        }
    });
    $("#buySell2").click(function () {
        $("#buySell2").toggleClass("active");
    });
    $("#buyButton1").click(function () {
        $("#buyButton1").toggleClass("active");
    });
    $("#tooltipToggle").click(function () {
        $("#tooltipToggle").toggleClass("active");
        var chart = $("#chart1").highcharts();
        if ($("#tooltipToggle").hasClass("active")) {
            chart.update({
                tooltip: {
                    enabled: true
                }
            });
        } else {
            chart.update({
                tooltip: {
                    enabled: false
                }
            });
        }
    });

    //After the submit button is clicked
    $("#submit").click(function () {
        //closes the navbar
        $(".navbar-collapse").collapse('hide');

        //in UNIX time milliseconds
        var calendarVal1 = calendarDateConverter($("#calendar1").val());
        var calendarVal2 = calendarDateConverter($("#calendar2").val());
        var startTime = calendarVal1 < calendarVal2 ? calendarVal1 : calendarVal2;
        var endTime = calendarVal1 > calendarVal2 ? calendarVal1 : calendarVal2;
        var startIndex = UnixTimeToStartIndexConverter(dataArr[3], startTime);
        var endIndex = UnixTimeToEndIndexConverter(dataArr[3], endTime);
        var isLogPredictor = $("#logPredictor").hasClass("active");
        var predictorData = isLogPredictor ? logFunc(dataArr[3], startIndex, endIndex) : seriesCropper(dataArr[3], startIndex, endIndex);
        var chart = $("#chart1").highcharts();
        var priceArr = seriesCropper(dataArr[2], startIndex, endIndex);

        if (isTimeDiff(startTime, endTime)) {
            //changing price series to fit calendar constraints
            var priceSeries = chart.get("Price");
            priceSeries.update({
                id: "Price",
                data: priceArr
            })
        }

        if (isTimeDiff(startTime, endTime) || isLogDiff(isLogPredictor)) {
            var predictorSeries = chart.get("predictor");
            //Dealing with Predictor-toggle
            //if logPredictor is selected
            if (isLogPredictor) {
                //if predictor exists (not logPredictor) then change it
                predictorSeries.update({
                    id: "predictor",
                    name: "Log predictor value",
                    data: predictorData
                });

            }
            //if predictor is selected
            else {
                //if logPredictor exists (not predictor) then change it
                predictorSeries.update({
                    id: "predictor",
                    name: "Predictor value",
                    data: predictorData
                });
            }
        }
        var days1 = Number($("#textMA1").val());
        if (prevIsMA1 !== $("#onMA1").hasClass("active") || ($("#onMA1").hasClass("active") && (days1 !== prevMAVal1 || isLogDiff(isLogPredictor) || isTimeDiff(startTime, endTime)))) {
            if ($("#onMA1").hasClass("active")) {
                /*
                console error sprouts from these two statements below.
                only causes "error" in the short transitions between graphs
                */
                if (chart.get("MA1") !== undefined) {
                    chart.get("MA1").remove();
                }

                //if MA2 is the same as MA1 delete it
                if (chart.get("MA2") !== undefined && days1 === Number($("#textMA2").val())) {
                    chart.get("MA2").remove();
                }
                var ma1Data = movingDayAvgFunc(predictorData, days1);

                chart.addSeries({
                    id: "MA1",
                    name: days1 + "-day MA #1",
                    data: ma1Data,
                    color: "#B356EB",
                    marker: {
                        symbol: 'square'
                    }
                });
            }
            //if MA1 is off, removes MA1 and SD1 lines
            else if (chart.get("MA1") !== undefined) {
                chart.get("MA1").remove();
            }
        }

        var numStdDev1 = Number($("#textSD1").val());
        if (prevIsSD1 !== $("#onSD1").hasClass("active") || ($("#onSD1").hasClass("active") && (days1 !== prevMAVal1 || numStdDev1 !== prevSDVal1 || isLogDiff(isLogPredictor) || isTimeDiff(startTime, endTime)))) {
            //deletes any old SD1 lines and buy/sell points
            if (chart.get("SD1upper") !== undefined) {
                chart.get("SD1upper").remove();
                chart.get("SD1lower").remove();
            }
            if (chart.get("buy1") !== undefined) {
                chart.get("buy1").remove();
                chart.get("sell1").remove();
            }
            if ($("#onSD1").hasClass("active")) {
                //if SD2 is the same as SD1 delete it
                if (chart.get("SD2") !== undefined && days1 === Number($("#textMA2").val()) && numStdDev1 === Number($("#textSD2").val())) {
                    chart.get("SD2upper").remove();
                    chart.get("SD2lower").remove();
                }
                var upperStdDevData1 = upperStdDevFunc(predictorData, days1, numStdDev1);
                var lowerStdDevData1 = lowerStdDevFunc(predictorData, days1, numStdDev1);
                chart.addSeries({
                    id: "SD1upper",
                    name: numStdDev1.toString() + " SD #1",
                    data: upperStdDevData1,
                    color: "#FAE457",
                    marker: {
                        symbol: 'triangle'
                    }
                });
                chart.addSeries({
                    id: "SD1lower",
                    name: "Lower SD1",
                    data: lowerStdDevData1,
                    color: "#FAE457",
                    showInLegend: false,
                    marker: {
                        symbol: 'triangle-down'
                    }
                });
            }
        }
        if ($("#buySell1").hasClass("active") && $("#onSD1").hasClass("active") && (numStdDev1 !== prevSDVal1 || prevIsBuySell1 === false || isTimeDiff(startTime, endTime) || isLogDiff(isLogPredictor))) {
            $("#buyButton1").prop("disabled", false);
            $("#sellButton1").prop("disabled", false);
            var upperStdDevData1 = upperStdDevFunc(predictorData, days1, numStdDev1);
            var lowerStdDevData1 = lowerStdDevFunc(predictorData, days1, numStdDev1);
            var buysPoints1 = buysFunc(predictorData, upperStdDevData1);
            var sellsPoints1 = sellsFunc(predictorData, lowerStdDevData1);
            var cleanedBuys1 = buySellCleaner(buysPoints1);
            var cleanedSells1 = buySellCleaner(sellsPoints1);
            if (chart.get("buy2") !== undefined && days1 === days2 && numStdDev1 === numStdDev2) {
                chart.get("buy2").remove();
                chart.get("sell2").remove();
                $("#buyButton2").prop("disabled", false);
                $("#sellButton2").prop("disabled", false);
            }
            chart.addSeries({
                id: "buy1",
                name: "Buys for SD #1",
                type: "scatter",
                color: "#23DA47",
                data: cleanedBuys1,
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedBuys1[this.index][2]][1] + "</b>";
                    }
                },
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            chart.addSeries({
                id: "sell1",
                name: "Sells for SD #1",
                type: "scatter",
                color: "red",
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedSells1[this.index][2]][1] + "</b>";
                    }
                },
                data: cleanedSells1,
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            $("#buyButton1").popover();
            $("#buyButton1").attr('data-content', popoverInfoParser(buysPoints1, priceArr));
            $("#buyButton1").attr('data-original-title', "Buys of " + days1 + "-day MA at " + numStdDev1 + " SD");
            $("#sellButton1").popover();
            $("#sellButton1").attr('data-content', popoverInfoParser(sellsPoints1, priceArr));
            $("#sellButton1").attr('data-original-title', "Sells of " + days1 + "-day MA at " + numStdDev1 + " SD");

        }
        //if the button is off and it was previously on, delete the chart
        else if (!($("#buySell1").hasClass("active")) && prevIsBuySell1 === true) {
            if (chart.get("buy1") !== undefined) {
                chart.get("buy1").remove();
                chart.get("sell1").remove();
                $("#buyButton1").prop("disabled", true);
                $("#sellButton1").prop("disabled", true);
            }
        }
        var days2 = Number($("#textMA2").val());
        //MA2/SD2
        if (prevIsMA2 !== $("#onMA2").hasClass("active") || ($("#onMA2").hasClass("active") && (days2 !== prevMAVal2 || isLogDiff(isLogPredictor) || isTimeDiff(startTime, endTime)))) {
            if ($("#onMA2").hasClass("active")) {
                /*
                console error sprouts from these two statements below.
                only causes "error" in the small graph change transitions
                */
                if (chart.get("MA2") !== undefined) {
                    chart.get("MA2").remove();
                }
                var ma2Data = movingDayAvgFunc(predictorData, days2);
                //makes sure there are no duplicate MA graphs
                if ($("#onMA2").hasClass("active") && (!$("#onMA1").hasClass("active") || days1 !== days2)) {
                    chart.addSeries({
                        id: "MA2",
                        name: days2 + "-day MA #2",
                        data: ma2Data,
                        color: "#E40B1E",
                        marker: {
                            symbol: 'square'
                        }
                    });
                }
            }
            //removes MA2 and SD2 lines
            else if (chart.get("MA2") !== undefined) {
                chart.get("MA2").remove();
            }
        }

        var numStdDev2 = Number($("#textSD2").val());
        if (prevIsSD2 !== $("#onSD2").hasClass("active") || ($("#onSD2").hasClass("active") && (days2 !== prevMAVal2 || numStdDev2 !== prevSDVal2 || isLogDiff(isLogPredictor) || isTimeDiff(startTime, endTime) || ($("#onSD1").hasClass("active") && days2 === days1 && numStdDev1 === numStdDev2)))) {
            if (chart.get("SD2upper") !== undefined) {
                chart.get("SD2upper").remove();
                chart.get("SD2lower").remove();
            }
            if (chart.get("buy2") !== undefined) {
                chart.get("buy2").remove();
                chart.get("sell2").remove();
            }
            if ($("#onSD2").hasClass("active") && (!$("#onSD1").hasClass("active") || days1 !== days2 || numStdDev1 !== numStdDev2)) {
                var upperStdDevData2 = upperStdDevFunc(predictorData, days2, numStdDev2);
                var lowerStdDevData2 = lowerStdDevFunc(predictorData, days2, numStdDev2);
                chart.addSeries({
                    id: "SD2upper",
                    name: numStdDev2.toString() + " SD #2",
                    data: upperStdDevData2,
                    color: "#F98A31",
                    marker: {
                        symbol: 'triangle'
                    }
                });
                chart.addSeries({
                    id: "SD2lower",
                    name: "Lower SD2",
                    data: lowerStdDevData2,
                    color: "#F98A31",
                    showInLegend: false,
                    marker: {
                        symbol: 'triangle-down'
                    }
                });
            }
        }

        if ($("#buySell2").hasClass("active") && (chart.get("SD2upper") !== undefined && (numStdDev2 !== prevSDVal2 || prevIsBuySell2 === false || isTimeDiff(startTime, endTime) || isLogDiff(isLogPredictor)))) {
            $("#buyButton2").prop("disabled", false);
            $("#sellButton2").prop("disabled", false);
            var buysPoints2 = buysFunc(predictorData, upperStdDevData2);
            var sellsPoints2 = sellsFunc(predictorData, lowerStdDevData2);
            var cleanedBuys2 = buySellCleaner(buysPoints2);
            var cleanedSells2 = buySellCleaner(sellsPoints2);

            chart.addSeries({
                type: "scatter",
                id: "buy2",
                name: "Buys for SD #2",
                data: cleanedBuys2,
                color: "#006400",
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedBuys2[this.index][2]][1] + "</b>";
                    }
                },
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            chart.addSeries({
                type: "scatter",
                id: "sell2",
                name: "Sells for SD #2",
                data: cleanedSells2,
                color: "#ab0606",
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedSells2[this.index][2]][1] + "</b>";
                    }
                },
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            $("#buyButton2").popover();
            $("#buyButton2").attr('data-content', popoverInfoParser(buysPoints2, priceArr));
            $("#buyButton2").attr('data-original-title', "Buys of " + days2 + "-day MA at " + numStdDev2 + " SD");
            $("#sellButton2").popover();
            $("#sellButton2").attr('data-content', popoverInfoParser(sellsPoints2, priceArr));
            $("#sellButton2").attr('data-original-title', "Sells of " + days2 + "-day MA at " + numStdDev2 + " SD");
        }
        //special case where MA days and SD val are the same but Buy/Sell 1 is off and Buy/Sell2 is on
        else if ($("#buySell2").hasClass("active") && $("#onSD2").hasClass("active") && days1 === days2 && numStdDev1 === numStdDev2 && !$("#buySell1").hasClass("active")) {
            $("#buyButton2").prop("disabled", false);
            $("#sellButton2").prop("disabled", false);
            //upperStdDevData1 (not 2) is not a typo
            var buysPoints2 = buysFunc(predictorData, upperStdDevData1);
            var sellsPoints2 = sellsFunc(predictorData, lowerStdDevData1);
            var cleanedBuys2 = buySellCleaner(buysPoints2);
            var cleanedSells2 = buySellCleaner(sellsPoints2);

            chart.addSeries({
                type: "scatter",
                id: "buy2",
                name: "Buys for SD #2",
                data: cleanedBuys2,
                color: "#006400",
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedBuys2[this.index][2]][1] + "</b>";
                    }
                },
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            chart.addSeries({
                type: "scatter",
                id: "sell2",
                name: "Sells for SD #2",
                data: cleanedSells2,
                color: "#ab0606",
                tooltip: {
                    pointFormatter: function () {
                        return "Time: " + "<b>" + unixToEST(this.x) + "</b>" + "<br/>Price: <b>$" + priceArr[cleanedSells2[this.index][2]][1] + "</b>";
                    }
                },
                marker: {
                    radius: 5,
                    symbol: 'circle'
                }
            });
            $("#buyButton2").popover();
            $("#buyButton2").attr('data-content', popoverInfoParser(buysPoints2, priceArr));
            $("#buyButton2").attr('data-original-title', "Buys of " + days2 + "-day MA at " + numStdDev2 + " SD");
            $("#sellButton2").popover();
            $("#sellButton2").attr('data-content', popoverInfoParser(sellsPoints2, priceArr));
            $("#sellButton2").attr('data-original-title', "Sells of " + days2 + "-day MA at " + numStdDev2 + " SD");
        } else if (!($("#buySell2").hasClass("active")) && prevIsBuySell2 === true) {
            if (chart.get("buy2") !== undefined) {
                chart.get("buy2").remove();
                chart.get("sell2").remove();
                $("#buyButton2").prop("disabled", true);
                $("#sellButton2").prop("disabled", true);
            }
        }
        if ($("#onMA1").hasClass("active") && $("#onMA2").hasClass("active") && days1 === days2) {
            isMA2Inactive = true;
        }
        if ($("#onSD1").hasClass("active") && $("#onSD2").hasClass("active") && numStdDev1 === numStdDev2 && days1 === days2) {
            isSD2Inactive = true;
        }
        if ($("#buySell1").hasClass("active") && $("#buySell2").hasClass("active") && $("#onSD1").hasClass("active") && $("#onSD2").hasClass("active") && numStdDev1 === numStdDev2 && days1 === days2) {
            isBuySell2Inactive = true;
        }
        //setting all the prev variables
        prevStartTime = startTime;
        prevEndTime = endTime;
        prevIsLogPredictor = isLogPredictor;
        prevIsMA1 = $("#onMA1").hasClass("active");
        prevMAVal1 = days1;
        prevIsSD1 = $("#onSD1").hasClass("active");
        prevSDVal1 = numStdDev1;
        prevIsBuySell1 = $("#buySell1").hasClass("active");
        prevIsMA2 = isMA2Inactive === true ? false : $("#onMA2").hasClass("active");
        prevMAVal2 = days2;
        prevIsSD2 = isSD2Inactive === true ? false : $("#onSD2").hasClass("active");
        prevSDVal2 = numStdDev2;
        prevIsBuySell2 = isBuySell2Inactive ? false : $("#buySell2").hasClass("active");
    });
});


//dateTime-to-millisecondsSinceEpoch converter (helper function)
//Date in the format (YYYYMMDD) time in (kmm)
//Parameters are strings
function dateTimeConverter(date, time) {
    Date.prototype.getUnixTime = function () {
        return this.getTime() / 1000 | 0
    };
    var monthArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (time.length == 3) {
        time = "0".concat(time);
    }
    //make the dateTime into a format the Date module can read (DD MM YYYY kk:mm EST)
    var dateTimeStr = (date.substr(6, 2)).concat(" ", monthArr[Number(date.substr(4, 2)) - 1], " ", date.substr(0, 4), " ", time.substr(0, 2), ":", time.substr(2, 2), " EST");
    //* 1000 to convert from s to ms
    return (new Date(dateTimeStr).getUnixTime() * 1000);
}

function calendarDateConverter(dateTime) {
    //in string MM/DD/YY kk:mm
    Date.prototype.getUnixTime = function () {
        return this.getTime() / 1000 | 0
    };
    return (new Date(dateTime + " EST").getUnixTime() * 1000);
}
//takes in unix time in milliseconds and converts it to MM
function unixToEST(unixTime) {
    return moment(unixTime).tz("Etc/GMT+5").format("L HH:mm");
}
//master array that holds all the data
var dataArr = [];
//CSV parser
function parserFunction(data) {
    //splits the CSV lines
    var allRows = data.split(/\r?\n|\r/);
    var numSignificantColumns = 4;
    var numDateTimeCol = 2;
    var dataBeginRow = 2;
    //start at the first yaxis column; 2 columns of datetime
    for (var i = numDateTimeCol; i < numSignificantColumns; i++) {
        dataArr[i] = [];
    }
    for (var singleRow = dataBeginRow; singleRow < allRows.length - 1; singleRow++) {

        var this_row = allRows[singleRow].split(',')
        for (var i = numDateTimeCol; i < numSignificantColumns; i++) {
            var dateColIndex = 0;
            var timeColIndex = 1;
            //retrieves dateTime in correct UTC format
            var dateTime = dateTimeConverter(this_row[dateColIndex], this_row[timeColIndex]);
            //retrieves yValue data and converts it from str to num
            var yValue = Number(this_row[i]);
            //puts it in the format to go into the master array
            //find yMaxes and yMins for the graph
            var tempRowArr = [dateTime, yValue];

            //pushes row to the master array
            dataArr[i].push(tempRowArr);

        }
    }
    if (allRows[allRows.length - 1] !== "") {
        var this_row = allRows[allRows.length - 1].split(',')
        for (var i = numDateTimeCol; i < numSignificantColumns; i++) {
            var dateColIndex = 0;
            var timeColIndex = 1;
            //retrieves dateTime in correct UTC format
            var dateTime = dateTimeConverter(this_row[dateColIndex], this_row[timeColIndex]);
            //retrieves yValue data and converts it from str to num
            var yValue = Number(this_row[i]);
            //puts it in the format to go into the master array
            //find yMaxes and yMins for the graph
            var tempRowArr = [dateTime, yValue];

            //pushes row to the master array
            dataArr[i].push(tempRowArr);
        }
    }

}
//end of CSV parser

var chart1;
//sets up the chart
function chartsFunction() {
    chart1 = Highcharts.chart('chart1', {
        tooltip: {
            valueDecimals: 2,
            split: true,
            dateTimeLabelFormats: {
                second: '%b %e, %Y %H:%M:%S',
                minute: '%b %e, %Y %H:%M',
                hour: '%b %e, %Y %H:%M',
                day: '%B %d, %Y',
                week: '%B %d, %Y',
                month: '%B %Y',
                year: '%Y'
            },
        },
        time: {
            timezone: "Etc/GMT+5"
        },
        chart: {
            backgroundColor: '#2B343F',
            type: 'line',
            zoomType: "xy",
            animation: false,
            panning: true,
            panKey: 'shift'
        },
        rangeSelector: {
            selected: 1
        },
        title: {
            text: 'Stock Price'
        },
        legend: {
            itemStyle: {
                color: '#767676'
            }
        },
        xAxis: {
            crosshair: {
                color: '#FB7F1D'
            },
            type: 'datetime',
            lineColor: '#767676',
            gridLineColor: '#767676',
            minorGridLineColor: '#767676',
            minorTickColor: '#767676',
            tickColor: '#767676',
            labels: {
                style: {
                    color: '#767676'
                }
            }
        },
        yAxis: [{
                crosshair: {
                    color: '#FB7F1D'
                },
                lineColor: '#767676',
                gridLineColor: '#767676',
                minorGridLineColor: '#767676',
                minorTickColor: '#767676',
                tickColor: '#767676',
                labels: {
                    style: {
                        color: '#767676'
                    }
                },
                title: {
                    text: 'Predictor value',
                    style: {
                        color: '#767676'
                    }
                }
            },
            {
                crosshair: {
                    color: '#FB7F1D'
                },
                lineColor: '#767676',
                gridLineColor: '#767676',
                minorGridLineColor: '#767676',
                minorTickColor: '#767676',
                tickColor: '#767676',
                labels: {
                    format: '${value}',
                    style: {
                        color: '#767676'
                    }
                },
                gridLineWidth: 0,
                alignTicks: false,
                opposite: true,
                gridLineColor: '#767676',
                title: {
                    text: 'Price',
                    style: {
                        color: '#767676'
                    }
                }
            }
        ],
        //to hide Highcharts logo
        credits: {
            enabled: false
        },
        //the data (lines)
        series: [{
                id: 'Price',
                name: 'Price',
                marker: {
                    symbol: 'circle'
                },
                //change index to match the column index of the csv file
                data: dataArr[2],
                yAxis: 1,
                color: '#688EF9',
                tooltip: {
                    valuePrefix: '$',
                    valueSuffix: ' USD',
                }
            },
            {
                id: 'predictor',
                name: 'Predictor value',
                marker: {
                    symbol: 'diamond'
                }, //change index to match the column index of the csv file
                data: dataArr[3],
                yAxis: 0,
                color: '#F2F2F3',
            }
        ]
    });
}
