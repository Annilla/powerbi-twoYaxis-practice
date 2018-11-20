/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {

    // Bar chart
    interface BarPoint {
        category: string;
        value: number;
    };

    interface BarModel {
        dataPoints: BarPoint[];
        maxValue: number;
    };

    // Line chart
    interface LinePoint {
        category: string;
        value: number;
    };

    interface LineModel {
        dataPoints: LinePoint[];
        maxValue: number;
    };

    export class Visual implements IVisual {

        private svg: d3.Selection<SVGElement>;
        private xAxisGroup: d3.Selection<SVGElement>;
        private yAxisGroupLeft: d3.Selection<SVGElement>;
        private yAxisGroupRight: d3.Selection<SVGElement>;
        private barGap: number = 0.3;
        private barGroup: d3.Selection<SVGElement>;
        private barModel: BarModel;
        private lineGroup: d3.Selection<SVGElement>;
        private lineModel: LineModel;
        private settings = {
            padding: {
                top: 30,
                right: 50,
                bottom: 50,
                left: 30
            }
        }

        constructor(options: VisualConstructorOptions) {
            console.log('Visual constructor', options);

            // Prepare SVG
            this.svg = d3.select(options.element)
                .append("svg")
                .classed("chart", true);

            // Prepare x axis
            this.xAxisGroup = this.svg.append("g")
                .classed("x-axis", true);

            // Prepare y axis
            this.yAxisGroupLeft = this.svg.append("g")
                .classed("y-axis-left", true);

            // Prepare y axis
            this.yAxisGroupRight = this.svg.append("g")
                .classed("y-axis-right", true);

            // Prepare barGroup
            this.barGroup = this.svg
                .append("g")
                .classed("bar-group", true);

            // Prepare lineGroup
            this.lineGroup = this.svg
                .append("g")
                .classed("line-group", true);
        }

        private setViewModel(options: VisualUpdateOptions) {
            let dv = options.dataViews;
            let barModel: BarModel = {
                dataPoints: [],
                maxValue: 0,
            };
            let lineModel: BarModel = {
                dataPoints: [],
                maxValue: 0,
            };
            let view, categories, barValues, lineValues;

            if (!dv
                || !dv[0]
                || !dv[0].categorical
                || !dv[0].categorical.categories
                || !dv[0].categorical.categories[0].source
                || !dv[0].categorical.values
                || !dv[0].metadata)
                return barModel;

            view = dv[0].categorical;
            categories = view.categories[0];
            barValues = view.values[0];
            lineValues = view.values[1];

            // Set barModel
            for (let i = 0, len = Math.max(categories.values.length, barValues.values.length); i < len; i++) {
                barModel.dataPoints.push({
                    category: <string>categories.values[i],
                    value: <number>barValues.values[i],
                });
            }
            barModel.maxValue = d3.max(barModel.dataPoints, d => d.value);
            this.barModel = barModel;

            // Set lineModel
            for (let i = 0, len = Math.max(categories.values.length, lineValues.values.length); i < len; i++) {
                lineModel.dataPoints.push({
                    category: <string>categories.values[i],
                    value: <number>lineValues.values[i],
                });
            }
            lineModel.maxValue = d3.max(lineModel.dataPoints, d => d.value);
            this.lineModel = lineModel;
        }

        public update(options: VisualUpdateOptions) {
            // console.log('Visual update', options);
            let width, height, xScale, xAxis, yScaleLeft, yAxisLeft, yScaleRight, yAxisRight, valueline, bars;

            // Set barModel, lineModel
            this.setViewModel(options);

            // svg width, height
            width = options.viewport.width;
            height = options.viewport.height;

            // x axis
            xScale = d3.scale.ordinal()
                .domain(this.barModel.dataPoints.map(d => d.category))
                .rangeRoundBands([this.settings.padding.left, width - this.settings.padding.right], this.barGap);
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickSize(1)
                .tickPadding(10);

            // y axis
            yScaleLeft = d3.scale.linear()
                .domain([0, this.barModel.maxValue])
                .range([height - this.settings.padding.bottom, this.settings.padding.top]);
            yAxisLeft = d3.svg.axis()
                .scale(yScaleLeft)
                .orient("left")
                .innerTickSize(5)
                .outerTickSize(1)
                .tickPadding(5);
            yScaleRight = d3.scale.linear()
                .domain([0, this.lineModel.maxValue])
                .range([height - this.settings.padding.bottom, this.settings.padding.top]);
            yAxisRight = d3.svg.axis()
                .scale(yScaleRight)
                .orient("right")
                .innerTickSize(5)
                .outerTickSize(1)
                .tickPadding(15);

            // Define the line
            valueline = d3.svg.line<any>()
                .x(d => xScale(d.category))
                .y(d => yScaleRight(d.value))
                .interpolate("cardinal");

            // Add svg width and height
            this.svg.attr({
                width: width,
                height: height
            });

            // Add x axis
            this.xAxisGroup
                .call(xAxis)
                .attr({
                    transform: `translate(0,${height - this.settings.padding.bottom})`
                })
                .style({
                    fill: "#777777"
                })
                .selectAll("text")
                .attr({
                    transform: "rotate(-35)"
                })
                .style({
                    "text-anchor": "end",
                    "font-size": "x-small"
                });

            // Add y axis
            this.yAxisGroupLeft
                .call(yAxisLeft)
                .attr({
                    transform: `translate(${this.settings.padding.left},0)`
                })
                .style({
                    fill: "#777777"
                })
                .selectAll("text")
                .style({
                    "text-anchor": "end",
                    "font-size": "x-small"
                });
            this.yAxisGroupRight
                .call(yAxisRight)
                .attr({
                    transform: `translate(${width - this.settings.padding.right},0)`
                })
                .style({
                    fill: "#777777"
                })
                .selectAll("text")
                .style({
                    "text-anchor": "end",
                    "font-size": "x-small"
                });

            // Add bars
            bars = this.barGroup
                .selectAll(".bar")
                .data(this.barModel.dataPoints);

            bars.enter()
                .append("rect")
                .classed("bar", true);

            bars.attr({
                width: xScale.rangeBand(),
                height: d => height - yScaleLeft(d.value) - this.settings.padding.bottom,
                y: d => yScaleLeft(d.value),
                x: d => xScale(d.category)
            }).style({
                fill: '#00c097',
            });

            bars.exit()
                .remove();

            // Remove old lines and add new one
            this.lineGroup
                .select(".line")
                .remove();
            this.lineGroup
                .append("path")
                .attr("class", "line")
                .attr({
                    transform: `translate(${xScale.rangeBand() / 2},0)`,
                    d: valueline(this.lineModel.dataPoints)
                });
        }

    }
}