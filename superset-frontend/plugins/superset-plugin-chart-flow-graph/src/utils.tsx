import { t } from '@superset-ui/core';

import {
  ControlStateMapping,
  CustomControlItem,
} from '@superset-ui/chart-controls';
import {
  Edge,
  Node,
  RGBA,
  SupersetData,
  SupersetPluginChartFlowGraphQueryFormData,
  SymbolType,
} from './types';

export type NodeTreeType = {
  id: string;
  label: string;
  color: string;
  edgeColor: string;
  edgeLabel: string;
  typeValue: string | undefined;
  tooltipText: string | undefined;
  autoLink: boolean;
  nodeShape: SymbolType;
  collapseChildren: number;
  expandedBy: NodeTreeType[];
  parents: NodeTreeType[];
  children: NodeTreeType[];
};

/** Given data from superset sql query, build tree object that
 *  serves as the data structure for the flow graph
 */
export const buildTree = (
  data: SupersetData[],
  colors: string[],
  edgeColors: string[],
  nodeShapes: SymbolType[],
  collapseChildren: number,
  overflowText: number,
  autoLink: boolean,
) => {
  const tree: NodeTreeType[] = [];
  const nodesToBeUpdated: { [id: string]: NodeTreeType[] } = {};
  const colorTypes: string[] = [];
  const edgeColorTypes: string[] = [];

  // Build tree from data
  data.forEach(log => {
    const id: string = log.idCol;
    if (id) {
      const parentId: string = log.parentIdCol;
      const tooltipText = log.tooltipCol;
      let label: string = log.labelCol || id;
      if (label.length > overflowText) {
        label = `${label.substring(0, overflowText)}...`;
      }
      const typeValue = log.colorCol;
      const edgeLabel: string = log.edgeLabelCol || '';

      let color: string;
      let nodeShape: SymbolType;
      if (log.colorCol) {
        if (!colorTypes.includes(log.colorCol)) colorTypes.push(log.colorCol);
        color = colors[colorTypes.findIndex(t => t === log.colorCol)];
        nodeShape = nodeShapes[colorTypes.findIndex(t => t === log.colorCol)];

        if (!color) {
          color = colors[0];
          nodeShape = nodeShapes[0];
        }
      } else {
        color = colors[0];
        nodeShape = nodeShapes[0];
      }

      let edgeColor: string;
      if (log.edgeColorCol) {
        if (!edgeColorTypes.includes(log.edgeColorCol))
          edgeColorTypes.push(log.edgeColorCol);
        edgeColor =
          edgeColors[edgeColorTypes.findIndex(t => t === log.edgeColorCol)];
      } else {
        edgeColor = edgeColors[0];
      }
      // const nodesParent = nodes.find((v) => v.id === parentId);
      const existingNode = tree.find(v => v.id === id);
      let treeNode: NodeTreeType;

      if (existingNode) {
        // Node with id already exists
        treeNode = existingNode;
        const existingParent = tree.find(v => v.id === parentId);
        if (existingParent) {
          // Parent node with parentId already exists, add connection to parents and to children
          treeNode.parents.push(existingParent);
          existingParent.children.push(treeNode);
        } else {
          // Parent node with parentId does not exist, add edge later when parent is created
          nodesToBeUpdated[parentId] = nodesToBeUpdated[parentId] || [];
          nodesToBeUpdated[parentId].push(treeNode);
        }
      } else {
        // Node with id does not exist
        treeNode = {
          id,
          label,
          color,
          edgeColor,
          typeValue,
          tooltipText,
          edgeLabel,
          autoLink,
          nodeShape,
          collapseChildren,
          expandedBy: [],
          parents: [],
          children: [],
        };

        const existingParent = tree.find(v => v.id === parentId);
        if (existingParent) {
          // Parent node with parentId already exists, create edge from parent to child
          existingParent.children.push(treeNode);
          treeNode.parents.push(existingParent);
        } else {
          // Parent node with parentId does not exist, add edge later when parent is created
          nodesToBeUpdated[parentId] = nodesToBeUpdated[parentId] || [];
          nodesToBeUpdated[parentId].push(treeNode);
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
          nodesToBeUpdated[id].forEach(n => {
            n.parents.push(treeNode);
          });
          nodesToBeUpdated[id] = [];
        }

        tree.push(treeNode);
      }
    }
  });

  return { tree };
};

/** Converts RGBA object to hexa string */
export function RGBAToHexA(obj: RGBA, defaultColor = '') {
  if (!obj) return defaultColor;
  let rStr = obj.r.toString(16);
  let gStr = obj.g.toString(16);
  let bStr = obj.b.toString(16);
  let aStr = Math.round(obj.a * 255).toString(16);

  if (rStr.length === 1) rStr = `0${rStr}`;
  if (gStr.length === 1) gStr = `0${gStr}`;
  if (bStr.length === 1) bStr = `0${bStr}`;
  if (aStr.length === 1) aStr = `0${aStr}`;

  return `#${rStr}${gStr}${bStr}${aStr}`;
}

const plusImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='size-6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' /%3E%3C/svg%3E%0A";

const minusImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='currentColor' class='size-6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' /%3E%3C/svg%3E%0A";

/** Recursively adds nodes and edges starting at given node */
const addChildNodes = (
  node: NodeTreeType,
  ignoreNodes: string[] = [],
  ignoreEdges: string[] = [],
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add node if not already added
  if (!ignoreNodes.find(n => n === node.id)) {
    const n: Node = {
      id: node.id,
      name: node.label,
      itemStyle: {
        color: node.color,
      },
      value: node.typeValue,
      symbol: node.nodeShape,
    };

    const typeLabel = node.typeValue ? '{type|{c}}' : '';
    // No children, add expand/collapse icon
    if (node.children.length !== 0) {
      n.label = {
        formatter: ['{name|{b}}', `${typeLabel}{expand|}`].join('\n'),
        rich: {
          expand: {
            backgroundColor: {
              image:
                node.children.length > node.collapseChildren
                  ? plusImg
                  : minusImg,
            },
            width: 25,
            height: 25,
            align: 'right',
          },
        },
      };
      n.emphasis = {
        itemStyle: {
          opacity: 0.8,
        },
      };
    } else {
      n.label = {
        formatter: ['{name|{b}}', `${typeLabel}`].join('\n'),
      };
    }

    // Add tooltip text from chosen column
    if (node.tooltipText) {
      n.tooltip = {
        show: true,
        padding: 15,
        formatter: node.tooltipText
          .split(' ')
          .map(word => {
            if (node.autoLink && word.startsWith('http'))
              return `<a target="_blank" style="color: inherit;" href=${word}>${word}</a>`;
            return word;
          })
          .join(' '),
        extraCssText: 'text-align: left; ', // width: 200px; text-wrap: wrap;",
      };
    }
    nodes.push(n);
  }

  // If node has childLimit or less children, then recursively expand
  if (node.children.length <= node.collapseChildren) {
    node.children.forEach(child => {
      // Add parent node to child's expandedBy if not already there
      if (!child.expandedBy.find(i => i.id === node.id)) {
        child.expandedBy.push(node);
      }

      // Add edge from parent node to child if not already added
      const edgeId = `${node.id}-${child.id}`;
      if (!ignoreEdges.find(e => e === edgeId)) {
        edges.push({
          id: edgeId,
          source: node.id,
          target: child.id,
          value: node.edgeLabel,
          lineStyle: {
            color: node.edgeColor,
          },
        });
      }

      // Recursive step
      const { nodes: childNodes, edges: childEdges } = addChildNodes(
        child,
        [...ignoreNodes, ...nodes.map(n => n.id)],
        [...ignoreEdges, ...edges.map(e => e.id)],
      );
      nodes.push(...childNodes);
      edges.push(...childEdges);
    });
  }

  return { nodes, edges };
};

/** Recursively removes nodes and edges starting at given node */
const removeChildNodes = (
  node: NodeTreeType,
  currentNodes: Node[],
  currentEdges: Edge[],
) => {
  let nodes: Node[] = [...currentNodes];
  let edges: Edge[] = [...currentEdges];

  // For each child, remove current node from expandedBy field and remove edge from node to child
  // If child is no longer expanded by any parents, remove the child node and recurse on its children
  node.children.forEach(child => {
    // eslint-disable-next-line no-param-reassign
    child.expandedBy = child.expandedBy.filter(b => b.id !== node.id);
    edges = edges.filter(e => e.id !== `${node.id}-${child.id}`);

    if (child.expandedBy.length === 0) {
      nodes = nodes.filter(n => n.id !== child.id);
      ({ nodes, edges } = removeChildNodes(child, nodes, edges));
    }
  });

  return { nodes, edges };
};

/** Given tree object, recursively builds nodes and edges starting at root nodes
 *  and collapsing nodes when children is greater than a given parameter
 */
export const buildCollapseNodes = (tree: NodeTreeType[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build nodes and edge, auto-collapse when num children > given prop setting
  const roots = tree.filter(t => t.parents.length === 0);

  const ignoreNodes: string[] = [];
  const ignoreEdges: string[] = [];
  roots.forEach(r => {
    const { nodes: rNodes, edges: rEdges } = addChildNodes(
      r,
      ignoreNodes,
      ignoreEdges,
    );
    ignoreNodes.push(...rNodes.map(n => n.id));
    ignoreEdges.push(...rEdges.map(e => e.id));
    nodes.push(...rNodes);
    edges.push(...rEdges);
  });

  return { nodes, edges };
};

/** Handles expand and collapse logic when node is clicked */
export const nodeClick = (
  tree: NodeTreeType[],
  nodes: Node[],
  edges: Edge[],
  clickedNode: string,
) => {
  let resNodes: Node[] = [...nodes];
  let resEdges: Edge[] = [...edges];
  const treeNode = tree.find(t => t.id === clickedNode);
  if (!treeNode || treeNode.children.length === 0) {
    return null;
  }

  if (
    edges.filter(e => e.source === treeNode.id).length ===
    treeNode.children.length
  ) {
    // Collapse
    const { nodes: currNodes, edges: currEdges } = removeChildNodes(
      treeNode,
      nodes,
      edges,
    );
    resNodes = currNodes;
    resEdges = currEdges;

    resNodes.find(
      n => n.id === clickedNode,
    )!.label!.rich!.expand!.backgroundColor!.image = plusImg;
  } else {
    // Expand
    treeNode.children.forEach(child => {
      const ignoreEdges = resEdges.map(e => e.id);

      const { nodes: nds, edges: eds } = addChildNodes(
        child,
        resNodes.map(n => n.id),
        ignoreEdges,
      );
      if (!child.expandedBy.find(i => i.id === treeNode.id)) {
        child.expandedBy.push(treeNode);
      }

      const edgeId = `${treeNode.id}-${child.id}`;
      if (!ignoreEdges.find(e => e === edgeId)) {
        resEdges.push({
          id: edgeId,
          source: treeNode.id,
          target: child.id,
          value: treeNode.edgeLabel,
          lineStyle: {
            color: treeNode.edgeColor,
          },
        });
      }

      resNodes.push(...nds);
      resEdges.push(...eds);
    });

    resNodes.find(
      n => n.id === clickedNode,
    )!.label!.rich!.expand!.backgroundColor!.image = minusImg;
  }

  return { tree, nodes: resNodes, edges: resEdges };
};

/** Generates repeated control panel controls */
export const generateNumeratedControls = (
  template: CustomControlItem,
  desc: string,
  visibilityCol: string,
  count = 20,
) => {
  const controls: CustomControlItem[][] = [];
  let currentRow: CustomControlItem[] = [];

  Array.from({ length: count }, (_, i) => i + 1).forEach(i => {
    const c = {
      name: template.name + i,
      config: {
        ...template.config,
        label: t(template.config.label?.toString() + i.toString()),
      },
    };

    if (i === 1) {
      c.config.description = desc;
    } else {
      c.config.visibility = (controls: any) =>
        colorVisibility(controls, i, visibilityCol);
    }

    currentRow.push(c);
    if (i % 4 === 0) {
      controls.push(currentRow);
      currentRow = [];
    }
  });

  if (currentRow.length !== 0) {
    controls.push(currentRow);
  }

  return controls;
};

/** Determines based on query response whether repeated control should be visible or hidden */
const colorVisibility = (
  controls: ControlStateMapping,
  numColor: number,
  column: string,
) => {
  if (controls.chart.queriesResponse) {
    const { data } = controls.chart.queriesResponse[0];
    const columnOptions: string[] = [];
    if (data && data.length >= 0) {
      data.forEach((d: SupersetPluginChartFlowGraphQueryFormData) => {
        const option = d[controls.form_data[column]];
        if (!columnOptions.includes(option)) columnOptions.push(option);
      });
      if (columnOptions.length >= numColor) return true;
    }
  }
  return false;
};

/** Given tree object, builds all nodes and edges on graph
 *  FUNCTION HAS NOT BEEN UPDATED
 */
export const buildAllNodes = (tree: NodeTreeType[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build all nodes and edges
  tree.forEach(t => {
    nodes.push({
      id: t.id,
      name: t.label,
      itemStyle: {
        // eslint-disable-next-line theme-colors/no-literal-colors
        color: '#f77ef5',
      },
      symbol: 'roundRect',
    });

    t.parents.forEach(p => {
      const edgeId = `${p.id}-${t.id}`;
      if (!edges.find(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: p.id,
          target: t.id,
          value: p.edgeLabel,
          lineStyle: {
            color: p.edgeColor,
          },
        });
      }
    });
  });
  return { nodes, edges };
};
