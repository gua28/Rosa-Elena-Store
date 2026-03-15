import jsPDF from 'jspdf';
import * as jspdfNamed from 'jspdf';
import autoTable from 'jspdf-autotable';

console.log('--- jsPDF Default ---');
console.log(typeof jsPDF);
console.log(jsPDF);

console.log('--- jsPDF Named ---');
console.log(Object.keys(jspdfNamed));

console.log('--- autoTable ---');
console.log(typeof autoTable);
console.log(autoTable);
