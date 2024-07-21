import {
  Edge,
  Node,
  RBGA,
  SupersetData,
  SupersetPluginChartFlowGraphQueryFormData,
  SymbolType,
} from "./types";
import { ControlStateMapping } from "@superset-ui/chart-controls";

export type NodeTreeType = {
  id: string;
  label: string;
  color: string;
  nodeShape: SymbolType;
  collapseChildren: number;
  expandedBy: NodeTreeType[];
  parents: NodeTreeType[];
  children: NodeTreeType[];
};

export const buildTree = (
  data: SupersetData[],
  colors: RBGA[],
  nodeShape: SymbolType,
  collapseChildren: number
) => {
  const tree: NodeTreeType[] = [];
  const nodesToBeUpdated: { [id: string]: NodeTreeType[] } = {};
  const colorTypes: string[] = [];

  // Build tree from data
  data.forEach((log) => {
    const id: string = log.idCol;
    const parentId: string = log.parentIdCol;
    const label: string = log.labelCol || id;
    let color: string;
    if (log.colorCol) {
      if (!colorTypes.includes(log.colorCol)) colorTypes.push(log.colorCol);
      color = RGBAToHexA(
        colors[colorTypes.findIndex((t) => t === log.colorCol)]
      );
    } else {
      color = RGBAToHexA(colors[0]);
    }
    // const nodesParent = nodes.find((v) => v.id === parentId);
    const existingNode = tree.find((v) => v.id === id);
    let treeNode: NodeTreeType;

    if (existingNode) {
      // Node with id already exists
      treeNode = existingNode;
      const existingParent = tree.find((v) => v.id === parentId);
      if (existingParent) {
        // Parent node with parentId already exists, add connection to parents and to children
        treeNode.parents.push(existingParent);
        existingParent.children.push(treeNode);
      } else {
        // Parent node with parentId does not exist, add edge later when parent is created
        if (parentId in nodesToBeUpdated) {
          nodesToBeUpdated[parentId].push(treeNode);
        } else {
          nodesToBeUpdated[parentId] = [treeNode];
        }
      }
    } else {
      // Node with id does not exist
      treeNode = {
        id,
        label,
        color,
        nodeShape,
        collapseChildren,
        expandedBy: [],
        parents: [],
        children: [],
      };

      const existingParent = tree.find((v) => v.id === parentId);
      if (existingParent) {
        // Parent node with parentId already exists, create edge from parent to child
        existingParent.children.push(treeNode);
        treeNode.parents.push(existingParent);
      } else {
        // Parent node with parentId does not exist, add edge later when parent is created
        if (parentId in nodesToBeUpdated) {
          nodesToBeUpdated[parentId].push(treeNode);
        } else {
          nodesToBeUpdated[parentId] = [treeNode];
        }
      }

      // Building nodes/edges logic v
      // const existingParent = tree.find((v) => v.id === parentId);
      // if (existingParent) {
      //   // Parent node with parentId already exists, create edge from parent to child
      //   edges.push({
      //     id: `${parentId}-${id}`,
      //     source: parentId,
      //     target: id,
      //   });
      // } else {
      //   // Parent node with parentId does not exist, add edge later when parent is created
      //   if (parentId in nodesToBeUpdated) {
      //     nodesToBeUpdated[parentId].push(id);
      //   } else {
      //     nodesToBeUpdated[parentId] = [id];
      //   }
      // }

      if (nodesToBeUpdated[id]) {
        // Add parent/child connection to existing child nodes
        treeNode.children.push(...nodesToBeUpdated[id]);
        nodesToBeUpdated[id].forEach((n) => {
          n.parents.push(treeNode);
        });
        nodesToBeUpdated[id] = [];
      }

      tree.push(treeNode);
    }
  });

  return { tree };
};

function RGBAToHexA(obj: RBGA) {
  let rStr = obj.r.toString(16);
  let gStr = obj.g.toString(16);
  let bStr = obj.b.toString(16);
  let aStr = Math.round(obj.a * 255).toString(16);

  if (rStr.length == 1) rStr = "0" + rStr;
  if (gStr.length == 1) gStr = "0" + gStr;
  if (bStr.length == 1) bStr = "0" + bStr;
  if (aStr.length == 1) aStr = "0" + aStr;

  return "#" + rStr + gStr + bStr + aStr;
}

const addChildNodes = (
  node: NodeTreeType,
  ignoreNodes: string[] = [],
  ignoreEdges: string[] = []
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add node if not already added
  if (!ignoreNodes.find((n) => n === node.id)) {
    nodes.push({
      id: node.id,
      name: node.label,
      itemStyle: {
        color: node.color,
      },
      symbol: node.nodeShape,
    });
  }

  // If node has childLimit or less children, then recursively expand
  if (node.children.length <= node.collapseChildren) {
    node.children.forEach((child) => {
      // Add parent node to child's expandedBy if not already there
      if (!child.expandedBy.find((i) => i.id === node.id)) {
        child.expandedBy.push(node);
      }

      // Add edge from parent node to child if not already added
      const edgeId = `${node.id}-${child.id}`;
      if (!ignoreEdges.find((e) => e === edgeId)) {
        edges.push({
          id: edgeId,
          source: node.id,
          target: child.id,
        });
      }

      // Recursive step
      const { nodes: childNodes, edges: childEdges } = addChildNodes(
        child,
        [...ignoreNodes, ...nodes.map((n) => n.id)],
        [...ignoreEdges, ...edges.map((e) => e.id)]
      );
      nodes.push(...childNodes);
      edges.push(...childEdges);
    });
  }

  return { nodes, edges };
};

const removeChildNodes = (
  node: NodeTreeType,
  currentNodes: Node[],
  currentEdges: Edge[]
) => {
  let nodes: Node[] = [...currentNodes];
  let edges: Edge[] = [...currentEdges];

  // For each child, remove current node from expandedBy field and remove edge from node to child
  // If child is no longer expanded by any parents, remove the child node and recurse on its children
  node.children.forEach((child) => {
    child.expandedBy = child.expandedBy.filter((b) => b.id !== node.id);
    edges = edges.filter((e) => e.id !== `${node.id}-${child.id}`);

    if (child.expandedBy.length === 0) {
      nodes = nodes.filter((n) => n.id !== child.id);
      const res = removeChildNodes(child, nodes, edges);
      nodes = res.nodes;
      edges = res.edges;
    }
  });

  return { nodes, edges };
};

export const buildCollapseNodes = (tree: NodeTreeType[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build nodes and edge, auto-collapse when num children > 3
  const roots = tree.filter((t) => t.parents.length === 0);

  const ignoreNodes: string[] = [];
  const ignoreEdges: string[] = [];
  roots.forEach((r) => {
    const { nodes: rNodes, edges: rEdges } = addChildNodes(
      r,
      ignoreNodes,
      ignoreEdges
    );
    ignoreNodes.push(...rNodes.map((n) => n.id));
    ignoreEdges.push(...rEdges.map((e) => e.id));
    nodes.push(...rNodes);
    edges.push(...rEdges);
  });

  return { nodes, edges };
};

export const nodeClick = (
  tree: NodeTreeType[],
  nodes: Node[],
  edges: Edge[],
  clickedNode: string
) => {
  let resNodes: Node[] = [...nodes];
  let resEdges: Edge[] = [...edges];
  const treeNode = tree.find((t) => t.id === clickedNode);
  if (treeNode && treeNode.children.length > 0) {
    if (
      edges.filter((e) => e.source === treeNode.id).length ===
      treeNode.children.length
    ) {
      // Collapse
      const { nodes: currNodes, edges: currEdges } = removeChildNodes(
        treeNode,
        nodes,
        edges
      );
      resNodes = currNodes;
      resEdges = currEdges;
    } else {
      // Expand
      treeNode.children.forEach((child) => {
        const ignoreEdges = resEdges.map((e) => e.id);

        const { nodes: nds, edges: eds } = addChildNodes(
          child,
          resNodes.map((n) => n.id),
          ignoreEdges
        );
        if (!child.expandedBy.find((i) => i.id === treeNode.id)) {
          child.expandedBy.push(treeNode);
        }

        const edgeId = `${treeNode.id}-${child.id}`;
        if (!ignoreEdges.find((e) => e === edgeId)) {
          resEdges.push({
            id: edgeId,
            source: treeNode.id,
            target: child.id,
          });
        }

        resNodes.push(...nds);
        resEdges.push(...eds);
      });
    }
  }

  return { tree, nodes: resNodes, edges: resEdges };
};

export const colorVisibility = (
  controls: ControlStateMapping,
  numColor: number
) => {
  if (controls.chart.queriesResponse) {
    const data = controls.chart.queriesResponse[0].data;
    const columnOptions: string[] = [];
    data.forEach((d: SupersetPluginChartFlowGraphQueryFormData) => {
      const option = d[controls.form_data.colorCol];
      if (!columnOptions.includes(option)) columnOptions.push(option);
    });
    if (columnOptions.length >= numColor) return true;
  }
  return false;
};

export const buildAllNodes = (tree: NodeTreeType[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build all nodes and edges
  tree.forEach((t) => {
    nodes.push({
      id: t.id,
      name: t.label,
      itemStyle: {
        color: "#f77ef5",
      },
      symbol: "roundRect",
    });

    t.parents.forEach((p) => {
      const edgeId = `${p.id}-${t.id}`;
      if (!edges.find((e) => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: p.id,
          target: t.id,
        });
      }
    });
  });
  return { nodes, edges };
};
