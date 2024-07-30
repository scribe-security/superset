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
import { t, validateInteger, validateNonEmpty } from '@superset-ui/core';
import {
  ControlPanelConfig,
  ControlStateMapping,
  // sections,
  sharedControls,
} from '@superset-ui/chart-controls';
import { generateNumeratedControls } from '../utils';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_TOOLTIP_BG_COLOR,
  DEFAULT_TOOLTIP_TEXT_COLOR,
  EDGE_SYMBOL_CHOICES,
} from '../constants';

const nodeTypes = generateNumeratedControls(
  [
    {
      name: 'type',
      config: {
        type: 'TextControl',
        label: t('Type'),
        renderTrigger: true,
        description: t(
          'Write in a type from Node Type Column (case-insensitive) or * to configure all unspecified types',
        ),
      },
    },
    {
      name: 'color',
      config: {
        type: 'ColorPickerControl',
        label: t('Color'),
        renderTrigger: true,
        default: DEFAULT_NODE_COLOR,
        description: t('Choose a node color for the specified type'),
      },
    },
    {
      name: 'shape',
      config: {
        type: 'SelectControl',
        label: t('Shape'),
        default: 'rect',
        choices: [
          ['rect', t('Rectangle')],
          ['roundRect', t('Rounded Rectangle')],
          ['circle', t('Circle')],
          ['triangle', t('Triangle')],
          ['diamond', t('Diamond')],
          ['pin', t('Pin')],
          ['arrow', t('Arrow')],
          ['other', t('Other')],
        ],
        renderTrigger: true,
        description: t('Choose a node shape for the specified type'),
      },
    },
    {
      name: 'layer',
      config: {
        type: 'TextControl',
        label: t('Column'),
        renderTrigger: true,
        description: t(
          'Node types with a lower column number appear to the left of node types with a higher column number. Enter 0 for this column type to not appear at all (parents of this node type will connect to children of this node type)',
        ),
      },
    },
  ],
  'colorCol',
  {
    name: 'shapeOther',
    config: {
      type: 'TextControl',
      label: t('Shape Image'),
      renderTrigger: true,
      description: t(
        'Image URL eg. "image://http://example.website/a/b.png" or dataURI eg. "image://data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7"',
      ),
    },
  },
);

const edgeColors = generateNumeratedControls(
  [
    {
      name: 'edgeType',
      config: {
        type: 'TextControl',
        label: t('Type'),
        renderTrigger: true,
        description: t(
          'Write in a type from Edge Color Column (case-insensitive) or * to configure all unspecified types',
        ),
      },
    },
    {
      name: 'edgeColor',
      config: {
        type: 'ColorPickerControl',
        label: t('Color'),
        renderTrigger: true,
        default: DEFAULT_EDGE_COLOR,
        description: t('Choose an edge color for the specified type'),
      },
    },
  ],
  'edgeColorCol',
);

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
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'idCol',
            config: {
              ...sharedControls.entity,
              label: t('ID Column'),
              description: t('Column to use for id of each node'),
            },
          },
        ],
        [
          {
            name: 'parentIdCol',
            config: {
              ...sharedControls.entity,
              label: t('Parent ID Column'),
              description: t('Column to use for parent id of each node'),
            },
          },
        ],
        [
          {
            name: 'labelCol',
            config: {
              ...sharedControls.series,
              label: t('Node Label Column'),
              description: t(
                'Column to use for label of each node (defaults to ID column)',
              ),
            },
          },
        ],
        [
          {
            name: 'colorCol',
            config: {
              ...sharedControls.series,
              label: t('Node Type Column'),
              description: t('Column to use for choosing different node types'),
            },
          },
        ],
        [
          {
            name: 'edgeLabelCol',
            config: {
              ...sharedControls.series,
              label: t('Edge Label Column'),
              description: t(
                'Column to use for label of the edge to each child',
              ),
            },
          },
        ],
        [
          {
            name: 'edgeColorCol',
            config: {
              ...sharedControls.series,
              label: t('Edge Color Column'),
              description: t(
                'Column to use for choosing different edge colors',
              ),
            },
          },
        ],
        [
          {
            name: 'tooltipCol',
            config: {
              ...sharedControls.series,
              label: t('Tooltip Column'),
              description: t(
                'Column to use for displaying text in node tooltip (tooltips are able to render html)',
              ),
            },
          },
        ],
        ['adhoc_filters'],
        [
          {
            name: 'row_limit',
            config: sharedControls.row_limit,
          },
        ],
      ],
    },
    {
      label: t('Node Controls'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'overflowText',
            config: {
              type: 'TextControl',
              label: t('Truncate Label'),
              default: 12,
              renderTrigger: true,
              description: t('Ellipsis after # chars'),
            },
          },
          {
            name: 'textOffset',
            config: {
              type: 'TextControl',
              label: t('Text Offset'),
              default: -45,
              renderTrigger: true,
              description: t('The offset value of the text inside the node'),
              validators: [validateInteger, validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'nodeSizeW',
            config: {
              type: 'TextControl',
              label: t('Node Width'),
              default: 120,
              renderTrigger: true,
              description: t('The width of your nodes'),
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: 'nodeSizeH',
            config: {
              type: 'TextControl',
              label: t('Node Height'),
              default: 60,
              renderTrigger: true,
              description: t('The height of your nodes'),
              validators: [validateInteger, validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'nodeScaleRatio',
            config: {
              type: 'SliderControl',
              label: t('Node Scale Ratio'),
              default: 0,
              min: 0,
              max: 1,
              step: 0.1,
              renderTrigger: true,
              description: t(
                'The related zooming ratio of nodes when mouse zooming in or out',
              ),
            },
          },
        ],

        ...nodeTypes,
        // ...nodeShapes,
        // ...nodeColors,
      ],
    },
    {
      label: t('Edge Controls'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'edgeSymbolStart',
            config: {
              type: 'SelectControl',
              label: t('Start Edge Shape'),
              default: 'circle',
              choices: EDGE_SYMBOL_CHOICES,
              renderTrigger: true,
              description: t('The shape at the start of the edge'),
            },
          },
          {
            name: 'edgeSymbolEnd',
            config: {
              type: 'SelectControl',
              label: t('End Edge Shape'),
              default: 'arrow',
              choices: EDGE_SYMBOL_CHOICES,
              renderTrigger: true,
              description: t('The shape at the end of the edge'),
            },
          },
        ],
        [
          {
            name: 'edgeSizeStart',
            config: {
              type: 'SliderControl',
              label: t('Edge Start Shape Size'),
              default: 4,
              min: 1,
              max: 20,
              renderTrigger: true,
              description: t("The size of the edge's start shape"),
            },
          },
          {
            name: 'edgeSizeEnd',
            config: {
              type: 'SliderControl',
              label: t('Edge End Shape Size'),
              default: 10,
              min: 1,
              max: 20,
              renderTrigger: true,
              description: t("The size of the edge's start end"),
            },
          },
        ],
        ...edgeColors,
      ],
    },
    {
      label: t('Tooltip Controls'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'ttOffsetX',
            config: {
              type: 'TextControl',
              label: t('Tooltip Position Offset X'),
              default: '-100',
              description: t(
                'The x-coordinate offset of the tooltip from the default position',
              ),
              renderTrigger: true,
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: 'ttOffsetY',
            config: {
              type: 'TextControl',
              label: t('Tooltip Position Offset Y'),
              default: '25',
              description: t(
                'The y-coordinate offset of the tooltip from the default position',
              ),
              renderTrigger: true,
              validators: [validateInteger, validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'ttBackgroundColor',
            config: {
              type: t('ColorPickerControl'),
              label: t('Tooltip Color'),
              renderTrigger: true,
              default: DEFAULT_TOOLTIP_BG_COLOR,
              description: t('The color of the tooltip'),
            },
          },
          {
            name: 'ttTextColor',
            config: {
              type: t('ColorPickerControl'),
              label: t('Tooltip Text Color'),
              renderTrigger: true,
              default: DEFAULT_TOOLTIP_TEXT_COLOR,
              description: t('The color of the text in the tooltip'),
            },
          },
        ],
        [
          {
            name: 'ttAutoLink',
            config: {
              type: 'CheckboxControl',
              label: t('Auto Link'),
              renderTrigger: true,
              default: true,
              description: t(
                'Automatically convert links in the tooltip text into actual html links',
              ),
            },
          },
        ],
      ],
    },
    {
      label: t('Graph Function Controls'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'collapseChildren',
            config: {
              type: 'SliderControl',
              label: t('Collapse Children Number'),
              min: 1,
              max: 5,
              default: 3,
              renderTrigger: true,
              description: t(
                'Max number of children a node can have for its children to begin expanded',
              ),
            },
          },
        ],

        [
          {
            name: 'nodeNode',
            config: {
              type: 'TextControl',
              label: t('Spacing: Node-Node'),
              default: '80',
              description: t('ELK.js node-node spacing setting'),
              renderTrigger: true,
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: 'nodeNodeBetweenLayers',
            config: {
              type: 'TextControl',
              label: t('Node-Node Between Layers'),
              default: '80',
              description: t('ELK.js node-node between layers spacing setting'),
              renderTrigger: true,
              validators: [validateInteger, validateNonEmpty],
            },
          },
          {
            name: 'componentComponent',
            config: {
              type: 'TextControl',
              label: t('Component-Component'),
              default: '80',
              description: t('ELK.js component-component spacing setting'),
              renderTrigger: true,
              validators: [validateInteger, validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'autoLayout',
            config: {
              type: 'CheckboxControl',
              label: t('Auto Layout on Collapse'),
              default: true,
              renderTrigger: true,
              description: t(
                'Automatically run the layout algorithm after collapsing',
              ),
            },
          },
          {
            name: 'draggableNodes',
            config: {
              type: 'CheckboxControl',
              label: t('Draggable Nodes'),
              default: true,
              renderTrigger: true,
              description: t('Allow user to drag nodes'),
            },
          },
        ],
        [
          {
            name: 'showLegend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              renderTrigger: true,
              default: true,
              description: t('Whether to display a legend for the chart'),
            },
          },
        ],

        [
          {
            name: 'legendMargin',
            config: {
              type: 'TextControl',
              label: t('Margin'),
              renderTrigger: true,
              default: '50',
              description: t('Additional padding for legend.'),
              visibility: (controls: ControlStateMapping) =>
                Boolean(controls.form_data?.showLegend),
            },
          },
        ],

        [
          {
            name: 'legendType',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Type'),
              choices: [
                ['scroll', t('Scroll')],
                ['plain', t('Plain')],
              ],
              default: 'scroll',
              renderTrigger: true,
              description: t('Legend type'),
              visibility: (controls: ControlStateMapping) =>
                Boolean(controls.form_data?.showLegend),
            },
          },
        ],
        [
          {
            name: 'legendOrientation',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Orientation'),
              choices: [
                ['top', t('Top')],
                ['bottom', t('Bottom')],
                ['left', t('Left')],
                ['right', t('Right')],
              ],
              default: 'top',
              renderTrigger: true,
              description: t('Legend Orientation'),
              visibility: (controls: ControlStateMapping) =>
                Boolean(controls.form_data?.showLegend),
            },
          },
        ],
      ],
    },
  ],
};

export default config;
