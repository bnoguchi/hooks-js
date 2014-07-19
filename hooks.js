var _ = require('underscore');

(function (){
  // TODO: Add in pre and post skipping options
  module.exports = {
    /**
     *  Declares a new hook to which you can add pres and posts
     *  @param {String} name of the function
     *  @param {Function} originalFunction The function being wrappped in middleware
     *  @param {Function} errorCb The error handler callback
     */
    hook: function (name, originalFunction, errorCb) {
      var proto = this.prototype || this,
          pres = proto._pres = proto._pres || {},
          posts = proto._posts = proto._posts || {};

      pres[name] = pres[name] || [];
      posts[name] = posts[name] || [];

      proto[name] = proto[name] || function () {
        console.info(this.getGuid()+' calls '+name);

        // This part here is weird for two reasons:
        // 1. We can't simply declare members like this.LastArgument, because
        //    then all hooks would share the same LastArgument member. This is to say
        //    that all functions being hooked would share the same members on the object.
        // 2. We can't simply declare members like this[name].lastArgument, because
        //    then all instances of the class share the same instance of the function this[name].
        //    So, if ever two instances were both using the function at the same time, their
        //    instance variables would collide.
        // So, all instances and all instance methods being hooked get their own namespace, such as
        // this[name+'InstanceVariableName']
        this[name+'LastArgument'] = arguments[arguments.length-1]; //Callback to original function
        this[name+'LastArgument'].guid = this.getGuid();
        this[name+'HookArgs'] = undefined; // arguments eventually passed to the hooks - are mutable
        this[name+'CurrentPreHookCounter'] = -1;
        this[name+'CurrentPostHookCounter'] = -1;

        return preNext.apply(this, arguments);
      };
      proto.totalPreHooks = proto.totalPreHooks || function (name){
        return this.getPreHooks(name).length;
      };
      proto.totalPostHooks = proto.totalPostHooks || function (name){
        return this.getPostHooks(name).length;
      };
      proto.getPreHooks = proto.getPreHooks || function (name){
        return this._pres[name];
      };
      proto.getPostHooks = proto.getPostHooks || function (name){
        return this._posts[name];
      };
      proto.thereArePreHooks = proto.thereArePreHooks || function (name){
        return this._pres[name].length > 0;
      };
      proto.thereArePostHooks = proto.thereArePostHooks || function (name){
        return this._posts[name].length > 0;
      };
      var postNext = function () {
        console.info(this.getGuid()+' calls '+name+' postNext');
        if (arguments[0] instanceof Error) {
          return handleError.call(this, arguments[0]);
        }
        var self = this,
            args_ = Array.prototype.slice.call(arguments, 1), //get all args except the first one since fist arg is left for error
            currentPostFunction,
            postArgs;

        if (args_.length > 0){
          self[name+'HookArgs'] = args_;
        }

        ++self[name+'currentPostHookCounter']; // counter starts at -1
        if (self[name+'currentPostHookCounter'] < self.totalPostHooks(name)) {
          currentPostFunction = self.getPostHooks(name)[self[name+'currentPostHookCounter']];

          var currentPostFunctionArgumentsCount = currentPreFunction.length;
          if (currentPostFunctionArgumentsCount < 1){
            //The arguments of the hook function doesn't have sufficient arguments
            //  Any pre or post hook needs at least 1 argument for the function self must be
            //  called next.
            throw new Error("Your post must have a next argument -- e.g., function (next, ...)");
          }

          postArgs = [postNext].concat(self[name+'HookArgs']);
          console.info(this.getGuid()+' calls '+name+' currentPostFunction');
          return currentPostFunction.apply(self, postArgs);
        } else if (_.isFunction(self[name+'LastArgument'])){
          // All post handlers are done, call original callback function
          console.info(this.getGuid()+' calls '+name+' lastArgument');
          console.assert(self[name+'LastArgument'].guid === self.getGuid(), self[name+'LastArgument'].guid+' does not equal '+self.getGuid());
          return self[name+'LastArgument'].apply(self, arguments);
        }
      };
      var preDone = function () {
        console.info(this.getGuid()+' calls '+name+' preDone');
        var self = this,
            args_ = Array.prototype.slice.call(arguments); //Should stil be the arguments to the original function

        // // We are assuming self if the last argument provided to the original
        // // function is a function, it was expecting a callback. 
        // // We trap self callback and wait to call it until all post handlers have finished.
        // if(_.isFunction(self[name+'LastArgument'])){
        //   // replace lastArgument with postNext in the args array
        //   // Above, we have preserved the lastArgument.
        //   args_[args_.length - 1] = function (){
        //     console.info(self.getGuid()+' preDone calls '+name+' postNext');
        //     return postNext.apply(self, arguments); //post hooks get no arguments
        //   };
        // }

        if (!self.thereArePostHooks(name) && _.isFunction(self[name+'LastArgument'])){
          console.info(this.getGuid()+' calls '+name+' originalFunction with callback');
          originalFunction.call(self, function (){
            console.info(self.getGuid()+' preDone calls '+name+' postNext');
            postNext.apply(self, arguments);
          });
        }else{ //originalFunction does not take a callback
          // no callback provided --> execute postNext() manually
          console.info(this.getGuid()+' calls '+name+' originalFunction without callback');
          originalFunction.apply(self, args_);
          postNext.apply(self, arguments);
        }
      };
      var handleError = function (err) {
        console.info(this.getGuid()+' calls '+name+' handleError');
        var self = this;
        if (errorCb){
          errorCb.apply(self, [err]);

          // If the original function took a callback as the last argument
          if(_.isFunction(self[name+'LastArgument'])){
            console.info(this.getGuid()+' calls '+name+' ERROR lastArgument');
            self[name+'LastArgument'](err);
          }
        }else if (_.isFunction(self[name+'LastArgument'])){
          console.info(this.getGuid()+' calls '+name+' ERROR lastArgument');
          return self[name+'LastArgument'](err);
        }else {
          throw err;
        }
      };
      var preNext = function () {
        console.info(this.getGuid()+' calls '+name+' preNext');
        if (arguments[0] instanceof Error) {
          return handleError.call(this, arguments[0]);
        }
        var self = this,
            originalFunctionArguments = Array.prototype.slice.call(arguments),
            currentPreFunction,
            preArgs;

        // I'm not sure what the point of this is...
        if (originalFunctionArguments.length > 0 && arguments[0] !== null && !_.isFunction(self[name+'LastArgument'])){
          self[name+'HookArgs'] = originalFunctionArguments;
        }

        ++self[name+'currentPreHookCounter']; // counter starts at -1
        if (self[name+'currentPreHookCounter'] < self.totalPreHooks(name)) {
          currentPreFunction = self.getPreHooks(name)[self[name+'currentPreHookCounter']];

          var currentPreFunctionArgumentsCount = currentPreFunction.length;
          if (currentPreFunctionArgumentsCount < 1){
            //The arguments of the hook function doesn't have sufficient arguments
            //  Any pre or post hook needs at least 1 argument for the function self must be
            //  called next.
            throw new Error("Your pre must have a next argument -- e.g., function (next, ...)");
          }

          preArgs = [preNext].concat(self[name+'HookArgs']);
          return currentPreFunction.apply(self, preArgs);
        }else{
          preDone.apply(self, originalFunctionArguments);
        }
      };

      return this;
    },

    pre: function (name, fn) {
      var proto = this.prototype || this,
          pres = proto._pres = proto._pres || {};

      this._lazySetupHooks(proto, name);

      pres[name] = pres[name] || [];
      pres[name].push(fn);
      return this;
    },
    post: function (name, fn) {
      var proto = this.prototype || this,
          posts = proto._posts = proto._posts || {};

      this._lazySetupHooks(proto, name);
      posts[name] = posts[name] || [];
      posts[name].push(fn);
      return this;
    },
    _lazySetupHooks: function (proto, methodName) {
      this.hook(methodName, proto[methodName]);
    },
    removePost: function (name, fnToRemove) {
      var proto = this.prototype || this,
          posts = proto._posts || (proto._posts || {});
      if (!posts[name]) return this;
      if (arguments.length === 1) {
        // Remove all post callbacks for hook `name`
        posts[name].length = 0;
      } else {
        posts[name] = posts[name].filter( function (currFn) {
          return currFn !== fnToRemove;
        });
      }
      return this;
    },
    removePre: function (name, fnToRemove) {
      var proto = this.prototype || this,
          pres = proto._pres || (proto._pres || {});
      if (!pres[name]) return this;
      if (arguments.length === 1) {
        // Remove all pre callbacks for hook `name`
        pres[name].length = 0;
      } else {
        pres[name] = pres[name].filter( function (currFn) {
          return currFn !== fnToRemove;
        });
      }
      return this;
    }
  };
})();