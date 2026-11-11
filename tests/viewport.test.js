import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zoomLevel,fittedCanvasWidth} from '../dist/js/viewport.js';
test('zoom conserva límites y ajuste respeta formatos horizontal y vertical',()=>{
 assert.equal(zoomLevel(.1),.5);assert.equal(zoomLevel(4),2.5);assert.equal(zoomLevel(1.2000001),1.2);
 assert.equal(fittedCanvasWidth(1600,900),1600);assert.equal(fittedCanvasWidth(1600,900,2),3200);
 assert.equal(fittedCanvasWidth(1600,900,1,9/16),506.25);
});
