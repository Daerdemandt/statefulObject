"use strict"
//--------------------------------- 80 chars -----------------------------------

const _ = require('lodash/fp');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

const StatefulObject = require('../index.js');

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
class Letter extends StatefulObject { constructor(letter) {super(alphabet, letter);} };

describe('#initialState', () => {
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
const pairwise = (arr) => _.zip(_.initial(arr), _.tail(arr));

describe('#stateChange', () => {
	it('changes the state to the one you say', () => {
		const obj = new Letter;
		const otherStates = _.flow(_.tail, _.shuffle)(alphabet);
		let p = Promise.resolve();
		for (const state of otherStates) {
			p = p.then(() => obj.state(state)).then(() => obj.state().should.equal(state))
		}
		return p.should.not.be.rejected;
	});
	it('allows requesting state switch in handlers', () => {
		const obj = new Letter;
		const statePairs = _.flow(_.tail, _.shuffle, pairwise)(alphabet);
		const firstState = statePairs[0][0];
		const lastState = _.last(statePairs)[0];
		const result = new Promise((yay, nay) => obj.onEnter(lastState, yay));
		statePairs.map(([state1, state2]) => {
			obj.onEnter(state1, () => { obj.state(state2); })
		})
		obj.state(firstState);
		return result.should.not.be.rejected;
	});
	it('hangs with handlers returning .state(...) result due to promise dependency cycle', () => {
		const obj = new Letter;
		const statePairs = _.flow(_.tail, _.shuffle, pairwise)(alphabet);
		const firstState = statePairs[0][0];
		const lastState = _.last(statePairs)[0];
		const result = new Promise((yay, nay) => {
			obj.onEnter(lastState, yay);
			setTimeout(nay, 1000);
		});
		statePairs.map(([state1, state2]) => {
			obj.onEnter(state1, () => obj.state(state2))
		})
		obj.state(firstState);
		return result.should.not.be.fulfilled;
	});
	it('forbids switching to unknown states', () => {
		const obj = new Letter;
		return Promise.all(['1', 'ab', {a:'a'}].map((invalidState) => obj.state(invalidState).should.be.rejectedWith('is not a valid state')));
	});
	it('forbids multiple attempts to change the state in onEnter handlers', () => {
		const obj = new Letter;
		obj.onEnter('b', () => obj.state('c'));
		obj.onEnter('b', () => obj.state('d'));
		return obj.state('b').should.be.rejectedWith(Error);
	});
	it('forbids multiple attempts to change the state in onLeave handlers', () => {
		const obj = new Letter;
		obj.onLeave('a', () => obj.state('c'));
		obj.onLeave('a', () => obj.state('d'));
		return obj.state('b').should.be.rejectedWith(Error);
	});

});

describe('#handlers', () => {
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
	it('allows removing handlers', () => {
		const obj = new Letter;
		let handlerCallCount = 0;
		const handler = (...payload) => handlerCallCount++;
		alphabet.map((state) => {
			obj.onEnter(state, handler);
			obj.offEnter(state, handler);
			obj.onLeave(state, handler);
			obj.offLeave(state, handler);
		});
		const otherStates = _.flow(_.tail, _.shuffle)(alphabet);
		let p = Promise.resolve();
		for (const state of otherStates) {
			p = p.then(() => obj.state(state));
		}
		return p.then(() => handlerCallCount.should.equal(0));
	});
	it('calls handlers synchronously but waits for them asynchronously', () => {
		const obj = new Letter('a');
		let thisStack = true;
		const result = [];
		obj.onLeave('a', () => {
			result.push(thisStack.should.equal(true));
		});
		obj.onLeave('a', () => new Promise((yay, nay) => {
			result.push(thisStack.should.equal(true));
		}).then(() => {
			result.push(thisStack.should.equal(false));
		}));
		obj.onEnter('b', () => {
			result.push(thisStack.should.equal(true));
		});
		obj.onEnter('b', () => new Promise((yay, nay) => {
			result.push(thisStack.should.equal(true));
		}).then(() => {
			result.push(thisStack.should.equal(false));
		}));
		obj.state('b').then(() => {
			result.push(thisStack.should.equal(false));
		});
		thisStack = false;
		return Promise.all(result);
	})
});
