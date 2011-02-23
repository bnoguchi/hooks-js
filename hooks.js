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
  hook: function (name, fn, errorCb) {
    if (arguments.length === 1 && typeof name === 'object') {
      for (var k in name) { // `name` is a hash of hookName->hookFn
        this.hook(k, name[k]);
      }
      return;
    }

    if (!errorCb) errorCb = fn;

    var proto = this.prototype || this
      , pres = proto._pres = proto._pres || {}
      , posts = proto._posts = proto._posts || {};
    pres[name] = pres[name] || [];
    posts[name] = posts[name] || [];

    proto[name] = function () {
      var self = this
        , hookArgs // arguments eventually passed to the hook - are mutable
        , pres = this._pres[name]
        , posts = this._posts[name]
        , _total = pres.length
        , _current = -1
        , _asyncsLeft = proto[name].numAsyncPres
        , _next = function () {
            if (arguments[0] instanceof Error)
              return errorCb(arguments[0]);
            var _args = Array.prototype.slice.call(arguments)
              , currPre
              , preArgs;
            if (_args.length) hookArgs = _args;
            if (++_current < _total) {
              currPre = pres[_current]
              if (currPre.isAsync && currPre.length < 2)
                throw new Error("Your pre must have next and done arguments -- e.g., function (next, done, ...)");
              if (currPre.length < 1)
                throw new Error("Your pre must have a next argument -- e.g., function (next, ...)");
              preArgs = (currPre.isAsync
                          ? [_next, _asyncsDone]
                          : [_next]).concat(hookArgs);
              return currPre.apply(self, preArgs);
            } else if (!proto[name].numAsyncPres) {
              return _done.apply(self, hookArgs);
            }
          }
        , _done = function () {
            var args_ = Array.prototype.slice.call(arguments)
              , ret, total_, current_, next_, done_, postArgs;
            if (_current === _total) {
              ret = fn.apply(self, args_);
              total_ = posts.length;
              current_ = -1;
              next_ = function () {
                if (arguments[0] instanceof Error)
                  return errorCb(arguments[0]);
                var args_ = Array.prototype.slice.call(arguments, 1)
                  , currPost
                  , postArgs;
                if (args_.length) hookArgs = args_;
                if (++current_ < total_) {
                  currPost = posts[current_]
                  if (currPost.length < 1)
                    throw new Error("Your post must have a next argument -- e.g., function (next, ...)");
                  postArgs = [next_].concat(hookArgs);
                  return currPost.apply(self, postArgs);
                }
              };
              if (total_) return next_();
              return ret;
            }
          };
      if (_asyncsLeft) {
        function _asyncsDone () {
          --_asyncsLeft || _done.apply(self, hookArgs);
        }
      }
      return _next.apply(this, arguments);
    };
    
    proto[name].numAsyncPres = 0;

    return this;
  },

  pre: function (name, fn, isAsync) {
    var proto = this.prototype
      , pres = proto._pres = proto._pres || {};
    if (fn.isAsync = isAsync) {
      this.prototype[name].numAsyncPres++;
    }
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
