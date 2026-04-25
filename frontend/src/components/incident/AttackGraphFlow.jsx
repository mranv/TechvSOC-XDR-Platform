import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Fingerprint,
  Bug,
  Network,
  Lock,
  Server,
  AlertTriangle,
} from "lucide-react";

import MitreBadge from "../ui/MitreBadge";

const NODE_ICONS = {
  initial_access: Network,
  execution: Bug,
  persistence: Lock,
  privilege_escalation: ShieldAlert,
  defense_evasion: Fingerprint,
  lateral_movement: Network,
  collection: Server,
  exfiltration: AlertTriangle,
  default: ShieldAlert,
};

const SEVERITY_COLORS = {
  critical: "#f472b6",
  high: "#f87171",
  medium: "#fbbf24",
  low: "#34d399",
  default: "#94a3b8",
};

function CustomNode({ data, selected }) {
  const Icon = NODE_ICONS[data.nodeType] || NODE_ICONS.default;
  const color = SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.default;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.index * 0.1 }}
      className={`group relative min-w-[160px] max-w-[220px] rounded-xl border px-4 py-3 transition-all duration-300 ${
        selected
          ? "border-white/30 bg-white/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          : "border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0" />
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {data.title}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
            {data.description}
          </p>
          {data.mitreTechniqueId && (
            <div className="mt-2">
              <MitreBadge techniqueId={data.mitreTechniqueId} techniqueName={data.mitreTechniqueName} />
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] uppercase tracking-wider" style={{ color }}>
              {data.severity}
            </span>
            {data.timestamp && (
              <span className="text-[9px] text-[var(--text-muted)]">
                {new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0" />
    </motion.div>
  );
}

const nodeTypes = { custom: CustomNode };

function AttackGraphFlow({ attackChain }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!attackChain?.steps || attackChain.steps.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const steps = attackChain.steps;
    const spacingX = 240;
    const totalWidth = (steps.length - 1) * spacingX;
    const startX = -totalWidth / 2;

    const n = steps.map((step, idx) => {
      const color = SEVERITY_COLORS[step.severity] || SEVERITY_COLORS.default;
      return {
        id: `step-${step.step}`,
        type: "custom",
        position: { x: startX + idx * spacingX, y: 0 },
        data: {
          title: step.title,
          description: step.description,
          severity: step.severity,
          timestamp: step.timestamp,
          nodeType: step.node_type || "default",
          index: idx,
          mitreTechniqueId: step.mitre_technique_id,
          mitreTechniqueName: step.mitre_technique_name,
        },
      };
    });

    const e = steps.slice(1).map((step, idx) => {
      const prev = steps[idx];
      const sourceColor = SEVERITY_COLORS[prev.severity] || SEVERITY_COLORS.default;
      return {
        id: `edge-${prev.step}-${step.step}`,
        source: `step-${prev.step}`,
        target: `step-${step.step}`,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: sourceColor,
          strokeWidth: 2,
          opacity: 0.7,
        },
      };
    });

    return { initialNodes: n, initialEdges: e };
  }, [attackChain]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (reactFlowInstance && initialNodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.3, duration: 800 });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, initialNodes.length]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  if (!attackChain?.steps || attackChain.steps.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03]">
        <p className="text-xs text-[var(--text-muted)]">No attack chain data available.</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-2xl border border-white/10 bg-[var(--surface-card)]/[0.6] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 800 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnScroll={false}
        attributionPosition="bottom-right"
      >
        <Background
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
          variant="dots"
        />
        <Controls
          style={{
            backgroundColor: "rgba(16,27,47,0.85)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        />
        <MiniMap
          nodeColor={(node) => SEVERITY_COLORS[node.data?.severity] || SEVERITY_COLORS.default}
          maskColor="rgba(8,17,31,0.65)"
          className="!bg-[var(--surface-card)]/[0.85] !border-white/10"
          style={{
            backgroundColor: "rgba(16,27,47,0.85)",
          }}
        />
      </ReactFlow>
    </div>
  );
}

export default memo(AttackGraphFlow);

