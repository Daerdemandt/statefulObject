"use strict"
//--------------------------------- 80 chars -----------------------------------

const _ = require('lodash/fp');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

const StatefulObject = require('../index.js');

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

describe('#initialState', () => {
	class Letter extends StatefulObject(alphabet) {};
	it('starts as first state if no initial state specified', () => {
		(new Letter).state().should.equal(alphabet[0]);
	});
	it('starts with a specified state if specified', () => alphabet.map((letter) => {
		(new Letter(letter)).state().should.equal(letter);
	}));
	//TODO: move to symbols, don't clutter the namespace at all
	it('stores allowed states in non-enumerable "allowedStates" field', () => {
		(new Letter).allowedStates.should.deep.equal(alphabet);
		_.keys(new Letter).should.not.contain('allowedStates');
	});
});

const generatePayload = () => [_.uniqueId()]; // TODO: test for different lengths and content

describe('#stateChange', () => {
	class Letter extends StatefulObject(alphabet) {};
	it('before switching state, calls onLeave handlers and passes payloads to them', () => {
		const obj = new Letter;
		const payloads = {};
		alphabet.map((state) => {
			payloads[state] = generatePayload();
			obj.onLeave(state, (...actualPayload) => {
				obj.state().should.equal(state);
				actualPayload.should.deep.equal(payloads[state]);
			});
		});
		const otherStates = _.flow(_.tail, _.shuffle)(alphabet);
		let p = Promise.resolve();
		for (const state of otherStates) {
			p = p.then(() => obj.state(state, ...payloads[obj.state()]));
		}
		return p.should.not.be.rejected;
	});
	it('changes the state to the one you say', () => {
		const obj = new Letter;
		const otherStates = _.flow(_.tail, _.shuffle)(alphabet);
		let p = Promise.resolve();
		for (const state of otherStates) {
			p = p.then(() => obj.state(state)).then(() => obj.state().should.equal(state))
		}
		return p.should.not.be.rejected;
	});
	it('after switching state, calls onEnter handlers and passes payloads to them', () => {
		const obj = new Letter;
		const payloads = {};
		alphabet.map((state) => {
			payloads[state] = generatePayload();
			obj.onEnter(state, (...actualPayload) => {
				obj.state().should.equal(state);
				actualPayload.should.deep.equal(payloads[state]);
			});
		});
		const otherStates = _.flow(_.tail, _.shuffle)(alphabet);
		let p = Promise.resolve();
		for (const state of otherStates) {
			p = p.then(() => obj.state(state, ...payloads[state]));
		}
		return p.should.not.be.rejected;
	});
	it('forbids attempts to change the state in onEnter handlers', () => {
		const obj = new Letter;
		obj.onEnter('b', () => obj.state('c'));
		return obj.state('b').should.be.rejectedWith(Error);
	});
	it('forbids attempts to change the state in onLeave handlers', () => {
		const obj = new Letter;
		obj.onLeave('a', () => obj.state('c'));
		return obj.state('b').should.be.rejectedWith(Error);
	});
});
