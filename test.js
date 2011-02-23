var hooks = require('./hooks')
  , should = require('should')
  , assert = require('assert')
  , _ = require('underscore');

// TODO Add in test for making sure all pres get called if pre is defined directly on an instance.
module.exports = {
  'should be able to assign multiple hooks at once': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook({
      hook1: function (a) {},
      hook2: function (b) {}
    });
    var a = new A();
    assert.equal(typeof a.hook1, 'function');
    assert.equal(typeof a.hook2, 'function');
  },
  'should run without pres and posts when not present': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    var a = new A();
    a.save();
    a.value.should.equal(1);
  },
  'should run with pres when present': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.pre('save', function (next) {
      this.preValue = 2;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(1);
    a.preValue.should.equal(2);
  },
  'should run with posts when present': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.post('save', function (next) {
      this.value = 2;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(2);
  },
  'should run pres and posts when present': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.pre('save', function (next) {
      this.preValue = 2;
      next();
    });
    A.post('save', function (next) {
      this.value = 3;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(3);
    a.preValue.should.equal(2);
  },
  'should run posts after pres': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.pre('save', function (next) {
      this.override = 100;
      next();
    });
    A.post('save', function (next) {
      this.override = 200;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(1);
    a.override.should.equal(200);
  },
  'should not run a hook if a pre fails': function () {
    var A = function () {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function () {
      this.value = 1;
    }, function (err) {
      counter++;
    });
    A.pre('save', function (next, done) {
      next(new Error());
    }, true);
    var a = new A();
    a.save();
    counter.should.equal(1);
    assert.equal(typeof a.value, 'undefined');
  },
  'should be able to run multiple pres': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.pre('save', function (next) {
      this.v1 = 1;
      next();
    }).pre('save', function (next) {
      this.v2 = 2;
      next();
    });
    var a = new A();
    a.save();
    a.v1.should.equal(1);
    a.v2.should.equal(2);
  },
  'should run multiple pres until a pre fails and not call the hook': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.pre('save', function (next) {
      this.v1 = 1;
      next();
    }).pre('save', function (next) {
      next(new Error());
    }).pre('save', function (next) {
      this.v3 = 3;
      next();
    });
    var a = new A();
    a.save();
    a.v1.should.equal(1);
    assert.equal(typeof a.v3, 'undefined');
    assert.equal(typeof a.value, 'undefined');
  },
  'should be able to run multiple posts': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.post('save', function (next) {
      this.value = 2;
      next();
    }).post('save', function (next) {
      this.value = 3.14;
      next();
    }).post('save', function (next) {
      this.v3 = 3;
      next();
    });
    var a = new A();
    a.save();
    assert.equal(a.value, 3.14);
    assert.equal(a.v3, 3);
  },
  'should run only posts up until an error': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 1;
    });
    A.post('save', function (next) {
      this.value = 2;
      next();
    }).post('save', function (next) {
      this.value = 3;
      next(new Error());
    }).post('save', function (next) {
      this.value = 4;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(3);
  },
  'should default to the hook method as the error handler': function () {
    var A = function () {};
    _.extend(A, hooks);
    var counter = 0;
    A.hook('save', function (err) {
      if (err instanceof Error) counter++;
      this.value = 1;
    });
    A.pre('save', function (next, done) {
      next(new Error());
    }, true);
    var a = new A();
    a.save();
    counter.should.equal(1);
    assert.equal(typeof a.value, 'undefined');
  },
  'should not run any posts if a pre fails': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('save', function () {
      this.value = 2;
    });
    A.pre('save', function (next) {
      this.value = 1;
      next(new Error());
    }).post('save', function (next) {
      this.value = 3;
      next();
    });
    var a = new A();
    a.save();
    a.value.should.equal(1);
  },
  "can pass the hook's arguments verbatim to pres": function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val) {
      this[path] = val;
    });
    A.pre('set', function (next, path, val) {
      path.should.equal('hello');
      val.should.equal('world');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    a.hello.should.equal('world');
  },
//  "can pass the hook's arguments as an array to pres": function () {
//    // Great for dynamic arity - e.g., slice(...)
//    var A = function () {};
//    _.extend(A, hooks);
//    A.hook('set', function (path, val) {
//      this[path] = val;
//    });
//    A.pre('set', function (next, hello, world) {
//      hello.should.equal('hello');
//      world.should.equal('world');
//      next();
//    });
//    var a = new A();
//    a.set('hello', 'world');
//    assert.equal(a.hello, 'world');
//  },
  "can pass the hook's arguments verbatim to posts": function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val) {
      this[path] = val;
    });
    A.post('set', function (next, path, val) {
      path.should.equal('hello');
      val.should.equal('world');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    assert.equal(a.hello, 'world');
  },
//  "can pass the hook's arguments as an array to posts": function () {
//    var A = function () {};
//    _.extend(A, hooks);
//    A.hook('set', function (path, val) {
//      this[path] = val;
//    });
//    A.post('set', function (next, halt, args) {
//      assert.equal(args[0], 'hello');
//      assert.equal(args[1], 'world');
//      next();
//    });
//    var a = new A();
//    a.set('hello', 'world');
//    assert.equal(a.hello, 'world');
//  },
  "pres should be able to modify and pass on a modified version of the hook's arguments": function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val) {
      this[path] = val;
      assert.equal(arguments[2], 'optional');
    });
    A.pre('set', function (next, path, val) {
      next('foo', 'bar');
    });
    A.pre('set', function (next, path, val) {
      assert.equal(path, 'foo');
      assert.equal(val, 'bar');
      next('rock', 'says', 'optional');
    });
    A.pre('set', function (next, path, val, opt) {
      assert.equal(path, 'rock');
      assert.equal(val, 'says');
      assert.equal(opt, 'optional');
      next();
    });
    var a = new A();
    a.set('hello', 'world');
    assert.equal(typeof a.hello, 'undefined');
    a.rock.should.equal('says');
  },
  'posts should see the modified version of arguments if the pres modified them': function () {
    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val) {
      this[path] = val;
    });
    A.pre('set', function (next, path, val) {
      next('foo', 'bar');
    });
    A.post('set', function (next, path, val) {
      path.should.equal('foo');
      val.should.equal('bar');
    });
    var a = new A();
    a.set('hello', 'world');
    assert.equal(typeof a.hello, 'undefined');
    a.foo.should.equal('bar');
  },
  'should pad missing arguments (relative to expected arguments of the hook) with null': function () {
    // Otherwise, with hookFn = function (a, b, next, ),
    // if we use hookFn(a), then because the pre functions are of the form
    // preFn = function (a, b, next, ), then it actually gets executed with
    // preFn(a, next, ), so when we call next() from within preFn, we are actually
    // calling ()

    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val, opts) {
      this[path] = val;
    });
    A.pre('set', function (next, path, val, opts) {
      next('foo', 'bar');
      assert.equal(typeof opts, 'undefined');
    });
    var a = new A();
    a.set('hello', 'world');
  },

  'should not invoke the target method until all asynchronous middleware have invoked dones': function () {
    var counter = 0;
    var A = function () {};
    _.extend(A, hooks);
    A.hook('set', function (path, val) {
      counter++;
      this[path] = val;
      counter.should.equal(7);
    });
    A.pre('set', function (next, path, val) {
      counter++;
      next();
    });
    A.pre('set', function (next, done, path, val) {
      counter++;
      setTimeout(function () {
        counter++;
        done();
      }, 1000);
      next();
    }, true);
    A.pre('set', function (next, path, val) {
      counter++;
      next();
    });
    A.pre('set', function (next, done, path, val) {
      counter++;
      setTimeout(function () {
        counter++;
        done();
      }, 500);
      next();
    }, true);
    var a = new A();
    a.set('hello', 'world');
  }
};
