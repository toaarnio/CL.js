// **CL.js** is a lightweight utility wrapper for **WebCL**.  It relieves the developer from writing
// most of the boilerplate code that is otherwise required to get anything running, while preserving
// the class structure and function names of WebCL.
//
// CL.js is tested on the Nokia WebCL implementation only.  Any contributions to help make it work
// on other implementations would be most welcome!
//
// This documentation is generated from the [source code](http://github.com/toaarnio/CL.js) of CL.js
// using [Docco](jashkenas.github.io/docco/).  Please visit http://webcl.nokiaresearch.com for
// demos, tutorials, and more information on WebCL.
//
// ## Example ##
//
// To get started, we need to include CL.js from our HTML source:
//
//     <script type="text/javascript" src="/path/to/CL.js"></script>
//
// This creates a global singleton `CL` object and initializes it with a number of useful static
// properties and functions.  Most importantly, the `CL.DEVICES` array contains all WebCL Devices
// that are available in the system.  Now, let's create the WebCL resources that we're going to need
// in this example:
// 
//     var src = CL.loadSource('kernels/random.cl');
//     for (var d=0; d < CL.DEVICES.length; d++) {
//       var ctx = webcl.createContext(CL.DEVICES[d]);
//       ctx.buffer = ctx.createBuffer(CL.MEM_READ_WRITE, 1024*1024);
//       ctx.queue = ctx.createCommandQueue();
//       ctx.kernel = ctx.build(src);
//       CL.DEVICES[d].context = ctx;
//     }
//
// This produces a WebCL Context for each Device, and one CommandQueue, Buffer, and Kernel for each
// Context.  Now, let's proceed to run the Kernel on each Device in turn, reading back the results
// into a 1-megabyte ArrayBuffer:
//
//     var randomNumbers = new Uint8Array(1024*1024);
//     for (var d=0; d < CL.DEVICES.length; d++) {
//        var ctx = CL.DEVICES[d].context;
//        ctx.kernel.setArgs(ctx.results);
//        ctx.queue.enqueueKernel(ctx.kernel, [randomNumbers.length]);
//        ctx.queue.enqueueRead(ctx.buffer, randomNumbers);
//        queue.finish();
//        /* Do something with the randomNumbers array */
//     }
//

/*
 * CL.js is written by Tomi Aarnio of Nokia Research Tampere, and
 * licensed under the Mozilla Public License 2.0 (see LICENSE).
 */

//"use strict"

(function createCL() {

  // ## The CL API ##
  //
  // The global singleton `CL` object contains static properties and functions.

  CL = {};

  // ### CL.REVISION ###
  //
  // The current revision number. The number is increased every time a potentially backward
  // compatibility breaking change is introduced to the API.
  //
  CL.REVISION = 1;

  // ### CL.PLATFORMS ###
  //
  // An array of all WebCLPlatforms that are present in this system, as discovered at startup.  Each
  // Platform typically contains one or more Devices, but it may also happen that all devices on a
  // particular platform are powered down or otherwise not available.
  //
  CL.PLATFORMS = [];

  // ### CL.DEVICES ###
  //
  // An array of all WebCLDevices that are actually available in this system, as discovered at
  // startup.  Each Device belongs to exactly one Platform.  Devices that are powered down or
  // otherwise not available are not included.  Applications should be prepared for the possibility
  // that there are no devices available at all.
  //
  CL.DEVICES = [];

  // ### CL.loadSource() ###
  // 
  // Loads a kernel source code file from the given `uri` via http GET, with a random query string
  // appended to the uri to avoid obsolete copies getting served from some proxy or cache.  The
  // given `uri` must have the suffix `.cl`.  Uses async XHR if a `callback` function is given.  If
  // loading succeeds, returns the source code as the function return value (in synchronous mode),
  // or passes it to the callback function (in async mode).  If anything goes wrong, throws an
  // exception or passes `null` to the given `callback`.
  //
  CL.loadSource = function(uri, callback) {
    var validURI = (typeof(uri) === 'string') && uri.endsWith('.cl');
    if (validURI) {
      return xhrLoad(uri, callback);
    } else {
      throw "CL.loadSource: invalid URI.";
    }
  };

  // ### CL.enumString() ###
  //
  // Returns the human-readable string representation of the given WebCL enumerated value. For
  // example, `CL.enumString(-10)` will return the string `"IMAGE_FORMAT_NOT_SUPPORTED"`.
  //
  CL.enumString = function(enumValue) {
    for (var e in CL) {
      if (CL[e] === enumValue) {
        return e;
      }
    }
  };

  // ## Initialization ##
  //
  // Extends the built-in WebCL class prototypes with convenience wrappers and fills in the CL
  // global object with system info.  Also removes deprecated functions and enums.
  //
  (function augmentWebCL() {
    setEnums(CL);
    setSystemInfo(CL.PLATFORMS, CL.DEVICES);
    deleteDeprecated();

    // ### WebCLPlatform ###
    //
    (function augmentWebCLPlatform() {
      WebCLPlatform.prototype.getExtensions = function() {
        return this.getInfo(CL.PLATFORM_EXTENSIONS).split(' ').filter(function(v) { 
          return (v.length > 0);
        });
      };
    })();

    // ### WebCLDevice ###
    //
    (function augmentWebCLDevice() {
      WebCLDevice.prototype.getExtensions = function() {
        return this.getInfo(CL.DEVICE_EXTENSIONS).split(' ').filter(function(v) { 
          return (v.length > 0);
        });
      };
    })();

    // ### WebCLCommandQueue ###
    //
    (function augmentWebCLCommandQueue() {

      WebCLCommandQueue.prototype.enqueueWrite = function(dstBuffer, srcArray) {
        var numBytes = Math.min(dstBuffer.getInfo(WebCL.MEM_SIZE), srcArray.byteLength);
        console.log("enqueueWrite(" + this._name + ":" + this._identity + ", " +
                    dstBuffer._name + ":" + dstBuffer._identity + ", false, 0, " + numBytes + ", " + srcArray + ")");
        var event = this.enqueueWriteBuffer.call(this, dstBuffer, false, 0, numBytes, srcArray);
        return event;
      };

      WebCLCommandQueue.prototype.enqueueRead = function(srcBuffer, dstArray) {
        var numBytes = Math.min(srcBuffer.getInfo(WebCL.MEM_SIZE), dstArray.byteLength);
        console.log("enqueueRead(" + this._name + ":" + this._identity + ", " +
                    srcBuffer._name + ":" + srcBuffer._identity + ", false, 0, " + numBytes + ", " + dstArray + ")");
        var event = this.enqueueReadBuffer.call(this, srcBuffer, false, 0, numBytes, dstArray);
        return event;
      };

      WebCLCommandQueue.prototype.enqueueKernel = function(kernel, globalws, localws) {
        var localws = (typeof localws === 'number') ? [localws] : (localws || null);
        var globalws = (typeof globalws === 'number') ? [globalws] : globalws;
        console.log("enqueueKernel(" + this._name + ":" + this._identity + ", " +
                    kernel.name + ":" + kernel._identity, globalws.length, null, globalws, localws, ")");
        var event = this.enqueueNDRangeKernel.call(this, kernel, globalws.length, null, globalws, localws);
        return event;
      };

    })();

    // ### WebCLKernel ###
    //
    (function augmentWebCLKernel() {
      WebCLKernel.prototype.name = null;
      WebCLKernel.prototype.numArgs = 0;

      function ui32(value) {
        this.buf = this.buf || new Uint32Array(1);
        this.buf[0] = value;
        return this.buf;
      }

      function f32(value) {
        this.buf = this.buf || new Float32Array(1);
        this.buf[0] = value;
        return this.buf;
      }

      // Convenience wrapper for setArg that allows setting all
      // arguments of a kernel at once.
      //
      WebCLKernel.prototype.setArgs = function() {
        console.log(this.name + ": ");
        console.log("  expected args: " + this.numArgs);
        console.log("  received args: " + arguments.length);
        for (var i=0; i < arguments.length; i++) {
          var value = arguments[i];
          console.log("  ["+i+"]: " + value + ":" + value._identity);
          if (typeof value === 'number') {
            value = Math.floor(value) === value ? ui32(value) : f32(value);
          }
          this.setArg(i, value);
        }
      };

    })();

  })();

  ////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // ## Private helper functions ##

  // [PRIVATE] Retrieves the object by the given `name` from `theArray`.  Returns `null` if no
  // object by that name is found.  Will fail if `theArray` is not an Array or contains anything
  // else than CL.js objects.
  //
  function getFromArray(theArray, name) {
    theArray = theArray || [];
    var allMatching = theArray.filter(function(elem) { return elem.name === name; });
    return allMatching[0] || null;
  };

  // [PRIVATE] Removes all CL objects in `theArray` and releases their native resources.  Will fail
  // if `theArray` is not an Array or contains anything else than CL.js objects.
  //
  function clearArray(theArray) {
    theArray = theArray || [];
    theArray.forEach(function(elem) { elem.releaseAll(); delete elem; });
    theArray.length = 0;
  };

  // [PRIVATE] Removes the object by the given `name` from `theArray`, and releases the native CL
  // resources of that object.  Will fail if `theArray` is not an Array or contains anything else
  // than CL.js objects.
  //
  function removeFromArray(theArray, name) {
    theArray = theArray || [];
    for (var i=0; i < theArray.length; i++) {
      var theObject = theArray[i];
      if (theObject.name === name) {
        theObject.releaseAll();
        theArray.splice(i, 1);
      }
    }
  };

  // [PRIVATE] Loads the given `uri` via http GET. Uses async XHR if a `callback` function is given.
  // In synchronous mode, returns the http response text, or throws an exception in case of failure.
  // In async mode, returns `true` after dispatching the http request, and passes the http response,
  // or `null` in case of failure, as an argument to `callback`.
  //
  function xhrLoad(uri, callback) {
    var useAsync = callback && callback instanceof Function;
    var xhr = new XMLHttpRequest();
    if (useAsync) {
      xhr.timeout = 1000;
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(xhr.responseText);
          } else {
            callback(null);
          }
        }
      };
    }
    xhr.open("GET", uri + "?id="+ Math.random(), useAsync);
    xhr.send();
    if (!useAsync && xhr.status !== 200) {
      throw "CL.loadSource: failed to load " + uri;
    }
    return useAsync || xhr.responseText;
  };

  // [PRIVATE] Copies all WebCL enums to `theObject`.
  //
  function setEnums(theObject) {
    for (var enumName in WebCL) {
      if (typeof WebCL[enumName] === 'number') {
        if (enumName.indexOf("CL_") !== 0) {
          theObject[enumName] = WebCL[enumName];
        } 
      }
    }
  };

  // [PRIVATE] Fills in the given `platforms` and `devices` arrays.
  //
  function setSystemInfo(platforms, devices) {
    var numGPU = 0;
    var numCPU = 0;
    webcl.getPlatforms().forEach(function(platform) {
      platforms.push(platform);
      platform.vendor = platform.getInfo(CL.PLATFORM_VENDOR);
      platform.devices = [];
      platform.getDevices().forEach(function(device) {
        var isAvailable = device.getInfo(CL.DEVICE_AVAILABLE);
        var isCompilerAvailable = device.getInfo(CL.DEVICE_COMPILER_AVAILABLE);
        if (isAvailable && isCompilerAvailable) {
          device.isAvailable = true;
          device.platform = platform;
          device.name = device.getInfo(CL.DEVICE_NAME);
          device.version = device.getInfo(CL.DEVICE_VERSION);
          device.vendor = device.getInfo(CL.DEVICE_VENDOR);
          var type = device.getInfo(CL.DEVICE_TYPE);
          if (type === CL.DEVICE_TYPE_CPU) {
            device.type = 'CPU';
            device.id = 'CPU' + (numCPU++);
          } else {
            device.type = 'GPU';
            device.id = 'GPU' + (numGPU++);
          }
          platform.devices.push(device);
          devices.push(device);
        }
      });
    });
  };

  // [PRIVATE] Throws an exception with the given `msg` if `booleanResult` is false.
  //
  function expect(msg, booleanResult) {
    if (booleanResult !== true) {
      throw "Invalid Arguments: Expecting " + msg + ".";
    }
  };

  // [PRIVATE] Deletes all deprecated functions and enums from WebCL classes.
  //
  function deleteDeprecated() {

    var functions = [ 
      'getPlatformIDs',
      'createContextFromType',
      'getPlatformInfo',
      'getDeviceIDs',
      'getDeviceInfo',
      'createImage2D',
      'createImage3D',
      'createProgramWithSource',
      //'createProgramWithBinary',
      'getContextInfo',
      'enqueueMapBuffer',
      'enqueueMapImage',
      'enqueueUnmapMemObject',
      'enqueueTask',
      'getCommandQueueInfo',
      'getMemObjectInfo',
      'buildProgram',
      'getProgramInfo',
      'getProgramBuildInfo',
      'setKernelArg',
      'setKernelArgLocal',
      'getKernelInfo',
      'getKernelWorkGroupInfo',
      'getSamplerInfo',
      'getEventInfo',
      'getEventProfilingInfo',
      'releaseCLResources',
    ];

    [n for (n in window)].filter(function(name) { 
      return name.startsWith("WebCL"); 
    }).forEach(function(cname) {
      functions.forEach(function(fname) {
        if (window[cname].prototype) {
          delete window[cname].prototype[fname];
        } else {
          delete window[cname][fname];
        }
      });
    });

  };

})();

/** BEGIN LEGACY CODE **

// #### addCleanupWrappers ####
//
// Wraps a try-catch block around each function in `theObject`.
// Internal functions (prefixed by an underscore) are not wrapped.
//
// If an exception occurs in a wrapped function at runtime and the
// `CLEANUP` flag is set, all resources held by the host object of
// that function are automatically released. For example, if a
// call to `context.createBuffer` fails, all buffers and other
// resources held by `context` are released.
// 
// Similarly, if the `DEBUG` flag is set, an error message is
// displayed on the console before throwing the exception upwards
// in the call chain.
//
this.addCleanupWrappers = function(theObject, className) {

  var methodNames = [];
  for (var propertyName in theObject) {
    if (typeof theObject[propertyName] === 'function' && propertyName[0] == propertyName.toLowerCase()[0]) {
      methodNames.push(propertyName);
    }
  }
  for (var i=0; i < methodNames.length; i++) {
    var name = methodNames[i];
    var publicName = name;
    if (publicName.indexOf('_') !== 0) {
      self.addCleanupWrapper(theObject, publicName, className);
    }
  }

};

this.addCleanupWrapper = function(theObject, theFunction, className) {
  var publicFunc = theFunction;
  var privateFunc = '_'+publicFunc;
  theObject[privateFunc] = theObject[publicFunc];
  theObject[publicFunc] = makeTryCatchWrapper(theObject, publicFunc, privateFunc, className);
  //console.log("  wrapped", publicFunc, "over", privateFunc, "on", theObject);
};

function makeTryCatchWrapper(theObject, publicFunc, privateFunc, className) {
  var newFunction = function() {
    try {
      //console.log("Calling", privateFunc, "with args", arguments[0], "on object", theObject);
      return theObject[privateFunc].apply(theObject, arguments);
    } catch (e) {
      if (self.DEBUG) {
        var device = theObject.device || theObject.context.device;
        var version = device && device.version;
        var vendor = device && device.vendor;
        var name = device && device.name;
        console.log("WebCLException trapped by CL.js:");
        console.log("  "+className+"."+publicFunc, theObject[privateFunc]);
        console.log("  arguments: ", arguments);
        console.log("  object: ", theObject);
        console.log("  device: ", vendor, version, name);
        console.log("  message: ", e);
      }
      if (self.CLEANUP) {
        theObject.releaseAll();
      }
      throw className + "." + publicFunc + ": " + e;
    }
  };
  return newFunction;
};

var self = this;

};

/** END LEGACY CODE **/
