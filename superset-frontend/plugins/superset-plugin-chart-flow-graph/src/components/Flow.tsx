import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { EChartsOption, ECElementEvent, ECharts } from 'echarts';
import {
  buildCollapseNodes,
  buildTree,
  nodeClick,
  NodeTreeType,
} from '../utils';

import EChartsRenderer from './EChartsRenderer';
import {
  Edge,
  Node,
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
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [clickedNode, setClickedNode] = useState<{
    nodeId: string;
    chart: any;
  }>();
  const [chart, setChart] = useState<ECharts>();

  const { getLayoutedElements } = useLayoutedElements();

  useEffect(() => {
    if (chart) {
      chart?.resize();
      chart?.dispatchAction({ type: 'restore' });
    }

    const { tree } = buildTree(
      props.data as unknown as SupersetData[],
      props.nodeColors,
      props.edgeColors,
      props.nodeShapes,
      props.collapseChildren,
      props.overflowText,
      props.ttAutoLink,
    );
    const { nodes, edges } = buildCollapseNodes(tree);
    // console.log(nodes, edges);
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
    // console.log(tree);
    setTree(tree);
    // setNodes(nodes);
    setEdges(edges);
    // setTimeout(() => {
    //   getLayoutedElements({}, nodes, edges, setNodes);
    // }, 1000);
  }, [
    props.data,
    props.nodeColors,
    props.nodeShapes,
    props.edgeColors,
    props.overflowText,
    props.ttAutoLink,
  ]);

  useEffect(() => {
    if (clickedNode) {
      const res = nodeClick(tree, nodes, edges, clickedNode.nodeId);
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
        setTree(res.tree);
      }
    }
  }, [clickedNode]);
  const option: EChartsOption = {
    tooltip: { enterable: true },
    animationDurationUpdate: 1500,
    // animationEasingUpdate: "quinticInOut",
    series: [
      {
        id: 'graph',
        type: 'graph',
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
        // edgeLabel: {
        //   show: true,
        //   formatter: function (params) {
        //     console.log(params);
        //     console.log(edges[params.data.source]);
        //     return edges[params.data.source]?.label;
        //   },
        // },
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
        setChart={setChart}
        settings={{ lazyUpdate: true }}
      />
    </>
  );
};

export default Flow;
