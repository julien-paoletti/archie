/**
 * Tests for the container title-position feature (Module/Domain/System).
 *
 * Containers place their title (+ optional description) band at the top by
 * default; titlePosition: 'bottom' moves the whole band to the bottom edge.
 * The band drives drawing, drop-detection (containsPointInContentArea), and
 * bounds recalculation, so those are pinned here.
 */

import { describe, expect, test } from 'bun:test';
import { Module } from '../src/canvas/module';
import { Domain } from '../src/canvas/domain';
import { System } from '../src/canvas/system';

describe('titlePosition default and option', () => {
    test('defaults to top for all container types', () => {
        expect(new Module().titlePosition).toBe('top');
        expect(new Domain().titlePosition).toBe('top');
        expect(new System().titlePosition).toBe('top');
    });

    test('is honored when passed via options (deserialization path)', () => {
        expect(new Module({ titlePosition: 'bottom' }).titlePosition).toBe('bottom');
        expect(new Domain({ titlePosition: 'bottom' }).titlePosition).toBe('bottom');
        expect(new System({ titlePosition: 'bottom' }).titlePosition).toBe('bottom');
    });

    test('clone preserves titlePosition', () => {
        const m = new Module({ titlePosition: 'bottom' });
        const d = new Domain({ titlePosition: 'bottom' });
        const s = new System({ titlePosition: 'bottom' });
        expect(m.clone().titlePosition).toBe('bottom');
        expect(d.clone().titlePosition).toBe('bottom');
        expect(s.clone().titlePosition).toBe('bottom');
    });
});

describe('titleBandY', () => {
    test('top position: band starts at the element top', () => {
        const m = new Module({ x: 100, y: 50, width: 200, height: 150 });
        expect(m.titleBandY).toBe(50);
    });

    test('bottom position: band ends at the element bottom', () => {
        const m = new Module({ x: 100, y: 50, width: 200, height: 150, titlePosition: 'bottom' });
        expect(m.titleBandY).toBe(50 + 150 - m.titleBandHeight);
    });

    test('module band grows when a description is present', () => {
        const plain = new Module({ x: 0, y: 0, width: 200, height: 150 });
        const withDesc = new Module({ x: 0, y: 0, width: 200, height: 150, description: 'hello' });
        expect(withDesc.titleBandHeight).toBeGreaterThan(plain.titleBandHeight);
    });

    test('module descriptionY sits inside the band for both positions', () => {
        const top = new Module({ x: 0, y: 0, width: 200, height: 150, description: 'd' });
        const bottom = new Module({ x: 0, y: 0, width: 200, height: 150, description: 'd', titlePosition: 'bottom' });
        // Description is below the title row, within the band.
        expect(top.descriptionY).toBeGreaterThan(top.titleBandY);
        expect(top.descriptionY).toBeLessThan(top.titleBandY + top.titleBandHeight + 12);
        expect(bottom.descriptionY).toBeGreaterThan(bottom.titleBandY);
        // Bottom band: description stays within the element.
        expect(bottom.descriptionY).toBeLessThan(bottom.y + bottom.height + 12);
    });
});

describe('containsPointInContentArea', () => {
    test('top position: a point inside the title band is NOT content', () => {
        const m = new Module({ x: 0, y: 0, width: 200, height: 150 });
        const cx = 100;
        const inBand = m.titleBandY + m.titleBandHeight / 2;
        expect(m.containsPointInContentArea(cx, inBand)).toBe(false);
        // Just below the band is content.
        expect(m.containsPointInContentArea(cx, m.titleBandHeight + 1)).toBe(true);
    });

    test('bottom position: the same band area IS content, and the bottom band is not', () => {
        const m = new Module({ x: 0, y: 0, width: 200, height: 150, titlePosition: 'bottom' });
        const cx = 100;
        // Area near the top (where the band used to be) is now content.
        expect(m.containsPointInContentArea(cx, m.padding / 2 + 1)).toBe(true);
        // A point inside the bottom band is not content.
        const inBand = m.titleBandY + m.titleBandHeight / 2;
        expect(m.containsPointInContentArea(cx, inBand)).toBe(false);
    });
});

describe('recalculateBounds', () => {
    // Use a child large enough that min-size constraints don't kick in.
    function childModule(): Module {
        return new Module({ x: 300, y: 300, width: 400, height: 400 });
    }

    test('top position reserves the band above the children', () => {
        const parent = new Module({ x: 0, y: 0, width: 200, height: 150 });
        const child = childModule();
        parent.addChild(child);
        // Space above child = bandHeight + padding/2
        expect(parent.y).toBeCloseTo(child.y - parent.titleBandHeight - parent.padding / 2, 5);
    });

    test('bottom position reserves the band below the children', () => {
        const parent = new Module({ x: 0, y: 0, width: 200, height: 150, titlePosition: 'bottom' });
        const child = childModule();
        parent.addChild(child);
        // Space above child = just padding; the band lives at the bottom.
        expect(parent.y).toBeCloseTo(child.y - parent.padding, 5);
        // The band fits inside the container below the child.
        const bandTop = parent.titleBandY;
        expect(bandTop).toBeGreaterThanOrEqual(child.y + child.height);
        expect(bandTop + parent.titleBandHeight).toBeCloseTo(parent.y + parent.height, 5);
    });

    test('total height is identical for top and bottom placement', () => {
        const top = new Module({ x: 0, y: 0, width: 200, height: 150 });
        const bottom = new Module({ x: 0, y: 0, width: 200, height: 150, titlePosition: 'bottom' });
        top.addChild(childModule());
        bottom.addChild(childModule());
        expect(top.height).toBeCloseTo(bottom.height, 5);
    });
});
