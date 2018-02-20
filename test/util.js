"use strict"
//--------------------------------- 80 chars -----------------------------------

const _ = require('lodash/fp');

const chai = require('chai');
chai.should();

const {takeSomeMethods, EventEmitterPromiseAllEmit, DispatchClass} = require('../util.js');

describe ('#EventEmitterPromiseAllEmit', () => {
	const E = new EventEmitterPromiseAllEmit;
	it('Allows emitting and handling events just like EventEmitter, but .emit returns a promise that is only resolved when all handlers are', () => {
		let handlerFired = false;
		E.on('doDelay', () => new Promise((yay, nay) => {
			setTimeout(yay, 10);
		}).then(() => handlerFired = true));
		return E.emit('doDelay').then(() => handlerFired.should.be.equal(true))
	})
});

describe('#DispatchClass', () => {
	class A {constructor() {
		this.data = 'a';
	}}
	class B {constructor() {
		this.data = 'b';
	}}
	const AorB = DispatchClass([
		[_.eq('a'), A],
		[_.eq('b'), B]
	]);
	class C extends AorB {
		constructor(data) {
			super(data);
		}
		getData() {
			return this.data;
		}
	}
	it('allows an instance to choose its class based on constructor args', () => {
		const result = [];
		const a = new AorB('a');
		const b = new AorB('b');
		result.push(a.constructor.name.should.equal('A'));
		result.push(a.data.should.equal('a'));
		result.push(b.constructor.name.should.equal('B'));
		result.push(b.data.should.equal('b'));
		return Promise.all(result);
	});
	it('Expects non-empty list of pairs [predicate, class]', () => Promise.resolve().then(() => {
		const zen = DispatchClass([]);
	}).should.be.rejectedWith('Array of predicate-class pairs is empty'));
	it('Expects one of predicates to match the input', () => Promise.resolve().then(() => {
		new AorB('c');
	}).should.be.rejectedWith('No predicate matched')
	);
	it('Can be extended just like any other class', () => {
		const c = new C('a');
		return c.getData().should.be.equal('a')
	})


});
