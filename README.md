hooks
============

Add pre and post middleware hooks to your JavaScript methods.

## Installation
    npm install hooks

## Motivation
Suppose you have a JavaScript object with a `save` method.

It would be nice to be able to declare code that runs before `save` and after `save`.
For example, you might want to run validation code before every `save`,
and you might want to dispatch a job to a background job queue after `save`.

One might have an urge to hard code this all into `save`, but that turns out to
couple all these pieces of functionality (validation, save, and job creation) more
tightly than is necessary. For example, what if someone does not want to do background
job creation after the logical save.

It is nicer to tack on functionality using what we call `pre` and `post` hooks. These
are functions that you define and that you direct to execute before or after particular
methods.

## Example
We can use `hooks` to add validation and background jobs in the following way:
    var hooks = require('hooks')
      , Model = require('./path/to/some/model/with/save');

    // Add hooks' methods: `hook`, `pre`, and `post`    
    for (var k in hooks) {
      Model.prototype[k] = hooks[k];
    }

    Model.hook('save', Model.prototype.save);

    Model.pre('save', function validate (next, halt) {
      if (this.isValid()) next();
      else halt();
    });

    Model.post('save', function createJob (next, halt) {
      this.sendToBackgroundQueue();
    });

## Pres and Posts as Middleware
We structure pres and posts as middleware to give you maximum flexibility:

1. You can define **multiple** pres (or posts) for a single method.
2. These pres (or posts) are then executed as a chain of methods.
3. Any functions in this middleware chain can choose to halt the chain's execution. If this occurs, then none of the other middleware in the chain will execute, and the main method (e.g., `save`) will not execute. This is nice, for example, when we don't want a document to save if it is invalid.

## Defining multiple pres (or posts)
`pre` is chainable, so you can define multiple pres via:
    Model.pre('save', function (next, halt) {
      console.log("hello");
      next();
    }).pre('save', function (next, halt) {
      console.log("world");
      next();
    });

## Mutating Arguments via Middleware
`pre` and `post` middleware can also accept the intended arguments for the method
they augment. This is useful if you want to mutate the arguments before passing
them along to the next middleware and eventually pass a mutated arguments list to
the main method itself.

As a simple example, let's define a method `set` that just sets a key, value pair.
If we want to namespace the key, we can do so by adding a `pre` middleware hook
that runs before `set`, alters the arguments, and passes them onto `set`:
    Document.hook('set', function (path, val) {
      this[path] = val;
    });
    Document.pre('set', function (next, halt, path, val) {
      next('namespace-' + path, val);
    });
    var doc = new Document();
    doc.set('hello', 'world');
    console.log(doc.hello); // undefined
    console.log(doc['namespace-hello']); // 'world'

As you can see above, we pass arguments via `next`.

Sometimes, the meaning of arguments changes depending on how many arguments there are
and/or what the argument types are. You can handle this in the following way:
    Document.pre('set', function (next, halt, args) {
      // args is the array of arguments
      if (args.length === 1) {
        // Handle scenario where only 1 arguments is passed
      } else if (args.length === 2) {
        // Handle scenario where 2 arguments are passed
      } else {
        // Handle other arguments.length scenarios
      }
    });

## Tests
To run the tests:
    make test

### Contributors
- [Brian Noguchi](https://github.com/bnoguchi)

### License
MIT License

---
### Author
Brian Noguchi
