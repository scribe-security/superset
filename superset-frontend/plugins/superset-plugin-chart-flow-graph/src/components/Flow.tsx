import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import {
  EChartsOption,
  ECElementEvent,
  ECharts,
  LegendComponentOption,
  TextCommonOption,
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

const elk = new ELK();
const useLayoutedElements = () => {
  const defaultOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': 300,
    'elk.spacing.nodeNode': 20,
    'elk.spacing.componentComponent': 80,
    'elk.partitioning.activate': true,
    'elk.separateConnectedComponents': false,
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
        if (children) {
          setNodes(children as Node[]);
        }
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
  const [selectedTypes, setSelectedTypes] = useState<{ [key: string]: boolean }>();
  const [chart, setChart] = useState<ECharts>();

  const { getLayoutedElements } = useLayoutedElements();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chart) {
      chart.resize();
      chart.dispatchAction({ type: 'restore' });
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

    const { nodes: initialNodes, edges: initialEdges } = buildCollapseNodes(tree);

    getLayoutedElements(
      {
        'elk.algorithm': 'layered',
        'elk.layered.spacing.nodeNodeBetweenLayers': props.nodeNodeBetweenLayers,
        'elk.spacing.nodeNode': props.nodeNode,
        'elk.spacing.componentComponent': props.componentComponent,
      },
      initialNodes,
      initialEdges,
      setNodes,
      { width: props.nodeSizeW, height: props.nodeSizeH },
    );

    setTree(tree);
    setLegendTree(tree);
    setEdges(initialEdges);
  }, [
    props.data,
    props.typeMapping,
    props.edgeColors,
    props.overflowText,
    props.ttAutoLink,
    getLayoutedElements,
    chart,
    props.nodeNodeBetweenLayers,
    props.nodeNode,
    props.componentComponent,
    props.nodeSizeW,
    props.nodeSizeH,
  ]);

  // Build a richer legend with the new code's approach
  const legend = useMemo(() => {
    const uniqueTypesWithColors: Record<string, string> = tree.reduce((acc, item) => {
      if (item.typeValue && !acc[item.typeValue]) {
        acc[item.typeValue] = item.color as string;
      }
      return acc;
    }, {} as Record<string, string>);

    const legendRichText: Record<string, TextCommonOption> = Object.fromEntries(
      Object.entries(uniqueTypesWithColors).map(([name]) => [
        name,
        { color: '#000000' },
      ])
    );

    const l: LegendComponentOption = {
      show: props.showLegend,
      type: props.legendType,
      [props.legendOrientation]: 0,
      textStyle: {
        rich: legendRichText,
      },
      formatter: (name) => `${name}`,
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
    tree,
  ]);

  // Handle node expansion on double-click (from old code)
  useEffect(() => {
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
          getLayoutedElements(
            {
              'elk.algorithm': 'layered',
              'elk.layered.spacing.nodeNodeBetweenLayers':
                props.nodeNodeBetweenLayers,
              'elk.spacing.nodeNode': props.nodeNode,
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
  }, [
    clickedNode,
    legendTree,
    nodes,
    edges,
    props.autoLayout,
    props.nodeNodeBetweenLayers,
    props.nodeNode,
    props.componentComponent,
    props.nodeSizeW,
    props.nodeSizeH,
    getLayoutedElements,
  ]);

  // Handle filtering by selected types (from old code)
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
  }, [
    selectedTypes,
    tree,
    getLayoutedElements,
    props.nodeNodeBetweenLayers,
    props.nodeNode,
    props.componentComponent,
    props.nodeSizeW,
    props.nodeSizeH,
  ]);

  // Double-click logic (from old code)
  const handleDoubleClick = (info: ECElementEvent, chart: ECharts) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      // Double click detected
      setClickedNode({ nodeId: (info.data as Node)?.id, chart });
    } else {
      // First click
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // Single click passed without second click
      }, 300);
    }
  };

  const option: EChartsOption = {
    tooltip: {
      enterable: true,
      show: false, // from old code (adjust if you want tooltips visible)
      textStyle: { color: props.ttTextColor },
      backgroundColor: props.ttBackgroundColor,
      position(point, params, dom, rect, size) {
        if (chart && params.data && (params as any).data.x && (params as any).data.y) {
          const coords = chart.convertToPixel({ seriesId: 'graph' }, [
            (params as any).data.x,
            (params as any).data.y,
          ]);
          if (coords) {
            return [coords[0] + props.ttOffsetX, coords[1] + props.ttOffsetY];
          }
        }
        return point;
      },
    },
    animationDurationUpdate: 1500,
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
        categories: tree.map(n => ({ name: n.typeValue, itemStyle: { color: n.color } })),
        edgeSymbol: [props.edgeSymbolStart, props.edgeSymbolEnd],
        edgeSymbolSize: [props.edgeSizeStart, props.edgeSizeEnd],
        nodeScaleRatio: props.nodeScaleRatio as 0.6,
        draggable: props.draggableNodes, // from old code to allow dragging
        data: nodes.map(node => ({
          ...node,
          itemStyle: { color: tree.find(t => t.id === node.id)?.color },
        })),
        links: edges.map(e => {
          const s = nodes.findIndex(n => n.id === e.source);
          const t = nodes.findIndex(n => n.id === e.target);
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
      },
    ],
  };

  return (
    <EChartsRenderer
      option={option}
      onNodeClick={handleDoubleClick} // allow double-click expansion
      onLegendClick={(info: any, chart: ECharts) => {
        setSelectedTypes(info.selected);
      }}
      setChart={setChart}
      settings={{ lazyUpdate: true }}
    />
  );
};

export default Flow;
