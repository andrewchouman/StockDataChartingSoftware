# Data Visualization Tool for Stock Market Algorithms
###### Developed by: Andrew Chouman
###### Last modified: August 29, 2018

This tool allows users to visualize the effectiveness of a stock market algorithm. The user can compare the time series of a stock's price to a time series of an algorithm they designed to predict its movements. **It's designed handle hundreds of thousands of data points without losing its responsiveness.** A description of all the tools included in the software are provided below.

## Quick Start
Download the folder and open of the HTML document in your preferred browser (Google Chrome or Safari are recommended). Click on the `Choose File` button and select a correctly formatted data file (`sample_data.csv` is included). Use the control panel at the bottom of the screen to use the tools. For the sample data, I would recommend toggling to the log Predictor to see it better.

## Data file format
The format must mimic the sample file given. The first column must be the date (Ymd* format), the second column must be time (HM* format), the third column must be the stock price, and the fourth column must be the user's predictor value.

NOTE: Some functionality (such as moving average and standard deviation calculators) only work properly when there are 390 datapoints per day (the number of minutes from 9:30 to 15:59, inclusive). This can be customized by changing the `MINUTES_PER_WORK_DAY` variable in the .js file.

* Y: Four digit year, m: Two digit month number, d: two digit day of the month, H: hours in 24h format (0-23), M: two digit minute

## Features
##### File Locator
This is used to select the data file stored on the user's local computer. Once a valid file is selected, the chart will appear.

##### Log Toggle
The algorithm data can be toggled to display the log (base 10) of the data to help fit it to the price series better.

##### Moving Average Calculators
Two moving averages can be displayed. These are linked to the algorithm data, not the price.

##### Standard Deviation Calculators
Two standard deviation calculators display the upper and lower bounds of the moving average. These calculatations are intensive, so it may take a few seconds to display the results.

##### Buy/Sell Flags
Flags are placed where the algorithm crosses either standard deviation bound to indicate a buy or sell location. The points are also listed when the buy or sell buttons are clicked. These buttons are located at the top of the control panel.

##### Hide Labels Toggle
Data point labels can be hidden by clicking the textbox icon at the top of the control panel.

##### Calendar Functionality
The start and end times of the chart can be adjusted using the calendars on the right side of the control panel.

##### Zoom Functionality
Draw a box on the graph with the cursor to make the selected box fill the screen.
