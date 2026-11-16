import { describe, expect, it } from 'vitest';

import { summarizeShape } from '../shape-kind';
import { dateTimeTitle, formatDateTimeText } from '../date-time-format';
import { localInputToTimestamp, timestampToLocalInput } from '../timestamp-text';

describe('summarizeShape', () => {
	it('has no summary for no value, so the cell stays empty', () => {
		expect(summarizeShape(null)).toBeNull();
		expect(summarizeShape(undefined)).toBeNull();
		expect(summarizeShape('')).toBeNull();
	});

	it('names each shape kind in plain words, with part counts for multi-part shapes', () => {
		const label = (geojson: unknown) => summarizeShape({ geojson, srid: 4326 })?.label;
		expect(label({ type: 'Point', coordinates: [1, 2] })).toBe('Point');
		expect(label({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })).toBe('Line');
		expect(label({ type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] })).toBe('Polygon');
		expect(label({ type: 'MultiPoint', coordinates: [[0, 0]] })).toBe('1 point');
		expect(label({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] })).toBe('2 lines');
		expect(label({ type: 'MultiPolygon', coordinates: [[[[0, 0], [0, 1], [1, 1], [0, 0]]], [[[2, 2], [2, 3], [3, 3], [2, 2]]], []] })).toBe(
			'3 polygons',
		);
		expect(label({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [1, 1] }] })).toBe('1 shape');
	});

	it('reads bare GeoJSON and GeoJSON text the same way', () => {
		expect(summarizeShape({ type: 'Point', coordinates: [1, 2] })?.label).toBe('Point');
		expect(summarizeShape('{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[0,0]]]}')?.label).toBe('Polygon');
	});

	it('says "Empty shape" for a valid shape with no parts', () => {
		expect(summarizeShape({ geojson: { type: 'GeometryCollection', geometries: [] } })).toEqual({
			category: 'empty',
			label: 'Empty shape',
			problem: null,
		});
		expect(summarizeShape({ type: 'MultiPolygon', coordinates: [] })?.label).toBe('Empty shape');
	});

	it('says "Not a shape" only for a value that cannot be read as one, with the reason', () => {
		expect(summarizeShape('not json')).toEqual({ category: 'invalid', label: 'Not a shape', problem: 'This value is not GeoJSON text.' });
		expect(summarizeShape({ geojson: { type: 'Circle', radius: 3 } })?.problem).toBe('"Circle" is not a GeoJSON shape type.');
		expect(summarizeShape({ type: 'Point' })?.problem).toBe('This point has no coordinates.');
		expect(summarizeShape(42)?.problem).toBe('This value is not a GeoJSON shape.');
	});
});

describe('timestamp text', () => {
	it('shows dates as stored and times as HH:mm:ss, with fractions only when not zero', () => {
		expect(formatDateTimeText('2024-02-29', 'date')).toEqual({ text: '2024-02-29', zone: null });
		expect(formatDateTimeText('0001-01-01', 'date').text).toBe('0001-01-01');
		expect(formatDateTimeText('13:45:30.123456', 'time')).toEqual({ text: '13:45:30.123456', zone: null });
		expect(formatDateTimeText('00:00:00.000000', 'time').text).toBe('00:00:00');
		expect(formatDateTimeText('2024-02-29T13:45:30.123400', 'datetime').text).toBe('2024-02-29 13:45:30.1234');
		expect(formatDateTimeText('1970-01-01T00:00:00.000000', 'datetime').text).toBe('1970-01-01 00:00:00');
		expect(formatDateTimeText('not a time', 'time').text).toBe('not a time');
	});

	it('shows a zoned value in the viewer zone and names that zone in the title', () => {
		const shown = formatDateTimeText('2024-02-29T13:45:30.123456+00:00', 'datetime');
		const instant = new Date('2024-02-29T13:45:30.123Z');
		const pad = (value: number) => String(value).padStart(2, '0');
		const local = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())} ${pad(instant.getHours())}:${pad(instant.getMinutes())}:30.123456`;
		expect(shown.text).toBe(local);
		expect(shown.zone).toBeTruthy();
		expect(dateTimeTitle('2024-02-29T13:45:30.123456+00:00', shown.zone)).toBe(`2024-02-29T13:45:30.123456+00:00 · shown in ${shown.zone}`);
		// A time of day with a zone is shown in the viewer's zone too.
		const time = formatDateTimeText('06:45:30.000000+00:00', 'time');
		expect(time.text).toMatch(/^\d{2}:\d{2}:30$/);
		expect(time.zone).toBeTruthy();
	});

	it('round-trips a date-time field: an unchanged local value gives back the same instant', () => {
		const local = timestampToLocalInput('2024-01-01T00:00:00.000000+00:00');
		expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
		expect(new Date(localInputToTimestamp(local)).toISOString()).toBe('2024-01-01T00:00:00.000Z');
		// Text without an offset is shown as the stored wall time.
		expect(timestampToLocalInput('2024-03-10T09:30:00')).toBe('2024-03-10T09:30:00');
	});
});
