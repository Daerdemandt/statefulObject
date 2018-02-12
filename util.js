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


class EventEmitterPromiseAllEmit extends EventEmitter {
	emit(event, ...payload) {
		return Promise.all(this.listeners(event).map(
			(listener) => Promise.resolve(listener.apply(this, payload))
		));
	}
}


// Basically cond, but with constructors instead of actions
const DispatchClass = (pairs) => {
	if (!pairs.length) throw new Error('Array of predicate-class pairs is empty');
	return class DispatchClass {
		constructor(...data) {
			for (const [predicate, cls] of pairs) {
				if (predicate(...data)) return new cls(...data);
			}
			throw new Error('No predicate matched the data');
		}
	}
}

module.exports = {takeSomeMethods, EventEmitterPromiseAllEmit, DispatchClass};
