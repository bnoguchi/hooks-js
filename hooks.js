/**
 * Hooks are useful if we want to add a method that automatically has `pre` and `post` hooks.
 * For example, it would be convenient to have `pre` and `post` hooks for `save`.
 * _.extend(Model, mixins.hooks);
 * Model.hook('save', function () {
 *  console.log('saving');
 * });
 * Model.pre('save', function (next, done) {
 *  console.log('about to save');
 *  next();
 * });
 * Model.post('save', function (next, done) {
 *  console.log('saved');
 *  next();
 * });
 *
 * var m = new Model();
 * m.save();
 * // about to save
 * // saving
 * // saved 
 */

// TODO Add in pre and post skipping options
module.exports = {
  /**
   *  Declares a new hook to which you can add pres and posts
   *  @param {String} name of the function
   *  @param {Function} the method
   *  @param {Function} the error handler callback
   */
  hook: function (name, fn, err) {
    if (arguments.length === 1 && typeof name === 'object') {
      for (var k in name) { // `name` is a hash of hookName->hookFn
        this.hook(k, name[k]);
      }
      return;
    }

    if (!err) err = fn;

    var proto = this.prototype || this
      , pres = proto._pres = proto._pres || {}
      , posts = proto._posts = proto._posts || {};
    pres[name] = pres[name] || [];
    posts[name] = posts[name] || [];

    function noop () {}

    // NEW CODE
    proto[name] = function () {
      var self = this
        , pres = this._pres[name]
        , posts = this._posts[name]
        , numAsyncPres = 0
        , hookArgs = [].slice.call(arguments)
        , preChain = pres.map( function (pre, i) {
            var wrapper = function () {
              if (arguments[0] instanceof Error)
                return err(arguments[0]);
              if (numAsyncPres) {
                // arguments[1] === asyncComplete
                if (arguments.length)
                  hookArgs = [].slice.call(arguments, 2);
                pre.apply(self, 
                  [ preChain[i+1] || allPresInvoked, 
                    asyncComplete
                  ].concat(hookArgs)
                );
              } else {
                if (arguments.length)
                  hookArgs = [].slice.call(arguments);
                pre.apply(self,
                  [ preChain[i+1] || allPresDone ].concat(hookArgs));
              }
            }; // end wrapper = function () {...
            if (wrapper.isAsync = pre.isAsync)
              numAsyncPres++;
            return wrapper;
          }); // end posts.map(...)
      function allPresInvoked () {
        if (arguments[0] instanceof Error)
          err(arguments[0]);
      }

      function allPresDone () {
        if (arguments[0] instanceof Error)
          return err(arguments[0]);
        if (arguments.length)
          hookArgs = [].slice.call(arguments);
        fn.apply(self, hookArgs);
        var postChain = posts.map( function (post, i) {
          var wrapper = function () {
            if (arguments[0] instanceof Error)
              return err(arguments[0]);
            if (arguments.length)
              hookArgs = [].slice.call(arguments);
            post.apply(self,
              [ postChain[i+1] || noop].concat(hookArgs));
          }; // end wrapper = function () {...
          return wrapper;
        }); // end posts.map(...)
        if (postChain.length) postChain[0]();
      }

      if (numAsyncPres) {
        complete = numAsyncPres;
        function asyncComplete () {
          if (arguments[0] instanceof Error)
            return err(arguments[0]);
          --complete || allPresDone.call(this);
        }
      }
      (preChain[0] || allPresDone)();
    };

//    proto[name] = function () {
//      var self = this
//        , hookArgs // arguments eventually passed to the hook - are mutable
//        , pres = this._pres[name]
//        , posts = this._posts[name]
//        , _total = pres.length
//        , _current = -1
//        , _next = function () {
//            var _args = Array.prototype.slice.call(arguments)
//              , currPre
//              , preArgs;
//            if (_args.length) hookArgs = _args;
//            if (++_current < _total) {
//              currPre = pres[_current]
//              if (currPre.length < 2) throw new Error("Your pre must have next and done arguments -- e.g., function (next, done, ...)");
//              preArgs = [_next, _done].concat( (currPre.length === 3) ? [hookArgs] : hookArgs);
//              return currPre.apply(self, preArgs);
//            } else return _done.apply(self, [null].concat(hookArgs));
//          }
//        , _done = function () {
//            var err = arguments[0]
//              , args_ = Array.prototype.slice.call(arguments, 1)
//              , ret, total_, current_, next_, done_, postArgs;
//            if (_current === _total) {
//              ret = fn.apply(self, args_);
//              total_ = posts.length;
//              current_ = -1;
//              next_ = function () {
//                var args_ = Array.prototype.slice.call(arguments)
//                  , currPost
//                  , postArgs;
//                if (args_.length) hookArgs = args_;
//                if (++current_ < total_) {
//                  currPost = posts[current_]
//                  if (currPost.length < 2) throw new Error("Your post must have next and done arguments -- e.g., function (next, done, ...)");
//                  postArgs = [next_, done_].concat( (currPost.length ===3) ? [hookArgs] : hookArgs);
//                  return posts[current_].apply(self, postArgs);
//                }
//                else return done_();
//              };
//              done_ = function () { return ret; };
//              if (total_) return next_();
//              return ret;
//            }
//          };
//      return _next.apply(this, arguments);
//    };
    return this;
  },
  pre: function (name, fn, isAsync) {
    var proto = this.prototype
      , pres = proto._pres = proto._pres || {};
    fn.isAsync = isAsync;
    (pres[name] = pres[name] || []).push(fn);
    return this;
  },
  post: function (name, fn, isAsync) {
    var proto = this.prototype
      , posts = proto._posts = proto._posts || {};
    (posts[name] = posts[name] || []).push(fn);
    return this;
  }
};
