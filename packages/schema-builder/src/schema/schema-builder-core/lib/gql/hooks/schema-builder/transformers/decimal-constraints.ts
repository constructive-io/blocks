import { nodes } from 'pg-ast';

/**
 * Generate AST for decimal precision and scale constraints
 * @param precision - Maximum total number of digits
 * @param scale - Maximum number of decimal places
 * @returns PostgreSQL AST for the precision/scale constraint
 */
export function generateDecimalPrecisionScaleAST(precision?: number, scale?: number) {
	const constraints = [];

	// Precision constraint: max total digits (excluding decimal point)
	if (precision !== undefined && precision > 0) {
		constraints.push(
			nodes.aExpr({
				kind: 'AEXPR_OP',
				name: [nodes.string({ sval: '<=' })],
				lexpr: nodes.funcCall({
					funcname: [nodes.string({ sval: 'length' })],
					args: [
						nodes.funcCall({
							funcname: [nodes.string({ sval: 'replace' })],
							args: [
								nodes.typeCast({
									arg: nodes.columnRef({ fields: [nodes.string({ sval: 'value' })] }),
									typeName: {
										names: [nodes.string({ sval: 'text' })],
									},
								}),
								nodes.aConst({ sval: { sval: '.' } }),
								nodes.aConst({ sval: { sval: '' } }),
							],
						}),
					],
				}),
				rexpr: nodes.aConst({ ival: { ival: precision } }),
			})
		);
	}

	// Scale constraint: max decimal places
	if (scale !== undefined && scale > 0) {
		constraints.push(
			nodes.aExpr({
				kind: 'AEXPR_OP',
				name: [nodes.string({ sval: '<=' })],
				lexpr: nodes.funcCall({
					funcname: [nodes.string({ sval: 'length' })],
					args: [
						nodes.funcCall({
							funcname: [nodes.string({ sval: 'coalesce' })],
							args: [
								nodes.funcCall({
									funcname: [nodes.string({ sval: 'split_part' })],
									args: [
										nodes.typeCast({
											arg: nodes.columnRef({ fields: [nodes.string({ sval: 'value' })] }),
											typeName: {
												names: [nodes.string({ sval: 'text' })],
											},
										}),
										nodes.aConst({ sval: { sval: '.' } }),
										nodes.aConst({ ival: { ival: 2 } }),
									],
								}),
								nodes.aConst({ sval: { sval: '' } }),
							],
						}),
					],
				}),
				rexpr: nodes.aConst({ ival: { ival: scale } }),
			})
		);
	}

	// Return null if no constraints
	if (constraints.length === 0) {
		return null;
	}

	// Return single constraint or combine with AND
	if (constraints.length === 1) {
		return constraints[0];
	}

	return nodes.boolExpr({
		boolop: 'AND_EXPR',
		args: constraints,
	});
}

/**
 * Parse precision and scale from a check constraint AST
 * Based on the actual generated AST structure from pg-ast
 * @param chk - The check constraint AST from the database
 * @returns Object with precision and scale if found, otherwise undefined values
 */
export function parseDecimalConstraintsFromAST(chk: any): { precision?: number; scale?: number } {
	if (!chk) {
		return {};
	}

	const result: { precision?: number; scale?: number } = {};

	try {
		// The AST structure is: { BoolExpr: { boolop: 'AND_EXPR', args: [...] } }
		const boolExpr = chk.BoolExpr;
		if (!boolExpr || boolExpr.boolop !== 'AND_EXPR' || !Array.isArray(boolExpr.args)) {
			// Single constraint case (not wrapped in BoolExpr)
			parseConstraintExpression(chk, result);
			return result;
		}

		// Parse each constraint in the AND expression
		for (const arg of boolExpr.args) {
			parseConstraintExpression(arg, result);
		}
	} catch (error) {
		console.warn('Failed to parse decimal constraints from AST:', error);
	}

	return result;
}

/**
 * Parse a single constraint expression (A_Expr)
 */
function parseConstraintExpression(node: any, result: { precision?: number; scale?: number }): void {
	const aExpr = node.A_Expr;
	if (!aExpr) return;

	// Structure: A_Expr { lexpr: FuncCall, rexpr: A_Const }
	const funcCall = aExpr.lexpr?.FuncCall;
	const rexprConst = aExpr.rexpr?.A_Const;

	if (!funcCall || !rexprConst) return;

	// Get the outer function name (should be "length")
	const outerFuncName = funcCall.funcname?.[0]?.String?.sval;
	if (outerFuncName !== 'length') return;

	// Get the inner function call
	const innerFuncCall = funcCall.args?.[0]?.FuncCall;
	if (!innerFuncCall) return;

	const innerFuncName = innerFuncCall.funcname?.[0]?.String?.sval;

	// Get the constraint value (ival)
	const constraintValue = rexprConst.ival?.ival;
	if (typeof constraintValue !== 'number') return;

	// Determine if this is precision or scale based on inner function
	if (innerFuncName === 'replace') {
		// Precision: length(replace(value::text, '.', '')) <= N
		result.precision = constraintValue;
	} else if (innerFuncName === 'coalesce') {
		// Scale: length(coalesce(split_part(value::text, '.', 2), '')) <= N
		result.scale = constraintValue;
	}
}
