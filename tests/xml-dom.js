// Adaptador de DOM para pruebas: Python valida el XML y entrega su árbol.
// La huella vincula el árbol al texto exacto descomprimido por el parser de producción.
import {createHash} from 'node:crypto';
class Element{
 constructor(t){this.localName=t.tag;this.attrs=t.attrs;this.textContent=t.text;this.children=t.children.map(c=>new Element(c));}
 getAttribute(n){return this.attrs[n]??null;}
 getElementsByTagName(name){return this.children.flatMap(c=>[...(c.localName===name?[c]:[]),...c.getElementsByTagName(name)]);}
 querySelector(selector){const selectors=selector.split(',').map(s=>s.trim());return this.descendants().find(e=>selectors.some(s=>{const m=s.match(/^([\w-]+)(?:\[([\w-]+)\])?$/);if(!m)throw Error('Selector de test no implementado: '+s);return e.localName===m[1]&&(!m[2]||e.getAttribute(m[2])!==null);} ))??null;}
 descendants(){return this.children.flatMap(c=>[c,...c.descendants()]);}
}
export function useXMLTree(reference){globalThis.DOMParser=class{parseFromString(source){const hash=createHash('sha256').update(source).digest('hex');if(hash!==reference.sha256)throw Error('El árbol XML de referencia no corresponde a este archivo.');const root=new Element(reference.tree);return {documentElement:root,querySelector:s=>root.querySelector(s),getElementsByTagName:n=>root.localName===n?[root,...root.getElementsByTagName(n)]:root.getElementsByTagName(n)};}};}
