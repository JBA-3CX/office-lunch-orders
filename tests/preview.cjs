// Local browser fixture: never loads Firebase or connects to the live database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mock = `
const fixture = { orders: { demo: { person: 'Preview User', items: [
  {itemId:1,itemName:'Special Sandwich',size:'Double',qty:2,comment:'No tomato',totalPrice:13},
  {itemId:24,itemName:'French Fries',size:'Large',qty:1,extras:['Cheese'],totalPrice:2.7},
  {itemId:20,itemName:'Chicken Burger',size:'Standard',qty:1,totalPrice:4}
] } }, history: null, menu: null, config: { activeDate: new Date().toLocaleDateString('en-CA'), cutoffTime: location.search.includes('closed') ? '00:00' : '23:59' } };
const listeners = {};
window.firebase = {apps:[{}],initializeApp(){},database(){return {ref(key){return {
on(event,cb){listeners[key]=cb; cb({val:()=>fixture[key]});},
set(value){const [group,id]=key.split('/'); if(id)fixture[group][id]=value;else fixture[group]=value;
if(listeners[group])listeners[group]({val:()=>fixture[group]});return Promise.resolve();},
push(value){fixture.orders['new'+Date.now()]=value;listeners.orders({val:()=>fixture.orders});return Promise.resolve();}
};}};}};
`;
http.createServer((req, res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(mock); }
  const file = { '/': 'index.html', '/app.js': 'app.js', '/menu.webp': 'menu.webp' }[req.url.split('?')[0]];
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'image/webp');
  let content = fs.readFileSync(path.join(root, file));
  if (file === 'index.html') content = content.toString().replace('<script src="./app.js">', '<script src="/fixture.js"></script><script src="./app.js">').replace(/<script defer src="https:\/\/www.gstatic.com[^>]+><\/script>/g, '');
  res.end(content);
}).listen(8126, '127.0.0.1', () => console.log('Local fixture: http://127.0.0.1:8126 (mock database only)'));
