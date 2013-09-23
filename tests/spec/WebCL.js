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
 * Author: Tomi Aarnio
 */

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

//jasmine.getEnv().failFast();

describe("WebCL", function() {

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("window.WebCL", function() {
    it("must exist", function() {
      expect(WebCL).toBeDefined();
    });

    xit("must have all the specified functions", function() {
      for (var funcName in expectedFunctions) {
        expect(funcName).toExist();
        expect(funcName).toHaveType('function');
      }
    });

    it("must have error code enums ranging from 0 to -64", function() {
      for (var enumName in errorEnums) {
        var legacyEnumName = "CL_" + enumName;
        var expectedEnumValue = errorEnums[enumName];
        var actualEnumValue = WebCL[legacyEnumName];
        expect(legacyEnumName).toExist();
        expect(legacyEnumName).toHaveType('number');
        expect(legacyEnumName).toHaveValue(expectedEnumValue);
      }
    });

    xit("must not have error code enums that have been removed", function() {
      for (var enumName in removedErrorEnums) {
        var legacyEnumName = "CL_" + enumName;
        expect(legacyEnumName).not.toExist();
      }
    });

    it("must have device info enums ranging from 0x1000 to 0x103D", function() {
      for (var enumName in deviceInfoEnums) {
        var legacyEnumName = "CL_" + enumName;
        var expectedEnumValue = deviceInfoEnums[enumName];
        var actualEnumValue = WebCL[legacyEnumName];
        expect(legacyEnumName).toExist();
        expect(legacyEnumName).toHaveType('number');
        expect(legacyEnumName).toHaveValue(expectedEnumValue);
      }
    });

    xit("must not have device info enums that have been removed", function() {
      for (var enumName in removedDeviceInfoEnums) {
        var legacyEnumName = "CL_" + enumName;
        expect(legacyEnumName).not.toExist();
      }
    });

    it("must have at least one Platform", function() {
      expect(WebCL.getPlatforms().length).toBeGreaterThan(0);
    });

    it("must have at least one Device on each Platform", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        expect(platforms[p].getDevices(WebCL.CL_DEVICE_TYPE_ALL).length).toBeGreaterThan(0);
      }
    });

    it("must have all Devices on all Platforms available", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        var devices = platforms[p].getDevices(WebCL.CL_DEVICE_TYPE_ALL);
        for (var d=0; d < devices.length; d++) {
          expect(devices[d].getDeviceInfo(WebCL.CL_DEVICE_AVAILABLE)).toEqual(true);
        }
      }
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("CL.js", function() {
    
    it("must be able to create and retrieve Contexts", function() {
      var cl1 = new CL({ debug: true, cleanup: true });
      var cl2 = new CL({ debug: true, cleanup: true });

      var ctx1 = cl1.createContext({ name: 'foo' });
      var ctx2 = cl1.getContext('foo');
      expect(ctx1).toEqual(ctx2);

      var ctx3 = cl2.createContext({ name: 'bar' });
      var ctx4 = cl2.getContext('bar');
      expect(ctx3).toEqual(ctx4);

      expect(cl1.getContext('foo')).not.toBeNull();
      expect(cl2.getContext('foo')).toBeNull();

      
    });

    it("must throw an exception on invalid input", function() {
      var cl = new CL({ debug: true, cleanup: true });
      var func = function() {
        cl.createContext({ device: 'invalidDevice' });
      } 
      expect(func).toThrow();
      cl.releaseAll();
    });

  });


  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("WebCLContext", function() {

    var cl = null;

    function beforeAny() {
      console.log("WebCLContext test suite - beforeAny()");
      cl = new CL({ debug: true, cleanup: true });
    };

    function createContexts() {
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
    };

    it("must be testable", function() {
      beforeAny();
      expect(cl.devices.length).toBeGreaterThan(0);
    });

    it("must be able to create a Context on default Device", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p].peer;
        var device = cl.platforms[p].devices[0].peer;
        var ctx = WebCL.createContext([], [device]);
        expect(typeof ctx).toBe('object');
        ctx.releaseCLResources();
      }
    });

    it("must be able to create a Context spanning all Devices on a Platform", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p].peer;
        var devices = [];
        for (var d=0; d < cl.platforms[p].devices.length; d++) {
          devices.push(cl.platforms[p].devices[d].peer);
        }
        var ctx = WebCL.createContext([CL.CONTEXT_PLATFORM, plat], devices);
        expect(typeof ctx).toBe('object');
        ctx.releaseCLResources();
      }
    });

    it("must be able to create a Context on any Device", function() {
      createContexts();
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        expect(typeof ctx.peer).toBe('object');
      }
    });

    it("must be able to create a CommandQueue on any Device", function() {
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var queue = ctx.peer.createCommandQueue(cl.devices[d].peer, null);
        expect(typeof queue).toBe('object');
        queue.releaseCLResources();
      }
    });

    it("must be able to create a 1 MB Buffer on any Device", function() {
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var buffer1M = ctx.peer.createBuffer(CL.MEM_READ_WRITE, 1024*1024);
        expect(typeof buffer1M).toBe('object');
        buffer1M.releaseCLResources();
      }
    });

    it("Must be able to read and write Buffers on any Device", function() {
      var input = new Float32Array(512);
      input[12] = 3.14159;
      var output = new Float32Array(512);
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var queue = ctx.createCommandQueue();
        var buffer1M = ctx.createBuffer({ size: 1024*1024 });
        function execute() {
          queue.enqueueWriteBuffer(buffer1M, input);
          queue.enqueueReadBuffer(buffer1M, output);
          queue.finish();
          for (var i=0; i < input.length; i++) {
            if (input[i] !== output[i]) {
              console.log("output[i] = ", output[i]);
              throw "input[i] !== output[i] for i="+i;
            }
          }
        }
        expect(execute).not.toThrow();
      }
    });

    it("must be able to release all CL resources allocated by previous tests", function() {
      cl.releaseAll();
      expect(cl.devices[0].contexts.length).toEqual(0);
    });

    describe("WebCLProgram", function() {

      var sobel;
      var cl = null;

      function beforeAny() {
        console.log("WebCLProgram test suite - beforeAny()");
        cl = new CL({ debug: true, cleanup: false });
        sobel = cl.loadSource('kernels/sobel.cl');
        for (var d=0; d < cl.devices.length; d++) {
          cl.createContext({ device: cl.devices[d] });
        }
      };

      it("must be testable", function() {
        beforeAny();
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          expect(ctx instanceof Object).toBe(true);
        } 
      });

      it("Must be able to build a Program from source", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          expect(program.built).toEqual(true);
        }
      });

      // Excluded because querying PROGRAM_BINARY_SIZES crashes on Mac
      //
      xit("Must not crash when querying Program binary sizes", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          function getBinaries() {
	          var sizes = program.peer.getProgramInfo(CL.PROGRAM_BINARY_SIZES);
	          console.log("Size of binary executable in bytes: ", sizes[0]);
	          return sizes;
          }
          expect(getBinaries).toThrow();
        }
      });

      // Excluded because querying PROGRAM_BINARIES crashes on Mac
      //
      xit("Must not be able to get Program binaries", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          function getBinaries() {
            return program.peer.getProgramInfo(CL.PROGRAM_BINARIES);
          }
          expect(getBinaries).toThrow();
        }
      });

      it("Must be able to create a Kernel", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernel = ctx.buildKernel({ source: sobel });
          expect(typeof kernel.peer).toBe('object');
        }
      });

      xit("Must be able to create a bunch of complex Kernels from a single source file", function() {
        var scanKernel = cl.loadSource('kernels/scan_kernel.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernels = ctx.buildKernels({ source: scanKernel });
          expect(kernels.length).toEqual(5);
        }
      });

      it("Must be able to run a Kernel", function() {
        var results = new Float32Array(512);
        var src = cl.loadSource('kernels/enqueueReadBuffer.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernel = ctx.buildKernel({ source: src, opts: "-Werror" });
          var queue = ctx.createCommandQueue();
          var buffer1M = ctx.createBuffer({ size: 1024*1024 });
          kernel.setArgTypes('BUFFER');
          kernel.setArgs(buffer1M);
          function execute() {
            queue.peer.enqueueNDRangeKernel(kernel.peer, 1, [], [results.length], [], []);
            queue.peer.finish();
          }
          expect(execute).not.toThrow();
        }
      });

      it("must be able to release all CL resources allocated by previous tests", function() {
        cl.releaseAll();
        expect(cl.devices[0].contexts.length).toEqual(0);
      });
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("OOB memory protection", function() {

    var cl = null;

    function exec(kernel, worksize, iter) {
      var success = false;
      var queue = kernel.context.queues[0];
      var t1 = Date.now();
      try {
        for (var i=0; i < (iter || 1); i++) {
          queue.enqueueKernel(kernel, [worksize]);
        }
        queue.finish();
        success = true;
      } catch (e) {
        //console.log(e);
      }
      var t2 = Date.now();
      var stats = {
        vendor : kernel.context.device.platform.vendor,
        device : kernel.context.device.name,
        msec : (success? t2-t1 : Number.NaN),
      }
      return stats;
    };

    beforeEach(function() {
      cl = new CL({ debug: true, cleanup: false });
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
    });

    afterEach(function() {
      cl.releaseAll();
    });
    
    describe("Random Number Benchmark", function() {

      it("should be 1000x faster than JavaScript (handwritten asm.js)", function() {
        var BUFFERSIZE = 16*1024*1024;
        var WORKSIZE = BUFFERSIZE / 4;
        var JS_HANDICAP = 256;
        var srcMemProtectOn = cl.loadSource('kernels/rng2.safe.cl');
        var HEAP = new ArrayBuffer(BUFFERSIZE/JS_HANDICAP);
        var rng = RNGModule(window, null, HEAP);
        var t1 = Date.now();
        rng(HEAP.byteLength, 0xdeadbeef, 5);
        var msJavaScript = (Date.now() - t1) * JS_HANDICAP;
        var heapView = new Uint8Array(HEAP);
        console.log("HEAP[t1 % HEAP.length]", heapView[t1 % heapView.length]);
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var memProtectOn = ctx.buildKernel({ source: srcMemProtectOn });
          var buffer16M = ctx.createBuffer({ size: BUFFERSIZE });
          var queue = ctx.createCommandQueue();
          memProtectOn.setArgTypes('BUFFER', 'ULONG', 'UINT');
          memProtectOn.setArgSizes(1, 1, 1);
          memProtectOn.setArgs(buffer16M, WORKSIZE, 0xdeadbeef);
          var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
          var slowdown = (msJavaScript / msProtected).toFixed(2);
          console.log(ctx.device.version, "-- speedup compared to JavaScript:", slowdown, "(", msProtected, "vs.", msJavaScript, ")");
          expect(slowdown).toBeGreaterThan(1000.0);
        }

        function RNGModule(stdlib, foreign, heap) {
          "use asm"

          var ITER = 15;
          var k0 = 0xA341316C;
          var k1 = 0xC8013EA4;
          var k2 = 0xAD90777D;
          var k3 = 0x7E95761E;
          var delta = 0x9E3779B9;
          var dst = new stdlib.Uint8Array(heap);
          var i=0, j=0, k=0, x=0, y=0, r=0, g=0, sum=0, idx=0;

          function rng(worksize, seed, iter) {
            worksize = worksize|0;
            seed = seed|0;
            iter = iter|0;
            ITER = ITER|0;
            k0 = k0|0;
            k1 = k1|0
            k2 = k2|0
            k3 = k3|0
            delta = delta|0;
            for (k=0; (k|0) < (iter|0); k = (k+1)|0) {
              for (i=0; (i|0) < (worksize|0); i = (i+1)|0) {
                x = seed;
                y = x << 3;
                x = x|0 + (i + (i << 11) + (i << 19));
                y = y|0 + (i + (i << 9) + (i << 21));
                sum = 0;
                for (j=0; (j|0) < (ITER|0); j = (j+1)|0) {
                  sum = (sum + delta)|0;
                  x = x|0 + ((y << 4) + k0) & (y + sum) & ((y >>> 5) + k1);
                  y = y|0 + ((x << 4) + k2) & (x + sum) & ((x >>> 5) + k3);
                }
                r = (x & 0x00ff);
                g = (x & 0xff00) >>> 8;
                idx = (i << 2)|0;
                dst[idx      ] = r;
                dst[idx + 1|0] = r;
                dst[idx + 2|0] = r;
                dst[idx + 3|0] = g;
              }
            }
          };

          return rng;
        }
      });

      it("should have less than 5x protection overhead", function() {
        var srcMemProtectOff = cl.loadSource('kernels/rng2.cl');
        var srcMemProtectOn = cl.loadSource('kernels/rng2.safe.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var memProtectOff = ctx.buildKernel({ source: srcMemProtectOff });
          var memProtectOn = ctx.buildKernel({ source: srcMemProtectOn });
          var buffer16M = ctx.createBuffer({ size: 16*1024*1024 });
          var queue = ctx.createCommandQueue();
          var BUFFERSIZE = buffer16M.size / 4;
          var WORKSIZE = BUFFERSIZE;
          memProtectOff.setArgTypes('BUFFER', 'UINT');
          memProtectOff.setArgSizes(1, 1);
          memProtectOff.setArgs(buffer16M, 0xdeadbeef);
          memProtectOn.setArgTypes('BUFFER', 'ULONG', 'UINT');
          memProtectOn.setArgSizes(1, 1, 1);
          memProtectOn.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
          var msUnprotected = exec(memProtectOff, WORKSIZE, 5).msec;
          var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
          var slowdown = (msProtected / msUnprotected).toFixed(2);
          console.log(ctx.device.version, "-- slowdown from memory protection:", slowdown, "(", msUnprotected, "vs.", msProtected, ")");
          expect(slowdown).toBeLessThan(5.0);
        }
      });

      it("should be faster using uint4 than uint[4]", function() {
        var src1 = cl.loadSource('kernels/rng.cl');
        var src2 = cl.loadSource('kernels/rng2.cl');
        var src1s = cl.loadSource('kernels/rng.safe.cl');
        var src2s = cl.loadSource('kernels/rng2.safe.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernel1 = ctx.buildKernel({ source: src1 });
          var kernel2 = ctx.buildKernel({ source: src2 });
          var kernel1s = ctx.buildKernel({ source: src1s });
          var kernel2s = ctx.buildKernel({ source: src2s });
          var buffer16M = ctx.createBuffer({ size: 16*1024*1024 });
          var queue = ctx.createCommandQueue();
          var BUFFERSIZE = buffer16M.size / 4;
          var WORKSIZE = BUFFERSIZE;
          kernel1.setArgTypes('BUFFER', 'UINT');
          kernel1.setArgSizes(1, 1);
          kernel1.setArgs(buffer16M, 0xdeadbeef);
          kernel2.setArgTypes('BUFFER', 'UINT');
          kernel2.setArgSizes(1, 1);
          kernel2.setArgs(buffer16M, 0xdeadbeef);
          kernel1s.setArgTypes('BUFFER', 'ULONG', 'UINT');
          kernel1s.setArgSizes(1, 1, 1);
          kernel1s.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
          kernel2s.setArgTypes('BUFFER', 'ULONG', 'UINT');
          kernel2s.setArgSizes(1, 1, 1);
          kernel2s.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
          var msKernel1 = exec(kernel1, WORKSIZE, 5).msec;
          var msKernel2 = exec(kernel2, WORKSIZE, 5).msec;
          var msKernel1s = exec(kernel1s, WORKSIZE, 5).msec;
          var msKernel2s = exec(kernel2s, WORKSIZE, 5).msec;
          console.log(ctx.device.version);
          console.log("  array unsafe :", msKernel1);
          console.log("  vector unsafe:", msKernel2);
          console.log("  array safe   :", msKernel1s);
          console.log("  vector safe  :", msKernel2s);
          var slowdownSafe = (msKernel1s / msKernel2s).toFixed(2);
          var slowdownUnsafe = (msKernel1 / msKernel2).toFixed(2);
          var protectionOverheadArray = (msKernel1s / msKernel1).toFixed(2);
          var protectionOverheadVector = (msKernel2s / msKernel2).toFixed(2);
          console.log("  protection overhead when using uint[4]:", protectionOverheadArray);
          console.log("  protection overhead when using uint4:", protectionOverheadVector);
          expect(msKernel1s).toBeGreaterThan(msKernel2s);
        }
      });
    });

    it("should have less than 5x overhead in Awesomize Benchmark", function() {
      var srcMemProtectOff = cl.loadSource('kernels/complete_transformation.cl');
      var srcMemProtectOn = cl.loadSource('kernels/complete_transformation.safe.cl');
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var memProtectOff = ctx.buildKernel({ source: srcMemProtectOff });
        var memProtectOn = ctx.buildKernel({ source: srcMemProtectOn });
        var WORKSIZE = 1024*1024;
        var GROUPSIZE = Math.max(memProtectOn.workGroupSize, memProtectOff.workGroupSize);
        var bufferInput = ctx.createBuffer({ size: 16*WORKSIZE });    // sizeof(float4)=16
        var bufferOutput = ctx.createBuffer({ size: 16*WORKSIZE });
        var bufferConst = ctx.createBuffer({ flags: CL.MEM_READ_ONLY, size: 16*WORKSIZE });
        var queue = ctx.createCommandQueue();
        memProtectOff.setArgTypes('BUFFER', 'BUFFER', 'BUFFER', 'LOCAL');
        memProtectOff.setArgSizes(1, 1, 1, 1);
        memProtectOff.setArgs(bufferInput, bufferOutput, bufferConst, GROUPSIZE*16);
        memProtectOn.setArgTypes('BUFFER', 'ULONG', 'BUFFER', 'ULONG', 'BUFFER', 'ULONG', 'LOCAL', 'ULONG');
        memProtectOn.setArgSizes(1, 1, 1);
        memProtectOn.setArgs(bufferInput, WORKSIZE,
                             bufferOutput, WORKSIZE,
                             bufferConst, WORKSIZE,
                             GROUPSIZE*16, GROUPSIZE);

        var msUnprotected = exec(memProtectOff, WORKSIZE).msec;
        var msProtected = exec(memProtectOn, WORKSIZE).msec;
        var slowdown = (msProtected / (msUnprotected || 1.0)).toFixed(2);
        console.log(ctx.device.version, "-- slowdown from memory protection:", slowdown, "(", msUnprotected, "vs.", msProtected, ")");
        expect(slowdown).toBeLessThan(5.0);
      }
    });

    xit("should have less than 2x overhead in Benchmark #3 (NVIDIA PTX only)", function() {
      var srcOriginal = cl.loadSource('kernels/synthetic_case.O3.sm_21.ptx');
      var srcProtected = cl.loadSource('kernels/synthetic_case.O3.clamped.O3.sm_21.ptx');
      for (var d=0; d < cl.devices.length; d++) {
        if (cl.devices[d].platform.vendor.indexOf("NVIDIA") !== -1 ||
            cl.devices[d].vendor.indexOf("NVIDIA") !== -1) {
          var ctx = cl.devices[d].contexts[0];
          var defs = { KERNEL_LOOP_COUNT : 64, PRIVATE_BUFFER_SIZE : 128 };
          var kernelOriginal = ctx.buildKernel({ ptx: srcOriginal });
          var kernelProtected = ctx.buildKernel({ ptx: srcProtected });
          var buffer = ctx.createBuffer({ size: 16*1024*1024 });
          var queue = ctx.createCommandQueue();
          var BUFFERSIZE = buffer.size / 4;
          var WORKSIZE = BUFFERSIZE / defs.KERNEL_LOOP_COUNT;
          kernelOriginal.setArgs(buffer, BUFFERSIZE, buffer, BUFFERSIZE);
          kernelProtected.setArgs(buffer, BUFFERSIZE, BUFFERSIZE, buffer, BUFFERSIZE, BUFFERSIZE);
          var msecOriginal = exec(kernelOriginal, WORKSIZE, 4).msec;
          var msecProtected = exec(kernelProtected, WORKSIZE, 4).msec;
          var slowdown = (msecProtected / msecOriginal).toFixed(2);
          console.log("Slowdown from memory protection:", slowdown);
          expect(slowdown).toBeLessThan(2.0);
        }
      }
    });
  });

  //////////////////////////////////////////////////////////////

  xdescribe("Generic JavaScript performance tests", function() {

    it("clearing an Array by setting its length to zero should be faster than allocating a new Array", function() {
      var ITER = 1e6;

      var myArray2 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t3 = Date.now();
      for (var i=0; i < ITER; i++) {
        myArray2 = [];
        for (var j=0; j < 10; j++) {
          myArray2[j] = j;
        }
      }
      var t4 = Date.now();
      var method2 = t4-t3;

      var myArray1 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t1 = Date.now();
      for (var i=0; i < ITER; i++) {
        myArray1.length = 0;
        for (var j=0; j < 10; j++) {
          myArray1[j] = j;
        }
      }
      var t2 = Date.now();
      var method1 = t2-t1;
      
      var myArray3 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t5 = Date.now();
      for (var i=0; i < ITER; i++) {
        for (var j=0; j < 10; j++) {
          myArray3[j] = j;
        }
      }
      var t6 = Date.now();
      var method3 = t6-t5;

      console.log("Using myarray.length=0:", method1);
      console.log("Using myarray = []:", method2);
      console.log("Baseline (don't clear): ", method3);
    });

  });


  //////////////////////////////////////////////////////////////

  beforeEach(function() {
    this.addMatchers({
      toExist: function() {
        var propertyName = this.actual;
        return (WebCL[propertyName] !== undefined);
      },
      toHaveValue: function(expected) {
        var propertyName = this.actual;
        return (WebCL[propertyName] === expected);
      },
      toHaveType: function(expected) {
        var propertyName = this.actual;
        return (typeof WebCL[propertyName] === expected);
      }
    });
  });

  //////////////////////////////////////////////////////////////

  var expectedFunctions = {
    getPlatforms : true,
    createContext : true,
    getExtension : true,
    getSupportedExtensions : true,
    waitForEvents : true,
  };

  var errorEnums = {
    /* Error Codes */
    SUCCESS                                   : 0,
    DEVICE_NOT_FOUND                          : -1,
    DEVICE_NOT_AVAILABLE                      : -2,
    MEM_OBJECT_ALLOCATION_FAILURE             : -4,
    OUT_OF_RESOURCES                          : -5,
    OUT_OF_HOST_MEMORY                        : -6,
    PROFILING_INFO_NOT_AVAILABLE              : -7,
    MEM_COPY_OVERLAP                          : -8,
    IMAGE_FORMAT_MISMATCH                     : -9,
    IMAGE_FORMAT_NOT_SUPPORTED                : -10,
    BUILD_PROGRAM_FAILURE                     : -11,
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
    INVALID_BUFFER_SIZE                       : -61,
    INVALID_GLOBAL_WORK_SIZE                  : -63,
    INVALID_PROPERTY                          : -64,
  };

  var removedErrorEnums = {
    COMPILER_NOT_AVAILABLE                    : -3,
    MAP_FAILURE                               : -12,
    INVALID_BINARY                            : -42,
    INVALID_GL_OBJECT                         : -60,
    INVALID_MIP_LEVEL                         : -62,
  };

  var deviceInfoEnums = {
    /* cl_device_info */
    DEVICE_TYPE                               : 0x1000,
    DEVICE_MAX_WORK_ITEM_DIMENSIONS           : 0x1003,
    DEVICE_MAX_WORK_GROUP_SIZE                : 0x1004,
    DEVICE_MAX_WORK_ITEM_SIZES                : 0x1005,
    DEVICE_PREFERRED_VECTOR_WIDTH_CHAR        : 0x1006,
    DEVICE_PREFERRED_VECTOR_WIDTH_SHORT       : 0x1007,
    DEVICE_PREFERRED_VECTOR_WIDTH_INT         : 0x1008,
    DEVICE_PREFERRED_VECTOR_WIDTH_LONG        : 0x1009,
    DEVICE_PREFERRED_VECTOR_WIDTH_FLOAT       : 0x100A,
    DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE      : 0x100B,
    DEVICE_ADDRESS_BITS                       : 0x100D,
    DEVICE_MAX_READ_IMAGE_ARGS                : 0x100E,
    DEVICE_MAX_WRITE_IMAGE_ARGS               : 0x100F,
    DEVICE_MAX_MEM_ALLOC_SIZE                 : 0x1010,
    DEVICE_IMAGE2D_MAX_WIDTH                  : 0x1011,
    DEVICE_IMAGE2D_MAX_HEIGHT                 : 0x1012,
    DEVICE_IMAGE_SUPPORT                      : 0x1016,
    DEVICE_MAX_PARAMETER_SIZE                 : 0x1017,
    DEVICE_MAX_SAMPLERS                       : 0x1018,
    DEVICE_MAX_CONSTANT_BUFFER_SIZE           : 0x1020,
    DEVICE_MAX_CONSTANT_ARGS                  : 0x1021,
    DEVICE_LOCAL_MEM_TYPE                     : 0x1022,
    DEVICE_LOCAL_MEM_SIZE                     : 0x1023,
    DEVICE_ENDIAN_LITTLE                      : 0x1026,
    DEVICE_AVAILABLE                          : 0x1027,
    DEVICE_QUEUE_PROPERTIES                   : 0x102A,
    DEVICE_PROFILE                            : 0x102E,
    DEVICE_VERSION                            : 0x102F,
    DEVICE_PLATFORM                           : 0x1031,
    DEVICE_PREFERRED_VECTOR_WIDTH_HALF        : 0x1034,
    DEVICE_HOST_UNIFIED_MEMORY                : 0x1035,
    DEVICE_OPENCL_C_VERSION                   : 0x103D,
  };

  var removedDeviceInfoEnums = {
    DEVICE_VENDOR_ID                         : 0x1001,
    DEVICE_IMAGE3D_MAX_WIDTH                 : 0x1013,
    DEVICE_IMAGE3D_MAX_HEIGHT                : 0x1014,
    DEVICE_IMAGE3D_MAX_DEPTH                 : 0x1015,
    DEVICE_MEM_BASE_ADDR_ALIGN               : 0x1019,
    DEVICE_MIN_DATA_TYPE_ALIGN_SIZE          : 0x101A,
    DEVICE_SINGLE_FP_CONFIG                  : 0x101B,
    DEVICE_GLOBAL_MEM_CACHE_TYPE             : 0x101C,
    DEVICE_GLOBAL_MEM_CACHELINE_SIZE         : 0x101D,
    DEVICE_GLOBAL_MEM_CACHE_SIZE             : 0x101E,
    DEVICE_GLOBAL_MEM_SIZE                   : 0x101F,
    DEVICE_MAX_CONSTANT_BUFFER_SIZE          : 0x1020,
    DEVICE_MAX_CONSTANT_ARGS                 : 0x1021,
    DEVICE_LOCAL_MEM_TYPE                    : 0x1022,
    DEVICE_LOCAL_MEM_SIZE                    : 0x1023,
    DEVICE_ERROR_CORRECTION_SUPPORT          : 0x1024,
    DEVICE_PROFILING_TIMER_RESOLUTION        : 0x1025,
    DEVICE_ENDIAN_LITTLE                     : 0x1026,
    DEVICE_COMPILER_AVAILABLE                : 0x1028,
    DEVICE_EXECUTION_CAPABILITIES            : 0x1029,
    DEVICE_QUEUE_PROPERTIES                  : 0x102A,
    DEVICE_NAME                              : 0x102B,
    DEVICE_VENDOR                            : 0x102C,
    DRIVER_VERSION                           : 0x102D,
    DEVICE_PROFILE                           : 0x102E,
    DEVICE_VERSION                           : 0x102F,
    DEVICE_EXTENSIONS                        : 0x1030,
    DEVICE_DOUBLE_FP_CONFIG                  : 0x1032,
    DEVICE_HALF_FP_CONFIG                    : 0x1033,
  };

});
