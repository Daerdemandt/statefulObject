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

const getClassProtoChain = (cls) => {
	if (!cls.prototype) return [];
	const result = getClassProtoChain(Object.getPrototypeOf(cls));
	result.unshift(cls.prototype);
	return result;
}

// Basically cond, but with constructors instead of actions
const DispatchClass = (pairs) => {
	if (!pairs.length) throw new Error('Array of predicate-class pairs is empty');
	return class DispatchClass {
		constructor(...data) {
			for (const [predicate, cls] of pairs) {
				if (predicate(...data)) {
					const result =  new cls(...data);
					if (new.target != DispatchClass) { // we have an inheritance here
						// We stich together stuff that inherited from DispatchClass and our cls
						// Note that we're changing child classes, the same child classes.
						// If child class can make the DC resolve into different classes from time to time,
						// unexpected and interesting things can happen, so don't do that.
						// TODO: fix this, or at least throw an error when it happens
						const protoChain = getClassProtoChain(new.target).slice(0, -1); // slice to omit DispatchClass
						protoChain.push(cls.prototype);
						let tmp = result;
						for (const proto of protoChain) {
							tmp.__proto__ = proto;
							tmp = tmp.__proto__;
						}
					}
					return result;
				}
			}
			throw new Error('No predicate matched the data');
		}
	}
}

module.exports = {takeSomeMethods, EventEmitterPromiseAllEmit, DispatchClass};
