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
} from "@superset-ui/core";

export interface SupersetPluginChartFlowGraphStylesProps {
  height: number;
  width: number;
  headerFontSize: keyof typeof supersetTheme.typography.sizes;
  boldText: boolean;
}

interface SupersetPluginChartFlowGraphCustomizeProps {
  headerText: string;
  nodeShape: SymbolType;
  nodeSizeW: number;
  nodeSizeH: number;
  nodeScaleRatio: number;
  collapseChildren: number;
  nodeColors: RBGA[];
  nodeNode: string;
  nodeNodeBetweenLayers: string;
  componentComponent: string;
  autoLayout: boolean;
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
  count: number;
};

export type RBGA = { r: number; g: number; b: number; a: number };

export type SymbolType =
  | "circle"
  | "rect"
  | "roundRect"
  | "triangle"
  | "diamond"
  | "pin"
  | "arrow";
export type Node = {
  id: string;
  name: string;
  symbol: SymbolType;
  itemStyle: {
    color: string;
  };
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
};
