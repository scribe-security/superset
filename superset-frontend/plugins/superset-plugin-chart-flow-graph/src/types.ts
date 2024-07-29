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
import {
  QueryFormData,
  supersetTheme,
  TimeseriesDataRecord,
} from '@superset-ui/core';

export interface SupersetPluginChartFlowGraphStylesProps {
  height: number;
  width: number;
  headerFontSize: keyof typeof supersetTheme.typography.sizes;
  boldText: boolean;
}

interface SupersetPluginChartFlowGraphCustomizeProps {
  headerText: string;
  nodeShapes: SymbolType[];
  nodeSizeW: number;
  nodeSizeH: number;
  textOffset: number;
  overflowText: number;
  nodeScaleRatio: number;
  collapseChildren: number;
  nodeColors: string[];
  edgeColors: string[];
  nodeNode: string;
  nodeNodeBetweenLayers: string;
  componentComponent: string;
  autoLayout: boolean;
  edgeSymbolStart: string;
  edgeSymbolEnd: string;
  edgeSizeStart: number;
  edgeSizeEnd: number;
  ttOffsetX: number;
  ttOffsetY: number;
  ttBackgroundColor: string;
  ttTextColor: string;
  ttAutoLink: boolean;
  draggableNodes: boolean;
}

export type SupersetPluginChartFlowGraphQueryFormData = QueryFormData &
  SupersetPluginChartFlowGraphStylesProps &
  SupersetPluginChartFlowGraphCustomizeProps;

export type SupersetPluginChartFlowGraphProps =
  SupersetPluginChartFlowGraphStylesProps &
    SupersetPluginChartFlowGraphCustomizeProps & {
      data: TimeseriesDataRecord[];
      // add typing here for the props you pass in from transformProps.ts!
    };

export type SupersetData = {
  idCol: string;
  parentIdCol: string;
  labelCol: string | undefined;
  colorCol: string | undefined;
  edgeLabelCol: string | undefined;
  edgeColorCol: string | undefined;
  tooltipCol: string | undefined;
  count: number;
};

export type RGBA = { r: number; g: number; b: number; a: number };

export type SymbolType =
  | 'circle'
  | 'rect'
  | 'roundRect'
  | 'triangle'
  | 'diamond'
  | 'pin'
  | 'arrow';
export type Node = {
  id: string;
  name: string;
  symbol: SymbolType;
  itemStyle: {
    color: string;
  };
  x?: number;
  y?: number;
  value?: string;
  label?: { formatter: string; rich?: { [styleName: string]: any } };
  tooltip?: { [key: string]: any };
  emphasis?: { [key: string]: any };
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  value: string;
  lineStyle: { color: string };
};
