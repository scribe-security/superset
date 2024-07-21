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
import { t, validateInteger, validateNonEmpty } from "@superset-ui/core";
import {
  ControlPanelConfig,
  // sections,
  sharedControls,
} from "@superset-ui/chart-controls";
import { colorVisibility } from "../utils";

const DEFAULT_NODE_COLOR = { r: 100, g: 194, b: 245, a: 1 };

const config: ControlPanelConfig = {
  /**
   * The control panel is split into two tabs: "Query" and
   * "Chart Options". The controls that define the inputs to
   * the chart data request, such as columns and metrics, usually
   * reside within "Query", while controls that affect the visual
   * appearance or functionality of the chart are under the
   * "Chart Options" section.
   *
   * There are several predefined controls that can be used.
   * Some examples:
   * - groupby: columns to group by (translated to GROUP BY statement)
   * - series: same as groupby, but single selection.
   * - metrics: multiple metrics (translated to aggregate expression)
   * - metric: sane as metrics, but single selection
   * - adhoc_filters: filters (translated to WHERE or HAVING
   *   depending on filter type)
   * - row_limit: maximum number of rows (translated to LIMIT statement)
   *
   * If a control panel has both a `series` and `groupby` control, and
   * the user has chosen `col1` as the value for the `series` control,
   * and `col2` and `col3` as values for the `groupby` control,
   * the resulting query will contain three `groupby` columns. This is because
   * we considered `series` control a `groupby` query field and its value
   * will automatically append the `groupby` field when the query is generated.
   *
   * It is also possible to define custom controls by importing the
   * necessary dependencies and overriding the default parameters, which
   * can then be placed in the `controlSetRows` section
   * of the `Query` section instead of a predefined control.
   *
   * import { validateNonEmpty } from '@superset-ui/core';
   * import {
   *   sharedControls,
   *   ControlConfig,
   *   ControlPanelConfig,
   * } from '@superset-ui/chart-controls';
   *
   * const myControl: ControlConfig<'SelectControl'> = {
   *   name: 'secondary_entity',
   *   config: {
   *     ...sharedControls.entity,
   *     type: 'SelectControl',
   *     label: t('Secondary Entity'),
   *     mapStateToProps: state => ({
   *       sharedControls.columnChoices(state.datasource)
   *       .columns.filter(c => c.groupby)
   *     })
   *     validators: [validateNonEmpty],
   *   },
   * }
   *
   * In addition to the basic drop down control, there are several predefined
   * control types (can be set via the `type` property) that can be used. Some
   * commonly used examples:
   * - SelectControl: Dropdown to select single or multiple values,
       usually columns
   * - MetricsControl: Dropdown to select metrics, triggering a modal
       to define Metric details
   * - AdhocFilterControl: Control to choose filters
   * - CheckboxControl: A checkbox for choosing true/false values
   * - SliderControl: A slider with min/max values
   * - TextControl: Control for text data
   *
   * For more control input types, check out the `incubator-superset` repo
   * and open this file: superset-frontend/src/explore/components/controls/index.js
   *
   * To ensure all controls have been filled out correctly, the following
   * validators are provided
   * by the `@superset-ui/core/lib/validator`:
   * - validateNonEmpty: must have at least one value
   * - validateInteger: must be an integer value
   * - validateNumber: must be an integer or decimal value
   */

  // For control input types, see: superset-frontend/src/explore/components/controls/index.js
  controlPanelSections: [
    {
      label: t("Query"),
      expanded: true,
      controlSetRows: [
        [
          {
            name: "idCol",
            config: {
              ...sharedControls.entity,
              label: t("ID Column"),
              description: t("Column to use for id of each node"),
            },
          },
        ],
        [
          {
            name: "parentIdCol",
            config: {
              ...sharedControls.entity,
              label: t("Parent ID Column"),
              description: t("Column to use for parent id of each node"),
            },
          },
        ],
        [
          {
            name: "labelCol",
            config: {
              ...sharedControls.series,
              label: t("Node Label Column"),
              description: t(
                "Column to use for label of each node (defaults to ID column)"
              ),
            },
          },
        ],
        [
          {
            name: "colorCol",
            config: {
              ...sharedControls.series,
              label: t("Node Color Column"),
              description: t(
                "Column to use for choosing different node colors"
              ),
            },
          },
        ],
        ["adhoc_filters"],
        [
          {
            name: "row_limit",
            config: sharedControls.row_limit,
          },
        ],
      ],
    },
    {
      label: t("Header Controls"),
      expanded: true,
      controlSetRows: [
        [
          {
            name: "header_text",
            config: {
              type: "TextControl",
              default: "Flow Graph",
              renderTrigger: true,
              // ^ this makes it apply instantaneously, without triggering a "run query" button
              label: t("Header Text"),
              description: t("The text you want to see in the header"),
            },
          },
        ],
        [
          {
            name: "bold_text",
            config: {
              type: "CheckboxControl",
              label: t("Bold Text"),
              renderTrigger: true,
              default: true,
              description: t("A checkbox to make the header bold"),
            },
          },
        ],
        [
          {
            name: "header_font_size",
            config: {
              type: "SelectControl",
              label: t("Font Size"),
              default: "xl",
              choices: [
                // [value, label]
                ["xxs", "xx-small"],
                ["xs", "x-small"],
                ["s", "small"],
                ["m", "medium"],
                ["l", "large"],
                ["xl", "x-large"],
                ["xxl", "xx-large"],
              ],
              renderTrigger: true,
              description: t("The size of your header font"),
            },
          },
        ],
      ],
    },
    {
      label: t("Node Controls"),
      expanded: true,
      controlSetRows: [
        [
          {
            name: "nodeShape",
            config: {
              type: "SelectControl",
              label: t("Node Shape"),
              default: "roundRect",
              choices: [
                ["roundRect", "Rounded Rectangle"],
                ["rect", "Rectangle"],
                ["circle", "Circle"],
                ["triangle", "Triangle"],
                ["diamond", "Diamond"],
                ["pin", "Pin"],
                ["arrow", "Arrow"],
              ],
              renderTrigger: true,
              description: t("The shape of your nodes"),
            },
          },
        ],
        [
          {
            name: "nodeSizeW",
            config: {
              type: "SliderControl",
              label: t("Node Width"),
              default: 80,
              min: 5,
              max: 400,
              step: 5,
              renderTrigger: true,
              description: t("The width of your nodes"),
            },
          },
          {
            name: "nodeSizeH",
            config: {
              type: "SliderControl",
              label: t("Node Height"),
              default: 80,
              min: 5,
              max: 200,
              step: 5,
              renderTrigger: true,
              description: t("The height of your nodes"),
            },
          },
        ],
        [
          {
            name: "nodeScaleRatio",
            config: {
              type: "SliderControl",
              label: t("Node Scale Ratio"),
              default: 0,
              min: 0,
              max: 1,
              step: 0.1,
              renderTrigger: true,
              description: t(
                "The related zooming ratio of nodes when mouse zooming in or out"
              ),
            },
          },
        ],
        [
          {
            name: "color1",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 1",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              description: t(
                "Run query with Node Color Column populated in order to choose different colors"
              ),
            },
          },
          {
            name: "color2",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 2",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 2);
              },
            },
          },
          {
            name: "color3",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 3",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 3);
              },
            },
          },
          {
            name: "color4",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 4",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 4);
              },
            },
          },
        ],
        [
          {
            name: "color5",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 5",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 5);
              },
            },
          },
          {
            name: "color6",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 6",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 6);
              },
            },
          },
          {
            name: "color7",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 7",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 7);
              },
            },
          },
          {
            name: "color8",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 8",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 8);
              },
            },
          },
        ],
        [
          {
            name: "color9",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 9",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 9);
              },
            },
          },
          {
            name: "color10",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 10",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 10);
              },
            },
          },
          {
            name: "color11",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 11",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 11);
              },
            },
          },
          {
            name: "color12",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 12",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 12);
              },
            },
          },
        ],
        [
          {
            name: "color13",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 13",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 13);
              },
            },
          },
          {
            name: "color14",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 14",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 14);
              },
            },
          },
          {
            name: "color15",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 15",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 15);
              },
            },
          },
          {
            name: "color16",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 16",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 16);
              },
            },
          },
        ],
        [
          {
            name: "color17",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 17",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 17);
              },
            },
          },
          {
            name: "color18",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 18",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 18);
              },
            },
          },
          {
            name: "color19",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 19",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 19);
              },
            },
          },
          {
            name: "color20",
            config: {
              type: "ColorPickerControl",
              label: "Color Group 20",
              renderTrigger: true,
              default: DEFAULT_NODE_COLOR,
              visibility: (controls: any) => {
                return colorVisibility(controls, 20);
              },
            },
          },
        ],
      ],
    },
    {
      label: t("Graph Function Controls"),
      expanded: true,
      tabOverride: "customize",
      controlSetRows: [
        [
          {
            name: "collapseChildren",
            config: {
              type: "SliderControl",
              label: t("Collapse Children Number"),
              min: 1,
              max: 5,
              default: 3,
              description: t(
                "Number of children a node must have for the graph to begin with the children collapsed"
              ),
            },
          },
        ],

        [
          {
            name: "nodeNode",
            config: {
              type: "TextControl",
              label: t("Spacing: Node-Node"),
              default: "80",
              description: t("ELK.js node-node spacing setting"),
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: "nodeNodeBetweenLayers",
            config: {
              type: "TextControl",
              label: t("Node-Node Between Layers"),
              default: "80",
              description: t("ELK.js node-node between layers spacing setting"),
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: "componentComponent",
            config: {
              type: "TextControl",
              label: t("Component-Component"),
              default: "80",
              description: t("ELK.js component-component spacing setting"),
              validators: [validateInteger, validateNonEmpty],
            },
          },
        ],
        [
          {
            name: "autoLayout",
            config: {
              type: "CheckboxControl",
              label: t("Auto Layout on Collapse"),
              default: true,
              renderTrigger: true,
              description: t(
                "Automatically run the layout algorithm after collapsing"
              ),
            },
          },
        ],
      ],
    },
  ],
};

export default config;
