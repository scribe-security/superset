# superset-plugin-chart-flow-graph

This is the Superset Plugin Chart Flow Graph Superset Chart Plugin.

### Usage

To build the plugin, run the following commands:

```
npm ci
npm run build
```

Alternatively, to run the plugin in development mode (=rebuilding whenever changes are made), start the dev server with the following command:

```
npm run dev
```

To add the package to Superset, go to the `superset-frontend` subdirectory in your Superset source folder (assuming both the `superset-plugin-chart-flow-graph` plugin and `superset` repos are in the same root directory) and run

```
npm i -S ../../superset-plugin-chart-flow-graph
```

If your Superset plugin exists in the `superset-frontend` directory and you wish to resolve TypeScript errors about `@superset-ui/core` not being resolved correctly, add the following to your `tsconfig.json` file:

```
"references": [
  {
    "path": "../../packages/superset-ui-chart-controls"
  },
  {
    "path": "../../packages/superset-ui-core"
  }
]
```

You may also wish to add the following to the `include` array in `tsconfig.json` to make Superset types available to your plugin:

```
"../../types/**/*"
```

Finally, if you wish to ensure your plugin `tsconfig.json` is aligned with the root Superset project, you may add the following to your `tsconfig.json` file:

```
"extends": "../../tsconfig.json",
```

After this edit the `superset-frontend/src/visualizations/presets/MainPreset.js` and make the following changes:

```js
import { SupersetPluginChartFlowGraph } from 'superset-plugin-chart-flow-graph';
```

to import the plugin and later add the following to the array that's passed to the `plugins` property:

```js
new SupersetPluginChartFlowGraph().configure({ key: 'superset-plugin-chart-flow-graph' }),
```

After that the plugin should show up when you run Superset, e.g. the development server:

```
npm run dev-server
```

### How this plugin works from a development standpoint:

The plugin starts in `plugins/controlPanel.ts` where we defined the objects that represent each setting in the control panel. Every option needs to have `renderTrigger: true` if you want that section to appear in the **CUSTOMIZE** section, which will in turn rerender the component on every change.

Afterwards, the SQL query is built and can be modified in `plugins/buildQuery.ts`, which you will need to edit if you are adding another column to the control panel. The rest of the props pass through the function defiend in `plugins/transformProps.ts`, which you will need to edit if you are adding any other setting to the control panel.

Now, the props (data and customization settings) pass through `index.ts` and `SupersetPluginChartFlowGraph.tsx` to `components/Flow.tsx`. Our flow component handles the main logic for the plugin. It does the following:

- Builds a tree object, which acts as the source of truth for the graph, using the data and customization options.
- Creates node and edge objects from the tree object.
- Uses ELK.js, a layout library, to determine the positions of the nodes. We currently use the `layered` algorithm and specify options to get the appropriate visuals. The ELK reference can be found [here](https://eclipse.dev/elk/reference.html). Go to the ELK Layered algorithm to find the Supported Options that you can manipulate.
- Builds the ECharts option object that is passed to `components/EChartsRenderer.tsx` to actually render the graph. The EChartsRenderer component renders the graph using the ECharts library and attaches event handlers too. The ECharts option documentation can be found [here](https://echarts.apache.org/en/option.html#series-graph). Most of the options you want to set are found in series.graph.

Key things to note:

- The `legendTree` state is set when clicking on legend objects in order to filter out these node types without changing the `tree` state. This legend state is then used for handing node clicks (expanding/collapsing subgraphs)
- Most of the logic for creating the graph structure can be found in `utils.tsx`
