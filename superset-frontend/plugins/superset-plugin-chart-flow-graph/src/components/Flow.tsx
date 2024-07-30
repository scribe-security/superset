import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import {
  EChartsOption,
  ECElementEvent,
  ECharts,
  LegendComponentOption,
} from 'echarts';
import {
  buildCollapseNodes,
  buildTree,
  filterZeros,
  nodeClick,
} from '../utils';

import EChartsRenderer from './EChartsRenderer';
import {
  Edge,
  Node,
  NodeTreeType,
  SupersetData,
  SupersetPluginChartFlowGraphProps,
} from '../types';

// ELK layout logic
const elk = new ELK();
const useLayoutedElements = () => {
  const defaultOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': 80,
    'elk.spacing.nodeNode': 80,
    // "elk.separateConnectedComponents": false,
    'elk.spacing.componentComponent': 80,
    'elk.partitioning.activate': true,
    'elk.separateConnectedComponents': false,
    // 'elk.interactiveLayout': true,
    // 'elk.layered.generatePositionAndLayerIds': true,
  };
  const getLayoutedElements = useCallback(
    (
      options: any,
      nodes: Node[],
      edges: Edge[],
      setNodes: Dispatch<SetStateAction<Node[]>>,
      nodeSize: { width: number; height: number },
    ) => {
      const layoutOptions = { ...defaultOptions, ...options };

      const graph = {
        id: 'root',
        layoutOptions,
        children: nodes.map((c: Node) => ({
          ...c,
          width: nodeSize.width,
          height: nodeSize.height,
        })),
        edges: edges.map((e: Edge) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      elk.layout(graph).then(({ children }) => {
        // By mutating the children in-place we saves ourselves from creating a
        // needless copy of the nodes array.
        // const nextNodes = elkToFlow(children);
        if (children) {
          // children.forEach((node: any) => {
          //   // node.position = { x: node.x, y: node.y };
          //   // node.style = { width: node.width, height: node.height };
          //   delete node.width;
          //   delete node.height;
          // });

          setNodes(children as Node[]);
        }

        // setNodes(nextNodes)

        // window.requestAnimationFrame(() => {
        //   fitView();
        // });
      });
    },
    [],
  );

  return { getLayoutedElements };
};

const Flow = (props: SupersetPluginChartFlowGraphProps) => {
  const [tree, setTree] = useState<NodeTreeType[]>([]);
  const [legendTree, setLegendTree] = useState<NodeTreeType[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [clickedNode, setClickedNode] = useState<{
    nodeId: string;
    chart: ECharts;
  }>();
  const [selectedTypes, setSelectedTypes] =
    useState<{ [key: string]: boolean }>();
  const [chart, setChart] = useState<ECharts>();

  const { getLayoutedElements } = useLayoutedElements();

  useEffect(() => {
    /** On initial render (and when certain settings require rebuilding tree),
     * build tree from data, use tree to make nodes/edges, and pass through ELK
     */
    if (chart) {
      chart?.resize();
      chart?.dispatchAction({ type: 'restore' });
    }

    let { tree } = buildTree(
      props.data as unknown as SupersetData[],
      props.typeMapping,
      props.edgeColors,
      props.collapseChildren,
      props.overflowText,
      props.ttAutoLink,
    );
    tree = filterZeros(tree);

    const { nodes, edges } = buildCollapseNodes(tree);

    getLayoutedElements(
      {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers':
          props.nodeNodeBetweenLayers,
        'elk.spacing.nodeNode': props.nodeNode,
        // "elk.separateConnectedComponents": false,
        'elk.spacing.componentComponent': props.componentComponent,
      },
      nodes,
      edges,
      setNodes,
      { width: props.nodeSizeW, height: props.nodeSizeH },
    );
    setTree(tree);
    setLegendTree(tree);
    setEdges(edges);
  }, [
    props.data,
    props.typeMapping,
    props.edgeColors,
    props.overflowText,
    props.ttAutoLink,
  ]);

  const legend = useMemo(() => {
    const l: LegendComponentOption = {
      show: props.showLegend,
      type: props.legendType,
      [props.legendOrientation]: 0,
    };

    if (props.legendOrientation === 'top') {
      l.orient = 'horizontal';
      l.padding = [props.legendMargin, 0, 0, 0];
    } else if (props.legendOrientation === 'bottom') {
      l.orient = 'horizontal';
      l.padding = [0, 0, props.legendMargin, 0];
    } else if (props.legendOrientation === 'left') {
      l.orient = 'vertical';
      l.padding = [0, 0, 0, props.legendMargin];
    } else {
      l.orient = 'vertical';
      l.padding = [0, props.legendMargin, 0, 0];
    }

    return l;
  }, [
    props.showLegend,
    props.legendMargin,
    props.legendOrientation,
    props.legendType,
  ]);

  useEffect(() => {
    /** When node is clicked, expand or collapse subgraphs */
    if (clickedNode) {
      const res = nodeClick(legendTree, nodes, edges, clickedNode.nodeId);
      if (
        res &&
        (nodes.length !== res.nodes.length || edges.length !== res.edges.length)
      ) {
        setClickedNode(undefined);
        if (
          props.autoLayout ||
          res.nodes.length > nodes.length ||
          res.edges.length > edges.length
        ) {
          const updatedResNodes = res.nodes.map(n => {
            const oldNode = nodes.find(o => o.id === n.id);
            if (oldNode) return { ...n, x: oldNode.x, y: oldNode.y };
            return n;
          });
          // clickedNode.chart.dispatchAction({ type: 'restore' });
          getLayoutedElements(
            {
              'elk.algorithm': 'layered',
              'elk.layered.spacing.nodeNodeBetweenLayers':
                props.nodeNodeBetweenLayers,
              'elk.spacing.nodeNode': props.nodeNode,
              // "elk.separateConnectedComponents": false,
              'elk.layered.crossingMinimization.forceNodeModelOrder': true,
              'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
              'elk.spacing.componentComponent': props.componentComponent,
            },
            updatedResNodes,
            res.edges,
            setNodes,
            { width: props.nodeSizeW, height: props.nodeSizeH },
          );
        } else {
          setNodes(res.nodes);
        }

        setEdges(res.edges);
        setLegendTree(res.tree);
      }
    }
  }, [clickedNode]);

  useEffect(() => {
    if (selectedTypes) {
      const newTree = filterZeros(
        tree.map(t => {
          if (t.typeValue && !selectedTypes[t.typeValue])
            return { ...t, layerId: 0 };
          return { ...t };
        }),
      );
      setLegendTree(newTree);

      const { nodes: newNodes, edges: newEdges } = buildCollapseNodes(newTree);

      getLayoutedElements(
        {
          'elk.algorithm': 'layered',
          'elk.layered.spacing.nodeNodeBetweenLayers':
            props.nodeNodeBetweenLayers,
          'elk.spacing.nodeNode': props.nodeNode,
          // "elk.separateConnectedComponents": false,
          'elk.layered.crossingMinimization.forceNodeModelOrder': true,
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'elk.spacing.componentComponent': props.componentComponent,
        },
        newNodes,
        newEdges,
        setNodes,
        { width: props.nodeSizeW, height: props.nodeSizeH },
      );
      setEdges(newEdges);
    }
  }, [selectedTypes]);

  /** Master ECharts configuration option object */
  const option: EChartsOption = {
    tooltip: { enterable: true },
    animationDurationUpdate: 1500,
    // animationEasingUpdate: "quinticInOut",
    legend,
    series: [
      {
        id: 'graph',
        type: 'graph',
        name: 'Lineage Graph',
        symbolSize: [props.nodeSizeW, props.nodeSizeH],
        roam: true,
        label: {
          show: true,
          align: 'left',
          offset: [props.textOffset, 0],
          rich: {
            name: {
              fontWeight: 'bold',
            },
          },
        },
        // emphasis: {
        //   focus: 'adjacency',
        // },
        categories: tree
          .map(n => n.typeValue)
          .filter((val, idx, arr) => arr.indexOf(val) === idx)
          .map(n => ({ name: n })),
        edgeSymbol: [props.edgeSymbolStart, props.edgeSymbolEnd],
        edgeSymbolSize: [props.edgeSizeStart, props.edgeSizeEnd],
        nodeScaleRatio: props.nodeScaleRatio as 0.6,
        draggable: props.draggableNodes,
        data: nodes, // .map((n: any) => ({ ...n, symbolSize: n.width })),
        links: edges.map((e: any) => {
          const s = nodes.findIndex((n: Node) => n.id === e.source);
          const t = nodes.findIndex((n: Node) => n.id === e.target);
          return {
            source: s,
            target: t,
            value: e.value,
            lineStyle: e.lineStyle,
          };
        }),
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0,
        },
        edgeLabel: {
          show: true,
          formatter: '{c}',
        },
        tooltip: {
          show: false,
          textStyle: { color: props.ttTextColor },
          backgroundColor: props.ttBackgroundColor,
          position(point, params, dom, rect, size) {
            const coords = chart?.convertToPixel({ seriesId: 'graph' }, [
              (params as any).data.x,
              (params as any).data.y,
            ]);
            if (coords) {
              return [coords[0] + props.ttOffsetX, coords[1] + props.ttOffsetY];
            }
            return point;
          },
        },
        center: undefined,
      },
    ],
  };

  return (
    <>
      <EChartsRenderer
        option={option}
        onNodeClick={(info: ECElementEvent, chart: ECharts) => {
          setClickedNode({ nodeId: (info.data as Node)?.id, chart });
        }}
        onLegendClick={(info: any, chart: ECharts) => {
          setSelectedTypes(info.selected);
        }}
        setChart={setChart}
        settings={{ lazyUpdate: true }}
      />
    </>
  );
};

export default Flow;
