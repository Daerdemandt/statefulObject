"use strict"
//--------------------------------- 80 chars -----------------------------------

const EventEmitter = require('events');

const argumentCountDispatch = (methods) => (...params) =>
	methods[params.length](...params);

const bindMethod = (obj, methodName) => obj[methodName].bind(obj);

const takeSomeMethods = argumentCountDispatch({
	4: (cls, ...methods) => class {
		constructor() {this['_' + cls.name] = new cls();}
		[methods[0]](..._) {return bindMethod(this['_' + cls.name], methods[0])(..._);}
		[methods[1]](..._) {return bindMethod(this['_' + cls.name], methods[1])(..._);}
		[methods[2]](..._) {return bindMethod(this['_' + cls.name], methods[2])(..._);}
	}
});

//const vvlog = console.log;
const vvlog = (...args) => null;

class EventEmitterPromiseAllEmit extends EventEmitter {
	emit(event, ...payload) {
		return Promise.all(this.listeners(event).map(
			(listener) => Promise.resolve(listener.apply(this, payload))
		));
	}
}

//TODO: use symbols here
/*
 * NOTE: we are only leaving some EE methods accessible from outside because
 * some methods are broken.
 * For example, .once() *may* not work correctly: in browser versions of EE,
 * .once is responsible for wrapping the handler to self-destruct after the
 * first call, whereas node version does not wrap handlers and makes .emit
 * responsible for removing once-handlers.
 * Thus, .once works fine in browser but works like .on in node.\
 * Until this is fixed, takeSomeMethods is used to hide the ugly.
 */

/*
 * This is so-called "passive" mode
 *
 * It prevents state change handlers from triggering new state change when
 * the old one hasn't finished yet.
 * If one handler could do it then:
	* Either other handlers could do it to, which would make it ambiguous
	which state should be next,
	* Or there would be 2 sorts of handlers, with handlers of 1st sort
	uncapableof switching state but being numerous, and only 1 handler
	of 2nd sort allowed per state,
	* Or there would be some sort of spooky interaction between handlers where
	adding some unrelated handler somewhere else could break your code,
	* Or state-changing handlers would have to declare that desire beforehand,
	to prevent adding conflicting ones to the same object.
 *
 * However, simple use case of "after entering state X, do Y and change state to Z"
 * becomes a bit complicated to implement.
 */
const StatefulObject = (states) => class StatefulObject extends
takeSomeMethods(EventEmitterPromiseAllEmit, 'emit', 'on', 'removeListener') { // TODO: just extend EE
	constructor(state) {
		super();
		if (!state) {
			state = states[0];
		}
		this._state = state;
		this._stateTimestamp = Date.now();
	
		// we don't have class properties yet:(
		Object.defineProperty(this, 'allowedStates', {
			enumerable: false,
			value: states
		});
	}
	state(newState, ...payload) {
		if (!newState) {
			return this._state;
		}
		return new Promise((yay, nay) => {
			if (!states.includes(newState)) throw new Error(`'${newState}' is not a valid state, valid ones are ${states}`);
			if (this._stateChangeLock) throw new Error(
				`Tried to switch (${this._state} -> ${newState}) while already switching (${this._stateChangeLock})`
			);
			this._stateChangeLock = `${this._state} -> ${newState}`;
			vvlog(`${this.name}: ${this._stateChangeLock}`);
			this.emit(`leaveState:${this._state}`, ...payload).then(() => {
				this._state = newState;
				this._stateTimestamp = Date.now();
				return this.emit(`enterState:${newState}`, ...payload);
			}).then(() => this._stateChangeLock = null).then(yay).catch(nay);
		});
	}
	//TODO: add onceEnter, onceLeave. Note the nuance about broken .once though
	onEnter(state, callback) {this.on(`enterState:${state}`, callback);}
	offEnter(state, callback) {this.removeListener(`enterState:${state}`, callback);}
	onLeave(state, callback) {this.on(`leaveState:${state}`, callback);}
	offLeave(state, callback) {this.removeListener(`leaveState:${state}`, callback);}
};

/*
 * This is so-called "active" mode.
 *
 * It solves the same problem described above, but allowing 1 state change to be
 * issued by one of handlers. Thus, you still cannot issue ambiguous state change,
 * but you can try and some job will be done.
 */
const ActiveStatefulObject = (states) => class ActiveStatefulObject extends StatefulObject(states) {
	state(newState, ...payload) {
		if (!newState) return super.state();
		// TODO: if error happens in current state change, reject scheduled one too
		if (!this._stateChangeLock) return super.state(newState, ...payload).then(() => {
			if (this._nextState) {
				const {name, payload, yay} = this._nextState;
				this._nextState = undefined;
				this.state(name, ...payload).then(yay);
			}
		});
		return new Promise((yay, nay) => {
			if (this._nextState) throw new Error(
				`Ambiguous state change while switching (${this._stateChangeLock}): requested ${newState} while already scheduled ${this._nextState.name}.`
			);
			this._nextState = { name: newState, payload, yay, nay };
		});
	}
}

//TODO: make passive behaviour default, active - toggleable
//TODO: break promise dependency cycles due to handlers like () => obj.state(...)
module.exports = ActiveStatefulObject;
