# statefulObject
[![Build Status](https://travis-ci.org/Daerdemandt/statefulObject.svg?branch=master)](https://travis-ci.org/Daerdemandt/statefulObject)
[![Test Coverage](https://api.codeclimate.com/v1/badges/59ea750bb8a441dbd870/test_coverage)](https://codeclimate.com/github/Daerdemandt/statefulObject/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/59ea750bb8a441dbd870/maintainability)](https://codeclimate.com/github/Daerdemandt/statefulObject/maintainability)

A simple object that has states and can switch between them (fully async)

# Usage

Poke at online demo [here](https://repl.it/@daerdemandt/StatefulObject-demo)

```javascript
const StatefulObject = require('statefulobject');
const cat = new StatefulObject(['bored', 'eating', 'sleeping', 'playing']);
```

Constructor supports up to 3 params: list of states, initial state (`states[0]` by default) and options argument.

Getting and setting state:

```javascript
cat.state(); // 'bored';
cat.state('playing').then(() => {
  console.log('The cat is playing indeed');
});
```


Handlers can be attached to both leaving the state and entering the new one. Former are getting called ahead of the latter.

```javascript
cat.onEnter('bored', () => console.log(`I'm bored. What should I do now?`)); // (A)
cat.onLeave('playing', () => console.log('that was fun')); // (B)
cat.state(); // 'playing'
cat.state('bored'); // (B) gets called before (A)
```

Note that when you set a new state, a promise is returned. That promise would be resolved once all handlers are done with their business. So, if the state switch wouldn't be complete without some async operation, just return a promise that resolves when the operation ends.

Arbitrary number of arguments can be supplied to handlers. Both `onEnter` and `onLeave` handlers would get those.

```javascript
cat.onEnter('sleeping', (location) => console.log(`The cat is sleeping on the ${location}`));
cat.state('sleeping', 'sofa'); // The cat is sleeping on the sofa
```

Switching the state in the handler

```javascript
cat.onEnter('eating', () => delay().then(() => {
  cat.state('bored');
}));
```

You can change the state from handlers. However, ambiguous state changes would result in an error so don't do this:

```javascript
cat.onEnter('sleeping', () => delay().then(() => {
  cat.state('bored');
}));
cat.onEnter('sleeping', () => delay().then(() => {
  cat.state('playing');
}));
cat.state('sleeping'); // This will cause an arror
```

You can remove that problem altogether, by setting `passiveMode = true` in options argument. This forbids setting state during a state switch.

```javascript
const stuffedCat = new StatefulObject(['on the shelf', 'on the windowsill', undefined, {passiveMode:true});

stuffedCat.onEnter('on the windowsill', () => stuffedCat.state('on the shelf')); // This would cause an error
stuffedCat.state('on the windowsill');

stuffedCat.state('on the windowsill').then(() => stuffedCat.state('on the shelf')); // This would work
```



