/**
 * Demo Diagrams
 * Each demo is a JSON file in src/demos/. Add new demos there.
 */

import type { SerializedDiagram } from './editor/editorTypes';

import webApplication from './demos/web-application.json';
import microservices from './demos/microservices.json';
import dataPipeline from './demos/data-pipeline.json';

export interface Demo {
    id: string;
    label: string;
    diagram: SerializedDiagram;
}

type DemoFile = { label: string } & SerializedDiagram;

function toDemoEntry(id: string, raw: DemoFile): Demo {
    const { label, ...diagram } = raw;
    return { id, label, diagram: diagram as SerializedDiagram };
}

export const DEMOS: Demo[] = [
    toDemoEntry('web-application', webApplication as DemoFile),
    toDemoEntry('microservices', microservices as DemoFile),
    toDemoEntry('data-pipeline', dataPipeline as DemoFile),
];
