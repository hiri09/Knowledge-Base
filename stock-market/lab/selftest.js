// node selftest.js — checks the fill/P&L/order-matching math in lab.js (no DOM).
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/lab.js','utf8').split('// ---------- chart ----------')[0];
const api=new Function(src+'\nreturn {init:()=>init("range"),S:()=>S,applyFill,place,matchOrders,equity,setPrice:p=>S.price=p,FEE};')();
api.init();
const S=api.S(); const start=S.cash;

api.applyFill('buy',100,100);
assert.strictEqual(S.pos.qty,100); assert.strictEqual(S.pos.avg,100);
assert.ok(Math.abs(S.cash-(start-10000-10000*api.FEE))<1e-6,'cash after buy');

api.applyFill('sell',50,110);
assert.strictEqual(S.pos.qty,50);
assert.strictEqual(Math.round(S.realized),500,'realised on partial close');

api.applyFill('sell',100,90);            // closes 50, flips to short 50
assert.strictEqual(S.pos.qty,-50);
assert.strictEqual(S.pos.avg,90,'avg resets on flip');
assert.strictEqual(Math.round(S.realized),0,'500 gain then 500 loss');

api.applyFill('buy',50,90);              // flat again
assert.strictEqual(S.pos.qty,0);
// flat: every rupee is accounted for by realised P&L minus fees
assert.ok(Math.abs((S.cash-start)-(S.realized-S.fees))<1e-6,'cash == realised - fees when flat');

// limit buy fills only when price trades down to it; stop sell only when it trades down
api.setPrice(100);
api.place('buy','limit',10,95); api.matchOrders();
assert.strictEqual(S.pos.qty,0,'limit must not fill above its price');
api.setPrice(94); api.matchOrders();
assert.strictEqual(S.pos.qty,10,'limit fills when price reaches it');
assert.strictEqual(S.pos.avg,95,'limit fills AT the limit price');

// bracket: market buy with stop -> stop fires, position flat, sibling cancelled
api.setPrice(100); api.applyFill('sell',10,100);          // flat
S.orders.length=0; S.realized=0;
api.place('buy','market',20,0,90,120);
assert.strictEqual(S.orders.length,2,'stop + target attached');
api.setPrice(89); api.matchOrders();
assert.strictEqual(S.pos.qty,0,'stop closed the position');
assert.strictEqual(S.orders.length,0,'OCO cancelled the target');
assert.ok(S.realized<0,'stop-out is a loss');

console.log('selftest: all assertions passed');
