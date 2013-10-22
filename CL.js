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

var CL = (function() {

  // ## GLOBAL VARIABLES AND METHODS

  // ### CL.REVISION
  //
  // The current revision number. The number is increased every time a
  // potentially backward compatibility breaking change is introduced
  // to the API.
  //
  CL.REVISION = 1;

  // ### CL.loadSource() ###
  // 
  // Loads a kernel source code file from the given `uri` via http
  // GET, with a random query string appended to the uri to avoid
  // obsolete copies getting served from some proxy or cache. Uses
  // async XHR if a `callback` function is given.  The given `uri`
  // must have the suffix `.cl`.
  //
  CL.loadSource = function(uri, callback) {
    var validURI = (typeof(uri) === 'string') && uri.endsWith('.cl');
    return validURI ? xhrLoad(uri, callback) : null;
  };

  // ### CL.enumToString() ###
  //
  // Returns the human-readable string representation of the given
  // WebCL enumerated value. For example, `CL.enumToString(-10)` will
  // return the string `"IMAGE_FORMAT_NOT_SUPPORTED"`.
  //
  CL.enumToString = function(enumValue) {
    for (var e in CL) {
      if (CL[e] === enumValue) {
        return e;
      }
    }
  };

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

  // ## INSTANCE VARIABLES AND METHODS

  var API = {};

  // ### INSTANCE ###
  //
  // The ID of the current CL instance, initialized by `new CL()`.
  // This can be used for debugging purposes to uniquely identify
  // which of the potentially many CL instances is being used.
  //
  API.INSTANCE = 0;

  // ### platforms ###
  //
  // Contains all WebCL Platforms that are available in this system,
  // as discovered at construction.  Each Platform typically contains
  // one or more Devices, but it can also happen that all devices on a
  // particular platform are powered down or otherwise not available.
  //
  API.platforms = [];

  // ### devices ###
  //
  // Contains all WebCL Devices that are actually available in this
  // system, as discovered at construction.  Each Device belongs to
  // exactly one Platform. Devices that are powered down or otherwise
  // not available are not included. Applications should be prepared
  // for the possibility that there are no devices available at all.
  //
  API.devices = [];

  // ### createContext() ###
  // 
  // Creates a new Context for the given `device` and assigns the
  // given `name` to the newly created context:
  //
  //     cl.createContext({ device: aDevice
  //                        name: 'arbitraryName' });
  //
  // For example:
  //
  //     var cl = new CL();
  //     cl.createContext({ device: cl.devices[0], name: 'foo' });
  //
  API.createContext = function(parameters) {
    parameters = parameters || {};
    parameters.device = parameters.device || this.devices[0];
    expect("a valid and available Device", parameters.device.isAvailable);

    var ctx = new Context();
    ctx.name = parameters.name;
    ctx.device = parameters.device;
    ctx.platform = ctx.device.platform;
    ctx.peer = WebCL.createContext({ devices: ctx.device.peer });
    ctx.device.contexts.push(ctx);
    return ctx;
  };

  // ### getContext() ###
  // 
  // Retrieves the Context by the given plain-text `name`, or null if
  // no context by that name exists for any Device.  See
  // `createContext` for how to assign a name to a context.
  //
  API.getContext = function(name) {
    for (var d=0; d < this.devices.length; d++) {
      var result = this.devices[d].getContext(name);
      if (result !== null) {
        return result;
      }
    }
    return null;
  };

  // ### releaseAll() ###
  // 
  API.releaseAll = function() {
    for (var d=0; d < this.devices.length; d++) {
      this.devices[d].releaseAll();
    }
  };

  ///////////////////////////////
  // Private Implementation

  var IMP = null;
  var instances = [];
  addEnums(CL);
  return CL;

  function CL(parameters)
  {
    console.log("CL constructor: ", parameters);
    parameters = parameters || {};

    IMP = new Imp();
    IMP.DEBUG = parameters.debug || false;
    IMP.CLEANUP = !(parameters.cleanup === false);
    IMP.PROFILE = !(parameters.profile === false);

    // Populate the new CL instance with instance variables and
    // methods.  Global CL properties are duplicated into the new
    // instance for convenience.
    // 

    API.INSTANCE++;
    var cloneAPI = {};
    for (var p in CL) {
      cloneAPI[p] = CL[p];
    }
    for (var p in API) {
      cloneAPI[p] = API[p];
    }

    if (window.webCL) {
      cloneAPI.platforms.length = 0;
      cloneAPI.devices.length = 0;
      cloneAPI.platforms = platformFactory();
      for (var p=0; p < cloneAPI.platforms.length; p++) {
        cloneAPI.devices = cloneAPI.devices.concat(cloneAPI.platforms[p].devices);
      }
      if (IMP.CLEANUP) {
        instances.push(cloneAPI);  // add to the queue of to-be-cleaned-up CL instances
      }
      IMP.addCleanupWrapper(cloneAPI, "createContext", "CL");
    }

    window.onbeforeunload = function() {
      CL.releaseAll();
    };

    return cloneAPI;
  };

  function addEnums(theObject) {
    for (var enumName in WebCL) {
      if (typeof WebCL[enumName] === 'number') {
        if (enumName.indexOf("CL_") !== 0) {
          theObject[enumName] = WebCL[enumName];
        }
      }
    }
  };

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

  function expect(msg, booleanResult) {
    if (booleanResult !== true) {
      throw "Invalid Arguments: Expecting " + msg + ".";
    }
  };

  function isTrueForAll(arr, property) { 
    for (var i=0; i < arr.length; i++) { 
      if (array[i][property] === false) {
        return false;
      }
    }
    return true;
  };

  function platformFactory() {
    var numGPU = 0;
    var numCPU = 0;
    var clPlatforms = [];
    var platforms = WebCL.getPlatforms();
    for (var p=0; p < platforms.length; p++) {
      clPlatforms[p] = new Platform();
      clPlatforms[p].peer = platforms[p];
      clPlatforms[p].vendor = platforms[p].getInfo(CL.PLATFORM_VENDOR);
      clPlatforms[p].devices = deviceFactory(clPlatforms[p]);
    }
    return clPlatforms;

    function deviceFactory(platform) {
      var clDevices = [];
      var devices = platform.peer.getDevices(CL.DEVICE_TYPE_ALL);
      for (var d=0; d < devices.length; d++) {
        var isAvailable = devices[d].getInfo(CL.DEVICE_AVAILABLE);
        var isCompilerAvailable = devices[d].getInfo(CL.DEVICE_COMPILER_AVAILABLE);
        if (isAvailable && isCompilerAvailable) {
          var device = new Device();
          device.isAvailable = true;
          device.peer = devices[d];
          device.platform = platform;
          device.name = device.peer.getInfo(CL.DEVICE_NAME);
          device.version = device.peer.getInfo(CL.DEVICE_VERSION);
          device.vendor = device.peer.getInfo(CL.DEVICE_VENDOR);
          var type = device.peer.getInfo(CL.DEVICE_TYPE);
          if (type === CL.DEVICE_TYPE_CPU) {
            device.type = 'CPU';
            device.id = 'CPU' + (numCPU+1);
            numCPU++;
          } else {
            device.type = 'GPU';
            device.id = 'GPU' + (numGPU+1);
            numGPU++;
          }
          clDevices.push(device);
        }
      }
      return clDevices;
    };
  };

  // ### Platform ###
  // Automatically instantiated by CL constructor
  //
  function Platform(parameters) {
    this.peer = "Platform.peer: not yet initialized";
    this.vendor = null;
    this.devices = [];
  };

  // ### Device ###
  // Automatically instantiated by CL constructor
  //
  function Device(parameters) {
    this.peer = "Device.peer: not yet initialized";
    this.isAvailable = false;
    this.platform = null;
    this.type = null;
    this.name = null;
    this.version = null;
    this.vendor = null;
    this.contexts = [];

    this.getContext = function(name) {
      return IMP.getFromArray(this.contexts, name);
    };

    this.releaseAll = function() {
      IMP.clearArray(this.contexts);
    };
  };

  // ### Context ###
  // Instantiated by `createContext()`
  //
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
      var props = IMP.PROFILE===true ? [CL.QUEUE_PROFILING_ENABLE] : null;
      queue.peer = self.peer.createCommandQueue(self.device.peer, props);
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
      var buffer = new Buffer();
      buffer.peer = self.peer.createBuffer(memFlags, byteLength);
      buffer.flags = memFlags;
      buffer.size = byteLength;
      buffer.context = self;
      buffer.name = name;
      IMP.removeFromArray(self.buffers, name);
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
      var image = new Image();
      image.peer = self.peer.createImage2D(memFlags, imgFormat, width, height, 0);
      image.flags = memFlags;
      image.format = imgFormat;
      image.width = width;
      image.height = height;
      image.context = self;
      image.name = name;
      IMP.removeFromArray(self.images, name);
      self.images.push(image);
      return image;
    };

    this.build = function(parameters) {
      var program = new Program();
      switch (typeof(parameters)) {
      case 'object':
        program.uri = parameters.uri;
        program.source = parameters.source || CL.loadSource(program.uri);
        program.ptx = parameters.ptx;
        break;
      case 'string':
        program.uri = parameters.endsWith(".cl") ? parameters : null;
        program.source = CL.loadSource(program.uri) || parameters;
        break;
      default:
        throw "CL.Context.build: Expected String or Object";
      }
      program.context = self;
      program.build(parameters);
      self.programs.push(program);
      return program;
    };

    this.buildKernels = function(parameters) {
      var program = self.build(parameters);
      return program.kernels;
    };

    this.buildKernel = function(parameters) {
      return self.buildKernels(parameters)[0];
    };

    this.getBuffer = function(name) {
      return IMP.getFromArray(self.buffers, name);
    };

    this.getImage = function(name) {
      return IMP.getFromArray(self.images, name);
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
      return IMP.getFromArray(self.queues, name);
    };

    this.releaseAll = function() {
      if (self.peer.release) {
        console.log("Context.releaseAll");
        IMP.clearArray(self.programs);
        IMP.clearArray(self.queues);
        IMP.clearArray(self.buffers);
        self.peer.release();
        self.peer = "Context.peer: de-initialized";
      }
    };

    IMP.addCleanupWrapper(this, "createCommandQueue", "Context");
    IMP.addCleanupWrapper(this, "createBuffer", "Context");
    IMP.addCleanupWrapper(this, "createImage", "Context");

    var self = this;
  };

  // ### Buffer ###
  // Instantiated by `Context.createBuffer()`
  //
  function Buffer(parameters) {
    this.peer = "Buffer.peer: not yet initialized";
    this.context = null;
    this.flags = -1;
    this.size = -1;
    this.name = "uninitialized";

    this.releaseAll = function() {
      if (self.peer.release) {
        self.peer.release();
        self.peer = "Buffer.peer: de-initialized";
      }
    };

    var self = this;
  };

  // ### Image ###
  // Instantiated by `Context.createImage()`
  //
  function Image(parameters) {
    this.peer = "Image.peer: not yet initialized";
    this.context = null;
    this.flags = -1;
    this.format = -1;
    this.width = -1;
    this.height = -1;
    this.name = "uninitialized";

    this.releaseAll = function() {
      if (self.peer.release) {
        self.peer.release();
        self.peer = "Image.peer: de-initialized";
      }
    };

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
      var event = self.peer.enqueueNDRangeKernel(kernel.peer, globalws.length, [], globalws, localws, []);
      events.push(event);
      return event;
    };

    this.enqueueWriteBuffer = function(dstBuffer, srcArray) {
      var dstBuffer = (typeof dstBuffer === 'string') ? self.context.getBuffer(dstBuffer) : dstBuffer;
      var numBytes = Math.min(dstBuffer.size, srcArray.byteLength);
      var event = self.peer.enqueueWriteBuffer(dstBuffer.peer, false, 0, numBytes, srcArray, []);
      events.push(event);
      return event;
    };

    this.enqueueReadBuffer = function(srcBuffer, dstArray) {
      var srcBuffer = (typeof srcBuffer === 'string') ? self.context.getBuffer(srcBuffer) : srcBuffer;
      var numBytes = Math.min(srcBuffer.size, dstArray.byteLength);
      var event = self.peer.enqueueReadBuffer(srcBuffer.peer, false, 0, numBytes, dstArray, []);
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

  // ### Program ###
  // Instantiated by `Context.build()`
  //
  function Program(parameters) {

    this.peer = "Program.peer: not yet initialized";
    this.built = false;
    this.compilerOpts = null;
    this.compilerDefs = null;
    this.kernels = [];
    this.kernel = null;
    this.context = null;
    this.source = null;
    this.uri = null;

    this.build = function(parameters) {
      parameters = parameters || {};
      self.compilerOpts = parameters.opts || "";
      self.compilerDefs = "";
      for (var d in parameters.defines) {
        self.compilerDefs += "-D" + d + "=" + parameters.defines[d] + " ";
      }
      if (self.context && (self.source || self.ptx)) {
        try {
          if (self.source) {
            self.peer = self.context.peer.createProgram(self.source);
          } else if (self.ptx) {  // hidden feature: NVIDIA PTX binary support
            self.peer = self.context.peer.createProgramWithBinary([self.context.device.peer], [self.ptx]);
          }
          self.peer.build([self.context.device.peer], self.compilerDefs + self.compilerOpts);
          if (this.getBuildStatus() === CL.BUILD_SUCCESS) {
            self.kernels = kernelFactory();
            if (self.kernels.length > 0) {
              self.kernel = self.kernels[0];
              self.built = true;
            }
          }
          if (!self.built) {
            throw "Kernel compilation failed, although the compiler claims it succeeded.";
          }
        } catch(e) {
          if (self.peer.getProgramBuildInfo) {
            var info = this.getBuildLog();
          } else {
            var info = "Failed to create a WebCLProgram object";
          }
          console.log("[" + self.context.platform.vendor + "]", e, info);
          throw e + info;
        }
      } else {
        var msg = "Cannot build program: missing ";
        msg += self.context? "kernel source code" : "CL.Context";
        throw msg;
      }
    };

    this.getBuildStatus = function() {
      var status = self.peer.getBuildInfo(self.context.device.peer, CL.PROGRAM_BUILD_STATUS);
      return status;
    };
    
    this.getBuildLog = function() {
      var log = self.peer.getBuildInfo(self.context.device.peer, CL.PROGRAM_BUILD_LOG);
      return log;
    };

    this.getKernel = function(name) {
      return IMP.getFromArray(self.kernels, name);
    };

    this.releaseAll = function() {
      if (self.peer.release) {
        self.peer.release();
        self.peer = "Program.peer: de-initialized";
        IMP.clearArray(self.kernels);
      }
    };

    // ### Implementation ###

    var self = this;
    init(parameters);
    IMP.addCleanupWrapper(this, "build", "Program");
    IMP.addCleanupWrapper(this, "getBuildStatus", "Program");
    IMP.addCleanupWrapper(this, "getBuildLog", "Program");

    function init(parameters) {
    };

    function kernelFactory() {
      var clKernels = [];
      var context = self.context;
      var device = self.context.device;
      var kernels = self.peer.createKernelsInProgram();
      for (var k=0; k < kernels.length; k++) {
        clKernels[k] = new Kernel();
        clKernels[k].peer = kernels[k];
        clKernels[k].program = self;
        clKernels[k].context = context;
        clKernels[k].device = device;
        clKernels[k].name = kernels[k].getInfo(CL.KERNEL_FUNCTION_NAME);
        clKernels[k].numArgs = kernels[k].getInfo(CL.KERNEL_NUM_ARGS);
        clKernels[k].workGroupSize = kernels[k].getWorkGroupInfo(device.peer, CL.KERNEL_WORK_GROUP_SIZE);
        clKernels[k].localMemSize = kernels[k].getWorkGroupInfo(device.peer, CL.KERNEL_LOCAL_MEM_SIZE);
        clKernels[k].privateMemSize = kernels[k].getWorkGroupInfo(device.peer, CL.KERNEL_PRIVATE_MEM_SIZE);
      }
      return clKernels;
    };
  };

  // ### Kernel ###
  // Instantiated by `Program.build()`
  //
  function Kernel(parameters) {
    this.peer = "Kernel.peer: not yet initialized";
    this.name = "uninitialized";
    this.numArgs = -1;
    this.argTypes = [];
    this.argSizes = [];
    this.workGroupSize = -1;
    this.localMemSize = -1;
    this.privateMemSize = -1;
    this.program = null;
    this.context = null;
    this.device = null;
    
    // Sets kernel arguments using the legacy WebCL prototype API
    //
    this.setArgLegacy = function(index, value) {

      var isNumber = (typeof(value) === 'number');
      var isTypedArray = (value.buffer instanceof ArrayBuffer)
      var isMemObject = (value instanceof Buffer || value instanceof Image);
      var isNamedObject = (typeof(value) === 'string');

      if (isTypedArray) {
        self.peer.setArg(index, value);
      }

      if (isNamedObject || isMemObject) {
        var memObject = isMemObject && value;
        memObject = memObject || self.context.getBuffer(value);
        memObject = memObject || self.context.getImage(value);
        value = memObject.peer;
      }

      var typemap = {
        'BYTE' : ['number', WebCL.types.CHAR],
        'UBYTE' : ['number', WebCL.types.UCHAR],
        'SHORT' : ['number', WebCL.types.SHORT],
        'USHORT' : ['number', WebCL.types.USHORT],
        'INT' : ['number', WebCL.types.INT],
        'UINT' : ['number', WebCL.types.UINT],
        'LONG' : ['number', WebCL.types.LONG],
        'ULONG' : ['number', WebCL.types.ULONG],
        'LOCAL' : ['number', WebCL.types.UINT],
        'IMAGE' : ['object', WebCL.types.MEMORY_OBJECT],
        'BUFFER' : ['object', WebCL.types.MEMORY_OBJECT],
      };

      var typeName = this.argTypes[index];                 // 'UINT', 'BUFFER', ...
      var expectedTypeOf = typemap[typeName][0];           // 'number', 'object', ...
      var expectedTypeCL = typemap[typeName][1];           // WebCL.types.UINT, ...
      if (typeof(value) !== expectedTypeOf) {
        throw "Invalid kernel argument type: Expected " + typeName + ", received " + value;
      }
      if (typeName === 'LOCAL') {
        this.peer.setArg(index, new Uint32Array([value]));
      } else {
        this.peer.setArg(index, value, expectedTypeCL);
      }
    };

    // Sets kernel arguments using the legacy WebCL prototype API
    //
    this.setArg = function(index, value) {
      var isArray = (value instanceof Array);
      var isNumber = (typeof value === 'number');
      var isFloat = isNumber && (Math.floor(value) !== value);
      var isInt = isNumber && !isFloat;
      var isTypedArray = (value.buffer instanceof ArrayBuffer)
      var isMemObject = (value instanceof Buffer || value instanceof Image);
      var isNamedObject = (typeof value === 'string');

      if (isNamedObject || isMemObject) {
        var memObject = isMemObject && value;
        memObject = memObject || self.context.getBuffer(value);
        memObject = memObject || self.context.getImage(value);
        self.peer.setKernelArg(index, memObject.peer);
      } else if (isTypedArray) {
        self.peer.setKernelArg(index, value);
      } else if (isArray) {
        throw "Invalid kernel argument type: JavaScript Array arguments not supported.";
      } else if (isFloat) {
        self.peer.setKernelArg(index, value, WebCL.types.FLOAT);
      } else if (isInt) {
        var type = undefined;
        type = type || tryArgType(index, value, WebCL.types.INT);
        type = type || tryArgType(index, value, WebCL.types.LONG);
        type = type || tryArgType(index, value, WebCL.types.SHORT);
        type = type || tryArgType(index, value, WebCL.types.FLOAT);
        if (type === undefined) {
          try {
            self.peer.setKernelArgLocal(index, value);
            type = "LOCAL";
          } catch (e) {
            throw "Unrecognized kernel argument type: " + value;
          }
        }
      }

      function tryArgType(index, value, type) {
        try {
          self.peer.setKernelArg(index, value, type);
          return type;
        } catch (e) {}
      }
    };

    // Sets kernel arguments using the WebCL Working Draft way
    //
    this.setArgDevel = function(index, value) {
      var isNumber = (typeof value === 'number');
      var isFloat = isNumber && (Math.floor(value) !== value);
      var isInt = isNumber && !isFloat;
      var isNamedObject = (typeof value === 'string');
      var isMemObject = (value instanceof Buffer || value instanceof Image);
      var isArray = (value instanceof Array);

      var isTypedArray = value.buffer && (value.buffer instanceof ArrayBuffer);
      var is8bit = isTypedArray && (value.BYTES_PER_ELEMENT === 1);
      var is16bit = isTypedArray && (value.BYTES_PER_ELEMENT === 2);
      var is32bit = isTypedArray && (value.BYTES_PER_ELEMENT === 4);
      var isFloat32 = is32bit && (value instanceof Float32Array);
      var isInteger = !isFloat32;
      
      var buffer = new ArrayBuffer(8*16);          // enough space for a double16

      // CASE 1: Single scalar
      //
      if (isNumber) {
        var byteView = new Int8Array(buffer, 0, 1);
        var ubyteView = new Uint8Array(buffer, 0, 1);
        var shortView = new Int16Array(buffer, 0, 1);
        var ushortView = new Uint16Array(buffer, 0, 1);
        var intView = new Int32Array(buffer, 0, 1);
        var uintView = new Uint32Array(buffer, 0, 1);
        var longView = new Uint32Array(buffer, 0, 2);
        var ulongView = new Uint32Array(buffer, 0, 2);
        var floatView = new Float32Array(buffer, 0, 1);
        var doubleView = new Float64Array(buffer, 0, 1);
        var typemap = {
          'BYTE' : byteView,
          'UBYTE' : ubyteView,
          'SHORT' : shortView,
          'USHORT' : ushortView,
          'INT' : intView,
          'UINT' : uintView,
          'LONG' : longView,
          'ULONG' : ulongView,
          'LOCAL' : uintView,
          'IMAGE' : null,
          'BUFFER' : null,
        };
        var expectedType = this.argTypes[index];
        console.log("Expected type: ", expectedType);
        var view = typemap[expectedType];
        if (view) {
          if (expectedType == 'LOCAL') {
            self.peer.setKernelArgLocal(index, value);
            return;
          }
          if (expectedType == 'ULONG') {
            view[0] = value >> 32;
            view[1] = value & 0xffffffff;
            //self.peer.setkernelArg(index, view);
            self.peer.setKernelArg(index, value, WebCL.types.ULONG);
            return;
          } else {
            view[0] = value;
            self.setArg(index, value);
            //self.peer.setKernelArg(index, view);
            return;
          }
        } else {
          throw "Invalid kernel argument type: Expected " + expectedType;
        }
      }

      // CASE 2: Typed Array (not yet supported)
      //
      if (isTypedArray) {
        var expectedType = this.argTypes[index];
        var typemap = {
          'BYTE' : Int8Array,
          'UBYTE' : Uint8Array,
          'SHORT' : Int16Array,
          'USHORT' : Uint16Array,
          'INT' : Int32Array,
          'UINT' : Uint32Array,
          'LONG' : null,
          'ULONG' : null,
          'LOCAL' : Uint32Array,
          'IMAGE' : null,
          'BUFFER' : null,
        };
        var expectedType = typemap[this.argTypes[index]];
        var expectedSize = this.argSizes[index];
        var isExpectedType = value instanceof expectedType;
        var isExpectedSize = (value.length === expectedSize);
        if (isExpectedType && isExpectedSize) {
          self.peer.setKernelArg(index, value);
        } else {
          throw "Invalid kernel argument: Expected " + expectedSize + " " + expectedType + " elements";
        }
      }

      // CASE 2: WebCLBuffer or WebCLImage
      //
      if (isMemObject || isNamedObject) {
        this.setArg(index, value);
      }
    };

    this.setArgs = function() {
      for (var i=0; i < arguments.length; i++) {
        self.setArgLegacy(i, arguments[i]);
      }
    };

    this.setArgTypes = function() {
      for (var i=0; i < arguments.length; i++) {
        self.argTypes[i] = arguments[i];
      }
    };

    this.setArgSizes = function() {
      for (var i=0; i < arguments.length; i++) {
        self.argSizes[i] = arguments[i];
      }
    };

    this.getInfo = function(paramName) {
      return this.peer.getInfo(paramName);
    };

    this.getWorkGroupInfo = function(device, paramName) {
      return this.peer.getWorkGroupInfo(device.peer, paramName);
    };

    this.releaseAll = function() {
      if (self.peer.release) {
        self.peer.release();
        self.peer = "Kernel.peer: de-initialized";
      }
    };

    // ### Implementation ###

    var self = this;

    IMP.addCleanupWrapper(this, "setArg", "Kernel");
    IMP.addCleanupWrapper(this, "getInfo", "Kernel");
    IMP.addCleanupWrapper(this, "getWorkGroupInfo", "Kernel");
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

    // #### clearArray ####
    //
    // Loops through all CL objects in `theArray` and releases their
    // native resources.  Will fail if `theArray` is not an Array or
    // contains anything else than CL.js objects.
    //
    this.clearArray = function(theArray) {
      for (var i=0; i < theArray.length; i++) {
        theArray[i].releaseAll();
        delete theArray[i];
      }
      theArray.length = 0;
    };

    // #### removeFromArray ####
    //
    // Removes the object by the given `name` from `theArray`, and
    // releases the native CL resources of that object.
    //
    this.removeFromArray = function(theArray, name) {
      for (var i=0; i < theArray.length; i++) {
        var theObject = theArray[i];
        if (theObject.name === name) {
          theObject.releaseAll();
          theArray.splice(i, 1);
        }
      }
    };

    // #### getFromArray ####
    //
    // Retrieves the object by the given `name` from `theArray`.
    // Returns `null` if no object by that name is found.
    //
    this.getFromArray = function(theArray, name) {
      for (var i=0; i < theArray.length; i++) {
        if (theArray[i].name === name) {
          return theArray[i];
        }
      }
      return null;
    };

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

})();
