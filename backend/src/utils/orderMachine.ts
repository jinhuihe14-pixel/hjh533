import { ProcessingOrder, OrderStatus, OrderNodeTimeline } from '../types';
import { store } from '../data/store';

const NODE_TRANSITIONS: Record<string, string> = {
  'pending_review': 'reviewed',
  'reviewed': 'scheduled',
  'scheduled': 'material_picked',
  'material_picked': 'processing',
  'processing': 'initial_inspection',
  'initial_inspection': 'reinspection',
  'reinspection': 'packaging',
  'packaging': 'shipped',
  'shipped': 'delivered',
  'delivered': 'completed'
};

export const canTransition = (currentNode: string, targetNode: string): boolean => {
  const nodes = store.orderNodes;
  const currentIndex = nodes.findIndex(n => n.key === currentNode);
  const targetIndex = nodes.findIndex(n => n.key === targetNode);
  return targetIndex === currentIndex + 1;
};

export const getNextNode = (currentNode: string): string | null => {
  return NODE_TRANSITIONS[currentNode] || null;
};

export const advanceOrderNode = (
  order: ProcessingOrder,
  operatorId: string,
  remark?: string
): ProcessingOrder => {
  const nextNode = getNextNode(order.currentNode);
  
  if (!nextNode) {
    return order;
  }

  const now = new Date().toISOString();
  
  const updatedTimeline = order.nodeTimeline.map(node => {
    if (node.node === order.currentNode) {
      return { ...node, status: 'completed' as const, completedAt: now, operatorId, remark };
    }
    return node;
  });

  updatedTimeline.push({
    node: nextNode,
    status: 'processing',
    startedAt: now,
    operatorId
  });

  return {
    ...order,
    status: nextNode as OrderStatus,
    currentNode: nextNode,
    nodeTimeline: updatedTimeline,
    updatedAt: now
  };
};

export const checkNodeTimeout = (
  node: OrderNodeTimeline,
  timeoutHours: number = 48
): boolean => {
  if (node.status !== 'processing' || !node.startedAt) {
    return false;
  }
  
  const startTime = new Date(node.startedAt).getTime();
  const now = Date.now();
  const hoursPassed = (now - startTime) / (1000 * 60 * 60);
  
  return hoursPassed > timeoutHours;
};

export const calculateDeduction = (
  order: ProcessingOrder,
  actualLossRate: number,
  actualDefectRate: number
): number => {
  let deduction = 0;
  
  if (actualLossRate > order.lossRateThreshold) {
    const excessLossRate = actualLossRate - order.lossRateThreshold;
    const excessQuantity = order.quantity * (excessLossRate / 100);
    deduction += excessQuantity * order.unitPrice;
  }
  
  if (actualDefectRate > order.defectRateThreshold) {
    const excessDefectRate = actualDefectRate - order.defectRateThreshold;
    const defectQuantity = order.quantity * (excessDefectRate / 100);
    deduction += defectQuantity * order.unitPrice * 1.5;
  }
  
  return Math.round(deduction * 100) / 100;
};
