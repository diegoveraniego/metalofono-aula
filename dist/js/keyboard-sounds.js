export const KEYBOARD_SOUNDS={piano:'Piano acústico',epiano:'Piano eléctrico',fmpiano:'Piano FM',keys:'Sintetizador'};
export function keyboardSound(part,selected){return Object.hasOwn(KEYBOARD_SOUNDS,selected)?selected:/synth|sintetizador|sinte\b/i.test(part?.name??'')?'keys':'piano';}
