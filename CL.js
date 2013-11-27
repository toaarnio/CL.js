// **CL.js** is a lightweight utility library for **WebCL**.  It
// relieves the developer from writing most of the boilerplate code
// that is otherwise required to get anything running, while
// preserving the look and feel of WebCL and providing easy access to
// the underlying raw API.
//
// CL.js currently works with the Nokia WebCL implementation only.
// Any contributions to help make it work on the Samsung
// implementation would be most welcome!
//
// This documentation is generated from the [source
// code](http://github.com/toaarnio/CL.js) of CL.js using
// [Docco](jashkenas.github.io/docco/).  Please visit
// http://webcl.nokiaresearch.com for demos, tutorials, and more
// information on WebCL.
//
// ## Example ##
//
// To get started, we need to include CL.js from our HTML source:
//
//     <script type="text/javascript" src="/path/to/CL.js"></script>
//
// Now, let's create a CL object and populate it with information
// about the WebCL platforms and devices that are available in this
// system:
//
//     var cl = new CL({ debug: true });
//
// With debug mode enabled, any exceptions will be reported on the
// console together with helpful information about the function and
// arguments that triggered the exception.  Next, let's create the CL
// resources that we're going to need in this example:
// 
//     var src = cl.loadSource('kernels/random.cl');
//     for (var d=0; d < cl.devices.length; d++) {
//       var ctx = cl.createContext({ 
//         device: cl.devices[d],
//         name: 'device'+d 
//       });
//       ctx.createBuffer({
//         size: 1024*1024,
//         name: 'results'
//       });
//       ctx.buildKernel({ source: src });
//       ctx.createCommandQueue({ name: 'theQueue' });
//     }
//
// Note that we assigned a plain-text `name` for each of our contexts,
// buffers and queues. This makes it easy to find the resources that
// we need later on. The Kernel object that we created for each
// Context is assigned the same name as the kernel function in
// `random.cl`.  For the purposes of this example, let's assume that
// the kernel function is called `rnd`. Now, let's proceed to run it
// on each Device in turn, reading back the results into a 1-megabyte
// ArrayBuffer:
//
//     var randomNumbers = new Uint8Array(1024*1024);
//     for (var d=0; d < cl.devices.length; d++) {
//        var ctx = cl.getContext('device'+d);
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

// ## The CL API ##
//
// The global singleton `CL` object contains all the properties and
// functionality that are available. CL.js can be safely included
// multiple times from different JavaScript source files.
//
"use strict"


// CL constructor & static properties

var CL = function() { 
  console.log("CL instance constructor!"); 
};

(function createCL() {

  // ### CL.REVISION ###
  //
  // The current revision number. The number is increased every time a
  // potentially backward compatibility breaking change is introduced
  // to the API.
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
  // construction.  Each Device belongs to exactly one Platform.  Devices that are powered down or
  // otherwise not available are not included.  Applications should be prepared for the possibility
  // that there are no devices available at all.
  //
  CL.DEVICES = [];

  // ### CL.loadSource() ###
  // 
  // Loads a kernel source code file from the given `uri` via http GET, with a random query string
  // appended to the uri to avoid obsolete copies getting served from some proxy or cache. Uses
  // async XHR if a `callback` function is given.  The given `uri` must have the suffix `.cl`.
  //
  CL.loadSource = function(uri, callback) {
    var validURI = (typeof(uri) === 'string') && uri.endsWith('.cl');
    return validURI ? xhrLoad(uri, callback) : null;
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

  // ## CL.prototype ##
  //
  // Contains the member functions and variables of a CL instance, defined and documented below.
  //
  CL.prototype = {};

  // ### cl.contexts ###
  //
  // An array of all WebCLContexts that have been created by this particular CL instance.
  //
  CL.prototype.contexts = [];

  // ### cl.createContext() ###
  // 
  // Creates a new Context for the given `device` and assigns the given `name` to the newly created
  // context:
  //
  //     cl.createContext({ device: aDevice
  //                        name: 'arbitraryName' });
  //
  // For example:
  //
  //     var cl = new CL();
  //     cl.createContext({ device: cl.devices[0], name: 'foo' });
  //
  CL.prototype.createContext = function(parameters) {
    parameters = parameters || {};
    parameters.device = parameters.device || CL.DEVICES[0];
    expect("a valid and available Device", parameters.device.isAvailable);

    var ctx = WebCL.createContext({ devices: [parameters.device] });
    ctx.name = parameters.name;
    ctx.device = parameters.device;
    ctx.platform = ctx.device.platform;
    this.contexts.push(ctx);
    return ctx;
  };

  // ### cl.getContext() ###
  // 
  // Retrieves the Context by the given plain-text `name`, or null if no context by that name has
  // been created by this CL instance.  See `cl.createContext` for how to assign a name to a
  // context.
  //
  CL.prototype.getContext = function(name) {
    return getFromArray(this.contexts, name);
  };

  // ### cl.releaseAll() ###
  //
  // Releases all Contexts created by this CL instance.
  //
  CL.prototype.releaseAll = function() {
    for (var i=0; i < this.contexts.length; i++) {
      this.contexts[i].release();
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
    augmentWebCLPlatform();
    augmentWebCLDevice();
    augmentWebCLContext();
    augmentWebCLProgram();
    augmentWebCLKernel();

    function deleteDeprecated() {
      delete WebCL.getPlatformIDs;
      delete WebCL.createContextFromType;
      delete WebCLPlatform.prototype.getPlatformInfo;
      delete WebCLPlatform.prototype.getDeviceIDs;
      delete WebCLDevice.prototype.getDeviceInfo;
      delete WebCLContext.prototype.createImage2D;
      delete WebCLContext.prototype.createImage3D;
      delete WebCLContext.prototype.createProgramWithSource;
      delete WebCLContext.prototype.getContextInfo;
      delete WebCLCommandQueue.prototype.enqueueMapBuffer;
      delete WebCLCommandQueue.prototype.enqueueMapImage;
      delete WebCLCommandQueue.prototype.enqueueUnmapMemObject;
      delete WebCLCommandQueue.prototype.enqueueTask;
      delete WebCLCommandQueue.prototype.getCommandQueueInfo;
      delete WebCLMemoryObject.prototype.getMemObjectInfo;
      delete WebCLProgram.prototype.buildProgram;
      delete WebCLProgram.prototype.getProgramInfo;
      delete WebCLProgram.prototype.getProgramBuildInfo;
      delete WebCLKernel.prototype.setKernelArg;
      delete WebCLKernel.prototype.setKernelArgLocal;
      delete WebCLKernel.prototype.getKernelInfo;
      delete WebCLKernel.prototype.getKernelWorkGroupInfo;
      delete WebCLSampler.prototype.getSamplerInfo;
      delete WebCLEvent.prototype.getEventInfo;
      delete WebCLEvent.prototype.getEventProfilingInfo;
      for (var enumName in WebCL) {
        if (typeof WebCL[enumName] === 'number') {
          if (enumName.indexOf("CL_") === 0) {
            delete WebCL[enumName];
          }
        }
      }
    };

    // ### WebCLPlatform ###
    //
    function augmentWebCLPlatform() {
      WebCLPlatform.prototype.vendor = null; 
      WebCLPlatform.prototype.devices = null; 
    };

    // ### WebCLDevice ###
    //
    function augmentWebCLDevice() {
      WebCLDevice.prototype.id = null;
      WebCLDevice.prototype.name = null;
      WebCLDevice.prototype.type = null;
      WebCLDevice.prototype.vendor = null;
      WebCLDevice.prototype.version = null;
      WebCLDevice.prototype.isAvailable = false;
      WebCLDevice.prototype.platform = null;
    };

    // ### WebCLContext ###
    //
    function augmentWebCLContext() {
      WebCLContext.prototype.name = null;
      WebCLContext.prototype.device = null;
      WebCLContext.prototype.platform = null;
      WebCLContext.prototype.programs = [];

      WebCLContext.prototype.buildProgram = function(parameters) {
        var program = this.createProgram(parameters);
        program.build(parameters);
        return program;
      };

      WebCLContext.prototype._createProgram = WebCLContext.prototype.createProgram;
      WebCLContext.prototype.createProgram = function(parameters) {
        var props = {};
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
          throw "WebCLContext.createProgram: Expected String or Object";
        }
        var program = null;
        if (props.source || props.ptx) {
          if (props.source) {
            program = this._createProgram(props.source);
            program.source = props.source;
          } else if (props.ptx) {  // hidden feature: NVIDIA PTX binary support
            program = this.createProgramWithBinary([this.device], [props.ptx]);
            program.ptx = props.ptx;
          }
        }
        program.platform = this.platform;
        program.device = this.device;
        program.context = this;
        this.programs.push(program);
        return program;
      };
    };

    // ### WebCLProgram ###
    //
    function augmentWebCLProgram() {
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
        var self = this;
        this.compilerOpts = parameters.opts || "";
        this.compilerDefs = "";
        for (var d in parameters.defines) {
          this.compilerDefs += "-D" + d + "=" + parameters.defines[d] + " ";
        }
        try {
          this._build([this.device], this.compilerDefs + this.compilerOpts);
          if (this.getBuildStatus() === CL.BUILD_SUCCESS) {
            this.kernels = kernelFactory();
            if (this.kernels.length > 0) {
              this.kernel = this.kernels[0];
              this.built = true;
            }
          }
          if (!this.built) {
            throw "Kernel compilation failed, although the compiler claims it succeeded.";
          }
        } catch(e) {
          var info = this.getBuildLog();
          console.log("[" + this.platform.vendor + "]", e, info);
          throw e + info;
        }

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

      WebCLProgram.prototype.getKernel = function(name) {
        return CL.getFromArray(this.kernels, name);
      };

      WebCLProgram.prototype.releaseAll = function() {
        CL.clearArray(this.kernels);
        this.release();
      };
    };

    // ### WebCLKernel ###
    //
    function augmentWebCLKernel() {
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

      WebCLKernel.prototype._setArg = WebCLKernel.prototype.setArg;
      WebCLKernel.prototype.setArg = function(index, value) {
        var isMemObject = (value instanceof WebCLMemoryObject);
        var isNamedObject = (typeof(value) === 'string');
        if (isNamedObject || isMemObject) {
          var memObject = isMemObject && value;
          memObject = memObject || this.context.getBuffer(value);
          memObject = memObject || this.context.getImage(value);
          value = memObject;
        }
        this._setArg(index, value);
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
    };

  })();

  ////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // ## Private helper functions ##

  // [PRIVATE] Retrieves the object by the given `name` from `theArray`.  Returns `null` if no
  // object by that name is found.
  //
  function getFromArray(theArray, name) {
    for (var i=0; i < theArray.length; i++) {
      if (theArray[i].name === name) {
        return theArray[i];
      }
    }
    return null;
  };

  // [PRIVATE] Removes all CL objects in `theArray` and releases their native resources.  Will fail
  // if `theArray` is not an Array or contains anything else than CL.js objects.
  //
  function clearArray(theArray) {
    if (theArray && theArray.length > 0) {
      for (var i=0; i < theArray.length; i++) {
        if (theArray[i] && theArray[i].releaseAll) {
          theArray[i].releaseAll();
          delete theArray[i];
        }
      }
      theArray.length = 0;
    }
  };

  // [PRIVATE] Removes the object by the given `name` from `theArray`, and releases the native CL
  // resources of that object.
  //
  function removeFromArray(theArray, name) {
    for (var i=0; i < theArray.length; i++) {
      var theObject = theArray[i];
      if (theObject.name === name) {
        theObject.releaseAll();
        theArray.splice(i, 1);
      }
    }
  };

  // [PRIVATE] Loads the given `uri` via http GET. Uses async XHR if a `callback` function is given.
  //
  function xhrLoad(uri, callback) {
    var useAsync = (typeof(callback) === 'function');
    var xhr = new XMLHttpRequest();
    if (useAsync) {
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          callback(xhr.responseText);
        }
      };
    }
    try {
      xhr.open("GET", uri + "?id="+ Math.random(), useAsync);
      xhr.send(null);
      return useAsync || (xhr.readyState === 4 && xhr.status === 200 && xhr.responseText);
    } catch (e) {
      return null;
    }
  };

  // [PRIVATE] Copies all WebCL enums to the global CL namespace.
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

  this.createProgram = function(parameters) {
    var props = {};
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
        program = self.peer.createProgram(props.source);
        program.source = props.source;
      } else if (props.ptx) {  // hidden feature: NVIDIA PTX binary support
        program = self.peer.createProgramWithBinary([self.device], [props.ptx]);
        program.ptx = props.ptx;
      }
    }
    program.platform = self.platform;
    program.device = self.device;
    program.context = self;
    self.programs.push(program);
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
*/
