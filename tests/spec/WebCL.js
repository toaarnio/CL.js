/*
 * This file is part of WebCL – Web Computing Language.
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL
 * was not distributed with this file, You can obtain
 * one at http://mozilla.org/MPL/2.0/.
 *
 * The Original Contributor of this Source Code Form is
 * Nokia Research Tampere (http://webcl.nokiaresearch.com).
 *
 * Author: Tomi Aarnio, 2013
 */

//////////////////////////////////////////////////////////////////////////////
//
// Static properties
// 
describe("WebCL", function() {

  beforeEach(function() {
    this.addMatchers({
      toEvalAs: function(result) {
        return eval(this.actual) === eval(result);
      },
      toFail: function() {
        var wrapper = new Function(this.actual);
        try { wrapper() } catch(e) { return true; }
        return false;
      },
      toReturn: function(result) {
        var wrapper = new Function(this.actual);
        return wrapper() === result;
      },
    });
  });


  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> Signature
  // 
  describe("Signature", function() {

    it("must be defined", function() {
      expect(WebCL).toBeDefined();
    });

    it("must have all the expected classes", function() {
      for (var className in expectedClasses) {
        expect(window).toHaveFunction(className);
      }
    });

    it("must have all the expected member functions", function() {
      checkSignature('WebCL', true);
      for (var className in expectedClasses) {
        checkSignature(className, true);
      }
    });

    it("must not have any disallowed member functions", function() {
      checkSignature('WebCL', false);
      for (var className in expectedClasses) {
        checkSignature(className, false);
      }
    });

    it("must have error code enums ranging from 0 to -64", function() {
      for (var enumName in errorEnums) {
        var actualValue = WebCL[enumName];
        var expectedValue = errorEnums[enumName];
        expect(actualValue).toBeDefined();
        expect(actualValue).toEqual(expectedValue);
      }
    });

    it("must not have error code enums that have been removed", function() {
      for (var enumName in removedErrorEnums) {
        expect(WebCL[enumName]).not.toBeDefined();
      }
    });

    it("must have device info enums ranging from 0x1000 to 0x103D", function() {
      for (var enumName in deviceInfoEnums) {
        var actualValue = WebCL[enumName];
        var expectedValue = deviceInfoEnums[enumName];
        expect(actualValue).toBeDefined();
        expect(actualValue).toEqual(expectedValue);
      }
    });

    it("must not have any disallowed device info enums", function() {
      for (var enumName in removedDeviceInfoEnums) {
        expect('WebCL').not.toHaveProperty(enumName);
      }
    });

  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> WebCLPlatform
  // 
  describe("WebCLPlatform", function() {

    it("must have at least one instance", function() {
      expect(WebCL.getPlatforms().length).toBeGreaterThan(0);
    });

    it("must support the standard getInfo queries", function() {
      var plats = WebCL.getPlatforms();
      function checkInfo() {
        for (var i=0; i < plats.length; i++) {
          var name = plats[i].getInfo(WebCL.PLATFORM_NAME)
          var vendor = plats[i].getInfo(WebCL.PLATFORM_VENDOR)
          var version = plats[i].getInfo(WebCL.PLATFORM_VERSION)
          var profile = plats[i].getInfo(WebCL.PLATFORM_PROFILE)
          var extensions = plats[i].getInfo(WebCL.PLATFORM_EXTENSIONS)
          expect(name.length).toBeGreaterThan(0);
          expect(vendor.length).toBeGreaterThan(0);
          expect(version.length).toBeGreaterThan(0);
          expect(profile.length).toBeGreaterThan(0);
        }
      };
      expect(checkInfo).not.toThrow();
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> WebCLDevice
  // 
  describe("WebCLDevice", function() {

    it("must have at least one instance on each Platform", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        expect(platforms[p].getDevices().length).toBeGreaterThan(0);
      }
    });

    it("must not have any instances that are not actually available", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        var devices = platforms[p].getDevices();
        for (var d=0; d < devices.length; d++) {
          expect(devices[d].getInfo(WebCL.DEVICE_AVAILABLE)).toEqual(true);
        }
      }
    });

    it("must support the standard getInfo queries", function() {
      forEachDevice(function(device, deviceIndex) {
        expect(function() { checkInfo(deviceInfoEnums, device) }).not.toThrow();
        expect(function() { checkInfo(removedDeviceInfoEnums, device) }).toThrow();
      });
      function checkInfo(enumList, device) {
        for (var enumName in enumList) {
          var enumVal = enumList[enumName];
          var property = device.getInfo(enumVal)
          if (property === null) throw "getInfo(CL."+enumName+") returned null."
        }
      };
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> Context creation
  // 
  describe("Context creation", function() {

    it("must work if properties === undefined", function() {
      ctx1 = WebCL.createContext();
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties === null", function() {
      ctx1 = WebCL.createContext(null);
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties === {}", function() {
      ctx1 = WebCL.createContext({});
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.devices === null", function() {
      ctx1 = WebCL.createContext({ devices: null });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.platform === null", function() {
      ctx1 = WebCL.createContext({ platform: null });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.deviceType === null", function() {
      ctx1 = WebCL.createContext({ deviceType: null });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.deviceType === DEFAULT", function() {
      ctx1 = WebCL.createContext({ deviceType: WebCL.DEVICE_TYPE_DEFAULT });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.deviceType === CPU || GPU", function() {
      ctx1 = WebCL.createContext({ deviceType: WebCL.DEVICE_TYPE_CPU });
      ctx2 = WebCL.createContext({ deviceType: WebCL.DEVICE_TYPE_GPU });
      expect(ctx1 instanceof WebCLContext || ctx2 instanceof WebCLContext).toBeTruthy();
      ctx1 && ctx1.release();
      ctx2 && ctx2.release();
    });

    it("must work if properties.devices === [ aDevice ]", function() {
      var defaultDevice = WebCL.getPlatforms()[0].getDevices()[0];
      ctx1 = WebCL.createContext({ devices: [defaultDevice] });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.platform === aPlatform", function() {
      var defaultPlatform = WebCL.getPlatforms()[0];
      ctx1 = WebCL.createContext({ platform: defaultPlatform });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must work if properties.platform === aPlatform and deviceType === CPU || GPU", function() {
      var defaultPlatform = WebCL.getPlatforms()[0];
      ctx1 = WebCL.createContext({ platform: defaultPlatform, deviceType: WebCL.DEVICE_TYPE_CPU });
      ctx2 = WebCL.createContext({ platform: defaultPlatform, deviceType: WebCL.DEVICE_TYPE_GPU });
      expect(ctx1 instanceof WebCLContext || ctx2 instanceof WebCLContext).toBeTruthy();
      ctx1 && ctx1.release();
      ctx2 && ctx2.release();
    });

    it("must ignore Platform if Device is given", function() {
      var defaultDevice = WebCL.getPlatforms()[0].getDevices()[0];
      ctx1 = WebCL.createContext({ devices: [defaultDevice], platform: "foobar" });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must ignore deviceType if Device is given", function() {
      var defaultDevice = WebCL.getPlatforms()[0].getDevices()[0];
      ctx1 = WebCL.createContext({ devices: [defaultDevice], deviceType: "foobar" });
      expect('ctx1 instanceof WebCLContext').toEvalAs(true);
      ctx1.release();
    });

    it("must return null if there is no device of the given deviceType", function() {
      var defaultPlatform = WebCL.getPlatforms()[0];
      ctx1 = WebCL.createContext({ deviceType: WebCL.DEVICE_TYPE_ACCELERATOR });
      expect(ctx1).toEqual(null);
    });

    it("must throw if properties === 'foobar'", function() {
      expect('WebCL.createContext("foobar");').toFail();
    });

    it("must throw if properties.devices === 'foobar'", function() {
      expect('WebCL.createContext({ devices: "foobar" });').toFail();
    });

    it("must throw if properties.platform === 'foobar'", function() {
      expect('WebCL.createContext({ platform: "foobar" });').toFail();
    });

    it("must throw if properties.deviceType === 'foobar'", function() {
      expect('WebCL.createContext({ deviceType: "foobar" });').toFail();
    });

    it("must throw if properties.devices === []", function() {
      expect('WebCL.createContext({ devices: [] });').toFail();
    });

    it("must throw if properties.devices === [undefined]", function() {
      expect('WebCL.createContext({ devices: [undefined] });').toFail();
    });

    it("must throw if properties.devices === [null]", function() {
      expect('WebCL.createContext({ devices: [null] });').toFail();
    });

    it("must throw if properties.devices === [device, undefined]", function() {
      defaultDevice = WebCL.getPlatforms()[0].getDevices()[0];
      expect('WebCL.createContext({ devices: [defaultDevice, undefined] });').toFail();
    });

    it("must throw if properties.devices === [device, null]", function() {
      defaultDevice = WebCL.getPlatforms()[0].getDevices()[0];
      expect('WebCL.createContext({ devices: [defaultDevice, null] });').toFail();
    });

  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> WebCLContext
  // 
  describe("WebCLContext", function() {

    it("must be able to create a Context on any Device", function() {
      forEachDevice(function(device) {
        var ctx = WebCL.createContext({ devices: [device] });
        expect(typeof ctx).toBe('object');
        expect(ctx instanceof WebCLContext).toBeTruthy();
        ctx.release();
      });
    });

    it("must support the standard getInfo queries", function() {
      forEachDevice(function(device, deviceIndex) {
        var ctx = WebCL.createContext({ devices: [device] });
        for (var enumName in contextInfoEnums) {
          expect(ctx).toSupportInfoEnum(enumName);
        }
      });
    });

    it("must not support any disallowed getInfo queries", function() {
      forEachDevice(function(device, deviceIndex) {
        var ctx = WebCL.createContext({ devices: [device] });
        for (var enumName in removedContextInfoEnums) {
          expect(ctx).not.toSupportInfoEnum(enumName);
        }
      });
    });

    it("must be able to create a CommandQueue", function() {
      forEachDevice(function(device) {
        var ctx = WebCL.createContext({ devices: [device] });
        function createValidQueues() {
          var queue1 = ctx.createCommandQueue();            // default
          var queue2 = ctx.createCommandQueue(null);        // default
          var queue3 = ctx.createCommandQueue(device);      // default
          var queue4 = ctx.createCommandQueue(device, 0);   // default
          var queue5 = ctx.createCommandQueue(device, 0x1); // out-of-order
          var queue6 = ctx.createCommandQueue(device, 0x2); // profiling
          var queue7 = ctx.createCommandQueue(device, 0x3); // combined
          expect(queue1 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue2 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue3 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue4 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue5 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue6 instanceof WebCLCommandQueue).toBeTruthy();
          expect(queue7 instanceof WebCLCommandQueue).toBeTruthy();
          queue1.release();
          queue2.release();
          queue3.release();
          queue4.release();
          queue5.release();
          queue6.release();
          queue7.release();
        };
        expect(createValidQueues).not.toThrow();
        ctx.release();
      });
    });

    it("must not allow creating a CommandQueue with invalid properties", function() {
      forEachDevice(function(device) {
        var ctx = WebCL.createContext({ devices: [device] });
        expect('ctx.createCommandQueue("foo")').toThrow();
        expect('ctx.createCommandQueue(device, 0x4)').toThrow();
        expect('ctx.createCommandQueue(device, [])').toThrow();
        expect('ctx.createCommandQueue(device, [0xff])').toThrow();
        expect('ctx.createCommandQueue(device, device)').toThrow();
        ctx.release();
      });
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> WebCLCommandQueue
  // 
  describe("WebCLCommandQueue", function() {

  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // WebCL -> Crash tests
  // 
  describe("Crash tests", function() {

    it("must not not crash or throw when calling release() too many times", function()  {
      forEachDevice(function(device, deviceIndex) {
        ctx = WebCL.createContext({ devices: [device] });
        expect('ctx.release()').not.toThrow();
        expect('ctx.release()').not.toThrow();
      });
    });

    it("must throw when trying to use an object that has been released", function() {
      forEachDevice(function(device, deviceIndex) {
        ctx = WebCL.createContext({ devices: [device] });
        ctx.release();
        expect('ctx.getInfo(WebCL.CONTEXT_NUM_DEVICES)').toThrow();
      });
    });
  });

  //////////////////////////////////////////////////////////////

  beforeEach(function() {
    this.addMatchers({
      toThrow: function() {
        if (typeof(this.actual) === 'string') {
          var sourceStr = this.actual;
          this.actual = Function(this.actual);
          var asExpected = jasmine.Matchers.prototype.toThrow.call(this);
          var not = this.isNot ? "not " : "";
          this.message = function() { 
            return "Expected '" + sourceStr + "' " + not + "to throw an exception."
          }
          return asExpected;
        } else {
          return jasmine.Matchers.prototype.toThrow.call(this);
        }
      },
      toHaveProperty: function(name) {
        var obj = typeof(this.actual) === "string" ? window[this.actual] : this.actual;
        return (obj[name] !== undefined);
      },
      toHaveFunction: function(name) {
        var obj = typeof(this.actual) === "string" ? window[this.actual] : this.actual;
        var exists = obj && typeof(obj[name]) === 'function';
        exists = exists || (obj && obj.prototype && typeof(obj.prototype[name]) === 'function');
        return exists;
      },
      toSupportInfoEnum: function(name) {
        var obj = this.actual;
        var val = undefined;
        try {
          val = obj.getInfo(WebCL[name]);
        } catch (e) {}
        return (val !== undefined);
      },
    });
  });

  function forEachDevice(callback) {
    var SELECTED_DEVICES = [];
    var plats = WebCL.getPlatforms();
    for (var i=0, deviceIndex=0; i < plats.length; i++) {
      var devices = plats[i].getDevices();
      for (var j=0; j < devices.length; j++, deviceIndex++) {
        if (SELECTED_DEVICES.length === 0 || SELECTED_DEVICES.indexOf(deviceIndex) >= 0) {
          callback(devices[j], deviceIndex, plats[i], i);
        }
      }
    }
  };

  function checkSignature(className, checkExisting) {
    for (var funcName in expectedFunctions[className]) {
      if (checkExisting && expectedFunctions[className][funcName] === true) {
        expect(className).toHaveFunction(funcName);
      }
      if (!checkExisting && expectedFunctions[className][funcName] === false) {
        expect(className).not.toHaveFunction(funcName);
      }
    }
  };

  //////////////////////////////////////////////////////////////

  var expectedClasses = {
    WebCLPlatform : true,
    WebCLDevice : true,
    WebCLContext : true,
    WebCLCommandQueue : true,
    WebCLMemoryObject : true,
    WebCLSampler : true,
    WebCLProgram : true,
    WebCLKernel : true,
    WebCLEvent : true,
    WebCLBuffer : true,
    WebCLImage : true,
    WebCLUserEvent : true,
  };

  var expectedFunctions = {

    WebCL : {
      getPlatforms : true,
      createContext : true,
      getSupportedExtensions : true,
      enableExtension : true,
      waitForEvents : true,
      releaseAll : true,
      getPlatformIDs : false,         // renamed to getPlatforms
      createContextFromType : false,  // merged into createContext
    },

    WebCLPlatform : {
      getInfo : true,
      getDevices : true,
      getSupportedExtensions : true,
      enableExtension : true,
      getDeviceIDs : false,           // renamed to getDevices
      getPlatformInfo : false,        // renamed to getInfo
    },

    WebCLDevice : {
      getInfo : true,
      getSupportedExtensions : true,
      enableExtension : true,
      getDeviceInfo : false,          // renamed to getInfo
    },

    WebCLContext : {
      createBuffer : true,
      createCommandQueue : true,
      createImage : true,
      createProgram : true,
      createSampler : true,
      createUserEvent : true,
      getInfo : true,
      getSupportedImageFormats : true,
      release : true,
      releaseAll : true,
      createImage2D : false,            // renamed to createImage
      createImage3D : false,            // disallowed by WebCL
      createProgramWithSource : false,  // renamed to createProgram
      createProgramWithBinary : false,  // disallowed by WebCL
      getContextInfo : false,           // renamed to getInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLCommandQueue : {
      enqueueCopyBuffer : true,
      enqueueCopyBufferRect : true,
      enqueueCopyImage : true,
      enqueueCopyImageToBuffer : true,
      enqueueCopyBufferToImage : true,
      enqueueReadBuffer : true,
      enqueueReadBufferRect : true,
      enqueueReadImage : true,
      enqueueWriteBuffer : true,
      enqueueWriteBufferRect : true,
      enqueueWriteImage : true,
      enqueueNDRangeKernel : true,
      enqueueMarker : true,
      enqueueBarrier : true,
      enqueueWaitForEvents : true,
      finish : true,
      flush : true,
      getInfo : true,
      release : true,
      enqueueTask : false,              // disallowed by WebCL
      enqueueMapBuffer : false,         // disallowed by WebCL
      enqueueMapImage : false,          // disallowed by WebCL
      enqueueUnmapMemObject : false,    // disallowed by WebCL
      getCommandQueueInfo : false,      // renamed to getInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLMemoryObject : {
      getInfo : true,
      release : true,
      createSubBuffer : false,
      getImageInfo: false,              // moved to WebCLImage
      getMemObjectInfo : false,         // renamed to getInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLBuffer : {
      createSubBuffer : true,
      releaseCLResources : false,       // renamed to release
    },

    WebCLImage : {
      getInfo : true,
      getImageInfo: false,              // renamed to getInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLSampler : {
      getInfo : true,
      release : true,
      getSamplerInfo: false,            // renamed to getInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLProgram : {
      getInfo : true,
      getBuildInfo : true,
      build : true,
      createKernel : true,
      createKernelsInProgram : true,
      release : true,
      buildProgram : false,             // renamed to build
      getProgramInfo : false,           // renamed to getInfo
      getProgramBuildInfo : false,      // renamed to getBuildInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLKernel : {
      getInfo : true,
      getWorkGroupInfo : true,
      setArg : true,
      release : true,
      setKernelArg : false,             // renamed to setArg
      setKernelArgLocal : false,        // renamed to setArg
      getKernelInfo: false,             // renamed to getInfo
      getKernelWorkGroupInfo : false,   // renamed to getWorkGroupInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLEvent : {
      getInfo : true,
      getProfilingInfo : true,
      setCallback : true,
      release : true,
      setUserEventStatus : false,       // moved to WebCLUserEvent
      getEventInfo : false,             // renamed to getInfo
      getEventProfilingInfo : false,    // renamed to getProfilingInfo
      releaseCLResources : false,       // renamed to release
    },

    WebCLUserEvent : {
      setStatus : true,
      setUserEventStatus : false,       // renamed to setStatus
      releaseCLResources : false,       // renamed to release
    },
  };

  var errorEnums = {
    /* Error Codes */
    SUCCESS                                   : 0,
    DEVICE_NOT_FOUND                          : -1,
    DEVICE_NOT_AVAILABLE                      : -2,
    COMPILER_NOT_AVAILABLE                    : -3,
    MEM_OBJECT_ALLOCATION_FAILURE             : -4,
    OUT_OF_RESOURCES                          : -5,
    OUT_OF_HOST_MEMORY                        : -6,
    PROFILING_INFO_NOT_AVAILABLE              : -7,
    MEM_COPY_OVERLAP                          : -8,
    IMAGE_FORMAT_MISMATCH                     : -9,
    IMAGE_FORMAT_NOT_SUPPORTED                : -10,
    BUILD_PROGRAM_FAILURE                     : -11,
    MAP_FAILURE                               : -12,
    MISALIGNED_SUB_BUFFER_OFFSET              : -13,
    EXEC_STATUS_ERROR_FOR_EVENTS_IN_WAIT_LIST : -14,
    INVALID_VALUE                             : -30,
    INVALID_DEVICE_TYPE                       : -31,
    INVALID_PLATFORM                          : -32,
    INVALID_DEVICE                            : -33,
    INVALID_CONTEXT                           : -34,
    INVALID_QUEUE_PROPERTIES                  : -35,
    INVALID_COMMAND_QUEUE                     : -36,
    INVALID_HOST_PTR                          : -37,
    INVALID_MEM_OBJECT                        : -38,
    INVALID_IMAGE_FORMAT_DESCRIPTOR           : -39,
    INVALID_IMAGE_SIZE                        : -40,
    INVALID_SAMPLER                           : -41,
    INVALID_BINARY                            : -42,
    INVALID_BUILD_OPTIONS                     : -43,
    INVALID_PROGRAM                           : -44,
    INVALID_PROGRAM_EXECUTABLE                : -45,
    INVALID_KERNEL_NAME                       : -46,
    INVALID_KERNEL_DEFINITION                 : -47,
    INVALID_KERNEL                            : -48,
    INVALID_ARG_INDEX                         : -49,
    INVALID_ARG_VALUE                         : -50,
    INVALID_ARG_SIZE                          : -51,
    INVALID_KERNEL_ARGS                       : -52,
    INVALID_WORK_DIMENSION                    : -53,
    INVALID_WORK_GROUP_SIZE                   : -54,
    INVALID_WORK_ITEM_SIZE                    : -55,
    INVALID_GLOBAL_OFFSET                     : -56,
    INVALID_EVENT_WAIT_LIST                   : -57,
    INVALID_EVENT                             : -58,
    INVALID_OPERATION                         : -59,
    //INVALID_GL_OBJECT                         : -60,  // moved to extension
    INVALID_BUFFER_SIZE                       : -61,
    //INVALID_MIP_LEVEL                         : -62,  // moved to extension
    INVALID_GLOBAL_WORK_SIZE                  : -63,
    INVALID_PROPERTY                          : -64,
  };

  var removedErrorEnums = {
    //INVALID_GL_OBJECT                        : -60,
    //INVALID_MIP_LEVEL                        : -62,
  };

  var deviceInfoEnums = {
    DEVICE_TYPE                               : 0x1000,
    DEVICE_VENDOR_ID                          : 0x1001,
    DEVICE_MAX_COMPUTE_UNITS                  : 0x1002,
    DEVICE_MAX_WORK_ITEM_DIMENSIONS           : 0x1003,
    DEVICE_MAX_WORK_GROUP_SIZE                : 0x1004,
    DEVICE_MAX_WORK_ITEM_SIZES                : 0x1005,
    DEVICE_PREFERRED_VECTOR_WIDTH_CHAR        : 0x1006,
    DEVICE_PREFERRED_VECTOR_WIDTH_SHORT       : 0x1007,
    DEVICE_PREFERRED_VECTOR_WIDTH_INT         : 0x1008,
    DEVICE_PREFERRED_VECTOR_WIDTH_LONG        : 0x1009,
    DEVICE_PREFERRED_VECTOR_WIDTH_FLOAT       : 0x100A,
    //DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE      : 0x100B, // moved to extension
    DEVICE_MAX_CLOCK_FREQUENCY                : 0x100C,
    DEVICE_ADDRESS_BITS                       : 0x100D,
    DEVICE_MAX_READ_IMAGE_ARGS                : 0x100E,
    DEVICE_MAX_WRITE_IMAGE_ARGS               : 0x100F,
    DEVICE_MAX_MEM_ALLOC_SIZE                 : 0x1010,
    DEVICE_IMAGE2D_MAX_WIDTH                  : 0x1011,
    DEVICE_IMAGE2D_MAX_HEIGHT                 : 0x1012,
    DEVICE_IMAGE3D_MAX_WIDTH                  : 0x1013,
    DEVICE_IMAGE3D_MAX_HEIGHT                 : 0x1014,
    DEVICE_IMAGE3D_MAX_DEPTH                  : 0x1015,
    DEVICE_IMAGE_SUPPORT                      : 0x1016,
    DEVICE_MAX_PARAMETER_SIZE                 : 0x1017,
    DEVICE_MAX_SAMPLERS                       : 0x1018,
    DEVICE_MEM_BASE_ADDR_ALIGN                : 0x1019,
    //DEVICE_MIN_DATA_TYPE_ALIGN_SIZE           : 0x101A, // removed, deprecated in OpenCL 1.2
    DEVICE_SINGLE_FP_CONFIG                   : 0x101B,
    DEVICE_GLOBAL_MEM_CACHE_TYPE              : 0x101C,
    DEVICE_GLOBAL_MEM_CACHELINE_SIZE          : 0x101D,
    DEVICE_GLOBAL_MEM_CACHE_SIZE              : 0x101E,
    DEVICE_GLOBAL_MEM_SIZE                    : 0x101F,
    DEVICE_MAX_CONSTANT_BUFFER_SIZE           : 0x1020,
    DEVICE_MAX_CONSTANT_ARGS                  : 0x1021,
    DEVICE_LOCAL_MEM_TYPE                     : 0x1022,
    DEVICE_LOCAL_MEM_SIZE                     : 0x1023,
    DEVICE_ERROR_CORRECTION_SUPPORT           : 0x1024,
    DEVICE_PROFILING_TIMER_RESOLUTION         : 0x1025,
    DEVICE_ENDIAN_LITTLE                      : 0x1026,
    DEVICE_AVAILABLE                          : 0x1027,
    DEVICE_COMPILER_AVAILABLE                 : 0x1028,
    DEVICE_EXECUTION_CAPABILITIES             : 0x1029,
    DEVICE_QUEUE_PROPERTIES                   : 0x102A,
    DEVICE_NAME                               : 0x102B,
    DEVICE_VENDOR                             : 0x102C,
    DRIVER_VERSION                            : 0x102D,
    DEVICE_PROFILE                            : 0x102E,
    DEVICE_VERSION                            : 0x102F,
    DEVICE_EXTENSIONS                         : 0x1030,
    DEVICE_PLATFORM                           : 0x1031,
    //DEVICE_DOUBLE_FP_CONFIG                   : 0x1032, // moved to extension
    //DEVICE_HALF_FP_CONFIG                     : 0x1033, // moved to extension
    //DEVICE_PREFERRED_VECTOR_WIDTH_HALF        : 0x1034, // moved to extension
    DEVICE_HOST_UNIFIED_MEMORY                : 0x1035,
    DEVICE_NATIVE_VECTOR_WIDTH_CHAR           : 0x1036,
    DEVICE_NATIVE_VECTOR_WIDTH_SHORT          : 0x1037,
    DEVICE_NATIVE_VECTOR_WIDTH_INT            : 0x1038,
    DEVICE_NATIVE_VECTOR_WIDTH_LONG           : 0x1039,
    DEVICE_NATIVE_VECTOR_WIDTH_FLOAT          : 0x103A,
    //DEVICE_NATIVE_VECTOR_WIDTH_DOUBLE         : 0x103B, // moved to extension
    //DEVICE_NATIVE_VECTOR_WIDTH_HALF           : 0x103C, // moved to extension
    DEVICE_OPENCL_C_VERSION                   : 0x103D,
  };

  var removedDeviceInfoEnums = {
    DEVICE_MIN_DATA_TYPE_ALIGN_SIZE          : 0x101A,
    //DEVICE_DOUBLE_FP_CONFIG                  : 0x1032,
    //DEVICE_HALF_FP_CONFIG                    : 0x1033,
    //DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE     : 0x100B,
    //DEVICE_PREFERRED_VECTOR_WIDTH_HALF       : 0x1034,
    //DEVICE_NATIVE_VECTOR_WIDTH_DOUBLE        : 0x103B,
    //DEVICE_NATIVE_VECTOR_WIDTH_HALF          : 0x103C,
  };

  var extensionEnums = {
    INVALID_GL_OBJECT                        : -60,
    INVALID_MIP_LEVEL                        : -62,
    DEVICE_DOUBLE_FP_CONFIG                  : 0x1032,
    DEVICE_HALF_FP_CONFIG                    : 0x1033,
    DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE     : 0x100B,
    DEVICE_PREFERRED_VECTOR_WIDTH_HALF       : 0x1034,
    DEVICE_NATIVE_VECTOR_WIDTH_DOUBLE        : 0x103B,
    DEVICE_NATIVE_VECTOR_WIDTH_HALF          : 0x103C,
  };

  var contextInfoEnums = {
    CONTEXT_DEVICES      : 0x1081,
    CONTEXT_PROPERTIES   : 0x1082,
    CONTEXT_NUM_DEVICES  : 0x1083,
  };

  var removedContextInfoEnums = {
    //CONTEXT_REFERENCE_COUNT : 0x1080,  // uncomment when un-implemented
  };
});

// Augment Jasmine with a "fail fast" mode to stop running a test
// suite immediately after the first failure.

jasmine.Env.prototype.failFast = function() {
  var env = this;
  env.afterEach(function() {
    if (!this.results().passed()) {
      env.specFilter = function(spec) {
        return false;
      };
    }
  });
};

// Uncomment the following line to enable the "fail fast" mode.
//jasmine.getEnv().failFast();

