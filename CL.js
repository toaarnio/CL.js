// **CL.js** is a lightweight utility wrapper for **WebCL**.  It relieves the developer from writing
// most of the boilerplate code that is otherwise required to get anything running, while preserving
// the class structure and function names of WebCL.  The original, unmodified WebCL member functions
// remain accessible with their names prefixed by an underscore, e.g., `_createContext`.
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
// that are available in the system.  Now, let's create a new instance of `CL`:
//
//     var cl = new CL({ debug: true });
//
// With debug mode enabled, any exceptions will be reported on the console together with helpful
// information about the function and arguments that triggered the exception.  Next, let's create
// the WebCL resources that we're going to need in this example:
// 
//     var src = CL.loadSource('kernels/random.cl');
//     for (var d=0; d < CL.DEVICES.length; d++) {
//       var ctx = cl.createContext({ 
//         device: CL.DEVICES[d],
//         name: 'ctx'+d 
//       });
//       ctx.createBuffer({
//         size: 1024*1024,
//         name: 'results'
//       });
//       ctx.buildKernel({ source: src });
//       ctx.createCommandQueue({ name: 'theQueue' });
//     }
//
// This produces a WebCL Context for each Device, and one CommandQueue, Buffer, and Kernel for each
// Context.  Note that we assigned a plain-text `name` for each object.  This makes it easy to find
// the resources that we need later on.  The Kernel objects that we created are assigned the same
// name as the kernel function in `random.cl`.  For the purposes of this example, let's assume that
// the kernel function is called `rnd`. Now, let's proceed to run it on each Device in turn, reading
// back the results into a 1-megabyte ArrayBuffer:
//
//     var randomNumbers = new Uint8Array(1024*1024);
//     for (var d=0; d < CL.DEVICES.length; d++) {
//        var ctx = cl.getContext('ctx'+d);
//        var queue = ctx.getQueue('theQueue');
//        ctx.getKernel('rnd').setArgs('results');
//        queue.enqueueKernel('rnd', [randomNumbers.length]);
//        queue.enqueueReadBuffer('results', randomNumbers);
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
  // The global singleton `CL` object contains static properties and functions.  Instances of `CL`,
  // created with `new CL()` and denoted by `cl` in this documentation, contain dynamic properties
  // and functions.

  CL = function() { 

    // ### cl.ID ###
    //
    // A globally unique ID number identifying this instance.
    //
    this.ID = CL.COUNT++;

    // ### cl.contexts ###
    //
    // An array of all WebCLContexts that have been created by this particular CL instance.
    //
    this.contexts = [];
  };

  // ### CL.REVISION ###
  //
  // The current revision number. The number is increased every time a potentially backward
  // compatibility breaking change is introduced to the API.
  //
  CL.REVISION = 1;

  // ### CL.PLATFORMS ###
  //
  // An array of all WebCLPlatforms that are present in this system, as discovered at construction.
  // Each Platform typically contains one or more Devices, but it may also happen that all devices
  // on a particular platform are powered down or otherwise not available.
  //
  CL.PLATFORMS = [];

  // ### CL.DEVICES ###
  //
  // An array of all WebCLDevices that are actually available in this system, as discovered at
  // construction.  Each Device belongs to exactly one Platform.  Devices that are powered down orq
  // otherwise not available are not included.  Applications should be prepared for the possibility
  // that there are no devices available at all.
  //
  CL.DEVICES = [];

  // ### CL.COUNT ###
  //
  // Number of CL instances created so far.
  //
  CL.COUNT = 0;

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
  // Returns the human-readable string representation of the given
  // WebCL enumerated value. For example, `CL.enumString(-10)` will
  // return the string `"IMAGE_FORMAT_NOT_SUPPORTED"`.
  //
  CL.enumString = function(enumValue) {
    for (var e in CL) {
      if (CL[e] === enumValue) {
        return e;
      }
    }
  };

  // ## CL member functions and properties ##

  CL.prototype = {};

  // Preserve the original WebCL member functions, prefixed by an underscore.

  CL.prototype._getPlatforms = WebCL.getPlatforms;
  CL.prototype._createContext = WebCL.createContext;
  CL.prototype._getSupportedExtensions = WebCL.getSupportedExtensions;
  CL.prototype._enableExtension = WebCL.enableExtension;
  CL.prototype._releaseAll = WebCL.releaseAll;

  // Copy the static global CL properties for added convenience.
  
  CL.prototype.loadSource = CL.loadSource;
  CL.prototype.enumString = CL.enumString;
  CL.prototype.REVISION = CL.REVISION;
  CL.prototype.PLATFORMS = CL.PLATFORMS;
  CL.prototype.DEVICES = CL.DEVICES;

  // ### cl.createContext() ###
  // 
  // Creates a new Context for the given `devices` and assigns the given `name` to the newly created
  // context:
  //
  //     cl.createContext({ devices: [aDevice]
  //                        name: 'arbitraryName' });
  //
  // Example:
  //
  //     var cl = new CL();
  //     cl.createContext({ devices: [cl.devices[0]], name: 'foo' });
  //
  CL.prototype.createContext = function(parameters) {
    parameters = parameters || {};
    parameters.name = parameters.name || "context" + this.contexts.length.toString();
    parameters.devices = parameters.devices || [parameters.device || this.DEVICES[0]];
    delete parameters.device;
    expect("a valid and available Device", parameters.devices[0].isAvailable);

    console.log("CL.createContext: parameters.devices = ", parameters.devices);
    var ctx = this._createContext(parameters);
    ctx.name = parameters.name;
    ctx.device = parameters.devices[0];
    ctx.platform = ctx.device.platform;
    ctx.queues = [];
    ctx.buffers = [];
    ctx.programs = [];
    this.contexts.push(ctx);
    return ctx;
  };

  // ### cl.getContext() ###
  // 
  // Retrieves the Context by the given plain-text `name`, or null if no context by that name exists
  // on this CL instance.  See `cl.createContext` for how to assign a name to a context.
  //
  CL.prototype.getContext = function(name) {
    return getFromArray(this.contexts, name);
  };

  // ### cl.releaseAll() ###
  //
  // Releases all Contexts and their descendants created by this CL instance.
  //
  CL.prototype.releaseAll = function() {
    for (var i=0; i < this.contexts.length; i++) {
      this.contexts[i].releaseAll();
      delete this.contexts[i];
    }
    this.contexts.length = 0;
  };

  // Redefines the built-in WebCL class prototypes. Deprecated functions and enums are removed,
  // utility functions added, and standard member functions wrapped into more convenient form.
  //
  (function augmentWebCL() {
    getEnums(CL);
    getSystemInfo(CL.PLATFORMS, CL.DEVICES);
    deleteDeprecated();

    // ### WebCLPlatform ###
    //
    (function augmentWebCLPlatform() {
      WebCLPlatform.prototype._enableExtension = WebCLPlatform.prototype.enableExtension;
      WebCLPlatform.prototype._getDevices = WebCLPlatform.prototype.getDevices;
      WebCLPlatform.prototype._getInfo = WebCLPlatform.prototype.getInfo;
      WebCLPlatform.prototype._getSupportedExtensions = WebCLPlatform.prototype.getSupportedExtensions
      WebCLPlatform.prototype.getSupportedExtensions = function() {
        return this.getInfo(CL.PLATFORM_EXTENSIONS).split(' ').filter(function(v) { 
          return (v.length > 0);
        });
      };
    })();

    // ### WebCLDevice ###
    //
    (function augmentWebCLDevice() {
      WebCLDevice.prototype._enableExtension = WebCLDevice.prototype.enableExtension;
      WebCLDevice.prototype._getInfo = WebCLDevice.prototype.getInfo;
      WebCLDevice.prototype._getSupportedExtensions = WebCLDevice.prototype.getSupportedExtensions
      WebCLDevice.prototype.getSupportedExtensions = function() {
        return this.getInfo(CL.DEVICE_EXTENSIONS).split(' ').filter(function(v) { 
          return (v.length > 0);
        });
      };
    })();

    // ### WebCLContext ###
    //
    (function augmentWebCLContext() {

      WebCLContext.prototype._createBuffer = WebCLContext.prototype.createBuffer;
      WebCLContext.prototype._createCommandQueue = WebCLContext.prototype.createCommandQueue;
      WebCLContext.prototype._createImage = WebCLContext.prototype.createImage;
      WebCLContext.prototype._createProgram = WebCLContext.prototype.createProgram;
      WebCLContext.prototype._createSampler = WebCLContext.prototype.createSampler;
      WebCLContext.prototype._createUserEvent = WebCLContext.prototype.createUserEvent;
      WebCLContext.prototype._getInfo = WebCLContext.prototype.getInfo;
      WebCLContext.prototype._getSupportedImageFormats = WebCLContext.prototype.getSupportedImageFormats;
      WebCLContext.prototype._release = WebCLContext.prototype.release;
      WebCLContext.prototype._releaseAll = WebCLContext.prototype.releaseAll;

      var _createProgramWithBinary = WebCLContext.prototype.createProgramWithBinary;
      delete WebCLContext.prototype.createProgramWithBinary;

      WebCLContext.prototype.createCommandQueue = function(parameters) {
        if (this.name === undefined) {
          return this._createCommandQueue.apply(this, arguments);
        } else {
          parameters = parameters || {};
          var name = parameters.name || "queue" + this.queues.length.toString();
          var props = CL.PROFILE===true ? CL.QUEUE_PROFILING_ENABLE : null;
          var queue = this._createCommandQueue.call(this, this.device, props);
          queue.context = this;
          queue.name = name;
          queue.events = [];
          removeFromArray(this.queues, name);
          this.queues.push(queue);
          return queue;
        } 
      };

      WebCLContext.prototype.createBuffer = function createBuffer(parameters) {
        if (this.name === undefined) {
          return this._createBuffer.apply(this, arguments);
        } else {
          parameters = parameters || {};
          var name = parameters.name || "buffer" + this.buffers.length.toString();
          var byteLength = parameters.size || 1024;
          var memFlags = parameters.flags || CL.MEM_READ_WRITE;
          var buffer = this._createBuffer.call(this, memFlags, byteLength);
          buffer.flags = memFlags;
          buffer.size = byteLength;
          buffer.context = this;
          buffer.name = name;
          removeFromArray(this.buffers, name);
          this.buffers.push(buffer);
          return buffer;
        }
      };

      WebCLContext.prototype.createProgram = function createProgram(parameters) {
        if (this.name === undefined) {
          return this._createProgram.apply(this, arguments);
        } else {
          var props = {};
          parameters = parameters || {};
          var name = parameters.name || "program" + this.programs.length.toString();
          switch (typeof(parameters)) {
          case 'object':
            props.ptx = parameters.ptx;
            if (!props.ptx) {
              props.uri = parameters.uri;
              props.source = parameters.source || CL.loadSource(parameters.uri);
            }
            break;
          case 'string':
            props.uri = parameters.endsWith(".cl") ? parameters : null;
            props.source = parameters.endsWith(".cl") ? null : parameters;
            props.source = props.source || CL.loadSource(props.uri);
            break;
          default:
            throw "WebCLContext.createProgram: Expected String or Object";
          }
          var program = null;
          if (props.source || props.ptx) {
            if (props.source) {
              program = this._createProgram.call(this, props.source);
              program.source = props.source;
            } else if (props.ptx) {  // hidden feature: NVIDIA PTX binary support
              program = _createProgramWithBinary.call(this, [this.device], [props.ptx]);
              program.source = props.ptx;
            }
          }
          program.platform = this.platform;
          program.device = this.device;
          program.context = this;
          program.name = name;
          removeFromArray(this.programs, name);
          this.programs.push(program);
          return program;
        }
      };

      WebCLContext.prototype.getQueue = function(name) {
        return getFromArray(this.queues, name);
      };

      WebCLContext.prototype.getBuffer = function(name) {
        return getFromArray(this.buffers, name);
      };

      WebCLContext.prototype.getProgram = function(name) {
        return getFromArray(this.programs, name);
      };

      WebCLContext.prototype.releaseAll = function() {
        if (this.name === undefined) {
          this.release();
        } else {
          clearArray(this.programs);
          clearArray(this.queues);
          clearArray(this.buffers);
          this.release();
        }
      };
    })();

    // ### WebCLCommandQueue ###
    //
    (function augmentWebCLCommandQueue() {

      WebCLCommandQueue.prototype._enqueueWriteBuffer = WebCLCommandQueue.prototype.enqueueWriteBuffer;
      WebCLCommandQueue.prototype._enqueueReadBuffer = WebCLCommandQueue.prototype.enqueueReadBuffer;
      WebCLCommandQueue.prototype._enqueueNDRangeKernel = WebCLCommandQueue.prototype.enqueueNDRangeKernel;

      WebCLCommandQueue.prototype.enqueueWriteBuffer = function(dstBuffer, srcArray) {
        var dstBuffer = (typeof dstBuffer === 'string') ? this.context.getBuffer(dstBuffer) : dstBuffer;
        var numBytes = Math.min(dstBuffer.size, srcArray.byteLength);
        var event = this._enqueueWriteBuffer.call(this, dstBuffer, false, 0, numBytes, srcArray, []);
        this.events.push(event);
        return event;
      };

      WebCLCommandQueue.prototype.enqueueReadBuffer = function(srcBuffer, dstArray) {
        var srcBuffer = (typeof srcBuffer === 'string') ? this.context.getBuffer(srcBuffer) : srcBuffer;
        var numBytes = Math.min(srcBuffer.size, dstArray.byteLength);
        var event = this._enqueueReadBuffer.call(this, srcBuffer, false, 0, numBytes, dstArray, []);
        this.events.push(event);
        return event;
      };

      WebCLCommandQueue.prototype.enqueueKernel = function(kernel, globalws, localws) {
        var localws = (typeof localws === 'number') ? [localws] : (localws || []);
        var globalws = (typeof globalws === 'number') ? [globalws] : globalws;
        var kernel = (typeof kernel === 'string') ? this.context.getKernel(kernel) : kernel;
        var event = this._enqueueNDRangeKernel(kernel, globalws.length, [], globalws, localws, []);
        this.events.push(event);
        return event;
      };

      WebCLCommandQueue.prototype.enqueueNDRangeKernel = function() {
        var event = this._enqueueNDRangeKernel.apply(this, arguments);
        this.events.push(event);
        return event;
      };

      WebCLCommandQueue.prototype.releaseAll = function() {
        clearArray(this.events);
        this.release();
      };
    })();

    // ### WebCLBuffer ###
    //
    (function augmentWebCLBuffer() {
      WebCLBuffer.prototype.releaseAll = WebCLBuffer.prototype.release;
    })();

    // ### WebCLProgram ###
    //
    (function augmentWebCLProgram() {
      WebCLProgram.prototype.built = false;
      WebCLProgram.prototype.source = null;
      WebCLProgram.prototype.compilerOpts = null;
      WebCLProgram.prototype.compilerDefs = null;
      WebCLProgram.prototype.kernels = null;
      WebCLProgram.prototype.context = null;
      WebCLProgram.prototype.device = null;
      WebCLProgram.prototype.platform = null;

      WebCLProgram.prototype._build = WebCLProgram.prototype.build;

      WebCLProgram.prototype.build = function(parameters) {
        parameters = parameters || {};
        var self = this;
        this.compilerOpts = parameters.opts || "";
        this.compilerDefs = "";
        for (var d in parameters.defs) {
          this.compilerDefs += "-D " + d + "=" + parameters.defs[d] + " ";
        }
        try {
          this._build.call(this, [this.device], this.compilerDefs + this.compilerOpts);
          if (this.getBuildStatus() === CL.BUILD_SUCCESS) {
            this.kernels = kernelFactory();
            if (this.kernels.length > 0) {
              this.kernel = this.kernels[0];
              this.built = true;
            }
          }
          if (!this.built) {
            throw new WebCLException("BUILD_ERROR", "Kernel compilation failed, although the compiler claims it succeeded.");
          }
        } catch(e) {
          var info = this.getBuildLog();
          console.log("[" + this.platform.vendor + "]", e);
          throw e.name + " :: " + e.msg + " :: " + info;
        }
        return this;

        function kernelFactory() {
          var kernels = self.createKernelsInProgram();
          for (var k=0; k < kernels.length; k++) {
            kernels[k].program = self;
            kernels[k].context = self.context;
            kernels[k].device = self.device;
            kernels[k].platform = self.platform;
            kernels[k].name = kernels[k].getInfo(CL.KERNEL_FUNCTION_NAME);
            kernels[k].numArgs = kernels[k].getInfo(CL.KERNEL_NUM_ARGS);
            kernels[k].workGroupSize = kernels[k].getWorkGroupInfo(self.device, CL.KERNEL_WORK_GROUP_SIZE);
            kernels[k].localMemSize = kernels[k].getWorkGroupInfo(self.device, CL.KERNEL_LOCAL_MEM_SIZE);
            kernels[k].privateMemSize = kernels[k].getWorkGroupInfo(self.device, CL.KERNEL_PRIVATE_MEM_SIZE);
          }
          return kernels;
        };
      };

      WebCLProgram.prototype.getBuildStatus = function() {
        var status = this.getBuildInfo(this.device, CL.PROGRAM_BUILD_STATUS);
        return status;
      };

      WebCLProgram.prototype.getBuildLog = function() {
        var log = this.getBuildInfo(this.device, CL.PROGRAM_BUILD_LOG);
        return log;
      };

      WebCLProgram.prototype.getKernels = function() {
        return this.kernels;
      };

      WebCLProgram.prototype.getKernel = function(name) {
        return name? getFromArray(this.kernels, name) : this.kernels[0];
      };

      WebCLProgram.prototype.releaseAll = function() {
        clearArray(this.kernels);
        this.release();
      };
    })();

    // ### WebCLKernel ###
    //
    (function augmentWebCLKernel() {
      WebCLKernel.prototype.name = null;
      WebCLKernel.prototype.numArgs = 0;
      WebCLKernel.prototype.workGroupSize = 0;
      WebCLKernel.prototype.localMemSize = 0;
      WebCLKernel.prototype.privateMemSize = 0;
      WebCLKernel.prototype.program = null;
      WebCLKernel.prototype.context = null;
      WebCLKernel.prototype.device = null;
      WebCLKernel.prototype.platform = null;
      WebCLKernel.prototype.releaseAll = WebCLKernel.prototype.release;

      var _setArg = WebCLKernel.prototype.setArg;

      WebCLKernel.prototype.setArg = function(index, value) {
        var isMemObject = (value instanceof WebCLMemoryObject);
        var isNamedObject = (typeof(value) === 'string');
        if (isNamedObject || isMemObject) {
          var memObject = isMemObject && value;
          memObject = memObject || this.context.getBuffer(value);
          memObject = memObject || this.context.getImage(value);
          value = memObject;
        }
        _setArg.call(this, index, value);
      };

      // Convenience wrapper for setArg that allows setting all
      // arguments of a kernel at once. This also allows passing
      // WebCLMemoryObjects by either name or reference.
      //
      WebCLKernel.prototype.setArgs = function() {
        for (var i=0; i < arguments.length; i++) {
          this.setArg(i, arguments[i]);
        }
      };
    })();

    // ### WebCLEvent ###
    //
    (function augmentWebCLEvent() {
      WebCLEvent.prototype.releaseAll = WebCLEvent.prototype.release;
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
  function getEnums(theObject) {
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
  function getSystemInfo(platforms, devices) {
    var numGPU = 0;
    var numCPU = 0;
    WebCL.getPlatforms().forEach(function(platform) {
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

    for (var enumName in WebCL) {
      if (typeof WebCL[enumName] === 'number') {
        if (enumName.indexOf("CL_") === 0) {
          delete WebCL[enumName];
        }
      }
    }
  };

})();

/* BEGIN OBSOLETE CODE

// ### CL.releaseAll() ###
//
// Invalidates all WebCL objects and releases the memory and other
// resources held up by their native OpenCL counterparts.  This is
// crucially important, because JavaScript garbage collectors will
// typically not release the resources in any reasonable time, not
// even when the user reloads or leaves the page.
//
// By default, `CL.releaseAll` is called automatically when leaving
// the page, i.e., when the `window.onbeforeunload` event fires, or
// when an exception occurs in CL.js. If absolutely necessary, you
// can disable this behavior for a specific CL instance when
// creating it: `new CL({ cleanup: false })`.
//
CL.releaseAll = function() {
for (var i=0; i < instances.length; i++) {
instances[i].releaseAll();
delete instances[i];
}
instances.length = 0;
};


function Context(parameters) {

this.peer = "Context.peer: not yet initialized";
this.platform = null;
this.device = null;
this.queues = [];
this.buffers = [];
this.images = [];
this.programs = [];

this.createCommandQueue = function(parameters) {
parameters = parameters || {};
var name = parameters.name || self.queues.length.toString();
var queue = new CommandQueue();
var props = IMP.PROFILE===true ? CL.QUEUE_PROFILING_ENABLE : null;
queue.peer = self.peer.createCommandQueue(self.device, props);
queue.context = self;
queue.name = name;
self.queues.push(queue);
return queue;
};

this.createBuffer = function(parameters) {
parameters = parameters || {};
var byteLength = parameters.size || 1024;
var memFlags = parameters.flags || CL.MEM_READ_WRITE;
var name = parameters.name || self.buffers.length.toString();
var buffer = self.peer.createBuffer(memFlags, byteLength);
buffer.flags = memFlags;
buffer.size = byteLength;
buffer.context = self;
buffer.name = name;
buffer.releaseAll = function() { this.release(); };
CL.removeFromArray(self.buffers, name);
self.buffers.push(buffer);
return buffer;
};

this.createImage = function(parameters) {
parameters = parameters || {};
var width = parameters.width || 256;
var height = parameters.height || 256;
var memFlags = parameters.flags || CL.MEM_READ_WRITE;
var imgFormat = parameters.format || { channelOrder : CL.RGBA, channelDataType : CL.UNSIGNED_INT8 };
var name = parameters.name || self.images.length.toString();
var image = self.peer.createImage2D(memFlags, imgFormat, width, height, 0);
image.flags = memFlags;
image.format = imgFormat;
image.width = width;
image.height = height;
image.context = self;
image.name = name;
image.releaseAll = function() { this.release(); };
CL.removeFromArray(self.images, name);
self.images.push(image);
return image;
};

this.buildProgram = function(parameters) {
var program = this.createProgram(parameters);
program.build(parameters);
return program;
};

this.buildKernels = function(parameters) {
var program = self.buildProgram(parameters);
return program.kernels;
};

this.buildKernel = function(parameters) {
return self.buildKernels(parameters)[0];
};

this.getBuffer = function(name) {
return CL.getFromArray(self.buffers, name);
};

this.getImage = function(name) {
return CL.getFromArray(self.images, name);
};

this.getKernel = function(name) {
for (var p=0; p < self.programs.length; p++) {
var result = self.programs[p].getKernel(name);
if (result !== null) {
return result;
}
}
return null;
};

this.getQueue = function(name) {
return CL.getFromArray(self.queues, name);
};

this.releaseAll = function() {
console.log("Context.releaseAll");
CL.clearArray(self.programs);
CL.clearArray(self.queues);
CL.clearArray(self.buffers);
self.peer.release();
self.peer = "Context.peer: de-initialized";
};

IMP.addCleanupWrapper(this, "createCommandQueue", "Context");
IMP.addCleanupWrapper(this, "createBuffer", "Context");
IMP.addCleanupWrapper(this, "createImage", "Context");

var self = this;
};

// ### CommandQueue ###
// Instantiated by `Context.createCommandQueue()`
//
function CommandQueue(parameters) {
this.peer = "CommandQueue.peer: not yet initialized";
this.context = null;

this.enqueueKernel = function(kernel, globalws, localws) {
var localws = localws || [];
var kernel = (typeof kernel === 'string') ? self.context.getKernel(kernel) : kernel;
var event = self.peer.enqueueNDRangeKernel(kernel, globalws.length, [], globalws, localws, []);
events.push(event);
return event;
};

this.enqueueWriteBuffer = function(dstBuffer, srcArray) {
var dstBuffer = (typeof dstBuffer === 'string') ? self.context.getBuffer(dstBuffer) : dstBuffer;
var numBytes = Math.min(dstBuffer.size, srcArray.byteLength);
var event = self.peer.enqueueWriteBuffer(dstBuffer, false, 0, numBytes, srcArray, []);
events.push(event);
return event;
};

this.enqueueReadBuffer = function(srcBuffer, dstArray) {
var srcBuffer = (typeof srcBuffer === 'string') ? self.context.getBuffer(srcBuffer) : srcBuffer;
var numBytes = Math.min(srcBuffer.size, dstArray.byteLength);
var event = self.peer.enqueueReadBuffer(srcBuffer, false, 0, numBytes, dstArray, []);
events.push(event);
return event;
};

this.enqueueBarrier = function(eventWaitList) {
if (eventWaitList && eventWaitList.length > 0) {
self.peer.enqueueWaitForEvents(eventWaitList);
} else {
self.peer.enqueueBarrier();
}
var event = self.peer.enqueueMarker();
events.push(event);
return event;
};

this.finish = function() {
self.peer.finish();
};

this.releaseAll = function() {
if (self.peer.release) {
self.peer.release();
for (var i=0; i < events.length; i++) {
events[i].release();
delete events[i];
}
events.length = 0;
self.peer = "CommandQueue.peer: de-initialized";
}
};

var self = this;
var events = [];

IMP.addCleanupWrapper(this, "enqueueKernel", "CommandQueue");
IMP.addCleanupWrapper(this, "enqueueWriteBuffer", "CommandQueue");
IMP.addCleanupWrapper(this, "enqueueReadBuffer", "CommandQueue");
IMP.addCleanupWrapper(this, "enqueueBarrier", "CommandQueue");
IMP.addCleanupWrapper(this, "finish", "CommandQueue");
};

function Imp() {

// The `DEBUG` flag enables/disables debug messages on the
// console at runtime.
//
this.DEBUG = false;

// The `CLEANUP` flag enables/disables automatic release of WebCL
// resources when leaving the page or when an exception occurs.
//
this.CLEANUP = true;

// The `PROFILE` flag enables/disables profiling support on WebCL
// command queues, but does not automatically do any profiling if
// enabled.
//
this.PROFILE = true;

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

// ### CL.Platform ###

CL.Platform = function Platform(wrapped) {
var self = this;
self.prototype = wrapped.prototype;
self._unwrap = function() { return wrapped };
self.getInfo = wrapped.getInfo.bind(wrapped);
self.NAME = self.getInfo(CL.PLATFORM_NAME);
self.VERSION = self.getInfo(CL.PLATFORM_VERSION);
self.VENDOR = self.getInfo(CL.PLATFORM_VENDOR);
self.PROFILE = self.getInfo(CL.PLATFORM_PROFILE);
self.EXTENSIONS = self.getInfo(CL.PLATFORM_EXTENSIONS).split(' ');
self.getDevices = function() { 
return wrapped.getDevices().map(function(d) { 
return new CL.Device(d); 
}); 
};
};

// ### CL.Device ###

CL.Device = function Device(wrapped) {
var self = this;
self.prototype = wrapped.prototype;
self._unwrap = function() { return wrapped };
self.getInfo = wrapped.getInfo.bind(wrapped);
self.NAME = self.getInfo(CL.DEVICE_NAME);
self.VERSION = self.getInfo(CL.DEVICE_VERSION);
self.VENDOR = self.getInfo(CL.DEVICE_VENDOR);
self.PROFILE = self.getInfo(CL.DEVICE_PROFILE);
self.EXTENSIONS = self.getInfo(CL.DEVICE_EXTENSIONS).split(' ');
};

// ### CL.Context ###

CL.Context = function Context(wrapped) {
var self = this;
self.prototype = wrapped.prototype;
self._unwrap = function() { return wrapped };
self.getInfo = wrapped.getInfo.bind(wrapped);
self.release = wrapped.release.bind(wrapped);

var _createProgram = WebCLContext.prototype.createProgram;
var _createProgramWithBinary = WebCLContext.prototype.createProgramWithBinary;

self.createProgram = function(parameters) {
var props = {};
parameters = parameters || {};
switch (typeof(parameters)) {
case 'object':
props.uri = parameters.uri;
props.source = parameters.source || CL.loadSource(parameters.uri);
props.ptx = parameters.ptx;
break;
case 'string':
props.uri = parameters.endsWith(".cl") ? parameters : null;
props.source = CL.loadSource(props.uri) || parameters;
break;
default:
throw "CL.Context.createProgram: Expected String or Object";
}
var program = null;
if (props.source || props.ptx) {
if (props.source) {
program = _createProgram.call(self, props.source);
program.source = props.source;
} else if (props.ptx) {  // hidden feature: NVIDIA PTX binary support
program = _createProgramWithBinary.call(self, [self.device._unwrap()], [props.ptx]);
program.ptx = props.ptx;
}
}
program.platform = self.platform;
program.device = self.device;
program.context = self;
self.programs.push(program);
return program;
};

self.releaseAll = function() {
console.log("CL.Context.releaseAll");
clearArray(self.programs);
clearArray(self.queues);
clearArray(self.buffers);
self.release();
};
};

*/


