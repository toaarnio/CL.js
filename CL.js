// **CL.js** is a lightweight utility library for **WebCL**.  It
// relieves the developer from writing most of the boilerplate code
// that is otherwise required to get anything running, while
// preserving the look and feel of WebCL and providing easy access to
// the underlying raw API.
//
// Please visit http://webcl.nokiaresearch.com for demos, tutorials,
// and more information on WebCL.
//
// ## Example ##
//
// To get started, we need to include CL.js from our HTML source:
//
//     <script type="text/javascript" src="/path/to/CL.js"></script>
//
// Now, let's initialize the global CL object and populate it with
// information about the WebCL platforms and devices that are
// available in this system:
//
//     CL.setup({ debug: true });
//
// With debug mode enabled, any exceptions will be reported on the
// console together with helpful information about the function and
// arguments that triggered the exception.  Next, let's create the CL
// resources that we're going to need in this example:
// 
//     var src = CL.loadSource('kernels/random.cl');
//     for (var d=0; d < CL.devices.length; d++) {
//       var ctx = CL.createContext({ device: CL.devices[d], name: 'device'+d });
//       var buffer1M = ctx.createBuffer({ size: 1024*1024, name: 'results' });
//       var kernel = ctx.buildKernel({ source: src });
//       kernel.setArgs(buffer1M);
//       ctx.createCommandQueue({ name: 'theQueue' });
//     }
//
// Note that we assigned a plain-text `name` for each of our contexts,
// buffers and queues. This makes it easy to find the resources that
// we need later on. The Kernel object that we created for each
// Context is assigned the same name as the kernel function in
// `random.cl`.  For the purposes of this example, let's assume that
// the kernel function is called `generateRandomNumbers`. Now, let's
// proceed to run it on each Device in turn, reading back the results
// into an ArrayBuffer:
//
//     var randomNumbers = new Uint8Array(1024*1024);
//     for (var d=0; d < CL.devices.length; d++) {
//        var ctx = CL.getContext('device'+d);
//        var queue = ctx.getQueue('theQueue');
//        var kernel = ctx.getKernel('generateRandomNumbers');
//        var buffer1M = ctx.getBuffer('results');
//        queue.enqueueKernel(kernel, [randomNumbers.length]);
//        queue.enqueueReadBuffer(buffer1M, randomNumbers);
//        queue.finish();
//        /* Do something with randomNumbers */
//     }
//

/*
 * CL.js is written by Tomi Aarnio of Nokia Research Tampere, and
 * licensed under the Mozilla Public License 2.0 (see LICENSE).
 */

// ## The CL API ##

// The global singleton `CL` object contains all the properties and
// functionality that are available. CL.js can be safely included
// multiple times from different JavaScript source files.
//
"use strict"

var CL = CL || { REVISION: '1' };

// ### CL.setup() ###
//
// Initializes the global singleton `CL` object and populates it the
// Devices and Platforms that are available in this system. This does
// not yet create any native WebCL resources. The following setup
// parameters can be provided:
//
//     CL.setup({ debug: true,      // default: false
//                cleanup: false,   // default: true
//              });
//
// With the `debug` flag enabled, any exceptions are reported on the
// console together with helpful information about the function and
// arguments that triggered the exception. The debug flag is disabled
// by default.
//
// With the `cleanup` flag enabled, all WebCL resources allocated by
// CL.js over the course of the application are automatically released
// when the user leaves the page, or when an exception occurs. This is
// strongly recommended to avoid memory leaks, so the cleanup flag is
// enabled by default.
//               
CL.setup = function(parameters) {

  // ### CL.platforms ###
  //
  // Contains all WebCL Platforms that are available in this system,
  // as discovered by `CL.setup()`.  Each Platform typically contains
  // one or more Devices, but it can also happen that all devices on a
  // particular platform are powered down or otherwise not available.
  //
  CL.platforms = [];

  // ### CL.devices ###
  //
  // Contains all WebCL Devices that are actually available in this
  // system, as discovered by `CL.setup()`.  Each Device belongs to
  // exactly one Platform. Devices that are powered down or otherwise
  // not available are not included. Applications should be prepared
  // for the possibility that there are no devices available at all.
  //
  CL.devices = [];

  // ### CL.createContext() ###
  // 
  // Creates a new Context `for` the given device or devices, and
  // assigns the given `name` to the newly created context:
  //
  //     CL.createContext({ for: aDeviceOrArrayOfDevices,
  //                        name: 'arbitraryName' });
  //
  // For example:
  //
  //     CL.createContext({ for: CL.devices[0], name: 'foo' });
  //
  CL.createContext = function(parameters) {
    parameters = parameters || {};
    parameters.for = parameters.for || self.devices[0];
    expect("a Device or an array of Devices", 
           parameters.for instanceof CL.Device ||
           parameters.for instanceof Array);

    var ctx = new CL.Context();
    if (parameters.for instanceof CL.Device) {
      ctx.device = parameters.for;
      ctx.devices = [ parameters.for ];
    } else if (parameters.for instanceof Array) {
      ctx.device = parameters.for[0];
      ctx.devices = parameters.for;
    }

    ctx.platform = ctx.device.platform;
    var devicePeers = [];
    for (var d=0; d < ctx.devices.length; d++) {
      devicePeers[d] = ctx.devices[d].peer;
    }
    ctx.peer = WebCL.createContext([CL.CONTEXT_PLATFORM, ctx.platform.peer], devicePeers);
    for (var d=0; d < ctx.devices.length; d++) {
      ctx.devices[d].contexts.push(ctx);
    }
    ctx.name = parameters.name;
    return ctx;
  };

  // ### CL.getContext() ###
  // 
  // Retrieves the Context by the given plain-text `name`, or null if
  // no context by that name exists for any Device.  See
  // `CL.createContext` for how to assign a name to a context.
  //
  CL.getContext = function(name) {
    for (var d=0; d < self.devices.length; d++) {
      var result = self.devices[d].getContext(name);
      if (result !== null) {
        return result;
      }
    }
    console.log("CL.js: Warning: context "+name+" not found.");
    return null;
  };

  // ### CL.loadSource() ###
  // 
  // Loads a kernel source code file from the given `uri` via http
  // POST or, failing that, http GET. POST is preferred in order to
  // avoid obsolete copies of the kernel getting served from some
  // proxy or cache.
  //
  CL.loadSource = function(uri) {
    return xhrLoad(uri);
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
  // can disable this behavior at the setup stage: `CL.setup({
  // cleanup: false });`
  //
  CL.releaseAll = function() {
    if (CL.Impl.CLEANUP) {
      for (var d=0; d < CL.devices.length; d++) {
        CL.devices[d].releaseAll();
      }
    }
  };

  // ### CL.enumToString() ###
  //
  // Returns the human-readable string representation of the given
  // WebCL enumerated value. For example, `CL.enumToString(-10)`
  // will return the string `"IMAGE_FORMAT_NOT_SUPPORTED"`.
  //
  CL.enumToString = function(enumValue) {
    for (var e in CL) {
      if (CL[e] === enumValue) {
        return e;
      }
    }
  };

  // ### Implementation ###

  var self = this;
  init(parameters);

  function init(parameters) {
    console.log("init: ", parameters);
    parameters = parameters || {};
    var temp = self.setup;
    delete self.setup;
    CL.Impl = new CL.Implementation();
    CL.Impl.DEBUG = parameters.debug || false;
    CL.Impl.CLEANUP = !(parameters.cleanup === false);
    CL.Impl.addCleanupWrappers(self, "CL");
    self.setup = temp;
    if (window.WebCL) {
      setupEnums();
      self.platforms.length = 0;
      self.devices.length = 0;
      self.platforms = platformFactory();
      for (var p=0; p < self.platforms.length; p++) {
        self.devices = self.devices.concat(self.platforms[p].devices);
      }
    }
    if (CL.Impl.CLEANUP) {
      window.onbeforeunload = CL.releaseAll;
    };
  };

  function platformFactory() {
    var numGPU = 0;
    var numCPU = 0;

    function deviceFactory(platform) {
      var clDevices = [];
      var devices = platform.peer.getDevices(CL.DEVICE_TYPE_ALL);
      for (var d=0; d < devices.length; d++) {
        var isAvailable = devices[d].getDeviceInfo(CL.DEVICE_AVAILABLE);
        var isCompilerAvailable = devices[d].getDeviceInfo(CL.DEVICE_COMPILER_AVAILABLE);
        if (isAvailable && isCompilerAvailable) {
          var device = new CL.Device();
          device.isAvailable = true;
          device.peer = devices[d];
          device.platform = platform;
          device.name = device.peer.getDeviceInfo(CL.DEVICE_NAME);
          device.version = device.peer.getDeviceInfo(CL.DEVICE_VERSION);
          device.vendor = device.peer.getDeviceInfo(CL.DEVICE_VENDOR);
          var type = device.peer.getDeviceInfo(CL.DEVICE_TYPE);
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

    var clPlatforms = [];
    var platforms = WebCL.getPlatforms();
    for (var p=0; p < platforms.length; p++) {
      clPlatforms[p] = new CL.Platform();
      clPlatforms[p].peer = platforms[p];
      clPlatforms[p].vendor = platforms[p].getPlatformInfo(CL.PLATFORM_VENDOR);
      clPlatforms[p].devices = deviceFactory(clPlatforms[p]);
    }
    return clPlatforms;
  };

  function setupEnums() {
    for (var legacyEnumName in WebCL) {
      if (typeof WebCL[legacyEnumName] === 'number') {
        var newEnumName = legacyEnumName.slice(3);
        CL[newEnumName] = WebCL[legacyEnumName];
      }
    }
  };

  function xhrLoad(uri) {
    var xhr = new XMLHttpRequest();
    var response = xhrTry("POST");
    return response || xhrTry("GET");

    function xhrTry(method) {
      try {
        xhr.open(method, uri, false);
        xhr.send(null);
        return (xhr.status === 200) ? xhr.responseText : null;
      } catch (e) {
        return null;
      }
    };
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
};

// ### CL.Platform ###
// Automatically instantiated by `CL.setup()`
//
CL.Platform = function(parameters) {
  this.peer = "CL.Platform.peer: not yet initialized";
  this.vendor = null;
  this.devices = [];
};

// ### CL.Device ###
// Automatically instantiated by `CL.setup()`
//
CL.Device = function(parameters) {
  this.peer = "CL.Device.peer: not yet initialized";
  this.isAvailable = false;
  this.platform = null;
  this.type = null;
  this.name = null;
  this.version = null;
  this.vendor = null;
  this.contexts = [];

  this.getContext = function(name) {
    for (var i=0; i < self.contexts.length; i++) {
      if ((self.contexts[i].name.indexOf(name) === 0) && (name.length == self.contexts[i].name.length)) {
        return self.contexts[i];
      }
    }
    return null;
  };

  this.releaseAll = function() {
    CL.Impl.clearArray(self.contexts);
  };

  var self = this;
};

// ### CL.Context ###
// Instantiated by `CL.createContext(()`
//
CL.Context = function(parameters) {

  this.peer = "CL.Context.peer: not yet initialized";
  this.platform = null;
  this.device = null;
  this.devices = [];
  this.queues = [];
  this.buffers = [];
  this.images = [];
  this.programs = [];

  this.createCommandQueue = function(parameters) {
    parameters = parameters || {};
    var name = parameters.name || self.queues.length.toString();
    var queue = new CL.CommandQueue();
    queue.peer = self.peer.createCommandQueue(self.device.peer, null);
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
    var buffer = new CL.Buffer();
    buffer.peer = self.peer.createBuffer(memFlags, byteLength);
    buffer.flags = memFlags;
    buffer.size = byteLength;
    buffer.context = self;
    buffer.name = name;
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
    var image = new CL.Image();
    image.peer = self.peer.createImage2D(memFlags, imgFormat, width, height, 0);
    image.flags = memFlags;
    image.format = imgFormat;
    image.width = width;
    image.height = height;
    image.context = self;
    image.name = name;
    self.images.push(image);
    return image;
  };

  this.buildProgram = function(parameters) {
    parameters = parameters || {};
    var program = new CL.Program(parameters);
    parameters.context = self;
    program.build(parameters);
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
    for (var b=0; b < self.buffers.length; b++) {
      if ((self.buffers[b].name.indexOf(name) === 0) && (name.length === self.buffers[b].name.length)) {
        return self.buffers[b];
      }
    }
    return null;
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
    for (var q=0; q < self.queues.length; q++) {
      if ((self.queues[q].name.indexOf(name) === 0) && (name.length === self.queues[q].name.length)) {
        return self.queues[q];
      }
    }
    return null;
  };

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      console.log("CL.Context.releaseAll");
      CL.Impl.clearArray(self.programs);
      CL.Impl.clearArray(self.queues);
      CL.Impl.clearArray(self.buffers);
      self.peer.releaseCLResources();
      self.peer = "CL.Context.peer: de-initialized";
    }
  };

  var self = this;
  CL.Impl.addCleanupWrappers(self, "CL.Context");
};

// ### CL.CommandQueue ###
// Instantiated by `CL.Context.createCommandQueue()`
//
CL.CommandQueue = function(parameters) {
  this.peer = "CL.CommandQueue.peer: not yet initialized";
  this.context = null;

  this.enqueueKernel = function(kernel, globalws) {
    self.peer.enqueueNDRangeKernel(kernel.peer, globalws.length, [], globalws, [], []);
  };

  this.enqueueWriteBuffer = function(dstBuffer, srcArray) {
    var numBytes = Math.min(dstBuffer.size, srcArray.byteLength);
    self.peer.enqueueWriteBuffer(dstBuffer.peer, false, 0, numBytes, srcArray, []);
  };

  this.enqueueReadBuffer = function(srcBuffer, dstArray) {
    var numBytes = Math.min(srcBuffer.size, dstArray.byteLength);
    self.peer.enqueueReadBuffer(srcBuffer.peer, false, 0, numBytes, dstArray, []);
  };

  this.finish = function() {
    self.peer.finish();
  };

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      self.peer.releaseCLResources();
      self.peer = "CL.CommandQueue.peer: de-initialized";
      self.context = null;
   }
  };

  var self = this;
  CL.Impl.addCleanupWrappers(self, "CL.CommandQueue");
};

// ### CL.Program ###
// Instantiated by `CL.Context.buildProgram()`
//
CL.Program = function(parameters) {

  this.peer = "CL.Program.peer: not yet initialized";
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
    self.context = parameters.context;
    self.compilerOpts = parameters.opts || "";
    self.compilerDefs = "";
    for (var d in parameters.defines) {
      self.compilerDefs += "-D" + d + "=" + parameters.defines[d] + " ";
    }
    if (self.context && self.source) {
      try {
        self.peer = self.context.peer.createProgramWithSource(self.source);
        self.peer.buildProgram([self.context.device.peer], self.compilerDefs + self.compilerOpts);
        self.kernels = kernelFactory(self);
        self.kernel = self.kernels[0];
        self.built = true;
      } catch(e) {
        var info = self.peer.getProgramBuildInfo(self.context.device.peer, CL.PROGRAM_BUILD_LOG);
        console.log("[" + self.context.platform.vendor + "]", e, info);
        throw e + info;
      }
    } else {
      throw "Cannot build program: Kernel source code or WebCLContext missing.";
    }
  };

  this.getKernel = function(name) {
    for (var k=0; k < self.kernels.length; k++) {
      if ((self.kernels[k].name.indexOf(name) === 0) && (name.length == self.kernels[k].name.length)) {
        return self.kernels[k];
      }
    }
    console.log("CL.js: Warning: kernel "+name+" not found.");
    return null;
  };

  var self = this;
  init(parameters);
  CL.Impl.addCleanupWrappers(self, "CL.Program");

  function init(parameters) {
    parameters = parameters || {};
    if (parameters.uri) {
      self.uri = parameters.uri;
      self.source = CL.loadSource(parameters.uri);
    } else if (parameters.source) {
      self.source = parameters.source;
    }
  };

  function kernelFactory(program) {
    var clKernels = [];
    var context = program.context;
    var device = program.context.device;
    var kernels = program.peer.createKernelsInProgram();
    for (var k=0; k < kernels.length; k++) {
      clKernels[k] = new CL.Kernel();
      clKernels[k].peer = kernels[k];
      clKernels[k].program = program;
      clKernels[k].context = context;
      clKernels[k].device = device;
      clKernels[k].name = kernels[k].getKernelInfo(CL.KERNEL_FUNCTION_NAME);
      clKernels[k].numArgs = kernels[k].getKernelInfo(CL.KERNEL_NUM_ARGS);
      clKernels[k].workGroupSize = kernels[k].getKernelWorkGroupInfo(device.peer, CL.KERNEL_WORK_GROUP_SIZE);
      clKernels[k].localMemSize = kernels[k].getKernelWorkGroupInfo(device.peer, CL.KERNEL_LOCAL_MEM_SIZE);
      clKernels[k].privateMemSize = kernels[k].getKernelWorkGroupInfo(device.peer, CL.KERNEL_PRIVATE_MEM_SIZE);
    }
    return clKernels;
  };

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      self.peer.releaseCLResources();
      self.peer = "CL.Program.peer: de-initialized";
      self.kernel = null;
      self.context = null;
      self.uri = null;
      self.source = null;
      self.built = false;
      self.compilerOpts = null;
      self.compilerDefs = null;
      CL.Impl.clearArray(self.kernels);
    }
  };

  var self = this;
};

// ### CL.Kernel ###
// Instantiated by `CL.Program.build()`
//
CL.Kernel = function(parameters) {
  this.peer = "CL.Kernel.peer: not yet initialized";
  this.name = "uninitialized";
  this.numArgs = -1;
  this.workGroupSize = -1;
  this.localMemSize = -1;
  this.privateMemSize = -1;
  this.program = null;
  this.context = null;
  this.device = null;
  
  this.setArg = function(index, value) {
    if (value instanceof CL.Buffer || value instanceof CL.Image) {
      this.peer.setKernelArg(index, value.peer);
    } else if (typeof value === 'number') {
      if (Math.floor(value) !== value) {
        this.peer.setKernelArg(index, value, WebCL.types.FLOAT);
      } else {
        this.peer.setKernelArg(index, value, WebCL.types.UINT);
      }
    } else if (value.buffer instanceof ArrayBuffer) {
      this.peer.setKernelArg(index, value);
    } else if (value instanceof Array) {
      throw "CL.Kernel.setArg: JavaScript Array arguments not supported.";
    } else {
      console.log("Unrecognized kernel argument type: ", value);
    }
  };

  this.setArgs = function() {
    for (var i=0; i < arguments.length; i++) {
      self.setArg(i, arguments[i]);
    }
  };

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      self.peer.releaseCLResources();
      self.peer = "CL.Kernel.peer: de-initialized";
      self.name = "deinitialized";
      self.program = null;
      self.context = null;
      self.device = null;
    }
  };

  var self = this;
  CL.Impl.addCleanupWrappers(self, "CL.Kernel");
};

// ### CL.Buffer ###
// Instantiated by `CL.Context.createBuffer()`
//
CL.Buffer = function(parameters) {
  this.peer = "CL.Buffer.peer: not yet initialized";
  this.context = null;
  this.flags = -1;
  this.size = -1;
  this.name = "uninitialized";

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      self.peer.releaseCLResources();
      self.peer = "CL.Buffer.peer: de-initialized";
      self.name = "deinitialized";
      self.context = null;
      self.flags = -1;
      self.size = -1;
    }
  };

  var self = this;
};

// ### CL.Image ###
// Instantiated by `CL.Context.createImage()`
//
CL.Image = function(parameters) {
  this.peer = "CL.Image.peer: not yet initialized";
  this.context = null;
  this.flags = -1;
  this.format = -1;
  this.width = -1;
  this.height = -1;
  this.name = "uninitialized";

  this.releaseAll = function() {
    if (self.peer.releaseCLResources) {
      self.peer.releaseCLResources();
      self.peer = "CL.Image.peer: de-initialized";
      self.name = "deinitialized";
      self.context = null;
      self.flags = -1;
      self.format = -1;
      self.width = -1;
      self.height = -1;
      self.size = -1;
    }
  };

  var self = this;
};

// ## Internal Implementation ##
//
// Internal helper and wrapper functions that are not supposed to be
// called from outside CL.js.
// 
CL.Implementation = function() {

  // The `DEBUG` flag enables/disables debug messages on the
  // console at runtime.
  //
  this.DEBUG = false;

  // The `CLEANUP` flag enables/disables automatic release of WebCL
  // resources when leaving the page or when an exception occurs.
  //
  this.CLEANUP = true;

  // #### clearArray ####
  //
  // Recurses through all CL objects in `theArray` and releases their
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
  
  var self = this;

  // #### addCleanupWrappers ####
  //
  // Wraps a try-catch block around each function in `theObject`.
  // Internal functions (prefixed by an underscore) are not wrapped.
  //
  // If an exception occurs in a wrapped function at runtime, all CL
  // resources created by CL.js are automatically released by calling
  // `CL.releaseAll`. Additionally, if the `DEBUG` flag is set, an
  // error message is displayed on the console before throwing the
  // exception upwards in the call chain.
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
        var privateName = '_'+name;
        theObject[privateName] = theObject[name];
        theObject[publicName] = makeTryCatchWrapper(theObject, privateName, className);
      }
    }
  };

  function makeTryCatchWrapper(theObject, functionName, className) {
    var newFunction = function() {
      try {
        return theObject[functionName].apply(theObject, arguments);
      } catch (e) {
        if (self.DEBUG) {
          console.log("WebCLException trapped by CL.js:");
          console.log("  "+className+"."+functionName.slice(1), theObject[functionName]);
          console.log("  ", arguments);
          console.log("  ", theObject);
          console.log("  ", e);
        }
        CL.releaseAll();
        throw className + "." + functionName.slice(1) + ": " + e;
      }
    };
    return newFunction;
  };

};
