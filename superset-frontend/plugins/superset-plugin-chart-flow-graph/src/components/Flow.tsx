import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildAllNodes,
  buildCollapseNodes,
  buildTree,
  nodeClick,
  NodeTreeType,
} from "../utils";

import ELK from "elkjs/lib/elk.bundled.js";
import EChartsRenderer from "./EChartsRenderer";
import {
  Edge,
  Node,
  SupersetData,
  SupersetPluginChartFlowGraphProps,
} from "../types";
import { EChartsOption, ECElementEvent, ECharts } from "echarts";

// ELK layout logic
const elk = new ELK();
const useLayoutedElements = () => {
  const defaultOptions = {
    "elk.algorithm": "layered",
    "elk.layered.spacing.nodeNodeBetweenLayers": 80,
    "elk.spacing.nodeNode": 80,
    // "elk.separateConnectedComponents": false,
    "elk.spacing.componentComponent": 80,
  };
  const getLayoutedElements = useCallback(
    (
      options: any,
      nodes: Node[],
      edges: Edge[],
      setNodes: Dispatch<SetStateAction<Node[]>>,
      nodeSize: { width: number; height: number }
    ) => {
      const layoutOptions = { ...defaultOptions, ...options };
      console.log(layoutOptions);
      const graph = {
        id: "root",
        layoutOptions: layoutOptions,
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
    []
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

  const { getLayoutedElements } = useLayoutedElements();

  useEffect(() => {
    const { tree } = buildTree(
      props.data as unknown as SupersetData[],
      props.nodeColors,
      props.nodeShape,
      props.collapseChildren
    );
    const { nodes, edges } = buildCollapseNodes(tree);
    console.log(nodes, edges);
    getLayoutedElements(
      {
        "elk.algorithm": "layered",
        "elk.layered.spacing.nodeNodeBetweenLayers":
          props.nodeNodeBetweenLayers,
        "elk.spacing.nodeNode": props.nodeNode,
        // "elk.separateConnectedComponents": false,
        "elk.spacing.componentComponent": props.componentComponent,
      },
      nodes,
      edges,
      setNodes,
      { width: props.nodeSizeW, height: props.nodeSizeH }
    );
    // console.log(tree);
    setTree(tree);
    // setNodes(nodes);
    setEdges(edges);
    // setTimeout(() => {
    //   getLayoutedElements({}, nodes, edges, setNodes);
    // }, 1000);
  }, [props.data, props.nodeColors, props.nodeShape]);

  useEffect(() => {
    if (clickedNode) {
      const res = nodeClick(tree, nodes, edges, clickedNode.nodeId);
      if (
        nodes.length !== res.nodes.length ||
        edges.length !== res.edges.length
      ) {
        setClickedNode(undefined);
        if (
          props.autoLayout ||
          res.nodes.length > nodes.length ||
          res.edges.length > edges.length
        ) {
          clickedNode.chart.dispatchAction({ type: "restore" });
          getLayoutedElements(
            {
              "elk.algorithm": "layered",
              "elk.layered.spacing.nodeNodeBetweenLayers":
                props.nodeNodeBetweenLayers,
              "elk.spacing.nodeNode": props.nodeNode,
              // "elk.separateConnectedComponents": false,
              "elk.spacing.componentComponent": props.componentComponent,
            },
            res.nodes,
            res.edges,
            setNodes,
            { width: props.nodeSizeW, height: props.nodeSizeH }
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
    // tooltip: {},
    animationDurationUpdate: 1500,
    animationEasingUpdate: "quinticInOut",
    // graphic: {
    //   elements: [
    //     {
    //       type: "rect",
    //       shape: { width: 200, height: 200 },
    //       style: { fill: "gray" },
    //       draggable: true,
    //       textContent: { type: "text", name: "TESTING" },
    //       textConfig: { position: "top" },
    //     },
    //   ],
    // },
    // dataZoom: [
    //   {
    //     type: "inside",
    //     start: 0,
    //     end: 100,
    //   },
    // ],
    // grid: { show: true },
    series: [
      {
        type: "graph",
        symbolSize: [props.nodeSizeW, props.nodeSizeH],
        width: props.width,
        height: props.height,
        // symbolSize: [40, 20],
        // zoom: 10,
        roam: true,
        label: {
          show: true,
        },
        edgeSymbol: ["circle", "arrow"],
        edgeSymbolSize: [4, 10],
        edgeLabel: {
          fontSize: 20,
        },
        nodeScaleRatio: props.nodeScaleRatio as 0.6,
        draggable: true,
        data: nodes, //.map((n: any) => ({ ...n, symbolSize: n.width })),
        links: edges.map((e: any) => {
          const s = nodes.findIndex((n: Node) => n.id === e.source);
          const t = nodes.findIndex((n: Node) => n.id === e.target);
          return { source: s, target: t };
        }),
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0,
        },
      },
    ],
  };

  return (
    <>
      <EChartsRenderer
        option={option}
        onNodeClick={(info: ECElementEvent, chart: ECharts) => {
          setClickedNode({ nodeId: info.data?.id, chart });
        }}
      />
    </>
  );
};

export default Flow;
