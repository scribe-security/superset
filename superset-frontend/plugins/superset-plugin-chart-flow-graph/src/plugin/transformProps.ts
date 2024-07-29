/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ChartProps, TimeseriesDataRecord } from '@superset-ui/core';
import { RGBAToHexA } from '../utils';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_TOOLTIP_BG_COLOR,
  DEFAULT_TOOLTIP_TEXT_COLOR,
} from './controlPanel';

export default function transformProps(chartProps: ChartProps) {
  /**
   * This function is called after a successful response has been
   * received from the chart data endpoint, and is used to transform
   * the incoming data prior to being sent to the Visualization.
   *
   * The transformProps function is also quite useful to return
   * additional/modified props to your data viz component. The formData
   * can also be accessed from your SupersetPluginChartFlowGraph.tsx file, but
   * doing supplying custom props here is often handy for integrating third
   * party libraries that rely on specific props.
   *
   * A description of properties in `chartProps`:
   * - `height`, `width`: the height/width of the DOM element in which
   *   the chart is located
   * - `formData`: the chart data request payload that was sent to the
   *   backend.
   * - `queriesData`: the chart data response payload that was received
   *   from the backend. Some notable properties of `queriesData`:
   *   - `data`: an array with data, each row with an object mapping
   *     the column/alias to its value. Example:
   *     `[{ col1: 'abc', metric1: 10 }, { col1: 'xyz', metric1: 20 }]`
   *   - `rowcount`: the number of rows in `data`
   *   - `query`: the query that was issued.
   *
   * Please note: the transformProps function gets cached when the
   * application loads. When making changes to the `transformProps`
   * function during development with hot reloading, changes won't
   * be seen until restarting the development server.
   */
  const { width, height, formData, queriesData } = chartProps;
  const { boldText, headerFontSize, headerText } = formData;
  const data = queriesData[0].data as TimeseriesDataRecord[];

  const {
    idCol,
    parentIdCol,
    labelCol,
    colorCol,
    edgeColorCol,
    edgeLabelCol,
    tooltipCol,
    nodeSizeW,
    nodeSizeH,
    textOffset,
    overflowText,
    nodeScaleRatio,
    collapseChildren,
    nodeNode,
    nodeNodeBetweenLayers,
    componentComponent,
    autoLayout,
    edgeSymbolStart,
    edgeSymbolEnd,
    edgeSizeStart,
    edgeSizeEnd,
    ttOffsetX,
    ttOffsetY,
    ttBackgroundColor,
    ttTextColor,
    ttAutoLink,
    draggableNodes,
  } = formData;

  const transformedData = data.map(d => ({
    idCol: d[idCol],
    parentIdCol: d[parentIdCol],
    labelCol: d[labelCol],
    colorCol: d[colorCol],
    edgeColorCol: d[edgeColorCol],
    edgeLabelCol: d[edgeLabelCol],
    tooltipCol: d[tooltipCol],
    count: d.count,
  }));

  const nodeColors = Object.entries(formData)
    .filter(([k, _]) => k.startsWith('color') && k !== 'colorCol')
    .map(([_, v]) => {
      if (typeof v === 'string') return v;
      else return RGBAToHexA(v, RGBAToHexA(DEFAULT_NODE_COLOR));
    });

  const edgeColors = Object.entries(formData)
    .filter(([k, _]) => k.startsWith('edgeColor') && k !== 'edgeColorCol')
    .map(([_, v]) => {
      if (typeof v === 'string') return v;
      else return RGBAToHexA(v, RGBAToHexA(DEFAULT_EDGE_COLOR));
    });

  const nodeShapes = Object.entries(formData)
    .filter(([k, _]) => k.startsWith('shape'))
    .map(([_, v]) => v);

  let fixedScaleRatio = nodeScaleRatio;
  if (nodeScaleRatio === undefined) {
    fixedScaleRatio = 0;
  }

  return {
    width,
    height,
    data: transformedData,
    // and now your control data, manipulated as needed, and passed through as props!
    boldText,
    headerFontSize,
    headerText,
    nodeColors,
    nodeShapes,
    nodeSizeW: Number(nodeSizeW),
    nodeSizeH: Number(nodeSizeH),
    textOffset: Number(textOffset),
    overflowText: Number(overflowText),
    nodeScaleRatio: fixedScaleRatio,
    collapseChildren,
    nodeNode,
    nodeNodeBetweenLayers,
    componentComponent,
    autoLayout,
    edgeSymbolStart,
    edgeSymbolEnd,
    edgeSizeStart,
    edgeSizeEnd,
    edgeColors,
    ttOffsetX: Number(ttOffsetX),
    ttOffsetY: Number(ttOffsetY),
    ttBackgroundColor: RGBAToHexA(
      ttBackgroundColor,
      RGBAToHexA(DEFAULT_TOOLTIP_BG_COLOR),
    ),
    ttTextColor: RGBAToHexA(
      ttTextColor,
      RGBAToHexA(DEFAULT_TOOLTIP_TEXT_COLOR),
    ),
    ttAutoLink,
    draggableNodes,
  };
}
