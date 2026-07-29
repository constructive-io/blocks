import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function OrgChartEdge({
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
}: EdgeProps) {
	const [edgePath] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		borderRadius: 12,
	});

	return <BaseEdge path={edgePath} style={style} />;
}
